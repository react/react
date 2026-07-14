/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import {TextDecoder} from 'util';

export type StringDecoder = TextDecoder;

export function createStringDecoder(): StringDecoder {
  return new TextDecoder();
}

const decoderOptions = {stream: true};

export function readPartialStringChunk(
  decoder: StringDecoder,
  buffer: Uint8Array,
): string {
  // $FlowFixMe[incompatible-type]
  return decoder.decode(buffer, decoderOptions);
}

export function readFinalStringChunk(
  decoder: StringDecoder,
  buffer: Uint8Array,
): string {
  return decoder.decode(buffer);
}
