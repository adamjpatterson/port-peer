import { Worker, isMainThread, parentPort } from "node:worker_threads";
import { fileURLToPath } from "node:url";
import { Peer } from "@far-analytics/port-peer";

if (isMainThread) {
  // This is the main thread.
  void (async () => {
    const worker = new Worker(fileURLToPath(import.meta.url)); // (1)
    const peer = new Peer(worker); // (2)
    try {
      const greeting = await peer.call("hello_world", "another"); // (3)
      console.log(greeting); // (8)

      const result = await peer.call("add", 1, 1); // (9)
      console.log(result); // (10)

      await peer.call("abend", "This Error is expected, indeed."); // (11)
    } catch (err) {
      console.error(err); // (12)
    } finally {
      worker.terminate(); // (13)
    }
  })();
} else {
  // This is a worker thread.
  if (parentPort) {
    const peer = new Peer(parentPort); // (4)
    peer.register("abend", (message) => {
      throw new Error(message);
    }); // (5)
    peer.register("hello_world", (value) => `Hello, ${value} world!`); // (6)
    peer.register("add", (a, b) => a + b); // (7)
  }
}
