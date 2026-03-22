declare module "better-sqlite3" {
  export interface RunResult {
    changes: number;
    lastInsertRowid: number | bigint;
  }

  export interface Statement<
    BindParameters extends unknown[] = unknown[],
    Result = unknown,
  > {
    run(...params: BindParameters): RunResult;
    get(...params: BindParameters): Result | undefined;
    all(...params: BindParameters): Result[];
  }

  export interface Database {
    pragma(source: string): unknown;
    exec(source: string): this;
    prepare<BindParameters extends unknown[] = unknown[], Result = unknown>(
      source: string,
    ): Statement<BindParameters, Result>;
    transaction<Args extends unknown[]>(
      fn: (...args: Args) => void,
    ): (...args: Args) => void;
  }

  export default class DatabaseConstructor implements Database {
    constructor(filename: string);
    pragma(source: string): unknown;
    exec(source: string): this;
    prepare<BindParameters extends unknown[] = unknown[], Result = unknown>(
      source: string,
    ): Statement<BindParameters, Result>;
    transaction<Args extends unknown[]>(
      fn: (...args: Args) => void,
    ): (...args: Args) => void;
  }
}
