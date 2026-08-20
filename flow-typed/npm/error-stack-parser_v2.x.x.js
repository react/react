// flow-typed signature: 132e48034ef4756600e1d98681a166b5
// flow-typed version: c6154227d1/error-stack-parser_v2.x.x/flow_>=v0.104.x

declare module 'error-stack-parser' {
  declare interface StackFrame {
    constructor(object: StackFrame): StackFrame;

    isConstructor?: boolean;
    getIsConstructor(): boolean;
    setIsConstructor(): void;

    isEval?: boolean;
    getIsEval(): boolean;
    setIsEval(): void;

    isNative?: boolean;
    getIsNative(): boolean;
    setIsNative(): void;

    isTopLevel?: boolean;
    getIsTopLevel(): boolean;
    setIsTopLevel(): void;

    columnNumber?: number;
    getColumnNumber(): number;
    setColumnNumber(): void;

    lineNumber?: number;
    getLineNumber(): number;
    setLineNumber(): void;

    fileName?: string;
    getFileName(): string;
    setFileName(): void;

    functionName?: string;
    getFunctionName(): string;
    setFunctionName(): void;

    source?: string;
    getSource(): string;
    setSource(): void;

    args?: any[];
    getArgs(): any[];
    setArgs(): void;

    evalOrigin?: StackFrame;
    getEvalOrigin(): StackFrame;
    setEvalOrigin(): void;

    toString(): string;
  }

  declare class ErrorStackParser {
    parse(error: Error): Array<StackFrame>;
  }

  declare module.exports: ErrorStackParser;
}
