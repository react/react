/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

// The contract between a Flight Server render and a Flight Client consuming
// it in the same process. It only consists of plain functions so that it can
// cross the boundary between the react-server module graph and the client
// module graph; this module holds the single definition both graphs type
// against.

// A same-process consumer of the rows of a render, receiving each row when
// it's emitted instead of decoding it from the byte stream. Model rows are
// delivered in their object form so the consumer doesn't need to parse and
// re-allocate what this process already has; binary rows are delivered as
// cloned, correctly-typed views; every other row is delivered as the same
// text that frames it on the wire.
export type RenderConsumer = {
  +row: (id: number, tag: string, payload: mixed) => void,
  +close: () => void,
  +error: (reason: mixed) => void,
};

// The base result of render(). Each server entry point composes it with its
// platform's byte stream doors; a paired Flight Client's createFromRender
// attaches a consumer to it.
export type RenderResult = {
  +_attach: (consumer: RenderConsumer) => void,
};
