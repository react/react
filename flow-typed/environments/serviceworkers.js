// flow-typed signature: f6bda44505d6258bae702a65ee2878f2
// flow-typed version: 840509ea9d/serviceworkers/flow_>=v0.261.x

type FrameType = 'auxiliary' | 'top-level' | 'nested' | 'none';
type VisibilityState = 'hidden' | 'visible' | 'prerender' | 'unloaded';

declare class WindowClient extends Client {
  visibilityState: VisibilityState;
  focused: boolean;
  focus(): Promise<WindowClient>;
  navigate(url: string): Promise<WindowClient>;
}

declare class Client {
  id: string;
  reserved: boolean;
  url: string;
  frameType: FrameType;
  postMessage(message: any, transfer?: Iterator<any> | Array<any>): void;
}

declare class ExtendableEvent extends Event {
  waitUntil(f: Promise<mixed>): void;
}

type NotificationEvent$Init = {
  ...Event$Init,
  notification: Notification,
  action?: string,
  ...
};

declare class NotificationEvent extends ExtendableEvent {
  constructor(type: string, eventInitDict?: NotificationEvent$Init): void;
  +notification: Notification;
  +action: string;
}

type ForeignFetchOptions = {
  scopes: Iterator<string>,
  origins: Iterator<string>,
  ...
};

declare class InstallEvent extends ExtendableEvent {
  registerForeignFetch(options: ForeignFetchOptions): void;
}

declare class FetchEvent extends ExtendableEvent {
  request: Request;
  clientId: string;
  isReload: boolean;
  respondWith(response: Response | Promise<Response>): void;
  preloadResponse: Promise<?Response>;
}

type ClientType = 'window' | 'worker' | 'sharedworker' | 'all';
type ClientQueryOptions = {
  includeUncontrolled?: boolean,
  includeReserved?: boolean,
  type?: ClientType,
  ...
};

declare class Clients {
  get(id: string): Promise<?Client>;
  matchAll(options?: ClientQueryOptions): Promise<Array<Client>>;
  openWindow(url: string): Promise<?WindowClient>;
  claim(): Promise<void>;
}

type ServiceWorkerState =
  | 'installing'
  | 'installed'
  | 'activating'
  | 'activated'
  | 'redundant';

declare class ServiceWorker extends EventTarget {
  scriptURL: string;
  state: ServiceWorkerState;

  postMessage(message: any, transfer?: Iterator<any>): void;

  onstatechange?: EventHandler;
}

declare class NavigationPreloadState {
  enabled: boolean;
  headerValue: string;
}

declare class NavigationPreloadManager {
  enable: Promise<void>;
  disable: Promise<void>;
  setHeaderValue(value: string): Promise<void>;
  getState: Promise<NavigationPreloadState>;
}

type PushSubscriptionOptions = {
  userVisibleOnly?: boolean,
  applicationServerKey?: string | ArrayBuffer | $ArrayBufferView,
  ...
};

declare class PushSubscriptionJSON {
  endpoint: string;
  expirationTime: number | null;
  keys: {[string]: string, ...};
}

declare class PushSubscription {
  +endpoint: string;
  +expirationTime: number | null;
  +options: PushSubscriptionOptions;
  getKey(name: string): ArrayBuffer | null;
  toJSON(): PushSubscriptionJSON;
  unsubscribe(): Promise<boolean>;
}

declare class PushManager {
  +supportedContentEncodings: Array<string>;
  subscribe(options?: PushSubscriptionOptions): Promise<PushSubscription>;
  getSubscription(): Promise<PushSubscription | null>;
  permissionState(
    options?: PushSubscriptionOptions
  ): Promise<'granted' | 'denied' | 'prompt'>;
}

type ServiceWorkerUpdateViaCache = 'imports' | 'all' | 'none';

type GetNotificationOptions = {
  tag?: string,
  ...
};

declare class ServiceWorkerRegistration extends EventTarget {
  +installing: ?ServiceWorker;
  +waiting: ?ServiceWorker;
  +active: ?ServiceWorker;
  +navigationPreload: NavigationPreloadManager;
  +scope: string;
  +updateViaCache: ServiceWorkerUpdateViaCache;
  +pushManager: PushManager;

  getNotifications?: (
    filter?: GetNotificationOptions
  ) => Promise<$ReadOnlyArray<Notification>>;
  showNotification?: (
    title: string,
    options?: NotificationOptions
  ) => Promise<void>;
  update(): Promise<void>;
  unregister(): Promise<boolean>;

  onupdatefound?: EventHandler;
}

type WorkerType = 'classic' | 'module';

type RegistrationOptions = {
  scope?: string,
  type?: WorkerType,
  updateViaCache?: ServiceWorkerUpdateViaCache,
  ...
};

declare class ServiceWorkerContainer extends EventTarget {
  +controller: ?ServiceWorker;
  +ready: Promise<ServiceWorkerRegistration>;

  getRegistration(
    clientURL?: string
  ): Promise<ServiceWorkerRegistration | void>;
  getRegistrations(): Promise<Iterator<ServiceWorkerRegistration>>;
  register(
    scriptURL: string | TrustedScriptURL,
    options?: RegistrationOptions
  ): Promise<ServiceWorkerRegistration>;
  startMessages(): void;

  oncontrollerchange?: EventHandler;
  onmessage?: EventHandler;
  onmessageerror?: EventHandler;
}

/**
 * This feature has been removed from the Web standards.
 */
declare class ServiceWorkerMessageEvent extends Event {
  data: any;
  lastEventId: string;
  origin: string;
  ports: Array<MessagePort>;
  source: ?(ServiceWorker | MessagePort);
}

declare class ExtendableMessageEvent extends ExtendableEvent {
  data: any;
  lastEventId: string;
  origin: string;
  ports: Array<MessagePort>;
  source: ?(ServiceWorker | MessagePort);
}

type CacheQueryOptions = {
  ignoreSearch?: boolean,
  ignoreMethod?: boolean,
  ignoreVary?: boolean,
  cacheName?: string,
  ...
};

declare class Cache {
  match(request: RequestInfo, options?: CacheQueryOptions): Promise<Response>;
  matchAll(
    request: RequestInfo,
    options?: CacheQueryOptions
  ): Promise<Array<Response>>;
  add(request: RequestInfo): Promise<void>;
  addAll(requests: Array<RequestInfo>): Promise<void>;
  put(request: RequestInfo, response: Response): Promise<void>;
  delete(request: RequestInfo, options?: CacheQueryOptions): Promise<boolean>;
  keys(
    request?: RequestInfo,
    options?: CacheQueryOptions
  ): Promise<Array<Request>>;
}

declare class CacheStorage {
  match(request: RequestInfo, options?: CacheQueryOptions): Promise<Response>;
  has(cacheName: string): Promise<true>;
  open(cacheName: string): Promise<Cache>;
  delete(cacheName: string): Promise<boolean>;
  keys(): Promise<Array<string>>;
}

// Service worker global scope
// https://www.w3.org/TR/service-workers/#service-worker-global-scope
declare var clients: Clients;
declare var caches: CacheStorage;
declare var registration: ServiceWorkerRegistration;
declare function skipWaiting(): Promise<void>;
declare var onactivate: ?EventHandler;
declare var oninstall: ?EventHandler;
declare var onfetch: ?EventHandler;
declare var onforeignfetch: ?EventHandler;
declare var onmessage: ?EventHandler;
