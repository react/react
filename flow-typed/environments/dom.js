// flow-typed signature: 2872ddd56ba4b4bfefacac38ebdc6087
// flow-typed version: 3e51657e95/dom/flow_>=v0.261.x

/* Files */

declare class Blob {
  constructor(
    blobParts?: Array<any>,
    options?: {
      type?: string,
      endings?: string,
      ...
    }
  ): void;
  isClosed: boolean;
  size: number;
  type: string;
  close(): void;
  slice(start?: number, end?: number, contentType?: string): Blob;
  arrayBuffer(): Promise<ArrayBuffer>;
  text(): Promise<string>;
  stream(): ReadableStream;
}

declare class FileReader extends EventTarget {
  +EMPTY: 0;
  +LOADING: 1;
  +DONE: 2;
  +error: null | DOMError;
  +readyState: 0 | 1 | 2;
  +result: null | string | ArrayBuffer;
  abort(): void;
  onabort: null | ((ev: ProgressEvent) => any);
  onerror: null | ((ev: ProgressEvent) => any);
  onload: null | ((ev: ProgressEvent) => any);
  onloadend: null | ((ev: ProgressEvent) => any);
  onloadstart: null | ((ev: ProgressEvent) => any);
  onprogress: null | ((ev: ProgressEvent) => any);
  readAsArrayBuffer(blob: Blob): void;
  readAsBinaryString(blob: Blob): void;
  readAsDataURL(blob: Blob): void;
  readAsText(blob: Blob, encoding?: string): void;
}

declare type FilePropertyBag = {
  type?: string,
  lastModified?: number,
  ...
};
declare class File extends Blob {
  constructor(
    fileBits: $ReadOnlyArray<string | BufferDataSource | Blob>,
    filename: string,
    options?: FilePropertyBag
  ): void;
  lastModified: number;
  name: string;
}

declare class FileList {
  @@iterator(): Iterator<File>;
  length: number;
  item(index: number): File;
  [index: number]: File;
}

declare class DOMError {
  name: string;
}

declare interface ShadowRoot extends DocumentFragment {
  +delegatesFocus: boolean;
  +host: Element;
  // flowlint unsafe-getters-setters:off
  get innerHTML(): string;
  set innerHTML(value: string | TrustedHTML): void;
  // flowlint unsafe-getters-setters:error
  +mode: ShadowRootMode;

  // From DocumentOrShadowRoot Mixin.
  +styleSheets: StyleSheetList;
  adoptedStyleSheets: Array<CSSStyleSheet>;
}

declare type ShadowRootMode = 'open' | 'closed';

declare type ShadowRootInit = {
  delegatesFocus?: boolean,
  mode: ShadowRootMode,
  ...
};

declare type ScrollToOptions = {
  top?: number,
  left?: number,
  behavior?: 'auto' | 'smooth',
  ...
};

type EventHandler = (event: Event) => mixed;
type EventListener = {handleEvent: EventHandler, ...} | EventHandler;
type MouseEventHandler = (event: MouseEvent) => mixed;
type MouseEventListener =
  | {handleEvent: MouseEventHandler, ...}
  | MouseEventHandler;
type FocusEventHandler = (event: FocusEvent) => mixed;
type FocusEventListener =
  | {handleEvent: FocusEventHandler, ...}
  | FocusEventHandler;
type KeyboardEventHandler = (event: KeyboardEvent) => mixed;
type KeyboardEventListener =
  | {handleEvent: KeyboardEventHandler, ...}
  | KeyboardEventHandler;
type InputEventHandler = (event: InputEvent) => mixed;
type InputEventListener =
  | {handleEvent: InputEventHandler, ...}
  | InputEventHandler;
type TouchEventHandler = (event: TouchEvent) => mixed;
type TouchEventListener =
  | {handleEvent: TouchEventHandler, ...}
  | TouchEventHandler;
type WheelEventHandler = (event: WheelEvent) => mixed;
type WheelEventListener =
  | {handleEvent: WheelEventHandler, ...}
  | WheelEventHandler;
type AbortProgressEventHandler = (event: ProgressEvent) => mixed;
type AbortProgressEventListener =
  | {handleEvent: AbortProgressEventHandler, ...}
  | AbortProgressEventHandler;
type ProgressEventHandler = (event: ProgressEvent) => mixed;
type ProgressEventListener =
  | {handleEvent: ProgressEventHandler, ...}
  | ProgressEventHandler;
type DragEventHandler = (event: DragEvent) => mixed;
type DragEventListener =
  | {handleEvent: DragEventHandler, ...}
  | DragEventHandler;
type PointerEventHandler = (event: PointerEvent) => mixed;
type PointerEventListener =
  | {handleEvent: PointerEventHandler, ...}
  | PointerEventHandler;
type AnimationEventHandler = (event: AnimationEvent) => mixed;
type AnimationEventListener =
  | {handleEvent: AnimationEventHandler, ...}
  | AnimationEventHandler;
type ClipboardEventHandler = (event: ClipboardEvent) => mixed;
type ClipboardEventListener =
  | {handleEvent: ClipboardEventHandler, ...}
  | ClipboardEventHandler;
type TransitionEventHandler = (event: TransitionEvent) => mixed;
type TransitionEventListener =
  | {handleEvent: TransitionEventHandler, ...}
  | TransitionEventHandler;
type MessageEventHandler = (event: MessageEvent<>) => mixed;
type MessageEventListener =
  | {handleEvent: MessageEventHandler, ...}
  | MessageEventHandler;
type BeforeUnloadEventHandler = (event: BeforeUnloadEvent) => mixed;
type BeforeUnloadEventListener =
  | {handleEvent: BeforeUnloadEventHandler, ...}
  | BeforeUnloadEventHandler;
type StorageEventHandler = (event: StorageEvent) => mixed;
type StorageEventListener =
  | {handleEvent: StorageEventHandler, ...}
  | StorageEventHandler;
type SecurityPolicyViolationEventHandler = (
  event: SecurityPolicyViolationEvent
) => mixed;
type SecurityPolicyViolationEventListener =
  | {handleEvent: SecurityPolicyViolationEventHandler, ...}
  | SecurityPolicyViolationEventHandler;
type USBConnectionEventHandler = (event: USBConnectionEvent) => mixed;
type USBConnectionEventListener =
  | {handleEvent: USBConnectionEventHandler, ...}
  | USBConnectionEventHandler;

type MediaKeySessionType = 'temporary' | 'persistent-license';
type MediaKeyStatus =
  | 'usable'
  | 'expired'
  | 'released'
  | 'output-restricted'
  | 'output-downscaled'
  | 'status-pending'
  | 'internal-error';
type MouseEventTypes =
  | 'contextmenu'
  | 'mousedown'
  | 'mouseenter'
  | 'mouseleave'
  | 'mousemove'
  | 'mouseout'
  | 'mouseover'
  | 'mouseup'
  | 'click'
  | 'dblclick';
type FocusEventTypes = 'blur' | 'focus' | 'focusin' | 'focusout';
type KeyboardEventTypes = 'keydown' | 'keyup' | 'keypress';
type InputEventTypes = 'input' | 'beforeinput';
type TouchEventTypes = 'touchstart' | 'touchmove' | 'touchend' | 'touchcancel';
type WheelEventTypes = 'wheel';
type AbortProgressEventTypes = 'abort';
type ProgressEventTypes =
  | 'abort'
  | 'error'
  | 'load'
  | 'loadend'
  | 'loadstart'
  | 'progress'
  | 'timeout';
type DragEventTypes =
  | 'drag'
  | 'dragend'
  | 'dragenter'
  | 'dragexit'
  | 'dragleave'
  | 'dragover'
  | 'dragstart'
  | 'drop';
type PointerEventTypes =
  | 'pointerover'
  | 'pointerenter'
  | 'pointerdown'
  | 'pointermove'
  | 'pointerup'
  | 'pointercancel'
  | 'pointerout'
  | 'pointerleave'
  | 'gotpointercapture'
  | 'lostpointercapture';
type AnimationEventTypes =
  | 'animationstart'
  | 'animationend'
  | 'animationiteration';
type ClipboardEventTypes = 'clipboardchange' | 'cut' | 'copy' | 'paste';
type TransitionEventTypes =
  | 'transitionrun'
  | 'transitionstart'
  | 'transitionend'
  | 'transitioncancel';
type MessageEventTypes = string;
type BeforeUnloadEventTypes = 'beforeunload';
type StorageEventTypes = 'storage';
type SecurityPolicyViolationEventTypes = 'securitypolicyviolation';
type USBConnectionEventTypes = 'connect' | 'disconnect';
type ToggleEventTypes = 'beforetoggle' | 'toggle';
type EventListenerOptionsOrUseCapture =
  | boolean
  | {
      capture?: boolean,
      once?: boolean,
      passive?: boolean,
      signal?: AbortSignal,
      ...
    };

declare class EventTarget {
  addEventListener(
    type: MouseEventTypes,
    listener: MouseEventListener,
    optionsOrUseCapture?: EventListenerOptionsOrUseCapture
  ): void;
  addEventListener(
    type: FocusEventTypes,
    listener: FocusEventListener,
    optionsOrUseCapture?: EventListenerOptionsOrUseCapture
  ): void;
  addEventListener(
    type: KeyboardEventTypes,
    listener: KeyboardEventListener,
    optionsOrUseCapture?: EventListenerOptionsOrUseCapture
  ): void;
  addEventListener(
    type: InputEventTypes,
    listener: InputEventListener,
    optionsOrUseCapture?: EventListenerOptionsOrUseCapture
  ): void;
  addEventListener(
    type: TouchEventTypes,
    listener: TouchEventListener,
    optionsOrUseCapture?: EventListenerOptionsOrUseCapture
  ): void;
  addEventListener(
    type: WheelEventTypes,
    listener: WheelEventListener,
    optionsOrUseCapture?: EventListenerOptionsOrUseCapture
  ): void;
  addEventListener(
    type: AbortProgressEventTypes,
    listener: AbortProgressEventListener,
    optionsOrUseCapture?: EventListenerOptionsOrUseCapture
  ): void;
  addEventListener(
    type: ProgressEventTypes,
    listener: ProgressEventListener,
    optionsOrUseCapture?: EventListenerOptionsOrUseCapture
  ): void;
  addEventListener(
    type: DragEventTypes,
    listener: DragEventListener,
    optionsOrUseCapture?: EventListenerOptionsOrUseCapture
  ): void;
  addEventListener(
    type: PointerEventTypes,
    listener: PointerEventListener,
    optionsOrUseCapture?: EventListenerOptionsOrUseCapture
  ): void;
  addEventListener(
    type: AnimationEventTypes,
    listener: AnimationEventListener,
    optionsOrUseCapture?: EventListenerOptionsOrUseCapture
  ): void;
  addEventListener(
    type: ClipboardEventTypes,
    listener: ClipboardEventListener,
    optionsOrUseCapture?: EventListenerOptionsOrUseCapture
  ): void;
  addEventListener(
    type: TransitionEventTypes,
    listener: TransitionEventListener,
    optionsOrUseCapture?: EventListenerOptionsOrUseCapture
  ): void;
  addEventListener(
    type: MessageEventTypes,
    listener: MessageEventListener,
    optionsOrUseCapture?: EventListenerOptionsOrUseCapture
  ): void;
  addEventListener(
    type: BeforeUnloadEventTypes,
    listener: BeforeUnloadEventListener,
    optionsOrUseCapture?: EventListenerOptionsOrUseCapture
  ): void;
  addEventListener(
    type: StorageEventTypes,
    listener: StorageEventListener,
    optionsOrUseCapture?: EventListenerOptionsOrUseCapture
  ): void;
  addEventListener(
    type: SecurityPolicyViolationEventTypes,
    listener: SecurityPolicyViolationEventListener,
    optionsOrUseCapture?: EventListenerOptionsOrUseCapture
  ): void;
  addEventListener(
    type: USBConnectionEventTypes,
    listener: USBConnectionEventListener,
    optionsOrUseCapture?: EventListenerOptionsOrUseCapture
  ): void;
  addEventListener(
    type: string,
    listener: EventListener,
    optionsOrUseCapture?: EventListenerOptionsOrUseCapture
  ): void;

  removeEventListener(
    type: MouseEventTypes,
    listener: MouseEventListener,
    optionsOrUseCapture?: EventListenerOptionsOrUseCapture
  ): void;
  removeEventListener(
    type: FocusEventTypes,
    listener: FocusEventListener,
    optionsOrUseCapture?: EventListenerOptionsOrUseCapture
  ): void;
  removeEventListener(
    type: KeyboardEventTypes,
    listener: KeyboardEventListener,
    optionsOrUseCapture?: EventListenerOptionsOrUseCapture
  ): void;
  removeEventListener(
    type: InputEventTypes,
    listener: InputEventListener,
    optionsOrUseCapture?: EventListenerOptionsOrUseCapture
  ): void;
  removeEventListener(
    type: TouchEventTypes,
    listener: TouchEventListener,
    optionsOrUseCapture?: EventListenerOptionsOrUseCapture
  ): void;
  removeEventListener(
    type: WheelEventTypes,
    listener: WheelEventListener,
    optionsOrUseCapture?: EventListenerOptionsOrUseCapture
  ): void;
  removeEventListener(
    type: AbortProgressEventTypes,
    listener: AbortProgressEventListener,
    optionsOrUseCapture?: EventListenerOptionsOrUseCapture
  ): void;
  removeEventListener(
    type: ProgressEventTypes,
    listener: ProgressEventListener,
    optionsOrUseCapture?: EventListenerOptionsOrUseCapture
  ): void;
  removeEventListener(
    type: DragEventTypes,
    listener: DragEventListener,
    optionsOrUseCapture?: EventListenerOptionsOrUseCapture
  ): void;
  removeEventListener(
    type: PointerEventTypes,
    listener: PointerEventListener,
    optionsOrUseCapture?: EventListenerOptionsOrUseCapture
  ): void;
  removeEventListener(
    type: AnimationEventTypes,
    listener: AnimationEventListener,
    optionsOrUseCapture?: EventListenerOptionsOrUseCapture
  ): void;
  removeEventListener(
    type: ClipboardEventTypes,
    listener: ClipboardEventListener,
    optionsOrUseCapture?: EventListenerOptionsOrUseCapture
  ): void;
  removeEventListener(
    type: TransitionEventTypes,
    listener: TransitionEventListener,
    optionsOrUseCapture?: EventListenerOptionsOrUseCapture
  ): void;
  removeEventListener(
    type: MessageEventTypes,
    listener: MessageEventListener,
    optionsOrUseCapture?: EventListenerOptionsOrUseCapture
  ): void;
  removeEventListener(
    type: BeforeUnloadEventTypes,
    listener: BeforeUnloadEventListener,
    optionsOrUseCapture?: EventListenerOptionsOrUseCapture
  ): void;
  removeEventListener(
    type: StorageEventTypes,
    listener: StorageEventListener,
    optionsOrUseCapture?: EventListenerOptionsOrUseCapture
  ): void;
  removeEventListener(
    type: SecurityPolicyViolationEventTypes,
    listener: SecurityPolicyViolationEventListener,
    optionsOrUseCapture?: EventListenerOptionsOrUseCapture
  ): void;
  removeEventListener(
    type: USBConnectionEventTypes,
    listener: USBConnectionEventListener,
    optionsOrUseCapture?: EventListenerOptionsOrUseCapture
  ): void;
  removeEventListener(
    type: string,
    listener: EventListener,
    optionsOrUseCapture?: EventListenerOptionsOrUseCapture
  ): void;

  attachEvent?: (type: MouseEventTypes, listener: MouseEventListener) => void;
  attachEvent?: (type: FocusEventTypes, listener: FocusEventListener) => void;
  attachEvent?: (
    type: KeyboardEventTypes,
    listener: KeyboardEventListener
  ) => void;
  attachEvent?: (type: InputEventTypes, listener: InputEventListener) => void;
  attachEvent?: (type: TouchEventTypes, listener: TouchEventListener) => void;
  attachEvent?: (type: WheelEventTypes, listener: WheelEventListener) => void;
  attachEvent?: (
    type: AbortProgressEventTypes,
    listener: AbortProgressEventListener
  ) => void;
  attachEvent?: (
    type: ProgressEventTypes,
    listener: ProgressEventListener
  ) => void;
  attachEvent?: (type: DragEventTypes, listener: DragEventListener) => void;
  attachEvent?: (
    type: PointerEventTypes,
    listener: PointerEventListener
  ) => void;
  attachEvent?: (
    type: AnimationEventTypes,
    listener: AnimationEventListener
  ) => void;
  attachEvent?: (
    type: ClipboardEventTypes,
    listener: ClipboardEventListener
  ) => void;
  attachEvent?: (
    type: TransitionEventTypes,
    listener: TransitionEventListener
  ) => void;
  attachEvent?: (
    type: MessageEventTypes,
    listener: MessageEventListener
  ) => void;
  attachEvent?: (
    type: BeforeUnloadEventTypes,
    listener: BeforeUnloadEventListener
  ) => void;
  attachEvent?: (
    type: StorageEventTypes,
    listener: StorageEventListener
  ) => void;
  attachEvent?: (
    type: USBConnectionEventTypes,
    listener: USBConnectionEventListener
  ) => void;
  attachEvent?: (type: string, listener: EventListener) => void;

  detachEvent?: (type: MouseEventTypes, listener: MouseEventListener) => void;
  detachEvent?: (type: FocusEventTypes, listener: FocusEventListener) => void;
  detachEvent?: (
    type: KeyboardEventTypes,
    listener: KeyboardEventListener
  ) => void;
  detachEvent?: (type: InputEventTypes, listener: InputEventListener) => void;
  detachEvent?: (type: TouchEventTypes, listener: TouchEventListener) => void;
  detachEvent?: (type: WheelEventTypes, listener: WheelEventListener) => void;
  detachEvent?: (
    type: AbortProgressEventTypes,
    listener: AbortProgressEventListener
  ) => void;
  detachEvent?: (
    type: ProgressEventTypes,
    listener: ProgressEventListener
  ) => void;
  detachEvent?: (type: DragEventTypes, listener: DragEventListener) => void;
  detachEvent?: (
    type: PointerEventTypes,
    listener: PointerEventListener
  ) => void;
  detachEvent?: (
    type: AnimationEventTypes,
    listener: AnimationEventListener
  ) => void;
  detachEvent?: (
    type: ClipboardEventTypes,
    listener: ClipboardEventListener
  ) => void;
  detachEvent?: (
    type: TransitionEventTypes,
    listener: TransitionEventListener
  ) => void;
  detachEvent?: (
    type: MessageEventTypes,
    listener: MessageEventListener
  ) => void;
  detachEvent?: (
    type: BeforeUnloadEventTypes,
    listener: BeforeUnloadEventListener
  ) => void;
  detachEvent?: (
    type: StorageEventTypes,
    listener: StorageEventListener
  ) => void;
  detachEvent?: (
    type: USBConnectionEventTypes,
    listener: USBConnectionEventListener
  ) => void;
  detachEvent?: (type: string, listener: EventListener) => void;

  dispatchEvent(evt: Event): boolean;

  // Deprecated

  cancelBubble: boolean;
  initEvent(
    eventTypeArg: string,
    canBubbleArg: boolean,
    cancelableArg: boolean
  ): void;
}

// https://dom.spec.whatwg.org/#dictdef-eventinit
type Event$Init = {
  bubbles?: boolean,
  cancelable?: boolean,
  composed?: boolean,
  /** Non-standard. See `composed` instead. */
  scoped?: boolean,
  ...
};

// https://dom.spec.whatwg.org/#interface-event
declare class Event {
  constructor(type: string, eventInitDict?: Event$Init): void;
  /**
   * Returns the type of event, e.g. "click", "hashchange", or "submit".
   */
  +type: string;
  /**
   * Returns the object to which event is dispatched (its target).
   */
  +target: EventTarget; // TODO: nullable
  /** @deprecated */
  +srcElement: Element; // TODO: nullable
  /**
   * Returns the object whose event listener's callback is currently being invoked.
   */
  +currentTarget: EventTarget; // TODO: nullable
  /**
   * Returns the invocation target objects of event's path (objects on which
   * listeners will be invoked), except for any nodes in shadow trees of which
   * the shadow root's mode is "closed" that are not reachable from event's
   * currentTarget.
   */
  composedPath(): Array<EventTarget>;

  +NONE: number;
  +AT_TARGET: number;
  +BUBBLING_PHASE: number;
  +CAPTURING_PHASE: number;
  /**
   * Returns the event's phase, which is one of NONE, CAPTURING_PHASE, AT_TARGET,
   * and BUBBLING_PHASE.
   */
  +eventPhase: number;

  /**
   * When dispatched in a tree, invoking this method prevents event from reaching
   * any objects other than the current object.
   */
  stopPropagation(): void;
  /**
   * Invoking this method prevents event from reaching any registered event
   * listeners after the current one finishes running and, when dispatched in a
   * tree, also prevents event from reaching any other objects.
   */
  stopImmediatePropagation(): void;

  /**
   * Returns true or false depending on how event was initialized. True if
   * event goes through its target's ancestors in reverse tree order, and
   * false otherwise.
   */
  +bubbles: boolean;
  /**
   * Returns true or false depending on how event was initialized. Its
   * return value does not always carry meaning, but true can indicate
   * that part of the operation during which event was dispatched, can
   * be canceled by invoking the preventDefault() method.
   */
  +cancelable: boolean;
  // returnValue: boolean; // legacy, and some subclasses still define it as a string!
  /**
   * If invoked when the cancelable attribute value is true, and while
   * executing a listener for the event with passive set to false, signals to
   * the operation that caused event to be dispatched that it needs to be
   * canceled.
   */
  preventDefault(): void;
  /**
   * Returns true if preventDefault() was invoked successfully to indicate
   * cancelation, and false otherwise.
   */
  +defaultPrevented: boolean;
  /**
   * Returns true or false depending on how event was initialized. True if
   * event invokes listeners past a ShadowRoot node that is the root of its
   * target, and false otherwise.
   */
  +composed: boolean;

  /**
   * Returns true if event was dispatched by the user agent, and false otherwise.
   */
  +isTrusted: boolean;
  /**
   * Returns the event's timestamp as the number of milliseconds measured relative
   * to the time origin.
   */
  +timeStamp: number;

  /** Non-standard. See Event.prototype.composedPath */
  +deepPath?: () => EventTarget[];
  /** Non-standard. See Event.prototype.composed */
  +scoped: boolean;

  /**
   * @deprecated
   */
  initEvent(type: string, bubbles: boolean, cancelable: boolean): void;
}

type CustomEvent$Init = {...Event$Init, detail?: any, ...};

declare class CustomEvent extends Event {
  constructor(type: string, eventInitDict?: CustomEvent$Init): void;
  detail: any;

  // deprecated
  initCustomEvent(
    type: string,
    bubbles: boolean,
    cancelable: boolean,
    detail: any
  ): CustomEvent;
}

type UIEvent$Init = {...Event$Init, detail?: number, view?: any, ...};

declare class UIEvent extends Event {
  constructor(typeArg: string, uiEventInit?: UIEvent$Init): void;
  detail: number;
  view: any;
}

declare class CompositionEvent extends UIEvent {
  data: string | null;
  locale: string;
}

type MouseEvent$MouseEventInit = {
  screenX?: number,
  screenY?: number,
  clientX?: number,
  clientY?: number,
  ctrlKey?: boolean,
  shiftKey?: boolean,
  altKey?: boolean,
  metaKey?: boolean,
  button?: number,
  buttons?: number,
  region?: string | null,
  relatedTarget?: EventTarget | null,
  ...
};

declare class MouseEvent extends UIEvent {
  constructor(
    typeArg: string,
    mouseEventInit?: MouseEvent$MouseEventInit
  ): void;
  altKey: boolean;
  button: number;
  buttons: number;
  clientX: number;
  clientY: number;
  ctrlKey: boolean;
  metaKey: boolean;
  movementX: number;
  movementY: number;
  offsetX: number;
  offsetY: number;
  pageX: number;
  pageY: number;
  region: string | null;
  relatedTarget: EventTarget | null;
  screenX: number;
  screenY: number;
  shiftKey: boolean;
  x: number;
  y: number;
  getModifierState(keyArg: string): boolean;
}

declare class FocusEvent extends UIEvent {
  relatedTarget: ?EventTarget;
}

type WheelEvent$Init = {
  ...MouseEvent$MouseEventInit,
  deltaX?: number,
  deltaY?: number,
  deltaZ?: number,
  deltaMode?: 0x00 | 0x01 | 0x02,
  ...
};

declare class WheelEvent extends MouseEvent {
  static +DOM_DELTA_PIXEL: 0x00;
  static +DOM_DELTA_LINE: 0x01;
  static +DOM_DELTA_PAGE: 0x02;

  constructor(type: string, eventInitDict?: WheelEvent$Init): void;
  +deltaX: number;
  +deltaY: number;
  +deltaZ: number;
  +deltaMode: 0x00 | 0x01 | 0x02;
}

declare class DragEvent extends MouseEvent {
  dataTransfer: ?DataTransfer; // readonly
}

type PointerEvent$PointerEventInit = MouseEvent$MouseEventInit & {
  pointerId?: number,
  width?: number,
  height?: number,
  pressure?: number,
  tangentialPressure?: number,
  tiltX?: number,
  tiltY?: number,
  twist?: number,
  pointerType?: string,
  isPrimary?: boolean,
  ...
};

declare class PointerEvent extends MouseEvent {
  constructor(
    typeArg: string,
    pointerEventInit?: PointerEvent$PointerEventInit
  ): void;
  pointerId: number;
  width: number;
  height: number;
  pressure: number;
  tangentialPressure: number;
  tiltX: number;
  tiltY: number;
  twist: number;
  pointerType: string;
  isPrimary: boolean;
}

declare class ProgressEvent extends Event {
  lengthComputable: boolean;
  loaded: number;
  total: number;

  // Deprecated
  initProgressEvent(
    typeArg: string,
    canBubbleArg: boolean,
    cancelableArg: boolean,
    lengthComputableArg: boolean,
    loadedArg: number,
    totalArg: number
  ): void;
}

declare class PromiseRejectionEvent extends Event {
  promise: Promise<any>;
  reason: any;
}

type PageTransitionEventInit = {
  ...Event$Init,
  persisted: boolean,
  ...
};

// https://html.spec.whatwg.org/multipage/browsing-the-web.html#the-pagetransitionevent-interface
declare class PageTransitionEvent extends Event {
  constructor(type: string, init?: PageTransitionEventInit): void;
  +persisted: boolean;
}

// used for websockets and postMessage, for example. See:
// https://www.w3.org/TR/2011/WD-websockets-20110419/
// and
// https://www.w3.org/TR/2008/WD-html5-20080610/comms.html
// and
// https://html.spec.whatwg.org/multipage/comms.html#the-messageevent-interfaces
declare class MessageEvent<Data = mixed> extends Event {
  data: Data;
  origin: string;
  lastEventId: string;
  source: WindowProxy;
}

// https://w3c.github.io/uievents/#idl-keyboardeventinit
type KeyboardEvent$Init = {
  ...UIEvent$Init,
  /**
   * Initializes the `key` attribute of the KeyboardEvent object to the unicode
   * character string representing the meaning of a key after taking into
   * account all keyboard modifiers (such as shift-state). This value is the
   * final effective value of the key. If the key is not a printable character,
   * then it should be one of the key values defined in [UIEvents-Key](https://www.w3.org/TR/uievents-key/).
   *
   * NOTE: not `null`, this results in `evt.key === 'null'`!
   */
  key?: string | void,
  /**
   * Initializes the `code` attribute of the KeyboardEvent object to the unicode
   * character string representing the key that was pressed, ignoring any
   * keyboard modifications such as keyboard layout. This value should be one
   * of the code values defined in [UIEvents-Code](https://www.w3.org/TR/uievents-code/).
   *
   * NOTE: not `null`, this results in `evt.code === 'null'`!
   */
  code?: string | void,
  /**
   * Initializes the `location` attribute of the KeyboardEvent object to one of
   * the following location numerical constants:
   *
   *   DOM_KEY_LOCATION_STANDARD (numerical value 0)
   *   DOM_KEY_LOCATION_LEFT (numerical value 1)
   *   DOM_KEY_LOCATION_RIGHT (numerical value 2)
   *   DOM_KEY_LOCATION_NUMPAD (numerical value 3)
   */
  location?: number,
  /**
   * Initializes the `ctrlKey` attribute of the KeyboardEvent object to true if
   * the Control key modifier is to be considered active, false otherwise.
   */
  ctrlKey?: boolean,
  /**
   * Initializes the `shiftKey` attribute of the KeyboardEvent object to true if
   * the Shift key modifier is to be considered active, false otherwise.
   */
  shiftKey?: boolean,
  /**
   * Initializes the `altKey` attribute of the KeyboardEvent object to true if
   * the Alt (alternative) (or Option) key modifier is to be considered active,
   * false otherwise.
   */
  altKey?: boolean,
  /**
   * Initializes the `metaKey` attribute of the KeyboardEvent object to true if
   * the Meta key modifier is to be considered active, false otherwise.
   */
  metaKey?: boolean,
  /**
   * Initializes the `repeat` attribute of the KeyboardEvent object. This
   * attribute should be set to true if the the current KeyboardEvent is
   * considered part of a repeating sequence of similar events caused by the
   * long depression of any single key, false otherwise.
   */
  repeat?: boolean,
  /**
   * Initializes the `isComposing` attribute of the KeyboardEvent object. This
   * attribute should be set to true if the event being constructed occurs as
   * part of a composition sequence, false otherwise.
   */
  isComposing?: boolean,
  /**
   * Initializes the `charCode` attribute of the KeyboardEvent to the Unicode
   * code point for the event’s character.
   */
  charCode?: number,
  /**
   * Initializes the `keyCode` attribute of the KeyboardEvent to the system-
   * and implementation-dependent numerical code signifying the unmodified
   * identifier associated with the key pressed.
   */
  keyCode?: number,
  /** Initializes the `which` attribute */
  which?: number,
  ...
};

// https://w3c.github.io/uievents/#idl-keyboardevent
declare class KeyboardEvent extends UIEvent {
  constructor(typeArg: string, init?: KeyboardEvent$Init): void;

  /** `true` if the Alt (alternative) (or "Option") key modifier was active. */
  +altKey: boolean;
  /**
   * Holds a string that identifies the physical key being pressed. The value
   * is not affected by the current keyboard layout or modifier state, so a
   * particular key will always return the same value.
   */
  +code: string;
  /** `true` if the Control (control) key modifier was active. */
  +ctrlKey: boolean;
  /**
   * `true` if the key event occurs as part of a composition session, i.e.,
   * after a `compositionstart` event and before the corresponding
   * `compositionend` event.
   */
  +isComposing: boolean;
  /**
   * Holds a [key attribute value](https://www.w3.org/TR/uievents-key/#key-attribute-value)
   * corresponding to the key pressed. */
  +key: string;
  /** An indication of the logical location of the key on the device. */
  +location: number;
  /** `true` if the meta (Meta) key (or "Command") modifier was active. */
  +metaKey: boolean;
  /** `true` if the key has been pressed in a sustained manner. */
  +repeat: boolean;
  /** `true` if the shift (Shift) key modifier was active. */
  +shiftKey: boolean;

  /**
   * Queries the state of a modifier using a key value.
   *
   * Returns `true` if it is a modifier key and the modifier is activated,
   * `false` otherwise.
   */
  getModifierState(keyArg?: string): boolean;

  /**
   * Holds a character value, for keypress events which generate character
   * input. The value is the Unicode reference number (code point) of that
   * character (e.g. event.charCode = event.key.charCodeAt(0) for printable
   * characters). For keydown or keyup events, the value of charCode is 0.
   *
   * @deprecated You should use KeyboardEvent.key instead, if available.
   */
  +charCode: number;
  /**
   * Holds a system- and implementation-dependent numerical code signifying
   * the unmodified identifier associated with the key pressed. Unlike the
   * `key` attribute, the set of possible values are not normatively defined.
   * Typically, these value of the keyCode SHOULD represent the decimal
   * codepoint in ASCII or Windows 1252, but MAY be drawn from a different
   * appropriate character set. Implementations that are unable to identify
   * a key use the key value 0.
   *
   * @deprecated You should use KeyboardEvent.key instead, if available.
   */
  +keyCode: number;
  /**
   * Holds a system- and implementation-dependent numerical code signifying
   * the unmodified identifier associated with the key pressed. In most cases,
   * the value is identical to keyCode.
   *
   * @deprecated You should use KeyboardEvent.key instead, if available.
   */
  +which: number;
}

type InputEvent$Init = {
  ...UIEvent$Init,
  inputType?: string,
  data?: string,
  dataTransfer?: DataTransfer,
  isComposing?: boolean,
  ranges?: Array<any>, // TODO: StaticRange
  ...
};

declare class InputEvent extends UIEvent {
  constructor(typeArg: string, inputEventInit: InputEvent$Init): void;
  +data: string | null;
  +dataTransfer: DataTransfer | null;
  +inputType: string;
  +isComposing: boolean;
  getTargetRanges(): Array<any>; // TODO: StaticRange
}

declare class AnimationEvent extends Event {
  animationName: string;
  elapsedTime: number;
  pseudoElement: string;

  // deprecated

  initAnimationEvent: (
    type: 'animationstart' | 'animationend' | 'animationiteration',
    canBubble: boolean,
    cancelable: boolean,
    animationName: string,
    elapsedTime: number
  ) => void;
}

// https://www.w3.org/TR/touch-events/#idl-def-Touch
declare class Touch {
  clientX: number;
  clientY: number;
  identifier: number;
  pageX: number;
  pageY: number;
  screenX: number;
  screenY: number;
  target: EventTarget;
}

// https://www.w3.org/TR/touch-events/#idl-def-TouchList
// TouchList#item(index) will return null if n > #length. Should #item's
// return type just been Touch?
declare class TouchList {
  @@iterator(): Iterator<Touch>;
  length: number;
  item(index: number): null | Touch;
  [index: number]: Touch;
}

// https://www.w3.org/TR/touch-events/#touchevent-interface
declare class TouchEvent extends UIEvent {
  altKey: boolean;
  changedTouches: TouchList;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
  targetTouches: TouchList;
  touches: TouchList;
}

// https://www.w3.org/TR/clipboard-apis/#typedefdef-clipboarditemdata
// Raw string | Blob are allowed per https://webidl.spec.whatwg.org/#es-promise
type ClipboardItemData = string | Blob | Promise<string | Blob>;

type PresentationStyle = 'attachment' | 'inline' | 'unspecified';

type ClipboardItemOptions = {
  presentationStyle?: PresentationStyle,
  ...
};

declare class ClipboardItem {
  +types: $ReadOnlyArray<string>;
  getType(type: string): Promise<Blob>;
  constructor(
    items: {[type: string]: ClipboardItemData},
    options?: ClipboardItemOptions
  ): void;
}

// https://w3c.github.io/clipboard-apis/ as of 15 May 2018
type ClipboardEvent$Init = {
  ...Event$Init,
  clipboardData: DataTransfer | null,
  ...
};

declare class ClipboardEvent extends Event {
  constructor(type: ClipboardEventTypes, eventInit?: ClipboardEvent$Init): void;
  +clipboardData: ?DataTransfer; // readonly
}

// https://www.w3.org/TR/2017/WD-css-transitions-1-20171130/#interface-transitionevent
type TransitionEvent$Init = {
  ...Event$Init,
  propertyName: string,
  elapsedTime: number,
  pseudoElement: string,
  ...
};

declare class TransitionEvent extends Event {
  constructor(
    type: TransitionEventTypes,
    eventInit?: TransitionEvent$Init
  ): void;

  +propertyName: string; // readonly
  +elapsedTime: number; // readonly
  +pseudoElement: string; // readonly
}

declare class SecurityPolicyViolationEvent extends Event {
  +documentURI: string;
  +referrer: string;
  +blockedURI: string;
  +effectiveDirective: string;
  +violatedDirective: string;
  +originalPolicy: string;
  +sourceFile: string;
  +sample: string;
  +disposition: 'enforce' | 'report';
  +statusCode: number;
  +lineNumber: number;
  +columnNumber: number;
}

// https://developer.mozilla.org/en-US/docs/Web/API/USBConnectionEvent
declare class USBConnectionEvent extends Event {
  device: USBDevice;
}

// TODO: *Event

declare class AbortController {
  constructor(): void;
  +signal: AbortSignal;
  abort(reason?: any): void;
}

declare class AbortSignal extends EventTarget {
  +aborted: boolean;
  +reason: any;
  abort(reason?: any): AbortSignal;
  onabort: (event: Event) => mixed;
  throwIfAborted(): void;
  timeout(time: number): AbortSignal;
}

declare class Node extends EventTarget {
  baseURI: ?string;
  childNodes: NodeList<Node>;
  firstChild: ?Node;
  +isConnected: boolean;
  lastChild: ?Node;
  nextSibling: ?Node;
  nodeName: string;
  nodeType: number;
  nodeValue: string;
  ownerDocument: Document;
  parentElement: ?Element;
  parentNode: ?Node;
  previousSibling: ?Node;
  rootNode: Node;
  textContent: string;
  appendChild<T: Node>(newChild: T): T;
  cloneNode(deep?: boolean): this;
  compareDocumentPosition(other: Node): number;
  contains(other: ?Node): boolean;
  getRootNode(options?: {composed: boolean, ...}): Node;
  hasChildNodes(): boolean;
  insertBefore<T: Node>(newChild: T, refChild?: ?Node): T;
  isDefaultNamespace(namespaceURI: string): boolean;
  isEqualNode(arg: Node): boolean;
  isSameNode(other: Node): boolean;
  lookupNamespaceURI(prefix: string): string;
  lookupPrefix(namespaceURI: string): string;
  normalize(): void;
  removeChild<T: Node>(oldChild: T): T;
  replaceChild<T: Node>(newChild: Node, oldChild: T): T;
  replaceChildren(...nodes: $ReadOnlyArray<Node | string>): void;
  static ATTRIBUTE_NODE: number;
  static CDATA_SECTION_NODE: number;
  static COMMENT_NODE: number;
  static DOCUMENT_FRAGMENT_NODE: number;
  static DOCUMENT_NODE: number;
  static DOCUMENT_POSITION_CONTAINED_BY: number;
  static DOCUMENT_POSITION_CONTAINS: number;
  static DOCUMENT_POSITION_DISCONNECTED: number;
  static DOCUMENT_POSITION_FOLLOWING: number;
  static DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC: number;
  static DOCUMENT_POSITION_PRECEDING: number;
  static DOCUMENT_TYPE_NODE: number;
  static ELEMENT_NODE: number;
  static ENTITY_NODE: number;
  static ENTITY_REFERENCE_NODE: number;
  static NOTATION_NODE: number;
  static PROCESSING_INSTRUCTION_NODE: number;
  static TEXT_NODE: number;

  // Non-standard
  innerText?: string;
  outerText?: string;
}

declare class NodeList<T> {
  @@iterator(): Iterator<T>;
  length: number;
  item(index: number): T;
  [index: number]: T;

  forEach<This>(
    callbackfn: (this: This, value: T, index: number, list: NodeList<T>) => any,
    thisArg: This
  ): void;
  entries(): Iterator<[number, T]>;
  keys(): Iterator<number>;
  values(): Iterator<T>;
}

declare class NamedNodeMap {
  @@iterator(): Iterator<Attr>;
  length: number;
  removeNamedItemNS(namespaceURI: string, localName: string): Attr;
  item(index: number): Attr;
  [index: number | string]: Attr;
  removeNamedItem(name: string): Attr;
  getNamedItem(name: string): Attr;
  setNamedItem(arg: Attr): Attr;
  getNamedItemNS(namespaceURI: string, localName: string): Attr;
  setNamedItemNS(arg: Attr): Attr;
}

declare class Attr extends Node {
  isId: boolean;
  specified: boolean;
  ownerElement: Element | null;
  value: string;
  name: string;
  namespaceURI: string | null;
  prefix: string | null;
  localName: string;
}

declare class HTMLCollection<+Elem: Element> {
  @@iterator(): Iterator<Elem>;
  length: number;
  item(nameOrIndex?: any, optionalIndex?: any): Elem | null;
  namedItem(name: string): Elem | null;
  // $FlowFixMe[incompatible-variance]
  [index: number | string]: Elem;
}

// from https://www.w3.org/TR/custom-elements/#extensions-to-document-interface-to-register
// See also https://github.com/w3c/webcomponents/
type ElementRegistrationOptions = {
  +prototype?: {
    // from https://www.w3.org/TR/custom-elements/#types-of-callbacks
    // See also https://github.com/w3c/webcomponents/
    +createdCallback?: () => mixed,
    +attachedCallback?: () => mixed,
    +detachedCallback?: () => mixed,
    +attributeChangedCallback?: ((
      // attribute is set
      attributeLocalName: string,
      oldAttributeValue: null,
      newAttributeValue: string,
      attributeNamespace: string
    ) => mixed) &
      // attribute is changed
      ((
        attributeLocalName: string,
        oldAttributeValue: string,
        newAttributeValue: string,
        attributeNamespace: string
      ) => mixed) &
      // attribute is removed
      ((
        attributeLocalName: string,
        oldAttributeValue: string,
        newAttributeValue: null,
        attributeNamespace: string
      ) => mixed),
    ...
  },
  +extends?: string,
  ...
};

type ElementCreationOptions = {is: string, ...};

declare class MutationRecord {
  type: 'attributes' | 'characterData' | 'childList';
  target: Node;
  addedNodes: NodeList<Node>;
  removedNodes: NodeList<Node>;
  previousSibling: ?Node;
  nextSibling: ?Node;
  attributeName: ?string;
  attributeNamespace: ?string;
  oldValue: ?string;
}

type MutationObserverInitRequired =
  | {childList: true, ...}
  | {attributes: true, ...}
  | {characterData: true, ...};

declare type MutationObserverInit = MutationObserverInitRequired & {
  subtree?: boolean,
  attributeOldValue?: boolean,
  characterDataOldValue?: boolean,
  attributeFilter?: Array<string>,
  ...
};

declare class MutationObserver {
  constructor(
    callback: (arr: Array<MutationRecord>, observer: MutationObserver) => mixed
  ): void;
  observe(target: Node, options: MutationObserverInit): void;
  takeRecords(): Array<MutationRecord>;
  disconnect(): void;
}

declare class Document extends Node {
  +timeline: DocumentTimeline;
  getAnimations(): Array<Animation>;
  +URL: string;
  adoptNode<T: Node>(source: T): T;
  anchors: HTMLCollection<HTMLAnchorElement>;
  applets: HTMLCollection<HTMLAppletElement>;
  body: HTMLBodyElement | null;
  +characterSet: string;
  /**
   * Legacy alias of `characterSet`
   * @deprecated
   */
  +charset: string;
  close(): void;
  +contentType: string;
  cookie: string;
  createAttribute(name: string): Attr;
  createAttributeNS(namespaceURI: string | null, qualifiedName: string): Attr;
  createCDATASection(data: string): Text;
  createComment(data: string): Comment;
  createDocumentFragment(): DocumentFragment;
  createElement<TName: $Keys<HTMLElementTagNameMap>>(
    localName: TName,
    options?: string | ElementCreationOptions
  ): HTMLElementTagNameMap[TName];
  createElementNS<TName: $Keys<HTMLElementTagNameMap>>(
    namespaceURI: 'http://www.w3.org/1999/xhtml',
    qualifiedName: TName,
    options?: string | ElementCreationOptions
  ): HTMLElementTagNameMap[TName];
  createElementNS(
    namespaceURI: string | null,
    qualifiedName: string,
    options?: string | ElementCreationOptions
  ): Element;
  createTextNode(data: string): Text;
  currentScript: HTMLScriptElement | null;
  dir: 'rtl' | 'ltr';
  +doctype: DocumentType | null;
  +documentElement: HTMLElement | null;
  documentMode: number;
  +documentURI: string;
  domain: string | null;
  embeds: HTMLCollection<HTMLEmbedElement>;
  exitFullscreen(): Promise<void>;
  queryCommandSupported(cmdID: string): boolean;
  execCommand(cmdID: string, showUI?: boolean, value?: any): boolean;
  forms: HTMLCollection<HTMLFormElement>;
  fullscreenElement: Element | null;
  fullscreenEnabled: boolean;
  getElementsByClassName(classNames: string): HTMLCollection<HTMLElement>;
  getElementsByName(elementName: string): HTMLCollection<HTMLElement>;
  getElementsByTagName<TName: $Keys<HTMLElementTagNameMap>>(
    qualifiedName: TName
  ): HTMLCollection<HTMLElementTagNameMap[TName]>;
  getElementsByTagNameNS<TName: $Keys<HTMLElementTagNameMap>>(
    namespaceURI: 'http://www.w3.org/1999/xhtml',
    qualifiedName: TName
  ): HTMLCollection<HTMLElementTagNameMap[TName]>;
  getElementsByTagNameNS(
    namespaceURI: string | null,
    qualifiedName: string
  ): HTMLCollection<Element>;
  head: HTMLHeadElement | null;
  images: HTMLCollection<HTMLImageElement>;
  +implementation: DOMImplementation;
  importNode<T: Node>(importedNode: T, deep: boolean): T;
  /**
   * Legacy alias of `characterSet`
   * @deprecated
   */
  +inputEncoding: string;
  lastModified: string;
  links: HTMLCollection<HTMLLinkElement>;
  media: string;
  open(url?: string, name?: string, features?: string, replace?: boolean): any;
  /** @see {@link https://developer.mozilla.org/en-US/docs/Web/API/Document/prerendering} */
  prerendering: boolean;
  readyState: string;
  referrer: string;
  scripts: HTMLCollection<HTMLScriptElement>;
  scrollingElement: HTMLElement | null;
  title: string;
  visibilityState: 'visible' | 'hidden' | 'prerender' | 'unloaded';
  write(...content: Array<string | TrustedHTML>): void;
  writeln(...content: Array<string | TrustedHTML>): void;
  xmlEncoding: string;
  xmlStandalone: boolean;
  xmlVersion: string;

  registerElement(type: string, options?: ElementRegistrationOptions): any;
  getSelection(): Selection | null;

  // 6.4.6 Focus management APIs
  activeElement: HTMLElement | null;
  hasFocus(): boolean;

  // extension
  location: Location;
  createEvent(eventInterface: 'CustomEvent'): CustomEvent;
  createEvent(eventInterface: string): Event;
  createRange(): Range;
  elementFromPoint(x: number, y: number): HTMLElement | null;
  elementsFromPoint(x: number, y: number): Array<HTMLElement>;
  defaultView: any;
  +compatMode: 'BackCompat' | 'CSS1Compat';
  hidden: boolean;

  // Pointer Lock specification
  exitPointerLock(): void;
  pointerLockElement: Element | null;

  // from ParentNode interface
  childElementCount: number;
  children: HTMLCollection<HTMLElement>;
  firstElementChild: ?Element;
  lastElementChild: ?Element;
  append(...nodes: Array<string | Node>): void;
  prepend(...nodes: Array<string | Node>): void;

  querySelector<TSelector: $Keys<HTMLElementTagNameMap>>(
    selector: TSelector
  ): HTMLElementTagNameMap[TSelector] | null;
  querySelectorAll<TSelector: $Keys<HTMLElementTagNameMap>>(
    selector: TSelector
  ): NodeList<HTMLElementTagNameMap[TSelector]>;
  // Interface DocumentTraversal
  // http://www.w3.org/TR/2000/REC-DOM-Level-2-Traversal-Range-20001113/traversal.html#Traversal-Document

  // Not all combinations of RootNodeT and whatToShow are logically possible.
  // The bitmasks NodeFilter.SHOW_CDATA_SECTION,
  // NodeFilter.SHOW_ENTITY_REFERENCE, NodeFilter.SHOW_ENTITY, and
  // NodeFilter.SHOW_NOTATION are deprecated and do not correspond to types
  // that Flow knows about.

  // NodeFilter.SHOW_ATTRIBUTE is also deprecated, but corresponds to the
  // type Attr. While there is no reason to prefer it to Node.attributes,
  // it does have meaning and can be typed: When (whatToShow &
  // NodeFilter.SHOW_ATTRIBUTE === 1), RootNodeT must be Attr, and when
  // RootNodeT is Attr, bitmasks other than NodeFilter.SHOW_ATTRIBUTE are
  // meaningless.
  createNodeIterator<RootNodeT: Attr>(
    root: RootNodeT,
    whatToShow: 2,
    filter?: NodeFilterInterface
  ): NodeIterator<RootNodeT, Attr>;
  createTreeWalker<RootNodeT: Attr>(
    root: RootNodeT,
    whatToShow: 2,
    filter?: NodeFilterInterface,
    entityReferenceExpansion?: boolean
  ): TreeWalker<RootNodeT, Attr>;

  // NodeFilter.SHOW_PROCESSING_INSTRUCTION is not implemented because Flow
  // does not currently define a ProcessingInstruction class.

  // When (whatToShow & NodeFilter.SHOW_DOCUMENT === 1 || whatToShow &
  // NodeFilter.SHOW_DOCUMENT_TYPE === 1), RootNodeT must be Document.
  createNodeIterator<RootNodeT: Document>(
    root: RootNodeT,
    whatToShow: 256,
    filter?: NodeFilterInterface
  ): NodeIterator<RootNodeT, Document>;
  createNodeIterator<RootNodeT: Document>(
    root: RootNodeT,
    whatToShow: 257,
    filter?: NodeFilterInterface
  ): NodeIterator<RootNodeT, Document | Element>;
  createNodeIterator<RootNodeT: Document>(
    root: RootNodeT,
    whatToShow: 260,
    filter?: NodeFilterInterface
  ): NodeIterator<RootNodeT, Document | Text>;
  createNodeIterator<RootNodeT: Document>(
    root: RootNodeT,
    whatToShow: 261,
    filter?: NodeFilterInterface
  ): NodeIterator<RootNodeT, Document | Element | Text>;
  createNodeIterator<RootNodeT: Document>(
    root: RootNodeT,
    whatToShow: 384,
    filter?: NodeFilterInterface
  ): NodeIterator<RootNodeT, Document | Comment>;
  createNodeIterator<RootNodeT: Document>(
    root: RootNodeT,
    whatToShow: 385,
    filter?: NodeFilterInterface
  ): NodeIterator<RootNodeT, Document | Element | Comment>;
  createNodeIterator<RootNodeT: Document>(
    root: RootNodeT,
    whatToShow: 388,
    filter?: NodeFilterInterface
  ): NodeIterator<RootNodeT, Document | Text | Comment>;
  createNodeIterator<RootNodeT: Document>(
    root: RootNodeT,
    whatToShow: 389,
    filter?: NodeFilterInterface
  ): NodeIterator<RootNodeT, Document | Element | Text | Comment>;
  createNodeIterator<RootNodeT: Document>(
    root: RootNodeT,
    whatToShow: 512,
    filter?: NodeFilterInterface
  ): NodeIterator<RootNodeT, DocumentType>;
  createNodeIterator<RootNodeT: Document>(
    root: RootNodeT,
    whatToShow: 513,
    filter?: NodeFilterInterface
  ): NodeIterator<RootNodeT, DocumentType | Element>;
  createNodeIterator<RootNodeT: Document>(
    root: RootNodeT,
    whatToShow: 516,
    filter?: NodeFilterInterface
  ): NodeIterator<RootNodeT, DocumentType | Text>;
  createNodeIterator<RootNodeT: Document>(
    root: RootNodeT,
    whatToShow: 517,
    filter?: NodeFilterInterface
  ): NodeIterator<RootNodeT, DocumentType | Element | Text>;
  createNodeIterator<RootNodeT: Document>(
    root: RootNodeT,
    whatToShow: 640,
    filter?: NodeFilterInterface
  ): NodeIterator<RootNodeT, DocumentType | Comment>;
  createNodeIterator<RootNodeT: Document>(
    root: RootNodeT,
    whatToShow: 641,
    filter?: NodeFilterInterface
  ): NodeIterator<RootNodeT, DocumentType | Element | Comment>;
  createNodeIterator<RootNodeT: Document>(
    root: RootNodeT,
    whatToShow: 644,
    filter?: NodeFilterInterface
  ): NodeIterator<RootNodeT, DocumentType | Text | Comment>;
  createNodeIterator<RootNodeT: Document>(
    root: RootNodeT,
    whatToShow: 645,
    filter?: NodeFilterInterface
  ): NodeIterator<RootNodeT, DocumentType | Element | Text | Comment>;
  createNodeIterator<RootNodeT: Document>(
    root: RootNodeT,
    whatToShow: 768,
    filter?: NodeFilterInterface
  ): NodeIterator<RootNodeT, DocumentType | Document>;
  createNodeIterator<RootNodeT: Document>(
    root: RootNodeT,
    whatToShow: 769,
    filter?: NodeFilterInterface
  ): NodeIterator<RootNodeT, DocumentType | Document | Element>;
  createNodeIterator<RootNodeT: Document>(
    root: RootNodeT,
    whatToShow: 772,
    filter?: NodeFilterInterface
  ): NodeIterator<RootNodeT, DocumentType | Document | Text>;
  createNodeIterator<RootNodeT: Document>(
    root: RootNodeT,
    whatToShow: 773,
    filter?: NodeFilterInterface
  ): NodeIterator<RootNodeT, DocumentType | Document | Element | Text>;
  createNodeIterator<RootNodeT: Document>(
    root: RootNodeT,
    whatToShow: 896,
    filter?: NodeFilterInterface
  ): NodeIterator<RootNodeT, DocumentType | Document | Comment>;
  createNodeIterator<RootNodeT: Document>(
    root: RootNodeT,
    whatToShow: 897,
    filter?: NodeFilterInterface
  ): NodeIterator<RootNodeT, DocumentType | Document | Element | Comment>;
  createNodeIterator<RootNodeT: Document>(
    root: RootNodeT,
    whatToShow: 900,
    filter?: NodeFilterInterface
  ): NodeIterator<RootNodeT, DocumentType | Document | Text | Comment>;
  createNodeIterator<RootNodeT: Document>(
    root: RootNodeT,
    whatToShow: 901,
    filter?: NodeFilterInterface
  ): NodeIterator<
    RootNodeT,
    DocumentType | Document | Element | Text | Comment,
  >;
  createTreeWalker<RootNodeT: Document>(
    root: RootNodeT,
    whatToShow: 256,
    filter?: NodeFilterInterface,
    entityReferenceExpansion?: boolean
  ): TreeWalker<RootNodeT, Document>;
  createTreeWalker<RootNodeT: Document>(
    root: RootNodeT,
    whatToShow: 257,
    filter?: NodeFilterInterface,
    entityReferenceExpansion?: boolean
  ): TreeWalker<RootNodeT, Document | Element>;
  createTreeWalker<RootNodeT: Document>(
    root: RootNodeT,
    whatToShow: 260,
    filter?: NodeFilterInterface,
    entityReferenceExpansion?: boolean
  ): TreeWalker<RootNodeT, Document | Text>;
  createTreeWalker<RootNodeT: Document>(
    root: RootNodeT,
    whatToShow: 261,
    filter?: NodeFilterInterface,
    entityReferenceExpansion?: boolean
  ): TreeWalker<RootNodeT, Document | Element | Text>;
  createTreeWalker<RootNodeT: Document>(
    root: RootNodeT,
    whatToShow: 384,
    filter?: NodeFilterInterface,
    entityReferenceExpansion?: boolean
  ): TreeWalker<RootNodeT, Document | Comment>;
  createTreeWalker<RootNodeT: Document>(
    root: RootNodeT,
    whatToShow: 385,
    filter?: NodeFilterInterface,
    entityReferenceExpansion?: boolean
  ): TreeWalker<RootNodeT, Document | Element | Comment>;
  createTreeWalker<RootNodeT: Document>(
    root: RootNodeT,
    whatToShow: 388,
    filter?: NodeFilterInterface,
    entityReferenceExpansion?: boolean
  ): TreeWalker<RootNodeT, Document | Text | Comment>;
  createTreeWalker<RootNodeT: Document>(
    root: RootNodeT,
    whatToShow: 389,
    filter?: NodeFilterInterface,
    entityReferenceExpansion?: boolean
  ): TreeWalker<RootNodeT, Document | Element | Text | Comment>;
  createTreeWalker<RootNodeT: Document>(
    root: RootNodeT,
    whatToShow: 512,
    filter?: NodeFilterInterface,
    entityReferenceExpansion?: boolean
  ): TreeWalker<RootNodeT, DocumentType>;
  createTreeWalker<RootNodeT: Document>(
    root: RootNodeT,
    whatToShow: 513,
    filter?: NodeFilterInterface,
    entityReferenceExpansion?: boolean
  ): TreeWalker<RootNodeT, DocumentType | Element>;
  createTreeWalker<RootNodeT: Document>(
    root: RootNodeT,
    whatToShow: 516,
    filter?: NodeFilterInterface,
    entityReferenceExpansion?: boolean
  ): TreeWalker<RootNodeT, DocumentType | Text>;
  createTreeWalker<RootNodeT: Document>(
    root: RootNodeT,
    whatToShow: 517,
    filter?: NodeFilterInterface,
    entityReferenceExpansion?: boolean
  ): TreeWalker<RootNodeT, DocumentType | Element | Text>;
  createTreeWalker<RootNodeT: Document>(
    root: RootNodeT,
    whatToShow: 640,
    filter?: NodeFilterInterface,
    entityReferenceExpansion?: boolean
  ): TreeWalker<RootNodeT, DocumentType | Comment>;
  createTreeWalker<RootNodeT: Document>(
    root: RootNodeT,
    whatToShow: 641,
    filter?: NodeFilterInterface,
    entityReferenceExpansion?: boolean
  ): TreeWalker<RootNodeT, DocumentType | Element | Comment>;
  createTreeWalker<RootNodeT: Document>(
    root: RootNodeT,
    whatToShow: 644,
    filter?: NodeFilterInterface,
    entityReferenceExpansion?: boolean
  ): TreeWalker<RootNodeT, DocumentType | Text | Comment>;
  createTreeWalker<RootNodeT: Document>(
    root: RootNodeT,
    whatToShow: 645,
    filter?: NodeFilterInterface,
    entityReferenceExpansion?: boolean
  ): TreeWalker<RootNodeT, DocumentType | Element | Text | Comment>;
  createTreeWalker<RootNodeT: Document>(
    root: RootNodeT,
    whatToShow: 768,
    filter?: NodeFilterInterface,
    entityReferenceExpansion?: boolean
  ): TreeWalker<RootNodeT, DocumentType | Document>;
  createTreeWalker<RootNodeT: Document>(
    root: RootNodeT,
    whatToShow: 769,
    filter?: NodeFilterInterface,
    entityReferenceExpansion?: boolean
  ): TreeWalker<RootNodeT, DocumentType | Document | Element>;
  createTreeWalker<RootNodeT: Document>(
    root: RootNodeT,
    whatToShow: 772,
    filter?: NodeFilterInterface,
    entityReferenceExpansion?: boolean
  ): TreeWalker<RootNodeT, DocumentType | Document | Text>;
  createTreeWalker<RootNodeT: Document>(
    root: RootNodeT,
    whatToShow: 773,
    filter?: NodeFilterInterface,
    entityReferenceExpansion?: boolean
  ): TreeWalker<RootNodeT, DocumentType | Document | Element | Text>;
  createTreeWalker<RootNodeT: Document>(
    root: RootNodeT,
    whatToShow: 896,
    filter?: NodeFilterInterface,
    entityReferenceExpansion?: boolean
  ): TreeWalker<RootNodeT, DocumentType | Document | Comment>;
  createTreeWalker<RootNodeT: Document>(
    root: RootNodeT,
    whatToShow: 897,
    filter?: NodeFilterInterface,
    entityReferenceExpansion?: boolean
  ): TreeWalker<RootNodeT, DocumentType | Document | Element | Comment>;
  createTreeWalker<RootNodeT: Document>(
    root: RootNodeT,
    whatToShow: 900,
    filter?: NodeFilterInterface,
    entityReferenceExpansion?: boolean
  ): TreeWalker<RootNodeT, DocumentType | Document | Text | Comment>;
  createTreeWalker<RootNodeT: Document>(
    root: RootNodeT,
    whatToShow: 901,
    filter?: NodeFilterInterface,
    entityReferenceExpansion?: boolean
  ): TreeWalker<RootNodeT, DocumentType | Document | Element | Text | Comment>;

  // When (whatToShow & NodeFilter.SHOW_DOCUMENT_FRAGMENT === 1), RootNodeT
  // must be a DocumentFragment.
  createNodeIterator<RootNodeT: DocumentFragment>(
    root: RootNodeT,
    whatToShow: 1024,
    filter?: NodeFilterInterface
  ): NodeIterator<RootNodeT, DocumentFragment>;
  createNodeIterator<RootNodeT: DocumentFragment>(
    root: RootNodeT,
    whatToShow: 1025,
    filter?: NodeFilterInterface
  ): NodeIterator<RootNodeT, DocumentFragment | Element>;
  createNodeIterator<RootNodeT: DocumentFragment>(
    root: RootNodeT,
    whatToShow: 1028,
    filter?: NodeFilterInterface
  ): NodeIterator<RootNodeT, DocumentFragment | Text>;
  createNodeIterator<RootNodeT: DocumentFragment>(
    root: RootNodeT,
    whatToShow: 1029,
    filter?: NodeFilterInterface
  ): NodeIterator<RootNodeT, DocumentFragment | Element | Text>;
  createNodeIterator<RootNodeT: DocumentFragment>(
    root: RootNodeT,
    whatToShow: 1152,
    filter?: NodeFilterInterface
  ): NodeIterator<RootNodeT, DocumentFragment | Comment>;
  createNodeIterator<RootNodeT: DocumentFragment>(
    root: RootNodeT,
    whatToShow: 1153,
    filter?: NodeFilterInterface
  ): NodeIterator<RootNodeT, DocumentFragment | Element | Comment>;
  createNodeIterator<RootNodeT: DocumentFragment>(
    root: RootNodeT,
    whatToShow: 1156,
    filter?: NodeFilterInterface
  ): NodeIterator<RootNodeT, DocumentFragment | Text | Comment>;
  createNodeIterator<RootNodeT: DocumentFragment>(
    root: RootNodeT,
    whatToShow: 1157,
    filter?: NodeFilterInterface
  ): NodeIterator<RootNodeT, DocumentFragment | Element | Text | Comment>;
  createTreeWalker<RootNodeT: DocumentFragment>(
    root: RootNodeT,
    whatToShow: 1024,
    filter?: NodeFilterInterface,
    entityReferenceExpansion?: boolean
  ): TreeWalker<RootNodeT, DocumentFragment>;
  createTreeWalker<RootNodeT: DocumentFragment>(
    root: RootNodeT,
    whatToShow: 1025,
    filter?: NodeFilterInterface,
    entityReferenceExpansion?: boolean
  ): TreeWalker<RootNodeT, DocumentFragment | Element>;
  createTreeWalker<RootNodeT: DocumentFragment>(
    root: RootNodeT,
    whatToShow: 1028,
    filter?: NodeFilterInterface,
    entityReferenceExpansion?: boolean
  ): TreeWalker<RootNodeT, DocumentFragment | Text>;
  createTreeWalker<RootNodeT: DocumentFragment>(
    root: RootNodeT,
    whatToShow: 1029,
    filter?: NodeFilterInterface,
    entityReferenceExpansion?: boolean
  ): TreeWalker<RootNodeT, DocumentFragment | Element | Text>;
  createTreeWalker<RootNodeT: DocumentFragment>(
    root: RootNodeT,
    whatToShow: 1152,
    filter?: NodeFilterInterface,
    entityReferenceExpansion?: boolean
  ): TreeWalker<RootNodeT, DocumentFragment | Comment>;
  createTreeWalker<RootNodeT: DocumentFragment>(
    root: RootNodeT,
    whatToShow: 1153,
    filter?: NodeFilterInterface,
    entityReferenceExpansion?: boolean
  ): TreeWalker<RootNodeT, DocumentFragment | Element | Comment>;
  createTreeWalker<RootNodeT: DocumentFragment>(
    root: RootNodeT,
    whatToShow: 1156,
    filter?: NodeFilterInterface,
    entityReferenceExpansion?: boolean
  ): TreeWalker<RootNodeT, DocumentFragment | Text | Comment>;
  createTreeWalker<RootNodeT: DocumentFragment>(
    root: RootNodeT,
    whatToShow: 1157,
    filter?: NodeFilterInterface,
    entityReferenceExpansion?: boolean
  ): TreeWalker<RootNodeT, DocumentFragment | Element | Text | Comment>;

  // In the general case, RootNodeT may be any Node and whatToShow may be
  // NodeFilter.SHOW_ALL or any combination of NodeFilter.SHOW_ELEMENT,
  // NodeFilter.SHOW_TEXT and/or NodeFilter.SHOW_COMMENT
  createNodeIterator<RootNodeT: Node>(
    root: RootNodeT,
    whatToShow: 1,
    filter?: NodeFilterInterface
  ): NodeIterator<RootNodeT, Element>;
  createNodeIterator<RootNodeT: Node>(
    root: RootNodeT,
    whatToShow: 4,
    filter?: NodeFilterInterface
  ): NodeIterator<RootNodeT, Text>;
  createNodeIterator<RootNodeT: Node>(
    root: RootNodeT,
    whatToShow: 5,
    filter?: NodeFilterInterface
  ): NodeIterator<RootNodeT, Element | Text>;
  createNodeIterator<RootNodeT: Node>(
    root: RootNodeT,
    whatToShow: 128,
    filter?: NodeFilterInterface
  ): NodeIterator<RootNodeT, Comment>;
  createNodeIterator<RootNodeT: Node>(
    root: RootNodeT,
    whatToShow: 129,
    filter?: NodeFilterInterface
  ): NodeIterator<RootNodeT, Element | Comment>;
  createNodeIterator<RootNodeT: Node>(
    root: RootNodeT,
    whatToShow: 132,
    filter?: NodeFilterInterface
  ): NodeIterator<RootNodeT, Text | Comment>;
  createNodeIterator<RootNodeT: Node>(
    root: RootNodeT,
    whatToShow: 133,
    filter?: NodeFilterInterface
  ): NodeIterator<RootNodeT, Text | Element | Comment>;
  createTreeWalker<RootNodeT: Node>(
    root: RootNodeT,
    whatToShow: 1,
    filter?: NodeFilterInterface,
    entityReferenceExpansion?: boolean
  ): TreeWalker<RootNodeT, Element>;
  createTreeWalker<RootNodeT: Node>(
    root: RootNodeT,
    whatToShow: 4,
    filter?: NodeFilterInterface,
    entityReferenceExpansion?: boolean
  ): TreeWalker<RootNodeT, Text>;
  createTreeWalker<RootNodeT: Node>(
    root: RootNodeT,
    whatToShow: 5,
    filter?: NodeFilterInterface,
    entityReferenceExpansion?: boolean
  ): TreeWalker<RootNodeT, Element | Text>;
  createTreeWalker<RootNodeT: Node>(
    root: RootNodeT,
    whatToShow: 128,
    filter?: NodeFilterInterface,
    entityReferenceExpansion?: boolean
  ): TreeWalker<RootNodeT, Comment>;
  createTreeWalker<RootNodeT: Node>(
    root: RootNodeT,
    whatToShow: 129,
    filter?: NodeFilterInterface,
    entityReferenceExpansion?: boolean
  ): TreeWalker<RootNodeT, Element | Comment>;
  createTreeWalker<RootNodeT: Node>(
    root: RootNodeT,
    whatToShow: 132,
    filter?: NodeFilterInterface,
    entityReferenceExpansion?: boolean
  ): TreeWalker<RootNodeT, Text | Comment>;
  createTreeWalker<RootNodeT: Node>(
    root: RootNodeT,
    whatToShow: 133,
    filter?: NodeFilterInterface,
    entityReferenceExpansion?: boolean
  ): TreeWalker<RootNodeT, Text | Element | Comment>;

  // Catch all for when we don't know the value of `whatToShow`
  // And for when whatToShow is not provided, it is assumed to be SHOW_ALL
  createNodeIterator<RootNodeT: Node>(
    root: RootNodeT,
    whatToShow?: number,
    filter?: NodeFilterInterface
  ): NodeIterator<RootNodeT, Node>;
  createTreeWalker<RootNodeT: Node>(
    root: RootNodeT,
    whatToShow?: number,
    filter?: NodeFilterInterface,
    entityReferenceExpansion?: boolean
  ): TreeWalker<RootNodeT, Node>;

  // From NonElementParentNode Mixin.
  getElementById(elementId: string): HTMLElement | null;

  // From DocumentOrShadowRoot Mixin.
  +styleSheets: StyleSheetList;
  adoptedStyleSheets: Array<CSSStyleSheet>;
}

declare class DocumentFragment extends Node {
  // from ParentNode interface
  childElementCount: number;
  children: HTMLCollection<HTMLElement>;
  firstElementChild: ?Element;
  lastElementChild: ?Element;
  append(...nodes: Array<string | Node>): void;
  prepend(...nodes: Array<string | Node>): void;

  querySelector(selector: string): HTMLElement | null;
  querySelectorAll(selector: string): NodeList<HTMLElement>;

  // From NonElementParentNode Mixin.
  getElementById(elementId: string): HTMLElement | null;
}

declare class Selection {
  anchorNode: Node | null;
  anchorOffset: number;
  focusNode: Node | null;
  focusOffset: number;
  isCollapsed: boolean;
  rangeCount: number;
  type: string;
  addRange(range: Range): void;
  getRangeAt(index: number): Range;
  removeRange(range: Range): void;
  removeAllRanges(): void;
  collapse(parentNode: Node | null, offset?: number): void;
  collapseToStart(): void;
  collapseToEnd(): void;
  containsNode(aNode: Node, aPartlyContained?: boolean): boolean;
  deleteFromDocument(): void;
  extend(parentNode: Node, offset?: number): void;
  empty(): void;
  selectAllChildren(parentNode: Node): void;
  setPosition(aNode: Node | null, offset?: number): void;
  setBaseAndExtent(
    anchorNode: Node,
    anchorOffset: number,
    focusNode: Node,
    focusOffset: number
  ): void;
  toString(): string;
}

declare class Range {
  // extension
  startOffset: number;
  collapsed: boolean;
  endOffset: number;
  startContainer: Node;
  endContainer: Node;
  commonAncestorContainer: Node;
  setStart(refNode: Node, offset: number): void;
  setEndBefore(refNode: Node): void;
  setStartBefore(refNode: Node): void;
  selectNode(refNode: Node): void;
  detach(): void;
  getBoundingClientRect(): DOMRect;
  toString(): string;
  compareBoundaryPoints(how: number, sourceRange: Range): number;
  insertNode(newNode: Node): void;
  collapse(toStart: boolean): void;
  selectNodeContents(refNode: Node): void;
  cloneContents(): DocumentFragment;
  setEnd(refNode: Node, offset: number): void;
  cloneRange(): Range;
  getClientRects(): DOMRectList;
  surroundContents(newParent: Node): void;
  deleteContents(): void;
  setStartAfter(refNode: Node): void;
  extractContents(): DocumentFragment;
  setEndAfter(refNode: Node): void;
  createContextualFragment(fragment: string | TrustedHTML): DocumentFragment;
  intersectsNode(refNode: Node): boolean;
  isPointInRange(refNode: Node, offset: number): boolean;
  static END_TO_END: number;
  static START_TO_START: number;
  static START_TO_END: number;
  static END_TO_START: number;
}

declare var document: Document;

declare class DOMTokenList {
  @@iterator(): Iterator<string>;
  length: number;
  item(index: number): string;
  contains(token: string): boolean;
  add(...token: Array<string>): void;
  remove(...token: Array<string>): void;
  toggle(token: string, force?: boolean): boolean;
  replace(oldToken: string, newToken: string): boolean;

  forEach(
    callbackfn: (value: string, index: number, list: DOMTokenList) => any,
    thisArg?: any
  ): void;
  entries(): Iterator<[number, string]>;
  keys(): Iterator<number>;
  values(): Iterator<string>;
  [index: number]: string;
}

declare class Element extends Node mixins mixin$Animatable {
  assignedSlot: ?HTMLSlotElement;
  attachShadow(shadowRootInitDict: ShadowRootInit): ShadowRoot;
  attributes: NamedNodeMap;
  classList: DOMTokenList;
  className: string;
  clientHeight: number;
  clientLeft: number;
  clientTop: number;
  clientWidth: number;
  id: string;
  // flowlint unsafe-getters-setters:off
  get innerHTML(): string;
  set innerHTML(value: string | TrustedHTML): void;
  // flowlint unsafe-getters-setters:error
  localName: string;
  namespaceURI: ?string;
  nextElementSibling: ?Element;
  // flowlint unsafe-getters-setters:off
  get outerHTML(): string;
  set outerHTML(value: string | TrustedHTML): void;
  // flowlint unsafe-getters-setters:error
  prefix: string | null;
  previousElementSibling: ?Element;
  scrollHeight: number;
  scrollLeft: number;
  scrollTop: number;
  scrollWidth: number;
  +tagName: string;

  // TODO: a lot more ARIA properties
  ariaHidden: void | 'true' | 'false';

  closest(selectors: string): ?Element;

  getAttribute(name?: string): ?string;
  getAttributeNames(): Array<string>;
  getAttributeNS(namespaceURI: string | null, localName: string): string | null;
  getAttributeNode(name: string): Attr | null;
  getAttributeNodeNS(
    namespaceURI: string | null,
    localName: string
  ): Attr | null;
  getBoundingClientRect(): DOMRect;
  getClientRects(): DOMRectList;
  getElementsByClassName(names: string): HTMLCollection<HTMLElement>;
  getElementsByTagName<TName: $Keys<HTMLElementTagNameMap>>(
    qualifiedName: TName
  ): HTMLCollection<HTMLElementTagNameMap[TName]>;
  getElementsByTagNameNS<TName: $Keys<HTMLElementTagNameMap>>(
    namespaceURI: 'http://www.w3.org/1999/xhtml',
    qualifiedName: TName
  ): HTMLCollection<HTMLElementTagNameMap[TName]>;
  getElementsByTagNameNS(
    namespaceURI: string | null,
    qualifiedName: string
  ): HTMLCollection<Element>;

  hasAttribute(name: string): boolean;
  hasAttributeNS(namespaceURI: string | null, localName: string): boolean;
  hasAttributes(): boolean;
  hasPointerCapture(pointerId: number): boolean;
  insertAdjacentElement(
    position: 'beforebegin' | 'afterbegin' | 'beforeend' | 'afterend',
    element: Element
  ): void;
  insertAdjacentHTML(
    position: 'beforebegin' | 'afterbegin' | 'beforeend' | 'afterend',
    html: string | TrustedHTML
  ): void;
  insertAdjacentText(
    position: 'beforebegin' | 'afterbegin' | 'beforeend' | 'afterend',
    text: string
  ): void;
  matches(selector: string): boolean;
  releasePointerCapture(pointerId: number): void;
  removeAttribute(name?: string): void;
  removeAttributeNode(attributeNode: Attr): Attr;
  removeAttributeNS(namespaceURI: string | null, localName: string): void;
  requestFullscreen(options?: {
    navigationUI: 'auto' | 'show' | 'hide',
    ...
  }): Promise<void>;
  requestPointerLock(): void;
  scrollIntoView(
    arg?:
      | boolean
      | {
          behavior?: 'auto' | 'instant' | 'smooth',
          block?: 'start' | 'center' | 'end' | 'nearest',
          inline?: 'start' | 'center' | 'end' | 'nearest',
          ...
        }
  ): void;
  scroll(x: number, y: number): void;
  scroll(options: ScrollToOptions): void;
  scrollTo(x: number, y: number): void;
  scrollTo(options: ScrollToOptions): void;
  scrollBy(x: number, y: number): void;
  scrollBy(options: ScrollToOptions): void;
  setAttribute(name?: string, value?: string): void;
  toggleAttribute(name?: string, force?: boolean): void;
  setAttributeNS(
    namespaceURI: string | null,
    qualifiedName: string,
    value: string
  ): void;
  setAttributeNode(newAttr: Attr): Attr | null;
  setAttributeNodeNS(newAttr: Attr): Attr | null;
  setPointerCapture(pointerId: number): void;
  shadowRoot?: ShadowRoot;
  slot?: string;

  // from ParentNode interface
  childElementCount: number;
  children: HTMLCollection<HTMLElement>;
  firstElementChild: ?Element;
  lastElementChild: ?Element;
  append(...nodes: Array<string | Node>): void;
  prepend(...nodes: Array<string | Node>): void;

  querySelector<TSelector: $Keys<HTMLElementTagNameMap>>(
    selector: TSelector
  ): HTMLElementTagNameMap[TSelector] | null;
  querySelectorAll<TSelector: $Keys<HTMLElementTagNameMap>>(
    selector: TSelector
  ): NodeList<HTMLElementTagNameMap[TSelector]>;

  // from ChildNode interface
  after(...nodes: Array<string | Node>): void;
  before(...nodes: Array<string | Node>): void;
  replaceWith(...nodes: Array<string | Node>): void;
  remove(): void;
}

declare class HitRegionOptions {
  path?: Path2D;
  fillRule?: CanvasFillRule;
  id?: string;
  parentID?: string;
  cursor?: string;
  control?: Element;
  label: ?string;
  role: ?string;
}

declare class SVGMatrix {
  getComponent(index: number): number;
  mMultiply(secondMatrix: SVGMatrix): SVGMatrix;
  inverse(): SVGMatrix;
  mTranslate(x: number, y: number): SVGMatrix;
  mScale(scaleFactor: number): SVGMatrix;
  mRotate(angle: number): SVGMatrix;
}

// WebGL idl: https://www.khronos.org/registry/webgl/specs/latest/1.0/webgl.idl

type WebGLContextAttributes = {
  alpha: boolean,
  depth: boolean,
  stencil: boolean,
  antialias: boolean,
  premultipliedAlpha: boolean,
  preserveDrawingBuffer: boolean,
  preferLowPowerToHighPerformance: boolean,
  failIfMajorPerformanceCaveat: boolean,
  ...
};

interface WebGLObject {}

interface WebGLBuffer extends WebGLObject {}

interface WebGLFramebuffer extends WebGLObject {}

interface WebGLProgram extends WebGLObject {}

interface WebGLRenderbuffer extends WebGLObject {}

interface WebGLShader extends WebGLObject {}

interface WebGLTexture extends WebGLObject {}

interface WebGLUniformLocation {}

interface WebGLActiveInfo {
  size: number;
  type: number;
  name: string;
}

interface WebGLShaderPrecisionFormat {
  rangeMin: number;
  rangeMax: number;
  precision: number;
}

type BufferDataSource = ArrayBuffer | $ArrayBufferView;

type TexImageSource =
  | ImageBitmap
  | ImageData
  | HTMLImageElement
  | HTMLCanvasElement
  | HTMLVideoElement;

type VertexAttribFVSource = Float32Array | Array<number>;

/* flow */
declare class WebGLRenderingContext {
  static DEPTH_BUFFER_BIT: 0x00000100;
  DEPTH_BUFFER_BIT: 0x00000100;
  static STENCIL_BUFFER_BIT: 0x00000400;
  STENCIL_BUFFER_BIT: 0x00000400;
  static COLOR_BUFFER_BIT: 0x00004000;
  COLOR_BUFFER_BIT: 0x00004000;
  static POINTS: 0x0000;
  POINTS: 0x0000;
  static LINES: 0x0001;
  LINES: 0x0001;
  static LINE_LOOP: 0x0002;
  LINE_LOOP: 0x0002;
  static LINE_STRIP: 0x0003;
  LINE_STRIP: 0x0003;
  static TRIANGLES: 0x0004;
  TRIANGLES: 0x0004;
  static TRIANGLE_STRIP: 0x0005;
  TRIANGLE_STRIP: 0x0005;
  static TRIANGLE_FAN: 0x0006;
  TRIANGLE_FAN: 0x0006;
  static ZERO: 0;
  ZERO: 0;
  static ONE: 1;
  ONE: 1;
  static SRC_COLOR: 0x0300;
  SRC_COLOR: 0x0300;
  static ONE_MINUS_SRC_COLOR: 0x0301;
  ONE_MINUS_SRC_COLOR: 0x0301;
  static SRC_ALPHA: 0x0302;
  SRC_ALPHA: 0x0302;
  static ONE_MINUS_SRC_ALPHA: 0x0303;
  ONE_MINUS_SRC_ALPHA: 0x0303;
  static DST_ALPHA: 0x0304;
  DST_ALPHA: 0x0304;
  static ONE_MINUS_DST_ALPHA: 0x0305;
  ONE_MINUS_DST_ALPHA: 0x0305;
  static DST_COLOR: 0x0306;
  DST_COLOR: 0x0306;
  static ONE_MINUS_DST_COLOR: 0x0307;
  ONE_MINUS_DST_COLOR: 0x0307;
  static SRC_ALPHA_SATURATE: 0x0308;
  SRC_ALPHA_SATURATE: 0x0308;
  static FUNC_ADD: 0x8006;
  FUNC_ADD: 0x8006;
  static BLEND_EQUATION: 0x8009;
  BLEND_EQUATION: 0x8009;
  static BLEND_EQUATION_RGB: 0x8009;
  BLEND_EQUATION_RGB: 0x8009;
  static BLEND_EQUATION_ALPHA: 0x883d;
  BLEND_EQUATION_ALPHA: 0x883d;
  static FUNC_SUBTRACT: 0x800a;
  FUNC_SUBTRACT: 0x800a;
  static FUNC_REVERSE_SUBTRACT: 0x800b;
  FUNC_REVERSE_SUBTRACT: 0x800b;
  static BLEND_DST_RGB: 0x80c8;
  BLEND_DST_RGB: 0x80c8;
  static BLEND_SRC_RGB: 0x80c9;
  BLEND_SRC_RGB: 0x80c9;
  static BLEND_DST_ALPHA: 0x80ca;
  BLEND_DST_ALPHA: 0x80ca;
  static BLEND_SRC_ALPHA: 0x80cb;
  BLEND_SRC_ALPHA: 0x80cb;
  static CONSTANT_COLOR: 0x8001;
  CONSTANT_COLOR: 0x8001;
  static ONE_MINUS_CONSTANT_COLOR: 0x8002;
  ONE_MINUS_CONSTANT_COLOR: 0x8002;
  static CONSTANT_ALPHA: 0x8003;
  CONSTANT_ALPHA: 0x8003;
  static ONE_MINUS_CONSTANT_ALPHA: 0x8004;
  ONE_MINUS_CONSTANT_ALPHA: 0x8004;
  static BLEND_COLOR: 0x8005;
  BLEND_COLOR: 0x8005;
  static ARRAY_BUFFER: 0x8892;
  ARRAY_BUFFER: 0x8892;
  static ELEMENT_ARRAY_BUFFER: 0x8893;
  ELEMENT_ARRAY_BUFFER: 0x8893;
  static ARRAY_BUFFER_BINDING: 0x8894;
  ARRAY_BUFFER_BINDING: 0x8894;
  static ELEMENT_ARRAY_BUFFER_BINDING: 0x8895;
  ELEMENT_ARRAY_BUFFER_BINDING: 0x8895;
  static STREAM_DRAW: 0x88e0;
  STREAM_DRAW: 0x88e0;
  static STATIC_DRAW: 0x88e4;
  STATIC_DRAW: 0x88e4;
  static DYNAMIC_DRAW: 0x88e8;
  DYNAMIC_DRAW: 0x88e8;
  static BUFFER_SIZE: 0x8764;
  BUFFER_SIZE: 0x8764;
  static BUFFER_USAGE: 0x8765;
  BUFFER_USAGE: 0x8765;
  static CURRENT_VERTEX_ATTRIB: 0x8626;
  CURRENT_VERTEX_ATTRIB: 0x8626;
  static FRONT: 0x0404;
  FRONT: 0x0404;
  static BACK: 0x0405;
  BACK: 0x0405;
  static FRONT_AND_BACK: 0x0408;
  FRONT_AND_BACK: 0x0408;
  static CULL_FACE: 0x0b44;
  CULL_FACE: 0x0b44;
  static BLEND: 0x0be2;
  BLEND: 0x0be2;
  static DITHER: 0x0bd0;
  DITHER: 0x0bd0;
  static STENCIL_TEST: 0x0b90;
  STENCIL_TEST: 0x0b90;
  static DEPTH_TEST: 0x0b71;
  DEPTH_TEST: 0x0b71;
  static SCISSOR_TEST: 0x0c11;
  SCISSOR_TEST: 0x0c11;
  static POLYGON_OFFSET_FILL: 0x8037;
  POLYGON_OFFSET_FILL: 0x8037;
  static SAMPLE_ALPHA_TO_COVERAGE: 0x809e;
  SAMPLE_ALPHA_TO_COVERAGE: 0x809e;
  static SAMPLE_COVERAGE: 0x80a0;
  SAMPLE_COVERAGE: 0x80a0;
  static NO_ERROR: 0;
  NO_ERROR: 0;
  static INVALID_ENUM: 0x0500;
  INVALID_ENUM: 0x0500;
  static INVALID_VALUE: 0x0501;
  INVALID_VALUE: 0x0501;
  static INVALID_OPERATION: 0x0502;
  INVALID_OPERATION: 0x0502;
  static OUT_OF_MEMORY: 0x0505;
  OUT_OF_MEMORY: 0x0505;
  static CW: 0x0900;
  CW: 0x0900;
  static CCW: 0x0901;
  CCW: 0x0901;
  static LINE_WIDTH: 0x0b21;
  LINE_WIDTH: 0x0b21;
  static ALIASED_POINT_SIZE_RANGE: 0x846d;
  ALIASED_POINT_SIZE_RANGE: 0x846d;
  static ALIASED_LINE_WIDTH_RANGE: 0x846e;
  ALIASED_LINE_WIDTH_RANGE: 0x846e;
  static CULL_FACE_MODE: 0x0b45;
  CULL_FACE_MODE: 0x0b45;
  static FRONT_FACE: 0x0b46;
  FRONT_FACE: 0x0b46;
  static DEPTH_RANGE: 0x0b70;
  DEPTH_RANGE: 0x0b70;
  static DEPTH_WRITEMASK: 0x0b72;
  DEPTH_WRITEMASK: 0x0b72;
  static DEPTH_CLEAR_VALUE: 0x0b73;
  DEPTH_CLEAR_VALUE: 0x0b73;
  static DEPTH_FUNC: 0x0b74;
  DEPTH_FUNC: 0x0b74;
  static STENCIL_CLEAR_VALUE: 0x0b91;
  STENCIL_CLEAR_VALUE: 0x0b91;
  static STENCIL_FUNC: 0x0b92;
  STENCIL_FUNC: 0x0b92;
  static STENCIL_FAIL: 0x0b94;
  STENCIL_FAIL: 0x0b94;
  static STENCIL_PASS_DEPTH_FAIL: 0x0b95;
  STENCIL_PASS_DEPTH_FAIL: 0x0b95;
  static STENCIL_PASS_DEPTH_PASS: 0x0b96;
  STENCIL_PASS_DEPTH_PASS: 0x0b96;
  static STENCIL_REF: 0x0b97;
  STENCIL_REF: 0x0b97;
  static STENCIL_VALUE_MASK: 0x0b93;
  STENCIL_VALUE_MASK: 0x0b93;
  static STENCIL_WRITEMASK: 0x0b98;
  STENCIL_WRITEMASK: 0x0b98;
  static STENCIL_BACK_FUNC: 0x8800;
  STENCIL_BACK_FUNC: 0x8800;
  static STENCIL_BACK_FAIL: 0x8801;
  STENCIL_BACK_FAIL: 0x8801;
  static STENCIL_BACK_PASS_DEPTH_FAIL: 0x8802;
  STENCIL_BACK_PASS_DEPTH_FAIL: 0x8802;
  static STENCIL_BACK_PASS_DEPTH_PASS: 0x8803;
  STENCIL_BACK_PASS_DEPTH_PASS: 0x8803;
  static STENCIL_BACK_REF: 0x8ca3;
  STENCIL_BACK_REF: 0x8ca3;
  static STENCIL_BACK_VALUE_MASK: 0x8ca4;
  STENCIL_BACK_VALUE_MASK: 0x8ca4;
  static STENCIL_BACK_WRITEMASK: 0x8ca5;
  STENCIL_BACK_WRITEMASK: 0x8ca5;
  static VIEWPORT: 0x0ba2;
  VIEWPORT: 0x0ba2;
  static SCISSOR_BOX: 0x0c10;
  SCISSOR_BOX: 0x0c10;
  static COLOR_CLEAR_VALUE: 0x0c22;
  COLOR_CLEAR_VALUE: 0x0c22;
  static COLOR_WRITEMASK: 0x0c23;
  COLOR_WRITEMASK: 0x0c23;
  static UNPACK_ALIGNMENT: 0x0cf5;
  UNPACK_ALIGNMENT: 0x0cf5;
  static PACK_ALIGNMENT: 0x0d05;
  PACK_ALIGNMENT: 0x0d05;
  static MAX_TEXTURE_SIZE: 0x0d33;
  MAX_TEXTURE_SIZE: 0x0d33;
  static MAX_VIEWPORT_DIMS: 0x0d3a;
  MAX_VIEWPORT_DIMS: 0x0d3a;
  static SUBPIXEL_BITS: 0x0d50;
  SUBPIXEL_BITS: 0x0d50;
  static RED_BITS: 0x0d52;
  RED_BITS: 0x0d52;
  static GREEN_BITS: 0x0d53;
  GREEN_BITS: 0x0d53;
  static BLUE_BITS: 0x0d54;
  BLUE_BITS: 0x0d54;
  static ALPHA_BITS: 0x0d55;
  ALPHA_BITS: 0x0d55;
  static DEPTH_BITS: 0x0d56;
  DEPTH_BITS: 0x0d56;
  static STENCIL_BITS: 0x0d57;
  STENCIL_BITS: 0x0d57;
  static POLYGON_OFFSET_UNITS: 0x2a00;
  POLYGON_OFFSET_UNITS: 0x2a00;
  static POLYGON_OFFSET_FACTOR: 0x8038;
  POLYGON_OFFSET_FACTOR: 0x8038;
  static TEXTURE_BINDING_2D: 0x8069;
  TEXTURE_BINDING_2D: 0x8069;
  static SAMPLE_BUFFERS: 0x80a8;
  SAMPLE_BUFFERS: 0x80a8;
  static SAMPLES: 0x80a9;
  SAMPLES: 0x80a9;
  static SAMPLE_COVERAGE_VALUE: 0x80aa;
  SAMPLE_COVERAGE_VALUE: 0x80aa;
  static SAMPLE_COVERAGE_INVERT: 0x80ab;
  SAMPLE_COVERAGE_INVERT: 0x80ab;
  static COMPRESSED_TEXTURE_FORMATS: 0x86a3;
  COMPRESSED_TEXTURE_FORMATS: 0x86a3;
  static DONT_CARE: 0x1100;
  DONT_CARE: 0x1100;
  static FASTEST: 0x1101;
  FASTEST: 0x1101;
  static NICEST: 0x1102;
  NICEST: 0x1102;
  static GENERATE_MIPMAP_HINT: 0x8192;
  GENERATE_MIPMAP_HINT: 0x8192;
  static BYTE: 0x1400;
  BYTE: 0x1400;
  static UNSIGNED_BYTE: 0x1401;
  UNSIGNED_BYTE: 0x1401;
  static SHORT: 0x1402;
  SHORT: 0x1402;
  static UNSIGNED_SHORT: 0x1403;
  UNSIGNED_SHORT: 0x1403;
  static INT: 0x1404;
  INT: 0x1404;
  static UNSIGNED_INT: 0x1405;
  UNSIGNED_INT: 0x1405;
  static FLOAT: 0x1406;
  FLOAT: 0x1406;
  static DEPTH_COMPONENT: 0x1902;
  DEPTH_COMPONENT: 0x1902;
  static ALPHA: 0x1906;
  ALPHA: 0x1906;
  static RGB: 0x1907;
  RGB: 0x1907;
  static RGBA: 0x1908;
  RGBA: 0x1908;
  static LUMINANCE: 0x1909;
  LUMINANCE: 0x1909;
  static LUMINANCE_ALPHA: 0x190a;
  LUMINANCE_ALPHA: 0x190a;
  static UNSIGNED_SHORT_4_4_4_4: 0x8033;
  UNSIGNED_SHORT_4_4_4_4: 0x8033;
  static UNSIGNED_SHORT_5_5_5_1: 0x8034;
  UNSIGNED_SHORT_5_5_5_1: 0x8034;
  static UNSIGNED_SHORT_5_6_5: 0x8363;
  UNSIGNED_SHORT_5_6_5: 0x8363;
  static FRAGMENT_SHADER: 0x8b30;
  FRAGMENT_SHADER: 0x8b30;
  static VERTEX_SHADER: 0x8b31;
  VERTEX_SHADER: 0x8b31;
  static MAX_VERTEX_ATTRIBS: 0x8869;
  MAX_VERTEX_ATTRIBS: 0x8869;
  static MAX_VERTEX_UNIFORM_VECTORS: 0x8dfb;
  MAX_VERTEX_UNIFORM_VECTORS: 0x8dfb;
  static MAX_VARYING_VECTORS: 0x8dfc;
  MAX_VARYING_VECTORS: 0x8dfc;
  static MAX_COMBINED_TEXTURE_IMAGE_UNITS: 0x8b4d;
  MAX_COMBINED_TEXTURE_IMAGE_UNITS: 0x8b4d;
  static MAX_VERTEX_TEXTURE_IMAGE_UNITS: 0x8b4c;
  MAX_VERTEX_TEXTURE_IMAGE_UNITS: 0x8b4c;
  static MAX_TEXTURE_IMAGE_UNITS: 0x8872;
  MAX_TEXTURE_IMAGE_UNITS: 0x8872;
  static MAX_FRAGMENT_UNIFORM_VECTORS: 0x8dfd;
  MAX_FRAGMENT_UNIFORM_VECTORS: 0x8dfd;
  static SHADER_TYPE: 0x8b4f;
  SHADER_TYPE: 0x8b4f;
  static DELETE_STATUS: 0x8b80;
  DELETE_STATUS: 0x8b80;
  static LINK_STATUS: 0x8b82;
  LINK_STATUS: 0x8b82;
  static VALIDATE_STATUS: 0x8b83;
  VALIDATE_STATUS: 0x8b83;
  static ATTACHED_SHADERS: 0x8b85;
  ATTACHED_SHADERS: 0x8b85;
  static ACTIVE_UNIFORMS: 0x8b86;
  ACTIVE_UNIFORMS: 0x8b86;
  static ACTIVE_ATTRIBUTES: 0x8b89;
  ACTIVE_ATTRIBUTES: 0x8b89;
  static SHADING_LANGUAGE_VERSION: 0x8b8c;
  SHADING_LANGUAGE_VERSION: 0x8b8c;
  static CURRENT_PROGRAM: 0x8b8d;
  CURRENT_PROGRAM: 0x8b8d;
  static NEVER: 0x0200;
  NEVER: 0x0200;
  static LESS: 0x0201;
  LESS: 0x0201;
  static EQUAL: 0x0202;
  EQUAL: 0x0202;
  static LEQUAL: 0x0203;
  LEQUAL: 0x0203;
  static GREATER: 0x0204;
  GREATER: 0x0204;
  static NOTEQUAL: 0x0205;
  NOTEQUAL: 0x0205;
  static GEQUAL: 0x0206;
  GEQUAL: 0x0206;
  static ALWAYS: 0x0207;
  ALWAYS: 0x0207;
  static KEEP: 0x1e00;
  KEEP: 0x1e00;
  static REPLACE: 0x1e01;
  REPLACE: 0x1e01;
  static INCR: 0x1e02;
  INCR: 0x1e02;
  static DECR: 0x1e03;
  DECR: 0x1e03;
  static INVERT: 0x150a;
  INVERT: 0x150a;
  static INCR_WRAP: 0x8507;
  INCR_WRAP: 0x8507;
  static DECR_WRAP: 0x8508;
  DECR_WRAP: 0x8508;
  static VENDOR: 0x1f00;
  VENDOR: 0x1f00;
  static RENDERER: 0x1f01;
  RENDERER: 0x1f01;
  static VERSION: 0x1f02;
  VERSION: 0x1f02;
  static NEAREST: 0x2600;
  NEAREST: 0x2600;
  static LINEAR: 0x2601;
  LINEAR: 0x2601;
  static NEAREST_MIPMAP_NEAREST: 0x2700;
  NEAREST_MIPMAP_NEAREST: 0x2700;
  static LINEAR_MIPMAP_NEAREST: 0x2701;
  LINEAR_MIPMAP_NEAREST: 0x2701;
  static NEAREST_MIPMAP_LINEAR: 0x2702;
  NEAREST_MIPMAP_LINEAR: 0x2702;
  static LINEAR_MIPMAP_LINEAR: 0x2703;
  LINEAR_MIPMAP_LINEAR: 0x2703;
  static TEXTURE_MAG_FILTER: 0x2800;
  TEXTURE_MAG_FILTER: 0x2800;
  static TEXTURE_MIN_FILTER: 0x2801;
  TEXTURE_MIN_FILTER: 0x2801;
  static TEXTURE_WRAP_S: 0x2802;
  TEXTURE_WRAP_S: 0x2802;
  static TEXTURE_WRAP_T: 0x2803;
  TEXTURE_WRAP_T: 0x2803;
  static TEXTURE_2D: 0x0de1;
  TEXTURE_2D: 0x0de1;
  static TEXTURE: 0x1702;
  TEXTURE: 0x1702;
  static TEXTURE_CUBE_MAP: 0x8513;
  TEXTURE_CUBE_MAP: 0x8513;
  static TEXTURE_BINDING_CUBE_MAP: 0x8514;
  TEXTURE_BINDING_CUBE_MAP: 0x8514;
  static TEXTURE_CUBE_MAP_POSITIVE_X: 0x8515;
  TEXTURE_CUBE_MAP_POSITIVE_X: 0x8515;
  static TEXTURE_CUBE_MAP_NEGATIVE_X: 0x8516;
  TEXTURE_CUBE_MAP_NEGATIVE_X: 0x8516;
  static TEXTURE_CUBE_MAP_POSITIVE_Y: 0x8517;
  TEXTURE_CUBE_MAP_POSITIVE_Y: 0x8517;
  static TEXTURE_CUBE_MAP_NEGATIVE_Y: 0x8518;
  TEXTURE_CUBE_MAP_NEGATIVE_Y: 0x8518;
  static TEXTURE_CUBE_MAP_POSITIVE_Z: 0x8519;
  TEXTURE_CUBE_MAP_POSITIVE_Z: 0x8519;
  static TEXTURE_CUBE_MAP_NEGATIVE_Z: 0x851a;
  TEXTURE_CUBE_MAP_NEGATIVE_Z: 0x851a;
  static MAX_CUBE_MAP_TEXTURE_SIZE: 0x851c;
  MAX_CUBE_MAP_TEXTURE_SIZE: 0x851c;
  static TEXTURE0: 0x84c0;
  TEXTURE0: 0x84c0;
  static TEXTURE1: 0x84c1;
  TEXTURE1: 0x84c1;
  static TEXTURE2: 0x84c2;
  TEXTURE2: 0x84c2;
  static TEXTURE3: 0x84c3;
  TEXTURE3: 0x84c3;
  static TEXTURE4: 0x84c4;
  TEXTURE4: 0x84c4;
  static TEXTURE5: 0x84c5;
  TEXTURE5: 0x84c5;
  static TEXTURE6: 0x84c6;
  TEXTURE6: 0x84c6;
  static TEXTURE7: 0x84c7;
  TEXTURE7: 0x84c7;
  static TEXTURE8: 0x84c8;
  TEXTURE8: 0x84c8;
  static TEXTURE9: 0x84c9;
  TEXTURE9: 0x84c9;
  static TEXTURE10: 0x84ca;
  TEXTURE10: 0x84ca;
  static TEXTURE11: 0x84cb;
  TEXTURE11: 0x84cb;
  static TEXTURE12: 0x84cc;
  TEXTURE12: 0x84cc;
  static TEXTURE13: 0x84cd;
  TEXTURE13: 0x84cd;
  static TEXTURE14: 0x84ce;
  TEXTURE14: 0x84ce;
  static TEXTURE15: 0x84cf;
  TEXTURE15: 0x84cf;
  static TEXTURE16: 0x84d0;
  TEXTURE16: 0x84d0;
  static TEXTURE17: 0x84d1;
  TEXTURE17: 0x84d1;
  static TEXTURE18: 0x84d2;
  TEXTURE18: 0x84d2;
  static TEXTURE19: 0x84d3;
  TEXTURE19: 0x84d3;
  static TEXTURE20: 0x84d4;
  TEXTURE20: 0x84d4;
  static TEXTURE21: 0x84d5;
  TEXTURE21: 0x84d5;
  static TEXTURE22: 0x84d6;
  TEXTURE22: 0x84d6;
  static TEXTURE23: 0x84d7;
  TEXTURE23: 0x84d7;
  static TEXTURE24: 0x84d8;
  TEXTURE24: 0x84d8;
  static TEXTURE25: 0x84d9;
  TEXTURE25: 0x84d9;
  static TEXTURE26: 0x84da;
  TEXTURE26: 0x84da;
  static TEXTURE27: 0x84db;
  TEXTURE27: 0x84db;
  static TEXTURE28: 0x84dc;
  TEXTURE28: 0x84dc;
  static TEXTURE29: 0x84dd;
  TEXTURE29: 0x84dd;
  static TEXTURE30: 0x84de;
  TEXTURE30: 0x84de;
  static TEXTURE31: 0x84df;
  TEXTURE31: 0x84df;
  static ACTIVE_TEXTURE: 0x84e0;
  ACTIVE_TEXTURE: 0x84e0;
  static REPEAT: 0x2901;
  REPEAT: 0x2901;
  static CLAMP_TO_EDGE: 0x812f;
  CLAMP_TO_EDGE: 0x812f;
  static MIRRORED_REPEAT: 0x8370;
  MIRRORED_REPEAT: 0x8370;
  static FLOAT_VEC2: 0x8b50;
  FLOAT_VEC2: 0x8b50;
  static FLOAT_VEC3: 0x8b51;
  FLOAT_VEC3: 0x8b51;
  static FLOAT_VEC4: 0x8b52;
  FLOAT_VEC4: 0x8b52;
  static INT_VEC2: 0x8b53;
  INT_VEC2: 0x8b53;
  static INT_VEC3: 0x8b54;
  INT_VEC3: 0x8b54;
  static INT_VEC4: 0x8b55;
  INT_VEC4: 0x8b55;
  static BOOL: 0x8b56;
  BOOL: 0x8b56;
  static BOOL_VEC2: 0x8b57;
  BOOL_VEC2: 0x8b57;
  static BOOL_VEC3: 0x8b58;
  BOOL_VEC3: 0x8b58;
  static BOOL_VEC4: 0x8b59;
  BOOL_VEC4: 0x8b59;
  static FLOAT_MAT2: 0x8b5a;
  FLOAT_MAT2: 0x8b5a;
  static FLOAT_MAT3: 0x8b5b;
  FLOAT_MAT3: 0x8b5b;
  static FLOAT_MAT4: 0x8b5c;
  FLOAT_MAT4: 0x8b5c;
  static SAMPLER_2D: 0x8b5e;
  SAMPLER_2D: 0x8b5e;
  static SAMPLER_CUBE: 0x8b60;
  SAMPLER_CUBE: 0x8b60;
  static VERTEX_ATTRIB_ARRAY_ENABLED: 0x8622;
  VERTEX_ATTRIB_ARRAY_ENABLED: 0x8622;
  static VERTEX_ATTRIB_ARRAY_SIZE: 0x8623;
  VERTEX_ATTRIB_ARRAY_SIZE: 0x8623;
  static VERTEX_ATTRIB_ARRAY_STRIDE: 0x8624;
  VERTEX_ATTRIB_ARRAY_STRIDE: 0x8624;
  static VERTEX_ATTRIB_ARRAY_TYPE: 0x8625;
  VERTEX_ATTRIB_ARRAY_TYPE: 0x8625;
  static VERTEX_ATTRIB_ARRAY_NORMALIZED: 0x886a;
  VERTEX_ATTRIB_ARRAY_NORMALIZED: 0x886a;
  static VERTEX_ATTRIB_ARRAY_POINTER: 0x8645;
  VERTEX_ATTRIB_ARRAY_POINTER: 0x8645;
  static VERTEX_ATTRIB_ARRAY_BUFFER_BINDING: 0x889f;
  VERTEX_ATTRIB_ARRAY_BUFFER_BINDING: 0x889f;
  static IMPLEMENTATION_COLOR_READ_TYPE: 0x8b9a;
  IMPLEMENTATION_COLOR_READ_TYPE: 0x8b9a;
  static IMPLEMENTATION_COLOR_READ_FORMAT: 0x8b9b;
  IMPLEMENTATION_COLOR_READ_FORMAT: 0x8b9b;
  static COMPILE_STATUS: 0x8b81;
  COMPILE_STATUS: 0x8b81;
  static LOW_FLOAT: 0x8df0;
  LOW_FLOAT: 0x8df0;
  static MEDIUM_FLOAT: 0x8df1;
  MEDIUM_FLOAT: 0x8df1;
  static HIGH_FLOAT: 0x8df2;
  HIGH_FLOAT: 0x8df2;
  static LOW_INT: 0x8df3;
  LOW_INT: 0x8df3;
  static MEDIUM_INT: 0x8df4;
  MEDIUM_INT: 0x8df4;
  static HIGH_INT: 0x8df5;
  HIGH_INT: 0x8df5;
  static FRAMEBUFFER: 0x8d40;
  FRAMEBUFFER: 0x8d40;
  static RENDERBUFFER: 0x8d41;
  RENDERBUFFER: 0x8d41;
  static RGBA4: 0x8056;
  RGBA4: 0x8056;
  static RGB5_A1: 0x8057;
  RGB5_A1: 0x8057;
  static RGB565: 0x8d62;
  RGB565: 0x8d62;
  static DEPTH_COMPONENT16: 0x81a5;
  DEPTH_COMPONENT16: 0x81a5;
  static STENCIL_INDEX: 0x1901;
  STENCIL_INDEX: 0x1901;
  static STENCIL_INDEX8: 0x8d48;
  STENCIL_INDEX8: 0x8d48;
  static DEPTH_STENCIL: 0x84f9;
  DEPTH_STENCIL: 0x84f9;
  static RENDERBUFFER_WIDTH: 0x8d42;
  RENDERBUFFER_WIDTH: 0x8d42;
  static RENDERBUFFER_HEIGHT: 0x8d43;
  RENDERBUFFER_HEIGHT: 0x8d43;
  static RENDERBUFFER_INTERNAL_FORMAT: 0x8d44;
  RENDERBUFFER_INTERNAL_FORMAT: 0x8d44;
  static RENDERBUFFER_RED_SIZE: 0x8d50;
  RENDERBUFFER_RED_SIZE: 0x8d50;
  static RENDERBUFFER_GREEN_SIZE: 0x8d51;
  RENDERBUFFER_GREEN_SIZE: 0x8d51;
  static RENDERBUFFER_BLUE_SIZE: 0x8d52;
  RENDERBUFFER_BLUE_SIZE: 0x8d52;
  static RENDERBUFFER_ALPHA_SIZE: 0x8d53;
  RENDERBUFFER_ALPHA_SIZE: 0x8d53;
  static RENDERBUFFER_DEPTH_SIZE: 0x8d54;
  RENDERBUFFER_DEPTH_SIZE: 0x8d54;
  static RENDERBUFFER_STENCIL_SIZE: 0x8d55;
  RENDERBUFFER_STENCIL_SIZE: 0x8d55;
  static FRAMEBUFFER_ATTACHMENT_OBJECT_TYPE: 0x8cd0;
  FRAMEBUFFER_ATTACHMENT_OBJECT_TYPE: 0x8cd0;
  static FRAMEBUFFER_ATTACHMENT_OBJECT_NAME: 0x8cd1;
  FRAMEBUFFER_ATTACHMENT_OBJECT_NAME: 0x8cd1;
  static FRAMEBUFFER_ATTACHMENT_TEXTURE_LEVEL: 0x8cd2;
  FRAMEBUFFER_ATTACHMENT_TEXTURE_LEVEL: 0x8cd2;
  static FRAMEBUFFER_ATTACHMENT_TEXTURE_CUBE_MAP_FACE: 0x8cd3;
  FRAMEBUFFER_ATTACHMENT_TEXTURE_CUBE_MAP_FACE: 0x8cd3;
  static COLOR_ATTACHMENT0: 0x8ce0;
  COLOR_ATTACHMENT0: 0x8ce0;
  static DEPTH_ATTACHMENT: 0x8d00;
  DEPTH_ATTACHMENT: 0x8d00;
  static STENCIL_ATTACHMENT: 0x8d20;
  STENCIL_ATTACHMENT: 0x8d20;
  static DEPTH_STENCIL_ATTACHMENT: 0x821a;
  DEPTH_STENCIL_ATTACHMENT: 0x821a;
  static NONE: 0;
  NONE: 0;
  static FRAMEBUFFER_COMPLETE: 0x8cd5;
  FRAMEBUFFER_COMPLETE: 0x8cd5;
  static FRAMEBUFFER_INCOMPLETE_ATTACHMENT: 0x8cd6;
  FRAMEBUFFER_INCOMPLETE_ATTACHMENT: 0x8cd6;
  static FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT: 0x8cd7;
  FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT: 0x8cd7;
  static FRAMEBUFFER_INCOMPLETE_DIMENSIONS: 0x8cd9;
  FRAMEBUFFER_INCOMPLETE_DIMENSIONS: 0x8cd9;
  static FRAMEBUFFER_UNSUPPORTED: 0x8cdd;
  FRAMEBUFFER_UNSUPPORTED: 0x8cdd;
  static FRAMEBUFFER_BINDING: 0x8ca6;
  FRAMEBUFFER_BINDING: 0x8ca6;
  static RENDERBUFFER_BINDING: 0x8ca7;
  RENDERBUFFER_BINDING: 0x8ca7;
  static MAX_RENDERBUFFER_SIZE: 0x84e8;
  MAX_RENDERBUFFER_SIZE: 0x84e8;
  static INVALID_FRAMEBUFFER_OPERATION: 0x0506;
  INVALID_FRAMEBUFFER_OPERATION: 0x0506;
  static UNPACK_FLIP_Y_WEBGL: 0x9240;
  UNPACK_FLIP_Y_WEBGL: 0x9240;
  static UNPACK_PREMULTIPLY_ALPHA_WEBGL: 0x9241;
  UNPACK_PREMULTIPLY_ALPHA_WEBGL: 0x9241;
  static CONTEXT_LOST_WEBGL: 0x9242;
  CONTEXT_LOST_WEBGL: 0x9242;
  static UNPACK_COLORSPACE_CONVERSION_WEBGL: 0x9243;
  UNPACK_COLORSPACE_CONVERSION_WEBGL: 0x9243;
  static BROWSER_DEFAULT_WEBGL: 0x9244;
  BROWSER_DEFAULT_WEBGL: 0x9244;

  canvas: HTMLCanvasElement;
  drawingBufferWidth: number;
  drawingBufferHeight: number;

  getContextAttributes(): ?WebGLContextAttributes;
  isContextLost(): boolean;

  getSupportedExtensions(): ?Array<string>;
  getExtension(name: string): any;

  activeTexture(texture: number): void;
  attachShader(program: WebGLProgram, shader: WebGLShader): void;
  bindAttribLocation(program: WebGLProgram, index: number, name: string): void;
  bindBuffer(target: number, buffer: ?WebGLBuffer): void;
  bindFramebuffer(target: number, framebuffer: ?WebGLFramebuffer): void;
  bindRenderbuffer(target: number, renderbuffer: ?WebGLRenderbuffer): void;
  bindTexture(target: number, texture: ?WebGLTexture): void;
  blendColor(red: number, green: number, blue: number, alpha: number): void;
  blendEquation(mode: number): void;
  blendEquationSeparate(modeRGB: number, modeAlpha: number): void;
  blendFunc(sfactor: number, dfactor: number): void;
  blendFuncSeparate(
    srcRGB: number,
    dstRGB: number,
    srcAlpha: number,
    dstAlpha: number
  ): void;

  bufferData(target: number, size: number, usage: number): void;
  bufferData(target: number, data: ?ArrayBuffer, usage: number): void;
  bufferData(target: number, data: $ArrayBufferView, usage: number): void;
  bufferSubData(target: number, offset: number, data: BufferDataSource): void;

  checkFramebufferStatus(target: number): number;
  clear(mask: number): void;
  clearColor(red: number, green: number, blue: number, alpha: number): void;
  clearDepth(depth: number): void;
  clearStencil(s: number): void;
  colorMask(red: boolean, green: boolean, blue: boolean, alpha: boolean): void;
  compileShader(shader: WebGLShader): void;

  compressedTexImage2D(
    target: number,
    level: number,
    internalformat: number,
    width: number,
    height: number,
    border: number,
    data: $ArrayBufferView
  ): void;

  compressedTexSubImage2D(
    target: number,
    level: number,
    xoffset: number,
    yoffset: number,
    width: number,
    height: number,
    format: number,
    data: $ArrayBufferView
  ): void;

  copyTexImage2D(
    target: number,
    level: number,
    internalformat: number,
    x: number,
    y: number,
    width: number,
    height: number,
    border: number
  ): void;
  copyTexSubImage2D(
    target: number,
    level: number,
    xoffset: number,
    yoffset: number,
    x: number,
    y: number,
    width: number,
    height: number
  ): void;

  createBuffer(): ?WebGLBuffer;
  createFramebuffer(): ?WebGLFramebuffer;
  createProgram(): ?WebGLProgram;
  createRenderbuffer(): ?WebGLRenderbuffer;
  createShader(type: number): ?WebGLShader;
  createTexture(): ?WebGLTexture;

  cullFace(mode: number): void;

  deleteBuffer(buffer: ?WebGLBuffer): void;
  deleteFramebuffer(framebuffer: ?WebGLFramebuffer): void;
  deleteProgram(program: ?WebGLProgram): void;
  deleteRenderbuffer(renderbuffer: ?WebGLRenderbuffer): void;
  deleteShader(shader: ?WebGLShader): void;
  deleteTexture(texture: ?WebGLTexture): void;

  depthFunc(func: number): void;
  depthMask(flag: boolean): void;
  depthRange(zNear: number, zFar: number): void;
  detachShader(program: WebGLProgram, shader: WebGLShader): void;
  disable(cap: number): void;
  disableVertexAttribArray(index: number): void;
  drawArrays(mode: number, first: number, count: number): void;
  drawElements(mode: number, count: number, type: number, offset: number): void;

  enable(cap: number): void;
  enableVertexAttribArray(index: number): void;
  finish(): void;
  flush(): void;
  framebufferRenderbuffer(
    target: number,
    attachment: number,
    renderbuffertarget: number,
    renderbuffer: ?WebGLRenderbuffer
  ): void;
  framebufferTexture2D(
    target: number,
    attachment: number,
    textarget: number,
    texture: ?WebGLTexture,
    level: number
  ): void;
  frontFace(mode: number): void;

  generateMipmap(target: number): void;

  getActiveAttrib(program: WebGLProgram, index: number): ?WebGLActiveInfo;
  getActiveUniform(program: WebGLProgram, index: number): ?WebGLActiveInfo;
  getAttachedShaders(program: WebGLProgram): ?Array<WebGLShader>;

  getAttribLocation(program: WebGLProgram, name: string): number;

  getBufferParameter(target: number, pname: number): any;
  getParameter(pname: number): any;

  getError(): number;

  getFramebufferAttachmentParameter(
    target: number,
    attachment: number,
    pname: number
  ): any;
  getProgramParameter(program: WebGLProgram, pname: number): any;
  getProgramInfoLog(program: WebGLProgram): ?string;
  getRenderbufferParameter(target: number, pname: number): any;
  getShaderParameter(shader: WebGLShader, pname: number): any;
  getShaderPrecisionFormat(
    shadertype: number,
    precisiontype: number
  ): ?WebGLShaderPrecisionFormat;
  getShaderInfoLog(shader: WebGLShader): ?string;

  getShaderSource(shader: WebGLShader): ?string;

  getTexParameter(target: number, pname: number): any;

  getUniform(program: WebGLProgram, location: WebGLUniformLocation): any;

  getUniformLocation(
    program: WebGLProgram,
    name: string
  ): ?WebGLUniformLocation;

  getVertexAttrib(index: number, pname: number): any;

  getVertexAttribOffset(index: number, pname: number): number;

  hint(target: number, mode: number): void;
  isBuffer(buffer: ?WebGLBuffer): boolean;
  isEnabled(cap: number): boolean;
  isFramebuffer(framebuffer: ?WebGLFramebuffer): boolean;
  isProgram(program: ?WebGLProgram): boolean;
  isRenderbuffer(renderbuffer: ?WebGLRenderbuffer): boolean;
  isShader(shader: ?WebGLShader): boolean;
  isTexture(texture: ?WebGLTexture): boolean;
  lineWidth(width: number): void;
  linkProgram(program: WebGLProgram): void;
  pixelStorei(pname: number, param: number): void;
  polygonOffset(factor: number, units: number): void;

  readPixels(
    x: number,
    y: number,
    width: number,
    height: number,
    format: number,
    type: number,
    pixels: ?$ArrayBufferView
  ): void;

  renderbufferStorage(
    target: number,
    internalformat: number,
    width: number,
    height: number
  ): void;
  sampleCoverage(value: number, invert: boolean): void;
  scissor(x: number, y: number, width: number, height: number): void;

  shaderSource(shader: WebGLShader, source: string): void;

  stencilFunc(func: number, ref: number, mask: number): void;
  stencilFuncSeparate(
    face: number,
    func: number,
    ref: number,
    mask: number
  ): void;
  stencilMask(mask: number): void;
  stencilMaskSeparate(face: number, mask: number): void;
  stencilOp(fail: number, zfail: number, zpass: number): void;
  stencilOpSeparate(
    face: number,
    fail: number,
    zfail: number,
    zpass: number
  ): void;

  texImage2D(
    target: number,
    level: number,
    internalformat: number,
    width: number,
    height: number,
    border: number,
    format: number,
    type: number,
    pixels: ?$ArrayBufferView
  ): void;
  texImage2D(
    target: number,
    level: number,
    internalformat: number,
    format: number,
    type: number,
    source: TexImageSource
  ): void;

  texParameterf(target: number, pname: number, param: number): void;
  texParameteri(target: number, pname: number, param: number): void;

  texSubImage2D(
    target: number,
    level: number,
    xoffset: number,
    yoffset: number,
    width: number,
    height: number,
    format: number,
    type: number,
    pixels: ?$ArrayBufferView
  ): void;
  texSubImage2D(
    target: number,
    level: number,
    xoffset: number,
    yoffset: number,
    format: number,
    type: number,
    source: TexImageSource
  ): void;

  uniform1f(location: ?WebGLUniformLocation, x: number): void;
  uniform1fv(location: ?WebGLUniformLocation, v: Float32Array): void;
  uniform1fv(location: ?WebGLUniformLocation, v: Array<number>): void;
  uniform1fv(location: ?WebGLUniformLocation, v: [number]): void;
  uniform1i(location: ?WebGLUniformLocation, x: number): void;
  uniform1iv(location: ?WebGLUniformLocation, v: Int32Array): void;
  uniform1iv(location: ?WebGLUniformLocation, v: Array<number>): void;
  uniform1iv(location: ?WebGLUniformLocation, v: [number]): void;
  uniform2f(location: ?WebGLUniformLocation, x: number, y: number): void;
  uniform2fv(location: ?WebGLUniformLocation, v: Float32Array): void;
  uniform2fv(location: ?WebGLUniformLocation, v: Array<number>): void;
  uniform2fv(location: ?WebGLUniformLocation, v: [number, number]): void;
  uniform2i(location: ?WebGLUniformLocation, x: number, y: number): void;
  uniform2iv(location: ?WebGLUniformLocation, v: Int32Array): void;
  uniform2iv(location: ?WebGLUniformLocation, v: Array<number>): void;
  uniform2iv(location: ?WebGLUniformLocation, v: [number, number]): void;
  uniform3f(
    location: ?WebGLUniformLocation,
    x: number,
    y: number,
    z: number
  ): void;
  uniform3fv(location: ?WebGLUniformLocation, v: Float32Array): void;
  uniform3fv(location: ?WebGLUniformLocation, v: Array<number>): void;
  uniform3fv(
    location: ?WebGLUniformLocation,
    v: [number, number, number]
  ): void;
  uniform3i(
    location: ?WebGLUniformLocation,
    x: number,
    y: number,
    z: number
  ): void;
  uniform3iv(location: ?WebGLUniformLocation, v: Int32Array): void;
  uniform3iv(location: ?WebGLUniformLocation, v: Array<number>): void;
  uniform3iv(
    location: ?WebGLUniformLocation,
    v: [number, number, number]
  ): void;
  uniform4f(
    location: ?WebGLUniformLocation,
    x: number,
    y: number,
    z: number,
    w: number
  ): void;
  uniform4fv(location: ?WebGLUniformLocation, v: Float32Array): void;
  uniform4fv(location: ?WebGLUniformLocation, v: Array<number>): void;
  uniform4fv(
    location: ?WebGLUniformLocation,
    v: [number, number, number, number]
  ): void;
  uniform4i(
    location: ?WebGLUniformLocation,
    x: number,
    y: number,
    z: number,
    w: number
  ): void;
  uniform4iv(location: ?WebGLUniformLocation, v: Int32Array): void;
  uniform4iv(location: ?WebGLUniformLocation, v: Array<number>): void;
  uniform4iv(
    location: ?WebGLUniformLocation,
    v: [number, number, number, number]
  ): void;

  uniformMatrix2fv(
    location: ?WebGLUniformLocation,
    transpose: boolean,
    value: Float32Array
  ): void;
  uniformMatrix2fv(
    location: ?WebGLUniformLocation,
    transpose: boolean,
    value: Array<number>
  ): void;
  uniformMatrix3fv(
    location: ?WebGLUniformLocation,
    transpose: boolean,
    value: Float32Array
  ): void;
  uniformMatrix3fv(
    location: ?WebGLUniformLocation,
    transpose: boolean,
    value: Array<number>
  ): void;
  uniformMatrix4fv(
    location: ?WebGLUniformLocation,
    transpose: boolean,
    value: Float32Array
  ): void;
  uniformMatrix4fv(
    location: ?WebGLUniformLocation,
    transpose: boolean,
    value: Array<number>
  ): void;

  useProgram(program: ?WebGLProgram): void;
  validateProgram(program: WebGLProgram): void;

  vertexAttrib1f(index: number, x: number): void;
  vertexAttrib1fv(index: number, values: VertexAttribFVSource): void;
  vertexAttrib2f(index: number, x: number, y: number): void;
  vertexAttrib2fv(index: number, values: VertexAttribFVSource): void;
  vertexAttrib3f(index: number, x: number, y: number, z: number): void;
  vertexAttrib3fv(index: number, values: VertexAttribFVSource): void;
  vertexAttrib4f(
    index: number,
    x: number,
    y: number,
    z: number,
    w: number
  ): void;
  vertexAttrib4fv(index: number, values: VertexAttribFVSource): void;
  vertexAttribPointer(
    index: number,
    size: number,
    type: number,
    normalized: boolean,
    stride: number,
    offset: number
  ): void;

  viewport(x: number, y: number, width: number, height: number): void;
}

declare class WebGLContextEvent extends Event {
  statusMessage: string;
}

declare class MediaKeyStatusMap<BufferDataSource, MediaKeyStatus> {
  @@iterator(): Iterator<[BufferDataSource, MediaKeyStatus]>;
  size: number;
  entries(): Iterator<[BufferDataSource, MediaKeyStatus]>;
  forEach(
    callbackfn: (
      value: MediaKeyStatus,
      key: BufferDataSource,
      map: MediaKeyStatusMap<BufferDataSource, MediaKeyStatus>
    ) => any,
    thisArg?: any
  ): void;
  get(key: BufferDataSource): MediaKeyStatus;
  has(key: BufferDataSource): boolean;
  keys(): Iterator<BufferDataSource>;
  values(): Iterator<MediaKeyStatus>;
}

declare class MediaKeySession extends EventTarget {
  sessionId: string;
  expiration: number;
  closed: Promise<void>;
  keyStatuses: MediaKeyStatusMap<BufferDataSource, MediaKeyStatus>;

  generateRequest(
    initDataType: string,
    initData: BufferDataSource
  ): Promise<void>;
  load(sessionId: string): Promise<boolean>;
  update(response: BufferDataSource): Promise<void>;
  close(): Promise<void>;
  remove(): Promise<void>;

  onkeystatuschange: (ev: any) => any;
  onmessage: (ev: any) => any;
}

declare class MediaKeys {
  createSession(mediaKeySessionType: MediaKeySessionType): MediaKeySession;
  setServerCertificate(serverCertificate: BufferDataSource): Promise<boolean>;
}

declare class TextRange {
  boundingLeft: number;
  htmlText: string;
  offsetLeft: number;
  boundingWidth: number;
  boundingHeight: number;
  boundingTop: number;
  text: string;
  offsetTop: number;
  moveToPoint(x: number, y: number): void;
  queryCommandValue(cmdID: string): any;
  getBookmark(): string;
  move(unit: string, count?: number): number;
  queryCommandIndeterm(cmdID: string): boolean;
  scrollIntoView(fStart?: boolean): void;
  findText(string: string, count?: number, flags?: number): boolean;
  execCommand(cmdID: string, showUI?: boolean, value?: any): boolean;
  getBoundingClientRect(): DOMRect;
  moveToBookmark(bookmark: string): boolean;
  isEqual(range: TextRange): boolean;
  duplicate(): TextRange;
  collapse(start?: boolean): void;
  queryCommandText(cmdID: string): string;
  select(): void;
  pasteHTML(html: string): void;
  inRange(range: TextRange): boolean;
  moveEnd(unit: string, count?: number): number;
  getClientRects(): DOMRectList;
  moveStart(unit: string, count?: number): number;
  parentElement(): Element;
  queryCommandState(cmdID: string): boolean;
  compareEndPoints(how: string, sourceRange: TextRange): number;
  execCommandShowHelp(cmdID: string): boolean;
  moveToElementText(element: Element): void;
  expand(Unit: string): boolean;
  queryCommandSupported(cmdID: string): boolean;
  setEndPoint(how: string, SourceRange: TextRange): void;
  queryCommandEnabled(cmdID: string): boolean;
}

// These types used to exist as a copy of DOMRect/DOMRectList, which is
// incorrect because there are no ClientRect/ClientRectList globals on the DOM.
// Keep these as type aliases for backwards compatibility.
declare type ClientRect = DOMRect;
declare type ClientRectList = DOMRectList;

// TODO: HTML*Element

declare class DOMImplementation {
  createDocumentType(
    qualifiedName: string,
    publicId: string,
    systemId: string
  ): DocumentType;
  createDocument(
    namespaceURI: string | null,
    qualifiedName: string,
    doctype?: DocumentType | null
  ): Document;
  hasFeature(feature: string, version?: string): boolean;

  // non-standard
  createHTMLDocument(title?: string): Document;
}

declare class DocumentType extends Node {
  name: string;
  notations: NamedNodeMap;
  systemId: string;
  internalSubset: string;
  entities: NamedNodeMap;
  publicId: string;

  // from ChildNode interface
  after(...nodes: Array<string | Node>): void;
  before(...nodes: Array<string | Node>): void;
  replaceWith(...nodes: Array<string | Node>): void;
  remove(): void;
}

declare class CharacterData extends Node {
  length: number;
  data: string;
  deleteData(offset: number, count: number): void;
  replaceData(offset: number, count: number, arg: string): void;
  appendData(arg: string): void;
  insertData(offset: number, arg: string): void;
  substringData(offset: number, count: number): string;

  // from ChildNode interface
  after(...nodes: Array<string | Node>): void;
  before(...nodes: Array<string | Node>): void;
  replaceWith(...nodes: Array<string | Node>): void;
  remove(): void;
}

declare class Text extends CharacterData {
  assignedSlot?: HTMLSlotElement;
  wholeText: string;
  splitText(offset: number): Text;
  replaceWholeText(content: string): Text;
}

declare class Comment extends CharacterData {
  text: string;
}

declare class URL {
  static canParse(url: string, base?: string): boolean;
  static createObjectURL(blob: Blob): string;
  static createObjectURL(mediaSource: MediaSource): string;
  static revokeObjectURL(url: string): void;
  static parse(url: string, base?: string): URL | null;
  constructor(url: string, base?: string | URL): void;
  hash: string;
  host: string;
  hostname: string;
  href: string;
  +origin: string;
  password: string;
  pathname: string;
  port: string;
  protocol: string;
  search: string;
  +searchParams: URLSearchParams;
  username: string;
  toString(): string;
  toJSON(): string;
}

declare interface MediaSourceHandle {}

declare class MediaSource extends EventTarget {
  sourceBuffers: SourceBufferList;
  activeSourceBuffers: SourceBufferList;
  // https://w3c.github.io/media-source/#dom-readystate
  readyState: 'closed' | 'open' | 'ended';
  duration: number;
  handle: MediaSourceHandle;
  addSourceBuffer(type: string): SourceBuffer;
  removeSourceBuffer(sourceBuffer: SourceBuffer): void;
  endOfStream(error?: string): void;
  static isTypeSupported(type: string): boolean;
}

declare class SourceBuffer extends EventTarget {
  mode: 'segments' | 'sequence';
  updating: boolean;
  buffered: TimeRanges;
  timestampOffset: number;
  audioTracks: AudioTrackList;
  videoTracks: VideoTrackList;
  textTracks: TextTrackList;
  appendWindowStart: number;
  appendWindowEnd: number;

  appendBuffer(data: ArrayBuffer | $ArrayBufferView): void;
  // TODO: Add ReadableStream
  // appendStream(stream: ReadableStream, maxSize?: number): void;
  abort(): void;
  remove(start: number, end: number): void;

  trackDefaults: TrackDefaultList;
}

declare class SourceBufferList extends EventTarget {
  @@iterator(): Iterator<SourceBuffer>;
  [index: number]: SourceBuffer;
  length: number;
}

declare class TrackDefaultList {
  [index: number]: TrackDefault;
  length: number;
}

declare class TrackDefault {
  type: 'audio' | 'video' | 'text';
  byteStreamTrackID: string;
  language: string;
  label: string;
  kinds: Array<string>;
}

// TODO: The use of `typeof` makes this function signature effectively
// (node: Node) => number, but it should be (node: Node) => 1|2|3
type NodeFilterCallback = (
  node: Node
) =>
  | typeof NodeFilter.FILTER_ACCEPT
  | typeof NodeFilter.FILTER_REJECT
  | typeof NodeFilter.FILTER_SKIP;

type NodeFilterInterface =
  | NodeFilterCallback
  | {acceptNode: NodeFilterCallback, ...};

// TODO: window.NodeFilter exists at runtime and behaves as a constructor
//       as far as `instanceof` is concerned, but it is not callable.
declare class NodeFilter {
  static SHOW_ALL: -1;
  static SHOW_ELEMENT: 1;
  static SHOW_ATTRIBUTE: 2; // deprecated
  static SHOW_TEXT: 4;
  static SHOW_CDATA_SECTION: 8; // deprecated
  static SHOW_ENTITY_REFERENCE: 16; // deprecated
  static SHOW_ENTITY: 32; // deprecated
  static SHOW_PROCESSING_INSTRUCTION: 64;
  static SHOW_COMMENT: 128;
  static SHOW_DOCUMENT: 256;
  static SHOW_DOCUMENT_TYPE: 512;
  static SHOW_DOCUMENT_FRAGMENT: 1024;
  static SHOW_NOTATION: 2048; // deprecated
  static FILTER_ACCEPT: 1;
  static FILTER_REJECT: 2;
  static FILTER_SKIP: 3;
  acceptNode: NodeFilterCallback;
}

// TODO: window.NodeIterator exists at runtime and behaves as a constructor
//       as far as `instanceof` is concerned, but it is not callable.
declare class NodeIterator<RootNodeT, WhatToShowT> {
  root: RootNodeT;
  whatToShow: number;
  filter: NodeFilter;
  expandEntityReferences: boolean;
  referenceNode: RootNodeT | WhatToShowT;
  pointerBeforeReferenceNode: boolean;
  detach(): void;
  previousNode(): WhatToShowT | null;
  nextNode(): WhatToShowT | null;
}

// TODO: window.TreeWalker exists at runtime and behaves as a constructor
//       as far as `instanceof` is concerned, but it is not callable.
declare class TreeWalker<RootNodeT, WhatToShowT> {
  root: RootNodeT;
  whatToShow: number;
  filter: NodeFilter;
  expandEntityReferences: boolean;
  currentNode: RootNodeT | WhatToShowT;
  parentNode(): WhatToShowT | null;
  firstChild(): WhatToShowT | null;
  lastChild(): WhatToShowT | null;
  previousSibling(): WhatToShowT | null;
  nextSibling(): WhatToShowT | null;
  previousNode(): WhatToShowT | null;
  nextNode(): WhatToShowT | null;
}

/* Window file picker */

type WindowFileSystemPickerFileType = {|
  description?: string,
  /*
   * An Object with the keys set to the MIME type
   * and the values an Array of file extensions
   * Example:
   * accept: {
   *   "image/*": [".png", ".gif", ".jpeg", ".jpg"],
   * },
   */
  accept: {
    [string]: Array<string>,
  },
|};

type WindowBaseFilePickerOptions = {|
  id?: number,
  startIn?:
    | FileSystemHandle
    | 'desktop'
    | 'documents'
    | 'downloads'
    | 'music'
    | 'pictures'
    | 'videos',
|};

type WindowFilePickerOptions = WindowBaseFilePickerOptions & {|
  excludeAcceptAllOption?: boolean,
  types?: Array<WindowFileSystemPickerFileType>,
|};

type WindowOpenFilePickerOptions = WindowFilePickerOptions & {|
  multiple?: boolean,
|};

type WindowSaveFilePickerOptions = WindowFilePickerOptions & {|
  suggestedName?: string,
|};

type WindowDirectoryFilePickerOptions = WindowBaseFilePickerOptions & {|
  mode?: 'read' | 'readwrite',
|};

// https://wicg.github.io/file-system-access/#api-showopenfilepicker
declare function showOpenFilePicker(
  options?: WindowOpenFilePickerOptions
): Promise<Array<FileSystemFileHandle>>;

// https://wicg.github.io/file-system-access/#api-showsavefilepicker
declare function showSaveFilePicker(
  options?: WindowSaveFilePickerOptions
): Promise<FileSystemFileHandle>;

// https://wicg.github.io/file-system-access/#api-showdirectorypicker
declare function showDirectoryPicker(
  options?: WindowDirectoryFilePickerOptions
): Promise<FileSystemDirectoryHandle>;

/* Notification */
type NotificationPermission = 'default' | 'denied' | 'granted';
type NotificationDirection = 'auto' | 'ltr' | 'rtl';
type VibratePattern = number | Array<number>;
type NotificationAction = {
  action: string,
  title: string,
  icon?: string,
  ...
};
type NotificationOptions = {
  dir?: NotificationDirection,
  lang?: string,
  body?: string,
  tag?: string,
  image?: string,
  icon?: string,
  badge?: string,
  sound?: string,
  vibrate?: VibratePattern,
  timestamp?: number,
  renotify?: boolean,
  silent?: boolean,
  requireInteraction?: boolean,
  data?: ?any,
  actions?: Array<NotificationAction>,
  ...
};

declare class Notification extends EventTarget {
  constructor(title: string, options?: NotificationOptions): void;
  static +permission: NotificationPermission;
  static requestPermission(
    callback?: (perm: NotificationPermission) => mixed
  ): Promise<NotificationPermission>;
  static +maxActions: number;
  onclick: ?(evt: Event) => mixed;
  onclose: ?(evt: Event) => mixed;
  onerror: ?(evt: Event) => mixed;
  onshow: ?(evt: Event) => mixed;
  +title: string;
  +dir: NotificationDirection;
  +lang: string;
  +body: string;
  +tag: string;
  +image?: string;
  +icon?: string;
  +badge?: string;
  +vibrate?: Array<number>;
  +timestamp: number;
  +renotify: boolean;
  +silent: boolean;
  +requireInteraction: boolean;
  +data: any;
  +actions: Array<NotificationAction>;

  close(): void;
}
