export interface CallMessageOptions {
  id: number;
  fn: string;
  args: unknown[];
}

export class CallMessage {
  public type: "call";
  public id: number;
  public fn: string;
  public args: unknown[];

  constructor({ id, fn, args }: CallMessageOptions) {
    this.type = "call";
    this.id = id;
    this.fn = fn;
    this.args = args;
  }
}

export type ResultMessageOptions =
  | {
      id: number;
      ok: true;
      value: unknown;
    }
  | {
      id: number;
      ok: false;
      error: unknown;
    };

export class ResultMessage {
  public type: "result";
  public id: number;
  public ok: boolean;
  public value?: unknown;
  public error?: unknown;

  constructor(options: ResultMessageOptions) {
    this.type = "result";
    this.ok = options.ok;
    this.id = options.id;
    this.value = options.ok ? options.value : undefined;
    this.error = options.ok ? undefined : options.error;
  }
}
