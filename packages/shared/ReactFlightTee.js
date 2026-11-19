/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import ReactVersion from 'shared/ReactVersion';

// A tee lets a Flight Client in the same process read a Flight render without
// parsing its bytes. The client creates it with `createTee` and it's passed to
// the server render, which keeps writing bytes to its destination and also
// hands every row to the tee as it's emitted. The reader then calls
// `createFromTee` to get the root.
//
// The server and client are built as separate bundles, so the server checks
// that the tee comes from the same version of React.
export const FLIGHT_TEE_VERSION: string = ReactVersion;

// The methods the server calls, shared by every tee a client build creates.
// Each takes the tee it acts on, since several tees can be live at once. Rows
// arrive in the order the server emits them, which isn't the order they're
// written to the destination.
//
// None of the methods throw. An error on the client errors the row it was
// building, or the client's response, but never the server's render.
//
// A model row is built by value: the server calls `beginRow`, builds the row's
// value with `decode`, `beginElement` and `completeElement` while it walks the
// row, and calls `endRow` with the value. Every other row is passed as wire
// text and parsed: rows that aren't models, a model row whose value is a
// string or other primitive, stream entries, and a model row that `beginRow`
// declines.
export type FlightTeeDispatcher = {
  // Returns false if the tee is already connected to another request.
  +c /* connect */: (tee: FlightTee) => boolean,
  // Begins building model row `id`. Returns null if the row can't be built by
  // value, in which case the server sends it as wire text instead.
  +b /* beginRow */: (tee: FlightTee, id: number) => null | FlightTeeRow,
  // Ends a row with the value built for it.
  +f /* endRow */: (tee: FlightTee, row: FlightTeeRow, value: mixed) => void,
  // Abandons a row whose walk threw. The row stays pending.
  +a /* abortRow */: (tee: FlightTee, row: FlightTeeRow) => void,
  // Enters an element, before any of its fields are decoded.
  +e /* beginElement */: (tee: FlightTee) => void,
  // Creates the element and leaves it.
  +m /* completeElement */: (
    tee: FlightTee,
    type: mixed,
    key: mixed,
    props: mixed,
    owner: mixed,
    stack: mixed,
    validated: number,
  ) => mixed,
  // Decodes a `$` string. `parent` is the value it goes in, and `key` its key
  // there, so that a reference that hasn't resolved yet can fill it in later.
  +d /* decode */: (
    tee: FlightTee,
    parent: Object,
    key: string,
    value: string,
  ) => mixed,
  // A complete row, including its header and trailing newline.
  +w /* processWireRow */: (tee: FlightTee, row: string) => void,
  // A length-prefixed text row. The text is passed by reference.
  +t /* processWireText */: (tee: FlightTee, id: number, text: string) => void,
  // A length-prefixed binary row. The tee copies the bytes.
  +y /* processWireBinary */: (
    tee: FlightTee,
    id: number,
    tag: number,
    bytes: Uint8Array,
  ) => void,
  // The render finished and both destinations would close.
  +C /* close */: (tee: FlightTee) => void,
  // The render failed with a fatal error and the destination would error.
  +X /* error */: (tee: FlightTee, error: mixed) => void,
};

// The rest of a tee is private to the client. The server checks `_version`
// before it reads `_dispatcher`, so a tee from another build fails cleanly.
export type FlightTee = {
  +_version: string,
  +_dispatcher: FlightTeeDispatcher,
  // Stands for an element's own fields when decoding them, keyed by their
  // slot in the wire tuple: props ('3'), owner ('4') and debug stack ('5').
  +_elementFields: Object,
  ...
};

// Opaque to the server.
export type FlightTeeRow = {...};
