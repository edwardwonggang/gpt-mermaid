/*
 * 职责：为运行时长、中止信号和串行渲染提供统一保护。
 * 调用方：render.js（加载/渲染队列）与 ui.js（等待超时）。
 * 依赖：浏览器或 Node 20+ 的 AbortController、Promise、setTimeout。
 * 红线：超时只结束等待，不证明第三方执行已结束；真实执行 settle 前不能交出
 *       串行槽位。排队也必须有截止时间，挂死任务不能让其它调用者永久等待。
 */

export const DEFAULT_RENDER_TIMEOUT_MS = 12000;
export const DEFAULT_RUNTIME_TIMEOUT_MS = 15000;

function namedError(name, message, cause) {
  const error = new Error(message);
  error.name = name;
  if (cause !== undefined) error.cause = cause;
  return error;
}

export function abortError(message = "gpt-mermaid: render aborted", cause) {
  return namedError("AbortError", message, cause);
}

export function timeoutError(message = "gpt-mermaid: render timed out", cause) {
  return namedError("TimeoutError", message, cause);
}

export function positiveTimeout(value, fallback = DEFAULT_RENDER_TIMEOUT_MS) {
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

export function throwIfAborted(signal) {
  if (!signal?.aborted) return;
  throw signal.reason instanceof Error ? signal.reason : abortError(undefined, signal.reason);
}

/**
 * 只保护“等待”阶段。即使被保护的 Promise 永不 settle，也会在超时/中止时
 * 拒绝，并移除信号与计时器监听，避免等待方永久驻留。
 */
export function withAbortTimeout(value, {
  signal,
  timeoutMs = DEFAULT_RENDER_TIMEOUT_MS,
  timeoutMessage,
} = {}) {
  throwIfAborted(signal);
  let timer = 0;
  let cleaned = false;
  const promise = Promise.resolve(value);
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      if (cleaned) return;
      cleaned = true;
      if (timer) clearTimeout(timer);
      signal?.removeEventListener?.("abort", onAbort);
    };
    const finish = (callback, result) => {
      cleanup();
      callback(result);
    };
    const onAbort = () => finish(reject,
      signal?.reason instanceof Error ? signal.reason : abortError(undefined, signal?.reason));
    const ms = Number(timeoutMs);
    if (Number.isFinite(ms) && ms > 0) {
      timer = setTimeout(() => finish(reject, timeoutError(timeoutMessage)), ms);
    }
    signal?.addEventListener?.("abort", onAbort, { once: true });
    promise.then(
      (result) => finish(resolve, result),
      (error) => finish(reject, error),
    );
  });
}

/**
 * 严格串行的调度器。只有真实任务 settle 才释放槽位；取消/超时后迟到的
 * 任务仍占槽，但其调用者已结束等待。排队预算和执行预算分别计时。
 */
export function createSerialScheduler() {
  const queue = [];
  let active = null;

  function schedule(run, {
    signal,
    timeoutMs = DEFAULT_RENDER_TIMEOUT_MS,
    timeoutMessage,
    queueTimeoutMs = timeoutMs,
  } = {}) {
    return new Promise((resolve, reject) => {
      const item = {
        run, signal, timeoutMs, timeoutMessage, resolve, reject,
        controller: new AbortController(), started: false, queueTimer: null, onExternalAbort: null,
      };
      const cancelQueued = (reason) => {
        const index = queue.indexOf(item);
        if (index !== -1) queue.splice(index, 1);
        clearTimeout(item.queueTimer);
        item.signal?.removeEventListener?.("abort", item.onExternalAbort);
        reject(reason instanceof Error ? reason : abortError(undefined, reason));
      };
      item.onExternalAbort = () => {
        const reason = signal?.reason instanceof Error ? signal.reason : abortError(undefined, signal?.reason);
        if (item.started) item.controller.abort(reason);
        else cancelQueued(reason);
      };
      if (signal?.aborted) {
        cancelQueued(signal.reason);
        return;
      }
      signal?.addEventListener?.("abort", item.onExternalAbort, { once: true });
      queue.push(item);
      item.queueTimer = setTimeout(() => cancelQueued(timeoutError("gpt-mermaid: render queue timed out")),
        positiveTimeout(queueTimeoutMs));
      drain();
    });
  }

  function drain() {
    if (active || !queue.length) return;
    const item = queue.shift();
    clearTimeout(item.queueTimer);
    item.started = true;
    active = item;
    const execution = Promise.resolve().then(() => {
      throwIfAborted(item.controller.signal);
      return item.run(item.controller.signal);
    });
    const release = () => {
      active = null;
      drain();
    };
    // 此处只能订阅真实执行结果，不能订阅下面被超时/取消截短的等待。
    execution.then(release, release);
    withAbortTimeout(execution, {
      signal: item.controller.signal,
      timeoutMs: positiveTimeout(item.timeoutMs),
      timeoutMessage: item.timeoutMessage,
    }).then(item.resolve, (error) => {
      item.controller.abort(error);
      item.reject(error);
    }).finally(() => item.signal?.removeEventListener?.("abort", item.onExternalAbort));
  }

  return {
    schedule,
    pending: () => queue.length,
    active: () => active,
  };
}
