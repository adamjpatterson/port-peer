import { strict as assert } from "node:assert";
import { test, suite } from "node:test";
import { closeTestPeer, createTestPeer } from "./helpers.js";

const nextRandom = (state: number): number => (Math.imul(state, 1103515245) + 12345) >>> 0;

await suite("Peer (model)", async () => {
  await test("registration sequences match an observable reference model.", async () => {
    const testPeer = createTestPeer();
    try {
      let state = 0x12345678;
      let registered = false;
      let version = 0;
      for (let step = 0; step < 100; step++) {
        state = nextRandom(state);
        const operation = state % 3;
        if (operation === 0) {
          version++;
          const currentVersion = version;
          testPeer.peer.register("mainEcho", (): string => `version:${String(currentVersion)}`);
          registered = true;
        } else if (operation === 1) {
          testPeer.peer.deregister("mainEcho");
          registered = false;
        } else if (registered) {
          const result = await testPeer.peer.call<string>("callMain", "ignored");
          assert.strictEqual(result, `version:${String(version)}`);
        }
      }
    } finally {
      await closeTestPeer(testPeer);
    }
  });
});
