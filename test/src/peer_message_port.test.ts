import { MessageChannel } from "node:worker_threads";
import { strict as assert } from "node:assert";
import { test, suite } from "node:test";
import { Peer } from "port-peer";

await suite("Peer (MessagePort)", async () => {
  await test("supports calls over a direct MessagePort pair.", async () => {
    const { port1, port2 } = new MessageChannel();
    const caller = new Peer(port1);
    const receiver = new Peer(port2);
    receiver.register("echo", (value: unknown): unknown => value);

    try {
      assert.deepStrictEqual(await caller.call("echo", { transport: "MessagePort" }), { transport: "MessagePort" });
    } finally {
      port1.close();
      port2.close();
    }
  });
});
