/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {
  Destination,
  Chunk,
  PrecomputedChunk,
} from './ReactServerStreamConfig';
import type {
  ReactNodeList,
  ReactContext,
  ReactConsumerType,
  Wakeable,
  Thenable,
  ReactFormState,
  ReactComponentInfo,
  ReactDebugInfo,
  ReactAsyncInfo,
  ViewTransitionProps,
  ActivityProps,
  SuspenseProps,
  SuspenseListProps,
  SuspenseListRevealOrder,
  ReactKey,
} from 'shared/ReactTypes';
import type {LazyComponent as LazyComponentType} from 'react/src/ReactLazy';
import type {
  RenderState,
  ResumableState,
  PreambleState,
  FormatContext,
  HoistableState,
} from './ReactFizzConfig';
import type {ContextSnapshot} from './ReactFizzNewContext';
import type {ComponentStackNode} from './ReactFizzComponentStack';
import type {TreeContext} from './ReactFizzTreeContext';
import type {ThenableState} from './ReactFizzThenable';

import {describeObjectForErrorMessage} from 'shared/ReactSerializationErrors';

import {
  scheduleWork,
  scheduleMicrotask,
  beginWriting,
  writeChunk,
  writeChunkAndReturn,
  completeWriting,
  flushBuffered,
  close,
  closeWithError,
  byteLengthOfChunk,
} from './ReactServerStreamConfig';
import {
  writeCompletedRoot,
  writePlaceholder,
  pushStartActivityBoundary,
  pushEndActivityBoundary,
  writeStartCompletedSuspenseBoundary,
  writeStartPendingSuspenseBoundary,
  writeStartClientRenderedSuspenseBoundary,
  writeEndCompletedSuspenseBoundary,
  writeEndPendingSuspenseBoundary,
  writeEndClientRenderedSuspenseBoundary,
  writeStartSegment,
  writeEndSegment,
  writeClientRenderBoundaryInstruction,
  writeCompletedBoundaryInstruction,
  writeCompletedSegmentInstruction,
  writeHoistablesForBoundary,
  pushTextInstance,
  pushStartInstance,
  pushEndInstance,
  pushSegmentFinale,
  getChildFormatContext,
  getSuspenseFallbackFormatContext,
  getSuspenseContentFormatContext,
  getViewTransitionFormatContext,
  writeHoistables,
  writePreambleStart,
  writePreambleEnd,
  writePostamble,
  hoistHoistables,
  createHoistableState,
  createPreambleState,
  isWorkLoopExternallyDriven,
  supportsRequestStorage,
  requestStorage,
  pushFormStateMarkerIsMatching,
  pushFormStateMarkerIsNotMatching,
  resetResumableState,
  completeResumableState,
  emitEarlyPreloads,
  bindToConsole,
  canHavePreamble,
  hoistPreambleState,
  isPreambleReady,
  isPreambleContext,
  hasSuspenseyContent,
} from './ReactFizzConfig';
import {
  constructClassInstance,
  mountClassInstance,
} from './ReactFizzClassComponent';
import {
  getMaskedContext,
  processChildContext,
  emptyContextObject,
} from './ReactFizzLegacyContext';
import {
  readContext,
  rootContextSnapshot,
  switchContext,
  getActiveContext,
  pushProvider,
  popProvider,
} from './ReactFizzNewContext';
import {
  prepareToUseHooks,
  prepareToUseThenableState,
  finishHooks,
  checkDidRenderIdHook,
  resetHooksState,
  HooksDispatcher,
  currentResumableState,
  setCurrentResumableState,
  getThenableStateAfterSuspending,
  unwrapThenable,
  readPreviousThenableFromState,
  getActionStateCount,
  getActionStateMatchingIndex,
} from './ReactFizzHooks';
import {DefaultAsyncDispatcher} from './ReactFizzAsyncDispatcher';
import {
  getStackByComponentStackNode,
  getOwnerStackByComponentStackNodeInDev,
} from './ReactFizzComponentStack';
import {emptyTreeContext, pushTreeContext} from './ReactFizzTreeContext';
import {currentTaskInDEV, setCurrentTaskInDEV} from './ReactFizzCurrentTask';
import {
  callLazyInitInDEV,
  callComponentInDEV,
  callRenderInDEV,
} from './ReactFizzCallUserSpace';
import {
  getViewTransitionClassName,
  getViewTransitionName,
} from './ReactFizzViewTransitionComponent';

import {resetOwnerStackLimit} from 'shared/ReactOwnerStackReset';
import {
  getIteratorFn,
  ASYNC_ITERATOR,
  REACT_ELEMENT_TYPE,
  REACT_PORTAL_TYPE,
  REACT_LAZY_TYPE,
  REACT_SUSPENSE_TYPE,
  REACT_LEGACY_HIDDEN_TYPE,
  REACT_STRICT_MODE_TYPE,
  REACT_PROFILER_TYPE,
  REACT_SUSPENSE_LIST_TYPE,
  REACT_FRAGMENT_TYPE,
  REACT_FORWARD_REF_TYPE,
  REACT_MEMO_TYPE,
  REACT_CONTEXT_TYPE,
  REACT_CONSUMER_TYPE,
  REACT_SCOPE_TYPE,
  REACT_VIEW_TRANSITION_TYPE,
  REACT_ACTIVITY_TYPE,
  REACT_OPTIMISTIC_KEY,
} from 'shared/ReactSymbols';
import ReactSharedInternals from 'shared/ReactSharedInternals';
import {
  disableLegacyContext,
  disableLegacyContextForFunctionComponents,
  enableScopeAPI,
  enableAsyncIterableChildren,
  enableViewTransition,
  enableFizzBlockingRender,
  enableAsyncDebugInfo,
  enableCPUSuspense,
} from 'shared/ReactFeatureFlags';

import assign from 'shared/assign';
import noop from 'shared/noop';
import getComponentNameFromType from 'shared/getComponentNameFromType';
import isArray from 'shared/isArray';
import {
  SuspenseException,
  getSuspendedThenable,
  ensureSuspendableThenableStateDEV,
  getSuspendedCallSiteStackDEV,
  getSuspendedCallSiteDebugTaskDEV,
  setCaptureSuspendedCallSiteDEV,
} from './ReactFizzThenable';

// Linked list representing the identity of a component given the component/tag name and key.
// The name might be minified but we assume that it's going to be the same generated name. Typically
// because it's just the same compiled output in practice.
export type KeyNode = [
  Root | KeyNode /* parent */,
  string | null /* name */,
  string | number /* key */,
];

type ResumeSlots =
  | null // nothing to resume
  | number // resume with segment ID at the root position
  | {[index: number]: number}; // resume with segmentID at the index

type ReplaySuspenseBoundary = [
  string | null /* name */,
  string | number /* key */,
  Array<ReplayNode> /* content keyed children */,
  ResumeSlots /* content resumable slots */,
  null | ReplayNode /* fallback content */,
  number /* rootSegmentID */,
];

type ReplayNode =
  | [
      string | null /* name */,
      string | number /* key */,
      Array<ReplayNode> /* keyed children */,
      ResumeSlots /* resumable slots */,
    ]
  | ReplaySuspenseBoundary;

type PostponedHoles = {
  workingMap: Map<KeyNode, ReplayNode>,
  rootNodes: Array<ReplayNode>,
  rootSlots: ResumeSlots,
};

type LegacyContext = {
  [key: string]: any,
};

type SuspenseListRow = {
  pendingTasks: number, // The number of tasks, previous rows and inner suspense boundaries blocking this row.
  boundaries: null | Array<SuspenseBoundary>, // The boundaries in this row waiting to be unblocked by the previous row. (null means this row is not blocked)
  hoistables: HoistableState, // Any dependencies that this row depends on. Future rows need to also depend on it.
  inheritedHoistables: null | HoistableState, // Any dependencies that previous row depend on, that new boundaries of this row needs.
  together: boolean, // All the boundaries within this row must be revealed together.
  next: null | SuspenseListRow, // The next row blocked by this one.
};

const CLIENT_RENDERED = 4; // if it errors or infinitely suspends

type SuspenseBoundary = {
  status: 0 | 1 | 4 | 5,
  rootSegmentID: number,
  parentFlushed: boolean,
  pendingTasks: number, // when it reaches zero we can show this boundary's content
  row: null | SuspenseListRow, // the row that this boundary blocks from completing.
  completedSegments: Array<Segment>, // completed but not yet flushed segments.
  byteSize: number, // used to determine whether to inline children boundaries.
  defer: boolean, // never inline deferred boundaries
  fallbackAbortableTasks: Set<Task>, // used to cancel task on the fallback if the boundary completes or gets canceled.
  contentState: HoistableState,
  fallbackState: HoistableState,
  preamble: null | Preamble,
  tracked: null | {
    contentKeyPath: null | KeyNode, // used to track the path for replay nodes
    fallbackNode: null | ReplayNode, // used to track the fallback for replay nodes
  },
  errorDigest: ?string, // the error hash if it errors
  // DEV-only fields
  errorMessage?: null | string, // the error string if it errors
  errorStack?: null | string, // the error stack if it errors
  errorComponentStack?: null | string, // the error component stack if it errors
};

type Ping = {
  resolve: () => void,
  reject: (error: mixed) => void,
};

type RenderTask = {
  replay: null,
  node: ReactNodeList,
  childIndex: number,
  ping: Ping,
  blockedBoundary: Root | SuspenseBoundary,
  blockedSegment: Segment, // the segment we'll write to
  blockedPreamble: null | PreambleState,
  hoistableState: null | HoistableState, // Boundary state we'll mutate while rendering. This may not equal the state of the blockedBoundary
  abortSet: Set<Task>, // the abortable set that this task belongs to
  keyPath: Root | KeyNode, // the path of all parent keys currently rendering
  formatContext: FormatContext, // the format's specific context (e.g. HTML/SVG/MathML)
  context: ContextSnapshot, // the current new context that this task is executing in
  treeContext: TreeContext, // the current tree context that this task is executing in
  row: null | SuspenseListRow, // the current SuspenseList row that this is rendering inside
  componentStack: null | ComponentStackNode, // stack frame description of the currently rendering component
  thenableState: null | ThenableState,
  legacyContext: LegacyContext, // the current legacy context that this task is executing in
  debugTask: null | ConsoleTask, // DEV only
  // DON'T ANY MORE FIELDS. We at 16 in prod already which otherwise requires converting to a constructor.
  // Consider splitting into multiple objects or consolidating some fields.
};

type ReplaySet = {
  nodes: Array<ReplayNode>, // the possible paths to follow down the replaying
  slots: ResumeSlots, // slots to resume
  pendingTasks: number, // tracks the number of tasks currently tracking this set of nodes
  // if pending tasks reach zero but there are still nodes left, it means we couldn't find
  // them all in the tree, so we need to abort and client render the boundary.
};

type ReplayTask = {
  replay: ReplaySet,
  node: ReactNodeList,
  childIndex: number,
  ping: Ping,
  blockedBoundary: Root | SuspenseBoundary,
  blockedSegment: null, // we don't write to anything when we replay
  blockedPreamble: null,
  hoistableState: null | HoistableState, // Boundary state we'll mutate while rendering. This may not equal the state of the blockedBoundary
  abortSet: Set<Task>, // the abortable set that this task belongs to
  keyPath: Root | KeyNode, // the path of all parent keys currently rendering
  formatContext: FormatContext, // the format's specific context (e.g. HTML/SVG/MathML)
  context: ContextSnapshot, // the current new context that this task is executing in
  treeContext: TreeContext, // the current tree context that this task is executing in
  row: null | SuspenseListRow, // the current SuspenseList row that this is rendering inside
  componentStack: null | ComponentStackNode, // stack frame description of the currently rendering component
  thenableState: null | ThenableState,
  legacyContext: LegacyContext, // the current legacy context that this task is executing in
  debugTask: null | ConsoleTask, // DEV only
};

export type Task = RenderTask | ReplayTask;

const PENDING = 0;
const COMPLETED = 1;
const FLUSHED = 2;
const ABORTED = 3;
const ERRORED = 4;
const POSTPONED = 5;

type Root = null;

type Segment = {
  status: 0 | 1 | 2 | 3 | 4 | 5,
  parentFlushed: boolean, // typically a segment will be flushed by its parent, except if its parent was already flushed
  id: number, // starts as 0 and is lazily assigned if the parent flushes early
  +index: number, // the index within the parent's chunks or 0 at the root
  +chunks: Array<Chunk | PrecomputedChunk>,
  +children: Array<Segment>,
  +preambleChildren: Array<Segment>,
  // The context that this segment was created in.
  parentFormatContext: FormatContext,
  // If this segment represents a fallback, this is the content that will replace that fallback.
  boundary: null | SuspenseBoundary,
  // used to discern when text separator boundaries are needed
  lastPushedText: boolean,
  textEmbedded: boolean,
};

// The ordering of these statuses matters. OPENING and OPEN are the only
// statuses in which newly scheduled work may be performed. Any status greater
// than OPEN represents a request that no longer admits work.
const OPENING = 10;
const OPEN = 11;
const CLOSING = 12;
const CLOSED = 13;
const STALLED_DEV = 14;

export opaque type Request = {
  destination: null | Destination,
  flushScheduled: boolean,
  +resumableState: ResumableState,
  +renderState: RenderState,
  +rootFormatContext: FormatContext,
  +progressiveChunkSize: number,
  status: 10 | 11 | 12 | 13 | 14,
  fatalError: mixed,
  aborted: boolean,
  nextSegmentId: number,
  allPendingTasks: number, // when it reaches zero, we can close the connection.
  pendingRootTasks: number, // when this reaches zero, we've finished at least the root boundary.
  completedRootSegment: null | Segment, // Completed but not yet flushed root segments.
  completedPreambleSegments: null | Array<Array<Segment>>, // contains the ready-to-flush segments that make up the preamble
  byteSize: number, // counts the number of bytes accumulated in the shell
  abortableTasks: Set<Task>,
  pingedTasks: Array<Task>, // High priority tasks that should be worked on first.
  currentTask: null | Task, // The task currently executing in this request.
  // Queues to flush in order of priority
  clientRenderedBoundaries: Array<SuspenseBoundary>, // Errored or client rendered but not yet flushed.
  completedBoundaries: Array<SuspenseBoundary>, // Completed but not yet fully flushed boundaries to show.
  partialBoundaries: Array<SuspenseBoundary>, // Partially completed boundaries that can flush its segments early.
  trackedPostpones: null | PostponedHoles, // Gets set to non-null while we want to track postponed holes. I.e. during a prerender.
  // While prerendering a postponed request that produced a real shell, this
  // holds the PostponedState returned by getPostponedState. getPostponedState
  // snapshots nextSegmentId before the (pull-driven) prelude flush runs, but the
  // flush outlines completed boundaries and advances nextSegmentId past that
  // snapshot. We finalize the snapshot from flushCompletedQueues so the resumed
  // render allocates segment ids strictly above the shell's; otherwise the shell
  // and resume emit duplicate B:/S: ids once concatenated. Stays null for live
  // renders and resumes.
  postponedState: null | PostponedState,
  // onError is called when an error happens anywhere in the tree. It might recover.
  // The return string is used in production  primarily to avoid leaking internals, secondarily to save bytes.
  // Returning null/undefined will cause a default error message in production
  onError: (error: mixed, errorInfo: ThrownInfo) => ?string,
  // onAllReady is called when all pending task is done but it may not have flushed yet.
  // This is a good time to start writing if you want only HTML and no intermediate steps.
  onAllReady: () => void,
  // onShellReady is called when there is at least a root fallback ready to show.
  // Typically you don't need this callback because it's best practice to always have a
  // root fallback ready so there's no need to wait.
  onShellReady: () => void,
  // onShellError is called when the shell didn't complete. That means you probably want to
  // emit a different response to the stream instead.
  onShellError: (error: mixed) => void,
  onFatalError: (error: mixed) => void,
  // Form state that was the result of an MPA submission, if it was provided.
  formState: null | ReactFormState<any, any>,
  // DEV-only, warning dedupe
  didWarnForKey?: null | WeakSet<ComponentStackNode>,
};

type Preamble = {
  content: PreambleState,
  fallback: PreambleState,
};

function createPreamble(): Preamble {
  return {
    content: createPreambleState(),
    fallback: createPreambleState(),
  };
}

// This is a default heuristic for how to split up the HTML content into progressive
// loading. Our goal is to be able to display additional new content about every 500ms.
// Faster than that is unnecessary and should be throttled on the client. It also
// adds unnecessary overhead to do more splits. We don't know if it's a higher or lower
// end device but higher end suffer less from the overhead than lower end does from
// not getting small enough pieces. We error on the side of low end.
// We base this on low end 3G speeds which is about 500kbits per second. We assume
// that there can be a reasonable drop off from max bandwidth which leaves you with
// as little as 80%. We can receive half of that each 500ms - at best. In practice,
// a little bandwidth is lost to processing and contention - e.g. CSS and images that
// are downloaded along with the main content. So we estimate about half of that to be
// the lower end throughput. In other words, we expect that you can at least show
// about 12.5kb of content per 500ms. Not counting starting latency for the first
// paint.
// 500 * 1024 / 8 * .8 * 0.5 / 2
const DEFAULT_PROGRESSIVE_CHUNK_SIZE = 12800;

function getBlockingRenderMaxSize(request: Request): number {
  // We want to make sure that we can block the reveal of a well designed complete
  // shell but if you have constructed a too large shell (e.g. by not adding any
  // Suspense boundaries) then that might take too long to render. We shouldn't
  // punish users (or overzealous metrics tracking) in that scenario.
  // There's a trade off here. If this limit is too low then you can't fit a
  // reasonably well built UI within it without getting errors. If it's too high
  // then things that accidentally fall below it might take too long to load.
  // Web Vitals target 1.8 seconds for first paint and our goal to have the limit
  // be fast enough to hit that. For this argument we assume that most external
  // resources are already cached because it's a return visit, or inline styles.
  // If it's not, then it's highly unlikely that any render blocking instructions
  // we add has any impact what so ever on the paint.
  // Assuming a first byte of about 600ms which is kind of bad but common with a
  // decent static host. If it's longer e.g. due to dynamic rendering, then you
  // are going to bound by dynamic production of the content and you're better off
  // with Suspense boundaries anyway. This number doesn't matter much. Then you
  // have about 1.2 seconds left for bandwidth. On 3G that gives you about 112.5kb
  // worth of data. That's worth about 10x in terms of uncompressed bytes. Then we
  // half that just to account for longer latency, slower bandwidth and CPU processing.
  // Now we're down to about 500kb. In fact, looking at metrics we've collected with
  // rel="expect" examples and other documents, the impact on documents smaller than
  // that is within the noise. That's because there's enough happening within that
  // start up to not make HTML streaming not significantly better.
  // Content above the fold tends to be about 100-200kb tops. Therefore 500kb should
  // be enough head room for a good loading state. After that you should use
  // Suspense or SuspenseList to improve it.
  // Since this is highly related to the reason you would adjust the
  // progressiveChunkSize option, and always has to be higher, we define this limit
  // in terms of it. So if you want to increase the limit because you have high
  // bandwidth users, then you can adjust it up. If you are concerned about even
  // slower bandwidth then you can adjust it down.
  return request.progressiveChunkSize * 40; // 512kb by default.
}

function isEligibleForOutlining(
  request: Request,
  boundary: SuspenseBoundary,
): boolean {
  // For very small boundaries, don't bother producing a fallback for outlining.
  // The larger this limit is, the more we can save on preparing fallbacks in case we end up
  // outlining.
  return (
    (boundary.byteSize > 500 ||
      hasSuspenseyContent(boundary.contentState, /* flushingInShell */ false) ||
      boundary.defer) &&
    // For boundaries that can possibly contribute to the preamble we don't want to outline
    // them regardless of their size since the fallbacks should only be emitted if we've
    // errored the boundary.
    boundary.preamble === null
  );
}

function defaultErrorHandler(error: mixed) {
  if (
    typeof error === 'object' &&
    error !== null &&
    typeof error.environmentName === 'string'
  ) {
    // This was a Server error. We print the environment name in a badge just like we do with
    // replays of console logs to indicate that the source of this throw as actually the Server.
    bindToConsole('error', [error], error.environmentName)();
  } else {
    console['error'](error); // Don't transform to our wrapper
  }
  return null;
}

function RequestInstance(
  this: $FlowFixMe,
  resumableState: ResumableState,
  renderState: RenderState,
  rootFormatContext: FormatContext,
  progressiveChunkSize: void | number,
  onError: void | ((error: mixed, errorInfo: ErrorInfo) => ?string),
  onAllReady: void | (() => void),
  onShellReady: void | (() => void),
  onShellError: void | ((error: mixed) => void),
  onFatalError: void | ((error: mixed) => void),
  formState: void | null | ReactFormState<any, any>,
) {
  const pingedTasks: Array<Task> = [];
  const abortSet: Set<Task> = new Set();
  this.destination = null;
  this.flushScheduled = false;
  this.resumableState = resumableState;
  this.renderState = renderState;
  this.rootFormatContext = rootFormatContext;
  this.progressiveChunkSize =
    progressiveChunkSize === undefined
      ? DEFAULT_PROGRESSIVE_CHUNK_SIZE
      : progressiveChunkSize;
  // $FlowFixMe[constant-condition]
  this.status = isWorkLoopExternallyDriven ? OPEN : OPENING;
  this.fatalError = null;
  this.aborted = false;
  this.nextSegmentId = 0;
  this.allPendingTasks = 0;
  this.pendingRootTasks = 0;
  this.completedRootSegment = null;
  this.completedPreambleSegments = null;
  this.byteSize = 0;
  this.abortableTasks = abortSet;
  this.pingedTasks = pingedTasks;
  this.currentTask = null;
  this.clientRenderedBoundaries = [] as Array<SuspenseBoundary>;
  this.completedBoundaries = [] as Array<SuspenseBoundary>;
  this.partialBoundaries = [] as Array<SuspenseBoundary>;
  this.trackedPostpones = null;
  this.postponedState = null;
  this.onError = onError === undefined ? defaultErrorHandler : onError;
  this.onAllReady = onAllReady === undefined ? noop : onAllReady;
  this.onShellReady = onShellReady === undefined ? noop : onShellReady;
  this.onShellError = onShellError === undefined ? noop : onShellError;
  this.onFatalError = onFatalError === undefined ? noop : onFatalError;
  this.formState = formState === undefined ? null : formState;
  if (__DEV__) {
    this.didWarnForKey = null;
  }
}

export function createRequest(
  children: ReactNodeList,
  resumableState: ResumableState,
  renderState: RenderState,
  rootFormatContext: FormatContext,
  progressiveChunkSize: void | number,
  onError: void | ((error: mixed, errorInfo: ErrorInfo) => ?string),
  onAllReady: void | (() => void),
  onShellReady: void | (() => void),
  onShellError: void | ((error: mixed) => void),
  onFatalError: void | ((error: mixed) => void),
  formState: void | null | ReactFormState<any, any>,
): Request {
  if (__DEV__) {
    resetOwnerStackLimit();
  }

  // $FlowFixMe[invalid-constructor]: the shapes are exact here but Flow doesn't like constructors
  const request: Request = new RequestInstance(
    resumableState,
    renderState,
    rootFormatContext,
    progressiveChunkSize,
    onError,
    onAllReady,
    onShellReady,
    onShellError,
    onFatalError,
    formState,
  );

  // This segment represents the root fallback.
  const rootSegment = createPendingSegment(
    request,
    0,
    null,
    rootFormatContext,
    // Root segments are never embedded in Text on either edge
    false,
    false,
  );
  // There is no parent so conceptually, we're unblocked to flush this segment.
  rootSegment.parentFlushed = true;
  const rootTask = createRenderTask(
    request,
    null,
    children,
    -1,
    null,
    rootSegment,
    null,
    null,
    request.abortableTasks,
    null,
    rootFormatContext,
    rootContextSnapshot,
    emptyTreeContext,
    null,
    null,
    emptyContextObject,
    null,
  );
  pushComponentStack(rootTask);
  request.pingedTasks.push(rootTask);
  return request;
}

export function createPrerenderRequest(
  children: ReactNodeList,
  resumableState: ResumableState,
  renderState: RenderState,
  rootFormatContext: FormatContext,
  progressiveChunkSize: void | number,
  onError: void | ((error: mixed, errorInfo: ErrorInfo) => ?string),
  onAllReady: void | (() => void),
  onShellReady: void | (() => void),
  onShellError: void | ((error: mixed) => void),
  onFatalError: void | ((error: mixed) => void),
): Request {
  const request = createRequest(
    children,
    resumableState,
    renderState,
    rootFormatContext,
    progressiveChunkSize,
    onError,
    onAllReady,
    onShellReady,
    onShellError,
    onFatalError,
    undefined,
  );
  // Start tracking postponed holes during this render.
  request.trackedPostpones = {
    workingMap: new Map(),
    rootNodes: [],
    rootSlots: null,
  };
  return request;
}

export function resumeRequest(
  children: ReactNodeList,
  postponedState: PostponedState,
  renderState: RenderState,
  onError: void | ((error: mixed, errorInfo: ErrorInfo) => ?string),
  onAllReady: void | (() => void),
  onShellReady: void | (() => void),
  onShellError: void | ((error: mixed) => void),
  onFatalError: void | ((error: mixed) => void),
): Request {
  if (__DEV__) {
    resetOwnerStackLimit();
  }

  // $FlowFixMe[invalid-constructor]: the shapes are exact here but Flow doesn't like constructors
  const request: Request = new RequestInstance(
    postponedState.resumableState,
    renderState,
    postponedState.rootFormatContext,
    postponedState.progressiveChunkSize,
    onError,
    onAllReady,
    onShellReady,
    onShellError,
    onFatalError,
    null,
  );
  request.nextSegmentId = postponedState.nextSegmentId;

  if (typeof postponedState.replaySlots === 'number') {
    // We have a resume slot at the very root. This is effectively just a full rerender.
    const rootSegment = createPendingSegment(
      request,
      0,
      null,
      postponedState.rootFormatContext,
      // Root segments are never embedded in Text on either edge
      false,
      false,
    );
    // There is no parent so conceptually, we're unblocked to flush this segment.
    rootSegment.parentFlushed = true;
    const rootTask = createRenderTask(
      request,
      null,
      children,
      -1,
      null,
      rootSegment,
      null,
      null,
      request.abortableTasks,
      null,
      postponedState.rootFormatContext,
      rootContextSnapshot,
      emptyTreeContext,
      null,
      null,
      emptyContextObject,
      null,
    );
    pushComponentStack(rootTask);
    request.pingedTasks.push(rootTask);
    return request;
  }

  const replay: ReplaySet = {
    nodes: postponedState.replayNodes,
    slots: postponedState.replaySlots,
    pendingTasks: 0,
  };
  const rootTask = createReplayTask(
    request,
    null,
    replay,
    children,
    -1,
    null,
    null,
    request.abortableTasks,
    null,
    postponedState.rootFormatContext,
    rootContextSnapshot,
    emptyTreeContext,
    null,
    null,
    emptyContextObject,
    null,
  );
  pushComponentStack(rootTask);
  request.pingedTasks.push(rootTask);
  return request;
}

export function resumeAndPrerenderRequest(
  children: ReactNodeList,
  postponedState: PostponedState,
  renderState: RenderState,
  onError: void | ((error: mixed, errorInfo: ErrorInfo) => ?string),
  onAllReady: void | (() => void),
  onShellReady: void | (() => void),
  onShellError: void | ((error: mixed) => void),
  onFatalError: void | ((error: mixed) => void),
): Request {
  const request = resumeRequest(
    children,
    postponedState,
    renderState,
    onError,
    onAllReady,
    onShellReady,
    onShellError,
    onFatalError,
  );
  // Start tracking postponed holes during this render.
  request.trackedPostpones = {
    workingMap: new Map(),
    rootNodes: [],
    rootSlots: null,
  };
  return request;
}

let currentRequest: null | Request = null;

export function resolveRequest(): null | Request {
  if (currentRequest) return currentRequest;
  // $FlowFixMe[constant-condition]
  if (supportsRequestStorage) {
    const store = requestStorage.getStore();
    if (store) return store;
  }
  return null;
}

function pingTask(request: Request, task: Task): void {
  const pingedTasks = request.pingedTasks;
  pingedTasks.push(task);
  // $FlowFixMe[constant-condition]
  if (isWorkLoopExternallyDriven) {
    return;
  } else {
    if (request.pingedTasks.length === 1) {
      request.flushScheduled = request.destination !== null;
      if (request.trackedPostpones !== null || request.status === OPENING) {
        scheduleMicrotask(() => performWork(request));
      } else {
        scheduleWork(() => performWork(request));
      }
    }
  }
}

function pingRejectedTask(request: Request, task: Task, error: mixed): void {
  if (!request.aborted) {
    // Replaying the task is what gives ordinary render errors their complete
    // component stack.
    pingTask(request, task);
    return;
  }
  if (!task.abortSet.delete(task)) {
    // finishAbort already completed this task with the request's abort reason.
    return;
  }
  // abortTask synchronously claimed this task before abort listeners could
  // reject its wakeable. Finish it with the more specific reason before the
  // scheduled final abort uses the reason for the whole request.
  if (__DEV__) {
    finishAbortedTaskDEV(task, request, error);
  } else {
    finishAbortedTask(task, request, error);
  }
}

function createSuspenseBoundary(
  request: Request,
  row: null | SuspenseListRow,
  fallbackAbortableTasks: Set<Task>,
  preamble: null | Preamble,
  defer: boolean,
): SuspenseBoundary {
  const boundary: SuspenseBoundary = {
    status: PENDING,
    rootSegmentID: -1,
    parentFlushed: false,
    pendingTasks: 0,
    row: row,
    completedSegments: [],
    byteSize: 0,
    defer: defer,
    fallbackAbortableTasks,
    errorDigest: null,
    contentState: createHoistableState(),
    fallbackState: createHoistableState(),
    preamble,
    tracked: null,
  };
  if (__DEV__) {
    // DEV-only fields for hidden class
    boundary.errorMessage = null;
    boundary.errorStack = null;
    boundary.errorComponentStack = null;
  }
  if (row !== null) {
    // This boundary will block this row from completing.
    row.pendingTasks++;
    const blockedBoundaries = row.boundaries;
    if (blockedBoundaries !== null) {
      // Previous rows will block this boundary itself from completing.
      request.allPendingTasks++;
      boundary.pendingTasks++;
      blockedBoundaries.push(boundary);
    }
    const inheritedHoistables = row.inheritedHoistables;
    if (inheritedHoistables !== null) {
      hoistHoistables(boundary.contentState, inheritedHoistables);
    }
  }
  return boundary;
}

function createRenderTask(
  request: Request,
  thenableState: ThenableState | null,
  node: ReactNodeList,
  childIndex: number,
  blockedBoundary: Root | SuspenseBoundary,
  blockedSegment: Segment,
  blockedPreamble: null | PreambleState,
  hoistableState: null | HoistableState,
  abortSet: Set<Task>,
  keyPath: Root | KeyNode,
  formatContext: FormatContext,
  context: ContextSnapshot,
  treeContext: TreeContext,
  row: null | SuspenseListRow,
  componentStack: null | ComponentStackNode,
  legacyContext: LegacyContext,
  debugTask: null | ConsoleTask,
): RenderTask {
  request.allPendingTasks++;
  if (blockedBoundary === null) {
    request.pendingRootTasks++;
  } else {
    blockedBoundary.pendingTasks++;
  }
  if (row !== null) {
    row.pendingTasks++;
  }
  const task: RenderTask = {
    replay: null,
    node,
    childIndex,
    ping: {
      resolve: () => pingTask(request, task),
      reject: error => pingRejectedTask(request, task, error),
    },
    blockedBoundary,
    blockedSegment,
    blockedPreamble,
    hoistableState,
    abortSet,
    keyPath,
    formatContext,
    context,
    treeContext,
    row,
    componentStack,
    thenableState,
  } as any;
  if (!disableLegacyContext) {
    task.legacyContext = legacyContext;
  }
  if (__DEV__) {
    task.debugTask = debugTask;
  }
  abortSet.add(task);
  return task;
}

function createReplayTask(
  request: Request,
  thenableState: ThenableState | null,
  replay: ReplaySet,
  node: ReactNodeList,
  childIndex: number,
  blockedBoundary: Root | SuspenseBoundary,
  hoistableState: null | HoistableState,
  abortSet: Set<Task>,
  keyPath: Root | KeyNode,
  formatContext: FormatContext,
  context: ContextSnapshot,
  treeContext: TreeContext,
  row: null | SuspenseListRow,
  componentStack: null | ComponentStackNode,
  legacyContext: LegacyContext,
  debugTask: null | ConsoleTask,
): ReplayTask {
  request.allPendingTasks++;
  if (blockedBoundary === null) {
    request.pendingRootTasks++;
  } else {
    blockedBoundary.pendingTasks++;
  }
  if (row !== null) {
    row.pendingTasks++;
  }
  replay.pendingTasks++;
  const task: ReplayTask = {
    replay,
    node,
    childIndex,
    ping: {
      resolve: () => pingTask(request, task),
      reject: error => pingRejectedTask(request, task, error),
    },
    blockedBoundary,
    blockedSegment: null,
    blockedPreamble: null,
    hoistableState,
    abortSet,
    keyPath,
    formatContext,
    context,
    treeContext,
    row,
    componentStack,
    thenableState,
  } as any;
  if (!disableLegacyContext) {
    task.legacyContext = legacyContext;
  }
  if (__DEV__) {
    task.debugTask = debugTask;
  }
  abortSet.add(task);
  return task;
}

function createPendingSegment(
  request: Request,
  index: number,
  boundary: null | SuspenseBoundary,
  parentFormatContext: FormatContext,
  lastPushedText: boolean,
  textEmbedded: boolean,
): Segment {
  return {
    status: PENDING,
    parentFlushed: false,
    id: -1, // lazily assigned later
    index,
    chunks: [],
    children: [],
    preambleChildren: [],
    parentFormatContext,
    boundary,
    lastPushedText,
    textEmbedded,
  };
}

function getCurrentStackInDEV(): string {
  if (__DEV__) {
    if (currentTaskInDEV === null || currentTaskInDEV.componentStack === null) {
      return '';
    }
    return getOwnerStackByComponentStackNodeInDev(
      currentTaskInDEV.componentStack,
    );
  }
  return '';
}

function getStackFromNode(stackNode: ComponentStackNode): string {
  return getStackByComponentStackNode(stackNode);
}

function pushHaltedAwaitOnComponentStack(
  task: Task,
  debugInfo: void | null | ReactDebugInfo,
): void {
  if (!__DEV__) {
    // eslint-disable-next-line react-internal/prod-error-codes
    throw new Error(
      'pushHaltedAwaitOnComponentStack should never be called in production. This is a bug in React.',
    );
  }
  if (debugInfo != null) {
    for (let i = debugInfo.length - 1; i >= 0; i--) {
      const info = debugInfo[i];
      if (info.awaited != null) {
        const asyncInfo: ReactAsyncInfo = info as any;
        const bestStack =
          asyncInfo.debugStack == null ? asyncInfo.awaited : asyncInfo;
        if (bestStack.debugStack !== undefined) {
          task.componentStack = {
            parent: task.componentStack,
            type: asyncInfo,
            owner: bestStack.owner,
            stack: bestStack.debugStack,
          };
          task.debugTask = bestStack.debugTask as any;
          break;
        }
      }
    }
  }
}

// performWork + retryTask without mutation
function rerenderStalledTask(request: Request, task: Task): void {
  const prevStatus = request.status;
  const prevAborted = request.aborted;
  request.status = STALLED_DEV;
  // This diagnostic replay must reach the suspended call site instead of
  // taking the abort path.
  request.aborted = false;

  const prevContext = getActiveContext();
  const prevDispatcher = ReactSharedInternals.H;
  ReactSharedInternals.H = HooksDispatcher;
  const prevAsyncDispatcher = ReactSharedInternals.A;
  ReactSharedInternals.A = DefaultAsyncDispatcher;

  const prevRequest = currentRequest;
  currentRequest = request;

  const prevGetCurrentStackImpl = ReactSharedInternals.getCurrentStack;
  ReactSharedInternals.getCurrentStack = getCurrentStackInDEV;

  const prevResumableState = currentResumableState;
  setCurrentResumableState(request.resumableState);
  switchContext(task.context);
  const prevTaskInDEV = currentTaskInDEV;
  setCurrentTaskInDEV(task);
  try {
    retryNode(request, task);
  } catch (x) {
    // Suspended again.
    resetHooksState();
  } finally {
    setCurrentTaskInDEV(prevTaskInDEV);
    setCurrentResumableState(prevResumableState);

    ReactSharedInternals.H = prevDispatcher;
    ReactSharedInternals.A = prevAsyncDispatcher;

    ReactSharedInternals.getCurrentStack = prevGetCurrentStackImpl;
    if (prevDispatcher === HooksDispatcher) {
      // This means that we were in a reentrant work loop. This could happen
      // in a renderer that supports synchronous work like renderToString,
      // when it's called from within another renderer.
      // Normally we don't bother switching the contexts to their root/default
      // values when leaving because we'll likely need the same or similar
      // context again. However, when we're inside a synchronous loop like this
      // we'll to restore the context to what it was before returning.
      switchContext(prevContext);
    }
    currentRequest = prevRequest;
    request.status = prevStatus;
    request.aborted = prevAborted;
  }
}

function pushSuspendedCallSiteOnComponentStack(
  request: Request,
  task: Task,
): void {
  setCaptureSuspendedCallSiteDEV(true);
  const restoreThenableState = ensureSuspendableThenableStateDEV(
    // refined at the callsite
    task.thenableState as any as ThenableState,
  );
  try {
    rerenderStalledTask(request, task);
  } finally {
    restoreThenableState();
    setCaptureSuspendedCallSiteDEV(false);
  }

  const suspendCallSiteStack = getSuspendedCallSiteStackDEV();
  const suspendCallSiteDebugTask = getSuspendedCallSiteDebugTaskDEV();

  if (suspendCallSiteStack !== null) {
    const ownerStack = task.componentStack;
    task.componentStack = {
      // The owner of the suspended call site would be the owner of this task.
      // We need the task itself otherwise we'd miss a frame.
      owner: ownerStack,
      parent: suspendCallSiteStack.parent,
      stack: suspendCallSiteStack.stack,
      type: suspendCallSiteStack.type,
    };
  }
  task.debugTask = suspendCallSiteDebugTask;
}

function pushServerComponentStack(
  task: Task,
  debugInfo: void | null | ReactDebugInfo,
): void {
  if (!__DEV__) {
    // eslint-disable-next-line react-internal/prod-error-codes
    throw new Error(
      'pushServerComponentStack should never be called in production. This is a bug in React.',
    );
  }
  // Build a Server Component parent stack from the debugInfo.
  if (debugInfo != null) {
    const stack: ReactDebugInfo = debugInfo;
    for (let i = 0; i < stack.length; i++) {
      const componentInfo: ReactComponentInfo = stack[i] as any;
      if (typeof componentInfo.name !== 'string') {
        continue;
      }
      if (componentInfo.debugStack === undefined) {
        continue;
      }
      task.componentStack = {
        parent: task.componentStack,
        type: componentInfo,
        owner: componentInfo.owner,
        stack: componentInfo.debugStack,
      };
      task.debugTask = componentInfo.debugTask as any;
    }
  }
}

function pushComponentStack(task: Task): void {
  const node = task.node;
  // Create the Component Stack frame for the element we're about to try.
  // It's unfortunate that we need to do this refinement twice. Once for
  // the stack frame and then once again while actually
  if (typeof node === 'object' && node !== null) {
    switch ((node as any).$$typeof) {
      case REACT_ELEMENT_TYPE: {
        const element: any = node;
        const type = element.type;
        const owner = __DEV__ ? element._owner : null;
        const stack = __DEV__ ? element._debugStack : null;
        if (__DEV__) {
          pushServerComponentStack(task, element._debugInfo);
          task.debugTask = element._debugTask;
        }
        task.componentStack = createComponentStackFromType(
          task.componentStack,
          type,
          owner,
          stack,
        );
        break;
      }
      case REACT_LAZY_TYPE: {
        if (__DEV__) {
          const lazyNode: LazyComponentType<any, any> = node as any;
          pushServerComponentStack(task, lazyNode._debugInfo);
        }
        break;
      }
      default: {
        if (__DEV__) {
          const maybeUsable: Object = node;
          if (typeof maybeUsable.then === 'function') {
            const thenable: Thenable<ReactNodeList> = maybeUsable as any;
            pushServerComponentStack(task, thenable._debugInfo);
          }
        }
      }
    }
  }
}

function createComponentStackFromType(
  parent: null | ComponentStackNode,
  type: Function | string | symbol,
  owner: void | null | ReactComponentInfo | ComponentStackNode, // DEV only
  stack: void | null | string | Error, // DEV only
): ComponentStackNode {
  if (__DEV__) {
    return {
      parent,
      type,
      owner,
      stack,
    };
  }
  return {
    parent,
    type,
  };
}

function replaceSuspenseComponentStackWithSuspenseFallbackStack(
  componentStack: null | ComponentStackNode,
): null | ComponentStackNode {
  if (componentStack === null) {
    return null;
  }
  return createComponentStackFromType(
    componentStack.parent,
    'Suspense Fallback',
    __DEV__ ? componentStack.owner : null,
    __DEV__ ? componentStack.stack : null,
  );
}

type ThrownInfo = {
  componentStack?: string,
};
export type ErrorInfo = ThrownInfo;

function getThrownInfo(node: null | ComponentStackNode): ThrownInfo {
  const errorInfo: ThrownInfo = {};
  if (node) {
    Object.defineProperty(errorInfo, 'componentStack', {
      configurable: true,
      enumerable: true,
      get() {
        // Lazyily generate the stack since it's expensive.
        const stack = getStackFromNode(node);
        Object.defineProperty(errorInfo, 'componentStack', {
          value: stack,
        });
        return stack;
      },
    });
  }
  return errorInfo;
}

function encodeErrorForBoundary(
  boundary: SuspenseBoundary,
  digest: ?string,
  error: mixed,
  thrownInfo: ThrownInfo,
  wasAborted: boolean,
) {
  boundary.errorDigest = digest;
  if (__DEV__) {
    let message, stack;
    // In dev we additionally encode the error message and component stack on the boundary
    if (error instanceof Error) {
      // eslint-disable-next-line react-internal/safe-string-coercion
      message = String(error.message);
      // eslint-disable-next-line react-internal/safe-string-coercion
      stack = String(error.stack);
    } else if (typeof error === 'object' && error !== null) {
      message = describeObjectForErrorMessage(error);
      stack = null;
    } else {
      // eslint-disable-next-line react-internal/safe-string-coercion
      message = String(error);
      stack = null;
    }
    const prefix = wasAborted
      ? 'Switched to client rendering because the server rendering aborted due to:\n\n'
      : 'Switched to client rendering because the server rendering errored:\n\n';
    boundary.errorMessage = prefix + message;
    boundary.errorStack = stack !== null ? prefix + stack : null;
    boundary.errorComponentStack = thrownInfo.componentStack;
  }
}

function logRecoverableError(
  request: Request,
  error: any,
  errorInfo: ThrownInfo,
  debugTask: null | ConsoleTask,
): ?string {
  // If this callback errors, we intentionally let that error bubble up to become a fatal error
  // so that someone fixes the error reporting instead of hiding it.
  const onError = request.onError;
  const errorDigest =
    __DEV__ && debugTask
      ? debugTask.run(onError.bind(null, error, errorInfo))
      : onError(error, errorInfo);
  if (errorDigest != null && typeof errorDigest !== 'string') {
    // We used to throw here but since this gets called from a variety of unprotected places it
    // seems better to just warn and discard the returned value.
    if (__DEV__) {
      console.error(
        'onError returned something with a type other than "string". onError should return a string and may return null or undefined but must not return anything else. It received something of type "%s" instead',
        typeof errorDigest,
      );
    }
    return;
  }
  return errorDigest;
}

function fatalError(
  request: Request,
  error: mixed,
  errorInfo: ThrownInfo,
  debugTask: null | ConsoleTask,
): void {
  // This is called outside error handling code such as if the root errors outside
  // a suspense boundary or if the root suspense boundary's fallback errors.
  // It's also called if React itself or its host configs errors.
  const onShellError = request.onShellError;
  const onFatalError = request.onFatalError;
  // Once the shell has completed it can't error anymore, so onShellError only
  // fires while root tasks are still pending. onFatalError always fires because
  // the error is always fatal to the request.
  const shellComplete = request.pendingRootTasks === 0;
  if (__DEV__ && debugTask) {
    if (!shellComplete) {
      debugTask.run(onShellError.bind(null, error));
    }
    debugTask.run(onFatalError.bind(null, error));
  } else {
    if (!shellComplete) {
      onShellError(error);
    }
    onFatalError(error);
  }
  if (request.destination !== null) {
    request.status = CLOSED;
    closeWithError(request.destination, error);
  } else {
    request.status = CLOSING;
    request.fatalError = error;
  }
}

function renderSuspenseBoundary(
  request: Request,
  someTask: Task,
  keyPath: KeyNode,
  props: SuspenseProps,
): void {
  if (someTask.replay !== null) {
    // If we're replaying through this pass, it means we're replaying through
    // an already completed Suspense boundary. It's too late to do anything about it
    // so we can just render through it.
    const prevKeyPath = someTask.keyPath;
    const prevContext = someTask.formatContext;
    const prevRow = someTask.row;
    someTask.keyPath = keyPath;
    someTask.formatContext = getSuspenseContentFormatContext(
      request.resumableState,
      prevContext,
    );
    someTask.row = null;
    const content: ReactNodeList = props.children;
    try {
      renderNode(request, someTask, content, -1);
    } finally {
      someTask.keyPath = prevKeyPath;
      someTask.formatContext = prevContext;
      someTask.row = prevRow;
    }
    return;
  }
  // $FlowFixMe[incompatible-type]: Refined.
  const task: RenderTask = someTask;

  const prevKeyPath = task.keyPath;
  const prevContext = task.formatContext;
  const prevRow = task.row;
  const parentBoundary = task.blockedBoundary;
  const parentPreamble = task.blockedPreamble;
  const parentHoistableState = task.hoistableState;
  const parentSegment = task.blockedSegment;

  // Each time we enter a suspense boundary, we split out into a new segment for
  // the fallback so that we can later replace that segment with the content.
  // This also lets us split out the main content even if it doesn't suspend,
  // in case it ends up generating a large subtree of content.
  const fallback: ReactNodeList = props.fallback;
  const content: ReactNodeList = props.children;
  const defer: boolean = enableCPUSuspense && props.defer === true;

  const fallbackAbortSet: Set<Task> = new Set();
  const newBoundary = createSuspenseBoundary(
    request,
    task.row,
    fallbackAbortSet,
    canHavePreamble(task.formatContext) ? createPreamble() : null,
    defer,
  );

  const insertionIndex = parentSegment.chunks.length;
  // The children of the boundary segment is actually the fallback.
  const boundarySegment = createPendingSegment(
    request,
    insertionIndex,
    newBoundary,
    task.formatContext,
    // boundaries never require text embedding at their edges because comment nodes bound them
    false,
    false,
  );
  parentSegment.children.push(boundarySegment);
  // The parentSegment has a child Segment at this index so we reset the lastPushedText marker on the parent
  parentSegment.lastPushedText = false;

  // This segment is the actual child content. We can start rendering that immediately.
  const contentRootSegment = createPendingSegment(
    request,
    0,
    null,
    task.formatContext,
    // boundaries never require text embedding at their edges because comment nodes bound them
    false,
    false,
  );
  // We mark the root segment as having its parent flushed. It's not really flushed but there is
  // no parent segment so there's nothing to wait on.
  contentRootSegment.parentFlushed = true;

  const trackedPostpones = request.trackedPostpones;
  if (trackedPostpones !== null || defer) {
    // This is a prerender or deferred boundary. In this mode we want to render the fallback synchronously
    // and schedule the content to render later. This is the opposite of what we do during a normal render
    // where we try to skip rendering the fallback if the content itself can render synchronously

    // Stash the original stack frame.
    const suspenseComponentStack = task.componentStack;

    const fallbackKeyPath: KeyNode = [
      keyPath[0],
      'Suspense Fallback',
      keyPath[2],
    ];
    if (trackedPostpones !== null) {
      const fallbackReplayNode: ReplayNode = [
        fallbackKeyPath[1],
        fallbackKeyPath[2],
        [] as Array<ReplayNode>,
        null,
      ];
      trackedPostpones.workingMap.set(fallbackKeyPath, fallbackReplayNode);
      newBoundary.tracked = {
        contentKeyPath: keyPath,
        // We are rendering the fallback before the boundary content so we keep track of
        // the fallback replay node until we determine if the primary content suspends
        fallbackNode: fallbackReplayNode,
      };
    }

    task.blockedSegment = boundarySegment;
    task.blockedPreamble =
      newBoundary.preamble === null ? null : newBoundary.preamble.fallback;
    task.keyPath = fallbackKeyPath;
    task.formatContext = getSuspenseFallbackFormatContext(
      request.resumableState,
      prevContext,
    );
    task.componentStack =
      replaceSuspenseComponentStackWithSuspenseFallbackStack(
        suspenseComponentStack,
      );
    try {
      renderNode(request, task, fallback, -1);
      pushSegmentFinale(
        boundarySegment.chunks,
        request.renderState,
        boundarySegment.lastPushedText,
        boundarySegment.textEmbedded,
      );
      boundarySegment.status = COMPLETED;
      finishedSegment(request, parentBoundary, boundarySegment);
    } catch (thrownValue: mixed) {
      if (request.aborted) {
        boundarySegment.status = ABORTED;
      } else {
        boundarySegment.status = ERRORED;
      }
      throw thrownValue;
    } finally {
      task.blockedSegment = parentSegment;
      task.blockedPreamble = parentPreamble;
      task.keyPath = prevKeyPath;
      task.formatContext = prevContext;
    }

    // We create a suspended task for the primary content because we want to allow
    // sibling fallbacks to be rendered first.
    const suspendedPrimaryTask = createRenderTask(
      request,
      null,
      content,
      -1,
      newBoundary,
      contentRootSegment,
      newBoundary.preamble === null ? null : newBoundary.preamble.content,
      newBoundary.contentState,
      task.abortSet,
      keyPath,
      getSuspenseContentFormatContext(
        request.resumableState,
        task.formatContext,
      ),
      task.context,
      task.treeContext,
      null, // The row gets reset inside the Suspense boundary.
      suspenseComponentStack,
      !disableLegacyContext ? task.legacyContext : emptyContextObject,
      __DEV__ ? task.debugTask : null,
    );
    pushComponentStack(suspendedPrimaryTask);
    request.pingedTasks.push(suspendedPrimaryTask);
  } else {
    // This is a normal render. We will attempt to synchronously render the boundary content
    // If it is successful we will elide the fallback task but if it suspends or errors we schedule
    // the fallback to render. Unlike with prerenders we attempt to deprioritize the fallback render

    // Currently this is running synchronously. We could instead schedule this to pingedTasks.
    // I suspect that there might be some efficiency benefits from not creating the suspended task
    // and instead just using the stack if possible.
    // TODO: Call this directly instead of messing with saving and restoring contexts.

    // We can reuse the current context and task to render the content immediately without
    // context switching. We just need to temporarily switch which boundary and which segment
    // we're writing to. If something suspends, it'll spawn new suspended task with that context.
    task.blockedBoundary = newBoundary;
    task.blockedPreamble =
      newBoundary.preamble === null ? null : newBoundary.preamble.content;
    task.hoistableState = newBoundary.contentState;
    task.blockedSegment = contentRootSegment;
    task.keyPath = keyPath;
    task.formatContext = getSuspenseContentFormatContext(
      request.resumableState,
      prevContext,
    );
    task.row = null;
    try {
      // We use the safe form because we don't handle suspending here. Only error handling.
      renderNode(request, task, content, -1);
      pushSegmentFinale(
        contentRootSegment.chunks,
        request.renderState,
        contentRootSegment.lastPushedText,
        contentRootSegment.textEmbedded,
      );
      contentRootSegment.status = COMPLETED;
      finishedSegment(request, newBoundary, contentRootSegment);
      queueCompletedSegment(newBoundary, contentRootSegment);
      if (newBoundary.pendingTasks === 0 && newBoundary.status === PENDING) {
        // This must have been the last segment we were waiting on. This boundary is now complete.
        newBoundary.status = COMPLETED;
        // Therefore we won't need the fallback. We early return so that we don't have to create
        // the fallback. However, if this boundary ended up big enough to be eligible for outlining
        // we can't do that because we might still need the fallback if we outline it.
        if (!isEligibleForOutlining(request, newBoundary)) {
          if (prevRow !== null) {
            // If we have synchronously completed the boundary and it's not eligible for outlining
            // then we don't have to wait for it to be flushed before we unblock future rows.
            // This lets us inline small rows in order.
            if (--prevRow.pendingTasks === 0) {
              finishSuspenseListRow(request, prevRow);
            }
          }
          if (request.pendingRootTasks === 0 && task.blockedPreamble) {
            // The root is complete and this boundary may contribute part of the preamble.
            // We eagerly attempt to prepare the preamble here because we expect most requests
            // to have few boundaries which contribute preambles and it allow us to do this
            // preparation work during the work phase rather than the when flushing.
            preparePreamble(request);
          }
          return;
        }
      } else {
        const boundaryRow = prevRow;
        if (boundaryRow !== null && boundaryRow.together) {
          tryToResolveTogetherRow(request, boundaryRow);
        }
      }
    } catch (thrownValue: mixed) {
      newBoundary.status = CLIENT_RENDERED;
      let error: mixed;
      if (request.aborted) {
        contentRootSegment.status = ABORTED;
        error = request.fatalError;
      } else {
        contentRootSegment.status = ERRORED;
        error = thrownValue;
      }

      const thrownInfo = getThrownInfo(task.componentStack);
      const errorDigest = logRecoverableError(
        request,
        error,
        thrownInfo,
        __DEV__ ? task.debugTask : null,
      );
      encodeErrorForBoundary(
        newBoundary,
        errorDigest,
        error,
        thrownInfo,
        false,
      );

      untrackBoundary(request, newBoundary);

      // We don't need to decrement any task numbers because we didn't spawn any new task.
      // We don't need to schedule any task because we know the parent has written yet.
      // We do need to fallthrough to create the fallback though.
    } finally {
      task.blockedBoundary = parentBoundary;
      task.blockedPreamble = parentPreamble;
      task.hoistableState = parentHoistableState;
      task.blockedSegment = parentSegment;
      task.keyPath = prevKeyPath;
      task.formatContext = prevContext;
      task.row = prevRow;
    }

    const fallbackKeyPath: KeyNode = [
      keyPath[0],
      'Suspense Fallback',
      keyPath[2],
    ];
    // We create suspended task for the fallback because we don't want to actually work
    // on it yet in case we finish the main content, so we queue for later.
    const suspendedFallbackTask = createRenderTask(
      request,
      null,
      fallback,
      -1,
      parentBoundary,
      boundarySegment,
      newBoundary.preamble === null ? null : newBoundary.preamble.fallback,
      newBoundary.fallbackState,
      fallbackAbortSet,
      fallbackKeyPath,
      getSuspenseFallbackFormatContext(
        request.resumableState,
        task.formatContext,
      ),
      task.context,
      task.treeContext,
      task.row,
      replaceSuspenseComponentStackWithSuspenseFallbackStack(
        task.componentStack,
      ),
      !disableLegacyContext ? task.legacyContext : emptyContextObject,
      __DEV__ ? task.debugTask : null,
    );
    pushComponentStack(suspendedFallbackTask);
    // TODO: This should be queued at a separate lower priority queue so that we only work
    // on preparing fallbacks if we don't have any more main content to task on.
    request.pingedTasks.push(suspendedFallbackTask);
  }
}

function replaySuspenseBoundary(
  request: Request,
  task: ReplayTask,
  keyPath: KeyNode,
  props: Object,
  id: number,
  childNodes: Array<ReplayNode>,
  childSlots: ResumeSlots,
  fallbackNodes: Array<ReplayNode>,
  fallbackSlots: ResumeSlots,
): void {
  const prevKeyPath = task.keyPath;
  const prevContext = task.formatContext;
  const prevRow = task.row;
  const previousReplaySet: ReplaySet = task.replay;

  const parentBoundary = task.blockedBoundary;
  const parentHoistableState = task.hoistableState;

  const content: ReactNodeList = props.children;
  const fallback: ReactNodeList = props.fallback;
  const defer: boolean = enableCPUSuspense && props.defer === true;

  const fallbackAbortSet: Set<Task> = new Set();
  const resumedBoundary = createSuspenseBoundary(
    request,
    task.row,
    fallbackAbortSet,
    canHavePreamble(task.formatContext) ? createPreamble() : null,
    defer,
  );
  resumedBoundary.parentFlushed = true;
  // We restore the same id of this boundary as was used during prerender.
  resumedBoundary.rootSegmentID = id;

  // We can reuse the current context and task to render the content immediately without
  // context switching. We just need to temporarily switch which boundary and replay node
  // we're writing to. If something suspends, it'll spawn new suspended task with that context.
  task.blockedBoundary = resumedBoundary;
  task.hoistableState = resumedBoundary.contentState;
  task.keyPath = keyPath;
  task.formatContext = getSuspenseContentFormatContext(
    request.resumableState,
    prevContext,
  );
  task.row = null;
  task.replay = {nodes: childNodes, slots: childSlots, pendingTasks: 1};

  try {
    // We use the safe form because we don't handle suspending here. Only error handling.
    renderNode(request, task, content, -1);

    if (task.replay.pendingTasks === 1 && task.replay.nodes.length > 0) {
      throw new Error(
        "Couldn't find all resumable slots by key/index during replaying. " +
          "The tree doesn't match so React will fallback to client rendering.",
      );
    }
    task.replay.pendingTasks--;
    if (
      resumedBoundary.pendingTasks === 0 &&
      resumedBoundary.status === PENDING
    ) {
      // This must have been the last segment we were waiting on. This boundary is now complete.
      // Therefore we won't need the fallback. We early return so that we don't have to create
      // the fallback.
      resumedBoundary.status = COMPLETED;
      request.completedBoundaries.push(resumedBoundary);
      // We restore the parent componentStack. Semantically this is the same as
      // popComponentStack(task) but we do this instead because it should be slightly
      // faster
      return;
    }
  } catch (thrownValue: mixed) {
    resumedBoundary.status = CLIENT_RENDERED;
    const error = request.aborted ? request.fatalError : thrownValue;
    const thrownInfo = getThrownInfo(task.componentStack);
    const errorDigest = logRecoverableError(
      request,
      error,
      thrownInfo,
      __DEV__ ? task.debugTask : null,
    );
    encodeErrorForBoundary(
      resumedBoundary,
      errorDigest,
      error,
      thrownInfo,
      false,
    );

    task.replay.pendingTasks--;

    // The parent already flushed in the prerender so we need to schedule this to be emitted.
    request.clientRenderedBoundaries.push(resumedBoundary);

    // We don't need to decrement any task numbers because we didn't spawn any new task.
    // We don't need to schedule any task because we know the parent has written yet.
    // We do need to fallthrough to create the fallback though.
  } finally {
    task.blockedBoundary = parentBoundary;
    task.hoistableState = parentHoistableState;
    task.replay = previousReplaySet;
    task.keyPath = prevKeyPath;
    task.formatContext = prevContext;
    task.row = prevRow;
  }

  const fallbackKeyPath: KeyNode = [
    keyPath[0],
    'Suspense Fallback',
    keyPath[2],
  ];

  // We create suspended task for the fallback because we don't want to actually work
  // on it yet in case we finish the main content, so we queue for later.
  const fallbackReplay = {
    nodes: fallbackNodes,
    slots: fallbackSlots,
    pendingTasks: 0,
  };
  const suspendedFallbackTask = createReplayTask(
    request,
    null,
    fallbackReplay,
    fallback,
    -1,
    parentBoundary,
    resumedBoundary.fallbackState,
    fallbackAbortSet,
    fallbackKeyPath,
    getSuspenseFallbackFormatContext(
      request.resumableState,
      task.formatContext,
    ),
    task.context,
    task.treeContext,
    task.row,
    replaceSuspenseComponentStackWithSuspenseFallbackStack(task.componentStack),
    !disableLegacyContext ? task.legacyContext : emptyContextObject,
    __DEV__ ? task.debugTask : null,
  );

  pushComponentStack(suspendedFallbackTask);
  // TODO: This should be queued at a separate lower priority queue so that we only work
  // on preparing fallbacks if we don't have any more main content to task on.
  request.pingedTasks.push(suspendedFallbackTask);
}

function finishSuspenseListRow(request: Request, row: SuspenseListRow): void {
  // This row finished. Now we have to unblock all the next rows that were blocked on this.
  unblockSuspenseListRow(request, row.next, row.hoistables);
}

function unblockSuspenseListRow(
  request: Request,
  unblockedRow: null | SuspenseListRow,
  inheritedHoistables: null | HoistableState,
): void {
  // We do this in a loop to avoid stack overflow for very long lists that get unblocked.
  while (unblockedRow !== null) {
    if (inheritedHoistables !== null) {
      // Hoist any hoistables from the previous row into the next row so that it can be
      // later transferred to all the rows.
      hoistHoistables(unblockedRow.hoistables, inheritedHoistables);
      // Mark the row itself for any newly discovered Suspense boundaries to inherit.
      // This is different from hoistables because that also includes hoistables from
      // all the boundaries below this row and not just previous rows.
      unblockedRow.inheritedHoistables = inheritedHoistables;
    }
    // Unblocking the boundaries will decrement the count of this row but we keep it above
    // zero so they never finish this row recursively.
    const unblockedBoundaries = unblockedRow.boundaries;
    if (unblockedBoundaries !== null) {
      unblockedRow.boundaries = null;
      for (let i = 0; i < unblockedBoundaries.length; i++) {
        const unblockedBoundary = unblockedBoundaries[i];
        if (inheritedHoistables !== null) {
          hoistHoistables(unblockedBoundary.contentState, inheritedHoistables);
        }
        finishedTask(request, unblockedBoundary, null, null);
      }
    }
    // Instead we decrement at the end to keep it all in this loop.
    unblockedRow.pendingTasks--;
    if (unblockedRow.pendingTasks > 0) {
      // Still blocked.
      break;
    }
    inheritedHoistables = unblockedRow.hoistables;
    unblockedRow = unblockedRow.next;
  }
}

function trackPostponedSuspenseListRow(
  request: Request,
  trackedPostpones: PostponedHoles,
  postponedRow: null | SuspenseListRow,
): void {
  // TODO: Because we unconditionally call this, it will be called by finishedTask
  // and so ends up recursive which can lead to stack overflow for very long lists.
  if (postponedRow !== null) {
    const postponedBoundaries = postponedRow.boundaries;
    if (postponedBoundaries !== null) {
      postponedRow.boundaries = null;
      for (let i = 0; i < postponedBoundaries.length; i++) {
        const postponedBoundary = postponedBoundaries[i];
        trackPostponedBoundary(request, trackedPostpones, postponedBoundary);
        finishedTask(request, postponedBoundary, null, null);
      }
    }
  }
}

function tryToResolveTogetherRow(
  request: Request,
  togetherRow: SuspenseListRow,
): void {
  // If we have a "together" row and all the pendingTasks are really the boundaries themselves,
  // and we won't outline any of them then we can unblock this row early so that we can inline
  // all the boundaries at once.
  const boundaries = togetherRow.boundaries;
  if (boundaries === null || togetherRow.pendingTasks !== boundaries.length) {
    return;
  }
  let allCompleteAndInlinable = true;
  for (let i = 0; i < boundaries.length; i++) {
    const rowBoundary = boundaries[i];
    if (
      rowBoundary.pendingTasks !== 1 ||
      rowBoundary.parentFlushed ||
      isEligibleForOutlining(request, rowBoundary)
    ) {
      allCompleteAndInlinable = false;
      break;
    }
  }
  if (allCompleteAndInlinable) {
    unblockSuspenseListRow(request, togetherRow, togetherRow.hoistables);
  }
}

function createSuspenseListRow(
  previousRow: null | SuspenseListRow,
): SuspenseListRow {
  const newRow: SuspenseListRow = {
    pendingTasks: 1, // At first the row is blocked on attempting rendering itself.
    boundaries: null,
    hoistables: createHoistableState(),
    inheritedHoistables: null,
    together: false,
    next: null,
  };
  if (previousRow !== null && previousRow.pendingTasks > 0) {
    // If the previous row is not done yet, we add ourselves to be blocked on it.
    // When it finishes, we'll decrement our pending tasks.
    newRow.pendingTasks++;
    newRow.boundaries = [];
    previousRow.next = newRow;
  }
  return newRow;
}

function renderSuspenseListRows(
  request: Request,
  task: Task,
  keyPath: KeyNode,
  rows: Array<ReactNodeList>,
  revealOrder: void | 'forwards' | 'backwards' | 'unstable_legacy-backwards',
): void {
  // This is a fork of renderChildrenArray that's aware of tracking rows.
  const prevKeyPath = task.keyPath;
  const prevTreeContext = task.treeContext;
  const prevRow = task.row;
  const previousComponentStack = task.componentStack;
  let previousDebugTask = null;
  if (__DEV__) {
    previousDebugTask = task.debugTask;
    // We read debugInfo from task.node.props.children instead of rows because it
    // might have been an unwrapped iterable so we read from the original node.
    pushServerComponentStack(
      task,
      (task.node as any).props.children._debugInfo,
    );
  }

  task.keyPath = keyPath;

  const totalChildren = rows.length;
  let previousSuspenseListRow: null | SuspenseListRow = null;
  if (task.replay !== null) {
    // Replay
    // First we need to check if we have any resume slots at this level.
    const resumeSlots = task.replay.slots;
    if (resumeSlots !== null && typeof resumeSlots === 'object') {
      for (let n = 0; n < totalChildren; n++) {
        // Since we are going to resume into a slot whose order was already
        // determined by the prerender, we can safely resume it even in reverse
        // render order.
        const i =
          revealOrder !== 'backwards' &&
          revealOrder !== 'unstable_legacy-backwards'
            ? n
            : totalChildren - 1 - n;
        const node = rows[i];
        task.row = previousSuspenseListRow = createSuspenseListRow(
          previousSuspenseListRow,
        );
        task.treeContext = pushTreeContext(prevTreeContext, totalChildren, i);
        const resumeSegmentID = resumeSlots[i];
        // TODO: If this errors we should still continue with the next sibling.
        if (typeof resumeSegmentID === 'number') {
          resumeNode(request, task, resumeSegmentID, node, i);
          // We finished rendering this node, so now we can consume this
          // slot. This must happen after in case we rerender this task.
          delete resumeSlots[i];
        } else {
          renderNode(request, task, node, i);
        }
        if (--previousSuspenseListRow.pendingTasks === 0) {
          finishSuspenseListRow(request, previousSuspenseListRow);
        }
      }
    } else {
      for (let n = 0; n < totalChildren; n++) {
        // Since we are going to resume into a slot whose order was already
        // determined by the prerender, we can safely resume it even in reverse
        // render order.
        const i =
          revealOrder !== 'backwards' &&
          revealOrder !== 'unstable_legacy-backwards'
            ? n
            : totalChildren - 1 - n;
        const node = rows[i];
        if (__DEV__) {
          warnForMissingKey(request, task, node);
        }
        task.row = previousSuspenseListRow = createSuspenseListRow(
          previousSuspenseListRow,
        );
        task.treeContext = pushTreeContext(prevTreeContext, totalChildren, i);
        renderNode(request, task, node, i);
        if (--previousSuspenseListRow.pendingTasks === 0) {
          finishSuspenseListRow(request, previousSuspenseListRow);
        }
      }
    }
  } else {
    task = task as any as RenderTask; // Refined
    if (
      revealOrder !== 'backwards' &&
      revealOrder !== 'unstable_legacy-backwards'
    ) {
      // Forwards direction
      for (let i = 0; i < totalChildren; i++) {
        const node = rows[i];
        if (__DEV__) {
          warnForMissingKey(request, task, node);
        }
        task.row = previousSuspenseListRow = createSuspenseListRow(
          previousSuspenseListRow,
        );
        task.treeContext = pushTreeContext(prevTreeContext, totalChildren, i);
        renderNode(request, task, node, i);
        if (--previousSuspenseListRow.pendingTasks === 0) {
          finishSuspenseListRow(request, previousSuspenseListRow);
        }
      }
    } else {
      // For backwards direction we need to do things a bit differently.
      // We give each row its own segment so that we can render the content in
      // reverse order but still emit it in the right order when we flush.
      const parentSegment = task.blockedSegment;
      const childIndex = parentSegment.children.length;
      const insertionIndex = parentSegment.chunks.length;
      for (let n = 0; n < totalChildren; n++) {
        const i =
          revealOrder === 'unstable_legacy-backwards'
            ? totalChildren - 1 - n
            : n;
        const node = rows[i];
        task.row = previousSuspenseListRow = createSuspenseListRow(
          previousSuspenseListRow,
        );
        task.treeContext = pushTreeContext(prevTreeContext, totalChildren, i);
        const newSegment = createPendingSegment(
          request,
          insertionIndex,
          null,
          task.formatContext,
          // Assume we are text embedded at the trailing edges
          i === 0 ? parentSegment.lastPushedText : true,
          true,
        );
        // Insert in the beginning of the sequence, which will insert before any previous rows.
        parentSegment.children.splice(childIndex, 0, newSegment);
        task.blockedSegment = newSegment;
        if (__DEV__) {
          warnForMissingKey(request, task, node);
        }
        try {
          renderNode(request, task, node, i);
          pushSegmentFinale(
            newSegment.chunks,
            request.renderState,
            newSegment.lastPushedText,
            newSegment.textEmbedded,
          );
          newSegment.status = COMPLETED;
          finishedSegment(request, task.blockedBoundary, newSegment);
          if (--previousSuspenseListRow.pendingTasks === 0) {
            finishSuspenseListRow(request, previousSuspenseListRow);
          }
        } catch (thrownValue: mixed) {
          if (request.aborted) {
            newSegment.status = ABORTED;
          } else {
            newSegment.status = ERRORED;
          }
          throw thrownValue;
        }
      }
      task.blockedSegment = parentSegment;
      // Reset lastPushedText for current Segment since the new Segments "consumed" it
      parentSegment.lastPushedText = false;
    }
  }

  if (
    prevRow !== null &&
    previousSuspenseListRow !== null &&
    previousSuspenseListRow.pendingTasks > 0
  ) {
    // If we are part of an outer SuspenseList and our last row is still pending, then that blocks
    // the parent row from completing. We can continue the chain.
    prevRow.pendingTasks++;
    previousSuspenseListRow.next = prevRow;
  }

  // Because this context is always set right before rendering every child, we
  // only need to reset it to the previous value at the very end.
  task.treeContext = prevTreeContext;
  task.row = prevRow;
  task.keyPath = prevKeyPath;
  if (__DEV__) {
    task.componentStack = previousComponentStack;
    task.debugTask = previousDebugTask;
  }
}

function renderSuspenseList(
  request: Request,
  task: Task,
  keyPath: KeyNode,
  props: SuspenseListProps,
): void {
  const children: any = props.children;
  const revealOrder: SuspenseListRevealOrder = props.revealOrder;
  // TODO: Support tail hidden/collapsed modes.
  // const tailMode: SuspenseListTailMode = props.tail;
  if (revealOrder !== 'independent' && revealOrder !== 'together') {
    // For ordered reveal, we need to produce rows from the children.
    if (isArray(children)) {
      renderSuspenseListRows(request, task, keyPath, children, revealOrder);
      return;
    }
    const iteratorFn = getIteratorFn(children);
    if (iteratorFn) {
      const iterator = iteratorFn.call(children);
      if (iterator) {
        if (__DEV__) {
          validateIterable(task, children, -1, iterator, iteratorFn);
        }
        // TODO: We currently use the same id algorithm as regular nodes
        // but we need a new algorithm for SuspenseList that doesn't require
        // a full set to be loaded up front to support Async Iterable.
        // When we have that, we shouldn't buffer anymore.
        let step = iterator.next();
        if (!step.done) {
          const rows = [];
          do {
            rows.push(step.value);
            step = iterator.next();
          } while (!step.done);
          renderSuspenseListRows(request, task, keyPath, children, revealOrder);
        }
        return;
      }
    }
    if (
      enableAsyncIterableChildren &&
      typeof (children as any)[ASYNC_ITERATOR] === 'function'
    ) {
      const iterator: AsyncIterator<ReactNodeList> = (children as any)[
        ASYNC_ITERATOR
      ]();
      if (iterator) {
        if (__DEV__) {
          validateAsyncIterable(task, children as any, -1, iterator);
        }
        // TODO: Update the task.children to be the iterator to avoid asking
        // for new iterators, but we currently warn for rendering these
        // so needs some refactoring to deal with the warning.

        // Restore the thenable state before resuming.
        const prevThenableState = task.thenableState;
        task.thenableState = null;
        prepareToUseThenableState(prevThenableState);

        // We need to know how many total rows are in this set, so that we
        // can allocate enough id slots to acommodate them. So we must exhaust
        // the iterator before we start recursively rendering the rows.
        // TODO: This is not great but I think it's inherent to the id
        // generation algorithm.

        const rows = [];

        let done = false;

        // $FlowFixMe[invalid-compare]
        if (iterator === children) {
          // If it's an iterator we need to continue reading where we left
          // off. We can do that by reading the first few rows from the previous
          // thenable state.
          // $FlowFixMe[underconstrained-implicit-instantiation]
          let step = readPreviousThenableFromState();
          while (step !== undefined) {
            if (step.done) {
              done = true;
              break;
            }
            rows.push(step.value);
            step = readPreviousThenableFromState();
          }
        }

        if (!done) {
          let step = unwrapThenable(iterator.next());
          while (!step.done) {
            rows.push(step.value);
            step = unwrapThenable(iterator.next());
          }
        }
        renderSuspenseListRows(request, task, keyPath, rows, revealOrder);
        return;
      }
    }
    // This case will warn on the client. It's the same as independent revealOrder.
  }

  if (revealOrder === 'together') {
    const prevKeyPath = task.keyPath;
    const prevRow = task.row;
    const newRow = (task.row = createSuspenseListRow(null));
    // This will cause boundaries to block on this row, but there's nothing to
    // unblock them. We'll use the partial flushing pass to unblock them.
    newRow.boundaries = [];
    newRow.together = true;
    task.keyPath = keyPath;
    renderNodeDestructive(request, task, children, -1);
    if (--newRow.pendingTasks === 0) {
      finishSuspenseListRow(request, newRow);
    }
    task.keyPath = prevKeyPath;
    task.row = prevRow;
    if (prevRow !== null && newRow.pendingTasks > 0) {
      // If we are part of an outer SuspenseList and our row is still pending, then that blocks
      // the parent row from completing. We can continue the chain.
      prevRow.pendingTasks++;
      newRow.next = prevRow;
    }
    return;
  }
  // For other reveal order modes, we just render it as a fragment.
  const prevKeyPath = task.keyPath;
  task.keyPath = keyPath;
  renderNodeDestructive(request, task, children, -1);
  task.keyPath = prevKeyPath;
}

function renderPreamble(
  request: Request,
  task: RenderTask,
  blockedSegment: Segment,
  node: ReactNodeList,
): void {
  const preambleSegment = createPendingSegment(
    request,
    0,
    null,
    task.formatContext,
    false,
    false,
  );
  blockedSegment.preambleChildren.push(preambleSegment);
  task.blockedSegment = preambleSegment;
  try {
    renderNode(request, task, node, -1);
    pushSegmentFinale(
      preambleSegment.chunks,
      request.renderState,
      preambleSegment.lastPushedText,
      preambleSegment.textEmbedded,
    );
    preambleSegment.status = COMPLETED;
    finishedSegment(request, task.blockedBoundary, preambleSegment);
  } finally {
    task.blockedSegment = blockedSegment;
  }
}

function renderHostElement(
  request: Request,
  task: Task,
  keyPath: KeyNode,
  type: string,
  props: Object,
): void {
  const segment = task.blockedSegment;
  if (segment === null) {
    // Replay
    const children = props.children; // TODO: Make this a Config for replaying.
    const prevContext = task.formatContext;
    const prevKeyPath = task.keyPath;
    task.formatContext = getChildFormatContext(prevContext, type, props);
    task.keyPath = keyPath;

    // We use the non-destructive form because if something suspends, we still
    // need to pop back up and finish this subtree of HTML.
    renderNode(request, task, children, -1);

    // We expect that errors will fatal the whole task and that we don't need
    // the correct context. Therefore this is not in a finally.
    task.formatContext = prevContext;
    task.keyPath = prevKeyPath;
  } else {
    // Render
    // RenderTask always has a preambleState
    const children = pushStartInstance(
      segment.chunks,
      type,
      props,
      request.resumableState,
      request.renderState,
      task.blockedPreamble,
      task.hoistableState,
      task.formatContext,
      segment.lastPushedText,
    );
    segment.lastPushedText = false;
    const prevContext = task.formatContext;
    const prevKeyPath = task.keyPath;
    task.keyPath = keyPath;

    const newContext = (task.formatContext = getChildFormatContext(
      prevContext,
      type,
      props,
    ));
    if (isPreambleContext(newContext)) {
      // $FlowFixMe[incompatible-type]: Refined
      renderPreamble(request, task as RenderTask, segment, children);
    } else {
      // We use the non-destructive form because if something suspends, we still
      // need to pop back up and finish this subtree of HTML.
      renderNode(request, task, children, -1);
    }

    // We expect that errors will fatal the whole task and that we don't need
    // the correct context. Therefore this is not in a finally.
    task.formatContext = prevContext;
    task.keyPath = prevKeyPath;
    pushEndInstance(
      segment.chunks,
      type,
      props,
      request.resumableState,
      prevContext,
    );
    segment.lastPushedText = false;
  }
}

function shouldConstruct(Component: any) {
  return Component.prototype && Component.prototype.isReactComponent;
}

function renderWithHooks<Props, SecondArg>(
  request: Request,
  task: Task,
  keyPath: KeyNode,
  Component: (p: Props, arg: SecondArg) => any,
  props: Props,
  secondArg: SecondArg,
): any {
  // Reset the task's thenable state before continuing, so that if a later
  // component suspends we can reuse the same task object. If the same
  // component suspends again, the thenable state will be restored.
  const prevThenableState = task.thenableState;
  task.thenableState = null;
  const componentIdentity = {};
  prepareToUseHooks(
    request,
    task,
    keyPath,
    componentIdentity,
    prevThenableState,
  );
  let result;
  if (__DEV__) {
    result = callComponentInDEV(Component, props, secondArg);
  } else {
    result = Component(props, secondArg);
  }
  return finishHooks(Component, props, result, secondArg);
}

function finishClassComponent(
  request: Request,
  task: Task,
  keyPath: KeyNode,
  instance: any,
  Component: any,
  props: any,
): ReactNodeList {
  let nextChildren;
  if (__DEV__) {
    nextChildren = callRenderInDEV(instance) as any;
  } else {
    nextChildren = instance.render();
  }
  if (request.aborted) {
    // eslint-disable-next-line no-throw-literal
    throw null;
  }

  if (__DEV__) {
    if (instance.props !== props) {
      if (!didWarnAboutReassigningProps) {
        console.error(
          'It looks like %s is reassigning its own `this.props` while rendering. ' +
            'This is not supported and can lead to confusing bugs.',
          getComponentNameFromType(Component) || 'a component',
        );
      }
      didWarnAboutReassigningProps = true;
    }
  }

  if (!disableLegacyContext) {
    const childContextTypes = Component.childContextTypes;
    if (childContextTypes !== null && childContextTypes !== undefined) {
      const previousContext = task.legacyContext;
      const mergedContext = processChildContext(
        instance,
        Component,
        previousContext,
        childContextTypes,
      );
      task.legacyContext = mergedContext;
      renderNodeDestructive(request, task, nextChildren, -1);
      task.legacyContext = previousContext;
      return;
    }
  }

  const prevKeyPath = task.keyPath;
  task.keyPath = keyPath;
  renderNodeDestructive(request, task, nextChildren, -1);
  task.keyPath = prevKeyPath;
}

export function resolveClassComponentProps(
  Component: any,
  baseProps: Object,
): Object {
  let newProps = baseProps;

  // Remove ref from the props object, if it exists.
  if ('ref' in baseProps) {
    newProps = {} as any;
    for (const propName in baseProps) {
      if (propName !== 'ref') {
        newProps[propName] = baseProps[propName];
      }
    }
  }

  // Resolve default props.
  const defaultProps = Component.defaultProps;
  if (defaultProps) {
    // We may have already copied the props object above to remove ref. If so,
    // we can modify that. Otherwise, copy the props object with Object.assign.
    if (newProps === baseProps) {
      newProps = assign({}, newProps, baseProps);
    }
    // Taken from old JSX runtime, where this used to live.
    for (const propName in defaultProps) {
      if (newProps[propName] === undefined) {
        newProps[propName] = defaultProps[propName];
      }
    }
  }

  return newProps;
}

function renderClassComponent(
  request: Request,
  task: Task,
  keyPath: KeyNode,
  Component: any,
  props: any,
): void {
  const resolvedProps = resolveClassComponentProps(Component, props);
  const maskedContext = !disableLegacyContext
    ? getMaskedContext(Component, task.legacyContext)
    : undefined;
  const instance = constructClassInstance(
    Component,
    resolvedProps,
    maskedContext,
  );
  mountClassInstance(instance, Component, resolvedProps, maskedContext);
  finishClassComponent(
    request,
    task,
    keyPath,
    instance,
    Component,
    resolvedProps,
  );
}

const didWarnAboutBadClass: {[string]: boolean} = {};
const didWarnAboutContextTypes: {[string]: boolean} = {};
const didWarnAboutContextTypeOnFunctionComponent: {[string]: boolean} = {};
const didWarnAboutGetDerivedStateOnFunctionComponent: {[string]: boolean} = {};
let didWarnAboutReassigningProps = false;
let didWarnAboutGenerators = false;
let didWarnAboutMaps = false;

function renderFunctionComponent(
  request: Request,
  task: Task,
  keyPath: KeyNode,
  Component: any,
  props: any,
): void {
  let legacyContext;
  if (!disableLegacyContext && !disableLegacyContextForFunctionComponents) {
    legacyContext = getMaskedContext(Component, task.legacyContext);
  }
  if (__DEV__) {
    if (
      Component.prototype &&
      typeof Component.prototype.render === 'function'
    ) {
      const componentName = getComponentNameFromType(Component) || 'Unknown';

      if (!didWarnAboutBadClass[componentName]) {
        console.error(
          "The <%s /> component appears to have a render method, but doesn't extend React.Component. " +
            'This is likely to cause errors. Change %s to extend React.Component instead.',
          componentName,
          componentName,
        );
        didWarnAboutBadClass[componentName] = true;
      }
    }
  }

  const value = renderWithHooks(
    request,
    task,
    keyPath,
    Component,
    props,
    legacyContext,
  );
  if (request.aborted) {
    // eslint-disable-next-line no-throw-literal
    throw null;
  }

  const hasId = checkDidRenderIdHook();
  const actionStateCount = getActionStateCount();
  const actionStateMatchingIndex = getActionStateMatchingIndex();

  if (__DEV__) {
    if (Component.contextTypes) {
      const componentName = getComponentNameFromType(Component) || 'Unknown';
      if (!didWarnAboutContextTypes[componentName]) {
        didWarnAboutContextTypes[componentName] = true;
        if (disableLegacyContext) {
          console.error(
            '%s uses the legacy contextTypes API which was removed in React 19. ' +
              'Use React.createContext() with React.useContext() instead. ' +
              '(https://react.dev/link/legacy-context)',
            componentName,
          );
        } else {
          console.error(
            '%s uses the legacy contextTypes API which will be removed soon. ' +
              'Use React.createContext() with React.useContext() instead. ' +
              '(https://react.dev/link/legacy-context)',
            componentName,
          );
        }
      }
    }
  }
  if (__DEV__) {
    validateFunctionComponentInDev(Component);
  }
  finishFunctionComponent(
    request,
    task,
    keyPath,
    value,
    hasId,
    actionStateCount,
    actionStateMatchingIndex,
  );
}

function finishFunctionComponent(
  request: Request,
  task: Task,
  keyPath: KeyNode,
  children: ReactNodeList,
  hasId: boolean,
  actionStateCount: number,
  actionStateMatchingIndex: number,
) {
  let didEmitActionStateMarkers = false;
  if (actionStateCount !== 0 && request.formState !== null) {
    // For each useActionState hook, emit a marker that indicates whether we
    // rendered using the form state passed at the root. We only emit these
    // markers if form state is passed at the root.
    const segment = task.blockedSegment;
    if (segment === null) {
      // Implies we're in reumable mode.
    } else {
      didEmitActionStateMarkers = true;
      const target = segment.chunks;
      for (let i = 0; i < actionStateCount; i++) {
        if (i === actionStateMatchingIndex) {
          pushFormStateMarkerIsMatching(target);
        } else {
          pushFormStateMarkerIsNotMatching(target);
        }
      }
    }
  }

  const prevKeyPath = task.keyPath;
  task.keyPath = keyPath;
  if (hasId) {
    // This component materialized an id. We treat this as its own level, with
    // a single "child" slot.
    const prevTreeContext = task.treeContext;
    const totalChildren = 1;
    const index = 0;
    // Modify the id context. Because we'll need to reset this if something
    // suspends or errors, we'll use the non-destructive render path.
    task.treeContext = pushTreeContext(prevTreeContext, totalChildren, index);
    renderNode(request, task, children, -1);
    // Like the other contexts, this does not need to be in a finally block
    // because renderNode takes care of unwinding the stack.
    task.treeContext = prevTreeContext;
  } else if (didEmitActionStateMarkers) {
    // If there were useActionState hooks, we must use the non-destructive path
    // because this component is not a pure indirection; we emitted markers
    // to the stream.
    renderNode(request, task, children, -1);
  } else {
    // We're now successfully past this task, and we haven't modified the
    // context stack. We don't have to pop back to the previous task every
    // again, so we can use the destructive recursive form.
    renderNodeDestructive(request, task, children, -1);
  }
  task.keyPath = prevKeyPath;
}

function validateFunctionComponentInDev(Component: any): void {
  if (__DEV__) {
    if (Component && Component.childContextTypes) {
      console.error(
        'childContextTypes cannot be defined on a function component.\n' +
          '  %s.childContextTypes = ...',
        Component.displayName || Component.name || 'Component',
      );
    }

    if (typeof Component.getDerivedStateFromProps === 'function') {
      const componentName = getComponentNameFromType(Component) || 'Unknown';

      if (!didWarnAboutGetDerivedStateOnFunctionComponent[componentName]) {
        console.error(
          '%s: Function components do not support getDerivedStateFromProps.',
          componentName,
        );
        didWarnAboutGetDerivedStateOnFunctionComponent[componentName] = true;
      }
    }

    if (
      typeof Component.contextType === 'object' &&
      Component.contextType !== null
    ) {
      const componentName = getComponentNameFromType(Component) || 'Unknown';

      if (!didWarnAboutContextTypeOnFunctionComponent[componentName]) {
        console.error(
          '%s: Function components do not support contextType.',
          componentName,
        );
        didWarnAboutContextTypeOnFunctionComponent[componentName] = true;
      }
    }
  }
}

function renderForwardRef(
  request: Request,
  task: Task,
  keyPath: KeyNode,
  type: any,
  props: Object,
  ref: any,
): void {
  let propsWithoutRef;
  if ('ref' in props) {
    // `ref` is just a prop now, but `forwardRef` expects it to not appear in
    // the props object. This used to happen in the JSX runtime, but now we do
    // it here.
    propsWithoutRef = {} as {[string]: any};
    for (const key in props) {
      // Since `ref` should only appear in props via the JSX transform, we can
      // assume that this is a plain object. So we don't need a
      // hasOwnProperty check.
      if (key !== 'ref') {
        propsWithoutRef[key] = props[key];
      }
    }
  } else {
    propsWithoutRef = props;
  }

  const children = renderWithHooks(
    request,
    task,
    keyPath,
    type.render,
    propsWithoutRef,
    ref,
  );
  const hasId = checkDidRenderIdHook();
  const actionStateCount = getActionStateCount();
  const actionStateMatchingIndex = getActionStateMatchingIndex();
  finishFunctionComponent(
    request,
    task,
    keyPath,
    children,
    hasId,
    actionStateCount,
    actionStateMatchingIndex,
  );
}

function renderMemo(
  request: Request,
  task: Task,
  keyPath: KeyNode,
  type: any,
  props: Object,
  ref: any,
): void {
  const innerType = type.type;
  renderElement(request, task, keyPath, innerType, props, ref);
}

function renderContextConsumer(
  request: Request,
  task: Task,
  keyPath: KeyNode,
  context: ReactContext<any>,
  props: Object,
): void {
  const render = props.children;

  if (__DEV__) {
    if (typeof render !== 'function') {
      console.error(
        'A context consumer was rendered with multiple children, or a child ' +
          "that isn't a function. A context consumer expects a single child " +
          'that is a function. If you did pass a function, make sure there ' +
          'is no trailing or leading whitespace around it.',
      );
    }
  }

  const newValue = readContext(context);
  const newChildren = render(newValue);

  const prevKeyPath = task.keyPath;
  task.keyPath = keyPath;
  renderNodeDestructive(request, task, newChildren, -1);
  task.keyPath = prevKeyPath;
}

function renderContextProvider(
  request: Request,
  task: Task,
  keyPath: KeyNode,
  context: ReactContext<any>,
  props: Object,
): void {
  const value = props.value;
  const children = props.children;
  let prevSnapshot;
  if (__DEV__) {
    prevSnapshot = task.context;
  }
  const prevKeyPath = task.keyPath;
  task.context = pushProvider(context, value);
  task.keyPath = keyPath;
  renderNodeDestructive(request, task, children, -1);
  task.context = popProvider(context);
  task.keyPath = prevKeyPath;
  if (__DEV__) {
    if (prevSnapshot !== task.context) {
      console.error(
        'Popping the context provider did not return back to the original snapshot. This is a bug in React.',
      );
    }
  }
}

function renderLazyComponent(
  request: Request,
  task: Task,
  keyPath: KeyNode,
  lazyComponent: LazyComponentType<any, any>,
  props: Object,
  ref: any,
): void {
  let Component;
  if (__DEV__) {
    Component = callLazyInitInDEV(lazyComponent);
  } else {
    const payload = lazyComponent._payload;
    const init = lazyComponent._init;
    Component = init(payload);
  }
  if (request.aborted) {
    // eslint-disable-next-line no-throw-literal
    throw null;
  }
  renderElement(request, task, keyPath, Component, props, ref);
}

function renderActivity(
  request: Request,
  task: Task,
  keyPath: KeyNode,
  props: ActivityProps,
): void {
  const segment = task.blockedSegment;
  if (segment === null) {
    // Replay
    const mode = props.mode;
    if (mode === 'hidden') {
      // A hidden Activity boundary is not server rendered. Prerendering happens
      // on the client.
    } else {
      // A visible Activity boundary has its children rendered inside the boundary.
      const prevKeyPath = task.keyPath;
      task.keyPath = keyPath;
      renderNode(request, task, props.children, -1);
      task.keyPath = prevKeyPath;
    }
  } else {
    // Render
    const mode = props.mode;
    if (mode === 'hidden') {
      // A hidden Activity boundary is not server rendered. Prerendering happens
      // on the client.
    } else {
      // An Activity boundary is delimited so that we can hydrate it separately.
      pushStartActivityBoundary(segment.chunks, request.renderState);
      segment.lastPushedText = false;
      // A visible Activity boundary has its children rendered inside the boundary.
      const prevKeyPath = task.keyPath;
      task.keyPath = keyPath;
      // We use the non-destructive form because if something suspends, we still
      // need to pop back up and finish the end comment.
      renderNode(request, task, props.children, -1);
      task.keyPath = prevKeyPath;
      pushEndActivityBoundary(segment.chunks, request.renderState);
      segment.lastPushedText = false;
    }
  }
}

function renderViewTransition(
  request: Request,
  task: Task,
  keyPath: KeyNode,
  props: ViewTransitionProps,
) {
  const prevContext = task.formatContext;
  const prevKeyPath = task.keyPath;
  // Get the name off props or generate an auto-generated one in case we need it.
  const autoName = getViewTransitionName(
    props,
    task.treeContext,
    request.resumableState,
  );
  task.formatContext = getViewTransitionFormatContext(
    request.resumableState,
    prevContext,
    getViewTransitionClassName(props.default, props.update),
    getViewTransitionClassName(props.default, props.enter),
    getViewTransitionClassName(props.default, props.exit),
    getViewTransitionClassName(props.default, props.share),
    props.name,
    autoName,
  );
  task.keyPath = keyPath;
  if (props.name != null && props.name !== 'auto') {
    renderNodeDestructive(request, task, props.children, -1);
  } else {
    // This will be auto-assigned a name which claims a "useId" slot.
    // This component materialized an id. We treat this as its own level, with
    // a single "child" slot.
    const prevTreeContext = task.treeContext;
    const totalChildren = 1;
    const index = 0;
    // Modify the id context. Because we'll need to reset this if something
    // suspends or errors, we'll use the non-destructive render path.
    task.treeContext = pushTreeContext(prevTreeContext, totalChildren, index);
    renderNode(request, task, props.children, -1);
    // Like the other contexts, this does not need to be in a finally block
    // because renderNode takes care of unwinding the stack.
    task.treeContext = prevTreeContext;
  }
  task.formatContext = prevContext;
  task.keyPath = prevKeyPath;
}

function renderElement(
  request: Request,
  task: Task,
  keyPath: KeyNode,
  type: any,
  props: Object,
  ref: any,
): void {
  if (typeof type === 'function') {
    if (shouldConstruct(type)) {
      renderClassComponent(request, task, keyPath, type, props);
      return;
    } else {
      renderFunctionComponent(request, task, keyPath, type, props);
      return;
    }
  }
  if (typeof type === 'string') {
    renderHostElement(request, task, keyPath, type, props);
    return;
  }

  switch (type) {
    // LegacyHidden acts the same as a fragment. This only works because we
    // currently assume that every instance of LegacyHidden is accompanied by a
    // host component wrapper. In the hidden mode, the host component is given a
    // `hidden` attribute, which ensures that the initial HTML is not visible.
    // To support the use of LegacyHidden as a true fragment, without an extra
    // DOM node, we would have to hide the initial HTML in some other way.
    // TODO: Delete in LegacyHidden. It's an unstable API only used in the
    // www build. As a migration step, we could add a special prop to Offscreen
    // that simulates the old behavior (no hiding, no change to effects).
    // $FlowFixMe[invalid-compare]
    case REACT_LEGACY_HIDDEN_TYPE:
    // $FlowFixMe[invalid-compare] -- falls through
    case REACT_STRICT_MODE_TYPE:
    // $FlowFixMe[invalid-compare] -- falls through
    case REACT_PROFILER_TYPE:
    // $FlowFixMe[invalid-compare] -- falls through
    case REACT_FRAGMENT_TYPE: {
      const prevKeyPath = task.keyPath;
      task.keyPath = keyPath;
      renderNodeDestructive(request, task, props.children, -1);
      task.keyPath = prevKeyPath;
      return;
    }
    // $FlowFixMe[invalid-compare]
    case REACT_ACTIVITY_TYPE: {
      renderActivity(request, task, keyPath, props);
      return;
    }
    // $FlowFixMe[invalid-compare]
    case REACT_SUSPENSE_LIST_TYPE: {
      renderSuspenseList(request, task, keyPath, props);
      return;
    }
    // $FlowFixMe[invalid-compare]
    case REACT_VIEW_TRANSITION_TYPE: {
      if (enableViewTransition) {
        renderViewTransition(request, task, keyPath, props);
        return;
      }
      // Fallthrough
    }
    // $FlowFixMe[invalid-compare]
    case REACT_SCOPE_TYPE: {
      if (enableScopeAPI) {
        const prevKeyPath = task.keyPath;
        task.keyPath = keyPath;
        renderNodeDestructive(request, task, props.children, -1);
        task.keyPath = prevKeyPath;
        return;
      }
      throw new Error('ReactDOMServer does not yet support scope components.');
    }
    // $FlowFixMe[invalid-compare]
    case REACT_SUSPENSE_TYPE: {
      renderSuspenseBoundary(request, task, keyPath, props);
      return;
    }
  }

  // $FlowFixMe[invalid-compare]
  if (typeof type === 'object' && type !== null) {
    switch (type.$$typeof) {
      // $FlowFixMe[invalid-compare]
      case REACT_FORWARD_REF_TYPE: {
        renderForwardRef(request, task, keyPath, type, props, ref);
        return;
      }
      // $FlowFixMe[invalid-compare]
      case REACT_MEMO_TYPE: {
        renderMemo(request, task, keyPath, type, props, ref);
        return;
      }
      // $FlowFixMe[invalid-compare]
      case REACT_CONTEXT_TYPE: {
        const context = type;
        renderContextProvider(request, task, keyPath, context, props);
        return;
      }
      // $FlowFixMe[invalid-compare]
      case REACT_CONSUMER_TYPE: {
        const context: ReactContext<any> = (type as ReactConsumerType<any>)
          ._context;
        renderContextConsumer(request, task, keyPath, context, props);
        return;
      }
      // $FlowFixMe[invalid-compare]
      case REACT_LAZY_TYPE: {
        renderLazyComponent(request, task, keyPath, type, props, ref);
        return;
      }
    }
  }

  let info = '';
  if (__DEV__) {
    if (
      type === undefined ||
      (typeof type === 'object' &&
        // $FlowFixMe[invalid-compare]
        type !== null &&
        Object.keys(type).length === 0)
    ) {
      info +=
        ' You likely forgot to export your component from the file ' +
        "it's defined in, or you might have mixed up default and " +
        'named imports.';
    }
  }

  throw new Error(
    'Element type is invalid: expected a string (for built-in ' +
      'components) or a class/function (for composite components) ' +
      `but got: ${type == null ? type : typeof type}.${info}`,
  );
}

function resumeNode(
  request: Request,
  task: ReplayTask,
  segmentId: number,
  node: ReactNodeList,
  childIndex: number,
): void {
  const prevReplay = task.replay;
  const blockedBoundary = task.blockedBoundary;
  const resumedSegment = createPendingSegment(
    request,
    0,
    null,
    task.formatContext,
    false,
    false,
  );
  resumedSegment.id = segmentId;
  resumedSegment.parentFlushed = true;
  try {
    // Convert the current ReplayTask to a RenderTask.
    const renderTask: RenderTask = task as any;
    renderTask.replay = null;
    renderTask.blockedSegment = resumedSegment;
    renderNode(request, task, node, childIndex);
    resumedSegment.status = COMPLETED;
    finishedSegment(request, blockedBoundary, resumedSegment);
    if (blockedBoundary === null) {
      request.completedRootSegment = resumedSegment;
    } else {
      queueCompletedSegment(blockedBoundary, resumedSegment);
      if (blockedBoundary.parentFlushed) {
        request.partialBoundaries.push(blockedBoundary);
      }
    }
  } finally {
    // Restore to a ReplayTask.
    task.replay = prevReplay;
    task.blockedSegment = null;
  }
}

function replayElement(
  request: Request,
  task: ReplayTask,
  keyPath: KeyNode,
  name: null | string,
  keyOrIndex: number | string,
  childIndex: number,
  type: any,
  props: Object,
  ref: any,
  replay: ReplaySet,
): void {
  // We're replaying. Find the path to follow.
  const replayNodes = replay.nodes;
  for (let i = 0; i < replayNodes.length; i++) {
    // Flow doesn't support refinement on tuples so we do it manually here.
    const node = replayNodes[i];
    if (keyOrIndex !== node[1]) {
      continue;
    }
    if (node.length === 4) {
      // Matched a replayable path.
      // Let's double check that the component name matches as a precaution.
      if (name !== null && name !== node[0]) {
        throw new Error(
          'Expected the resume to render <' +
            (node[0] as any) +
            '> in this slot but instead it rendered <' +
            name +
            '>. ' +
            "The tree doesn't match so React will fallback to client rendering.",
        );
      }
      const childNodes = node[2];
      const childSlots = node[3];
      const currentNode = task.node;
      task.replay = {nodes: childNodes, slots: childSlots, pendingTasks: 1};
      try {
        renderElement(request, task, keyPath, type, props, ref);
        if (
          task.replay.pendingTasks === 1 &&
          task.replay.nodes.length > 0
          // TODO check remaining slots
        ) {
          throw new Error(
            "Couldn't find all resumable slots by key/index during replaying. " +
              "The tree doesn't match so React will fallback to client rendering.",
          );
        }
        task.replay.pendingTasks--;
      } catch (x) {
        if (
          typeof x === 'object' &&
          x !== null &&
          (x === SuspenseException || typeof x.then === 'function')
        ) {
          // Suspend
          if (task.node === currentNode) {
            // This same element suspended so we need to pop the replay we just added.
            task.replay = replay;
          } else {
            // We finished rendering this node, so now we can consume this slot.
            replayNodes.splice(i, 1);
          }
          throw x;
        }
        task.replay.pendingTasks--;
        // Unlike regular render, we don't terminate the siblings if we error
        // during a replay. That's because this component didn't actually error
        // in the original prerender. What's unable to complete is the child
        // replay nodes which might be Suspense boundaries which are able to
        // absorb the error and we can still continue with siblings.
        const thrownInfo = getThrownInfo(task.componentStack);
        erroredReplay(
          request,
          task.blockedBoundary,
          request.aborted ? request.fatalError : x,
          thrownInfo,
          childNodes,
          childSlots,
          __DEV__ ? task.debugTask : null,
        );
      }
      task.replay = replay;
    } else {
      // Let's double check that the component type matches.
      if (type !== REACT_SUSPENSE_TYPE) {
        const expectedType = 'Suspense';
        throw new Error(
          'Expected the resume to render <' +
            expectedType +
            '> in this slot but instead it rendered <' +
            (getComponentNameFromType(type) || 'Unknown') +
            '>. ' +
            "The tree doesn't match so React will fallback to client rendering.",
        );
      }
      // Matched a replayable path.
      replaySuspenseBoundary(
        request,
        task,
        keyPath,
        props,
        node[5],
        node[2],
        node[3],
        node[4] === null ? [] : node[4][2],
        node[4] === null ? null : node[4][3],
      );
    }
    // We finished rendering this node, so now we can consume this
    // slot. This must happen after in case we rerender this task.
    replayNodes.splice(i, 1);
    return;
  }
  // We didn't find any matching nodes. We assume that this element was already
  // rendered in the prelude and skip it.
}

function validateIterable(
  task: Task,
  iterable: Iterable<any>,
  childIndex: number,
  iterator: Iterator<any>,
  iteratorFn: () => ?Iterator<any>,
): void {
  if (__DEV__) {
    if (iterator === iterable) {
      // We don't support rendering Generators as props because it's a mutation.
      // See https://github.com/facebook/react/issues/12995
      // We do support generators if they were created by a GeneratorFunction component
      // as its direct child since we can recreate those by rerendering the component
      // as needed.
      const isGeneratorComponent =
        childIndex === -1 && // Only the root child is valid
        task.componentStack !== null &&
        typeof task.componentStack.type === 'function' && // FunctionComponent
        // $FlowFixMe[method-unbinding]
        Object.prototype.toString.call(task.componentStack.type) ===
          '[object GeneratorFunction]' &&
        // $FlowFixMe[method-unbinding]
        Object.prototype.toString.call(iterator) === '[object Generator]';
      if (!isGeneratorComponent) {
        if (!didWarnAboutGenerators) {
          console.error(
            'Using Iterators as children is unsupported and will likely yield ' +
              'unexpected results because enumerating a generator mutates it. ' +
              'You may convert it to an array with `Array.from()` or the ' +
              '`[...spread]` operator before rendering. You can also use an ' +
              'Iterable that can iterate multiple times over the same items.',
          );
        }
        didWarnAboutGenerators = true;
      }
    } else if ((iterable as any).entries === iteratorFn) {
      // Warn about using Maps as children
      if (!didWarnAboutMaps) {
        console.error(
          'Using Maps as children is not supported. ' +
            'Use an array of keyed ReactElements instead.',
        );
        didWarnAboutMaps = true;
      }
    }
  }
}

function validateAsyncIterable(
  task: Task,
  iterable: AsyncIterable<any>,
  childIndex: number,
  iterator: AsyncIterator<any>,
): void {
  if (__DEV__) {
    if (iterator === iterable) {
      // We don't support rendering Generators as props because it's a mutation.
      // See https://github.com/facebook/react/issues/12995
      // We do support generators if they were created by a GeneratorFunction component
      // as its direct child since we can recreate those by rerendering the component
      // as needed.
      const isGeneratorComponent =
        childIndex === -1 && // Only the root child is valid
        task.componentStack !== null &&
        typeof task.componentStack.type === 'function' && // FunctionComponent
        // $FlowFixMe[method-unbinding]
        Object.prototype.toString.call(task.componentStack.type) ===
          '[object AsyncGeneratorFunction]' &&
        // $FlowFixMe[method-unbinding]
        Object.prototype.toString.call(iterator) === '[object AsyncGenerator]';
      if (!isGeneratorComponent) {
        if (!didWarnAboutGenerators) {
          console.error(
            'Using AsyncIterators as children is unsupported and will likely yield ' +
              'unexpected results because enumerating a generator mutates it. ' +
              'You can use an AsyncIterable that can iterate multiple times over ' +
              'the same items.',
          );
        }
        didWarnAboutGenerators = true;
      }
    }
  }
}

function warnOnFunctionType(invalidChild: Function) {
  if (__DEV__) {
    const name = invalidChild.displayName || invalidChild.name || 'Component';
    console.error(
      'Functions are not valid as a React child. This may happen if ' +
        'you return %s instead of <%s /> from render. ' +
        'Or maybe you meant to call this function rather than return it.',
      name,
      name,
    );
  }
}

function warnOnSymbolType(invalidChild: symbol) {
  if (__DEV__) {
    // eslint-disable-next-line react-internal/safe-string-coercion
    const name = String(invalidChild);
    console.error('Symbols are not valid as a React child.\n' + '  %s', name);
  }
}

// This function by it self renders a node and consumes the task by mutating it
// to update the current execution state.
function renderNodeDestructive(
  request: Request,
  task: Task,
  node: ReactNodeList,
  childIndex: number,
): void {
  if (task.replay !== null && typeof task.replay.slots === 'number') {
    // TODO: Figure out a cheaper place than this hot path to do this check.
    const resumeSegmentID = task.replay.slots;
    resumeNode(request, task, resumeSegmentID, node, childIndex);
    return;
  }
  // Stash the node we're working on. We'll pick up from this task in case
  // something suspends.
  task.node = node;
  task.childIndex = childIndex;

  const previousComponentStack = task.componentStack;
  const previousDebugTask = __DEV__ ? task.debugTask : null;

  pushComponentStack(task);

  retryNode(request, task);

  task.componentStack = previousComponentStack;
  if (__DEV__) {
    task.debugTask = previousDebugTask;
  }
}

function retryNode(request: Request, task: Task): void {
  const node = task.node;
  const childIndex = task.childIndex;

  if (node === null) {
    return;
  }

  // Handle object types
  if (typeof node === 'object') {
    switch ((node as any).$$typeof) {
      case REACT_ELEMENT_TYPE: {
        const element: any = node;
        const type = element.type;
        const key: ReactKey = element.key;
        const props = element.props;

        // TODO: We should get the ref off the props object right before using
        // it.
        const refProp = props.ref;
        const ref = refProp !== undefined ? refProp : null;

        const debugTask: null | ConsoleTask = __DEV__ ? task.debugTask : null;

        const name = getComponentNameFromType(type);
        const keyOrIndex =
          key == null || key === REACT_OPTIMISTIC_KEY
            ? childIndex === -1
              ? 0
              : childIndex
            : key;
        const keyPath = [task.keyPath, name, keyOrIndex];
        if (task.replay !== null) {
          if (debugTask) {
            debugTask.run(
              replayElement.bind(
                null,
                request,
                task,
                keyPath,
                name,
                keyOrIndex,
                childIndex,
                type,
                props,
                ref,
                task.replay,
              ),
            );
          } else {
            replayElement(
              request,
              task,
              keyPath,
              name,
              keyOrIndex,
              childIndex,
              type,
              props,
              ref,
              task.replay,
            );
          }
          // No matches found for this node. We assume it's already emitted in the
          // prelude and skip it during the replay.
        } else {
          // We're doing a plain render.
          if (debugTask) {
            debugTask.run(
              renderElement.bind(
                null,
                request,
                task,
                keyPath,
                type,
                props,
                ref,
              ),
            );
          } else {
            renderElement(request, task, keyPath, type, props, ref);
          }
        }
        return;
      }
      case REACT_PORTAL_TYPE:
        throw new Error(
          'Portals are not currently supported by the server renderer. ' +
            'Render them conditionally so that they only appear on the client render.',
        );
      case REACT_LAZY_TYPE: {
        const lazyNode: LazyComponentType<any, any> = node as any;
        let resolvedNode;
        if (__DEV__) {
          resolvedNode = callLazyInitInDEV(lazyNode);
        } else {
          const payload = lazyNode._payload;
          const init = lazyNode._init;
          resolvedNode = init(payload);
        }
        if (request.aborted) {
          // eslint-disable-next-line no-throw-literal
          throw null;
        }
        // Now we render the resolved node
        renderNodeDestructive(request, task, resolvedNode, childIndex);
        return;
      }
    }

    if (isArray(node)) {
      renderChildrenArray(request, task, node, childIndex);
      return;
    }

    const iteratorFn = getIteratorFn(node);
    if (iteratorFn) {
      const iterator = iteratorFn.call(node);
      if (iterator) {
        if (__DEV__) {
          validateIterable(task, node, childIndex, iterator, iteratorFn);
        }
        // We need to know how many total children are in this set, so that we
        // can allocate enough id slots to acommodate them. So we must exhaust
        // the iterator before we start recursively rendering the children.
        // TODO: This is not great but I think it's inherent to the id
        // generation algorithm.
        let step = iterator.next();
        if (!step.done) {
          const children = [];
          do {
            children.push(step.value);
            step = iterator.next();
          } while (!step.done);
          renderChildrenArray(request, task, children, childIndex);
        }
        return;
      }
    }

    if (
      enableAsyncIterableChildren &&
      typeof (node as any)[ASYNC_ITERATOR] === 'function'
    ) {
      const iterator: AsyncIterator<ReactNodeList> = (node as any)[
        ASYNC_ITERATOR
      ]();
      if (iterator) {
        if (__DEV__) {
          validateAsyncIterable(task, node as any, childIndex, iterator);
        }
        // TODO: Update the task.node to be the iterator to avoid asking
        // for new iterators, but we currently warn for rendering these
        // so needs some refactoring to deal with the warning.

        // Restore the thenable state before resuming.
        const prevThenableState = task.thenableState;
        task.thenableState = null;
        prepareToUseThenableState(prevThenableState);

        // We need to know how many total children are in this set, so that we
        // can allocate enough id slots to acommodate them. So we must exhaust
        // the iterator before we start recursively rendering the children.
        // TODO: This is not great but I think it's inherent to the id
        // generation algorithm.
        const children = [];

        let done = false;

        // $FlowFixMe[invalid-compare]
        if (iterator === node) {
          // If it's an iterator we need to continue reading where we left
          // off. We can do that by reading the first few rows from the previous
          // thenable state.
          // $FlowFixMe[underconstrained-implicit-instantiation]
          let step = readPreviousThenableFromState();
          while (step !== undefined) {
            if (step.done) {
              done = true;
              break;
            }
            children.push(step.value);
            step = readPreviousThenableFromState();
          }
        }

        if (!done) {
          let step = unwrapThenable(iterator.next());
          while (!step.done) {
            children.push(step.value);
            step = unwrapThenable(iterator.next());
          }
        }
        renderChildrenArray(request, task, children, childIndex);
        return;
      }
    }

    // Usables are a valid React node type. When React encounters a Usable in
    // a child position, it unwraps it using the same algorithm as `use`. For
    // example, for promises, React will throw an exception to unwind the
    // stack, then replay the component once the promise resolves.
    //
    // A difference from `use` is that React will keep unwrapping the value
    // until it reaches a non-Usable type.
    //
    // e.g. Usable<Usable<Usable<T>>> should resolve to T
    const maybeUsable: Object = node;
    if (typeof maybeUsable.then === 'function') {
      // Clear any previous thenable state that was created by the unwrapping.
      task.thenableState = null;
      const thenable: Thenable<ReactNodeList> = maybeUsable as any;
      const result = renderNodeDestructive(
        request,
        task,
        unwrapThenable(thenable),
        childIndex,
      );
      return result;
    }

    if (maybeUsable.$$typeof === REACT_CONTEXT_TYPE) {
      const context: ReactContext<ReactNodeList> = maybeUsable as any;
      return renderNodeDestructive(
        request,
        task,
        readContext(context),
        childIndex,
      );
    }

    // $FlowFixMe[method-unbinding]
    const childString = Object.prototype.toString.call(node);

    throw new Error(
      `Objects are not valid as a React child (found: ${
        childString === '[object Object]'
          ? 'object with keys {' + Object.keys(node).join(', ') + '}'
          : childString
      }). ` +
        'If you meant to render a collection of children, use an array ' +
        'instead.',
    );
  }

  if (typeof node === 'string') {
    const segment = task.blockedSegment;
    if (segment === null) {
      // We assume a text node doesn't have a representation in the replay set,
      // since it can't postpone. If it does, it'll be left unmatched and error.
    } else {
      segment.lastPushedText = pushTextInstance(
        segment.chunks,
        node,
        request.renderState,
        segment.lastPushedText,
      );
    }
    return;
  }

  if (typeof node === 'number' || typeof node === 'bigint') {
    const segment = task.blockedSegment;
    if (segment === null) {
      // We assume a text node doesn't have a representation in the replay set,
      // since it can't postpone. If it does, it'll be left unmatched and error.
    } else {
      segment.lastPushedText = pushTextInstance(
        segment.chunks,
        '' + node,
        request.renderState,
        segment.lastPushedText,
      );
    }
    return;
  }

  if (__DEV__) {
    if (typeof node === 'function') {
      warnOnFunctionType(node);
    }
    if (typeof node === 'symbol') {
      warnOnSymbolType(node);
    }
  }
}

function replayFragment(
  request: Request,
  task: ReplayTask,
  children: Array<any>,
  childIndex: number,
): void {
  // If we're supposed follow this array, we'd expect to see a ReplayNode matching
  // this fragment.
  const replay = task.replay;
  const replayNodes = replay.nodes;
  for (let j = 0; j < replayNodes.length; j++) {
    const node = replayNodes[j];
    if (node[1] !== childIndex) {
      continue;
    }
    // Matched a replayable path.
    const childNodes = node[2];
    const childSlots = node[3];
    task.replay = {nodes: childNodes, slots: childSlots, pendingTasks: 1};
    try {
      renderChildrenArray(request, task, children, -1);
      if (task.replay.pendingTasks === 1 && task.replay.nodes.length > 0) {
        throw new Error(
          "Couldn't find all resumable slots by key/index during replaying. " +
            "The tree doesn't match so React will fallback to client rendering.",
        );
      }
      task.replay.pendingTasks--;
    } catch (x) {
      if (
        typeof x === 'object' &&
        x !== null &&
        (x === SuspenseException || typeof x.then === 'function')
      ) {
        // Suspend
        throw x;
      }
      task.replay.pendingTasks--;
      // Unlike regular render, we don't terminate the siblings if we error
      // during a replay. That's because this component didn't actually error
      // in the original prerender. What's unable to complete is the child
      // replay nodes which might be Suspense boundaries which are able to
      // absorb the error and we can still continue with siblings.
      // This is an error, stash the component stack if it is null.
      const thrownInfo = getThrownInfo(task.componentStack);
      erroredReplay(
        request,
        task.blockedBoundary,
        request.aborted ? request.fatalError : x,
        thrownInfo,
        childNodes,
        childSlots,
        __DEV__ ? task.debugTask : null,
      );
    }
    task.replay = replay;
    // We finished rendering this node, so now we can consume this
    // slot. This must happen after in case we rerender this task.
    replayNodes.splice(j, 1);
    break;
  }
}

function warnForMissingKey(request: Request, task: Task, child: mixed): void {
  if (__DEV__) {
    if (
      child === null ||
      typeof child !== 'object' ||
      (child.$$typeof !== REACT_ELEMENT_TYPE &&
        child.$$typeof !== REACT_PORTAL_TYPE)
    ) {
      return;
    }

    if (
      !child._store ||
      ((child._store.validated || child.key != null) &&
        child._store.validated !== 2)
    ) {
      return;
    }

    if (typeof child._store !== 'object') {
      throw new Error(
        'React Component in warnForMissingKey should have a _store. ' +
          'This error is likely caused by a bug in React. Please file an issue.',
      );
    }

    // $FlowFixMe[cannot-write] unable to narrow type from mixed to writable object
    child._store.validated = 1;

    let didWarnForKey = request.didWarnForKey;
    if (didWarnForKey == null) {
      didWarnForKey = request.didWarnForKey = new WeakSet();
    }
    const parentStackFrame = task.componentStack;
    if (parentStackFrame === null || didWarnForKey.has(parentStackFrame)) {
      // We already warned for other children in this parent.
      return;
    }
    didWarnForKey.add(parentStackFrame);

    const componentName = getComponentNameFromType(child.type);
    const childOwner = child._owner;
    const parentOwner = parentStackFrame.owner;

    let currentComponentErrorInfo = '';
    if (parentOwner && typeof parentOwner.type !== 'undefined') {
      const name = getComponentNameFromType(parentOwner.type);
      if (name) {
        currentComponentErrorInfo =
          '\n\nCheck the render method of `' + name + '`.';
      }
    }
    if (!currentComponentErrorInfo) {
      if (componentName) {
        currentComponentErrorInfo = `\n\nCheck the top-level render call using <${componentName}>.`;
      }
    }

    // Usually the current owner is the offender, but if it accepts children as a
    // property, it may be the creator of the child that's responsible for
    // assigning it a key.
    let childOwnerAppendix = '';
    if (childOwner != null && parentOwner !== childOwner) {
      let ownerName = null;
      if (typeof childOwner.type !== 'undefined') {
        ownerName = getComponentNameFromType(childOwner.type);
      } else if (typeof childOwner.name === 'string') {
        ownerName = childOwner.name;
      }
      if (ownerName) {
        // Give the component that originally created this child.
        childOwnerAppendix = ` It was passed a child from ${ownerName}.`;
      }
    }

    // We create a fake component stack for the child to log the stack trace from.
    const previousComponentStack = task.componentStack;
    const stackFrame = createComponentStackFromType(
      task.componentStack,
      (child as any).type,
      (child as any)._owner,
      (child as any)._debugStack,
    );
    task.componentStack = stackFrame;
    console.error(
      'Each child in a list should have a unique "key" prop.' +
        '%s%s See https://react.dev/link/warning-keys for more information.',
      currentComponentErrorInfo,
      childOwnerAppendix,
    );
    task.componentStack = previousComponentStack;
  }
}

function renderChildrenArray(
  request: Request,
  task: Task,
  children: Array<any>,
  childIndex: number,
): void {
  const prevKeyPath = task.keyPath;
  const previousComponentStack = task.componentStack;
  let previousDebugTask = null;
  if (__DEV__) {
    previousDebugTask = task.debugTask;
    // We read debugInfo from task.node instead of children because it might have been an
    // unwrapped iterable so we read from the original node.
    pushServerComponentStack(task, (task.node as any)._debugInfo);
  }
  if (childIndex !== -1) {
    task.keyPath = [task.keyPath, 'Fragment', childIndex];
    if (task.replay !== null) {
      replayFragment(
        request,
        // $FlowFixMe[incompatible-type]: Refined.
        task,
        children,
        childIndex,
      );
      task.keyPath = prevKeyPath;
      if (__DEV__) {
        task.componentStack = previousComponentStack;
        task.debugTask = previousDebugTask;
      }
      return;
    }
  }

  const prevTreeContext = task.treeContext;
  const totalChildren = children.length;

  if (task.replay !== null) {
    // Replay
    // First we need to check if we have any resume slots at this level.
    const resumeSlots = task.replay.slots;
    if (resumeSlots !== null && typeof resumeSlots === 'object') {
      for (let i = 0; i < totalChildren; i++) {
        const node = children[i];
        task.treeContext = pushTreeContext(prevTreeContext, totalChildren, i);
        // We need to use the non-destructive form so that we can safely pop back
        // up and render the sibling if something suspends.
        const resumeSegmentID = resumeSlots[i];
        // TODO: If this errors we should still continue with the next sibling.
        if (typeof resumeSegmentID === 'number') {
          resumeNode(request, task, resumeSegmentID, node, i);
          // We finished rendering this node, so now we can consume this
          // slot. This must happen after in case we rerender this task.
          delete resumeSlots[i];
        } else {
          renderNode(request, task, node, i);
        }
      }
      task.treeContext = prevTreeContext;
      task.keyPath = prevKeyPath;
      if (__DEV__) {
        task.componentStack = previousComponentStack;
        task.debugTask = previousDebugTask;
      }
      return;
    }
  }

  for (let i = 0; i < totalChildren; i++) {
    const node = children[i];
    if (__DEV__) {
      warnForMissingKey(request, task, node);
    }
    task.treeContext = pushTreeContext(prevTreeContext, totalChildren, i);
    // We need to use the non-destructive form so that we can safely pop back
    // up and render the sibling if something suspends.
    renderNode(request, task, node, i);
  }

  // Because this context is always set right before rendering every child, we
  // only need to reset it to the previous value at the very end.
  task.treeContext = prevTreeContext;
  task.keyPath = prevKeyPath;
  if (__DEV__) {
    task.componentStack = previousComponentStack;
    task.debugTask = previousDebugTask;
  }
}

function trackPostponedBoundary(
  request: Request,
  trackedPostpones: PostponedHoles,
  boundary: SuspenseBoundary,
): ReplaySuspenseBoundary {
  boundary.status = POSTPONED;
  // We need to eagerly assign it an ID because we'll need to refer to
  // it before flushing and we know that we can't inline it.
  boundary.rootSegmentID = request.nextSegmentId++;

  const tracked = boundary.tracked;
  if (tracked === null) {
    throw new Error(
      'It should not be possible to postpone at the root. This is a bug in React.',
    );
  }

  const boundaryKeyPath = tracked.contentKeyPath;
  if (boundaryKeyPath === null) {
    throw new Error(
      'It should not be possible to postpone at the root. This is a bug in React.',
    );
  }

  const fallbackReplayNode = tracked.fallbackNode;

  const children: Array<ReplayNode> = [];
  const boundaryNode: void | ReplayNode =
    trackedPostpones.workingMap.get(boundaryKeyPath);
  if (boundaryNode === undefined) {
    const suspenseBoundary: ReplaySuspenseBoundary = [
      boundaryKeyPath[1],
      boundaryKeyPath[2],
      children,
      null,
      fallbackReplayNode,
      boundary.rootSegmentID,
    ];
    trackedPostpones.workingMap.set(boundaryKeyPath, suspenseBoundary);
    addToReplayParent(suspenseBoundary, boundaryKeyPath[0], trackedPostpones);
    return suspenseBoundary;
  } else {
    // Upgrade to ReplaySuspenseBoundary.
    const suspenseBoundary: ReplaySuspenseBoundary = boundaryNode as any;
    suspenseBoundary[4] = fallbackReplayNode;
    suspenseBoundary[5] = boundary.rootSegmentID;
    return suspenseBoundary;
  }
}

function trackPostpone(
  request: Request,
  trackedPostpones: PostponedHoles,
  task: Task,
  segment: Segment,
): void {
  segment.status = POSTPONED;

  const keyPath = task.keyPath;
  const boundary = task.blockedBoundary;

  if (boundary === null) {
    segment.id = request.nextSegmentId++;
    trackedPostpones.rootSlots = segment.id;
    if (request.completedRootSegment !== null) {
      // Postpone the root if this was a deeper segment.
      request.completedRootSegment.status = POSTPONED;
    }
    return;
  }

  // $FlowFixMe[invalid-compare]
  if (boundary !== null && boundary.status === PENDING) {
    const boundaryNode = trackPostponedBoundary(
      request,
      trackedPostpones,
      boundary,
    );
    if (
      boundary.tracked !== null &&
      boundary.tracked.contentKeyPath === keyPath &&
      task.childIndex === -1
    ) {
      // Assign ID
      if (segment.id === -1) {
        if (segment.parentFlushed) {
          // If this segment's parent was already flushed, it means we really just
          // skipped the parent and this segment is now the root.
          segment.id = boundary.rootSegmentID;
        } else {
          segment.id = request.nextSegmentId++;
        }
      }
      // We postponed directly inside the Suspense boundary so we mark this for resuming.
      boundaryNode[3] = segment.id;
      return;
    }
    // Otherwise, fall through to add the child node.
  }

  // We know that this will leave a hole so we might as well assign an ID now.
  // We might have one already if we had a parent that gave us its ID.
  if (segment.id === -1) {
    // $FlowFixMe[invalid-compare]
    if (segment.parentFlushed && boundary !== null) {
      // If this segment's parent was already flushed, it means we really just
      // skipped the parent and this segment is now the root.
      segment.id = boundary.rootSegmentID;
    } else {
      segment.id = request.nextSegmentId++;
    }
  }

  if (task.childIndex === -1) {
    // Resume starting from directly inside the previous parent element.
    if (keyPath === null) {
      trackedPostpones.rootSlots = segment.id;
    } else {
      const workingMap = trackedPostpones.workingMap;
      let resumableNode = workingMap.get(keyPath);
      if (resumableNode === undefined) {
        resumableNode = [
          keyPath[1],
          keyPath[2],
          [] as Array<ReplayNode>,
          segment.id,
        ];
        addToReplayParent(resumableNode, keyPath[0], trackedPostpones);
      } else {
        resumableNode[3] = segment.id;
      }
    }
  } else {
    let slots;
    if (keyPath === null) {
      slots = trackedPostpones.rootSlots;
      if (slots === null) {
        slots = trackedPostpones.rootSlots = {} as {[index: number]: number};
      } else if (typeof slots === 'number') {
        throw new Error(
          'It should not be possible to postpone both at the root of an element ' +
            'as well as a slot below. This is a bug in React.',
        );
      }
    } else {
      const workingMap = trackedPostpones.workingMap;
      let resumableNode = workingMap.get(keyPath);
      if (resumableNode === undefined) {
        slots = {} as {[index: number]: number};
        resumableNode = [
          keyPath[1],
          keyPath[2],
          [] as Array<ReplayNode>,
          slots,
        ] as ReplayNode;
        workingMap.set(keyPath, resumableNode);
        addToReplayParent(resumableNode, keyPath[0], trackedPostpones);
      } else {
        slots = resumableNode[3];
        if (slots === null) {
          slots = resumableNode[3] = {} as {[index: number]: number};
        } else if (typeof slots === 'number') {
          throw new Error(
            'It should not be possible to postpone both at the root of an element ' +
              'as well as a slot below. This is a bug in React.',
          );
        }
      }
    }
    slots[task.childIndex] = segment.id;
  }
}

// In case a boundary errors, we need to stop tracking it because we won't
// resume it.
function untrackBoundary(request: Request, boundary: SuspenseBoundary) {
  const trackedPostpones = request.trackedPostpones;
  if (trackedPostpones === null) {
    return;
  }
  const tracked = boundary.tracked;
  if (tracked === null) {
    return;
  }
  const boundaryKeyPath = tracked.contentKeyPath;
  if (boundaryKeyPath === null) {
    return;
  }
  const boundaryNode: void | ReplayNode =
    trackedPostpones.workingMap.get(boundaryKeyPath);
  if (boundaryNode === undefined) {
    return;
  }

  // Downgrade to plain ReplayNode since we won't replay through it.
  // $FlowFixMe[cannot-write]: We intentionally downgrade this to the other tuple.
  boundaryNode.length = 4;
  // Remove any resumable slots.
  boundaryNode[2] = [];
  boundaryNode[3] = null;

  // TODO: We should really just remove the boundary from all parent paths too so
  // we don't replay the path to it.
}

function spawnNewSuspendedReplayTask(
  request: Request,
  task: ReplayTask,
  thenableState: ThenableState | null,
): ReplayTask {
  return createReplayTask(
    request,
    thenableState,
    task.replay,
    task.node,
    task.childIndex,
    task.blockedBoundary,
    task.hoistableState,
    task.abortSet,
    task.keyPath,
    task.formatContext,
    task.context,
    task.treeContext,
    task.row,
    task.componentStack,
    !disableLegacyContext ? task.legacyContext : emptyContextObject,
    __DEV__ ? task.debugTask : null,
  );
}

function spawnNewSuspendedRenderTask(
  request: Request,
  task: RenderTask,
  thenableState: ThenableState | null,
): RenderTask {
  // Something suspended, we'll need to create a new segment and resolve it later.
  const segment = task.blockedSegment;
  const insertionIndex = segment.chunks.length;
  const newSegment = createPendingSegment(
    request,
    insertionIndex,
    null,
    task.formatContext,
    // Adopt the parent segment's leading text embed
    segment.lastPushedText,
    // Assume we are text embedded at the trailing edge
    true,
  );
  segment.children.push(newSegment);
  // Reset lastPushedText for current Segment since the new Segment "consumed" it
  segment.lastPushedText = false;
  return createRenderTask(
    request,
    thenableState,
    task.node,
    task.childIndex,
    task.blockedBoundary,
    newSegment,
    task.blockedPreamble,
    task.hoistableState,
    task.abortSet,
    task.keyPath,
    task.formatContext,
    task.context,
    task.treeContext,
    task.row,
    task.componentStack,
    !disableLegacyContext ? task.legacyContext : emptyContextObject,
    __DEV__ ? task.debugTask : null,
  );
}

// This is a non-destructive form of rendering a node. If it suspends it spawns
// a new task and restores the context of this task to what it was before.
function renderNode(
  request: Request,
  task: Task,
  node: ReactNodeList,
  childIndex: number,
): void {
  // Snapshot the current context in case something throws to interrupt the
  // process.
  const previousFormatContext = task.formatContext;
  const previousLegacyContext = !disableLegacyContext
    ? task.legacyContext
    : emptyContextObject;
  const previousContext = task.context;
  const previousKeyPath = task.keyPath;
  const previousTreeContext = task.treeContext;
  const previousComponentStack = task.componentStack;
  const previousDebugTask = __DEV__ ? task.debugTask : null;
  let x;
  // Store how much we've pushed at this point so we can reset it in case something
  // suspended partially through writing something.
  const segment = task.blockedSegment;
  if (segment === null) {
    // Replay
    task = task as any as ReplayTask; // Refined
    const previousReplaySet: ReplaySet = task.replay;
    try {
      return renderNodeDestructive(request, task, node, childIndex);
    } catch (thrownValue) {
      resetHooksState();

      x =
        thrownValue === SuspenseException
          ? // This is a special type of exception used for Suspense. For historical
            // reasons, the rest of the Suspense implementation expects the thrown
            // value to be a thenable, because before `use` existed that was the
            // (unstable) API for suspending. This implementation detail can change
            // later, once we deprecate the old API in favor of `use`.
            getSuspendedThenable()
          : thrownValue;

      if (request.aborted) {
        // We are aborting so we can just bubble up to the task by falling through
        // $FlowFixMe[invalid-compare]
      } else if (typeof x === 'object' && x !== null) {
        // $FlowFixMe[method-unbinding]
        if (typeof x.then === 'function') {
          const wakeable: Wakeable = x as any;
          const thenableState =
            thrownValue === SuspenseException
              ? getThenableStateAfterSuspending()
              : null;
          const newTask = spawnNewSuspendedReplayTask(
            request,
            // $FlowFixMe[incompatible-type]: Refined.
            task,
            thenableState,
          );
          const ping = newTask.ping;
          wakeable.then(ping.resolve, ping.reject);

          // Restore the context. We assume that this will be restored by the inner
          // functions in case nothing throws so we don't use "finally" here.
          task.formatContext = previousFormatContext;
          if (!disableLegacyContext) {
            task.legacyContext = previousLegacyContext;
          }
          task.context = previousContext;
          task.keyPath = previousKeyPath;
          task.treeContext = previousTreeContext;
          task.componentStack = previousComponentStack;
          task.replay = previousReplaySet;
          if (__DEV__) {
            task.debugTask = previousDebugTask;
          }
          // Restore all active ReactContexts to what they were before.
          switchContext(previousContext);
          return;
        }
        if (x.message === 'Maximum call stack size exceeded') {
          // This was a stack overflow. We do a lot of recursion in React by default for
          // performance but it can lead to stack overflows in extremely deep trees.
          // We do have the ability to create a trampoile if this happens which makes
          // this kind of zero-cost.
          const thenableState =
            thrownValue === SuspenseException
              ? getThenableStateAfterSuspending()
              : null;
          const newTask = spawnNewSuspendedReplayTask(
            request,
            // $FlowFixMe[incompatible-type]: Refined.
            task,
            thenableState,
          );

          // Immediately schedule the task for retrying.
          request.pingedTasks.push(newTask);

          // Restore the context. We assume that this will be restored by the inner
          // functions in case nothing throws so we don't use "finally" here.
          task.formatContext = previousFormatContext;
          if (!disableLegacyContext) {
            task.legacyContext = previousLegacyContext;
          }
          task.context = previousContext;
          task.keyPath = previousKeyPath;
          task.treeContext = previousTreeContext;
          task.componentStack = previousComponentStack;
          task.replay = previousReplaySet;
          if (__DEV__) {
            task.debugTask = previousDebugTask;
          }
          // Restore all active ReactContexts to what they were before.
          switchContext(previousContext);
          return;
        }
      }

      // TODO: Abort any undiscovered Suspense boundaries in the ReplayNode.
    }
  } else {
    // Render
    const childrenLength = segment.children.length;
    const chunkLength = segment.chunks.length;
    try {
      return renderNodeDestructive(request, task, node, childIndex);
    } catch (thrownValue) {
      resetHooksState();

      // Reset the write pointers to where we started.
      segment.children.length = childrenLength;
      segment.chunks.length = chunkLength;

      x =
        thrownValue === SuspenseException
          ? // This is a special type of exception used for Suspense. For historical
            // reasons, the rest of the Suspense implementation expects the thrown
            // value to be a thenable, because before `use` existed that was the
            // (unstable) API for suspending. This implementation detail can change
            // later, once we deprecate the old API in favor of `use`.
            getSuspendedThenable()
          : thrownValue;

      if (request.aborted) {
        // We are aborting so we can just bubble up to the task by falling through
        // $FlowFixMe[invalid-compare]
      } else if (typeof x === 'object' && x !== null) {
        // $FlowFixMe[method-unbinding]
        if (typeof x.then === 'function') {
          const wakeable: Wakeable = x as any;
          const thenableState =
            thrownValue === SuspenseException
              ? getThenableStateAfterSuspending()
              : null;
          const newTask = spawnNewSuspendedRenderTask(
            request,
            // $FlowFixMe[incompatible-type]: Refined.
            task,
            thenableState,
          );
          const ping = newTask.ping;
          wakeable.then(ping.resolve, ping.reject);

          // Restore the context. We assume that this will be restored by the inner
          // functions in case nothing throws so we don't use "finally" here.
          task.formatContext = previousFormatContext;
          if (!disableLegacyContext) {
            task.legacyContext = previousLegacyContext;
          }
          task.context = previousContext;
          task.keyPath = previousKeyPath;
          task.treeContext = previousTreeContext;
          task.componentStack = previousComponentStack;
          if (__DEV__) {
            task.debugTask = previousDebugTask;
          }
          // Restore all active ReactContexts to what they were before.
          switchContext(previousContext);
          return;
        }
        if (x.message === 'Maximum call stack size exceeded') {
          // This was a stack overflow. We do a lot of recursion in React by default for
          // performance but it can lead to stack overflows in extremely deep trees.
          // We do have the ability to create a trampoile if this happens which makes
          // this kind of zero-cost.
          const thenableState =
            thrownValue === SuspenseException
              ? getThenableStateAfterSuspending()
              : null;
          const newTask = spawnNewSuspendedRenderTask(
            request,
            // $FlowFixMe[incompatible-type]: Refined.
            task,
            thenableState,
          );

          // Immediately schedule the task for retrying.
          request.pingedTasks.push(newTask);

          // Restore the context. We assume that this will be restored by the inner
          // functions in case nothing throws so we don't use "finally" here.
          task.formatContext = previousFormatContext;
          if (!disableLegacyContext) {
            task.legacyContext = previousLegacyContext;
          }
          task.context = previousContext;
          task.keyPath = previousKeyPath;
          task.treeContext = previousTreeContext;
          task.componentStack = previousComponentStack;
          if (__DEV__) {
            task.debugTask = previousDebugTask;
          }
          // Restore all active ReactContexts to what they were before.
          switchContext(previousContext);
          return;
        }
      }
    }
  }

  // Restore the context. We assume that this will be restored by the inner
  // functions in case nothing throws so we don't use "finally" here.
  task.formatContext = previousFormatContext;
  if (!disableLegacyContext) {
    task.legacyContext = previousLegacyContext;
  }
  task.context = previousContext;
  task.keyPath = previousKeyPath;
  task.treeContext = previousTreeContext;
  // We intentionally do not restore the component stack on the error pathway
  // Whatever handles the error needs to use this stack which is the location of the
  // error. We must restore the stack wherever we handle this

  // Restore all active ReactContexts to what they were before.
  switchContext(previousContext);

  throw x;
}

function erroredReplay(
  request: Request,
  boundary: Root | SuspenseBoundary,
  error: mixed,
  errorInfo: ThrownInfo,
  replayNodes: ReplayNode[],
  resumeSlots: ResumeSlots,
  debugTask: null | ConsoleTask,
): void {
  // Erroring during a replay doesn't actually cause an error by itself because
  // that component has already rendered. What causes the error is the resumable
  // points that we did not yet finish which will be below the point of the reset.
  // For example, if we're replaying a path to a Suspense boundary that is not done
  // that doesn't error the parent Suspense boundary.
  // This might be a bit strange that the error in a parent gets thrown at a child.
  // We log it only once and reuse the digest.
  const errorDigest = logRecoverableError(request, error, errorInfo, debugTask);
  abortRemainingReplayNodes(
    request,
    boundary,
    replayNodes,
    resumeSlots,
    error,
    errorDigest,
    errorInfo,
    false,
  );
}

function erroredTask(
  request: Request,
  boundary: Root | SuspenseBoundary,
  row: null | SuspenseListRow,
  error: mixed,
  errorInfo: ThrownInfo,
  debugTask: null | ConsoleTask,
) {
  if (row !== null) {
    if (--row.pendingTasks === 0) {
      finishSuspenseListRow(request, row);
    }
  }

  request.allPendingTasks--;

  // Report the error to a global handler.
  // We don't handle halts here because we only halt when prerendering and
  // when prerendering we should be finishing tasks not erroring them when
  // they halt or postpone
  const errorDigest = logRecoverableError(request, error, errorInfo, debugTask);
  if (boundary === null) {
    fatalError(request, error, errorInfo, debugTask);
    // The shell fatally errored, so the render can never complete. Return before
    // the completeAll check below so we don't fire onAllReady for a render that
    // produced nothing. This mirrors finishAbortedTask, which also returns after
    // a fatalError on the root.
    return;
  } else {
    boundary.pendingTasks--;
    if (boundary.status !== CLIENT_RENDERED) {
      boundary.status = CLIENT_RENDERED;
      encodeErrorForBoundary(boundary, errorDigest, error, errorInfo, false);
      untrackBoundary(request, boundary);

      const boundaryRow = boundary.row;
      if (boundaryRow !== null) {
        // Unblock the SuspenseListRow that was blocked by this boundary.
        // finishSuspenseListRow → unblockSuspenseListRow → finishedTask reenters
        // and decrements allPendingTasks. Pin the counter above zero so those
        // nested calls can't trip completeAll before this outer frame's own
        // zero check at the end.
        request.allPendingTasks++;
        if (--boundaryRow.pendingTasks === 0) {
          finishSuspenseListRow(request, boundaryRow);
        }
        request.allPendingTasks--;
      }

      // Regardless of what happens next, this boundary won't be displayed,
      // so we can flush it, if the parent already flushed.
      if (boundary.parentFlushed) {
        // We don't have a preference where in the queue this goes since it's likely
        // to error on the client anyway. However, intentionally client-rendered
        // boundaries should be flushed earlier so that they can start on the client.
        // We reuse the same queue for errors.
        request.clientRenderedBoundaries.push(boundary);
      }

      if (
        request.pendingRootTasks === 0 &&
        request.trackedPostpones === null &&
        boundary.preamble !== null
      ) {
        // The root is complete and this boundary may contribute part of the preamble.
        // We eagerly attempt to prepare the preamble here because we expect most requests
        // to have few boundaries which contribute preambles and it allow us to do this
        // preparation work during the work phase rather than the when flushing.
        preparePreamble(request);
      }
    }
  }

  if (request.allPendingTasks === 0) {
    completeAll(request);
  }
}

function abortTaskSoft(this: Request, task: Task): void {
  // This aborts task without aborting the parent boundary that it blocks.
  // It's used for when we didn't need this task to complete the tree.
  // If task was needed, then it should use abortTask instead.
  const request: Request = this;
  const boundary = task.blockedBoundary;
  const segment = task.blockedSegment;
  if (segment !== null) {
    segment.status = ABORTED;
    finishedTask(request, boundary, task.row, segment);
  }
}

function abortRemainingSuspenseBoundary(
  request: Request,
  rootSegmentID: number,
  error: mixed,
  errorDigest: ?string,
  errorInfo: ThrownInfo,
  wasAborted: boolean,
): void {
  const resumedBoundary = createSuspenseBoundary(
    request,
    null,
    new Set(),
    null,
    false,
  );
  resumedBoundary.parentFlushed = true;
  // We restore the same id of this boundary as was used during prerender.
  resumedBoundary.rootSegmentID = rootSegmentID;

  resumedBoundary.status = CLIENT_RENDERED;
  encodeErrorForBoundary(
    resumedBoundary,
    errorDigest,
    error,
    errorInfo,
    wasAborted,
  );

  if (resumedBoundary.parentFlushed) {
    request.clientRenderedBoundaries.push(resumedBoundary);
  }
}

function abortRemainingReplayNodes(
  request: Request,
  boundary: Root | SuspenseBoundary,
  nodes: Array<ReplayNode>,
  slots: ResumeSlots,
  error: mixed,
  errorDigest: ?string,
  errorInfo: ThrownInfo,
  aborted: boolean,
): void {
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    if (node.length === 4) {
      abortRemainingReplayNodes(
        request,
        boundary,
        node[2],
        node[3],
        error,
        errorDigest,
        errorInfo,
        aborted,
      );
    } else {
      const boundaryNode: ReplaySuspenseBoundary = node;
      const rootSegmentID = boundaryNode[5];
      abortRemainingSuspenseBoundary(
        request,
        rootSegmentID,
        error,
        errorDigest,
        errorInfo,
        aborted,
      );
    }
  }
  // Empty the set, since we've cleared it now.
  nodes.length = 0;

  if (slots !== null) {
    // We had something still to resume in the parent boundary. We must trigger
    // the error on the parent boundary since it's not able to complete.
    if (boundary === null) {
      throw new Error(
        'We should not have any resumable nodes in the shell. ' +
          'This is a bug in React.',
      );
    } else if (boundary.status !== CLIENT_RENDERED) {
      boundary.status = CLIENT_RENDERED;
      encodeErrorForBoundary(boundary, errorDigest, error, errorInfo, aborted);
      if (boundary.parentFlushed) {
        request.clientRenderedBoundaries.push(boundary);
      }
    }
    // Empty the set
    if (typeof slots === 'object') {
      for (const index in slots) {
        delete slots[index as any];
      }
    }
  }
}

function abortTask(task: Task, request: Request): void {
  // Mark pending tasks as aborted synchronously so any work that was already
  // scheduled cannot begin after abort is called.
  if (task === request.currentTask) {
    // This is a currently rendering Task. The render itself will abort the task.
    return;
  }
  const boundary = task.blockedBoundary;
  const segment = task.blockedSegment;
  if (segment !== null) {
    segment.status = ABORTED;
  }

  if (__DEV__ && enableAsyncDebugInfo) {
    // Capture async debug information at the point abort begins. The task may
    // receive more data before finishAbort runs and no longer suspend at the
    // call site we need to report.
    let node: any = task.node;
    if (node !== null && typeof node === 'object') {
      let debugInfo = node._debugInfo;
      while (
        typeof node === 'object' &&
        node !== null &&
        node.$$typeof === REACT_LAZY_TYPE
      ) {
        const payload = node._payload;
        if (payload.status === 'fulfilled') {
          node = payload.value;
          continue;
        }
        break;
      }
      if (
        typeof node === 'object' &&
        node !== null &&
        (isArray(node) ||
          typeof node[ASYNC_ITERATOR] === 'function' ||
          // $FlowFixMe[invalid-compare]
          node.$$typeof === REACT_ELEMENT_TYPE ||
          // $FlowFixMe[invalid-compare]
          node.$$typeof === REACT_LAZY_TYPE) &&
        isArray(node._debugInfo)
      ) {
        debugInfo = node._debugInfo;
      }
      pushHaltedAwaitOnComponentStack(task, debugInfo);
      if (task.thenableState !== null) {
        pushSuspendedCallSiteOnComponentStack(request, task);
      }
    }
  }

  if (boundary !== null) {
    boundary.fallbackAbortableTasks.forEach(fallbackTask =>
      abortTask(fallbackTask, request),
    );
  }
}

function finishAbortedTask(task: Task, request: Request, error: mixed): void {
  // Report and complete a task that was synchronously claimed by abortTask.
  // A currently rendering task remains responsible for unwinding itself.
  if (task === request.currentTask) {
    return;
  }
  const boundary = task.blockedBoundary;
  const segment = task.blockedSegment;
  if (segment !== null) {
    if (segment.status !== ABORTED) {
      return;
    }
  }

  const errorInfo = getThrownInfo(task.componentStack);

  if (boundary === null) {
    const replay: null | ReplaySet = task.replay;
    if (replay === null) {
      // We didn't complete the root so we have nothing to show. We can close
      // the request;
      if (request.trackedPostpones !== null && segment !== null) {
        const trackedPostpones = request.trackedPostpones;
        // We are aborting a prerender and must treat the shell as halted
        // We log the error but we still resolve the prerender
        logRecoverableError(request, error, errorInfo, task.debugTask);
        trackPostpone(request, trackedPostpones, task, segment);
        finishedTask(request, null, task.row, segment);
      } else {
        logRecoverableError(request, error, errorInfo, task.debugTask);
        if (request.status !== CLOSING && request.status !== CLOSED) {
          fatalError(request, error, errorInfo, task.debugTask);
        }
      }
      return;
    }
    if (request.status !== CLOSING && request.status !== CLOSED) {
      // If the shell aborts during a replay, that's not a fatal error. Instead
      // we should be able to recover by client rendering all the root boundaries in
      // the ReplaySet.
      replay.pendingTasks--;
      if (replay.pendingTasks === 0 && replay.nodes.length > 0) {
        const errorDigest = logRecoverableError(
          request,
          error,
          errorInfo,
          null,
        );
        abortRemainingReplayNodes(
          request,
          null,
          replay.nodes,
          replay.slots,
          error,
          errorDigest,
          errorInfo,
          true,
        );
      }
      request.pendingRootTasks--;
      if (request.pendingRootTasks === 0) {
        completeShell(request);
      }
    }
  } else {
    // We construct an errorInfo from the boundary's componentStack so the error in dev will indicate which
    // boundary the message is referring to
    const trackedPostpones = request.trackedPostpones;
    if (boundary.status !== CLIENT_RENDERED) {
      if (trackedPostpones !== null && segment !== null) {
        // We are aborting a prerender and must halt this boundary.
        // We treat this like other postpones during prerendering
        logRecoverableError(request, error, errorInfo, task.debugTask);
        trackPostpone(request, trackedPostpones, task, segment);
        // If this boundary was still pending then we haven't already cancelled its fallbacks.
        // We'll need to abort the fallbacks, which will also error that parent boundary.
        boundary.fallbackAbortableTasks.forEach(fallbackTask =>
          finishAbortedTask(fallbackTask, request, error),
        );
        boundary.fallbackAbortableTasks.clear();
        return finishedTask(request, boundary, task.row, segment);
      }
      boundary.status = CLIENT_RENDERED;
      // We are aborting a render or resume which should put boundaries
      // into an explicitly client rendered state
      const errorDigest = logRecoverableError(
        request,
        error,
        errorInfo,
        task.debugTask,
      );
      boundary.status = CLIENT_RENDERED;
      encodeErrorForBoundary(boundary, errorDigest, error, errorInfo, true);

      untrackBoundary(request, boundary);

      if (boundary.parentFlushed) {
        request.clientRenderedBoundaries.push(boundary);
      }
    }

    boundary.pendingTasks--;

    const boundaryRow = boundary.row;
    if (boundaryRow !== null) {
      // Unblock the SuspenseListRow that was blocked by this boundary.
      if (--boundaryRow.pendingTasks === 0) {
        finishSuspenseListRow(request, boundaryRow);
      }
    }

    // If this boundary was still pending then we haven't already cancelled its fallbacks.
    // We'll need to abort the fallbacks, which will also error that parent boundary.
    boundary.fallbackAbortableTasks.forEach(fallbackTask =>
      finishAbortedTask(fallbackTask, request, error),
    );
    boundary.fallbackAbortableTasks.clear();
  }

  const row = task.row;
  if (row !== null) {
    if (--row.pendingTasks === 0) {
      finishSuspenseListRow(request, row);
    }
  }

  request.allPendingTasks--;
  if (request.allPendingTasks === 0) {
    completeAll(request);
  }
}

function finishAbortedTaskDEV(
  task: Task,
  request: Request,
  error: mixed,
): void {
  if (__DEV__) {
    const prevTaskInDEV = currentTaskInDEV;
    const prevGetCurrentStackImpl = ReactSharedInternals.getCurrentStack;
    setCurrentTaskInDEV(task);
    ReactSharedInternals.getCurrentStack = getCurrentStackInDEV;
    try {
      finishAbortedTask(task, request, error);
    } finally {
      setCurrentTaskInDEV(prevTaskInDEV);
      ReactSharedInternals.getCurrentStack = prevGetCurrentStackImpl;
    }
  } else {
    // These errors should never make it into a build so we don't need to encode them in codes.json
    // eslint-disable-next-line react-internal/prod-error-codes
    throw new Error(
      'finishAbortedTaskDEV should never be called in production mode. This is a bug in React.',
    );
  }
}

function abortTaskDEV(task: Task, request: Request): void {
  if (__DEV__) {
    const prevTaskInDEV = currentTaskInDEV;
    const prevGetCurrentStackImpl = ReactSharedInternals.getCurrentStack;
    setCurrentTaskInDEV(task);
    ReactSharedInternals.getCurrentStack = getCurrentStackInDEV;
    try {
      abortTask(task, request);
    } finally {
      setCurrentTaskInDEV(prevTaskInDEV);
      ReactSharedInternals.getCurrentStack = prevGetCurrentStackImpl;
    }
  } else {
    // These errors should never make it into a build so we don't need to encode them in codes.json
    // eslint-disable-next-line react-internal/prod-error-codes
    throw new Error(
      'abortTaskDEV should never be called in production mode. This is a bug in React.',
    );
  }
}

function abortUnwoundTask(task: Task, request: Request): void {
  // This task was rendering when abort began, so the synchronous abort sweep
  // left it alone. It has now unwound from user code and can be completed
  // through the normal abort path.
  if (__DEV__) {
    abortTaskDEV(task, request);
  } else {
    abortTask(task, request);
  }
  task.abortSet.delete(task);
  if (__DEV__) {
    finishAbortedTaskDEV(task, request, request.fatalError);
  } else {
    finishAbortedTask(task, request, request.fatalError);
  }
}

function safelyEmitEarlyPreloads(
  request: Request,
  shellComplete: boolean,
): void {
  try {
    emitEarlyPreloads(
      request.renderState,
      request.resumableState,
      shellComplete,
    );
  } catch (error) {
    // We assume preloads are optimistic and thus non-fatal if errored.
    const errorInfo: ThrownInfo = {};
    logRecoverableError(request, error, errorInfo, null);
  }
}

// I extracted this function out because we want to ensure we consistently emit preloads before
// transitioning to the next request stage and this transition can happen in multiple places in this
// implementation.
function completeShell(request: Request) {
  if (request.trackedPostpones === null) {
    // We only emit early preloads on shell completion for renders. For prerenders
    // we wait for the entire Request to finish because we are not responding to a
    // live request and can wait for as much data as possible.

    // we should only be calling completeShell when the shell is complete so we
    // just use a literal here
    const shellComplete = true;
    safelyEmitEarlyPreloads(request, shellComplete);
  }
  if (request.trackedPostpones === null) {
    // When the shell is complete it will be possible to flush. We attempt to prepre
    // the Preamble here in case it is ready for flushing.
    // We exclude prerenders because these cannot flush until after completeAll has been called
    preparePreamble(request);
  }

  const onShellReady = request.onShellReady;
  onShellReady();
}

// I extracted this function out because we want to ensure we consistently emit preloads before
// transitioning to the next request stage and this transition can happen in multiple places in this
// implementation.
function completeAll(request: Request) {
  // During a render the shell must be complete if the entire request is finished
  // however during a Prerender it is possible that the shell is incomplete because
  // it postponed. We cannot use rootPendingTasks in the prerender case because
  // those hit zero even when the shell postpones. Instead we look at the completedRootSegment
  const shellComplete =
    request.trackedPostpones === null
      ? // Render, we assume it is completed
        true
      : // Prerender Request, we use the state of the root segment
        request.completedRootSegment === null ||
        request.completedRootSegment.status !== POSTPONED;
  safelyEmitEarlyPreloads(request, shellComplete);

  // When the shell is complete it will be possible to flush. We attempt to prepre
  // the Preamble here in case it is ready for flushing
  preparePreamble(request);

  const onAllReady = request.onAllReady;
  onAllReady();
}

function queueCompletedSegment(
  boundary: SuspenseBoundary,
  segment: Segment,
): void {
  if (
    segment.chunks.length === 0 &&
    segment.children.length === 1 &&
    segment.children[0].boundary === null &&
    segment.children[0].id === -1
  ) {
    // This is an empty segment. There's nothing to write, so we can instead transfer the ID
    // to the child. That way any existing references point to the child.
    const childSegment = segment.children[0];
    childSegment.id = segment.id;
    childSegment.parentFlushed = true;
    if (
      childSegment.status === COMPLETED ||
      childSegment.status === ABORTED ||
      childSegment.status === ERRORED
    ) {
      queueCompletedSegment(boundary, childSegment);
    }
  } else {
    const completedSegments = boundary.completedSegments;
    completedSegments.push(segment);
  }
}

function finishedSegment(
  request: Request,
  boundary: Root | SuspenseBoundary,
  segment: Segment,
) {
  // $FlowFixMe[invalid-compare]
  if (byteLengthOfChunk !== null) {
    // Count the bytes of all the chunks of this segment.
    const chunks = segment.chunks;
    let segmentByteSize = 0;
    for (let i = 0; i < chunks.length; i++) {
      segmentByteSize += byteLengthOfChunk(chunks[i]);
    }
    // Accumulate on the parent boundary to power heuristics.
    if (boundary === null) {
      request.byteSize += segmentByteSize;
    } else {
      boundary.byteSize += segmentByteSize;
    }
  }
}

function finishedTask(
  request: Request,
  boundary: Root | SuspenseBoundary,
  row: null | SuspenseListRow,
  segment: null | Segment,
) {
  if (row !== null) {
    if (--row.pendingTasks === 0) {
      finishSuspenseListRow(request, row);
    } else if (row.together) {
      tryToResolveTogetherRow(request, row);
    }
  }
  request.allPendingTasks--;
  if (boundary === null) {
    if (segment !== null && segment.parentFlushed) {
      if (request.completedRootSegment !== null) {
        throw new Error(
          'There can only be one root segment. This is a bug in React.',
        );
      }

      request.completedRootSegment = segment;
    }
    request.pendingRootTasks--;
    if (request.pendingRootTasks === 0) {
      completeShell(request);
    }
  } else {
    boundary.pendingTasks--;
    if (boundary.status === CLIENT_RENDERED) {
      // This already errored.
    } else if (boundary.pendingTasks === 0) {
      if (boundary.status === PENDING) {
        boundary.status = COMPLETED;
      }
      // This must have been the last segment we were waiting on. This boundary is now complete.
      if (segment !== null && segment.parentFlushed) {
        // Our parent segment already flushed, so we need to schedule this segment to be emitted.
        // If it is a segment that was aborted, we'll write other content instead so we don't need
        // to emit it.
        if (segment.status === COMPLETED || segment.status === ABORTED) {
          queueCompletedSegment(boundary, segment);
        }
      }
      if (boundary.parentFlushed) {
        // The segment might be part of a segment that didn't flush yet, but if the boundary's
        // parent flushed, we need to schedule the boundary to be emitted.
        request.completedBoundaries.push(boundary);
      }

      // We can now cancel any pending task on the fallback since we won't need to show it anymore.
      // This needs to happen after we read the parentFlushed flags because aborting can finish
      // work which can trigger user code, which can start flushing, which can change those flags.
      // If the boundary was POSTPONED, we still need to finish the fallback first.
      // If the boundary is eligible to be outlined during flushing we can't cancel the fallback
      // since we might need it when it's being outlined.
      if (boundary.status === COMPLETED) {
        const boundaryRow = boundary.row;
        if (boundaryRow !== null) {
          // Hoist the HoistableState from the boundary to the row so that the next rows
          // can depend on the same dependencies.
          hoistHoistables(boundaryRow.hoistables, boundary.contentState);
        }
        if (!isEligibleForOutlining(request, boundary)) {
          // abortTaskSoft (below) and finishSuspenseListRow → unblockSuspenseListRow
          // → finishedTask (further below) both reenter finishedTask and decrement
          // allPendingTasks. Pin the counter above zero for the duration of these
          // fan-outs so a nested finishedTask can't observe 0 and call completeAll
          // before this outer call reaches its own zero check.
          request.allPendingTasks++;
          boundary.fallbackAbortableTasks.forEach(abortTaskSoft, request);
          boundary.fallbackAbortableTasks.clear();
          if (boundaryRow !== null) {
            // If we aren't eligible for outlining, we don't have to wait until we flush it.
            if (--boundaryRow.pendingTasks === 0) {
              finishSuspenseListRow(request, boundaryRow);
            }
          }
          request.allPendingTasks--;
        }

        if (
          request.pendingRootTasks === 0 &&
          request.trackedPostpones === null &&
          boundary.preamble !== null
        ) {
          // The root is complete and this boundary may contribute part of the preamble.
          // We eagerly attempt to prepare the preamble here because we expect most requests
          // to have few boundaries which contribute preambles and it allow us to do this
          // preparation work during the work phase rather than the when flushing.
          preparePreamble(request);
        }
      } else if (boundary.status === POSTPONED) {
        const boundaryRow = boundary.row;
        if (boundaryRow !== null) {
          if (request.trackedPostpones !== null) {
            // If this boundary is postponed, then we need to also postpone any blocked boundaries
            // in the next row.
            trackPostponedSuspenseListRow(
              request,
              request.trackedPostpones,
              boundaryRow.next,
            );
          }
          // finishSuspenseListRow → unblockSuspenseListRow → finishedTask reenters
          // and decrements allPendingTasks. Pin the counter above zero so those
          // nested calls can't trip completeAll before this outer frame's own
          // zero check at the end.
          request.allPendingTasks++;
          if (--boundaryRow.pendingTasks === 0) {
            // This is really unnecessary since we've already postponed the boundaries but
            // for pairity with other track+finish paths. We might end up using the hoisting.
            finishSuspenseListRow(request, boundaryRow);
          }
          request.allPendingTasks--;
        }
      }
    } else {
      if (segment !== null && segment.parentFlushed) {
        // Our parent already flushed, so we need to schedule this segment to be emitted.
        // If it is a segment that was aborted, we'll write other content instead so we don't need
        // to emit it.
        if (segment.status === COMPLETED || segment.status === ABORTED) {
          queueCompletedSegment(boundary, segment);
          const completedSegments = boundary.completedSegments;
          if (completedSegments.length === 1) {
            // This is the first time since we last flushed that we completed anything.
            // We can schedule this boundary to emit its partially completed segments early
            // in case the parent has already been flushed.
            if (boundary.parentFlushed) {
              request.partialBoundaries.push(boundary);
            }
          }
        }
      }
      const boundaryRow = boundary.row;
      if (boundaryRow !== null && boundaryRow.together) {
        tryToResolveTogetherRow(request, boundaryRow);
      }
    }
  }

  if (request.allPendingTasks === 0) {
    completeAll(request);
  }
}

function retryTask(request: Request, task: Task): void {
  const segment = task.blockedSegment;
  if (segment === null) {
    retryReplayTask(
      request,
      // $FlowFixMe[incompatible-type]: Refined.
      task,
    );
  } else {
    retryRenderTask(
      request,
      // $FlowFixMe[incompatible-type]: Refined.
      task,
      segment,
    );
  }
}

function retryRenderTask(
  request: Request,
  task: RenderTask,
  segment: Segment,
): void {
  if (segment.status !== PENDING) {
    // We completed this by other means before we had a chance to retry it.
    return;
  }

  const prevTask = request.currentTask;
  request.currentTask = task;

  // We restore the context to what it was when we suspended.
  // We don't restore it after we leave because it's likely that we'll end up
  // needing a very similar context soon again.
  switchContext(task.context);
  let prevTaskInDEV = null;
  if (__DEV__) {
    prevTaskInDEV = currentTaskInDEV;
    setCurrentTaskInDEV(task);
  }

  const childrenLength = segment.children.length;
  const chunkLength = segment.chunks.length;
  try {
    // We call the destructive form that mutates this task. That way if something
    // suspends again, we can reuse the same task instead of spawning a new one.

    retryNode(request, task);
    pushSegmentFinale(
      segment.chunks,
      request.renderState,
      segment.lastPushedText,
      segment.textEmbedded,
    );

    task.abortSet.delete(task);
    segment.status = COMPLETED;
    finishedSegment(request, task.blockedBoundary, segment);
    finishedTask(request, task.blockedBoundary, task.row, segment);
  } catch (thrownValue: mixed) {
    resetHooksState();

    // Reset the write pointers to where we started.
    segment.children.length = childrenLength;
    segment.chunks.length = chunkLength;

    const x =
      thrownValue === SuspenseException
        ? // This is a special type of exception used for Suspense. For historical
          // reasons, the rest of the Suspense implementation expects the thrown
          // value to be a thenable, because before `use` existed that was the
          // (unstable) API for suspending. This implementation detail can change
          // later, once we deprecate the old API in favor of `use`.
          getSuspendedThenable()
        : thrownValue;

    if (request.aborted) {
      if (thrownValue === SuspenseException) {
        // This task was rendering when abort() was called, so it never took
        // the normal suspension path below that stores the thenable state.
        // Preserve it before finishing the abort so DEV can replay the task
        // and include this suspended use() call site in the owner stack.
        task.thenableState = getThenableStateAfterSuspending();
      }
      // The task has unwound from user code, so it must no longer appear to
      // be the currently rendering task while we synchronously finish it.
      // Restore the parent instead of clearing this field because finishing
      // can reenter Fizz and abort an outer render that is still on the stack.
      request.currentTask = prevTask;
      abortUnwoundTask(task, request);
      return;
    }

    if (typeof x === 'object' && x !== null) {
      // $FlowFixMe[method-unbinding]
      if (typeof x.then === 'function') {
        // Something suspended again, let's pick it back up later.
        segment.status = PENDING;
        task.thenableState =
          thrownValue === SuspenseException
            ? getThenableStateAfterSuspending()
            : null;
        const ping = task.ping;
        // We've asserted that x is a thenable above
        (x as any).then(ping.resolve, ping.reject);
        return;
      }
    }

    const errorInfo = getThrownInfo(task.componentStack);
    task.abortSet.delete(task);

    segment.status = ERRORED;
    erroredTask(
      request,
      task.blockedBoundary,
      task.row,
      x,
      errorInfo,
      __DEV__ ? task.debugTask : null,
    );
    return;
  } finally {
    request.currentTask = prevTask;
    if (__DEV__) {
      setCurrentTaskInDEV(prevTaskInDEV);
    }
  }
}

function retryReplayTask(request: Request, task: ReplayTask): void {
  if (task.replay.pendingTasks === 0) {
    // There are no pending tasks working on this set, so we must have aborted.
    return;
  }

  const prevTask = request.currentTask;
  request.currentTask = task;

  // We restore the context to what it was when we suspended.
  // We don't restore it after we leave because it's likely that we'll end up
  // needing a very similar context soon again.
  switchContext(task.context);
  let prevTaskInDEV = null;
  if (__DEV__) {
    prevTaskInDEV = currentTaskInDEV;
    setCurrentTaskInDEV(task);
  }

  try {
    // We call the destructive form that mutates this task. That way if something
    // suspends again, we can reuse the same task instead of spawning a new one.
    if (typeof task.replay.slots === 'number') {
      const resumeSegmentID = task.replay.slots;
      resumeNode(request, task, resumeSegmentID, task.node, task.childIndex);
    } else {
      retryNode(request, task);
    }

    if (task.replay.pendingTasks === 1 && task.replay.nodes.length > 0) {
      throw new Error(
        "Couldn't find all resumable slots by key/index during replaying. " +
          "The tree doesn't match so React will fallback to client rendering.",
      );
    }
    task.replay.pendingTasks--;

    task.abortSet.delete(task);
    finishedTask(request, task.blockedBoundary, task.row, null);
  } catch (thrownValue) {
    resetHooksState();

    const x =
      thrownValue === SuspenseException
        ? // This is a special type of exception used for Suspense. For historical
          // reasons, the rest of the Suspense implementation expects the thrown
          // value to be a thenable, because before `use` existed that was the
          // (unstable) API for suspending. This implementation detail can change
          // later, once we deprecate the old API in favor of `use`.
          getSuspendedThenable()
        : thrownValue;

    if (request.aborted) {
      if (thrownValue === SuspenseException) {
        // This task was rendering when abort() was called, so it never took
        // the normal suspension path below that stores the thenable state.
        // Preserve it before finishing the abort so DEV can replay the task
        // and include this suspended use() call site in the owner stack.
        task.thenableState = getThenableStateAfterSuspending();
      }
      // The task has unwound from user code, so it must no longer appear to
      // be the currently rendering task while we synchronously finish it.
      // Restore the parent instead of clearing this field because finishing
      // can reenter Fizz and abort an outer render that is still on the stack.
      request.currentTask = prevTask;
      abortUnwoundTask(task, request);
      return;
    }

    // $FlowFixMe[invalid-compare]
    if (typeof x === 'object' && x !== null) {
      // $FlowFixMe[method-unbinding]
      if (typeof x.then === 'function') {
        // Something suspended again, let's pick it back up later.
        const ping = task.ping;
        x.then(ping.resolve, ping.reject);
        task.thenableState =
          thrownValue === SuspenseException
            ? getThenableStateAfterSuspending()
            : null;
        return;
      }
    }
    task.replay.pendingTasks--;
    task.abortSet.delete(task);
    const errorInfo = getThrownInfo(task.componentStack);
    erroredReplay(
      request,
      task.blockedBoundary,
      request.aborted ? request.fatalError : x,
      errorInfo,
      task.replay.nodes,
      task.replay.slots,
      __DEV__ ? task.debugTask : null,
    );
    request.pendingRootTasks--;
    if (request.pendingRootTasks === 0) {
      completeShell(request);
    }
    request.allPendingTasks--;
    if (request.allPendingTasks === 0) {
      completeAll(request);
    }
    return;
  } finally {
    request.currentTask = prevTask;
    if (__DEV__) {
      setCurrentTaskInDEV(prevTaskInDEV);
    }
  }
}

export function performWork(request: Request): void {
  if (request.aborted || request.status > OPEN) {
    return;
  }
  const prevContext = getActiveContext();
  const prevDispatcher = ReactSharedInternals.H;
  ReactSharedInternals.H = HooksDispatcher;
  const prevAsyncDispatcher = ReactSharedInternals.A;
  ReactSharedInternals.A = DefaultAsyncDispatcher;

  const prevRequest = currentRequest;
  currentRequest = request;

  let prevGetCurrentStackImpl = null;
  if (__DEV__) {
    prevGetCurrentStackImpl = ReactSharedInternals.getCurrentStack;
    ReactSharedInternals.getCurrentStack = getCurrentStackInDEV;
  }
  const prevResumableState = currentResumableState;
  setCurrentResumableState(request.resumableState);
  try {
    const pingedTasks = request.pingedTasks;
    let i;
    for (i = 0; i < pingedTasks.length; i++) {
      const task = pingedTasks[i];
      retryTask(request, task);
    }
    pingedTasks.splice(0, i);
    if (request.destination !== null) {
      flushCompletedQueues(request, request.destination);
    }
  } catch (error) {
    const errorInfo: ThrownInfo = {};
    logRecoverableError(request, error, errorInfo, null);
    fatalError(request, error, errorInfo, null);
  } finally {
    setCurrentResumableState(prevResumableState);

    ReactSharedInternals.H = prevDispatcher;
    ReactSharedInternals.A = prevAsyncDispatcher;

    if (__DEV__) {
      ReactSharedInternals.getCurrentStack = prevGetCurrentStackImpl;
    }
    if (prevDispatcher === HooksDispatcher) {
      // This means that we were in a reentrant work loop. This could happen
      // in a renderer that supports synchronous work like renderToString,
      // when it's called from within another renderer.
      // Normally we don't bother switching the contexts to their root/default
      // values when leaving because we'll likely need the same or similar
      // context again. However, when we're inside a synchronous loop like this
      // we'll to restore the context to what it was before returning.
      switchContext(prevContext);
    }
    currentRequest = prevRequest;
  }
}

function preparePreambleFromSubtree(
  request: Request,
  segment: Segment,
  collectedPreambleSegments: Array<Array<Segment>>,
): boolean {
  if (segment.preambleChildren.length) {
    collectedPreambleSegments.push(segment.preambleChildren);
  }
  let pendingPreambles = false;
  for (let i = 0; i < segment.children.length; i++) {
    const nextSegment = segment.children[i];
    pendingPreambles =
      preparePreambleFromSegment(
        request,
        nextSegment,
        collectedPreambleSegments,
      ) || pendingPreambles;
  }
  return pendingPreambles;
}

function preparePreambleFromSegment(
  request: Request,
  segment: Segment,
  collectedPreambleSegments: Array<Array<Segment>>,
): boolean {
  const boundary = segment.boundary;
  if (boundary === null) {
    // This segment is not a boundary, let's check it's children
    return preparePreambleFromSubtree(
      request,
      segment,
      collectedPreambleSegments,
    );
  }

  const preamble = boundary.preamble;
  if (preamble === null) {
    // This boundary cannot have a preamble so it can't block the flushing of
    // the preamble.
    return false;
  }

  const status = boundary.status;

  switch (status) {
    case COMPLETED: {
      // This boundary is complete. It might have inner boundaries which are pending
      // and able to provide a preamble so we have to check it's children
      hoistPreambleState(request.renderState, preamble.content);
      // We track this boundary's byteSize on the request since it will always flush with
      // the request since it may contribute to the preamble
      request.byteSize += boundary.byteSize;
      const boundaryRootSegment = boundary.completedSegments[0];
      if (!boundaryRootSegment) {
        // Using the same error from flushSegment to avoid making a new one since conceptually the problem is still the same
        throw new Error(
          'A previously unvisited boundary must have exactly one root segment. This is a bug in React.',
        );
      }
      return preparePreambleFromSubtree(
        request,
        boundaryRootSegment,
        collectedPreambleSegments,
      );
    }
    case POSTPONED: {
      // This segment is postponed. When prerendering we consider this pending still because
      // it can resume. If we're rendering then this is equivalent to errored.
      if (request.trackedPostpones !== null) {
        // This boundary won't contribute a preamble to the current prerender
        return true;
      }
      // Expected fallthrough
    }
    case CLIENT_RENDERED: {
      if (segment.status === COMPLETED) {
        // This boundary is errored so if it contains a preamble we should include it
        hoistPreambleState(request.renderState, preamble.fallback);
        return preparePreambleFromSubtree(
          request,
          segment,
          collectedPreambleSegments,
        );
      }
      // Expected fallthrough
    }
    default:
      // This boundary is still pending and might contain a preamble
      return true;
  }
}

function preparePreamble(request: Request) {
  if (
    request.completedRootSegment &&
    request.completedPreambleSegments === null
  ) {
    const collectedPreambleSegments: Array<Array<Segment>> = [];
    const originalRequestByteSize = request.byteSize;
    const hasPendingPreambles = preparePreambleFromSegment(
      request,
      request.completedRootSegment,
      collectedPreambleSegments,
    );
    if (isPreambleReady(request.renderState, hasPendingPreambles)) {
      request.completedPreambleSegments = collectedPreambleSegments;
    } else {
      // We restore the original size since the preamble is not ready
      // and we will prepare it again.
      request.byteSize = originalRequestByteSize;
    }
  }
}

function flushPreamble(
  request: Request,
  destination: Destination,
  rootSegment: Segment,
  preambleSegments: Array<Array<Segment>>,
  skipBlockingShell: boolean,
) {
  // The preamble is ready.
  writePreambleStart(
    destination,
    request.resumableState,
    request.renderState,
    skipBlockingShell,
  );
  for (let i = 0; i < preambleSegments.length; i++) {
    const segments = preambleSegments[i];
    for (let j = 0; j < segments.length; j++) {
      flushSegment(request, destination, segments[j], null);
    }
  }
  writePreambleEnd(destination, request.renderState);
}

function flushSubtree(
  request: Request,
  destination: Destination,
  segment: Segment,
  hoistableState: null | HoistableState,
): boolean {
  segment.parentFlushed = true;
  switch (segment.status) {
    case PENDING: {
      // We're emitting a placeholder for this segment to be filled in later.
      // Therefore we'll need to assign it an ID - to refer to it by.
      segment.id = request.nextSegmentId++;
      // Fallthrough
    }
    case POSTPONED: {
      const segmentID = segment.id;
      // When this segment finally completes it won't be embedded in text since it will flush separately
      segment.lastPushedText = false;
      segment.textEmbedded = false;
      return writePlaceholder(destination, request.renderState, segmentID);
    }
    case COMPLETED: {
      segment.status = FLUSHED;
      let r = true;
      const chunks = segment.chunks;
      let chunkIdx = 0;
      const children = segment.children;

      for (let childIdx = 0; childIdx < children.length; childIdx++) {
        const nextChild = children[childIdx];
        // Write all the chunks up until the next child.
        for (; chunkIdx < nextChild.index; chunkIdx++) {
          writeChunk(destination, chunks[chunkIdx]);
        }
        r = flushSegment(request, destination, nextChild, hoistableState);
      }
      // Finally just write all the remaining chunks
      for (; chunkIdx < chunks.length - 1; chunkIdx++) {
        writeChunk(destination, chunks[chunkIdx]);
      }
      if (chunkIdx < chunks.length) {
        r = writeChunkAndReturn(destination, chunks[chunkIdx]);
      }
      return r;
    }
    case ABORTED: {
      return true;
    }
    default: {
      throw new Error(
        'Aborted, errored or already flushed boundaries should not be flushed again. This is a bug in React.',
      );
    }
  }
}

// Running count for how much bytes of boundaries have flushed inlined into the currently
// flushing root or completed boundary.
let flushedByteSize = 0;

function flushSegment(
  request: Request,
  destination: Destination,
  segment: Segment,
  hoistableState: null | HoistableState,
): boolean {
  const boundary = segment.boundary;
  if (boundary === null) {
    // Not a suspense boundary.
    return flushSubtree(request, destination, segment, hoistableState);
  }

  // We're going to write the boundary. We don't need to maintain this reference since
  // we might reflush this segment at a later time (if it aborts and we inlined) but
  // we don't want to reflush the boundary
  segment.boundary = null;
  boundary.parentFlushed = true;
  // This segment is a Suspense boundary. We need to decide whether to
  // emit the content or the fallback now.
  if (boundary.status === CLIENT_RENDERED) {
    // Emit a client rendered suspense boundary wrapper.
    // We never queue the inner boundary so we'll never emit its content or partial segments.

    const row = boundary.row;
    if (row !== null) {
      // Since this boundary end up client rendered, we can unblock future suspense list rows.
      // This means that they may appear out of order if the future rows succeed but this is
      // a client rendered row.
      if (--row.pendingTasks === 0) {
        finishSuspenseListRow(request, row);
      }
    }

    if (__DEV__) {
      writeStartClientRenderedSuspenseBoundary(
        destination,
        request.renderState,
        boundary.errorDigest,
        boundary.errorMessage,
        boundary.errorStack,
        boundary.errorComponentStack,
      );
    } else {
      writeStartClientRenderedSuspenseBoundary(
        destination,
        request.renderState,
        boundary.errorDigest,
        null,
        null,
        null,
      );
    }
    // Flush the fallback.
    flushSubtree(request, destination, segment, hoistableState);

    return writeEndClientRenderedSuspenseBoundary(
      destination,
      request.renderState,
    );
  } else if (boundary.status !== COMPLETED) {
    if (boundary.status === PENDING) {
      // For pending boundaries we lazily assign an ID to the boundary
      // and root segment.
      boundary.rootSegmentID = request.nextSegmentId++;
    }

    if (boundary.completedSegments.length > 0) {
      // If this is at least partially complete, we can queue it to be partially emitted early.
      request.partialBoundaries.push(boundary);
    }

    // This boundary is still loading. Emit a pending suspense boundary wrapper.

    const id = boundary.rootSegmentID;
    writeStartPendingSuspenseBoundary(destination, request.renderState, id);

    if (hoistableState) {
      hoistHoistables(hoistableState, boundary.fallbackState);
    }
    // Flush the fallback.
    flushSubtree(request, destination, segment, hoistableState);

    return writeEndPendingSuspenseBoundary(destination, request.renderState);
  } else if (
    // We don't outline when we're emitting partially completed boundaries optimistically
    // because it doesn't make sense to outline something if its parent is going to be
    // blocked on something later in the stream anyway.
    !flushingPartialBoundaries &&
    isEligibleForOutlining(request, boundary) &&
    (flushedByteSize + boundary.byteSize > request.progressiveChunkSize ||
      hasSuspenseyContent(boundary.contentState, flushingShell) ||
      boundary.defer)
  ) {
    // Inlining this boundary would make the current sequence being written too large
    // and block the parent for too long. Instead, it will be emitted separately so that we
    // can progressively show other content.
    // We add it to the queue during the flush because we have to ensure that
    // the parent flushes first so that there's something to inject it into.
    // We also have to make sure that it's emitted into the queue in a deterministic slot.
    // I.e. we can't insert it here when it completes.

    // Assign an ID to refer to the future content by.
    boundary.rootSegmentID = request.nextSegmentId++;

    request.completedBoundaries.push(boundary);
    // Emit a pending rendered suspense boundary wrapper.
    writeStartPendingSuspenseBoundary(
      destination,
      request.renderState,
      boundary.rootSegmentID,
    );

    // While we are going to flush the fallback we are going to follow it up with
    // the completed boundary immediately so we make the choice to omit fallback
    // boundary state from the parent since it will be replaced when the boundary
    // flushes later in this pass or in a future flush

    // Flush the fallback.
    flushSubtree(request, destination, segment, hoistableState);

    return writeEndPendingSuspenseBoundary(destination, request.renderState);
  } else {
    // We're inlining this boundary so its bytes get counted to the current running count.
    flushedByteSize += boundary.byteSize;
    if (hoistableState) {
      hoistHoistables(hoistableState, boundary.contentState);
    }

    const row = boundary.row;
    if (row !== null && isEligibleForOutlining(request, boundary)) {
      // Once we have written the boundary, we can unblock the row and let future
      // rows be written. This may schedule new completed boundaries.
      if (--row.pendingTasks === 0) {
        finishSuspenseListRow(request, row);
      }
    }

    // We can inline this boundary's content as a complete boundary.
    writeStartCompletedSuspenseBoundary(destination, request.renderState);

    const completedSegments = boundary.completedSegments;

    if (completedSegments.length !== 1) {
      throw new Error(
        'A previously unvisited boundary must have exactly one root segment. This is a bug in React.',
      );
    }

    const contentSegment = completedSegments[0];
    flushSegment(request, destination, contentSegment, hoistableState);

    return writeEndCompletedSuspenseBoundary(destination, request.renderState);
  }
}

function flushClientRenderedBoundary(
  request: Request,
  destination: Destination,
  boundary: SuspenseBoundary,
): boolean {
  if (__DEV__) {
    return writeClientRenderBoundaryInstruction(
      destination,
      request.resumableState,
      request.renderState,
      boundary.rootSegmentID,
      boundary.errorDigest,
      boundary.errorMessage,
      boundary.errorStack,
      boundary.errorComponentStack,
    );
  } else {
    return writeClientRenderBoundaryInstruction(
      destination,
      request.resumableState,
      request.renderState,
      boundary.rootSegmentID,
      boundary.errorDigest,
      null,
      null,
      null,
    );
  }
}

function flushSegmentContainer(
  request: Request,
  destination: Destination,
  segment: Segment,
  hoistableState: HoistableState,
): boolean {
  writeStartSegment(
    destination,
    request.renderState,
    segment.parentFormatContext,
    segment.id,
  );
  flushSegment(request, destination, segment, hoistableState);
  return writeEndSegment(destination, segment.parentFormatContext);
}

function flushCompletedBoundary(
  request: Request,
  destination: Destination,
  boundary: SuspenseBoundary,
): boolean {
  flushedByteSize = boundary.byteSize; // Start counting bytes
  const completedSegments = boundary.completedSegments;
  let i = 0;
  for (; i < completedSegments.length; i++) {
    const segment = completedSegments[i];
    flushPartiallyCompletedSegment(request, destination, boundary, segment);
  }
  completedSegments.length = 0;

  const row = boundary.row;
  if (row !== null && isEligibleForOutlining(request, boundary)) {
    // Once we have written the boundary, we can unblock the row and let future
    // rows be written. This may schedule new completed boundaries.
    if (--row.pendingTasks === 0) {
      finishSuspenseListRow(request, row);
    }
  }

  writeHoistablesForBoundary(
    destination,
    boundary.contentState,
    request.renderState,
  );
  return writeCompletedBoundaryInstruction(
    destination,
    request.resumableState,
    request.renderState,
    boundary.rootSegmentID,
    boundary.contentState,
  );
}

function flushPartialBoundary(
  request: Request,
  destination: Destination,
  boundary: SuspenseBoundary,
): boolean {
  flushedByteSize = boundary.byteSize; // Start counting bytes
  const completedSegments = boundary.completedSegments;
  let i = 0;
  for (; i < completedSegments.length; i++) {
    const segment = completedSegments[i];
    if (
      !flushPartiallyCompletedSegment(request, destination, boundary, segment)
    ) {
      i++;
      completedSegments.splice(0, i);
      // Only write as much as the buffer wants. Something higher priority
      // might want to write later.
      return false;
    }
  }
  completedSegments.splice(0, i);

  const row = boundary.row;
  if (row !== null && row.together && boundary.pendingTasks === 1) {
    // "together" rows are blocked on their own boundaries.
    // We have now flushed all the boundary's segments as partials.
    // We can now unblock it from blocking the row that will eventually
    // unblock the boundary itself which can issue its complete instruction.
    // TODO: Ideally the complete instruction would be in a single <script> tag.
    if (row.pendingTasks === 1) {
      unblockSuspenseListRow(request, row, row.hoistables);
    } else {
      row.pendingTasks--;
    }
  }

  return writeHoistablesForBoundary(
    destination,
    boundary.contentState,
    request.renderState,
  );
}

function flushPartiallyCompletedSegment(
  request: Request,
  destination: Destination,
  boundary: SuspenseBoundary,
  segment: Segment,
): boolean {
  if (segment.status === FLUSHED) {
    // We've already flushed this inline
    return true;
  }

  const hoistableState = boundary.contentState;

  const segmentID = segment.id;
  if (segmentID === -1) {
    // This segment wasn't previously referred to. This happens at the root of
    // a boundary. We make kind of a leap here and assume this is the root.
    const rootSegmentID = (segment.id = boundary.rootSegmentID);

    if (rootSegmentID === -1) {
      throw new Error(
        'A root segment ID must have been assigned by now. This is a bug in React.',
      );
    }

    return flushSegmentContainer(request, destination, segment, hoistableState);
  } else if (segmentID === boundary.rootSegmentID) {
    // When we emit postponed boundaries, we might have assigned the ID already
    // but it's still the root segment so we can't inject it into the parent yet.
    return flushSegmentContainer(request, destination, segment, hoistableState);
  } else {
    flushSegmentContainer(request, destination, segment, hoistableState);
    return writeCompletedSegmentInstruction(
      destination,
      request.resumableState,
      request.renderState,
      segmentID,
    );
  }
}

let flushingPartialBoundaries = false;
let flushingShell = false;

function flushCompletedQueues(
  request: Request,
  destination: Destination,
): void {
  beginWriting(destination);
  try {
    // The structure of this is to go through each queue one by one and write
    // until the sink tells us to stop. When we should stop, we still finish writing
    // that item fully and then yield. At that point we remove the already completed
    // items up until the point we completed them.

    if (request.pendingRootTasks > 0) {
      // When there are pending root tasks we don't want to flush anything
      return;
    }

    let i;
    const completedRootSegment = request.completedRootSegment;
    if (completedRootSegment !== null) {
      if (completedRootSegment.status === POSTPONED) {
        return;
      }

      const completedPreambleSegments = request.completedPreambleSegments;
      if (completedPreambleSegments === null) {
        // The preamble isn't ready yet even though the root is so we omit flushing
        return;
      }

      flushedByteSize = request.byteSize; // Start counting bytes
      // TODO: Count the size of the preamble chunks too.
      let skipBlockingShell = false;
      if (enableFizzBlockingRender) {
        const blockingRenderMaxSize = getBlockingRenderMaxSize(request);
        if (flushedByteSize > blockingRenderMaxSize) {
          skipBlockingShell = true;
          const maxSizeKb = Math.round(blockingRenderMaxSize / 1000);
          const error = new Error(
            'This rendered a large document (>' +
              maxSizeKb +
              ' kB) without any Suspense ' +
              'boundaries around most of it. That can delay initial paint longer than ' +
              'necessary. To improve load performance, add a <Suspense> or <SuspenseList> ' +
              'around the content you expect to be below the header or below the fold. ' +
              'In the meantime, the content will deopt to paint arbitrary incomplete ' +
              'pieces of HTML.',
          );
          const errorInfo: ThrownInfo = {};
          logRecoverableError(request, error, errorInfo, null);
        }
      }
      flushPreamble(
        request,
        destination,
        completedRootSegment,
        completedPreambleSegments,
        skipBlockingShell,
      );
      flushingShell = true;
      flushSegment(request, destination, completedRootSegment, null);
      flushingShell = false;
      request.completedRootSegment = null;
      const isComplete =
        request.allPendingTasks === 0 &&
        request.clientRenderedBoundaries.length === 0 &&
        request.completedBoundaries.length === 0 &&
        (request.trackedPostpones === null ||
          (request.trackedPostpones.rootNodes.length === 0 &&
            request.trackedPostpones.rootSlots === null));
      writeCompletedRoot(
        destination,
        request.resumableState,
        request.renderState,
        isComplete,
      );
    }

    writeHoistables(destination, request.resumableState, request.renderState);
    // We emit client rendering instructions for already emitted boundaries first.
    // This is so that we can signal to the client to start client rendering them as
    // soon as possible.
    const clientRenderedBoundaries = request.clientRenderedBoundaries;
    for (i = 0; i < clientRenderedBoundaries.length; i++) {
      const boundary = clientRenderedBoundaries[i];
      if (!flushClientRenderedBoundary(request, destination, boundary)) {
        request.destination = null;
        i++;
        clientRenderedBoundaries.splice(0, i);
        return;
      }
    }
    clientRenderedBoundaries.splice(0, i);

    // Next we emit any complete boundaries. It's better to favor boundaries
    // that are completely done since we can actually show them, than it is to emit
    // any individual segments from a partially complete boundary.
    const completedBoundaries = request.completedBoundaries;
    for (i = 0; i < completedBoundaries.length; i++) {
      const boundary = completedBoundaries[i];
      if (!flushCompletedBoundary(request, destination, boundary)) {
        request.destination = null;
        i++;
        completedBoundaries.splice(0, i);
        return;
      }
    }
    completedBoundaries.splice(0, i);

    // Allow anything written so far to flush to the underlying sink before
    // we continue with lower priorities.
    completeWriting(destination);
    beginWriting(destination);

    // TODO: Here we'll emit data used by hydration.

    // Next we emit any segments of any boundaries that are partially complete
    // but not deeply complete.
    flushingPartialBoundaries = true;
    const partialBoundaries = request.partialBoundaries;
    for (i = 0; i < partialBoundaries.length; i++) {
      const boundary = partialBoundaries[i];
      if (!flushPartialBoundary(request, destination, boundary)) {
        request.destination = null;
        i++;
        partialBoundaries.splice(0, i);
        return;
      }
    }
    partialBoundaries.splice(0, i);
    flushingPartialBoundaries = false;

    // Next we check the completed boundaries again. This may have had
    // boundaries added to it in case they were too larged to be inlined.
    // SuspenseListRows might have been unblocked as well.
    // New ones might be added in this loop.
    const largeBoundaries = request.completedBoundaries;
    for (i = 0; i < largeBoundaries.length; i++) {
      const boundary = largeBoundaries[i];
      if (!flushCompletedBoundary(request, destination, boundary)) {
        request.destination = null;
        i++;
        largeBoundaries.splice(0, i);
        return;
      }
    }
    largeBoundaries.splice(0, i);
  } finally {
    flushingPartialBoundaries = false;
    const postponedState = request.postponedState;
    if (postponedState !== null) {
      // The shell flush above may have outlined completed boundaries, advancing
      // nextSegmentId past the value getPostponedState snapshotted before the
      // flush. Re-sync the postponed state to the post-flush high-water mark so
      // the resume allocates segment ids strictly above the shell's and can't
      // emit duplicate B:/S: ids. nextSegmentId only increases, so later flush
      // passes refine this monotonically.
      // TODO: Could be too late if the postponed state was already serialized
      // by API consumers. Accessing postponed state before the prelude has flushed
      // should be forbidden in the API.
      postponedState.nextSegmentId = request.nextSegmentId;
    }
    if (
      request.allPendingTasks === 0 &&
      request.clientRenderedBoundaries.length === 0 &&
      request.completedBoundaries.length === 0
      // We don't need to check any partially completed segments because
      // either they have pending task or they're complete.
    ) {
      request.flushScheduled = false;
      // We write the trailing tags but only if don't have any data to resume.
      // If we need to resume we'll write the postamble in the resume instead.
      writePostamble(destination, request.resumableState);
      completeWriting(destination);
      flushBuffered(destination);
      if (__DEV__) {
        if (request.abortableTasks.size !== 0) {
          console.error(
            'There was still abortable task at the root when we closed. This is a bug in React.',
          );
        }
      }
      // We're done.
      request.status = CLOSED;
      close(destination);
      // We need to stop flowing now because we do not want any async contexts which might call
      // float methods to initiate any flushes after this point
      stopFlowing(request);
    } else {
      completeWriting(destination);
      flushBuffered(destination);
    }
  }
}

export function startWork(request: Request): void {
  // $FlowFixMe[constant-condition]
  if (isWorkLoopExternallyDriven) {
    return;
  } else {
    request.flushScheduled = request.destination !== null;
    // When prerendering we use microtasks for pinging work
    // $FlowFixMe[constant-condition]
    if (supportsRequestStorage) {
      scheduleMicrotask(() =>
        requestStorage.run(request, performWork, request),
      );
    } else {
      scheduleMicrotask(() => performWork(request));
    }
    scheduleWork(() => {
      if (request.status === OPENING) {
        request.status = OPEN;
      }

      if (request.trackedPostpones === null) {
        // this is either a regular render or a resume. For regular render we want
        // to call emitEarlyPreloads after the first performWork because we want
        // are responding to a live request and need to balance sending something early
        // (i.e. don't want for the shell to finish) but we need something to send.
        // The only implementation of this is for DOM at the moment and during resumes nothing
        // actually emits but the code paths here are the same.
        // During a prerender we don't want to be too aggressive in emitting early preloads
        // because we aren't responding to a live request and we can wait for the prerender to
        // postpone before we emit anything.
        // $FlowFixMe[constant-condition]
        if (supportsRequestStorage) {
          requestStorage.run(
            request,
            enqueueEarlyPreloadsAfterInitialWork,
            request,
          );
        } else {
          enqueueEarlyPreloadsAfterInitialWork(request);
        }
      }
    });
  }
}

function enqueueEarlyPreloadsAfterInitialWork(request: Request) {
  const shellComplete = request.pendingRootTasks === 0;
  safelyEmitEarlyPreloads(request, shellComplete);
}

function enqueueFlush(request: Request): void {
  if (
    request.flushScheduled === false &&
    // If there are pinged tasks we are going to flush anyway after work completes
    request.pingedTasks.length === 0 &&
    // If there is no destination there is nothing we can flush to. A flush will
    // happen when we start flowing again
    request.destination !== null
  ) {
    request.flushScheduled = true;
    scheduleWork(() => {
      // We need to existence check destination again here because it might go away
      // in between the enqueueFlush call and the work execution
      const destination = request.destination;
      if (destination) {
        flushCompletedQueues(request, destination);
      } else {
        request.flushScheduled = false;
      }
    });
  }
}

// This function is intented to only be called during the pipe function for the Node builds.
// The reason we need this is because `renderToPipeableStream` is the only API which allows
// you to start flowing before the shell is complete and we've had a chance to emit early
// preloads already. This is really just defensive programming to ensure that we give hosts an
// opportunity to flush early preloads before streaming begins in case they are in an environment
// that only supports a single call to emitEarlyPreloads like the DOM renderers. It's unfortunate
// to put this Node only function directly in ReactFizzServer but it'd be more ackward to factor it
// by moving the implementation into ReactServerStreamConfigNode and even then we may not be able to
// eliminate all the wasted branching.
export function prepareForStartFlowingIfBeforeAllReady(request: Request) {
  const shellComplete =
    request.trackedPostpones === null
      ? // Render Request, we define shell complete by the pending root tasks
        request.pendingRootTasks === 0
      : // Prerender Request, we define shell complete by completedRootSegemtn
        request.completedRootSegment === null
        ? request.pendingRootTasks === 0
        : request.completedRootSegment.status !== POSTPONED;
  safelyEmitEarlyPreloads(request, shellComplete);
}

export function startFlowing(request: Request, destination: Destination): void {
  if (request.status === CLOSING) {
    request.status = CLOSED;
    closeWithError(destination, request.fatalError);
    return;
  }
  if (request.status === CLOSED) {
    return;
  }
  if (request.destination !== null) {
    // We're already flowing.
    return;
  }
  request.destination = destination;

  try {
    flushCompletedQueues(request, destination);
  } catch (error) {
    const errorInfo: ThrownInfo = {};
    logRecoverableError(request, error, errorInfo, null);
    fatalError(request, error, errorInfo, null);
  }
}

export function stopFlowing(request: Request): void {
  request.destination = null;
}

function finishAbort(request: Request, abortableTasks: Set<Task>): void {
  try {
    if (abortableTasks.size > 0) {
      const error = request.fatalError;
      if (__DEV__) {
        abortableTasks.forEach(task =>
          finishAbortedTaskDEV(task, request, error),
        );
      } else {
        abortableTasks.forEach(task => finishAbortedTask(task, request, error));
      }
      abortableTasks.clear();
    }
    if (request.destination !== null) {
      flushCompletedQueues(request, request.destination);
    }
  } catch (error) {
    const errorInfo: ThrownInfo = {};
    logRecoverableError(request, error, errorInfo, null);
    fatalError(request, error, errorInfo, null);
  }
}

// This is called to early terminate a request. It puts all pending boundaries in client rendered state.
export function abort(request: Request, reason: mixed): void {
  if (
    request.aborted ||
    (request.status !== OPEN && request.status !== OPENING)
  ) {
    // Only requests that are not already complete or in the process of aborting
    // can be aborted. in practice this makes abort callable at most once per render.
    return;
  }
  request.aborted = true;
  const error =
    reason === undefined
      ? new Error('The render was aborted by the server without a reason.')
      : typeof reason === 'object' &&
          reason !== null &&
          typeof reason.then === 'function'
        ? new Error('The render was aborted by the server with a promise.')
        : reason;
  // This error isn't necessarily fatal in this case but we need to stash it
  // so we can use it to abort any pending work.
  request.fatalError = error;
  const abortableTasks = request.abortableTasks;
  if (__DEV__) {
    abortableTasks.forEach(task => abortTaskDEV(task, request));
  } else {
    abortableTasks.forEach(task => abortTask(task, request));
  }
  // Even though this looks async some renderers schedule work sync
  // So it is important that the finish step does not assume the stack
  // has unwinded yet
  scheduleWork(() => finishAbort(request, abortableTasks));
}

export function flushResources(request: Request): void {
  enqueueFlush(request);
}

export function getFormState(
  request: Request,
): ReactFormState<any, any> | null {
  return request.formState;
}

export function getResumableState(request: Request): ResumableState {
  return request.resumableState;
}

export function getRenderState(request: Request): RenderState {
  return request.renderState;
}

function addToReplayParent(
  node: ReplayNode,
  parentKeyPath: Root | KeyNode,
  trackedPostpones: PostponedHoles,
): void {
  if (parentKeyPath === null) {
    trackedPostpones.rootNodes.push(node);
  } else {
    const workingMap = trackedPostpones.workingMap;
    let parentNode = workingMap.get(parentKeyPath);
    if (parentNode === undefined) {
      parentNode = [
        parentKeyPath[1],
        parentKeyPath[2],
        [] as Array<ReplayNode>,
        null,
      ] as ReplayNode;
      workingMap.set(parentKeyPath, parentNode);
      addToReplayParent(parentNode, parentKeyPath[0], trackedPostpones);
    }
    parentNode[2].push(node);
  }
}

export type PostponedState = {
  nextSegmentId: number,
  rootFormatContext: FormatContext,
  progressiveChunkSize: number,
  resumableState: ResumableState,
  replayNodes: Array<ReplayNode>,
  replaySlots: ResumeSlots,
};

// Returns the state of a postponed request or null if nothing was postponed.
export function getPostponedState(request: Request): null | PostponedState {
  const trackedPostpones = request.trackedPostpones;
  if (
    trackedPostpones === null ||
    (trackedPostpones.rootNodes.length === 0 &&
      trackedPostpones.rootSlots === null)
  ) {
    // Reset. Let the flushing behave as if we completed the whole document.
    request.trackedPostpones = null;
    return null;
  }
  let replaySlots: ResumeSlots;
  let nextSegmentId: number;
  // True only when we postponed with a real shell (as opposed to postponing the
  // root itself). Only in that case does the prelude flush outline completed
  // boundaries and advance nextSegmentId past the value we capture here.
  const hasFlushableShell =
    request.completedRootSegment === null ||
    // The Root did not postpone
    (request.completedRootSegment.status !== POSTPONED &&
      // the Preamble was available
      request.completedPreambleSegments !== null);
  if (!hasFlushableShell) {
    nextSegmentId = 0;
    // We need to ensure that on resume we retry the root. We use a number
    // type for the replaySlots to signify this (see resumeRequest).
    // The value -1 represents an unassigned ID but is not functionally meaningful
    // for resuming at the root.
    replaySlots = -1;
    // We either postponed the root or we did not have a preamble to flush
    resetResumableState(request.resumableState, request.renderState);
  } else {
    nextSegmentId = request.nextSegmentId;
    replaySlots = trackedPostpones.rootSlots;
    completeResumableState(request.resumableState);
  }
  const postponedState: PostponedState = {
    nextSegmentId,
    rootFormatContext: request.rootFormatContext,
    progressiveChunkSize: request.progressiveChunkSize,
    resumableState: request.resumableState,
    replayNodes: trackedPostpones.rootNodes,
    replaySlots,
  };
  if (hasFlushableShell) {
    // The prelude hasn't flushed yet — it's pull-driven and runs after this
    // (see completeAll -> onAllReady). Flushing the shell outlines completed
    // boundaries, bumping request.nextSegmentId beyond the snapshot above. Hold
    // a reference so flushCompletedQueues can finalize nextSegmentId to the
    // post-flush high-water mark. Otherwise the resume reuses the shell's
    // segment ids and the concatenated document has duplicate B:/S: ids, which
    // cross-wires React's boundary-completion scripts ($RC).
    request.postponedState = postponedState;
  }
  return postponedState;
}
