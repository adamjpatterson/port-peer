import { strict as assert } from "node:assert";
import { test, suite } from "node:test";
import { closeTestPeer, createTestPeer } from "./helpers.js";

const nextRandom = (state: number): number => (Math.imul(state, 1664525) + 1013904223) >>> 0;

await suite("Peer (stress)", async () => {
  await test("deterministic mixed batches preserve request-to-response mapping.", async () => {
    const testPeer = createTestPeer();
    try {
      let state = 0xc0ffee;
      const expected: number[] = [];
      const calls: Promise<number>[] = [];
      for (let index = 0; index < 250; index++) {
        state = nextRandom(state);
        const left = state % 10_000;
        state = nextRandom(state);
        const right = state % 10_000;
        expected.push(left + right);
        calls.push(testPeer.peer.call<number>("add", left, right));
      }
      assert.deepStrictEqual(await Promise.all(calls), expected);
    } finally {
      await closeTestPeer(testPeer);
    }
  });

  await test(
    "optional soak test handles repeated concurrent batches.",
    { skip: process.env.PORT_PEER_SOAK === "1" ? false : "Set PORT_PEER_SOAK=1 to run the optional peer soak test." },
    async () => {
      const testPeer = createTestPeer();
      try {
        for (let batch = 0; batch < 20; batch++) {
          const calls = Array.from({ length: 500 }, (_, index) => testPeer.peer.call<number>("add", batch, index));
          assert.deepStrictEqual(
            await Promise.all(calls),
            Array.from({ length: 500 }, (_, index) => batch + index)
          );
        }
      } finally {
        await closeTestPeer(testPeer);
      }
    }
  );
});
