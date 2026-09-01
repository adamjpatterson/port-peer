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

  await test("rejects calls made after worker termination.", async () => {
    const testPeer = createTestPeer();
    await testPeer.worker.terminate();
    await assert.rejects(testPeer.peer.call("echo", "after-exit"), (reason: unknown) => typeof reason === "number");
    await closeTestPeer(testPeer);
  });
});
