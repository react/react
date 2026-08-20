/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type {DocSearchHit, InternalDocSearchHit} from '../types/algolia';
import {liteClient, type Hit, type SearchResponse} from 'algoliasearch/lite';

// https://github.com/reactjs/react.dev/blob/55986965fbf69c2584040039c9586a01bd54eba7/src/siteConfig.js#L15-L19
const ALGOLIA_CONFIG = {
  appId: '1FCF9AYYAT',
  apiKey: '1b7ad4e1c89e645e351e59d40544eda1',
  indexName: 'beta-react',
};

export const ALGOLIA_CLIENT = liteClient(
  ALGOLIA_CONFIG.appId,
  ALGOLIA_CONFIG.apiKey,
);

export function printHierarchy(
  hit: DocSearchHit | InternalDocSearchHit,
): string {
  let val = `${hit.hierarchy.lvl0} > ${hit.hierarchy.lvl1}`;
  if (hit.hierarchy.lvl2 != null) {
    val = val.concat(` > ${hit.hierarchy.lvl2}`);
  }
  if (hit.hierarchy.lvl3 != null) {
    val = val.concat(` > ${hit.hierarchy.lvl3}`);
  }
  if (hit.hierarchy.lvl4 != null) {
    val = val.concat(` > ${hit.hierarchy.lvl4}`);
  }
  if (hit.hierarchy.lvl5 != null) {
    val = val.concat(` > ${hit.hierarchy.lvl5}`);
  }
  if (hit.hierarchy.lvl6 != null) {
    val = val.concat(` > ${hit.hierarchy.lvl6}`);
  }
  return val;
}

export async function queryAlgolia(
  message: string | Array<string>,
): Promise<Array<string>> {
  const {results} = await ALGOLIA_CLIENT.search<DocSearchHit>({
    requests: [
      {
        query: Array.isArray(message) ? message.join('\n') : message,
        indexName: ALGOLIA_CONFIG.indexName,
        attributesToRetrieve: [
          'hierarchy.lvl0',
          'hierarchy.lvl1',
          'hierarchy.lvl2',
          'hierarchy.lvl3',
          'hierarchy.lvl4',
          'hierarchy.lvl5',
          'hierarchy.lvl6',
          'content',
          'url',
        ],
        attributesToSnippet: [
          `hierarchy.lvl1:10`,
          `hierarchy.lvl2:10`,
          `hierarchy.lvl3:10`,
          `hierarchy.lvl4:10`,
          `hierarchy.lvl5:10`,
          `hierarchy.lvl6:10`,
          `content:10`,
        ],
        snippetEllipsisText: '…',
        hitsPerPage: 30,
        attributesToHighlight: [
          'hierarchy.lvl0',
          'hierarchy.lvl1',
          'hierarchy.lvl2',
          'hierarchy.lvl3',
          'hierarchy.lvl4',
          'hierarchy.lvl5',
          'hierarchy.lvl6',
          'content',
        ],
      },
    ],
  });
  const firstResult = results[0] as SearchResponse<DocSearchHit>;
  const {hits} = firstResult;
  const deduped = new Map();
  for (const hit of hits) {
    // drop hashes to dedupe properly
    const u = new URL(hit.url);
    if (deduped.has(u.pathname)) {
      continue;
    }
    deduped.set(u.pathname, hit);
  }
  const pages: Array<string | null> = await Promise.all(
    Array.from(deduped.values()).map(hit => {
      return fetch(hit.url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36',
        },
      }).then(res => {
        if (res.ok === true) {
          return res.text();
        } else {
          console.error(
            `Could not fetch docs: ${res.status} ${res.statusText}`,
          );
          return null;
        }
      });
    }),
  );
  return pages.filter(page => page !== null);
}
