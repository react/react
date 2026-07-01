/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {CrossOriginString} from 'react-dom-bindings/src/shared/crossOriginStrings';

export type PrefetchDNSOptions = {};
export type PreconnectOptions = {crossOrigin?: string};
export type PreloadOptions = {
  as: string,
  crossOrigin?: string,
  integrity?: string,
  type?: string,
  media?: string,
  nonce?: string,
  fetchPriority?: FetchPriorityEnum,
  imageSrcSet?: string,
  imageSizes?: string,
  referrerPolicy?: string,
};
export type PreloadModuleOptions = {
  as?: string,
  crossOrigin?: string,
  integrity?: string,
  nonce?: string,
  fetchPriority?: FetchPriorityEnum,
};
export type PreinitOptions = {
  as: string,
  precedence?: string,
  crossOrigin?: string,
  integrity?: string,
  nonce?: string,
  fetchPriority?: FetchPriorityEnum,
};
export type PreinitModuleOptions = {
  as?: string,
  crossOrigin?: string,
  integrity?: string,
  nonce?: string,
  fetchPriority?: FetchPriorityEnum,
};

export type CrossOriginEnum = '' | 'use-credentials' | CrossOriginString;
export type FetchPriorityEnum = 'high' | 'low' | 'auto';

export type PreloadImplOptions = {
  crossOrigin?: ?CrossOriginEnum,
  integrity?: ?string,
  nonce?: ?string,
  type?: ?string,
  fetchPriority?: ?string,
  referrerPolicy?: ?string,
  imageSrcSet?: ?string,
  imageSizes?: ?string,
  media?: ?string,
};
export type PreloadModuleImplOptions = {
  as?: ?string,
  crossOrigin?: ?CrossOriginEnum,
  integrity?: ?string,
  nonce?: ?string,
  fetchPriority?: ?string,
};
export type PreinitStyleOptions = {
  crossOrigin?: ?CrossOriginEnum,
  integrity?: ?string,
  fetchPriority?: ?string,
};
export type PreinitScriptOptions = {
  crossOrigin?: ?CrossOriginEnum,
  integrity?: ?string,
  fetchPriority?: ?string,
  nonce?: ?string,
};
export type PreinitModuleScriptOptions = {
  crossOrigin?: ?CrossOriginEnum,
  integrity?: ?string,
  nonce?: ?string,
  fetchPriority?: ?string,
};

export type HostDispatcher = {
  f /* flushSyncWork */: () => boolean | void,
  r /* requestFormReset */: (form: HTMLFormElement) => void,
  D /* prefetchDNS */: (href: string) => void,
  C /* preconnect */: (href: string, crossOrigin?: ?CrossOriginEnum) => void,
  L /* preload */: (
    href: string,
    as: string,
    options?: ?Required<PreloadImplOptions>,
  ) => void,
  m /* preloadModule */: (
    href: string,
    options?: ?Required<PreloadModuleImplOptions>,
  ) => void,
  S /* preinitStyle */: (
    href: string,
    precedence: ?string,
    options?: ?Required<PreinitStyleOptions>,
  ) => void,
  X /* preinitScript */: (
    src: string,
    options?: ?Required<PreinitScriptOptions>,
  ) => void,
  M /* preinitModuleScript */: (
    src: string,
    options?: ?Required<PreinitModuleScriptOptions>,
  ) => void,
};

export type ImportMap = {
  imports?: {
    [specifier: string]: string,
  },
  scopes?: {
    [scope: string]: {
      [specifier: string]: string,
    },
  },
};
