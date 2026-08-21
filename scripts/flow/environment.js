/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

/* eslint-disable */

declare const __PROFILE__: boolean;
declare const __EXPERIMENTAL__: boolean;
declare const __VARIANT__: boolean;

declare const __REACT_DEVTOOLS_GLOBAL_HOOK__: any; /*?{
  inject: ?((stuff: Object) => void)
};*/

declare const reportError: (error: mixed) => void;

declare module 'create-react-class' {
  declare const exports: $FlowFixMe;
}

declare interface ConsoleTask {
  run<T>(f: () => T): T;
}

// $FlowFixMe[libdef-override]
declare var console: {
  assert(condition: mixed, ...data: Array<any>): void,
  clear(): void,
  count(label?: string): void,
  countReset(label?: string): void,
  debug(...data: Array<any>): void,
  dir(...data: Array<any>): void,
  dirxml(...data: Array<any>): void,
  error(...data: Array<any>): void,
  _exception(...data: Array<any>): void,
  group(...data: Array<any>): void,
  groupCollapsed(...data: Array<any>): void,
  groupEnd(): void,
  info(...data: Array<any>): void,
  log(...data: Array<any>): void,
  profile(name?: string): void,
  profileEnd(name?: string): void,
  table(
    tabularData:
      | {[key: string]: any, ...}
      | Array<{[key: string]: any, ...}>
      | Array<Array<any>>,
  ): void,
  time(label?: string): void,
  timeEnd(label: string): void,
  timeStamp(
    label?: string,
    start?: string | number,
    end?: string | number,
    trackName?: string,
    trackGroup?: string,
    color?: string,
  ): void,
  timeLog(label?: string, ...data?: Array<any>): void,
  trace(...data: Array<any>): void,
  warn(...data: Array<any>): void,
  createTask(label: string): ConsoleTask,
  ...
};

type ScrollTimelineOptions = {
  source: Element,
  axis?: 'block' | 'inline' | 'x' | 'y',
  ...
};

declare class ScrollTimeline extends AnimationTimeline {
  constructor(options?: ScrollTimelineOptions): void;
  axis: 'block' | 'inline' | 'x' | 'y';
  source: Element;
}

// Flow hides the props of React$Element, this overrides it to unhide
// them for React internals.
// $FlowFixMe[libdef-override]
declare opaque type React$Element<
  +ElementType: React$ElementType,
  +P = React$ElementConfig<ElementType>,
>: {
  +type: ElementType,
  +props: P,
  +key: React$Key | null,
  +ref: any,
};

declare type React$CustomJSXFactory = any;

declare const trustedTypes: {
  isHTML: (value: any) => boolean,
  isScript: (value: any) => boolean,
  isScriptURL: (value: any) => boolean,
  // TrustedURLs are deprecated and will be removed soon: https://github.com/WICG/trusted-types/pull/204
  isURL?: (value: any) => boolean,
};

// ReactFeatureFlags www fork
declare module 'ReactFeatureFlags' {
  declare module.exports: any;
}

// ReactFiberErrorDialog www fork
declare module 'ReactFiberErrorDialog' {
  declare module.exports: {showErrorDialog: (error: mixed) => boolean, ...};
}

// EventListener www fork
declare module 'EventListener' {
  declare module.exports: {
    listen: (
      target: EventTarget,
      type: string,
      callback: Function,
      priority?: number,
      options?: {passive: boolean, ...},
    ) => mixed,
    capture: (target: EventTarget, type: string, callback: Function) => mixed,
    captureWithPassiveFlag: (
      target: EventTarget,
      type: string,
      callback: Function,
      passive: boolean,
    ) => mixed,
    bubbleWithPassiveFlag: (
      target: EventTarget,
      type: string,
      callback: Function,
      passive: boolean,
    ) => mixed,
    ...
  };
}

declare function __webpack_chunk_load__(id: string): Promise<mixed>;
declare function __webpack_get_script_filename__(id: string): string;
declare const __webpack_require__: ((id: string) => any) & {
  u: string => string,
};

declare function __turbopack_load_by_url__(id: string): Promise<mixed>;
declare const __turbopack_require__: ((id: string) => any) & {
  u: string => string,
};

declare var parcelRequire: {
  (id: string): any,
  load: (url: string) => Promise<mixed>,
  extendImportMap: (importMap: {[string]: string}) => void,
  meta: {
    publicUrl: string,
    devServer: string | null,
  },
};

declare module 'pg' {
  declare const Pool: (options: mixed) => {
    query: (query: string, values?: Array<mixed>) => void,
  };
}

declare module 'busboy' {
  import type {Writable, Readable} from 'stream';

  declare interface Info {
    encoding: string;
    mimeType: string;
  }

  declare interface FileInfo extends Info {
    filename: string;
  }

  declare interface FieldInfo extends Info {
    nameTruncated: boolean;
    valueTruncated: boolean;
  }

  declare interface BusboyEvents {
    file: (name: string, stream: Readable, info: FileInfo) => void;
    field: (name: string, value: string, info: FieldInfo) => void;
    partsLimit: () => void;
    filesLimit: () => void;
    fieldsLimit: () => void;
    error: (error: mixed) => void;
    close: () => void;
  }
  declare interface Busboy extends Writable {
    addListener<Event: $Keys<BusboyEvents>>(
      event: Event,
      listener: BusboyEvents[Event],
    ): this;
    addListener(event: string, listener: Function): this;

    on<Event: $Keys<BusboyEvents>>(
      event: Event,
      listener: BusboyEvents[Event],
    ): this;
    on(event: string, listener: Function): this;

    once<Event: $Keys<BusboyEvents>>(
      event: Event,
      listener: BusboyEvents[Event],
    ): this;
    once(event: string, listener: Function): this;

    removeListener<Event: $Keys<BusboyEvents>>(
      event: Event,
      listener: BusboyEvents[Event],
    ): this;
    removeListener(event: string, listener: Function): this;

    off<Event: $Keys<BusboyEvents>>(
      event: Event,
      listener: BusboyEvents[Event],
    ): this;
    off(event: string, listener: Function): this;

    prependListener<Event: $Keys<BusboyEvents>>(
      event: Event,
      listener: BusboyEvents[Event],
    ): this;
    prependListener(event: string, listener: Function): this;

    prependOnceListener<Event: $Keys<BusboyEvents>>(
      event: Event,
      listener: BusboyEvents[Event],
    ): this;
    prependOnceListener(event: string, listener: Function): this;
  }
}

declare module 'pg/lib/utils' {
  declare module.exports: {
    prepareValue(val: any): mixed,
  };
}

// Node
declare module 'async_hooks' {
  declare class AsyncLocalStorage<T> {
    disable(): void;
    getStore(): T | void;
    run<R>(store: T, callback: (...args: any[]) => R, ...args: any[]): R;
    enterWith(store: T): void;
    static snapshot(): <R>(
      callback: (...args: any[]) => R,
      ...args: any[]
    ) => R;
  }
  declare class AsyncResource {
    asyncId(): number;
  }
  declare function executionAsyncId(): number;
  declare function executionAsyncResource(): AsyncResource;
  declare function triggerAsyncId(): number;
  declare type HookCallbacks = {
    init?: (
      asyncId: number,
      type: string,
      triggerAsyncId: number,
      resource: AsyncResource,
    ) => void,
    before?: (asyncId: number) => void,
    after?: (asyncId: number) => void,
    promiseResolve?: (asyncId: number) => void,
    destroy?: (asyncId: number) => void,
  };
  declare class AsyncHook {
    enable(): this;
    disable(): this;
  }
  declare function createHook(callbacks: HookCallbacks): AsyncHook;
}

// Edge
declare class AsyncLocalStorage<T> {
  disable(): void;
  getStore(): T | void;
  run<R>(store: T, callback: (...args: any[]) => R, ...args: any[]): R;
  enterWith(store: T): void;
  static snapshot(): <R>(callback: (...args: any[]) => R, ...args: any[]) => R;
}

declare const async_hooks: {
  createHook(callbacks: any): any,
  executionAsyncId(): number,
};

declare module 'jest-diff' {
  declare type CompareKeys = ((a: string, b: string) => number) | void;
  declare type DiffOptions = {
    aAnnotation?: string,
    aColor?: (arg: string) => string,
    aIndicator?: string,
    bAnnotation?: string,
    bColor?: (arg: string) => string,
    bIndicator?: string,
    changeColor?: (arg: string) => string,
    changeLineTrailingSpaceColor?: (arg: string) => string,
    commonColor?: (arg: string) => string,
    commonIndicator?: string,
    commonLineTrailingSpaceColor?: (arg: string) => string,
    contextLines?: number,
    emptyFirstOrLastLinePlaceholder?: string,
    expand?: boolean,
    includeChangeCounts?: boolean,
    omitAnnotationLines?: boolean,
    patchColor?: (arg: string) => string,
    compareKeys?: CompareKeys,
  };
  declare function diff(a: any, b: any, options?: DiffOptions): string;
}

declare const Bun: {
  hash(
    input: string | $TypedArray | DataView | ArrayBuffer | SharedArrayBuffer,
  ): number,
};

// Navigation API

declare const navigation: Navigation;

interface NavigationResult {
  committed: Promise<NavigationHistoryEntry>;
  finished: Promise<NavigationHistoryEntry>;
}

declare class Navigation extends EventTarget {
  entries(): NavigationHistoryEntry[];
  +currentEntry: NavigationHistoryEntry | null;
  updateCurrentEntry(options: NavigationUpdateCurrentEntryOptions): void;
  +transition: NavigationTransition | null;

  +canGoBack: boolean;
  +canGoForward: boolean;

  navigate(url: string, options?: NavigationNavigateOptions): NavigationResult;
  reload(options?: NavigationReloadOptions): NavigationResult;

  traverseTo(key: string, options?: NavigationOptions): NavigationResult;
  back(options?: NavigationOptions): NavigationResult;
  forward(options?: NavigationOptions): NavigationResult;

  onnavigate: ((this: Navigation, ev: NavigateEvent) => any) | null;
  onnavigatesuccess: ((this: Navigation, ev: Event) => any) | null;
  onnavigateerror: ((this: Navigation, ev: ErrorEvent) => any) | null;
  oncurrententrychange:
    | ((this: Navigation, ev: NavigationCurrentEntryChangeEvent) => any)
    | null;

  // TODO: Implement addEventListener overrides. Doesn't seem like Flow supports this.
}

declare class NavigationTransition {
  +navigationType: NavigationTypeString;
  +from: NavigationHistoryEntry;
  +finished: Promise<void>;
}

interface NavigationHistoryEntryEventMap {
  dispose: Event;
}

interface NavigationHistoryEntry extends EventTarget {
  +key: string;
  +id: string;
  +url: string | null;
  +index: number;
  +sameDocument: boolean;

  getState(): mixed;

  ondispose: ((this: NavigationHistoryEntry, ev: Event) => any) | null;

  // TODO: Implement addEventListener overrides. Doesn't seem like Flow supports this.
}

declare var NavigationHistoryEntry: {
  prototype: NavigationHistoryEntry,
  new(): NavigationHistoryEntry,
};

type NavigationTypeString = 'reload' | 'push' | 'replace' | 'traverse';

interface NavigationUpdateCurrentEntryOptions {
  state: mixed;
}

interface NavigationOptions {
  info?: mixed;
}

interface NavigationNavigateOptions extends NavigationOptions {
  state?: mixed;
  history?: 'auto' | 'push' | 'replace';
}

interface NavigationReloadOptions extends NavigationOptions {
  state?: mixed;
}

declare class NavigationCurrentEntryChangeEvent extends Event {
  constructor(type: string, eventInit?: any): void;

  +navigationType: NavigationTypeString | null;
  +from: NavigationHistoryEntry;
}

declare class NavigateEvent extends Event {
  constructor(type: string, eventInit?: any): void;

  +navigationType: NavigationTypeString;
  +canIntercept: boolean;
  +userInitiated: boolean;
  +hashChange: boolean;
  +hasUAVisualTransition: boolean;
  +destination: NavigationDestination;
  +signal: AbortSignal;
  +formData: FormData | null;
  +downloadRequest: string | null;
  +info?: mixed;

  intercept(options?: NavigationInterceptOptions): void;
  scroll(): void;
}

interface NavigationInterceptOptions {
  handler?: () => Promise<void>;
  focusReset?: 'after-transition' | 'manual';
  scroll?: 'after-transition' | 'manual';
}

declare class NavigationDestination {
  +url: string;
  +key: string | null;
  +id: string | null;
  +index: number;
  +sameDocument: boolean;

  getState(): mixed;
}

// Ported from definitely-typed
declare module 'rbush' {
  declare interface BBox {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  }

  declare export default class RBush<T> {
    /**
     * Constructs an `RBush`, a high-performance 2D spatial index for points and
     * rectangles. Based on an optimized __R-tree__ data structure with
     * __bulk-insertion__ support.
     *
     * @param maxEntries An optional argument to RBush defines the maximum
     *                   number of entries in a tree node. `9` (used by default)
     *                   is a reasonable choice for most applications. Higher
     *                   value means faster insertion and slower search, and
     *                   vice versa.
     */
    constructor(maxEntries?: number): void;

    /**
     * Inserts an item. To insert many items at once, use `load()`.
     *
     * @param item The item to insert.
     */
    insert(item: T): RBush<T>;

    /**
     * Bulk-inserts the given items into the tree.
     *
     * Bulk insertion is usually ~2-3 times faster than inserting items one by
     * one. After bulk loading (bulk insertion into an empty tree), subsequent
     * query performance is also ~20-30% better.
     *
     * Note that when you do bulk insertion into an existing tree, it bulk-loads
     * the given data into a separate tree and inserts the smaller tree into the
     * larger tree. This means that bulk insertion works very well for clustered
     * data (where items in one update are close to each other), but makes query
     * performance worse if the data is scattered.
     *
     * @param items The items to load.
     */
    load(items: $ReadOnlyArray<T>): RBush<T>;

    /**
     * Removes a previously inserted item, comparing by reference.
     *
     * To remove all items, use `clear()`.
     *
     * @param item The item to remove.
     * @param equals A custom function that allows comparing by value instead.
     *               Useful when you have only a copy of the object you need
     *               removed (e.g. loaded from server).
     */
    remove(item: T, equals?: (a: T, b: T) => boolean): RBush<T>;

    /**
     * Removes all items.
     */
    clear(): RBush<T>;

    /**
     * Returns an array of data items (points or rectangles) that the given
     * bounding box intersects.
     *
     * Note that the search method accepts a bounding box in `{minX, minY, maxX,
     * maxY}` format regardless of the data format.
     *
     * @param box The bounding box in which to search.
     */
    search(box: BBox): T[];

    /**
     * Returns all items contained in the tree.
     */
    all(): T[];

    /**
     * Returns `true` if there are any items intersecting the given bounding
     * box, otherwise `false`.
     *
     * @param box The bounding box in which to search.
     */
    collides(box: BBox): boolean;

    /**
     * Returns the bounding box for the provided item.
     *
     * By default, `RBush` assumes the format of data points to be an object
     * with `minX`, `minY`, `maxX`, and `maxY`. However, you can specify a
     * custom item format by overriding `toBBox()`, `compareMinX()`, and
     * `compareMinY()`.
     *
     * @example
     * class MyRBush<T> extends RBush<T> {
     *   toBBox([x, y]) { return { minX: x, minY: y, maxX: x, maxY: y }; }
     *   compareMinX(a, b) { return a.x - b.x; }
     *   compareMinY(a, b) { return a.y - b.y; }
     * }
     * const tree = new MyRBush<[number, number]>();
     * tree.insert([20, 50]); // accepts [x, y] points
     *
     * @param item The item whose bounding box should be returned.
     */
    toBBox(item: T): BBox;

    /**
     * Compares the minimum x coordinate of two items. Returns -1 if `a`'s
     * x-coordinate is smaller, 1 if `b`'s x coordinate is smaller, or 0 if
     * they're equal.
     *
     * By default, `RBush` assumes the format of data points to be an object
     * with `minX`, `minY`, `maxX`, and `maxY`. However, you can specify a
     * custom item format by overriding `toBBox()`, `compareMinX()`, and
     * `compareMinY()`.
     *
     * @example
     * class MyRBush<T> extends RBush<T> {
     *   toBBox([x, y]) { return { minX: x, minY: y, maxX: x, maxY: y }; }
     *   compareMinX(a, b) { return a.x - b.x; }
     *   compareMinY(a, b) { return a.y - b.y; }
     * }
     * const tree = new MyRBush<[number, number]>();
     * tree.insert([20, 50]); // accepts [x, y] points
     *
     * @param a The first item to compare.
     * @param b The second item to compare.
     */
    compareMinX(a: T, b: T): number;

    /**
     * Compares the minimum y coordinate of two items. Returns -1 if `a`'s
     * x-coordinate is smaller, 1 if `b`'s x coordinate is smaller, or 0 if
     * they're equal.
     *
     * By default, `RBush` assumes the format of data points to be an object
     * with `minX`, `minY`, `maxX`, and `maxY`. However, you can specify a
     * custom item format by overriding `toBBox()`, `compareMinX()`, and
     * `compareMinY()`.
     *
     * @example
     * class MyRBush<T> extends RBush<T> {
     *   toBBox([x, y]) { return { minX: x, minY: y, maxX: x, maxY: y }; }
     *   compareMinX(a, b) { return a.x - b.x; }
     *   compareMinY(a, b) { return a.y - b.y; }
     * }
     * const tree = new MyRBush<[number, number]>();
     * tree.insert([20, 50]); // accepts [x, y] points
     *
     * @param a The first item to compare.
     * @param b The second item to compare.
     */
    compareMinY(a: T, b: T): number;

    /**
     * Exports the tree's contents as a JSON object.
     *
     * Importing and exporting as JSON allows you to use RBush on both the
     * server (using Node.js) and the browser combined, e.g. first indexing the
     * data on the server and and then importing the resulting tree data on the
     * client for searching.
     *
     * Note that the `maxEntries` option from the constructor must be the same
     * in both trees for export/import to work properly.
     */
    toJSON(): any;

    /**
     * Imports previously exported data into the tree (i.e., data that was
     * emitted by `toJSON()`).
     *
     * Importing and exporting as JSON allows you to use RBush on both the
     * server (using Node.js) and the browser combined, e.g. first indexing the
     * data on the server and and then importing the resulting tree data on the
     * client for searching.
     *
     * Note that the `maxEntries` option from the constructor must be the same
     * in both trees for export/import to work properly.
     *
     * @param data The previously exported JSON data.
     */
    fromJSON(data: any): RBush<T>;
  }
}

declare class CSS {
  static escape(str: string): string;
}
