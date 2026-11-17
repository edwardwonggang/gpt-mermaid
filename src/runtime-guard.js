/*
 * 职责：为运行时长、中止信号和串行渲染提供统一保护。
 * 调用方：render.js（加载/渲染队列）与 ui.js（等待超时）。
 * 依赖：浏览器或 Node 20+ 的 AbortController、Promise、setTimeout。
 * 红线：超时只负责结束等待并给出明确错误；底层不响应 signal 的第三方任务
 *       可能仍会完成，但队列不能被一个永不 settle 的 Promise 永久卡住。
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
 * 严格串行的调度器。任务只有在前一项 settle 或命中超时后才会启动，
 * 排队中的任务可通过 signal 立即撤销。
 */
export function createSerialScheduler() {
  const queue = [];
  let running = false;
  let active = null;

  function schedule(run, {
    signal,
    timeoutMs = DEFAULT_RENDER_TIMEOUT_MS,
    timeoutMessage,
  } = {}) {
    return new Promise((resolve, reject) => {
      const item = {
        run, signal, timeoutMs, timeoutMessage, resolve, reject,
        controller: new AbortController(), started: false, cancelled: false, onExternalAbort: null,
      };
      const cancelQueued = (reason) => {
        if (item.cancelled) return;
        item.cancelled = true;
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
      void drain();
    });
  }

  async function drain() {
    if (running) return;
    running = true;
    try {
      while (queue.length) {
        const item = queue.shift();
        if (item.cancelled) continue;
        item.started = true;
        active = item;
        try {
          const result = await withAbortTimeout(item.run(item.controller.signal), {
            signal: item.signal,
            timeoutMs: item.timeoutMs,
            timeoutMessage: item.timeoutMessage,
          });
          item.resolve(result);
        } catch (error) {
          item.controller.abort(error);
          item.reject(error);
        } finally {
          item.signal?.removeEventListener?.("abort", item.onExternalAbort);
          active = null;
        }
      }
    } finally {
      running = false;
      if (queue.length) void drain();
    }
  }

  return {
    schedule,
    pending: () => queue.length,
    active: () => active,
  };
}
