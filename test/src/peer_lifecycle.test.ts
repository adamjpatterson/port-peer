import { strict as assert } from "node:assert";
import { test, suite } from "node:test";
import { closeTestPeer, createTestPeer, withTimeout } from "./helpers.js";

await suite("Peer (lifecycle)", async () => {
  await test("rejects a pending call when the worker exits.", async () => {
    const testPeer = createTestPeer();
    await testPeer.peer.call("echo", "ready");
    const pending = testPeer.peer.call("delay", 10_000);
    await new Promise<void>((resolve) => setImmediate(resolve));
    await testPeer.worker.terminate();
    await assert.rejects(withTimeout(pending, "Pending call did not settle after worker exit."), (reason: unknown) => {
      return typeof reason === "number";
    });
  });

  await test("rejects all pending calls when the worker exits.", async () => {
    const testPeer = createTestPeer();
    await testPeer.peer.call("echo", "ready");
    const pending = Array.from({ length: 10 }, () => testPeer.peer.call("delay", 10_000));
    await new Promise<void>((resolve) => setImmediate(resolve));
    await testPeer.worker.terminate();

    const results = await Promise.allSettled(pending);
    assert.ok(results.every((result) => result.status === "rejected" && typeof result.reason === "number"));
  });

  await test("rejects calls made after worker termination.", async () => {
    const testPeer = createTestPeer();
    await testPeer.worker.terminate();
    await assert.rejects(testPeer.peer.call("echo", "after-exit"), (reason: unknown) => typeof reason === "number");
  });

  await test("rejects a call when the worker fails during startup.", async () => {
    const testPeer = createTestPeer("startup_failure.js");
    try {
      await assert.rejects(testPeer.peer.call("echo", "startup"), { message: "worker startup failure" });
    } finally {
      await closeTestPeer(testPeer);
    }
  });

  await test("rejects a pending call when the worker crashes after startup.", async () => {
    const testPeer = createTestPeer();
    try {
      await assert.rejects(testPeer.peer.call("crash"), { message: "worker crash" });
    } finally {
      await closeTestPeer(testPeer);
    }
  });
});
