/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

// https://github.com/algolia/docsearch/blob/15ebcba606b281aa0dddc4ccb8feb19d396bf79e/packages/docsearch-react/src/types/DocSearchHit.ts
type ContentType =
  | 'content'
  | 'lvl0'
  | 'lvl1'
  | 'lvl2'
  | 'lvl3'
  | 'lvl4'
  | 'lvl5'
  | 'lvl6';

interface DocSearchHitAttributeHighlightResult {
  value: string;
  matchLevel: 'full' | 'none' | 'partial';
  matchedWords: string[];
  fullyHighlighted?: boolean;
}

interface DocSearchHitHighlightResultHierarchy {
  lvl0: DocSearchHitAttributeHighlightResult;
  lvl1: DocSearchHitAttributeHighlightResult;
  lvl2: DocSearchHitAttributeHighlightResult;
  lvl3: DocSearchHitAttributeHighlightResult;
  lvl4: DocSearchHitAttributeHighlightResult;
  lvl5: DocSearchHitAttributeHighlightResult;
  lvl6: DocSearchHitAttributeHighlightResult;
}

interface DocSearchHitHighlightResult {
  content: DocSearchHitAttributeHighlightResult;
  hierarchy: DocSearchHitHighlightResultHierarchy;
  hierarchy_camel: DocSearchHitHighlightResultHierarchy[];
}

interface DocSearchHitAttributeSnippetResult {
  value: string;
  matchLevel: 'full' | 'none' | 'partial';
}

interface DocSearchHitSnippetResult {
  content: DocSearchHitAttributeSnippetResult;
  hierarchy: DocSearchHitHighlightResultHierarchy;
  hierarchy_camel: DocSearchHitHighlightResultHierarchy[];
}

export declare type DocSearchHit = {
  objectID: string;
  content: string | null;
  url: string;
  url_without_anchor: string;
  type: ContentType;
  anchor: string | null;
  hierarchy: {
    lvl0: string;
    lvl1: string;
    lvl2: string | null;
    lvl3: string | null;
    lvl4: string | null;
    lvl5: string | null;
    lvl6: string | null;
  };
  _highlightResult: DocSearchHitHighlightResult;
  _snippetResult: DocSearchHitSnippetResult;
  _rankingInfo?: {
    promoted: boolean;
    nbTypos: number;
    firstMatchedWord: number;
    proximityDistance?: number;
    geoDistance: number;
    geoPrecision?: number;
    nbExactWords: number;
    words: number;
    filters: number;
    userScore: number;
    matchedGeoLocation?: {
      lat: number;
      lng: number;
      distance: number;
    };
  };
  _distinctSeqID?: number;
  __autocomplete_indexName?: string;
  __autocomplete_queryID?: string;
  __autocomplete_algoliaCredentials?: {
    appId: string;
    apiKey: string;
  };
  __autocomplete_id?: number;
};

export type InternalDocSearchHit = DocSearchHit & {
  __docsearch_parent: InternalDocSearchHit | null;
};
