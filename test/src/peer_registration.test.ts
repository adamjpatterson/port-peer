import { strict as assert } from "node:assert";
import { test, suite } from "node:test";
import { assertTimesOut, closeTestPeer, createTestPeer } from "./helpers.js";

await suite("Peer (registration)", async () => {
  await test("late registration services calls that were already sent.", async () => {
    const testPeer = createTestPeer();
    try {
      const pending = testPeer.peer.call<string>("lateFunction", "value");
      assert.strictEqual(await testPeer.peer.call("registerLate"), "registered");
      assert.strictEqual(await pending, "late:value");
    } finally {
      await closeTestPeer(testPeer);
    }
  });

  await test("deregister prevents future calls from being handled locally.", async () => {
    const testPeer = createTestPeer();
    try {
      testPeer.peer.register("mainEcho", (): string => "first");
      testPeer.peer.deregister("mainEcho");
      await assertTimesOut(testPeer.peer.call("callMain", "ignored"), "Timed out waiting for deregistered call.");
    } finally {
      await closeTestPeer(testPeer);
    }
  });

  await test("the latest registration replaces the previous function.", async () => {
    const testPeer = createTestPeer();
    testPeer.peer.register("mainEcho", (): string => "first");
    testPeer.peer.register("mainEcho", (): string => "second");
    try {
      assert.strictEqual(await testPeer.peer.call("callMain", "ignored"), "second");
    } finally {
      await closeTestPeer(testPeer);
    }
  });

  await test("multiple pending late-bound calls are all serviced after registration.", async () => {
    const testPeer = createTestPeer();
    try {
      const pending = Array.from({ length: 20 }, (_, index) =>
        testPeer.peer.call<string>("lateFunction", String(index))
      );
      await testPeer.peer.call("registerLate");
      assert.deepStrictEqual(
        await Promise.all(pending),
        Array.from({ length: 20 }, (_, index) => `late:${String(index)}`)
      );
    } finally {
      await closeTestPeer(testPeer);
    }
  });
});
