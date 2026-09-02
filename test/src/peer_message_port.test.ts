import { MessageChannel } from "node:worker_threads";
import { strict as assert } from "node:assert";
import { test, suite } from "node:test";
import { Peer } from "port-peer";
import { withTimeout } from "./helpers.js";

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

  await test("rejects pending calls when the MessagePort closes.", async () => {
    const { port1, port2 } = new MessageChannel();
    const caller = new Peer(port1);
    new Peer(port2);

    try {
      const pending = caller.call("missingFunction");
      await new Promise<void>((resolve) => setImmediate(resolve));
      port2.close();

      await assert.rejects(withTimeout(pending, "Pending call did not settle after port closure."), {
        message: "Port closed.",
      });
      await assert.rejects(caller.call("after-close"), { message: "Port closed." });
    } finally {
      port1.close();
      port2.close();
    }
  });
});
