// flow-typed signature: 09630545c584c3b212588a2390c257d0
// flow-typed version: baae4b8bcc/bom/flow_>=v0.261.x

/* BOM */

declare class Screen {
  +availHeight: number;
  +availWidth: number;
  +availLeft: number;
  +availTop: number;
  +top: number;
  +left: number;
  +colorDepth: number;
  +pixelDepth: number;
  +width: number;
  +height: number;
  +orientation?: {
    lock(): Promise<void>,
    unlock(): void,
    angle: number,
    onchange: () => mixed,
    type:
      | 'portrait-primary'
      | 'portrait-secondary'
      | 'landscape-primary'
      | 'landscape-secondary',
    ...
  };
  // deprecated
  mozLockOrientation?: (orientation: string | Array<string>) => boolean;
  mozUnlockOrientation?: () => void;
  mozOrientation?: string;
  onmozorientationchange?: (...args: any[]) => mixed;
}

declare var screen: Screen;

declare interface Crypto {
  // Not using $TypedArray as that would include Float32Array and Float64Array which are not accepted
  getRandomValues: <
    T:
      | Int8Array
      | Uint8Array
      | Uint8ClampedArray
      | Int16Array
      | Uint16Array
      | Int32Array
      | Uint32Array
      | BigInt64Array
      | BigUint64Array,
  >(
    typedArray: T
  ) => T;
  randomUUID: () => string;
}
declare var crypto: Crypto;

declare var window: any;

type GamepadButton = {
  pressed: boolean,
  value: number,
  ...
};
type GamepadHapticActuator = {
  type: 'vibration',
  pulse(value: number, duration: number): Promise<boolean>,
  ...
};
type GamepadPose = {
  angularAcceleration: null | Float32Array,
  angularVelocity: null | Float32Array,
  hasOrientation: boolean,
  hasPosition: boolean,
  linearAcceleration: null | Float32Array,
  linearVelocity: null | Float32Array,
  orientation: null | Float32Array,
  position: null | Float32Array,
  ...
};
type Gamepad = {
  axes: number[],
  buttons: GamepadButton[],
  connected: boolean,
  displayId?: number,
  hapticActuators?: GamepadHapticActuator[],
  hand?: '' | 'left' | 'right',
  id: string,
  index: number,
  mapping: string,
  pose?: null | GamepadPose,
  timestamp: number,
  ...
};

// deprecated
type BatteryManager = {
  +charging: boolean,
  +chargingTime: number,
  +dischargingTime: number,
  +level: number,
  onchargingchange: ?(event: any) => mixed,
  onchargingtimechange: ?(event: any) => mixed,
  ondischargingtimechange: ?(event: any) => mixed,
  onlevelchange: ?(event: any) => mixed,
  ...
};

// https://wicg.github.io/web-share
type ShareData = {
  title?: string,
  text?: string,
  url?: string,
  ...
};

type PermissionName =
  | 'geolocation'
  | 'notifications'
  | 'push'
  | 'midi'
  | 'camera'
  | 'microphone'
  | 'speaker'
  | 'usb'
  | 'device-info'
  | 'background-sync'
  | 'bluetooth'
  | 'persistent-storage'
  | 'ambient-light-sensor'
  | 'accelerometer'
  | 'gyroscope'
  | 'magnetometer'
  | 'clipboard-read'
  | 'clipboard-write';

type PermissionState = 'granted' | 'denied' | 'prompt';

type PermissionDescriptor = {|
  name: PermissionName,
|};

type DevicePermissionDescriptor = {|
  deviceId?: string,
  name: 'camera' | 'microphone' | 'speaker',
|};

type MidiPermissionDescriptor = {|
  name: 'midi',
  sysex?: boolean,
|};

type PushPermissionDescriptor = {|
  name: 'push',
  userVisibleOnly?: boolean,
|};

type ClipboardPermissionDescriptor = {|
  name: 'clipboard-read' | 'clipboard-write',
  allowWithoutGesture: boolean,
|};

type USBPermissionDescriptor = {|
  name: 'usb',
  filters: Array<USBDeviceFilter>,
  exclusionFilters: Array<USBDeviceFilter>,
|};

type FileSystemHandlePermissionDescriptor = {|
  mode: 'read' | 'readwrite',
|};

declare class PermissionStatus extends EventTarget {
  onchange: ?(event: any) => mixed;
  +state: PermissionState;
}

declare class Permissions {
  query(
    permissionDesc:
      | DevicePermissionDescriptor
      | MidiPermissionDescriptor
      | PushPermissionDescriptor
      | ClipboardPermissionDescriptor
      | USBPermissionDescriptor
      | PermissionDescriptor
  ): Promise<PermissionStatus>;
}

type MIDIPortType = 'input' | 'output';
type MIDIPortDeviceState = 'connected' | 'disconnected';
type MIDIPortConnectionState = 'open' | 'closed' | 'pending';

type MIDIOptions = {|
  sysex: boolean,
  software: boolean,
|};

type MIDIMessageEvent$Init = Event$Init & {
  data: Uint8Array,
  ...
};

declare class MIDIMessageEvent extends Event {
  constructor(type: string, eventInitDict: MIDIMessageEvent$Init): void;
  +data: Uint8Array;
}

type MIDIConnectionEvent$Init = Event$Init & {
  port: MIDIPort,
  ...
};

declare class MIDIConnectionEvent extends Event {
  constructor(type: string, eventInitDict: MIDIConnectionEvent$Init): void;
  +port: MIDIPort;
}

declare class MIDIPort extends EventTarget {
  +id: string;
  +manufacturer?: string;
  +name?: string;
  +type: MIDIPortType;
  +version?: string;
  +state: MIDIPortDeviceState;
  +connection: MIDIPortConnectionState;
  onstatechange: ?(ev: MIDIConnectionEvent) => mixed;
  open(): Promise<MIDIPort>;
  close(): Promise<MIDIPort>;
}

declare class MIDIInput extends MIDIPort {
  onmidimessage: ?(ev: MIDIMessageEvent) => mixed;
}

declare class MIDIOutput extends MIDIPort {
  send(data: Iterable<number>, timestamp?: number): void;
  clear(): void;
}

declare class MIDIInputMap extends $ReadOnlyMap<string, MIDIInput> {}

declare class MIDIOutputMap extends $ReadOnlyMap<string, MIDIOutput> {}

declare class MIDIAccess extends EventTarget {
  +inputs: MIDIInputMap;
  +outputs: MIDIOutputMap;
  +sysexEnabled: boolean;
  onstatechange: ?(ev: MIDIConnectionEvent) => mixed;
}

declare class NavigatorID {
  appName: 'Netscape';
  appCodeName: 'Mozilla';
  product: 'Gecko';
  appVersion: string;
  platform: string;
  userAgent: string;
}

declare class NavigatorLanguage {
  +language: string;
  +languages: $ReadOnlyArray<string>;
}

declare class NavigatorContentUtils {
  registerContentHandler(mimeType: string, uri: string, title: string): void;
  registerProtocolHandler(protocol: string, uri: string, title: string): void;
}

declare class NavigatorCookies {
  +cookieEnabled: boolean;
}

declare class NavigatorPlugins {
  +plugins: PluginArray;
  +mimeTypes: MimeTypeArray;
  javaEnabled(): boolean;
}

declare class NavigatorOnLine {
  +onLine: boolean;
}

declare class NavigatorConcurrentHardware {
  +hardwareConcurrency: number;
}

declare class NavigatorStorage {
  storage?: StorageManager;
}

declare class StorageManager {
  persist: () => Promise<boolean>;
  persisted: () => Promise<boolean>;
  estimate?: () => Promise<StorageEstimate>;
  getDirectory: () => Promise<FileSystemDirectoryHandle>;
}

type StorageManagerRegisteredEndpoint =
  | 'caches'
  | 'indexedDB'
  | 'localStorage'
  | 'serviceWorkerRegistrations'
  | 'sessionStorage';

type StorageManagerUsageDetails = {[StorageManagerRegisteredEndpoint]: number};

declare class StorageEstimate {
  constructor(
    usage: number,
    quota: number,
    usageDetails?: StorageManagerUsageDetails
  ): void;
  +usage: number;
  +quota: number;

  // Not a part of the standard
  +usageDetails?: StorageManagerUsageDetails;
}

declare class Navigator
  mixins
    NavigatorID,
    NavigatorLanguage,
    NavigatorOnLine,
    NavigatorContentUtils,
    NavigatorCookies,
    NavigatorPlugins,
    NavigatorConcurrentHardware,
    NavigatorStorage
{
  productSub: '20030107' | '20100101';
  vendor: '' | 'Google Inc.' | 'Apple Computer, Inc';
  vendorSub: '';

  activeVRDisplays?: VRDisplay[];
  appCodeName: 'Mozilla';
  buildID: string;
  doNotTrack: string | null;
  geolocation: Geolocation;
  mediaDevices?: MediaDevices;
  usb?: USB;
  maxTouchPoints: number;
  permissions: Permissions;
  serviceWorker?: ServiceWorkerContainer;
  getGamepads?: () => Array<Gamepad | null>;
  webkitGetGamepads?: Function;
  mozGetGamepads?: Function;
  mozGamepads?: any;
  gamepads?: any;
  webkitGamepads?: any;
  getVRDisplays?: () => Promise<VRDisplay[]>;
  registerContentHandler(mimeType: string, uri: string, title: string): void;
  registerProtocolHandler(protocol: string, uri: string, title: string): void;
  requestMIDIAccess?: (options?: MIDIOptions) => Promise<MIDIAccess>;
  requestMediaKeySystemAccess?: (
    keySystem: string,
    supportedConfigurations: any[]
  ) => Promise<any>;
  sendBeacon?: (url: string, data?: BodyInit) => boolean;
  vibrate?: (pattern: number | number[]) => boolean;
  mozVibrate?: (pattern: number | number[]) => boolean;
  webkitVibrate?: (pattern: number | number[]) => boolean;
  canShare?: (shareData?: ShareData) => boolean;
  share?: (shareData: ShareData) => Promise<void>;
  clipboard: Clipboard;
  credentials?: CredMgmtCredentialsContainer;
  globalPrivacyControl?: boolean;

  // deprecated
  getBattery?: () => Promise<BatteryManager>;
  mozGetBattery?: () => Promise<BatteryManager>;

  // deprecated
  getUserMedia?: Function;
  webkitGetUserMedia?: Function;
  mozGetUserMedia?: Function;
  msGetUserMedia?: Function;

  // Gecko
  taintEnabled?: () => false;
  oscpu: string;
}

declare class Clipboard extends EventTarget {
  read(): Promise<DataTransfer>;
  readText(): Promise<string>;
  write(data: $ReadOnlyArray<ClipboardItem>): Promise<void>;
  writeText(data: string): Promise<void>;
}

declare var navigator: Navigator;

declare class MimeType {
  type: string;
  description: string;
  suffixes: string;
  enabledPlugin: Plugin;
}

declare class MimeTypeArray {
  length: number;
  item(index: number): MimeType;
  namedItem(name: string): MimeType;
  [key: number | string]: MimeType;
}

declare class Plugin {
  description: string;
  filename: string;
  name: string;
  version?: string; // Gecko only
  length: number;
  item(index: number): MimeType;
  namedItem(name: string): MimeType;
  [key: number | string]: MimeType;
}

declare class PluginArray {
  length: number;
  item(index: number): Plugin;
  namedItem(name: string): Plugin;
  refresh(): void;
  [key: number | string]: Plugin;
}

// https://www.w3.org/TR/hr-time-2/#dom-domhighrestimestamp
// https://developer.mozilla.org/en-US/docs/Web/API/DOMHighResTimeStamp
declare type DOMHighResTimeStamp = number;

// https://www.w3.org/TR/navigation-timing-2/
declare class PerformanceTiming {
  connectEnd: number;
  connectStart: number;
  domainLookupEnd: number;
  domainLookupStart: number;
  domComplete: number;
  domContentLoadedEventEnd: number;
  domContentLoadedEventStart: number;
  domInteractive: number;
  domLoading: number;
  fetchStart: number;
  loadEventEnd: number;
  loadEventStart: number;
  navigationStart: number;
  redirectEnd: number;
  redirectStart: number;
  requestStart: number;
  responseEnd: number;
  responseStart: number;
  secureConnectionStart: number;
  unloadEventEnd: number;
  unloadEventStart: number;
}

declare class PerformanceNavigation {
  TYPE_NAVIGATE: 0;
  TYPE_RELOAD: 1;
  TYPE_BACK_FORWARD: 2;
  TYPE_RESERVED: 255;

  type: 0 | 1 | 2 | 255;
  redirectCount: number;
}

type PerformanceEntryFilterOptions = {
  name: string,
  entryType: string,
  initiatorType: string,
  ...
};

// https://www.w3.org/TR/performance-timeline-2/
declare class PerformanceEntry {
  name: string;
  entryType: string;
  startTime: DOMHighResTimeStamp;
  duration: DOMHighResTimeStamp;
  toJSON(): string;
}

// https://w3c.github.io/server-timing/#the-performanceservertiming-interface
declare class PerformanceServerTiming {
  description: string;
  duration: DOMHighResTimeStamp;
  name: string;
  toJSON(): string;
}

// https://www.w3.org/TR/resource-timing-2/#sec-performanceresourcetiming
// https://w3c.github.io/server-timing/#extension-to-the-performanceresourcetiming-interface
declare class PerformanceResourceTiming extends PerformanceEntry {
  initiatorType: string;
  nextHopProtocol: string;
  workerStart: number;
  redirectStart: number;
  redirectEnd: number;
  fetchStart: number;
  domainLookupStart: number;
  domainLookupEnd: number;
  connectStart: number;
  connectEnd: number;
  secureConnectionStart: number;
  requestStart: number;
  responseStart: number;
  responseEnd: number;
  transferSize: string;
  encodedBodySize: number;
  decodedBodySize: number;
  serverTiming: Array<PerformanceServerTiming>;
}

// https://w3c.github.io/event-timing/#sec-performance-event-timing
declare class PerformanceEventTiming extends PerformanceEntry {
  processingStart: number;
  processingEnd: number;
  cancelable: boolean;
  target: ?Node;
  interactionId: number;
}

// https://w3c.github.io/longtasks/#taskattributiontiming
declare class TaskAttributionTiming extends PerformanceEntry {
  containerType: string;
  containerSrc: string;
  containerId: string;
  containerName: string;
}

// https://w3c.github.io/longtasks/#sec-PerformanceLongTaskTiming
declare class PerformanceLongTaskTiming extends PerformanceEntry {
  attribution: $ReadOnlyArray<TaskAttributionTiming>;
}

// https://www.w3.org/TR/navigation-timing-2/
declare class PerformanceNavigationTiming extends PerformanceResourceTiming {
  unloadEventStart: number;
  unloadEventEnd: number;
  domInteractive: number;
  domContentLoadedEventStart: number;
  domContentLoadedEventEnd: number;
  domComplete: number;
  loadEventStart: number;
  loadEventEnd: number;
  type: 'navigate' | 'reload' | 'back_forward' | 'prerender';
  redirectCount: number;
}

// https://www.w3.org/TR/user-timing/#extensions-performance-interface
declare type PerformanceMarkOptions = {|
  detail?: mixed,
  startTime?: number,
|};

declare type PerformanceMeasureOptions = {|
  detail?: mixed,
  start?: number | string,
  end?: number | string,
  duration?: number,
|};

type EventCountsForEachCallbackType =
  | (() => void)
  | ((value: number) => void)
  | ((value: number, key: string) => void)
  | ((value: number, key: string, map: Map<string, number>) => void);

// https://www.w3.org/TR/event-timing/#eventcounts
declare interface EventCounts {
  size: number;

  entries(): Iterator<[string, number]>;
  forEach(callback: EventCountsForEachCallbackType): void;
  get(key: string): ?number;
  has(key: string): boolean;
  keys(): Iterator<string>;
  values(): Iterator<number>;
}

declare class Performance {
  eventCounts: EventCounts;

  // deprecated
  navigation: PerformanceNavigation;
  timing: PerformanceTiming;

  onresourcetimingbufferfull: (ev: any) => mixed;
  clearMarks(name?: string): void;
  clearMeasures(name?: string): void;
  clearResourceTimings(): void;
  getEntries(options?: PerformanceEntryFilterOptions): Array<PerformanceEntry>;
  getEntriesByName(name: string, type?: string): Array<PerformanceEntry>;
  getEntriesByType(type: string): Array<PerformanceEntry>;
  mark(name: string, options?: PerformanceMarkOptions): void;
  measure(
    name: string,
    startMarkOrOptions?: string | PerformanceMeasureOptions,
    endMark?: string
  ): void;
  now(): DOMHighResTimeStamp;
  setResourceTimingBufferSize(maxSize: number): void;
  toJSON(): string;
}

declare var performance: Performance;

type PerformanceEntryList = PerformanceEntry[];

declare interface PerformanceObserverEntryList {
  getEntries(): PerformanceEntryList;
  getEntriesByType(type: string): PerformanceEntryList;
  getEntriesByName(name: string, type: ?string): PerformanceEntryList;
}

type PerformanceObserverInit = {
  entryTypes?: string[],
  type?: string,
  buffered?: boolean,
  ...
};

declare class PerformanceObserver {
  constructor(
    callback: (
      entries: PerformanceObserverEntryList,
      observer: PerformanceObserver
    ) => mixed
  ): void;

  observe(options: ?PerformanceObserverInit): void;
  disconnect(): void;
  takeRecords(): PerformanceEntryList;

  static supportedEntryTypes: string[];
}

declare class History {
  length: number;
  scrollRestoration: 'auto' | 'manual';
  state: any;
  back(): void;
  forward(): void;
  go(delta?: number): void;
  pushState(statedata: any, title: string, url?: string): void;
  replaceState(statedata: any, title: string, url?: string): void;
}

declare var history: History;

declare class Location {
  ancestorOrigins: string[];
  hash: string;
  host: string;
  hostname: string;
  href: string;
  origin: string;
  pathname: string;
  port: string;
  protocol: string;
  search: string;
  assign(url: string): void;
  reload(flag?: boolean): void;
  replace(url: string): void;
  toString(): string;
}

declare var location: Location;

///////////////////////////////////////////////////////////////////////////////

declare class DOMParser {
  parseFromString(source: string | TrustedHTML, mimeType: string): Document;
}

type FormDataEntryValue = string | File;

declare class FormData {
  constructor(form?: HTMLFormElement, submitter?: HTMLElement | null): void;

  has(name: string): boolean;
  get(name: string): ?FormDataEntryValue;
  getAll(name: string): Array<FormDataEntryValue>;

  set(name: string, value: FormDataEntryValue): void;
  set(name: string, value: Blob, filename?: string): void;
  set(name: string, value: File, filename?: string): void;

  append(name: string, value: FormDataEntryValue): void;
  append(name: string, value: Blob, filename?: string): void;
  append(name: string, value: File, filename?: string): void;

  delete(name: string): void;

  keys(): Iterator<string>;
  values(): Iterator<FormDataEntryValue>;
  entries(): Iterator<[string, FormDataEntryValue]>;
}

declare type IntersectionObserverEntry = {
  boundingClientRect: DOMRectReadOnly,
  intersectionRatio: number,
  intersectionRect: DOMRectReadOnly,
  isIntersecting: boolean,
  rootBounds: DOMRectReadOnly,
  target: Element,
  time: DOMHighResTimeStamp,
  ...
};

declare type IntersectionObserverCallback = (
  entries: Array<IntersectionObserverEntry>,
  observer: IntersectionObserver
) => mixed;

declare type IntersectionObserverOptions = {
  root?: Node | null,
  rootMargin?: string,
  threshold?: number | Array<number>,
  ...
};

declare class IntersectionObserver {
  constructor(
    callback: IntersectionObserverCallback,
    options?: IntersectionObserverOptions
  ): void;
  root: Element | null;
  rootMargin: string;
  scrollMargin: string;
  thresholds: number[];
  observe(target: Element): void;
  unobserve(target: Element): void;
  takeRecords(): Array<IntersectionObserverEntry>;
  disconnect(): void;
}

declare interface ResizeObserverSize {
  +inlineSize: number;
  +blockSize: number;
}

declare interface ResizeObserverEntry {
  /**
   * The Element whose size has changed.
   */
  +target: Element;
  /**
   * Element's content rect when ResizeObserverCallback is invoked.
   *
   * Legacy, may be deprecated in the future.
   */
  +contentRect: DOMRectReadOnly;
  /**
   * An array containing the Element's border box size when
   * ResizeObserverCallback is invoked.
   */
  +borderBoxSize: $ReadOnlyArray<ResizeObserverSize>;
  /**
   * An array containing the Element's content rect size when
   * ResizeObserverCallback is invoked.
   */
  +contentBoxSize: $ReadOnlyArray<ResizeObserverSize>;
  /**
   * An array containing the Element's content rect size in integral device
   * pixels when ResizeObserverCallback is invoked.
   *
   * Not implemented in Firefox or Safari as of July 2021
   */
  +devicePixelContentBoxSize?: $ReadOnlyArray<ResizeObserverSize> | void;
}

/**
 * ResizeObserver can observe different kinds of CSS sizes:
 * - border-box : size of box border area as defined in CSS2.
 * - content-box : size of content area as defined in CSS2.
 * - device-pixel-content-box : size of content area as defined in CSS2, in device
 *     pixels, before applying any CSS transforms on the element or its ancestors.
 *     This size must contain integer values.
 */
type ResizeObserverBoxOptions =
  | 'border-box'
  | 'content-box'
  | 'device-pixel-content-box';

declare type ResizeObserverOptions = {
  box?: ResizeObserverBoxOptions,
  ...
};

/**
 * The ResizeObserver interface is used to observe changes to Element's size.
 */
declare class ResizeObserver {
  constructor(
    callback: (
      entries: ResizeObserverEntry[],
      observer: ResizeObserver
    ) => mixed
  ): void;
  /**
   * Adds target to the list of observed elements.
   */
  observe(target: Element, options?: ResizeObserverOptions): void;
  /**
   * Removes target from the list of observed elements.
   */
  unobserve(target: Element): void;
  disconnect(): void;
}

declare class CloseEvent extends Event {
  code: number;
  reason: string;
  wasClean: boolean;
}

declare class WebSocket extends EventTarget {
  static CONNECTING: 0;
  static OPEN: 1;
  static CLOSING: 2;
  static CLOSED: 3;
  constructor(url: string, protocols?: string | Array<string>): void;
  protocol: string;
  readyState: number;
  bufferedAmount: number;
  extensions: string;
  onopen: (ev: any) => mixed;
  onmessage: (ev: MessageEvent<>) => mixed;
  onclose: (ev: CloseEvent) => mixed;
  onerror: (ev: any) => mixed;
  binaryType: 'blob' | 'arraybuffer';
  url: string;
  close(code?: number, reason?: string): void;
  send(data: string): void;
  send(data: Blob): void;
  send(data: ArrayBuffer): void;
  send(data: $ArrayBufferView): void;
  CONNECTING: 0;
  OPEN: 1;
  CLOSING: 2;
  CLOSED: 3;
}

type WorkerOptions = {
  type?: WorkerType,
  credentials?: CredentialsType,
  name?: string,
  ...
};

declare class Worker extends EventTarget {
  constructor(
    stringUrl: string | TrustedScriptURL,
    workerOptions?: WorkerOptions
  ): void;
  onerror: null | ((ev: any) => mixed);
  onmessage: null | ((ev: MessageEvent<>) => mixed);
  onmessageerror: null | ((ev: MessageEvent<>) => mixed);
  postMessage(message: any, ports?: any): void;
  terminate(): void;
}

declare class SharedWorker extends EventTarget {
  constructor(stringUrl: string | TrustedScriptURL, name?: string): void;
  constructor(
    stringUrl: string | TrustedScriptURL,
    workerOptions?: WorkerOptions
  ): void;
  port: MessagePort;
  onerror: (ev: any) => mixed;
}

declare function importScripts(...urls: Array<string | TrustedScriptURL>): void;

declare class WorkerGlobalScope extends EventTarget {
  self: this;
  location: WorkerLocation;
  navigator: WorkerNavigator;
  close(): void;
  importScripts(...urls: Array<string | TrustedScriptURL>): void;
  onerror: (ev: any) => mixed;
  onlanguagechange: (ev: any) => mixed;
  onoffline: (ev: any) => mixed;
  ononline: (ev: any) => mixed;
  onrejectionhandled: (ev: PromiseRejectionEvent) => mixed;
  onunhandledrejection: (ev: PromiseRejectionEvent) => mixed;
}

declare class DedicatedWorkerGlobalScope extends WorkerGlobalScope {
  onmessage: (ev: MessageEvent<>) => mixed;
  onmessageerror: (ev: MessageEvent<>) => mixed;
  postMessage(message: any, transfer?: Iterable<any>): void;
}

declare class SharedWorkerGlobalScope extends WorkerGlobalScope {
  name: string;
  onconnect: (ev: MessageEvent<>) => mixed;
}

declare class WorkerLocation {
  origin: string;
  protocol: string;
  host: string;
  hostname: string;
  port: string;
  pathname: string;
  search: string;
  hash: string;
}

declare class WorkerNavigator
  mixins
    NavigatorID,
    NavigatorLanguage,
    NavigatorOnLine,
    NavigatorConcurrentHardware,
    NavigatorStorage
{
  permissions: Permissions;
}

// deprecated
declare class XDomainRequest {
  timeout: number;
  onerror: () => mixed;
  onload: () => mixed;
  onprogress: () => mixed;
  ontimeout: () => mixed;
  +responseText: string;
  +contentType: string;
  open(method: 'GET' | 'POST', url: string): void;
  abort(): void;
  send(data?: string): void;

  statics: {create(): XDomainRequest, ...};
}

declare class XMLHttpRequest extends EventTarget {
  static LOADING: number;
  static DONE: number;
  static UNSENT: number;
  static OPENED: number;
  static HEADERS_RECEIVED: number;
  responseBody: any;
  status: number;
  readyState: number;
  responseText: string;
  responseXML: any;
  responseURL: string;
  ontimeout: ProgressEventHandler;
  statusText: string;
  onreadystatechange: (ev: any) => mixed;
  timeout: number;
  onload: ProgressEventHandler;
  response: any;
  withCredentials: boolean;
  onprogress: ProgressEventHandler;
  onabort: ProgressEventHandler;
  responseType: string;
  onloadend: ProgressEventHandler;
  upload: XMLHttpRequestEventTarget;
  onerror: ProgressEventHandler;
  onloadstart: ProgressEventHandler;
  msCaching: string;
  open(
    method: string,
    url: string,
    async?: boolean,
    user?: string,
    password?: string
  ): void;
  send(data?: any): void;
  abort(): void;
  getAllResponseHeaders(): string;
  setRequestHeader(header: string, value: string): void;
  getResponseHeader(header: string): string;
  msCachingEnabled(): boolean;
  overrideMimeType(mime: string): void;
  LOADING: number;
  DONE: number;
  UNSENT: number;
  OPENED: number;
  HEADERS_RECEIVED: number;

  statics: {create(): XMLHttpRequest, ...};
}

declare class XMLHttpRequestEventTarget extends EventTarget {
  onprogress: ProgressEventHandler;
  onerror: ProgressEventHandler;
  onload: ProgressEventHandler;
  ontimeout: ProgressEventHandler;
  onabort: ProgressEventHandler;
  onloadstart: ProgressEventHandler;
  onloadend: ProgressEventHandler;
}

declare class XMLSerializer {
  serializeToString(target: Node): string;
}

declare class Geolocation {
  getCurrentPosition(
    success: (position: Position) => mixed,
    error?: (error: PositionError) => mixed,
    options?: PositionOptions
  ): void;
  watchPosition(
    success: (position: Position) => mixed,
    error?: (error: PositionError) => mixed,
    options?: PositionOptions
  ): number;
  clearWatch(id: number): void;
}

declare class Position {
  coords: Coordinates;
  timestamp: number;
}

declare class Coordinates {
  latitude: number;
  longitude: number;
  altitude?: number;
  accuracy: number;
  altitudeAccuracy?: number;
  heading?: number;
  speed?: number;
}

declare class PositionError {
  code: number;
  message: string;
  PERMISSION_DENIED: 1;
  POSITION_UNAVAILABLE: 2;
  TIMEOUT: 3;
}

type PositionOptions = {
  enableHighAccuracy?: boolean,
  timeout?: number,
  maximumAge?: number,
  ...
};

type AudioContextState = 'suspended' | 'running' | 'closed';

// deprecated
type AudioProcessingEvent$Init = Event$Init & {
  playbackTime: number,
  inputBuffer: AudioBuffer,
  outputBuffer: AudioBuffer,
  ...
};

// deprecated
declare class AudioProcessingEvent extends Event {
  constructor(type: string, eventInitDict: AudioProcessingEvent$Init): void;

  +playbackTime: number;
  +inputBuffer: AudioBuffer;
  +outputBuffer: AudioBuffer;
}

type OfflineAudioCompletionEvent$Init = Event$Init & {
  renderedBuffer: AudioBuffer,
  ...
};

declare class OfflineAudioCompletionEvent extends Event {
  constructor(
    type: string,
    eventInitDict: OfflineAudioCompletionEvent$Init
  ): void;

  +renderedBuffer: AudioBuffer;
}

declare class BaseAudioContext extends EventTarget {
  currentTime: number;
  destination: AudioDestinationNode;
  listener: AudioListener;
  sampleRate: number;
  state: AudioContextState;
  onstatechange: (ev: any) => mixed;
  createBuffer(
    numOfChannels: number,
    length: number,
    sampleRate: number
  ): AudioBuffer;
  createBufferSource(myMediaElement?: HTMLMediaElement): AudioBufferSourceNode;
  createMediaElementSource(
    myMediaElement: HTMLMediaElement
  ): MediaElementAudioSourceNode;
  createMediaStreamSource(stream: MediaStream): MediaStreamAudioSourceNode;
  createMediaStreamDestination(): MediaStreamAudioDestinationNode;

  // deprecated
  createScriptProcessor(
    bufferSize: number,
    numberOfInputChannels: number,
    numberOfOutputChannels: number
  ): ScriptProcessorNode;

  createAnalyser(): AnalyserNode;
  createBiquadFilter(): BiquadFilterNode;
  createChannelMerger(numberOfInputs?: number): ChannelMergerNode;
  createChannelSplitter(numberOfInputs?: number): ChannelSplitterNode;
  createConstantSource(): ConstantSourceNode;
  createConvolver(): ConvolverNode;
  createDelay(maxDelayTime?: number): DelayNode;
  createDynamicsCompressor(): DynamicsCompressorNode;
  createGain(): GainNode;
  createIIRFilter(
    feedforward: Float32Array,
    feedback: Float32Array
  ): IIRFilterNode;
  createOscillator(): OscillatorNode;
  createPanner(): PannerNode;
  createStereoPanner(): StereoPannerNode;
  createPeriodicWave(
    real: Float32Array,
    img: Float32Array,
    options?: {disableNormalization: boolean, ...}
  ): PeriodicWave;
  createStereoPanner(): StereoPannerNode;
  createWaveShaper(): WaveShaperNode;
  decodeAudioData(
    arrayBuffer: ArrayBuffer,
    decodeSuccessCallback: (decodedData: AudioBuffer) => mixed,
    decodeErrorCallback: (err: DOMError) => mixed
  ): void;
  decodeAudioData(arrayBuffer: ArrayBuffer): Promise<AudioBuffer>;
}

declare class AudioTimestamp {
  contextTime: number;
  performanceTime: number;
}

declare class AudioContext extends BaseAudioContext {
  constructor(options?: {|
    latencyHint?: 'balanced' | 'interactive' | 'playback' | number,
    sampleRate?: number,
  |}): AudioContext;
  baseLatency: number;
  outputLatency: number;
  getOutputTimestamp(): AudioTimestamp;
  resume(): Promise<void>;
  suspend(): Promise<void>;
  close(): Promise<void>;
  createMediaElementSource(
    myMediaElement: HTMLMediaElement
  ): MediaElementAudioSourceNode;
  createMediaStreamSource(
    myMediaStream: MediaStream
  ): MediaStreamAudioSourceNode;
  createMediaStreamTrackSource(
    myMediaStreamTrack: MediaStreamTrack
  ): MediaStreamTrackAudioSourceNode;
  createMediaStreamDestination(): MediaStreamAudioDestinationNode;
}

declare class OfflineAudioContext extends BaseAudioContext {
  startRendering(): Promise<AudioBuffer>;
  suspend(suspendTime: number): Promise<void>;
  length: number;
  oncomplete: (ev: OfflineAudioCompletionEvent) => mixed;
}

declare class AudioNode extends EventTarget {
  context: AudioContext;
  numberOfInputs: number;
  numberOfOutputs: number;
  channelCount: number;
  channelCountMode: 'max' | 'clamped-max' | 'explicit';
  channelInterpretation: 'speakers' | 'discrete';
  connect(audioNode: AudioNode, output?: number, input?: number): AudioNode;
  connect(destination: AudioParam, output?: number): void;
  disconnect(destination?: AudioNode, output?: number, input?: number): void;
}

declare class AudioParam extends AudioNode {
  value: number;
  defaultValue: number;
  setValueAtTime(value: number, startTime: number): this;
  linearRampToValueAtTime(value: number, endTime: number): this;
  exponentialRampToValueAtTime(value: number, endTime: number): this;
  setTargetAtTime(
    target: number,
    startTime: number,
    timeConstant: number
  ): this;
  setValueCurveAtTime(
    values: Float32Array,
    startTime: number,
    duration: number
  ): this;
  cancelScheduledValues(startTime: number): this;
}

declare class AudioDestinationNode extends AudioNode {
  maxChannelCount: number;
}

declare class AudioListener extends AudioNode {
  positionX: AudioParam;
  positionY: AudioParam;
  positionZ: AudioParam;
  forwardX: AudioParam;
  forwardY: AudioParam;
  forwardZ: AudioParam;
  upX: AudioParam;
  upY: AudioParam;
  upZ: AudioParam;
  setPosition(x: number, y: number, c: number): void;
  setOrientation(
    x: number,
    y: number,
    z: number,
    xUp: number,
    yUp: number,
    zUp: number
  ): void;
}

declare class AudioBuffer {
  sampleRate: number;
  length: number;
  duration: number;
  numberOfChannels: number;
  getChannelData(channel: number): Float32Array;
  copyFromChannel(
    destination: Float32Array,
    channelNumber: number,
    startInChannel?: number
  ): void;
  copyToChannel(
    source: Float32Array,
    channelNumber: number,
    startInChannel?: number
  ): void;
}

declare class AudioBufferSourceNode extends AudioNode {
  buffer: AudioBuffer;
  detune: AudioParam;
  loop: boolean;
  loopStart: number;
  loopEnd: number;
  playbackRate: AudioParam;
  onended: (ev: any) => mixed;
  start(when?: number, offset?: number, duration?: number): void;
  stop(when?: number): void;
}

declare class CanvasCaptureMediaStream extends MediaStream {
  canvas: HTMLCanvasElement;
  requestFrame(): void;
}

type DoubleRange = {
  max?: number,
  min?: number,
  ...
};

type LongRange = {
  max?: number,
  min?: number,
  ...
};

type ConstrainBooleanParameters = {
  exact?: boolean,
  ideal?: boolean,
  ...
};

type ConstrainDOMStringParameters = {
  exact?: string | string[],
  ideal?: string | string[],
  ...
};

type ConstrainDoubleRange = {
  ...DoubleRange,
  exact?: number,
  ideal?: number,
  ...
};

type ConstrainLongRange = {
  ...LongRange,
  exact?: number,
  ideal?: number,
  ...
};

type MediaTrackSupportedConstraints = {|
  width: boolean,
  height: boolean,
  aspectRatio: boolean,
  frameRate: boolean,
  facingMode: boolean,
  resizeMode: boolean,
  volume: boolean,
  sampleRate: boolean,
  sampleSize: boolean,
  echoCancellation: boolean,
  autoGainControl: boolean,
  noiseSuppression: boolean,
  latency: boolean,
  channelCount: boolean,
  deviceId: boolean,
  groupId: boolean,
|};

type MediaTrackConstraintSet = {
  width?: number | ConstrainLongRange,
  height?: number | ConstrainLongRange,
  aspectRatio?: number | ConstrainDoubleRange,
  frameRate?: number | ConstrainDoubleRange,
  facingMode?: string | string[] | ConstrainDOMStringParameters,
  resizeMode?: string | string[] | ConstrainDOMStringParameters,
  volume?: number | ConstrainDoubleRange,
  sampleRate?: number | ConstrainLongRange,
  sampleSize?: number | ConstrainLongRange,
  echoCancellation?: boolean | ConstrainBooleanParameters,
  autoGainControl?: boolean | ConstrainBooleanParameters,
  noiseSuppression?: boolean | ConstrainBooleanParameters,
  latency?: number | ConstrainDoubleRange,
  channelCount?: number | ConstrainLongRange,
  deviceId?: string | string[] | ConstrainDOMStringParameters,
  groupId?: string | string[] | ConstrainDOMStringParameters,
  ...
};

type MediaTrackConstraints = {
  ...MediaTrackConstraintSet,
  advanced?: Array<MediaTrackConstraintSet>,
  ...
};

type DisplayMediaStreamConstraints = {
  video?: boolean | MediaTrackConstraints,
  audio?: boolean | MediaTrackConstraints,
  ...
};

type MediaStreamConstraints = {
  audio?: boolean | MediaTrackConstraints,
  video?: boolean | MediaTrackConstraints,
  peerIdentity?: string,
  ...
};

type MediaTrackSettings = {
  aspectRatio?: number,
  deviceId?: string,
  displaySurface?: 'application' | 'browser' | 'monitor' | 'window',
  echoCancellation?: boolean,
  facingMode?: string,
  frameRate?: number,
  groupId?: string,
  height?: number,
  logicalSurface?: boolean,
  sampleRate?: number,
  sampleSize?: number,
  volume?: number,
  width?: number,
  ...
};

type MediaTrackCapabilities = {
  aspectRatio?: number | DoubleRange,
  deviceId?: string,
  echoCancellation?: boolean[],
  facingMode?: string,
  frameRate?: number | DoubleRange,
  groupId?: string,
  height?: number | LongRange,
  sampleRate?: number | LongRange,
  sampleSize?: number | LongRange,
  volume?: number | DoubleRange,
  width?: number | LongRange,
  ...
};

declare class MediaDevices extends EventTarget {
  ondevicechange: (ev: any) => mixed;
  enumerateDevices: () => Promise<Array<MediaDeviceInfo>>;
  getSupportedConstraints: () => MediaTrackSupportedConstraints;
  getDisplayMedia: (
    constraints?: DisplayMediaStreamConstraints
  ) => Promise<MediaStream>;
  getUserMedia: (constraints: MediaStreamConstraints) => Promise<MediaStream>;
}

declare class MediaDeviceInfo {
  +deviceId: string;
  +groupId: string;
  +kind: 'videoinput' | 'audioinput' | 'audiooutput';
  +label: string;
}

type MediaRecorderOptions = {
  mimeType?: string,
  audioBitsPerSecond?: number,
  videoBitsPerSecond?: number,
  bitsPerSecond?: number,
  audioBitrateMode?: 'cbr' | 'vbr',
  ...
};

declare class MediaRecorder extends EventTarget {
  constructor(stream: MediaStream, options?: MediaRecorderOptions): void;
  +stream: MediaStream;
  +mimeType: string;
  +state: 'inactive' | 'recording' | 'paused';

  onstart: (ev: any) => mixed;
  onstop: (ev: any) => mixed;
  ondataavailable: (ev: any) => mixed;
  onpause: (ev: any) => mixed;
  onresume: (ev: any) => mixed;
  onerror: (ev: any) => mixed;

  +videoBitsPerSecond: number;
  +audioBitsPerSecond: number;
  +audioBitrateMode: 'cbr' | 'vbr';

  start(timeslice?: number): void;
  stop(): void;
  pause(): void;
  resume(): void;
  requestData(): void;

  static isTypeSupported(type: string): boolean;
}

declare class MediaStream extends EventTarget {
  active: boolean;
  ended: boolean;
  id: string;
  onactive: (ev: any) => mixed;
  oninactive: (ev: any) => mixed;
  onended: (ev: any) => mixed;
  onaddtrack: (ev: MediaStreamTrackEvent) => mixed;
  onremovetrack: (ev: MediaStreamTrackEvent) => mixed;
  addTrack(track: MediaStreamTrack): void;
  clone(): MediaStream;
  getAudioTracks(): MediaStreamTrack[];
  getTrackById(trackid?: string): ?MediaStreamTrack;
  getTracks(): MediaStreamTrack[];
  getVideoTracks(): MediaStreamTrack[];
  removeTrack(track: MediaStreamTrack): void;
}

declare class MediaStreamTrack extends EventTarget {
  enabled: boolean;
  id: string;
  kind: string;
  label: string;
  muted: boolean;
  readonly: boolean;
  readyState: 'live' | 'ended';
  remote: boolean;
  contentHint?: string;
  onstarted: (ev: any) => mixed;
  onmute: (ev: any) => mixed;
  onunmute: (ev: any) => mixed;
  onoverconstrained: (ev: any) => mixed;
  onended: (ev: any) => mixed;
  getConstraints(): MediaTrackConstraints;
  applyConstraints(constraints?: MediaTrackConstraints): Promise<void>;
  getSettings(): MediaTrackSettings;
  getCapabilities(): MediaTrackCapabilities;
  clone(): MediaStreamTrack;
  stop(): void;
}

declare class MediaStreamTrackEvent extends Event {
  track: MediaStreamTrack;
}

declare class MediaElementAudioSourceNode extends AudioNode {}
declare class MediaStreamAudioSourceNode extends AudioNode {}
declare class MediaStreamTrackAudioSourceNode extends AudioNode {}

declare class MediaStreamAudioDestinationNode extends AudioNode {
  stream: MediaStream;
}

// deprecated
declare class ScriptProcessorNode extends AudioNode {
  bufferSize: number;
  onaudioprocess: (ev: AudioProcessingEvent) => mixed;
}

declare class AnalyserNode extends AudioNode {
  fftSize: number;
  frequencyBinCount: number;
  minDecibels: number;
  maxDecibels: number;
  smoothingTimeConstant: number;
  getFloatFrequencyData(array: Float32Array): Float32Array;
  getByteFrequencyData(array: Uint8Array): Uint8Array;
  getFloatTimeDomainData(array: Float32Array): Float32Array;
  getByteTimeDomainData(array: Uint8Array): Uint8Array;
}

declare class BiquadFilterNode extends AudioNode {
  frequency: AudioParam;
  detune: AudioParam;
  Q: AudioParam;
  gain: AudioParam;
  type:
    | 'lowpass'
    | 'highpass'
    | 'bandpass'
    | 'lowshelf'
    | 'highshelf'
    | 'peaking'
    | 'notch'
    | 'allpass';
  getFrequencyResponse(
    frequencyHz: Float32Array,
    magResponse: Float32Array,
    phaseResponse: Float32Array
  ): void;
}

declare class ChannelMergerNode extends AudioNode {}
declare class ChannelSplitterNode extends AudioNode {}

type ConstantSourceOptions = {offset?: number, ...};
declare class ConstantSourceNode extends AudioNode {
  constructor(context: BaseAudioContext, options?: ConstantSourceOptions): void;
  offset: AudioParam;
  onended: (ev: any) => mixed;
  start(when?: number): void;
  stop(when?: number): void;
}

declare class ConvolverNode extends AudioNode {
  buffer: AudioBuffer;
  normalize: boolean;
}

declare class DelayNode extends AudioNode {
  delayTime: number;
}

declare class DynamicsCompressorNode extends AudioNode {
  threshold: AudioParam;
  knee: AudioParam;
  ratio: AudioParam;
  reduction: AudioParam;
  attack: AudioParam;
  release: AudioParam;
}

declare class GainNode extends AudioNode {
  gain: AudioParam;
}

declare class IIRFilterNode extends AudioNode {
  getFrequencyResponse(
    frequencyHz: Float32Array,
    magResponse: Float32Array,
    phaseResponse: Float32Array
  ): void;
}

declare class OscillatorNode extends AudioNode {
  frequency: AudioParam;
  detune: AudioParam;
  type: 'sine' | 'square' | 'sawtooth' | 'triangle' | 'custom';
  start(when?: number): void;
  stop(when?: number): void;
  setPeriodicWave(periodicWave: PeriodicWave): void;
  onended: (ev: any) => mixed;
}

declare class StereoPannerNode extends AudioNode {
  pan: AudioParam;
}

declare class PannerNode extends AudioNode {
  panningModel: 'equalpower' | 'HRTF';
  distanceModel: 'linear' | 'inverse' | 'exponential';
  refDistance: number;
  maxDistance: number;
  rolloffFactor: number;
  coneInnerAngle: number;
  coneOuterAngle: number;
  coneOuterGain: number;
  setPosition(x: number, y: number, z: number): void;
  setOrientation(x: number, y: number, z: number): void;
}

declare class PeriodicWave extends AudioNode {}
declare class WaveShaperNode extends AudioNode {
  curve: Float32Array;
  oversample: 'none' | '2x' | '4x';
}

// this part of spec is not finished yet, apparently
// https://stackoverflow.com/questions/35296664/can-fetch-get-object-as-headers
type HeadersInit =
  | Headers
  | Array<[string, string]>
  | {[key: string]: string, ...};

// TODO Heades and URLSearchParams are almost the same thing.
// Could it somehow be abstracted away?
declare class Headers {
  @@iterator(): Iterator<[string, string]>;
  constructor(init?: HeadersInit): void;
  append(name: string, value: string): void;
  delete(name: string): void;
  entries(): Iterator<[string, string]>;
  forEach<This>(
    callback: (
      this: This,
      value: string,
      name: string,
      headers: Headers
    ) => mixed,
    thisArg: This
  ): void;
  get(name: string): null | string;
  has(name: string): boolean;
  keys(): Iterator<string>;
  set(name: string, value: string): void;
  values(): Iterator<string>;
}

declare class URLSearchParams {
  @@iterator(): Iterator<[string, string]>;

  size: number;

  constructor(
    init?:
      | string
      | URLSearchParams
      | Array<[string, string]>
      | {[string]: string, ...}
  ): void;
  append(name: string, value: string): void;
  delete(name: string, value?: string): void;
  entries(): Iterator<[string, string]>;
  forEach<This>(
    callback: (
      this: This,
      value: string,
      name: string,
      params: URLSearchParams
    ) => mixed,
    thisArg: This
  ): void;
  get(name: string): null | string;
  getAll(name: string): Array<string>;
  has(name: string, value?: string): boolean;
  keys(): Iterator<string>;
  set(name: string, value: string): void;
  sort(): void;
  values(): Iterator<string>;
  toString(): string;
}

type CacheType =
  | 'default'
  | 'no-store'
  | 'reload'
  | 'no-cache'
  | 'force-cache'
  | 'only-if-cached';
type CredentialsType = 'omit' | 'same-origin' | 'include';
type ModeType = 'cors' | 'no-cors' | 'same-origin' | 'navigate';
type RedirectType = 'follow' | 'error' | 'manual';
type ReferrerPolicyType =
  | ''
  | 'no-referrer'
  | 'no-referrer-when-downgrade'
  | 'same-origin'
  | 'origin'
  | 'strict-origin'
  | 'origin-when-cross-origin'
  | 'strict-origin-when-cross-origin'
  | 'unsafe-url';

type ResponseType =
  | 'basic'
  | 'cors'
  | 'default'
  | 'error'
  | 'opaque'
  | 'opaqueredirect';

type BodyInit =
  | string
  | URLSearchParams
  | FormData
  | Blob
  | ArrayBuffer
  | $ArrayBufferView
  | ReadableStream;

type RequestInfo = Request | URL | string;

type RequestOptions = {
  body?: ?BodyInit,
  cache?: CacheType,
  credentials?: CredentialsType,
  headers?: HeadersInit,
  integrity?: string,
  keepalive?: boolean,
  method?: string,
  mode?: ModeType,
  redirect?: RedirectType,
  referrer?: string,
  referrerPolicy?: ReferrerPolicyType,
  signal?: ?AbortSignal,
  window?: any,
  ...
};

type ResponseOptions = {
  status?: number,
  statusText?: string,
  headers?: HeadersInit,
  ...
};

declare class Response {
  constructor(input?: ?BodyInit, init?: ResponseOptions): void;
  clone(): Response;
  static error(): Response;
  static redirect(url: string, status?: number): Response;

  redirected: boolean;
  type: ResponseType;
  url: string;
  ok: boolean;
  status: number;
  statusText: string;
  headers: Headers;
  trailer: Promise<Headers>;

  // Body methods and attributes
  bodyUsed: boolean;
  body: ?ReadableStream;

  arrayBuffer(): Promise<ArrayBuffer>;
  blob(): Promise<Blob>;
  formData(): Promise<FormData>;
  json(): Promise<any>;
  text(): Promise<string>;
}

declare class Request {
  constructor(input: RequestInfo, init?: RequestOptions): void;
  clone(): Request;

  url: string;

  cache: CacheType;
  credentials: CredentialsType;
  headers: Headers;
  integrity: string;
  method: string;
  mode: ModeType;
  redirect: RedirectType;
  referrer: string;
  referrerPolicy: ReferrerPolicyType;
  +signal: AbortSignal;

  // Body methods and attributes
  bodyUsed: boolean;

  arrayBuffer(): Promise<ArrayBuffer>;
  blob(): Promise<Blob>;
  formData(): Promise<FormData>;
  json(): Promise<any>;
  text(): Promise<string>;
}

declare function fetch(
  input: RequestInfo,
  init?: RequestOptions
): Promise<Response>;

type TextEncoder$availableEncodings =
  | 'utf-8'
  | 'utf8'
  | 'unicode-1-1-utf-8'
  | 'utf-16be'
  | 'utf-16'
  | 'utf-16le';

declare class TextEncoder {
  constructor(encoding?: TextEncoder$availableEncodings): void;
  encode(buffer: string, options?: {stream: boolean, ...}): Uint8Array;
  encoding: TextEncoder$availableEncodings;
}

type TextDecoder$availableEncodings =
  | '866'
  | 'ansi_x3.4-1968'
  | 'arabic'
  | 'ascii'
  | 'asmo-708'
  | 'big5-hkscs'
  | 'big5'
  | 'chinese'
  | 'cn-big5'
  | 'cp1250'
  | 'cp1251'
  | 'cp1252'
  | 'cp1253'
  | 'cp1254'
  | 'cp1255'
  | 'cp1256'
  | 'cp1257'
  | 'cp1258'
  | 'cp819'
  | 'cp866'
  | 'csbig5'
  | 'cseuckr'
  | 'cseucpkdfmtjapanese'
  | 'csgb2312'
  | 'csibm866'
  | 'csiso2022jp'
  | 'csiso2022kr'
  | 'csiso58gb231280'
  | 'csiso88596e'
  | 'csiso88596i'
  | 'csiso88598e'
  | 'csiso88598i'
  | 'csisolatin1'
  | 'csisolatin2'
  | 'csisolatin3'
  | 'csisolatin4'
  | 'csisolatin5'
  | 'csisolatin6'
  | 'csisolatin9'
  | 'csisolatinarabic'
  | 'csisolatincyrillic'
  | 'csisolatingreek'
  | 'csisolatinhebrew'
  | 'cskoi8r'
  | 'csksc56011987'
  | 'csmacintosh'
  | 'csshiftjis'
  | 'cyrillic'
  | 'dos-874'
  | 'ecma-114'
  | 'ecma-118'
  | 'elot_928'
  | 'euc-jp'
  | 'euc-kr'
  | 'gb_2312-80'
  | 'gb_2312'
  | 'gb18030'
  | 'gb2312'
  | 'gbk'
  | 'greek'
  | 'greek8'
  | 'hebrew'
  | 'hz-gb-2312'
  | 'ibm819'
  | 'ibm866'
  | 'iso_8859-1:1987'
  | 'iso_8859-1'
  | 'iso_8859-2:1987'
  | 'iso_8859-2'
  | 'iso_8859-3:1988'
  | 'iso_8859-3'
  | 'iso_8859-4:1988'
  | 'iso_8859-4'
  | 'iso_8859-5:1988'
  | 'iso_8859-5'
  | 'iso_8859-6:1987'
  | 'iso_8859-6'
  | 'iso_8859-7:1987'
  | 'iso_8859-7'
  | 'iso_8859-8:1988'
  | 'iso_8859-8'
  | 'iso_8859-9:1989'
  | 'iso_8859-9'
  | 'iso-2022-cn-ext'
  | 'iso-2022-cn'
  | 'iso-2022-jp'
  | 'iso-2022-kr'
  | 'iso-8859-1'
  | 'iso-8859-10'
  | 'iso-8859-11'
  | 'iso-8859-13'
  | 'iso-8859-14'
  | 'iso-8859-15'
  | 'iso-8859-16'
  | 'iso-8859-2'
  | 'iso-8859-3'
  | 'iso-8859-4'
  | 'iso-8859-5'
  | 'iso-8859-6-e'
  | 'iso-8859-6-i'
  | 'iso-8859-6'
  | 'iso-8859-7'
  | 'iso-8859-8-e'
  | 'iso-8859-8-i'
  | 'iso-8859-8'
  | 'iso-8859-9'
  | 'iso-ir-100'
  | 'iso-ir-101'
  | 'iso-ir-109'
  | 'iso-ir-110'
  | 'iso-ir-126'
  | 'iso-ir-127'
  | 'iso-ir-138'
  | 'iso-ir-144'
  | 'iso-ir-148'
  | 'iso-ir-149'
  | 'iso-ir-157'
  | 'iso-ir-58'
  | 'iso8859-1'
  | 'iso8859-10'
  | 'iso8859-11'
  | 'iso8859-13'
  | 'iso8859-14'
  | 'iso8859-15'
  | 'iso8859-2'
  | 'iso8859-3'
  | 'iso8859-4'
  | 'iso8859-6'
  | 'iso8859-7'
  | 'iso8859-8'
  | 'iso8859-9'
  | 'iso88591'
  | 'iso885910'
  | 'iso885911'
  | 'iso885913'
  | 'iso885914'
  | 'iso885915'
  | 'iso88592'
  | 'iso88593'
  | 'iso88594'
  | 'iso88595'
  | 'iso88596'
  | 'iso88597'
  | 'iso88598'
  | 'iso88599'
  | 'koi'
  | 'koi8_r'
  | 'koi8-r'
  | 'koi8-u'
  | 'koi8'
  | 'korean'
  | 'ks_c_5601-1987'
  | 'ks_c_5601-1989'
  | 'ksc_5601'
  | 'ksc5601'
  | 'l1'
  | 'l2'
  | 'l3'
  | 'l4'
  | 'l5'
  | 'l6'
  | 'l9'
  | 'latin1'
  | 'latin2'
  | 'latin3'
  | 'latin4'
  | 'latin5'
  | 'latin6'
  | 'latin9'
  | 'logical'
  | 'mac'
  | 'macintosh'
  | 'ms_kanji'
  | 'shift_jis'
  | 'shift-jis'
  | 'sjis'
  | 'sun_eu_greek'
  | 'tis-620'
  | 'unicode-1-1-utf-8'
  | 'us-ascii'
  | 'utf-16'
  | 'utf-16be'
  | 'utf-16le'
  | 'utf-8'
  | 'utf8'
  | 'visual'
  | 'windows-1250'
  | 'windows-1251'
  | 'windows-1252'
  | 'windows-1253'
  | 'windows-1254'
  | 'windows-1255'
  | 'windows-1256'
  | 'windows-1257'
  | 'windows-1258'
  | 'windows-31j'
  | 'windows-874'
  | 'windows-949'
  | 'x-cp1250'
  | 'x-cp1251'
  | 'x-cp1252'
  | 'x-cp1253'
  | 'x-cp1254'
  | 'x-cp1255'
  | 'x-cp1256'
  | 'x-cp1257'
  | 'x-cp1258'
  | 'x-euc-jp'
  | 'x-gbk'
  | 'x-mac-cyrillic'
  | 'x-mac-roman'
  | 'x-mac-ukrainian'
  | 'x-sjis'
  | 'x-user-defined'
  | 'x-x-big5';

declare class TextDecoder {
  constructor(
    encoding?: TextDecoder$availableEncodings,
    options?: {fatal: boolean, ...}
  ): void;
  encoding: TextDecoder$availableEncodings;
  fatal: boolean;
  ignoreBOM: boolean;
  decode(
    buffer?: ArrayBuffer | $ArrayBufferView,
    options?: {stream: boolean, ...}
  ): string;
}

declare class TextDecoderStream {
  constructor(
    encoding?: TextDecoder$availableEncodings,
    options?: {fatal?: boolean, ignoreBOM?: boolean, ...}
  ): void;
  encoding: TextDecoder$availableEncodings;
  fatal: boolean;
  ignoreBOM: boolean;
  readable: ReadableStream;
  writable: WritableStream;
}

declare class MessagePort extends EventTarget {
  postMessage(message: any, transfer?: Iterable<any>): void;
  start(): void;
  close(): void;

  onmessage: null | ((ev: MessageEvent<>) => mixed);
  onmessageerror: null | ((ev: MessageEvent<>) => mixed);
}

declare class MessageChannel {
  port1: MessagePort;
  port2: MessagePort;
}

declare class VRDisplay extends EventTarget {
  capabilities: VRDisplayCapabilities;
  depthFar: number;
  depthNear: number;
  displayId: number;
  displayName: string;
  isPresenting: boolean;
  stageParameters: null | VRStageParameters;

  cancelAnimationFrame(number): void;
  exitPresent(): Promise<void>;
  getEyeParameters(VREye): VREyeParameters;
  getFrameData(VRFrameData): boolean;
  getLayers(): VRLayerInit[];
  requestAnimationFrame(cb: (number) => mixed): number;
  requestPresent(VRLayerInit[]): Promise<void>;
  submitFrame(): void;
}

type VRSource = HTMLCanvasElement;

type VRLayerInit = {
  leftBounds?: number[],
  rightBounds?: number[],
  source?: null | VRSource,
  ...
};

type VRDisplayCapabilities = {
  canPresent: boolean,
  hasExternalDisplay: boolean,
  hasPosition: boolean,
  maxLayers: number,
  ...
};

type VREye = 'left' | 'right';

type VRPose = {
  angularAcceleration?: Float32Array,
  angularVelocity?: Float32Array,
  linearAcceleration?: Float32Array,
  linearVelocity?: Float32Array,
  orientation?: Float32Array,
  position?: Float32Array,
  ...
};

declare class VRFrameData {
  leftProjectionMatrix: Float32Array;
  leftViewMatrix: Float32Array;
  pose: VRPose;
  rightProjectionMatrix: Float32Array;
  rightViewMatrix: Float32Array;
  timestamp: number;
}

type VREyeParameters = {
  offset: Float32Array,
  renderWidth: number,
  renderHeight: number,
  ...
};

type VRStageParameters = {
  sittingToStandingTransform: Float32Array,
  sizeX: number,
  sizeZ: number,
  ...
};

type VRDisplayEventReason =
  | 'mounted'
  | 'navigation'
  | 'requested'
  | 'unmounted';

type VRDisplayEventInit = {
  display: VRDisplay,
  reason: VRDisplayEventReason,
  ...
};

declare class VRDisplayEvent extends Event {
  constructor(type: string, eventInitDict: VRDisplayEventInit): void;
  display: VRDisplay;
  reason?: VRDisplayEventReason;
}

declare class MediaQueryListEvent {
  matches: boolean;
  media: string;
}

declare type MediaQueryListListener = (MediaQueryListEvent) => void;

declare class MediaQueryList extends EventTarget {
  matches: boolean;
  media: string;
  addListener: MediaQueryListListener => void;
  removeListener: MediaQueryListListener => void;
  onchange: MediaQueryListListener;
}

declare var matchMedia: string => MediaQueryList;

// https://w3c.github.io/webappsec-credential-management/#idl-index
declare type CredMgmtCredentialRequestOptions = {
  mediation?: 'silent' | 'optional' | 'required',
  signal?: AbortSignal,
  ...
};

declare type CredMgmtCredentialCreationOptions = {signal: AbortSignal, ...};

declare interface CredMgmtCredential {
  id: string;
  type: string;
}

declare interface CredMgmtPasswordCredential extends CredMgmtCredential {
  password: string;
}

declare interface CredMgmtCredentialsContainer {
  get(option?: CredMgmtCredentialRequestOptions): Promise<?CredMgmtCredential>;
  store(credential: CredMgmtCredential): Promise<CredMgmtCredential>;
  create(
    creationOption?: CredMgmtCredentialCreationOptions
  ): Promise<?CredMgmtCredential>;
  preventSilentAccess(): Promise<void>;
}

type SpeechSynthesisErrorCode =
  | 'canceled'
  | 'interrupted'
  | 'audio-busy'
  | 'audio-hardware'
  | 'network'
  | 'synthesis-unavailable'
  | 'synthesis-failed'
  | 'language-unavailable'
  | 'voice-unavailable'
  | 'text-too-long'
  | 'invalid-argument'
  | 'not-allowed';

declare class SpeechSynthesis extends EventTarget {
  +pending: boolean;
  +speaking: boolean;
  +paused: boolean;

  onvoiceschanged: ?(ev: Event) => mixed;

  speak(utterance: SpeechSynthesisUtterance): void;
  cancel(): void;
  pause(): void;
  resume(): void;
  getVoices(): Array<SpeechSynthesisVoice>;
}

declare var speechSynthesis: SpeechSynthesis;

declare class SpeechSynthesisUtterance extends EventTarget {
  constructor(text?: string): void;

  text: string;
  lang: string;
  voice: SpeechSynthesisVoice | null;
  volume: number;
  rate: number;
  pitch: number;

  onstart: ?(ev: SpeechSynthesisEvent) => mixed;
  onend: ?(ev: SpeechSynthesisEvent) => mixed;
  onerror: ?(ev: SpeechSynthesisErrorEvent) => mixed;
  onpause: ?(ev: SpeechSynthesisEvent) => mixed;
  onresume: ?(ev: SpeechSynthesisEvent) => mixed;
  onmark: ?(ev: SpeechSynthesisEvent) => mixed;
  onboundary: ?(ev: SpeechSynthesisEvent) => mixed;
}

type SpeechSynthesisEvent$Init = Event$Init & {
  utterance: SpeechSynthesisUtterance,
  charIndex?: number,
  charLength?: number,
  elapsedTime?: number,
  name?: string,
  ...
};

declare class SpeechSynthesisEvent extends Event {
  constructor(type: string, eventInitDict?: SpeechSynthesisEvent$Init): void;

  +utterance: SpeechSynthesisUtterance;
  charIndex: number;
  charLength: number;
  elapsedTime: number;
  name: string;
}

type SpeechSynthesisErrorEvent$Init = SpeechSynthesisEvent$Init & {
  error: SpeechSynthesisErrorCode,
  ...
};

declare class SpeechSynthesisErrorEvent extends SpeechSynthesisEvent {
  constructor(
    type: string,
    eventInitDict?: SpeechSynthesisErrorEvent$Init
  ): void;
  +error: SpeechSynthesisErrorCode;
}

declare class SpeechSynthesisVoice {
  +voiceURI: string;
  +name: string;
  +lang: string;
  +localService: boolean;
  +default: boolean;
}

type SpeechRecognitionErrorCode =
  | 'no-speech'
  | 'aborted'
  | 'audio-capture'
  | 'not-allowed'
  | 'service-not-allowed'
  | 'bad-grammar'
  | 'language-not-supported';

declare class SpeechGrammar {
  constructor(): void;

  src: string;
  weight?: number;
}

declare class SpeechGrammarList {
  +length: number;

  item(index: number): SpeechGrammar;
  addFromURI(src: string, weight?: number): void;
  addFromString(string: string, weight?: number): void;
}

declare class SpeechRecognitionAlternative {
  +transcript: string;
  +confidence: number;
}

declare class SpeechRecognitionResult {
  +isFinal: boolean;
  +length: number;

  item(index: number): SpeechRecognitionAlternative;
}

declare class SpeechRecognitionResultList {
  +length: number;

  item(index: number): SpeechRecognitionResult;
}

type SpeechRecognitionEvent$Init = Event$Init & {
  emma: any,
  interpretation: any,
  resultIndex: number,
  results: SpeechRecognitionResultList,
  ...
};

declare class SpeechRecognitionEvent extends Event {
  constructor(type: string, eventInitDict?: SpeechRecognitionEvent$Init): void;

  +emma: any;
  +interpretation: any;
  +resultIndex: number;
  +results: SpeechRecognitionResultList;
}

type SpeechRecognitionErrorEvent$Init = SpeechRecognitionEvent$Init & {
  error: SpeechRecognitionErrorCode,
  ...
};

declare class SpeechRecognitionErrorEvent extends SpeechRecognitionEvent {
  constructor(
    type: string,
    eventInitDict?: SpeechRecognitionErrorEvent$Init
  ): void;
  +error: SpeechRecognitionErrorCode;
  +message: string;
}

declare class SpeechRecognition extends EventTarget {
  constructor(): void;

  +grammars: SpeechGrammar[];
  +lang: string;
  +continuous: boolean;
  +interimResults: boolean;
  +maxAlternatives: number;
  +serviceURI: string;

  onaudiostart: ?(ev: Event) => mixed;
  onaudioend: ?(ev: Event) => mixed;
  onend: ?(ev: Event) => mixed;
  onerror: ?(ev: Event) => mixed;
  onnomatch: ?(ev: Event) => mixed;
  onsoundstart: ?(ev: Event) => mixed;
  onsoundend: ?(ev: Event) => mixed;
  onspeechstart: ?(ev: Event) => mixed;
  onspeechend: ?(ev: Event) => mixed;
  onstart: ?(ev: Event) => mixed;

  abort(): void;
  start(): void;
  stop(): void;
}

/* Trusted Types
 * https://w3c.github.io/trusted-types/dist/spec/#trusted-types
 */
declare class TrustedHTML {
  toString(): string;
  toJSON(): string;
}

declare class TrustedScript {
  toString(): string;
  toJSON(): string;
}

declare class TrustedScriptURL {
  toString(): string;
  toJSON(): string;
}

declare class TrustedTypePolicy {
  +name: string;
  createHTML(input: string, ...args: Array<mixed>): TrustedHTML;
  createScript(input: string, ...args: Array<mixed>): TrustedScript;
  createScriptURL(input: string, ...args: Array<mixed>): TrustedScriptURL;
}

declare type TrustedTypePolicyOptions = {|
  createHTML?: (string, ...args: Array<mixed>) => string,
  createScript?: (string, ...args: Array<mixed>) => string,
  createScriptURL?: (string, ...args: Array<mixed>) => string,
|};

// window.trustedTypes?: TrustedTypePolicyFactory
declare class TrustedTypePolicyFactory {
  +emptyHTML: TrustedHTML;
  +emptyScript: TrustedScript;
  +defaultPolicy: ?TrustedTypePolicy;
  +isHTML: (value: mixed) => value is TrustedHTML;
  +isScript: (value: mixed) => value is TrustedScript;
  +isScriptURL: (value: mixed) => value is TrustedScriptURL;
  createPolicy(
    policyName: string,
    policyOptions?: TrustedTypePolicyOptions
  ): TrustedTypePolicy;
  getAttributeType(
    tagName: string,
    attribute?: string,
    elementNS?: string,
    attrNS?: string
  ): null | string;
  getPropertyType(
    tagName: string,
    property: string,
    elementNS?: string
  ): null | string;
}

// https://wicg.github.io/webusb/
// https://developer.mozilla.org/en-US/docs/Web/API/USBDevice
declare class USBDevice {
  configuration: USBConfiguration;
  configurations: Array<USBConfiguration>;
  deviceClass: number;
  deviceProtocol: number;
  deviceSubclass: number;
  deviceVersionMajor: number;
  deviceVersionMinor: number;
  deviceVersionSubminor: number;
  manufacturerName: ?string;
  opened: boolean;
  productId: number;
  productName: ?string;
  serialNumber: ?string;
  usbVersionMajor: number;
  usbVersionMinor: number;
  usbVersionSubminor: number;
  vendorId: number;
  claimInterface(interfaceNumber: number): Promise<void>;
  clearHalt(direction: 'in' | 'out', endpointNumber: number): Promise<void>;
  close(): Promise<void>;
  controlTransferIn(
    setup: SetUpOptions,
    length: number
  ): Promise<USBInTransferResult>;
  controlTransferOut(
    setup: SetUpOptions,
    data: ArrayBuffer
  ): Promise<USBOutTransferResult>;
  forget(): Promise<void>;
  isochronousTransferIn(
    endpointNumber: number,
    packetLengths: Array<number>
  ): Promise<USBIsochronousInTransferResult>;
  isochronousTransferOut(
    endpointNumber: number,
    data: ArrayBuffer,
    packetLengths: Array<number>
  ): Promise<USBIsochronousOutTransferResult>;
  open(): Promise<void>;
  releaseInterface(interfaceNumber: number): Promise<void>;
  reset(): Promise<void>;
  selectAlternateInterface(
    interfaceNumber: number,
    alternateSetting: number
  ): Promise<void>;
  selectConfiguration(configurationValue: number): Promise<void>;
  transferIn(
    endpointNumber: number,
    length: number
  ): Promise<USBInTransferResult>;
  transferOut(
    endpointNumber: number,
    data: ArrayBuffer
  ): Promise<USBOutTransferResult>;
}

declare class USB extends EventTarget {
  getDevices(): Promise<Array<USBDevice>>;
  requestDevice(options: USBDeviceRequestOptions): Promise<USBDevice>;
}

declare type USBDeviceFilter = {|
  vendorId?: number,
  productId?: number,
  classCode?: number,
  subclassCode?: number,
  protocolCode?: number,
  serialNumber?: string,
|};

declare type USBDeviceRequestOptions = {|
  filters: Array<USBDeviceFilter>,
  exclusionFilters?: Array<USBDeviceFilter>,
|};

declare class USBConfiguration {
  constructor(): void;
  configurationName: ?string;
  configurationValue: number;
  interfaces: $ReadOnlyArray<USBInterface>;
}

declare class USBInterface {
  constructor(): void;
  interfaceNumber: number;
  alternate: USBAlternateInterface;
  alternates: Array<USBAlternateInterface>;
  claimed: boolean;
}

declare class USBAlternateInterface {
  constructor(): void;
  alternateSetting: number;
  interfaceClass: number;
  interfaceSubclass: number;
  interfaceProtocol: number;
  interfaceName: ?string;
  endpoints: Array<USBEndpoint>;
}

declare class USBEndpoint {
  constructor(): void;
  endpointNumber: number;
  direction: 'in' | 'out';
  type: 'bulk' | 'interrupt' | 'isochronous';
  packetSize: number;
}

declare class USBOutTransferResult {
  constructor(): void;
  bytesWritten: number;
  status: 'ok' | 'stall';
}

declare class USBInTransferResult {
  constructor(): void;
  data: DataView;
  status: 'ok' | 'stall' | 'babble';
}

declare class USBIsochronousInTransferResult {
  constructor(): void;
  data: DataView;
  packets: Array<USBIsochronousInTransferPacket>;
}

declare class USBIsochronousInTransferPacket {
  constructor(): void;
  data: DataView;
  status: 'ok' | 'stall' | 'babble';
}

declare class USBIsochronousOutTransferResult {
  constructor(): void;
  packets: Array<USBIsochronousOutTransferPacket>;
}

declare class USBIsochronousOutTransferPacket {
  constructor(): void;
  bytesWritten: number;
  status: 'ok' | 'stall';
}

type SetUpOptions = {
  requestType: string,
  recipient: string,
  request: number,
  value: number,
  index: number,
  ...
};

declare type FileSystemHandleKind = 'file' | 'directory';

// https://wicg.github.io/file-system-access/#api-filesystemhandle
declare class FileSystemHandle {
  +kind: FileSystemHandleKind;
  +name: string;

  isSameEntry: (other: FileSystemHandle) => Promise<boolean>;
  queryPermission?: (
    descriptor: FileSystemHandlePermissionDescriptor
  ) => Promise<PermissionStatus>;
  requestPermission?: (
    descriptor: FileSystemHandlePermissionDescriptor
  ) => Promise<PermissionStatus>;
}

// https://fs.spec.whatwg.org/#api-filesystemfilehandle
declare class FileSystemFileHandle extends FileSystemHandle {
  +kind: 'file';

  constructor(name: string): void;

  getFile(): Promise<File>;
  createSyncAccessHandle(): Promise<FileSystemSyncAccessHandle>;
  createWritable(options?: {|
    keepExistingData?: boolean,
  |}): Promise<FileSystemWritableFileStream>;
}

// https://fs.spec.whatwg.org/#api-filesystemdirectoryhandle
declare class FileSystemDirectoryHandle extends FileSystemHandle {
  +kind: 'directory';

  constructor(name: string): void;

  getDirectoryHandle(
    name: string,
    options?: {|create?: boolean|}
  ): Promise<FileSystemDirectoryHandle>;
  getFileHandle(
    name: string,
    options?: {|create?: boolean|}
  ): Promise<FileSystemFileHandle>;
  removeEntry(name: string, options?: {|recursive?: boolean|}): Promise<void>;
  resolve(possibleDescendant: FileSystemHandle): Promise<Array<string> | null>;

  // Async iterator functions
  @@asyncIterator(): AsyncIterator<[string, FileSystemHandle]>;
  entries(): AsyncIterator<[string, FileSystemHandle]>;
  keys(): AsyncIterator<string>;
  values(): AsyncIterator<FileSystemHandle>;
}

// https://fs.spec.whatwg.org/#api-filesystemsyncaccesshandle
declare class FileSystemSyncAccessHandle {
  close(): void;
  flush(): void;
  getSize(): number;
  read(buffer: ArrayBuffer, options?: {|at: number|}): number;
  truncate(newSize: number): void;
  write(buffer: ArrayBuffer, options?: {|at: number|}): number;
}

// https://streams.spec.whatwg.org/#default-writer-class
declare class WritableStreamDefaultWriter {
  +closed: Promise<void>;
  +desiredSize: number;
  +ready: Promise<void>;

  constructor(): void;

  abort(reason?: string): Promise<void>;
  close(): Promise<void>;
  releaseLock(): void;
  write(chunk: any): Promise<void>;
}

// https://streams.spec.whatwg.org/#ws-class
declare class WriteableStream {
  +locked: boolean;

  constructor(): void;

  abort(reason: string): Promise<string>;
  close(): Promise<void>;
  getWriter(): WritableStreamDefaultWriter;
}

// https://fs.spec.whatwg.org/#dictdef-writeparams
declare type FileSystemWriteableFileStreamDataTypes =
  | ArrayBuffer
  | $TypedArray
  | DataView
  | Blob
  | string;

// https://fs.spec.whatwg.org/#dictdef-writeparams
declare type FileSystemWriteableFileStreamData =
  | FileSystemWriteableFileStreamDataTypes
  | {|
      type: 'write',
      position?: number,
      data: FileSystemWriteableFileStreamDataTypes,
    |}
  | {|
      type: 'seek',
      position: number,
      data: FileSystemWriteableFileStreamDataTypes,
    |}
  | {|
      type: 'size',
      size: number,
    |};

// https://fs.spec.whatwg.org/#api-filesystemwritablefilestream
declare class FileSystemWritableFileStream extends WriteableStream {
  write(data: FileSystemWriteableFileStreamData): Promise<void>;
  truncate(size: number): Promise<void>;
  seek(position: number): Promise<void>;
}
