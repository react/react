/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict-local
 */

import type {EncodedHookMap} from './generateHookMap';

export type ReactSourceMetadata = [?EncodedHookMap];
export type ReactSourcesArray = $ReadOnlyArray<?ReactSourceMetadata>;

export type FBSourceMetadata = [?{...}, ?ReactSourceMetadata];
export type FBSourcesArray = $ReadOnlyArray<?FBSourceMetadata>;

export type BasicSourceMap = {
  +file?: string,
  +mappings: string,
  +names: Array<string>,
  +sourceRoot?: string,
  +sources: Array<string>,
  +sourcesContent?: Array<?string>,
  +version: number,
  +x_facebook_sources?: FBSourcesArray,
  +x_react_sources?: ReactSourcesArray,
  +ignoreList?: Array<number>,
};

export type IndexSourceMapSection = {
  map: BasicSourceMap,
  offset: {
    line: number,
    column: number,
    ...
  },
  ...
};

export type IndexSourceMap = {
  +file?: string,
  +mappings?: void, // avoids SourceMap being a disjoint union
  +sourcesContent?: void,
  +sections: Array<IndexSourceMapSection>,
  +version: number,
  +x_facebook_sources?: FBSourcesArray,
  +x_react_sources?: ReactSourcesArray,
};

export type MixedSourceMap = IndexSourceMap | BasicSourceMap;
