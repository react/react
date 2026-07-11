/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

/**
 * This is a renderer of React that doesn't have a render target output.
 * It is useful to demonstrate the internals of the reconciler in isolation
 * and for testing semantics of reconciliation separate from the host
 * environment.
 */

import type {ReactNodeList} from 'shared/ReactTypes';

import ReactFizzServer from 'react-server';

type Instance = {
  type: string,
  children: Array<Instance | TextInstance | SuspenseInstance>,
  prop: any,
  hidden: boolean,
};

type TextInstance = {
  text: string,
  hidden: boolean,
};

type ActivityInstance = {
  children: Array<Instance | TextInstance | SuspenseInstance>,
};

type SuspenseInstance = {
  state: 'pending' | 'complete' | 'client-render',
  children: Array<Instance | TextInstance | SuspenseInstance>,
};

type Placeholder = {
  parent: Instance | Segment | SuspenseInstance,
  index: number,
};

type Segment = {
  children: Array<Instance | TextInstance | SuspenseInstance>,
};

type Destination = {
  root: null | Instance | TextInstance | SuspenseInstance,
  placeholders: Map<number, Placeholder>,
  segments: Map<number, Segment>,
  stack: Array<Segment | Instance | SuspenseInstance>,
};

type ResumableState = null;
type RenderState = null;
type HoistableState = null;
type PreambleState = null;

const POP = Buffer.from('/', 'utf8');

function write(destination: Destination, buffer: Uint8Array): void {
  const stack = destination.stack;
  if (buffer === POP) {
    stack.pop();
    return;
  }
  // We assume one chunk is one instance.
  const instance = JSON.parse(Buffer.from(buffer as any).toString('utf8'));
  if (stack.length === 0) {
    destination.root = instance;
  } else {
    const parent = stack[stack.length - 1];
    parent.children.push(instance);
  }
  stack.push(instance);
}

// $FlowFixMe[prop-missing]
// $FlowFixMe[incompatible-type]
const ReactNoopServer = ReactFizzServer({
  scheduleMicrotask(callback: () => void) {
    callback();
  },
  scheduleWork(callback: () => void) {
    callback();
  },
  beginWriting(destination: Destination): void {},
  writeChunk(destination: Destination, buffer: Uint8Array): void {
    write(destination, buffer);
  },
  writeChunkAndReturn(destination: Destination, buffer: Uint8Array): boolean {
    write(destination, buffer);
    return true;
  },
  completeWriting(destination: Destination): void {},
  close(destination: Destination): void {},
  closeWithError(destination: Destination, error: mixed): void {},
  flushBuffered(destination: Destination): void {},

  byteLengthOfChunk: null,

  getChildFormatContext(): null {
    return null;
  },
  getSuspenseFallbackFormatContext(): null {
    return null;
  },
  getSuspenseContentFormatContext(): null {
    return null;
  },

  getViewTransitionFormatContext(): null {
    return null;
  },

  resetResumableState(): void {},
  completeResumableState(): void {},

  pushTextInstance(
    target: Array<Uint8Array>,
    text: string,
    renderState: RenderState,
    textEmbedded: boolean,
  ): boolean {
    const textInstance: TextInstance = {
      text,
      hidden: false,
    };
    target.push(Buffer.from(JSON.stringify(textInstance), 'utf8'), POP);
    return false;
  },
  pushStartInstance(
    target: Array<Uint8Array>,
    type: string,
    props: Object,
  ): ReactNodeList {
    const instance: Instance = {
      type: type,
      children: [],
      prop: props.prop,
      hidden: false,
    };
    target.push(Buffer.from(JSON.stringify(instance), 'utf8'));
    return props.children;
  },

  pushEndInstance(
    target: Array<Uint8Array>,
    type: string,
    props: Object,
  ): void {
    target.push(POP);
  },

  // This is a noop in ReactNoop
  pushSegmentFinale(
    target: Array<Uint8Array>,
    renderState: RenderState,
    lastPushedText: boolean,
    textEmbedded: boolean,
  ): void {},

  writeCompletedRoot(
    destination: Destination,
    resumableState: ResumableState,
    renderState: RenderState,
    isComplete: boolean,
  ): boolean {
    return true;
  },

  writePlaceholder(
    destination: Destination,
    renderState: RenderState,
    id: number,
    // $FlowFixMe[incompatible-type]
  ): boolean {
    const parent = destination.stack[destination.stack.length - 1];
    destination.placeholders.set(id, {
      parent: parent,
      index: parent.children.length,
    });
  },

  pushStartActivityBoundary(
    target: Array<Uint8Array>,
    renderState: RenderState,
  ): void {
    const activityInstance: ActivityInstance = {
      children: [],
    };
    target.push(Buffer.from(JSON.stringify(activityInstance), 'utf8'));
  },

  pushEndActivityBoundary(
    target: Array<Uint8Array>,
    renderState: RenderState,
  ): void {
    target.push(POP);
  },

  writeStartCompletedSuspenseBoundary(
    destination: Destination,
    renderState: RenderState,
  ): boolean {
    const suspenseInstance: SuspenseInstance = {
      state: 'complete',
      children: [],
    };
    const parent = destination.stack[destination.stack.length - 1];
    parent.children.push(suspenseInstance);
    destination.stack.push(suspenseInstance);
    return true;
  },
  writeStartPendingSuspenseBoundary(
    destination: Destination,
    renderState: RenderState,
  ): boolean {
    const suspenseInstance: SuspenseInstance = {
      state: 'pending',
      children: [],
    };
    const parent = destination.stack[destination.stack.length - 1];
    parent.children.push(suspenseInstance);
    destination.stack.push(suspenseInstance);
    return true;
  },
  writeStartClientRenderedSuspenseBoundary(
    destination: Destination,
    renderState: RenderState,
  ): boolean {
    const suspenseInstance: SuspenseInstance = {
      state: 'client-render',
      children: [],
    };
    const parent = destination.stack[destination.stack.length - 1];
    parent.children.push(suspenseInstance);
    destination.stack.push(suspenseInstance);
    return true;
  },
  writeEndCompletedSuspenseBoundary(destination: Destination): boolean {
    destination.stack.pop();
    return true;
  },
  writeEndPendingSuspenseBoundary(destination: Destination): boolean {
    destination.stack.pop();
    return true;
  },
  writeEndClientRenderedSuspenseBoundary(destination: Destination): boolean {
    destination.stack.pop();
    return true;
  },

  writeStartSegment(
    destination: Destination,
    renderState: RenderState,
    formatContext: null,
    id: number,
  ): boolean {
    const segment: Segment = {
      children: [],
    };
    destination.segments.set(id, segment);
    if (destination.stack.length > 0) {
      throw new Error('Segments are only expected at the root of the stack.');
    }
    destination.stack.push(segment);
    return true;
  },
  writeEndSegment(destination: Destination, formatContext: null): boolean {
    destination.stack.pop();
    return true;
  },

  writeCompletedSegmentInstruction(
    destination: Destination,
    renderState: RenderState,
    contentSegmentID: number,
  ): boolean {
    const segment = destination.segments.get(contentSegmentID);
    if (!segment) {
      throw new Error('Missing segment.');
    }
    const placeholder = destination.placeholders.get(contentSegmentID);
    if (!placeholder) {
      throw new Error('Missing placeholder.');
    }
    placeholder.parent.children.splice(
      placeholder.index,
      0,
      ...segment.children,
    );
    return true;
  },

  writeCompletedBoundaryInstruction(
    destination: Destination,
    renderState: RenderState,
    boundary: SuspenseInstance,
    contentSegmentID: number,
  ): boolean {
    const segment = destination.segments.get(contentSegmentID);
    if (!segment) {
      throw new Error('Missing segment.');
    }
    boundary.children = segment.children;
    boundary.state = 'complete';
    return true;
  },

  writeClientRenderBoundaryInstruction(
    destination: Destination,
    renderState: RenderState,
    boundary: SuspenseInstance,
  ): boolean {
    // $FlowFixMe[prop-missing]
    boundary.status = 'client-render';
    return true;
  },

  writePreambleStart() {},
  writePreambleEnd() {},
  writeHoistables() {},
  writeHoistablesForBoundary() {},
  writePostamble() {},
  hoistHoistables(parent: HoistableState, child: HoistableState) {},
  hasSuspenseyContent(
    hoistableState: HoistableState,
    flushingInShell: boolean,
  ): boolean {
    return false;
  },
  createHoistableState(): HoistableState {
    return null;
  },
  emitEarlyPreloads() {},
  createPreambleState(): PreambleState {
    return null;
  },
  canHavePreamble() {
    return false;
  },
  hoistPreambleState() {},
  isPreambleReady() {
    return true;
  },
  isPreambleContext() {
    return false;
  },
});

type Options = {
  progressiveChunkSize?: number,
  onShellReady?: () => void,
  onAllReady?: () => void,
  onError?: (error: mixed) => ?string,
};

function render(children: React$Element<any>, options?: Options): Destination {
  // $FlowFixMe[prop-missing]
  // $FlowFixMe[incompatible-type]
  const destination: Destination = {
    root: null,
    placeholders: new Map(),
    segments: new Map(),
    stack: [],
    abort() {
      ReactNoopServer.abort(request);
    },
  };
  const request = ReactNoopServer.createRequest(
    // $FlowFixMe[incompatible-type]
    children,
    // $FlowFixMe[incompatible-type]
    null,
    // $FlowFixMe[incompatible-type]
    null,
    // $FlowFixMe[incompatible-type]
    null,
    options ? options.progressiveChunkSize : undefined,
    options ? options.onError : undefined,
    options ? options.onAllReady : undefined,
    options ? options.onShellReady : undefined,
  );
  ReactNoopServer.startWork(request);
  // $FlowFixMe[incompatible-type]
  ReactNoopServer.startFlowing(request, destination);
  return destination;
}

export {render};
