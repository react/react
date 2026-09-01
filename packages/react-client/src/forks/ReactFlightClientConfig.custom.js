/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

// This is a host config that's used for the `react-server` package on npm.
// It is only used by third-party renderers.
//
// Its API lets you pass the host config as an argument.
// However, inside the `react-server` we treat host config as a module.
// This file is a shim between two worlds.
//
// It works because the `react-server` bundle is wrapped in something like:
//
// module.exports = function ($$$config) {
//   /* renderer code */
// }
//
// So `$$$config` looks like a global variable, but it's
// really an argument to a top-level wrapping function.

declare const $$$config: any;

export opaque type ModuleLoading = mixed;
export opaque type ServerConsumerModuleMap = mixed;
export opaque type ServerManifest = mixed;
export opaque type ServerReferenceId = string;
export opaque type ClientReferenceMetadata = mixed;
export opaque type ClientReference<T> = mixed; // eslint-disable-line no-unused-vars
export const resolveClientReference = $$$config.resolveClientReference;
export const resolveServerReference = $$$config.resolveServerReference;
export const preloadModule = $$$config.preloadModule;
export const requireModule = $$$config.requireModule;
export const getModuleDebugInfo = $$$config.getModuleDebugInfo;
export const dispatchHint = $$$config.dispatchHint;
export const prepareDestinationForModule =
  $$$config.prepareDestinationForModule;
export const usedWithSSR = true;

export opaque type Source = mixed;

export opaque type StringDecoder = mixed;

export const createStringDecoder = $$$config.createStringDecoder;
export const readPartialStringChunk = $$$config.readPartialStringChunk;
export const readFinalStringChunk = $$$config.readFinalStringChunk;

export const bindToConsole = $$$config.bindToConsole;

export const rendererVersion = $$$config.rendererVersion;
export const rendererPackageName = $$$config.rendererPackageName;

export const checkEvalAvailabilityOnceDev =
  $$$config.checkEvalAvailabilityOnceDev;
