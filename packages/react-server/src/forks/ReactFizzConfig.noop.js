/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

// This is a host config that's used for the `react-server` package on npm.
// It is only used by third-party renderers.
//
// Its API lets you pass the host config as an argument.
// However, inside the `react-server` we treat host config as a module.
// This file is a shim between two worlds.
//
// It works because the `react-server` bundle is wrapped in something like:
//
// module.exports = function ($$$config) {
//   /* renderer code */
// }
//
// So `$$$config` looks like a global variable, but it's
// really an argument to a top-level wrapping function.

import type {Request} from 'react-server/src/ReactFizzServer';
import type {TransitionStatus} from 'react-reconciler/src/ReactFiberConfig';

declare const $$$config: $FlowFixMe;
export opaque type Destination = mixed;
export opaque type RenderState = mixed;
export opaque type HoistableState = mixed;
export opaque type ResumableState = mixed;
export opaque type PreambleState = mixed;
export opaque type FormatContext = mixed;
export opaque type HeadersDescriptor = mixed;
export type {TransitionStatus};

export const isPrimaryRenderer = false;

export const supportsClientAPIs = true;

export const isWorkLoopExternallyDriven =
  $$$config.isWorkLoopExternallyDriven === true;
export const supportsRequestStorage = false;
export const requestStorage: AsyncLocalStorage<Request | void> = null as any;

export const bindToConsole = $$$config.bindToConsole;

export const resetResumableState = $$$config.resetResumableState;
export const completeResumableState = $$$config.completeResumableState;
export const getChildFormatContext = $$$config.getChildFormatContext;
export const getSuspenseFallbackFormatContext =
  $$$config.getSuspenseFallbackFormatContext;
export const getSuspenseContentFormatContext =
  $$$config.getSuspenseContentFormatContext;
export const getViewTransitionFormatContext =
  $$$config.getViewTransitionFormatContext;
export const makeId = $$$config.makeId;
export const pushTextInstance = $$$config.pushTextInstance;
export const pushStartInstance = $$$config.pushStartInstance;
export const pushEndInstance = $$$config.pushEndInstance;
export const pushSegmentFinale = $$$config.pushSegmentFinale;
export const pushFormStateMarkerIsMatching =
  $$$config.pushFormStateMarkerIsMatching;
export const pushFormStateMarkerIsNotMatching =
  $$$config.pushFormStateMarkerIsNotMatching;
export const writeCompletedRoot = $$$config.writeCompletedRoot;
export const writePlaceholder = $$$config.writePlaceholder;
export const pushStartActivityBoundary = $$$config.pushStartActivityBoundary;
export const pushEndActivityBoundary = $$$config.pushEndActivityBoundary;
export const writeStartCompletedSuspenseBoundary =
  $$$config.writeStartCompletedSuspenseBoundary;
export const writeStartPendingSuspenseBoundary =
  $$$config.writeStartPendingSuspenseBoundary;
export const writeStartClientRenderedSuspenseBoundary =
  $$$config.writeStartClientRenderedSuspenseBoundary;
export const writeEndCompletedSuspenseBoundary =
  $$$config.writeEndCompletedSuspenseBoundary;
export const writeEndPendingSuspenseBoundary =
  $$$config.writeEndPendingSuspenseBoundary;
export const writeEndClientRenderedSuspenseBoundary =
  $$$config.writeEndClientRenderedSuspenseBoundary;
export const writeStartSegment = $$$config.writeStartSegment;
export const writeEndSegment = $$$config.writeEndSegment;
export const writeCompletedSegmentInstruction =
  $$$config.writeCompletedSegmentInstruction;
export const writeCompletedBoundaryInstruction =
  $$$config.writeCompletedBoundaryInstruction;
export const writeClientRenderBoundaryInstruction =
  $$$config.writeClientRenderBoundaryInstruction;
export const NotPendingTransition = $$$config.NotPendingTransition;
export const createPreambleState = $$$config.createPreambleState;
export const canHavePreamble = $$$config.canHavePreamble;
export const isPreambleContext = $$$config.isPreambleContext;
export const isPreambleReady = $$$config.isPreambleReady;
export const hoistPreambleState = $$$config.hoistPreambleState;

// -------------------------
//     Resources
// -------------------------
export const writePreambleStart = $$$config.writePreambleStart;
export const writePreambleEnd = $$$config.writePreambleEnd;
export const writeInlineDataInit = $$$config.writeInlineDataInit;
export const writeInlineDataSegment = $$$config.writeInlineDataSegment;
export const writeInlineDataClose = $$$config.writeInlineDataClose;
export const writeHoistables = $$$config.writeHoistables;
export const writeHoistablesForBoundary = $$$config.writeHoistablesForBoundary;
export const writePostamble = $$$config.writePostamble;
export const hoistHoistables = $$$config.hoistHoistables;
export const createHoistableState = $$$config.createHoistableState;
export const hasSuspenseyContent = $$$config.hasSuspenseyContent;
export const emitEarlyPreloads = $$$config.emitEarlyPreloads;
