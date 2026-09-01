import { Worker } from "node:worker_threads";
import { fileURLToPath } from "node:url";
import { Peer } from "port-peer";

export interface TestPeer {
  worker: Worker;
  peer: Peer;
}

export const createTestPeer = (): TestPeer => {
  const worker = new Worker(fileURLToPath(new URL("./worker.js", import.meta.url)));
  return { worker, peer: new Peer(worker) };
};

export const closeTestPeer = async ({ worker }: TestPeer): Promise<void> => {
  await worker.terminate();
};

export const tick = async (): Promise<void> => {
  await new Promise<void>((resolve) => setImmediate(resolve));
};

export const withTimeout = async <T>(promise: Promise<T>, message: string, milliseconds = 2_000): Promise<T> => {
  let timeout!: NodeJS.Timeout;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => {
      reject(new Error(message));
    }, milliseconds);
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timeout);
  }
};
