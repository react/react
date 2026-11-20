/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import {SourceMapMetadataConsumer} from '../SourceMapMetadataConsumer';

describe('SourceMapMetadataConsumer', () => {
  // `x_react_sources` is an array of metadata that lines up with `sources`, and
  // an entry is null for any source that has no React metadata. Filtering the
  // nulls out before reading the index shifts every remaining entry onto the
  // wrong source.
  it('assigns metadata to the source at the same index when an entry is null', () => {
    const consumer = new SourceMapMetadataConsumer({
      version: 3,
      file: 'bundle.js',
      sources: ['src/a.ts', 'src/b.ts'],
      names: [],
      mappings: '',
      x_react_sources: [null, [{names: ['useState'], mappings: ''}]],
    });

    expect(consumer.hasHookMap('src/a.ts')).toBe(false);
    expect(consumer.hasHookMap('src/b.ts')).toBe(true);
  });

  // The `x_facebook_sources` field carries the same information in a different
  // shape. It keeps the array index when skipping nulls, so the two fields must
  // agree about which source a metadata entry belongs to.
  it('assigns metadata to the source at the same index for x_facebook_sources', () => {
    const consumer = new SourceMapMetadataConsumer({
      version: 3,
      file: 'bundle.js',
      sources: ['src/a.ts', 'src/b.ts'],
      names: [],
      mappings: '',
      x_facebook_sources: [null, [null, [{names: ['useState'], mappings: ''}]]],
    });

    expect(consumer.hasHookMap('src/a.ts')).toBe(false);
    expect(consumer.hasHookMap('src/b.ts')).toBe(true);
  });
});
