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
  protected portState: Promise<unknown> = Promise.resolve();

  constructor(port: threads.MessagePort | threads.Worker) {
    this.port = port;
    this.callID = 0;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.callRegistrar = new Map<number, Call<any>>();
    this.cachedCallMessages = new Set<CallMessage>();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.callableRegistrar = new Map<string, (...args: any[]) => any>();

    if (port instanceof threads.Worker) {
      this.port.once("error", this.dispose);
      this.port.once("exit", this.dispose);
    } else {
      this.port.once("close", () => {
        this.dispose(new Error("Port closed."));
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

  private dispose = (value: number | Error): void => {
    try {
      this.cachedCallMessages.clear();
      this.portState = Promise.reject(value);
      void this.portState.catch(() => {});
      for (const [index, call] of this.callRegistrar.entries()) {
        this.callRegistrar.delete(index);
        call.j(value);
      }
    } catch (err) {
      console.error(err);
    }
  };

  protected async tryPost(func: (...args: unknown[]) => unknown, message: CallMessage): Promise<void> {
    try {
      const value = await func(...message.args);
      this.port.postMessage(new ResultMessage({ id: message.id, value, ok: true }));
    } catch (error) {
      try {
        this.port.postMessage(new ResultMessage({ id: message.id, error, ok: false }));
      } catch (postMessageError) {
        this.port.postMessage(new ResultMessage({ id: message.id, error: postMessageError, ok: false }));
      }
    }
  }

  public async call<T>(fn: string, ...args: unknown[]): Promise<T> {
    await this.portState;
    return new Promise<T>((r, j) => {
      const id = this.callID++;
      this.callRegistrar.set(id, new Call<T>({ id, fn, r, j }));
      try {
        this.port.postMessage(new CallMessage({ id, fn, args }));
      } catch (error) {
        this.callRegistrar.delete(id);
        j(error);
      }
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
