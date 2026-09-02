import { strict as assert } from "node:assert";
import { test, suite } from "node:test";
import { assertTimesOut, closeTestPeer, createTestPeer } from "./helpers.js";

await suite("Peer (errors)", async () => {
  await test("forwards a synchronously thrown worker error.", async () => {
    const testPeer = createTestPeer();
    try {
      await assert.rejects(testPeer.peer.call("throwError"), (error: unknown) => {
        assert.ok(error instanceof Error);
        assert.strictEqual(error.message, "worker failure");
        assert.match(error.stack ?? "", /worker failure/);
        return true;
      });
    } finally {
      await closeTestPeer(testPeer);
    }
  });

  await test("forwards a rejected worker promise.", async () => {
    const testPeer = createTestPeer();
    try {
      await assert.rejects(testPeer.peer.call("rejectError"), { message: "worker rejection" });
    } finally {
      await closeTestPeer(testPeer);
    }
  });

  await test("forwards cloneable non-Error rejection values.", async () => {
    const testPeer = createTestPeer();
    try {
      for (const value of ["worker string rejection", false, 0, "", null, undefined]) {
        await assert.rejects(testPeer.peer.call("rejectValue", value), (reason: unknown) => {
          assert.strictEqual(reason, value);
          return true;
        });
      }
    } finally {
      await closeTestPeer(testPeer);
    }
  });

  await test("forwards a thrown string rejection value.", async () => {
    const testPeer = createTestPeer();
    try {
      await assert.rejects(testPeer.peer.call("throwValue"), (reason: unknown) => {
        assert.strictEqual(reason, "worker string throw");
        return true;
      });
    } finally {
      await closeTestPeer(testPeer);
    }
  });

  await test("forwards the postMessage error when a rejection value cannot be cloned.", async () => {
    const testPeer = createTestPeer();
    try {
      await assert.rejects(testPeer.peer.call("rejectUncloneable"), { name: "DataCloneError" });
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
      assert.strictEqual(testPeer.peer.callRegistrar.size, 0);
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
