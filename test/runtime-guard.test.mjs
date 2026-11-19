import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_RENDER_TIMEOUT_MS,
  DEFAULT_RUNTIME_TIMEOUT_MS,
  abortError,
  positiveTimeout,
  throwIfAborted,
  timeoutError,
  withAbortTimeout,
  createSerialScheduler,
} from "../src/runtime-guard.js";

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const tick = () => new Promise((resolve) => setImmediate(resolve));

test("runtime guard exposes bounded defaults and typed errors", () => {
  assert.equal(DEFAULT_RENDER_TIMEOUT_MS, 12000);
  assert.equal(DEFAULT_RUNTIME_TIMEOUT_MS, 15000);
  assert.equal(positiveTimeout(0), DEFAULT_RENDER_TIMEOUT_MS);
  assert.equal(positiveTimeout(-1, 42), 42);
  assert.equal(positiveTimeout(Number.NaN, 42), 42);
  assert.equal(positiveTimeout(50, 42), 50);
  assert.equal(abortError("stopped").name, "AbortError");
  assert.equal(timeoutError("slow").name, "TimeoutError");
  assert.equal(abortError("stopped", "cause").cause, "cause");
});

test("throwIfAborted preserves Error reasons and wraps string reasons", () => {
  assert.doesNotThrow(() => throwIfAborted(new AbortController().signal));
  const original = new Error("custom abort");
  const errorController = new AbortController();
  errorController.abort(original);
  assert.throws(() => throwIfAborted(errorController.signal), (error) => error === original);

  const stringController = new AbortController();
  stringController.abort("cancel reason");
  assert.throws(() => throwIfAborted(stringController.signal),
    (error) => error.name === "AbortError" && error.cause === "cancel reason");
});

test("withAbortTimeout rejects on timeout and removes a never-settling wait", async () => {
  const started = Date.now();
  await assert.rejects(
    withAbortTimeout(new Promise(() => {}), { timeoutMs: 15, timeoutMessage: "wait timeout" }),
    (error) => error.name === "TimeoutError" && error.message === "wait timeout",
  );
  assert(Date.now() - started < 500, "timeout should not depend on the underlying promise");
});

test("withAbortTimeout rejects on AbortSignal and preserves an Error reason", async () => {
  const controller = new AbortController();
  const reason = new Error("request cancelled");
  const wait = withAbortTimeout(new Promise(() => {}), { signal: controller.signal, timeoutMs: 1000 });
  await tick();
  controller.abort(reason);
  await assert.rejects(wait, (error) => error === reason);
});

test("serial scheduler starts tasks strictly in order", async () => {
  const scheduler = createSerialScheduler();
  const firstGate = deferred();
  const events = [];

  const first = scheduler.schedule(async () => {
    events.push("first:start");
    await firstGate.promise;
    events.push("first:end");
    return "first-result";
  }, { timeoutMs: 1000 });
  const second = scheduler.schedule(async () => {
    events.push("second:start");
    return "second-result";
  }, { timeoutMs: 1000 });

  await tick();
  assert.deepEqual(events, ["first:start"]);
  assert.equal(scheduler.pending(), 1);
  firstGate.resolve();
  assert.deepEqual(await Promise.all([first, second]), ["first-result", "second-result"]);
  assert.deepEqual(events, ["first:start", "first:end", "second:start"]);
  assert.equal(scheduler.pending(), 0);
});

test("queued tasks cancel immediately and never start", async () => {
  const scheduler = createSerialScheduler();
  const firstGate = deferred();
  const controller = new AbortController();
  const events = [];

  const first = scheduler.schedule(async () => {
    events.push("first:start");
    await firstGate.promise;
    events.push("first:end");
    return "first";
  }, { timeoutMs: 1000 });
  const cancelled = scheduler.schedule(async () => {
    events.push("cancelled:start");
    return "cancelled";
  }, { signal: controller.signal, timeoutMs: 1000 });
  const third = scheduler.schedule(async () => {
    events.push("third:start");
    return "third";
  }, { timeoutMs: 1000 });

  await tick();
  assert.equal(scheduler.pending(), 2);
  controller.abort("queued cancel");
  await assert.rejects(cancelled, (error) => error.name === "AbortError");
  assert.equal(scheduler.pending(), 1, "cancelled items must leave the queue immediately");
  firstGate.resolve();
  assert.equal(await first, "first");
  assert.equal(await third, "third");
  assert.deepEqual(events, ["first:start", "first:end", "third:start"]);
  assert.equal(scheduler.pending(), 0);
});

test("a timed-out execution retains its slot until actual settlement", async () => {
  const scheduler = createSerialScheduler();
  const events = [];
  const gate = deferred();
  const timed = scheduler.schedule(async () => {
    events.push("slow:start");
    await gate.promise;
    events.push("slow:end");
  }, { timeoutMs: 15, timeoutMessage: "execution timeout" });
  const next = scheduler.schedule(async () => {
    events.push("next:start");
    return "next";
  }, { timeoutMs: 1000 });

  await assert.rejects(timed, (error) => error.name === "TimeoutError" && error.message === "execution timeout");
  assert.deepEqual(events, ["slow:start"]);
  assert.ok(scheduler.active());
  gate.resolve();
  assert.equal(await next, "next");
  assert.deepEqual(events, ["slow:start", "slow:end", "next:start"]);
});

test("a permanently hung execution cannot leave queued callers waiting forever", async () => {
  const scheduler = createSerialScheduler();
  let nextStarted = false;
  const hung = scheduler.schedule(() => new Promise(() => {}), { timeoutMs: 10 });
  const hungFailure = assert.rejects(hung, (error) => error.name === "TimeoutError");
  const next = scheduler.schedule(() => { nextStarted = true; }, { timeoutMs: 20 });
  await assert.rejects(next, /render queue timed out/);
  await hungFailure;
  assert.equal(nextStarted, false);
  assert.equal(scheduler.pending(), 0);
  assert.ok(scheduler.active(), "a timeout is not evidence that execution has stopped");
});

test("aborting a non-cooperative task also retains the slot until actual settlement", async () => {
  const scheduler = createSerialScheduler();
  const controller = new AbortController();
  const gate = deferred();
  const events = [];
  const active = scheduler.schedule(async () => {
    events.push("old:start");
    await gate.promise;
    events.push("old:end");
  }, { signal: controller.signal });
  const failure = assert.rejects(active, (error) => error.name === "AbortError");
  const next = scheduler.schedule(() => events.push("new:start"));
  await tick();
  controller.abort();
  await failure;
  assert.deepEqual(events, ["old:start"]);
  gate.resolve();
  await next;
  assert.deepEqual(events, ["old:start", "old:end", "new:start"]);
});

test("active task receives abort and the next queued task still runs", async () => {
  const scheduler = createSerialScheduler();
  const controller = new AbortController();
  const events = [];
  let internalSignal = null;

  const active = scheduler.schedule(async (signal) => {
    internalSignal = signal;
    events.push("active:start");
    await new Promise((resolve, reject) => {
      signal.addEventListener("abort", () => reject(signal.reason), { once: true });
    });
  }, { signal: controller.signal, timeoutMs: 1000 });
  const next = scheduler.schedule(async () => {
    events.push("next:start");
    return "next";
  }, { timeoutMs: 1000 });

  await tick();
  controller.abort("cancel active");
  await assert.rejects(active, (error) => error.name === "AbortError");
  assert.equal(internalSignal?.aborted, true, "run must receive an aborted internal signal");
  assert.equal(await next, "next");
  assert.deepEqual(events, ["active:start", "next:start"]);
});

test("an already-aborted signal rejects before a task enters the queue", async () => {
  const controller = new AbortController();
  controller.abort(new Error("already stopped"));
  const scheduler = createSerialScheduler();
  let started = false;

  await assert.rejects(
    scheduler.schedule(async () => { started = true; }, { signal: controller.signal }),
    (error) => error.message === "already stopped",
  );
  await tick();
  assert.equal(started, false);
  assert.equal(scheduler.pending(), 0);
});
