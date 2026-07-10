/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import {createResource} from 'react-devtools-shared/src/devtools/cache';
import {importFile} from './import-worker';

import type {Resource} from 'react-devtools-shared/src/devtools/cache';
import type {TimelineData} from './types';
import type {ImportWorkerOutputData} from './import-worker/index';

export type DataResource = Resource<void, File, TimelineData | Error>;

export default function createDataResourceFromImportedFile(
  file: File,
): DataResource {
  return createResource(
    () => {
      return new Promise<TimelineData | Error>((resolve, reject) => {
        const promise = importFile(
          file,
        ) as any as Promise<ImportWorkerOutputData>;
        promise.then(data => {
          switch (data.status) {
            case 'SUCCESS':
              resolve(data.processedData);
              break;
            case 'INVALID_PROFILE_ERROR':
              resolve(data.error);
              break;
            case 'UNEXPECTED_ERROR':
              reject(data.error);
              break;
          }
        });
      });
    },
    () => file,
    {useWeakMap: true},
  );
}
