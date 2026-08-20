declare const __DEV__: boolean;
declare const __TEST__: boolean;
declare const __EXTENSION__: boolean;

declare function afterEach(fn: any): any;
declare function beforeEach(fn: any): any;
declare function describe(name: string, fn: any): void;
declare const it: {
  (name: string, fn: any): void;
  only: (name: string, fn: any) => void;
};
declare function expect(val: any): Expect;
declare const jest: Jest;
declare function pit(name: string, fn: any): void;
declare function spyOnDev(obj: any, key: string): any;
declare function spyOnDevAndProd(obj: any, key: string): any;
declare function spyOnProd(obj: any, key: string): any;
declare function xdescribe(name: string, fn: any): void;
declare function xit(name: string, fn: any): void;

interface Expect {
  not: Expect;
  toThrow(message?: string): void;
  toThrowError(message?: string): void;
  toBe(value: any): void;
  toEqual(value: any): void;
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
  toBeCalledWith(...arguments): void;
  lastCalledWith(...arguments): void;
}

interface Jest {
  autoMockOff(): void;
  autoMockOn(): void;
  clearAllTimers(): void;
  dontMock(moduleName: string): void;
  genMockFromModule(moduleObj: Object): Object;
  genMockFunction(): MockFunction;
  genMockFn(): MockFunction;
  mock(moduleName: string): void;
  runAllTicks(): void;
  runAllTimers(): void;
  runOnlyPendingTimers(): void;
  setMock(moduleName: string, moduleExports: Object): void;
}

interface MockFunction {
  (...arguments): any;
  mock: {
    calls: Array<Array<any>>;
    instances: Array<Object>;
  };
  mockClear(): void;
  mockImplementation(fn: Function): MockFunction;
  mockImpl(fn: Function): MockFunction;
  mockReturnThis(): MockFunction;
  mockReturnValue(value: any): MockFunction;
  mockReturnValueOnce(value: any): MockFunction;
}

declare const check: any;
declare const gen: any;
