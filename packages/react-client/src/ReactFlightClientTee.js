/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {Thenable} from 'shared/ReactTypes';
import type {FlightTee, FlightTeeDispatcher} from 'shared/ReactFlightTee';
import type {Response, StreamState} from './ReactFlightClient';

import {FLIGHT_TEE_VERSION} from 'shared/ReactFlightTee';
import {enableFlightTee} from 'shared/ReactFeatureFlags';

import {
  createStreamState,
  getRoot,
  processStringChunk,
  processWireText,
  processWireBinary,
  setReaderContext,
  close,
  reportGlobalError,
  retainResponse,
} from './ReactFlightClient';

// The client side of a tee (see shared/ReactFlightTee). It reads one Flight
// render into one Response.
type TeeInstance = {
  +_version: string,
  +_dispatcher: FlightTeeDispatcher,
  _response: Response,
  // Keeps the response alive until it's read, since rows can arrive while
  // nothing else is waiting on it.
  _retainedResponse: mixed,
  _streamState: StreamState,
  _connected: boolean,
  _read: boolean,
  // Hints and module preinits that arrived before the reader did.
  _readerTasks: null | Array<() => void>,
  // Set once reading a row threw. The response has errored, and the tee
  // ignores the rest of the render.
  _failed: boolean,
  // Set once the render has closed or failed. Nothing runs in the server's
  // context after that, so the response doesn't hold the reader's context.
  _ended: boolean,
};

// None of the dispatcher's methods throw into the render: the bytes it writes
// don't depend on the tee. An error reading a row errors the response, as an
// error reading the stream does.
function failTee(tee: TeeInstance, error: mixed): void {
  if (!tee._failed) {
    tee._failed = true;
    try {
      reportGlobalError(tee._response, error as any);
    } catch (x) {
      // A listener on the response threw. The render doesn't wait on it.
    }
    endTee(tee);
  }
}

function endTee(tee: TeeInstance): void {
  if (!tee._ended) {
    tee._ended = true;
    if (tee._read) {
      setReaderContext(tee._response, null);
    }
  }
}

function connect(flightTee: FlightTee): boolean {
  const tee: TeeInstance = flightTee as any;
  if (tee._connected) {
    return false;
  }
  tee._connected = true;
  return true;
}

function teeRow(flightTee: FlightTee, row: string): void {
  const tee: TeeInstance = flightTee as any;
  if (tee._failed) {
    return;
  }
  try {
    processStringChunk(tee._response, tee._streamState, row);
  } catch (x) {
    failTee(tee, x);
  }
}

function teeText(flightTee: FlightTee, id: number, text: string): void {
  const tee: TeeInstance = flightTee as any;
  if (tee._failed) {
    return;
  }
  try {
    processWireText(tee._response, tee._streamState, id, text);
  } catch (x) {
    failTee(tee, x);
  }
}

function teeBinary(
  flightTee: FlightTee,
  id: number,
  tag: number,
  bytes: Uint8Array,
): void {
  const tee: TeeInstance = flightTee as any;
  if (tee._failed) {
    return;
  }
  try {
    processWireBinary(tee._response, tee._streamState, id, tag, bytes);
  } catch (x) {
    failTee(tee, x);
  }
}

function teeClose(flightTee: FlightTee): void {
  const tee: TeeInstance = flightTee as any;
  if (tee._failed) {
    return;
  }
  try {
    close(tee._response);
  } catch (x) {
    failTee(tee, x);
    return;
  }
  endTee(tee);
}

function teeError(flightTee: FlightTee, error: mixed): void {
  const tee: TeeInstance = flightTee as any;
  failTee(tee, error);
}

// One dispatcher for every tee this build creates, so the server's calls stay
// monomorphic.
export const teeDispatcher: FlightTeeDispatcher = Object.freeze({
  c /* connect */: connect,
  w /* row */: teeRow,
  t /* text */: teeText,
  y /* binary */: teeBinary,
  C /* close */: teeClose,
  X /* error */: teeError,
});

export function createTee(response: Response): FlightTee {
  if (!enableFlightTee) {
    throw new Error('createTee is not supported in this build of React.');
  }
  const readerTasks: Array<() => void> = [];
  const tee: TeeInstance = {
    _version: FLIGHT_TEE_VERSION,
    _dispatcher: teeDispatcher,
    _response: response,
    _retainedResponse: retainResponse(response),
    // There's no stream to show as the I/O's value in DEV.
    _streamState: createStreamState(response, null),
    _connected: false,
    _read: false,
    _readerTasks: readerTasks,
    _failed: false,
    _ended: false,
  };
  setReaderContext(response, task => {
    readerTasks.push(task);
  });
  return tee;
}

// Reads the tee's root. Call it after the tee has been passed to the server's
// render, from inside the reader's context: `runInReaderContext` runs a task
// there.
export function createFromTee<T>(
  flightTee: FlightTee,
  runInReaderContext: (task: () => void) => void,
): Thenable<T> {
  const tee: TeeInstance = flightTee as any;
  if (tee._read) {
    throw new Error(
      'A Flight tee can only be read once. Read any later copies from the stream.',
    );
  }
  if (!tee._connected) {
    throw new Error(
      'The tee has not been passed to a render. Pass it as the `tee` option ' +
        'of a Flight render before reading it.',
    );
  }
  tee._read = true;
  tee._retainedResponse = null;
  const readerTasks = tee._readerTasks;
  tee._readerTasks = null;
  if (!tee._ended) {
    setReaderContext(tee._response, runInReaderContext);
  }
  if (readerTasks !== null) {
    for (let i = 0; i < readerTasks.length; i++) {
      runInReaderContext(readerTasks[i]);
    }
  }
  return getRoot(tee._response);
}
