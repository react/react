// flow-typed signature: d48da8db828529253fc20b80747846ea
// flow-typed version: c6154227d1/minimist_v1.x.x/flow_>=v0.104.x

declare module 'minimist' {
  declare type minimistOptions = {
    string?: string | Array<string>,
    boolean?: boolean | string | Array<string>,
    alias?: {[arg: string]: string | Array<string>, ...},
    default?: {[arg: string]: any, ...},
    stopEarly?: boolean,
    // TODO: Strings as keys don't work...
    // '--'? boolean,
    unknown?: (param: string) => boolean,
    ...
  };

  declare type minimistOutput = {
    [flag: string]: string | boolean,
    _: Array<string>,
    ...
  };

  declare module.exports: (
    argv: Array<string>,
    opts?: minimistOptions
  ) => minimistOutput;
}
