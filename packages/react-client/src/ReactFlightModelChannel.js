/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

// A ModelChannel transports completed Flight rows between a Flight Server and
// a Flight Client in the same process, without serializing them into the wire
// format. The channel is created on the consuming side and passed to the
// server as an option. It intentionally only consists of plain functions and
// data so that it can cross the boundary between the react-server module
// graph and the client module graph.
//
// The payload of each row is either the row's model — parsed but not yet
// revived — or a string of JSON text for rows that are eagerly serialized on
// the server (DEV-only debug rows). String payloads of model-valued rows are
// always JSON text; string-valued models are encoded as JSON text by the
// server before they're pushed so that the two forms stay unambiguous.

export type ModelSink = {
  row: (id: number, tag: string, payload: mixed) => void,
  close: () => void,
  error: (reason: mixed) => void,
};

const OPEN = 0;
const CLOSED = 1;
const ERRORED = 2;

export opaque type ModelChannel = {
  _sink: null | ModelSink,
  _buffer: null | Array<mixed>, // flat [id, tag, payload] triples
  _status: 0 | 1 | 2,
  _errorReason: mixed,
  push: (id: number, tag: string, payload: mixed) => void,
  close: () => void,
  error: (reason: mixed) => void,
};

export function createModelChannel(): ModelChannel {
  const channel: ModelChannel = {
    _sink: null,
    _buffer: null,
    _status: OPEN,
    _errorReason: null,
    push(id: number, tag: string, payload: mixed): void {
      const sink = channel._sink;
      if (sink !== null) {
        sink.row(id, tag, payload);
      } else {
        // The consumer hasn't connected yet. Buffer until it does.
        let buffer = channel._buffer;
        if (buffer === null) {
          buffer = channel._buffer = [];
        }
        buffer.push(id, tag, payload);
      }
    },
    close(): void {
      const sink = channel._sink;
      if (sink !== null) {
        sink.close();
      } else {
        channel._status = CLOSED;
      }
    },
    error(reason: mixed): void {
      const sink = channel._sink;
      if (sink !== null) {
        sink.error(reason);
      } else {
        channel._status = ERRORED;
        channel._errorReason = reason;
      }
    },
  };
  return channel;
}

export function connectModelChannel(
  channel: ModelChannel,
  sink: ModelSink,
): void {
  if (channel._sink !== null) {
    throw new Error('A ModelChannel can only have a single consumer.');
  }
  channel._sink = sink;
  const buffer = channel._buffer;
  if (buffer !== null) {
    channel._buffer = null;
    for (let i = 0; i < buffer.length; i += 3) {
      sink.row(buffer[i] as any, buffer[i + 1] as any, buffer[i + 2]);
    }
  }
  if (channel._status === CLOSED) {
    sink.close();
  } else if (channel._status === ERRORED) {
    sink.error(channel._errorReason);
  }
}
