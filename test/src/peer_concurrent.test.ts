import { strict as assert } from "node:assert";
import { test, suite } from "node:test";
import { closeTestPeer, createTestPeer } from "./helpers.js";

await suite("Peer (concurrent)", async () => {
  await test("resolves many concurrent calls with the matching results.", async () => {
    const testPeer = createTestPeer();
    try {
      const calls = Array.from({ length: 100 }, (_, index) => testPeer.peer.call<number>("add", index, 1));
      assert.deepStrictEqual(
        await Promise.all(calls),
        Array.from({ length: 100 }, (_, index) => index + 1)
      );
    } finally {
      await closeTestPeer(testPeer);
    }
  });

  await test("preserves call order when calls are awaited sequentially.", async () => {
    const testPeer = createTestPeer();
    try {
      const results: number[] = [];
      for (let index = 0; index < 25; index++) {
        results.push(await testPeer.peer.call<number>("add", index, 0));
      }
      assert.deepStrictEqual(
        results,
        Array.from({ length: 25 }, (_, index) => index)
      );
    } finally {
      await closeTestPeer(testPeer);
    }
  });
});
