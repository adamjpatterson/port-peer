import { Worker } from "node:worker_threads";
import { fileURLToPath } from "node:url";
import { Peer } from "port-peer";

export interface TestPeer {
  worker: Worker;
  peer: Peer;
}

export const createTestPeer = (workerFile = "worker.js"): TestPeer => {
  const worker = new Worker(fileURLToPath(new URL(`./${workerFile}`, import.meta.url)));
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

export const assertTimesOut = async (promise: Promise<unknown>, message: string): Promise<void> => {
  void promise.catch(() => {});
  await withTimeout(
    promise.then(() => {
      throw new Error(`Expected timeout: ${message}`);
    }),
    message,
    250
  ).catch((error: unknown) => {
    if (!(error instanceof Error) || error.message !== message) {
      throw error;
    }
  });
};
