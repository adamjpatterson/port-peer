import { strict as assert } from "node:assert";
import { test, suite } from "node:test";
import { closeTestPeer, createTestPeer } from "./helpers.js";

await suite("Peer (basic calls)", async () => {
  await test("calls a registered worker function and returns its value.", async () => {
    const testPeer = createTestPeer();
    try {
      assert.strictEqual(await testPeer.peer.call<string>("echo", "hello"), "hello");
      assert.strictEqual(await testPeer.peer.call<number>("add", 20, 22), 42);
    } finally {
      await closeTestPeer(testPeer);
    }
  });

  await test("supports calls in both directions.", async () => {
    const testPeer = createTestPeer();
    testPeer.peer.register("mainEcho", (value: unknown): unknown => value);
    try {
      assert.deepStrictEqual(await testPeer.peer.call("callMain", { direction: "worker-to-main" }), {
        direction: "worker-to-main",
      });
    } finally {
      await closeTestPeer(testPeer);
    }
  });

  await test("marshals structured-clone values and multiple arguments.", async () => {
    const testPeer = createTestPeer();
    try {
      const value = { nested: [1, "two", null], flag: true };
      assert.deepStrictEqual(await testPeer.peer.call("echo", value), value);
      const buffer = await testPeer.peer.call<Uint8Array>("echo", Buffer.from([1, 2, 3]));
      assert.deepStrictEqual([...buffer], [1, 2, 3]);
    } finally {
      await closeTestPeer(testPeer);
    }
  });
});
