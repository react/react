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
// reading its bytes. The client creates it and it's passed to the server
// render, which keeps writing bytes to its destination and also hands every
// row to the tee as it's emitted.
//
// The server and client are built as separate bundles, so the server checks
// that the tee comes from the same version of React.
export const FLIGHT_TEE_VERSION: string = ReactVersion;

// The methods the server calls, shared by every tee a client build creates.
// Each takes the tee it acts on, since several tees can be live at once. Rows
// arrive in the order the server emits them, which isn't the order they're
// written to the destination.
//
// None of the methods throw. An error on the client errors the client's
// response, but never the server's render.
export type FlightTeeDispatcher = {
  // Returns false if the tee is already connected to another request.
  +c /* connect */: (tee: FlightTee) => boolean,
  // A complete row, including its header and trailing newline.
  +w /* row */: (tee: FlightTee, row: string) => void,
  // A length-prefixed text row. The text is passed by reference.
  +t /* text */: (tee: FlightTee, id: number, text: string) => void,
  // A length-prefixed binary row. The tee copies the bytes.
  +y /* binary */: (
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
  ...
};
