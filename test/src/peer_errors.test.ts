import { strict as assert } from "node:assert";
import { test, suite } from "node:test";
import { closeTestPeer, createTestPeer } from "./helpers.js";

await suite("Peer (errors)", async () => {
  await test("marshals a synchronously thrown worker error.", async () => {
    const testPeer = createTestPeer();
    try {
      await assert.rejects(testPeer.peer.call("throwError"), (error: unknown) => {
        assert.ok(error instanceof Error);
        assert.strictEqual(error.message, "worker failure");
        assert.strictEqual(error.name, "WorkerTypeError");
        return true;
      });
    } finally {
      await closeTestPeer(testPeer);
    }
  });

  await test("marshals a rejected worker promise.", async () => {
    const testPeer = createTestPeer();
    try {
      await assert.rejects(testPeer.peer.call("rejectError"), { message: "worker rejection" });
    } finally {
      await closeTestPeer(testPeer);
    }
  });
});
