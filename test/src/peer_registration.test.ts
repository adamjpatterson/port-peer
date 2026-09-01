import { strict as assert } from "node:assert";
import { test, suite } from "node:test";
import { closeTestPeer, createTestPeer } from "./helpers.js";

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
      testPeer.peer.register("localFunction", (): string => "local");
      testPeer.peer.deregister("localFunction");
      assert.strictEqual(testPeer.peer.callableRegistrar.has("localFunction"), false);
    } finally {
      await closeTestPeer(testPeer);
    }
  });
});
