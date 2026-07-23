declare const __DEV__: boolean;
declare const __TEST__: boolean;
declare const __EXTENSION__: boolean;

declare function afterEach(fn: () => void | Promise<void>): void;
declare function beforeEach(fn: () => void | Promise<void>): void;
declare function describe(name: string, fn: () => void): void;
declare const it: {
  (name: string, fn: () => void | Promise<void>): void;
  only: (name: string, fn: () => void | Promise<void>) => void;
};
declare function expect<T = any>(val: T): Expect<T>;
declare const jest: Jest;
declare function pit(name: string, fn: () => Promise<void>): void;
declare function spyOnDev<T extends object, M extends keyof T>(
  obj: T,
  key: M
): MockFunction<T[M]>;
declare function spyOnDevAndProd<T extends object, M extends keyof T>(
  obj: T,
  key: M
): MockFunction<T[M]>;
declare function spyOnProd<T extends object, M extends keyof T>(
  obj: T,
  key: M
): MockFunction<T[M]>;
declare function xdescribe(name: string, fn: () => void): void;
declare function xit(name: string, fn: () => void | Promise<void>): void;

interface Expect<T = any> {
  not: Expect<T>;
  toThrow(message?: string): void;
  toThrowError(message?: string): void;
  toBe(value: T): void;
  toEqual(value: T): void;
  toBeFalsy(): void;
  toBeTruthy(): void;
  toBeNull(): void;
  toBeUndefined(): void;
  toBeDefined(): void;
  toMatch(regexp: RegExp): void;
  toContain(string: string): void;
  toBeCloseTo(number: number, delta: number): void;
  toBeGreaterThan(number: number): void;
  toBeLessThan(number: number): void;
  toBeCalled(): void;
  toBeCalledWith(...args: any[]): void;
  lastCalledWith(...args: any[]): void;
}

interface Jest {
  autoMockOff(): void;
  autoMockOn(): void;
  clearAllTimers(): void;
  dontMock(moduleName: string): void;
  genMockFromModule(moduleObj: object): object;
  genMockFunction<T = any>(): MockFunction<T>;
  genMockFn<T = any>(): MockFunction<T>;
  mock(moduleName: string): void;
  runAllTicks(): void;
  runAllTimers(): void;
  runOnlyPendingTimers(): void;
  setMock(moduleName: string, moduleExports: object): void;
}

interface MockFunction<T = any> {
  (...args: any[]): any;
  mock: {
    calls: Array<Array<any>>;
    instances: Array<object>;
  };
  mockClear(): MockFunction<T>;
  mockImplementation(fn: (...args: any[]) => any): MockFunction<T>;
  mockImpl(fn: (...args: any[]) => any): MockFunction<T>;
  mockReturnThis(): MockFunction<T>;
  mockReturnValue(value: any): MockFunction<T>;
  mockReturnValueOnce(value: any): MockFunction<T>;
}

declare const check: any;
declare const gen: any;
