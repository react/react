// flow-typed signature: 760aeea3b9b767e808097fe22b68a20f
// flow-typed version: 8584579196/html/flow_>=v0.261.x

/* DataTransfer */

declare class DataTransfer {
  clearData(format?: string): void;
  getData(format: string): string;
  setData(format: string, data: string): void;
  setDragImage(image: Element, x: number, y: number): void;
  dropEffect: string;
  effectAllowed: string;
  files: FileList; // readonly
  items: DataTransferItemList; // readonly
  types: Array<string>; // readonly
}

declare class DataTransferItemList {
  @@iterator(): Iterator<DataTransferItem>;
  length: number; // readonly
  [index: number]: DataTransferItem;
  add(data: string, type: string): ?DataTransferItem;
  add(data: File): ?DataTransferItem;
  remove(index: number): void;
  clear(): void;
}

// https://wicg.github.io/file-system-access/#drag-and-drop
declare class DataTransferItem {
  kind: string; // readonly
  type: string; // readonly
  getAsString(_callback: ?(data: string) => mixed): void;
  getAsFile(): ?File;
  /*
   * This is not supported by all browsers, please have a fallback plan for it.
   * For more information, please checkout
   * https://developer.mozilla.org/en-US/docs/Web/API/DataTransferItem/webkitGetAsEntry
   */
  webkitGetAsEntry(): void | (() => any);
  /*
   * Not supported in all browsers
   * For up to date compatibility information, please visit
   * https://developer.mozilla.org/en-US/docs/Web/API/DataTransferItem/getAsFileSystemHandle
   */
  getAsFileSystemHandle?: () => Promise<?FileSystemHandle>;
}

declare type DOMStringMap = {[key: string]: string, ...};

declare class DOMStringList {
  @@iterator(): Iterator<string>;
  +[key: number]: string;
  +length: number;
  item(number): string | null;
  contains(string): boolean;
}

declare type ElementDefinitionOptions = {|extends?: string|};

declare interface CustomElementRegistry {
  define(
    name: string,
    ctor: Class<Element>,
    options?: ElementDefinitionOptions
  ): void;
  get(name: string): any;
  whenDefined(name: string): Promise<void>;
}

// https://www.w3.org/TR/eventsource/
declare class EventSource extends EventTarget {
  constructor(
    url: string,
    configuration?: {withCredentials: boolean, ...}
  ): void;
  +CLOSED: 2;
  +CONNECTING: 0;
  +OPEN: 1;
  +readyState: 0 | 1 | 2;
  +url: string;
  +withCredentials: boolean;
  onerror: () => void;
  onmessage: MessageEventListener;
  onopen: () => void;
  close: () => void;
}

// https://html.spec.whatwg.org/multipage/webappapis.html#the-errorevent-interface
declare class ErrorEvent extends Event {
  constructor(
    type: string,
    eventInitDict?: {
      ...Event$Init,
      message?: string,
      filename?: string,
      lineno?: number,
      colno?: number,
      error?: any,
      ...
    }
  ): void;
  +message: string;
  +filename: string;
  +lineno: number;
  +colno: number;
  +error: any;
}

// https://html.spec.whatwg.org/multipage/web-messaging.html#broadcasting-to-other-browsing-contexts
declare class BroadcastChannel extends EventTarget {
  name: string;
  onmessage: ?(event: MessageEvent<>) => void;
  onmessageerror: ?(event: MessageEvent<>) => void;

  constructor(name: string): void;
  postMessage(msg: mixed): void;
  close(): void;
}

// https://www.w3.org/TR/webstorage/#the-storageevent-interface
declare class StorageEvent extends Event {
  key: ?string;
  oldValue: ?string;
  newValue: ?string;
  url: string;
  storageArea: ?Storage;
}

// https://www.w3.org/TR/html50/browsers.html#beforeunloadevent
declare class BeforeUnloadEvent extends Event {
  returnValue: string;
}

type ToggleEvent$Init = {
  ...Event$Init,
  oldState: string,
  newState: string,
  ...
};

declare class ToggleEvent extends Event {
  constructor(type: ToggleEventTypes, eventInit?: ToggleEvent$Init): void;
  +oldState: string;
  +newState: string;
}

// TODO: HTMLDocument
type FocusOptions = {preventScroll?: boolean, ...};

declare class HTMLElement extends Element {
  blur(): void;
  click(): void;
  focus(options?: FocusOptions): void;
  getBoundingClientRect(): DOMRect;
  forceSpellcheck(): void;

  showPopover(options?: {|source?: HTMLElement|}): void;
  hidePopover(): void;
  togglePopover(
    options?: boolean | {|force?: boolean, source?: HTMLElement|}
  ): boolean;

  accessKey: string;
  accessKeyLabel: string;
  contentEditable: string;
  contextMenu: ?HTMLMenuElement;
  dataset: DOMStringMap;
  dir: 'ltr' | 'rtl' | 'auto';
  draggable: boolean;
  dropzone: any;
  hidden: boolean;
  inert: boolean;
  isContentEditable: boolean;
  itemProp: any;
  itemScope: boolean;
  itemType: any;
  itemValue: Object;
  lang: string;
  offsetHeight: number;
  offsetLeft: number;
  offsetParent: ?Element;
  offsetTop: number;
  offsetWidth: number;
  onabort: ?Function;
  onblur: ?Function;
  oncancel: ?Function;
  oncanplay: ?Function;
  oncanplaythrough: ?Function;
  onchange: ?Function;
  onclick: ?Function;
  oncontextmenu: ?Function;
  oncuechange: ?Function;
  ondblclick: ?Function;
  ondurationchange: ?Function;
  onemptied: ?Function;
  onended: ?Function;
  onerror: ?Function;
  onfocus: ?Function;
  onfullscreenchange: ?Function;
  onfullscreenerror: ?Function;
  ongotpointercapture: ?Function;
  oninput: ?Function;
  oninvalid: ?Function;
  onkeydown: ?Function;
  onkeypress: ?Function;
  onkeyup: ?Function;
  onload: ?Function;
  onloadeddata: ?Function;
  onloadedmetadata: ?Function;
  onloadstart: ?Function;
  onlostpointercapture: ?Function;
  onmousedown: ?Function;
  onmouseenter: ?Function;
  onmouseleave: ?Function;
  onmousemove: ?Function;
  onmouseout: ?Function;
  onmouseover: ?Function;
  onmouseup: ?Function;
  onmousewheel: ?Function;
  onpause: ?Function;
  onplay: ?Function;
  onplaying: ?Function;
  onpointercancel: ?Function;
  onpointerdown: ?Function;
  onpointerenter: ?Function;
  onpointerleave: ?Function;
  onpointermove: ?Function;
  onpointerout: ?Function;
  onpointerover: ?Function;
  onpointerup: ?Function;
  onprogress: ?Function;
  onratechange: ?Function;
  onreadystatechange: ?Function;
  onreset: ?Function;
  onresize: ?Function;
  onscroll: ?Function;
  onseeked: ?Function;
  onseeking: ?Function;
  onselect: ?Function;
  onshow: ?Function;
  onstalled: ?Function;
  onsubmit: ?Function;
  onsuspend: ?Function;
  ontimeupdate: ?Function;
  ontoggle: ?Function;
  onbeforetoggle: ?Function;
  onvolumechange: ?Function;
  onwaiting: ?Function;
  properties: any;
  spellcheck: boolean;
  style: CSSStyleDeclaration;
  tabIndex: number;
  title: string;
  translate: boolean;
  popover: '' | 'auto' | 'manual' | 'hint';

  +popoverVisibilityState: 'hidden' | 'showing';

  +popoverInvoker: HTMLElement | null;
}

declare class HTMLSlotElement extends HTMLElement {
  name: string;
  assignedNodes(options?: {flatten: boolean, ...}): Node[];
}

declare class HTMLTableElement extends HTMLElement {
  tagName: 'TABLE';
  caption: HTMLTableCaptionElement | null;
  tHead: HTMLTableSectionElement | null;
  tFoot: HTMLTableSectionElement | null;
  +tBodies: HTMLCollection<HTMLTableSectionElement>;
  +rows: HTMLCollection<HTMLTableRowElement>;
  createTHead(): HTMLTableSectionElement;
  deleteTHead(): void;
  createTFoot(): HTMLTableSectionElement;
  deleteTFoot(): void;
  createCaption(): HTMLTableCaptionElement;
  deleteCaption(): void;
  insertRow(index?: number): HTMLTableRowElement;
  deleteRow(index: number): void;
}

declare class HTMLTableCaptionElement extends HTMLElement {
  tagName: 'CAPTION';
}

declare class HTMLTableColElement extends HTMLElement {
  tagName: 'COL' | 'COLGROUP';
  span: number;
}

declare class HTMLTableSectionElement extends HTMLElement {
  tagName: 'THEAD' | 'TFOOT' | 'TBODY';
  +rows: HTMLCollection<HTMLTableRowElement>;
  insertRow(index?: number): HTMLTableRowElement;
  deleteRow(index: number): void;
}

declare class HTMLTableCellElement extends HTMLElement {
  tagName: 'TD' | 'TH';
  colSpan: number;
  rowSpan: number;
  +cellIndex: number;
}

declare class HTMLTableRowElement extends HTMLElement {
  tagName: 'TR';
  align: 'left' | 'right' | 'center';
  +rowIndex: number;
  +sectionRowIndex: number;
  +cells: HTMLCollection<HTMLTableCellElement>;
  deleteCell(index: number): void;
  insertCell(index?: number): HTMLTableCellElement;
}

declare class HTMLMenuElement extends HTMLElement {
  getCompact(): boolean;
  setCompact(compact: boolean): void;
}

declare class HTMLBaseElement extends HTMLElement {
  href: string;
  target: string;
}

declare class HTMLTemplateElement extends HTMLElement {
  content: DocumentFragment;
}

declare class CanvasGradient {
  addColorStop(offset: number, color: string): void;
}

declare class CanvasPattern {
  setTransform(matrix: SVGMatrix): void;
}

declare class ImageBitmap {
  close(): void;
  width: number;
  height: number;
}

type CanvasFillRule = string;

type CanvasImageSource =
  | HTMLImageElement
  | HTMLVideoElement
  | HTMLCanvasElement
  | CanvasRenderingContext2D
  | ImageBitmap;

declare class TextMetrics {
  // x-direction
  width: number;
  actualBoundingBoxLeft: number;
  actualBoundingBoxRight: number;

  // y-direction
  fontBoundingBoxAscent: number;
  fontBoundingBoxDescent: number;
  actualBoundingBoxAscent: number;
  actualBoundingBoxDescent: number;
  emHeightAscent: number;
  emHeightDescent: number;
  hangingBaseline: number;
  alphabeticBaseline: number;
  ideographicBaseline: number;
}

declare class CanvasDrawingStyles {
  width: number;
  actualBoundingBoxLeft: number;
  actualBoundingBoxRight: number;

  // y-direction
  fontBoundingBoxAscent: number;
  fontBoundingBoxDescent: number;
  actualBoundingBoxAscent: number;
  actualBoundingBoxDescent: number;
  emHeightAscent: number;
  emHeightDescent: number;
  hangingBaseline: number;
  alphabeticBaseline: number;
  ideographicBaseline: number;
}

declare class Path2D {
  constructor(path?: Path2D | string): void;

  addPath(path: Path2D, transformation?: ?SVGMatrix): void;
  addPathByStrokingPath(
    path: Path2D,
    styles: CanvasDrawingStyles,
    transformation?: ?SVGMatrix
  ): void;
  addText(
    text: string,
    styles: CanvasDrawingStyles,
    transformation: ?SVGMatrix,
    x: number,
    y: number,
    maxWidth?: number
  ): void;
  addPathByStrokingText(
    text: string,
    styles: CanvasDrawingStyles,
    transformation: ?SVGMatrix,
    x: number,
    y: number,
    maxWidth?: number
  ): void;
  addText(
    text: string,
    styles: CanvasDrawingStyles,
    transformation: ?SVGMatrix,
    path: Path2D,
    maxWidth?: number
  ): void;
  addPathByStrokingText(
    text: string,
    styles: CanvasDrawingStyles,
    transformation: ?SVGMatrix,
    path: Path2D,
    maxWidth?: number
  ): void;

  // CanvasPathMethods
  // shared path API methods
  arc(
    x: number,
    y: number,
    radius: number,
    startAngle: number,
    endAngle: number,
    anticlockwise?: boolean
  ): void;
  arcTo(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    radius: number,
    _: void,
    _: void
  ): void;
  arcTo(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    radiusX: number,
    radiusY: number,
    rotation: number
  ): void;
  bezierCurveTo(
    cp1x: number,
    cp1y: number,
    cp2x: number,
    cp2y: number,
    x: number,
    y: number
  ): void;
  closePath(): void;
  ellipse(
    x: number,
    y: number,
    radiusX: number,
    radiusY: number,
    rotation: number,
    startAngle: number,
    endAngle: number,
    anticlockwise?: boolean
  ): void;
  lineTo(x: number, y: number): void;
  moveTo(x: number, y: number): void;
  quadraticCurveTo(cpx: number, cpy: number, x: number, y: number): void;
  rect(x: number, y: number, w: number, h: number): void;
}

declare class ImageData {
  width: number;
  height: number;
  data: Uint8ClampedArray;

  // constructor methods are used in Worker where CanvasRenderingContext2D
  //  is unavailable.
  // https://html.spec.whatwg.org/multipage/scripting.html#dom-imagedata
  constructor(data: Uint8ClampedArray, width: number, height: number): void;
  constructor(width: number, height: number): void;
}

declare class CanvasRenderingContext2D {
  canvas: HTMLCanvasElement;

  // canvas dimensions
  width: number;
  height: number;

  // for contexts that aren't directly fixed to a specific canvas
  commit(): void;

  // state
  save(): void;
  restore(): void;

  // transformations
  currentTransform: SVGMatrix;
  scale(x: number, y: number): void;
  rotate(angle: number): void;
  translate(x: number, y: number): void;
  transform(
    a: number,
    b: number,
    c: number,
    d: number,
    e: number,
    f: number
  ): void;
  setTransform(
    a: number,
    b: number,
    c: number,
    d: number,
    e: number,
    f: number
  ): void;
  resetTransform(): void;

  // compositing
  globalAlpha: number;
  globalCompositeOperation: string;

  // image smoothing
  imageSmoothingEnabled: boolean;
  imageSmoothingQuality: 'low' | 'medium' | 'high';

  // filters
  filter: string;

  // colours and styles
  strokeStyle: string | CanvasGradient | CanvasPattern;
  fillStyle: string | CanvasGradient | CanvasPattern;
  createLinearGradient(
    x0: number,
    y0: number,
    x1: number,
    y1: number
  ): CanvasGradient;
  createRadialGradient(
    x0: number,
    y0: number,
    r0: number,
    x1: number,
    y1: number,
    r1: number
  ): CanvasGradient;
  createPattern(image: CanvasImageSource, repetition: ?string): CanvasPattern;

  // shadows
  shadowOffsetX: number;
  shadowOffsetY: number;
  shadowBlur: number;
  shadowColor: string;

  // rects
  clearRect(x: number, y: number, w: number, h: number): void;
  fillRect(x: number, y: number, w: number, h: number): void;
  roundRect(
    x: number,
    y: number,
    w: number,
    h: number,
    radii?: number | DOMPointInit | $ReadOnlyArray<number | DOMPointInit>
  ): void;
  strokeRect(x: number, y: number, w: number, h: number): void;

  // path API
  beginPath(): void;
  fill(fillRule?: CanvasFillRule): void;
  fill(path: Path2D, fillRule?: CanvasFillRule): void;
  stroke(): void;
  stroke(path: Path2D): void;
  drawFocusIfNeeded(element: Element): void;
  drawFocusIfNeeded(path: Path2D, element: Element): void;
  scrollPathIntoView(): void;
  scrollPathIntoView(path: Path2D): void;
  clip(fillRule?: CanvasFillRule): void;
  clip(path: Path2D, fillRule?: CanvasFillRule): void;
  resetClip(): void;
  isPointInPath(x: number, y: number, fillRule?: CanvasFillRule): boolean;
  isPointInPath(
    path: Path2D,
    x: number,
    y: number,
    fillRule?: CanvasFillRule
  ): boolean;
  isPointInStroke(x: number, y: number): boolean;
  isPointInStroke(path: Path2D, x: number, y: number): boolean;

  // text (see also the CanvasDrawingStyles interface)
  fillText(text: string, x: number, y: number, maxWidth?: number): void;
  strokeText(text: string, x: number, y: number, maxWidth?: number): void;
  measureText(text: string): TextMetrics;

  // drawing images
  drawImage(image: CanvasImageSource, dx: number, dy: number): void;
  drawImage(
    image: CanvasImageSource,
    dx: number,
    dy: number,
    dw: number,
    dh: number
  ): void;
  drawImage(
    image: CanvasImageSource,
    sx: number,
    sy: number,
    sw: number,
    sh: number,
    dx: number,
    dy: number,
    dw: number,
    dh: number
  ): void;

  // hit regions
  addHitRegion(options?: HitRegionOptions): void;
  removeHitRegion(id: string): void;
  clearHitRegions(): void;

  // pixel manipulation
  createImageData(sw: number, sh: number): ImageData;
  createImageData(imagedata: ImageData): ImageData;
  getImageData(sx: number, sy: number, sw: number, sh: number): ImageData;
  putImageData(imagedata: ImageData, dx: number, dy: number): void;
  putImageData(
    imagedata: ImageData,
    dx: number,
    dy: number,
    dirtyX: number,
    dirtyY: number,
    dirtyWidth: number,
    dirtyHeight: number
  ): void;

  // CanvasDrawingStyles
  // line caps/joins
  lineWidth: number;
  lineCap: string;
  lineJoin: string;
  miterLimit: number;

  // dashed lines
  setLineDash(segments: Array<number>): void;
  getLineDash(): Array<number>;
  lineDashOffset: number;

  // text
  font: string;
  textAlign: string;
  textBaseline: string;
  direction: string;

  // CanvasPathMethods
  // shared path API methods
  closePath(): void;
  moveTo(x: number, y: number): void;
  lineTo(x: number, y: number): void;
  quadraticCurveTo(cpx: number, cpy: number, x: number, y: number): void;
  bezierCurveTo(
    cp1x: number,
    cp1y: number,
    cp2x: number,
    cp2y: number,
    x: number,
    y: number
  ): void;
  arcTo(x1: number, y1: number, x2: number, y2: number, radius: number): void;
  arcTo(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    radiusX: number,
    radiusY: number,
    rotation: number
  ): void;
  rect(x: number, y: number, w: number, h: number): void;
  arc(
    x: number,
    y: number,
    radius: number,
    startAngle: number,
    endAngle: number,
    anticlockwise?: boolean
  ): void;
  ellipse(
    x: number,
    y: number,
    radiusX: number,
    radiusY: number,
    rotation: number,
    startAngle: number,
    endAngle: number,
    anticlockwise?: boolean
  ): void;
}

// http://www.w3.org/TR/html5/scripting-1.html#renderingcontext
type RenderingContext = CanvasRenderingContext2D | WebGLRenderingContext;

// https://www.w3.org/TR/html5/scripting-1.html#htmlcanvaselement
declare class HTMLCanvasElement extends HTMLElement {
  tagName: 'CANVAS';
  width: number;
  height: number;
  getContext(contextId: '2d', ...args: any): CanvasRenderingContext2D;
  getContext(
    contextId: 'webgl',
    contextAttributes?: Partial<WebGLContextAttributes>
  ): ?WebGLRenderingContext;
  // IE currently only supports "experimental-webgl"
  getContext(
    contextId: 'experimental-webgl',
    contextAttributes?: Partial<WebGLContextAttributes>
  ): ?WebGLRenderingContext;
  getContext(contextId: string, ...args: any): ?RenderingContext; // fallback
  toDataURL(type?: string, ...args: any): string;
  toBlob(callback: (v: File) => void, type?: string, ...args: any): void;
  captureStream(frameRate?: number): CanvasCaptureMediaStream;
}

// https://html.spec.whatwg.org/multipage/forms.html#the-details-element
declare class HTMLDetailsElement extends HTMLElement {
  tagName: 'DETAILS';
  open: boolean;
}

declare class HTMLFormElement extends HTMLElement {
  tagName: 'FORM';
  @@iterator(): Iterator<HTMLElement>;
  [index: number | string]: HTMLElement | null;
  acceptCharset: string;
  action: string;
  elements: HTMLCollection<HTMLElement>;
  encoding: string;
  enctype: string;
  length: number;
  method: string;
  name: string;
  rel: string;
  target: string;

  checkValidity(): boolean;
  reportValidity(): boolean;
  reset(): void;
  submit(): void;
}

// https://www.w3.org/TR/html5/forms.html#the-fieldset-element
declare class HTMLFieldSetElement extends HTMLElement {
  tagName: 'FIELDSET';
  disabled: boolean;
  elements: HTMLCollection<HTMLElement>; // readonly
  form: HTMLFormElement | null; // readonly
  name: string;
  type: string; // readonly

  checkValidity(): boolean;
  setCustomValidity(error: string): void;
}

declare class HTMLLegendElement extends HTMLElement {
  tagName: 'LEGEND';
  form: HTMLFormElement | null; // readonly
}

declare class HTMLIFrameElement extends HTMLElement {
  tagName: 'IFRAME';
  allowFullScreen: boolean;
  contentDocument: Document;
  contentWindow: any;
  frameBorder: string;
  height: string;
  marginHeight: string;
  marginWidth: string;
  name: string;
  scrolling: string;
  sandbox: DOMTokenList;
  src: string;
  // flowlint unsafe-getters-setters:off
  get srcdoc(): string;
  set srcdoc(value: string | TrustedHTML): void;
  // flowlint unsafe-getters-setters:error
  width: string;
}

declare class HTMLImageElement extends HTMLElement {
  tagName: 'IMG';
  alt: string;
  complete: boolean; // readonly
  crossOrigin: ?string;
  currentSrc: string; // readonly
  height: number;
  decode(): Promise<void>;
  isMap: boolean;
  naturalHeight: number; // readonly
  naturalWidth: number; // readonly
  sizes: string;
  src: string;
  srcset: string;
  useMap: string;
  width: number;
}

declare class Image extends HTMLImageElement {
  constructor(width?: number, height?: number): void;
}

declare class MediaError {
  MEDIA_ERR_ABORTED: number;
  MEDIA_ERR_NETWORK: number;
  MEDIA_ERR_DECODE: number;
  MEDIA_ERR_SRC_NOT_SUPPORTED: number;
  code: number;
  message: ?string;
}

declare class TimeRanges {
  length: number;
  start(index: number): number;
  end(index: number): number;
}

declare class Audio extends HTMLAudioElement {
  constructor(URLString?: string): void;
}

declare class AudioTrack {
  id: string;
  kind: string;
  label: string;
  language: string;
  enabled: boolean;
}

declare class AudioTrackList extends EventTarget {
  length: number;
  [index: number]: AudioTrack;

  getTrackById(id: string): ?AudioTrack;

  onchange: (ev: any) => any;
  onaddtrack: (ev: any) => any;
  onremovetrack: (ev: any) => any;
}

declare class VideoTrack {
  id: string;
  kind: string;
  label: string;
  language: string;
  selected: boolean;
}

declare class VideoTrackList extends EventTarget {
  length: number;
  [index: number]: VideoTrack;
  getTrackById(id: string): ?VideoTrack;
  selectedIndex: number;

  onchange: (ev: any) => any;
  onaddtrack: (ev: any) => any;
  onremovetrack: (ev: any) => any;
}

declare class TextTrackCue extends EventTarget {
  constructor(startTime: number, endTime: number, text: string): void;

  track: TextTrack;
  id: string;
  startTime: number;
  endTime: number;
  pauseOnExit: boolean;
  vertical: string;
  snapToLines: boolean;
  lines: number;
  position: number;
  size: number;
  align: string;
  text: string;

  getCueAsHTML(): Node;
  onenter: (ev: any) => any;
  onexit: (ev: any) => any;
}

declare class TextTrackCueList {
  @@iterator(): Iterator<TextTrackCue>;
  length: number;
  [index: number]: TextTrackCue;
  getCueById(id: string): ?TextTrackCue;
}

declare class TextTrack extends EventTarget {
  kind: string;
  label: string;
  language: string;

  mode: string;

  cues: TextTrackCueList;
  activeCues: TextTrackCueList;

  addCue(cue: TextTrackCue): void;
  removeCue(cue: TextTrackCue): void;

  oncuechange: (ev: any) => any;
}

declare class TextTrackList extends EventTarget {
  length: number;
  [index: number]: TextTrack;

  onaddtrack: (ev: any) => any;
  onremovetrack: (ev: any) => any;
}

declare class HTMLMediaElement extends HTMLElement {
  // error state
  error: ?MediaError;

  // network state
  src: string;
  srcObject: ?any;
  currentSrc: string;
  crossOrigin: ?string;
  NETWORK_EMPTY: number;
  NETWORK_IDLE: number;
  NETWORK_LOADING: number;
  NETWORK_NO_SOURCE: number;
  networkState: number;
  preload: string;
  buffered: TimeRanges;
  load(): void;
  canPlayType(type: string): string;

  // ready state
  HAVE_NOTHING: number;
  HAVE_METADATA: number;
  HAVE_CURRENT_DATA: number;
  HAVE_FUTURE_DATA: number;
  HAVE_ENOUGH_DATA: number;
  readyState: number;
  seeking: boolean;

  // playback state
  currentTime: number;
  duration: number;
  startDate: Date;
  paused: boolean;
  defaultPlaybackRate: number;
  playbackRate: number;
  played: TimeRanges;
  seekable: TimeRanges;
  ended: boolean;
  autoplay: boolean;
  loop: boolean;
  play(): Promise<void>;
  pause(): void;
  fastSeek(): void;
  captureStream(): MediaStream;

  // media controller
  mediaGroup: string;
  controller: ?any;

  // controls
  controls: boolean;
  volume: number;
  muted: boolean;
  defaultMuted: boolean;
  controlsList?: DOMTokenList;

  // tracks
  audioTracks: AudioTrackList;
  videoTracks: VideoTrackList;
  textTracks: TextTrackList;
  addTextTrack(kind: string, label?: string, language?: string): TextTrack;

  // media keys
  mediaKeys?: ?MediaKeys;
  setMediakeys?: (mediakeys: ?MediaKeys) => Promise<?MediaKeys>;
}

declare class HTMLAudioElement extends HTMLMediaElement {
  tagName: 'AUDIO';
}

declare class HTMLVideoElement extends HTMLMediaElement {
  tagName: 'VIDEO';
  width: number;
  height: number;
  videoWidth: number;
  videoHeight: number;
  poster: string;
}

declare class HTMLSourceElement extends HTMLElement {
  tagName: 'SOURCE';
  src: string;
  type: string;

  //when used with the picture element
  srcset: string;
  sizes: string;
  media: string;
}

declare class ValidityState {
  badInput: boolean;
  customError: boolean;
  patternMismatch: boolean;
  rangeOverflow: boolean;
  rangeUnderflow: boolean;
  stepMismatch: boolean;
  tooLong: boolean;
  tooShort: boolean;
  typeMismatch: boolean;
  valueMissing: boolean;
  valid: boolean;
}

// https://w3c.github.io/html/sec-forms.html#dom-selectionapielements-setselectionrange
type SelectionDirection = 'backward' | 'forward' | 'none';
type SelectionMode = 'select' | 'start' | 'end' | 'preserve';
declare class HTMLInputElement extends HTMLElement {
  tagName: 'INPUT';
  accept: string;
  align: string;
  alt: string;
  autocomplete: string;
  autofocus: boolean;
  border: string;
  checked: boolean;
  complete: boolean;
  defaultChecked: boolean;
  defaultValue: string;
  dirname: string;
  disabled: boolean;
  dynsrc: string;
  files: FileList;
  form: HTMLFormElement | null;
  formAction: string;
  formEncType: string;
  formMethod: string;
  formNoValidate: boolean;
  formTarget: string;
  height: string;
  hspace: number;
  indeterminate: boolean;
  labels: NodeList<HTMLLabelElement>;
  list: HTMLElement | null;
  loop: number;
  lowsrc: string;
  max: string;
  maxLength: number;
  min: string;
  multiple: boolean;
  name: string;
  pattern: string;
  placeholder: string;
  readOnly: boolean;
  required: boolean;
  selectionDirection: SelectionDirection;
  selectionEnd: number;
  selectionStart: number;
  size: number;
  src: string;
  start: string;
  status: boolean;
  step: string;
  type: string;
  useMap: string;
  validationMessage: string;
  validity: ValidityState;
  value: string;
  valueAsDate: Date;
  valueAsNumber: number;
  vrml: string;
  vspace: number;
  width: string;
  willValidate: boolean;
  popoverTargetElement: Element | null;
  popoverTargetAction: 'toggle' | 'show' | 'hide';

  checkValidity(): boolean;
  reportValidity(): boolean;
  setCustomValidity(error: string): void;
  createTextRange(): TextRange;
  select(): void;
  setRangeText(
    replacement: string,
    start?: void,
    end?: void,
    selectMode?: void
  ): void;
  setRangeText(
    replacement: string,
    start: number,
    end: number,
    selectMode?: SelectionMode
  ): void;
  setSelectionRange(
    start: number,
    end: number,
    direction?: SelectionDirection
  ): void;
  showPicker(): void;
  stepDown(stepDecrement?: number): void;
  stepUp(stepIncrement?: number): void;
}

declare class HTMLButtonElement extends HTMLElement {
  tagName: 'BUTTON';
  autofocus: boolean;
  disabled: boolean;
  form: HTMLFormElement | null;
  labels: NodeList<HTMLLabelElement> | null;
  name: string;
  type: string;
  validationMessage: string;
  validity: ValidityState;
  value: string;
  willValidate: boolean;

  checkValidity(): boolean;
  reportValidity(): boolean;
  setCustomValidity(error: string): void;
  popoverTargetElement: Element | null;
  popoverTargetAction: 'toggle' | 'show' | 'hide';
}

// https://w3c.github.io/html/sec-forms.html#the-textarea-element
declare class HTMLTextAreaElement extends HTMLElement {
  tagName: 'TEXTAREA';
  autofocus: boolean;
  cols: number;
  dirName: string;
  disabled: boolean;
  form: HTMLFormElement | null;
  maxLength: number;
  name: string;
  placeholder: string;
  readOnly: boolean;
  required: boolean;
  rows: number;
  wrap: string;

  type: string;
  defaultValue: string;
  value: string;
  textLength: number;

  willValidate: boolean;
  validity: ValidityState;
  validationMessage: string;
  checkValidity(): boolean;
  setCustomValidity(error: string): void;

  labels: NodeList<HTMLLabelElement>;

  select(): void;
  selectionStart: number;
  selectionEnd: number;
  selectionDirection: SelectionDirection;
  setSelectionRange(
    start: number,
    end: number,
    direction?: SelectionDirection
  ): void;
}

declare class HTMLSelectElement extends HTMLElement {
  tagName: 'SELECT';
  autocomplete: string;
  autofocus: boolean;
  disabled: boolean;
  form: HTMLFormElement | null;
  labels: NodeList<HTMLLabelElement>;
  length: number;
  multiple: boolean;
  name: string;
  options: HTMLOptionsCollection;
  required: boolean;
  selectedIndex: number;
  selectedOptions: HTMLCollection<HTMLOptionElement>;
  size: number;
  type: string;
  validationMessage: string;
  validity: ValidityState;
  value: string;
  willValidate: boolean;

  add(element: HTMLElement, before?: HTMLElement): void;
  checkValidity(): boolean;
  item(index: number): HTMLOptionElement | null;
  namedItem(name: string): HTMLOptionElement | null;
  remove(index?: number): void;
  setCustomValidity(error: string): void;
}

declare class HTMLOptionsCollection extends HTMLCollection<HTMLOptionElement> {
  selectedIndex: number;
  add(
    element: HTMLOptionElement | HTMLOptGroupElement,
    before?: HTMLElement | number
  ): void;
  remove(index: number): void;
}

declare class HTMLOptionElement extends HTMLElement {
  tagName: 'OPTION';
  defaultSelected: boolean;
  disabled: boolean;
  form: HTMLFormElement | null;
  index: number;
  label: string;
  selected: boolean;
  text: string;
  value: string;
}

declare class HTMLOptGroupElement extends HTMLElement {
  tagName: 'OPTGROUP';
  disabled: boolean;
  label: string;
}

declare class HTMLAnchorElement extends HTMLElement {
  tagName: 'A';
  charset: string;
  coords: string;
  download: string;
  hash: string;
  host: string;
  hostname: string;
  href: string;
  hreflang: string;
  media: string;
  name: string;
  origin: string;
  password: string;
  pathname: string;
  port: string;
  protocol: string;
  rel: string;
  rev: string;
  search: string;
  shape: string;
  target: string;
  text: string;
  type: string;
  username: string;
}

// https://w3c.github.io/html/sec-forms.html#the-label-element
declare class HTMLLabelElement extends HTMLElement {
  tagName: 'LABEL';
  form: HTMLFormElement | null;
  htmlFor: string;
  control: HTMLElement | null;
}

declare class HTMLLinkElement extends HTMLElement {
  tagName: 'LINK';
  crossOrigin: ?('anonymous' | 'use-credentials');
  href: string;
  hreflang: string;
  media: string;
  rel: string;
  sizes: DOMTokenList;
  type: string;
  as: string;
}

declare class HTMLScriptElement extends HTMLElement {
  tagName: 'SCRIPT';
  async: boolean;
  charset: string;
  crossOrigin?: string;
  defer: boolean;
  // flowlint unsafe-getters-setters:off
  get src(): string;
  set src(value: string | TrustedScriptURL): void;
  get text(): string;
  set text(value: string | TrustedScript): void;
  // flowlint unsafe-getters-setters:error
  type: string;
}

declare class HTMLStyleElement extends HTMLElement {
  tagName: 'STYLE';
  disabled: boolean;
  media: string;
  scoped: boolean;
  sheet: ?CSSStyleSheet;
  type: string;
}

declare class HTMLParagraphElement extends HTMLElement {
  tagName: 'P';
  align: 'left' | 'center' | 'right' | 'justify'; // deprecated in HTML 4.01
}

declare class HTMLHtmlElement extends HTMLElement {
  tagName: 'HTML';
}

declare class HTMLBodyElement extends HTMLElement {
  tagName: 'BODY';
}

declare class HTMLHeadElement extends HTMLElement {
  tagName: 'HEAD';
}

declare class HTMLDivElement extends HTMLElement {
  tagName: 'DIV';
}

declare class HTMLSpanElement extends HTMLElement {
  tagName: 'SPAN';
}

declare class HTMLAppletElement extends HTMLElement {}

declare class HTMLHeadingElement extends HTMLElement {
  tagName: 'H1' | 'H2' | 'H3' | 'H4' | 'H5' | 'H6';
}

declare class HTMLHRElement extends HTMLElement {
  tagName: 'HR';
}

declare class HTMLBRElement extends HTMLElement {
  tagName: 'BR';
}

declare class HTMLDListElement extends HTMLElement {
  tagName: 'DL';
}

declare class HTMLAreaElement extends HTMLElement {
  tagName: 'AREA';
  alt: string;
  coords: string;
  shape: string;
  target: string;
  download: string;
  ping: string;
  rel: string;
  relList: DOMTokenList;
  referrerPolicy: string;
}

declare class HTMLDataElement extends HTMLElement {
  tagName: 'DATA';
  value: string;
}

declare class HTMLDataListElement extends HTMLElement {
  tagName: 'DATALIST';
  options: HTMLCollection<HTMLOptionElement>;
}

declare class HTMLDialogElement extends HTMLElement {
  tagName: 'DIALOG';
  open: boolean;
  returnValue: string;
  show(): void;
  showModal(): void;
  close(returnValue: ?string): void;
}

declare class HTMLEmbedElement extends HTMLElement {
  tagName: 'EMBED';
  src: string;
  type: string;
  width: string;
  height: string;
  getSVGDocument(): ?Document;
}

declare class HTMLMapElement extends HTMLElement {
  tagName: 'MAP';
  areas: HTMLCollection<HTMLAreaElement>;
  images: HTMLCollection<HTMLImageElement>;
  name: string;
}

declare class HTMLMeterElement extends HTMLElement {
  tagName: 'METER';
  high: number;
  low: number;
  max: number;
  min: number;
  optimum: number;
  value: number;
  labels: NodeList<HTMLLabelElement>;
}

declare class HTMLModElement extends HTMLElement {
  tagName: 'DEL' | 'INS';
  cite: string;
  dateTime: string;
}

declare class HTMLObjectElement extends HTMLElement {
  tagName: 'OBJECT';
  contentDocument: ?Document;
  contentWindow: ?WindowProxy;
  data: string;
  form: ?HTMLFormElement;
  height: string;
  name: string;
  type: string;
  typeMustMatch: boolean;
  useMap: string;
  validationMessage: string;
  validity: ValidityState;
  width: string;
  willValidate: boolean;
  checkValidity(): boolean;
  getSVGDocument(): ?Document;
  reportValidity(): boolean;
  setCustomValidity(error: string): void;
}

declare class HTMLOutputElement extends HTMLElement {
  defaultValue: string;
  form: ?HTMLFormElement;
  htmlFor: DOMTokenList;
  labels: NodeList<HTMLLabelElement>;
  name: string;
  type: string;
  validationMessage: string;
  validity: ValidityState;
  value: string;
  willValidate: boolean;
  checkValidity(): boolean;
  reportValidity(): boolean;
  setCustomValidity(error: string): void;
}

declare class HTMLParamElement extends HTMLElement {
  tagName: 'PARAM';
  name: string;
  value: string;
}

declare class HTMLProgressElement extends HTMLElement {
  tagName: 'PROGRESS';
  labels: NodeList<HTMLLabelElement>;
  max: number;
  position: number;
  value: number;
}

declare class HTMLPictureElement extends HTMLElement {
  tagName: 'PICTURE';
}

declare class HTMLTimeElement extends HTMLElement {
  tagName: 'TIME';
  dateTime: string;
}

declare class HTMLTitleElement extends HTMLElement {
  tagName: 'TITLE';
  text: string;
}

declare class HTMLTrackElement extends HTMLElement {
  tagName: 'TRACK';
  static NONE: 0;
  static LOADING: 1;
  static LOADED: 2;
  static ERROR: 3;

  default: boolean;
  kind: string;
  label: string;
  readyState: 0 | 1 | 2 | 3;
  src: string;
  srclang: string;
  track: TextTrack;
}

declare class HTMLQuoteElement extends HTMLElement {
  tagName: 'BLOCKQUOTE' | 'Q';
  cite: string;
}

declare class HTMLOListElement extends HTMLElement {
  tagName: 'OL';
  reversed: boolean;
  start: number;
  type: string;
}

declare class HTMLUListElement extends HTMLElement {
  tagName: 'UL';
}

declare class HTMLLIElement extends HTMLElement {
  tagName: 'LI';
  value: number;
}

declare class HTMLPreElement extends HTMLElement {
  tagName: 'PRE';
}

declare class HTMLMetaElement extends HTMLElement {
  tagName: 'META';
  content: string;
  httpEquiv: string;
  name: string;
}

declare class HTMLUnknownElement extends HTMLElement {}

declare class Storage {
  length: number;
  getItem(key: string): ?string;
  setItem(key: string, data: string): void;
  clear(): void;
  removeItem(key: string): void;
  key(index: number): ?string;
  [name: string]: ?string;
}

/* window */

declare type WindowProxy = any;
declare function alert(message?: any): void;
declare function prompt(message?: any, value?: any): string;
declare function close(): void;
declare function confirm(message?: string): boolean;
declare function getComputedStyle(
  elt: Element,
  pseudoElt?: string
): CSSStyleDeclaration;
declare opaque type AnimationFrameID;
declare function requestAnimationFrame(
  callback: (timestamp: number) => void
): AnimationFrameID;
declare function cancelAnimationFrame(requestId: AnimationFrameID): void;
declare opaque type IdleCallbackID;
declare function requestIdleCallback(
  cb: (deadline: {
    didTimeout: boolean,
    timeRemaining: () => number,
    ...
  }) => void,
  opts?: {timeout: number, ...}
): IdleCallbackID;
declare function cancelIdleCallback(id: IdleCallbackID): void;
declare var localStorage: Storage;
declare var devicePixelRatio: number;
declare function focus(): void;
declare function onfocus(ev: Event): any;
declare function open(
  url?: string,
  target?: string,
  features?: string,
  replace?: boolean
): any;
declare var parent: WindowProxy;
declare function print(): void;
declare var self: any;
declare var sessionStorage: Storage;
declare var top: WindowProxy;
declare function getSelection(): Selection | null;
declare var customElements: CustomElementRegistry;
declare function scroll(x: number, y: number): void;
declare function scroll(options: ScrollToOptions): void;
declare function scrollTo(x: number, y: number): void;
declare function scrollTo(options: ScrollToOptions): void;
declare function scrollBy(x: number, y: number): void;
declare function scrollBy(options: ScrollToOptions): void;

type HTMLElementTagNameMap = {
  a: HTMLAnchorElement,
  abbr: HTMLElement,
  address: HTMLElement,
  area: HTMLAreaElement,
  article: HTMLElement,
  aside: HTMLElement,
  audio: HTMLAudioElement,
  b: HTMLElement,
  base: HTMLBaseElement,
  bdi: HTMLElement,
  bdo: HTMLElement,
  blockquote: HTMLQuoteElement,
  body: HTMLBodyElement,
  br: HTMLBRElement,
  button: HTMLButtonElement,
  canvas: HTMLCanvasElement,
  caption: HTMLTableCaptionElement,
  cite: HTMLElement,
  code: HTMLElement,
  col: HTMLTableColElement,
  colgroup: HTMLTableColElement,
  data: HTMLDataElement,
  datalist: HTMLDataListElement,
  dd: HTMLElement,
  del: HTMLModElement,
  details: HTMLDetailsElement,
  dfn: HTMLElement,
  dialog: HTMLDialogElement,
  div: HTMLDivElement,
  dl: HTMLDListElement,
  dt: HTMLElement,
  em: HTMLElement,
  embed: HTMLEmbedElement,
  fieldset: HTMLFieldSetElement,
  figcaption: HTMLElement,
  figure: HTMLElement,
  footer: HTMLElement,
  form: HTMLFormElement,
  h1: HTMLHeadingElement,
  h2: HTMLHeadingElement,
  h3: HTMLHeadingElement,
  h4: HTMLHeadingElement,
  h5: HTMLHeadingElement,
  h6: HTMLHeadingElement,
  head: HTMLHeadElement,
  header: HTMLElement,
  hgroup: HTMLElement,
  hr: HTMLHRElement,
  html: HTMLHtmlElement,
  i: HTMLElement,
  iframe: HTMLIFrameElement,
  img: HTMLImageElement,
  input: HTMLInputElement,
  ins: HTMLModElement,
  kbd: HTMLElement,
  label: HTMLLabelElement,
  legend: HTMLLegendElement,
  li: HTMLLIElement,
  link: HTMLLinkElement,
  main: HTMLElement,
  map: HTMLMapElement,
  mark: HTMLElement,
  menu: HTMLMenuElement,
  meta: HTMLMetaElement,
  meter: HTMLMeterElement,
  nav: HTMLElement,
  noscript: HTMLElement,
  object: HTMLObjectElement,
  ol: HTMLOListElement,
  optgroup: HTMLOptGroupElement,
  option: HTMLOptionElement,
  output: HTMLOutputElement,
  p: HTMLParagraphElement,
  picture: HTMLPictureElement,
  pre: HTMLPreElement,
  progress: HTMLProgressElement,
  q: HTMLQuoteElement,
  rp: HTMLElement,
  rt: HTMLElement,
  ruby: HTMLElement,
  s: HTMLElement,
  samp: HTMLElement,
  script: HTMLScriptElement,
  search: HTMLElement,
  section: HTMLElement,
  select: HTMLSelectElement,
  slot: HTMLSlotElement,
  small: HTMLElement,
  source: HTMLSourceElement,
  span: HTMLSpanElement,
  strong: HTMLElement,
  style: HTMLStyleElement,
  sub: HTMLElement,
  summary: HTMLElement,
  sup: HTMLElement,
  table: HTMLTableElement,
  tbody: HTMLTableSectionElement,
  td: HTMLTableCellElement,
  template: HTMLTemplateElement,
  textarea: HTMLTextAreaElement,
  tfoot: HTMLTableSectionElement,
  th: HTMLTableCellElement,
  thead: HTMLTableSectionElement,
  time: HTMLTimeElement,
  title: HTMLTitleElement,
  tr: HTMLTableRowElement,
  track: HTMLTrackElement,
  u: HTMLElement,
  ul: HTMLUListElement,
  var: HTMLElement,
  video: HTMLVideoElement,
  wbr: HTMLElement,
  [string]: Element,
};
