import { strict as assert } from "node:assert";
import { test, suite } from "node:test";
import { assertTimesOut, closeTestPeer, createTestPeer } from "./helpers.js";

await suite("Peer (errors)", async () => {
  await test("marshals a synchronously thrown worker error.", async () => {
    const testPeer = createTestPeer();
    try {
      await assert.rejects(testPeer.peer.call("throwError"), (error: unknown) => {
        assert.ok(error instanceof Error);
        assert.strictEqual(error.message, "worker failure");
        assert.strictEqual(error.name, "WorkerTypeError");
        assert.strictEqual((error as Error & { code?: string }).code, "WORKER_FAILURE");
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

  await test("rejects calls containing values that cannot be cloned.", async () => {
    const testPeer = createTestPeer();
    try {
      await assert.rejects(
        testPeer.peer.call("echo", (): string => "not cloneable"),
        {
          name: "DataCloneError",
        }
      );
    } finally {
      await closeTestPeer(testPeer);
    }
  });

  await test("rejects when the worker returns a value that cannot be cloned.", async () => {
    const testPeer = createTestPeer();
    try {
      await assert.rejects(testPeer.peer.call("returnFunction"), { name: "DataCloneError" });
    } finally {
      await closeTestPeer(testPeer);
    }
  });

  await test("does not leave a missing registration call unbounded in the test suite.", async () => {
    const testPeer = createTestPeer();
    try {
      await assertTimesOut(testPeer.peer.call("missingFunction"), "Timed out waiting for missing registration.");
    } finally {
      await closeTestPeer(testPeer);
    }
  });
});
