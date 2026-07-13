/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {
  RenderState as BaseRenderState,
  ResumableState,
  HoistableState,
  StyleQueue,
  Resource,
  HeadersDescriptor,
  PreambleState,
  FormatContext,
} from './ReactFizzConfigDOM';

import {
  createRenderState as createRenderStateImpl,
  pushTextInstance as pushTextInstanceImpl,
  pushSegmentFinale as pushSegmentFinaleImpl,
  pushStartActivityBoundary as pushStartActivityBoundaryImpl,
  pushEndActivityBoundary as pushEndActivityBoundaryImpl,
  writeStartCompletedSuspenseBoundary as writeStartCompletedSuspenseBoundaryImpl,
  writeStartClientRenderedSuspenseBoundary as writeStartClientRenderedSuspenseBoundaryImpl,
  writeEndCompletedSuspenseBoundary as writeEndCompletedSuspenseBoundaryImpl,
  writeEndClientRenderedSuspenseBoundary as writeEndClientRenderedSuspenseBoundaryImpl,
  writePreambleStart as writePreambleStartImpl,
} from './ReactFizzConfigDOM';

import type {
  Destination,
  Chunk,
  PrecomputedChunk,
} from 'react-server/src/ReactServerStreamConfig';

import type {FormStatus} from '../shared/ReactDOMFormActions';

import {NotPending} from '../shared/ReactDOMFormActions';

export const isPrimaryRenderer = false;

export type RenderState = {
  // Keep this in sync with ReactFizzConfigDOM
  placeholderPrefix: PrecomputedChunk,
  segmentPrefix: PrecomputedChunk,
  boundaryPrefix: PrecomputedChunk,
  startInlineScript: PrecomputedChunk,
  startInlineStyle: PrecomputedChunk,
  preamble: PreambleState,
  externalRuntimeScript: null | any,
  bootstrapChunks: Array<Chunk | PrecomputedChunk>,
  importMapChunks: Array<Chunk | PrecomputedChunk>,
  onHeaders: void | ((headers: HeadersDescriptor) => void),
  headers: null | {
    preconnects: string,
    fontPreloads: string,
    highImagePreloads: string,
    remainingCapacity: number,
  },
  resets: BaseRenderState['resets'],
  charsetChunks: Array<Chunk | PrecomputedChunk>,
  viewportChunks: Array<Chunk | PrecomputedChunk>,
  hoistableChunks: Array<Chunk | PrecomputedChunk>,
  preconnects: Set<Resource>,
  fontPreloads: Set<Resource>,
  highImagePreloads: Set<Resource>,
  // usedImagePreloads: Set<Resource>,
  styles: Map<string, StyleQueue>,
  bootstrapScripts: Set<Resource>,
  scripts: Set<Resource>,
  bulkPreloads: Set<Resource>,
  preloads: {
    images: Map<string, Resource>,
    stylesheets: Map<string, Resource>,
    scripts: Map<string, Resource>,
    moduleScripts: Map<string, Resource>,
  },
  nonce: {
    script: string | void,
    style: string | void,
  },
  stylesToHoist: boolean,
  // This is an extra field for the legacy renderer
  generateStaticMarkup: boolean,
};

export function createRenderState(
  resumableState: ResumableState,
  generateStaticMarkup: boolean,
): RenderState {
  const renderState = createRenderStateImpl(
    resumableState,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
  );
  return {
    // Keep this in sync with ReactFizzConfigDOM
    placeholderPrefix: renderState.placeholderPrefix,
    segmentPrefix: renderState.segmentPrefix,
    boundaryPrefix: renderState.boundaryPrefix,
    startInlineScript: renderState.startInlineScript,
    startInlineStyle: renderState.startInlineStyle,
    preamble: renderState.preamble,
    externalRuntimeScript: renderState.externalRuntimeScript,
    bootstrapChunks: renderState.bootstrapChunks,
    importMapChunks: renderState.importMapChunks,
    onHeaders: renderState.onHeaders,
    headers: renderState.headers,
    resets: renderState.resets,
    charsetChunks: renderState.charsetChunks,
    viewportChunks: renderState.viewportChunks,
    hoistableChunks: renderState.hoistableChunks,
    preconnects: renderState.preconnects,
    fontPreloads: renderState.fontPreloads,
    highImagePreloads: renderState.highImagePreloads,
    // usedImagePreloads: renderState.usedImagePreloads,
    styles: renderState.styles,
    bootstrapScripts: renderState.bootstrapScripts,
    scripts: renderState.scripts,
    bulkPreloads: renderState.bulkPreloads,
    preloads: renderState.preloads,
    nonce: renderState.nonce,
    stylesToHoist: renderState.stylesToHoist,

    // This is an extra field for the legacy renderer
    generateStaticMarkup,
  };
}

import {
  stringToChunk,
  stringToPrecomputedChunk,
} from 'react-server/src/ReactServerStreamConfig';

// this chunk is empty on purpose because we do not want to emit the DOCTYPE in legacy mode
export const doctypeChunk: PrecomputedChunk = stringToPrecomputedChunk('');

export type {
  ResumableState,
  HoistableState,
  PreambleState,
  FormatContext,
} from './ReactFizzConfigDOM';

export {
  getChildFormatContext,
  getSuspenseFallbackFormatContext,
  getSuspenseContentFormatContext,
  makeId,
  pushStartInstance,
  pushEndInstance,
  pushFormStateMarkerIsMatching,
  pushFormStateMarkerIsNotMatching,
  writeStartSegment,
  writeEndSegment,
  writeCompletedSegmentInstruction,
  writeCompletedBoundaryInstruction,
  writeClientRenderBoundaryInstruction,
  writeStartPendingSuspenseBoundary,
  writeEndPendingSuspenseBoundary,
  writeHoistablesForBoundary,
  writePlaceholder,
  writeCompletedRoot,
  createRootFormatContext,
  createResumableState,
  createPreambleState,
  createHoistableState,
  writePreambleEnd,
  writeHoistables,
  writePostamble,
  hoistHoistables,
  resetResumableState,
  completeResumableState,
  emitEarlyPreloads,
  supportsClientAPIs,
  hoistPreambleState,
  isPreambleReady,
  isPreambleContext,
} from './ReactFizzConfigDOM';

import escapeTextForBrowser from './escapeTextForBrowser';

export function getViewTransitionFormatContext(
  resumableState: ResumableState,
  parentContext: FormatContext,
  update: void | null | 'none' | 'auto' | string,
  enter: void | null | 'none' | 'auto' | string,
  exit: void | null | 'none' | 'auto' | string,
  share: void | null | 'none' | 'auto' | string,
  name: void | null | 'auto' | string,
  autoName: string, // name or an autogenerated unique name
): FormatContext {
  // ViewTransition reveals are not supported in legacy renders.
  return parentContext;
}

export function canHavePreamble(formatContext: FormatContext): boolean {
  return false;
}

export function pushTextInstance(
  target: Array<Chunk | PrecomputedChunk>,
  text: string,
  renderState: RenderState,
  textEmbedded: boolean,
): boolean {
  if (renderState.generateStaticMarkup) {
    target.push(stringToChunk(escapeTextForBrowser(text)));
    return false;
  } else {
    return pushTextInstanceImpl(target, text, renderState, textEmbedded);
  }
}

export function pushSegmentFinale(
  target: Array<Chunk | PrecomputedChunk>,
  renderState: RenderState,
  lastPushedText: boolean,
  textEmbedded: boolean,
): void {
  if (renderState.generateStaticMarkup) {
    return;
  } else {
    return pushSegmentFinaleImpl(
      target,
      renderState,
      lastPushedText,
      textEmbedded,
    );
  }
}

export function pushStartActivityBoundary(
  target: Array<Chunk | PrecomputedChunk>,
  renderState: RenderState,
): void {
  if (renderState.generateStaticMarkup) {
    // A completed boundary is done and doesn't need a representation in the HTML
    // if we're not going to be hydrating it.
    return;
  }
  pushStartActivityBoundaryImpl(target, renderState);
}

export function pushEndActivityBoundary(
  target: Array<Chunk | PrecomputedChunk>,
  renderState: RenderState,
): void {
  if (renderState.generateStaticMarkup) {
    return;
  }
  pushEndActivityBoundaryImpl(target, renderState);
}

export function writeStartCompletedSuspenseBoundary(
  destination: Destination,
  renderState: RenderState,
): boolean {
  if (renderState.generateStaticMarkup) {
    // A completed boundary is done and doesn't need a representation in the HTML
    // if we're not going to be hydrating it.
    return true;
  }
  return writeStartCompletedSuspenseBoundaryImpl(destination, renderState);
}
export function writeStartClientRenderedSuspenseBoundary(
  destination: Destination,
  renderState: RenderState,
  // flushing these error arguments are not currently supported in this legacy streaming format.
  errorDigest: ?string,
  errorMessage: ?string,
  errorStack: ?string,
  errorComponentStack: ?string,
): boolean {
  if (renderState.generateStaticMarkup) {
    // A client rendered boundary is done and doesn't need a representation in the HTML
    // since we'll never hydrate it. This is arguably an error in static generation.
    return true;
  }
  return writeStartClientRenderedSuspenseBoundaryImpl(
    destination,
    renderState,
    errorDigest,
    errorMessage,
    errorStack,
    errorComponentStack,
  );
}
export function writeEndCompletedSuspenseBoundary(
  destination: Destination,
  renderState: RenderState,
): boolean {
  if (renderState.generateStaticMarkup) {
    return true;
  }
  return writeEndCompletedSuspenseBoundaryImpl(destination, renderState);
}
export function writeEndClientRenderedSuspenseBoundary(
  destination: Destination,
  renderState: RenderState,
): boolean {
  if (renderState.generateStaticMarkup) {
    return true;
  }
  return writeEndClientRenderedSuspenseBoundaryImpl(destination, renderState);
}

export function writePreambleStart(
  destination: Destination,
  resumableState: ResumableState,
  renderState: RenderState,
  skipBlockingShell: boolean,
): void {
  return writePreambleStartImpl(
    destination,
    resumableState,
    renderState,
    true, // skipBlockingShell
  );
}

export function hasSuspenseyContent(
  hoistableState: HoistableState,
  flushingInShell: boolean,
): boolean {
  // Never outline.
  return false;
}

export type TransitionStatus = FormStatus;
export const NotPendingTransition: TransitionStatus = NotPending;
