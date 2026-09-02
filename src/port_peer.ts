/* eslint-disable @typescript-eslint/prefer-promise-reject-errors */
/* eslint-disable @typescript-eslint/use-unknown-in-catch-callback-variable */
import * as threads from "node:worker_threads";
import { CallMessage, ResultMessage } from "./messages.js";

export interface CallOptions<T> {
  id: number;
  fn: string;
  r: (value: T) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  j: (reason?: any) => void;
}

export class Call<T> {
  public id: number;
  public fn: string;
  public r: (value: T) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public j: (reason?: any) => void;

  constructor({ id, fn, r, j }: CallOptions<T>) {
    this.id = id;
    this.fn = fn;
    this.r = r;
    this.j = j;
  }
}

export class PortPeer {
  public port: threads.MessagePort | threads.Worker;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public callRegistrar: Map<number, Call<any>>;
  public cachedCallMessages: Set<CallMessage>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public callableRegistrar: Map<string, (...args: any[]) => any>;
  private callID: number;
  protected portOnline: Promise<unknown> = Promise.resolve();

  constructor(port: threads.MessagePort | threads.Worker) {
    this.port = port;
    this.callID = 0;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.callRegistrar = new Map<number, Call<any>>();
    this.cachedCallMessages = new Set<CallMessage>();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.callableRegistrar = new Map<string, (...args: any[]) => any>();

    if (port instanceof threads.Worker) {
      this.portOnline = new Promise<void>((resolve, reject) => {
        this.port.once("online", resolve);
        this.port.once("error", reject);
        this.port.once("exit", reject);
      });
      this.portOnline.catch(() => {});

      this.port.once("error", (err: Error) => {
        this.portOnline = Promise.reject(err);
        void this.portOnline.catch(() => {});
        for (const [index, call] of this.callRegistrar.entries()) {
          this.callRegistrar.delete(index);
          call.j(err);
        }
      });

      this.port.once("exit", (exitCode: number) => {
        this.portOnline = Promise.reject(exitCode);
        void this.portOnline.catch(() => {});
        for (const [index, call] of this.callRegistrar.entries()) {
          this.callRegistrar.delete(index);
          call.j(exitCode);
        }
      });
    }

    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    this.port.on("message", async (message: CallMessage | ResultMessage) => {
      if (message.type == "call") {
        const func = this.callableRegistrar.get(message.fn);
        if (func) {
          try {
            await this.tryPost(func, message);
          } catch (err) {
            console.error(err);
          }
        } else {
          this.cachedCallMessages.add(message);
        }
      } else {
        const call = this.callRegistrar.get(message.id);
        this.callRegistrar.delete(message.id);
        if (call) {
          if (!message.ok) {
            call.j(message.error);
          } else {
            call.r(message.value);
          }
        }
      }
    });
  }

  protected async tryPost(func: (...args: unknown[]) => unknown, message: CallMessage): Promise<void> {
    try {
      const value = await func(...message.args);
      await new Promise<null>((r, j) => {
        this.port.once("messageerror", j);
        this.port.postMessage(new ResultMessage({ id: message.id, value, ok: true }));
        this.port.removeListener("messageerror", j);
        r(null);
      });
    } catch (error) {
      await new Promise<null>((r, j) => {
        this.port.once("messageerror", j);
        const errorToSend = typeof error == "function" || typeof error == "symbol" ? String(error) : error;

        this.port.postMessage(new ResultMessage({ id: message.id, error: errorToSend, ok: false }));
        this.port.removeListener("messageerror", j);
        r(null);
      });
    }
  }

  public async call<T>(fn: string, ...args: unknown[]): Promise<T> {
    await this.portOnline;
    // Each call must await here, until the port comes online, in order to ensure previous calls are processed prior to this one.

    return new Promise<T>((r, j) => {
      const id = this.callID++;
      this.callRegistrar.set(id, new Call<T>({ id, fn, r, j }));
      this.port.once("messageerror", j);
      this.port.postMessage(new CallMessage({ id, fn, args }));
      this.port.removeListener("messageerror", j);
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public register(name: string, func: (...args: any[]) => any): void {
    this.callableRegistrar.set(name, func);
    for (const cachedCallMessage of [...this.cachedCallMessages]) {
      if (cachedCallMessage.fn === name) {
        this.cachedCallMessages.delete(cachedCallMessage);
        this.tryPost(func, cachedCallMessage).catch((err: Error) => {
          console.error(err);
        });
      }
    }
  }

  public deregister(name: string): void {
    this.callableRegistrar.delete(name);
  }
}
