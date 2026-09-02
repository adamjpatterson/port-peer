/* eslint-disable @typescript-eslint/only-throw-error */
/* eslint-disable @typescript-eslint/prefer-promise-reject-errors */
import { parentPort } from "node:worker_threads";
import { Peer } from "port-peer";

if (!parentPort) {
  throw new Error("Expected worker parent port.");
}

const peer = new Peer(parentPort);

peer.register("echo", (value: unknown): unknown => value);
peer.register("add", (left: number, right: number): number => left + right);
peer.register("throwError", (): never => {
  const error = new TypeError("worker failure");
  throw error;
});
peer.register("rejectError", (): Promise<never> => Promise.reject(new Error("worker rejection")));
peer.register("rejectValue", (value: unknown): Promise<never> => Promise.reject(value));
peer.register("rejectUncloneable", (): Promise<never> => Promise.reject((): string => "not cloneable"));
peer.register("throwValue", (): never => {
  throw "worker string throw";
});
peer.register("returnFunction", (): (() => string) => (): string => "not cloneable");
peer.register(
  "crash",
  (): Promise<never> =>
    new Promise<never>(() => {
      setImmediate(() => {
        throw new Error("worker crash");
      });
    })
);
peer.register("delay", async (milliseconds: number): Promise<string> => {
  await new Promise<void>((resolve) => setTimeout(resolve, milliseconds));
  return "finished";
});
peer.register("registerLate", (): string => {
  peer.register("lateFunction", (value: string): string => `late:${value}`);
  return "registered";
});
peer.register("callMain", async (value: unknown): Promise<unknown> => peer.call("mainEcho", value));
