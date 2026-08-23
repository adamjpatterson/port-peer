import { Worker, isMainThread, parentPort, threadId } from "node:worker_threads";
import { fileURLToPath } from "node:url";
import { strict as assert } from "node:assert";
import { Peer } from "@far-analytics/port-peer";

if (isMainThread) {
  // This is the main thread.
  void (async () => {
    const worker = new Worker(fileURLToPath(import.meta.url)); // (1)
    const peer = new Peer(worker); // (2)

    worker.on(
      "online",
      // eslint-disable-next-line @typescript-eslint/no-misused-promises
      /*(4)*/ async () => {
        try {
          const greeting = await peer.call<string>("hello_world", "again, another"); // (9)

          console.log(greeting); // (11)

          await peer.call("a_reasonable_assertion", "To err is Human."); // (12)
        } catch (err) {
          console.error(`Now, back in the main thread, we will handle the`, err); // (13)
        } finally {
          worker.terminate().catch(() => {}); // (14)

          // eslint-disable-next-line @typescript-eslint/no-misused-promises
          setTimeout(async () => {
            try {
              await peer.call<string>("hello_world", "no more..."); // (15)
            } catch (err) {
              if (err instanceof Error) {
                console.error(err);
              } else if (typeof err == "number") {
                console.log(`Exit code: ${err.toString()}`); // (16)
              }
            }

            // The worker thread is terminated; however, the call to the `very_late_binding` function in the worker thread is still outstanding.
            peer.register("very_late_binding", (value: number): void => {
              console.log(`The worker's thread Id was ${value.toString()}.`);
            }); // (17)
          }, 4);
        }
      }
    );

    try {
      // This call will be invoked once the `hello_world` function has been bound in the worker.
      const greeting = await peer.call<string>("hello_world", "another"); // (3)

      console.log(greeting); // (10)
    } catch (err) {
      console.error(err);
    }
  })();
} else {
  // This is a worker thread.

  function nowThrowAnError(message: string) {
    // This seems reasonable...
    assert.notEqual(typeof new Object(), typeof null, message);
  }

  function callAFunction(message: string) {
    nowThrowAnError(message);
  }

  if (parentPort) {
    try {
      const peer = new Peer(parentPort); // (5)

      peer.register("hello_world", (value: string): string => `Hello, ${value} world!`); // (6)

      // This will throw in the main thread.
      peer.register("a_reasonable_assertion", callAFunction); // (7).

      await peer.call("very_late_binding", threadId); // (8)
    } catch (err) {
      console.error(err);
    }
  }
}
