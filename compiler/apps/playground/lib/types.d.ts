/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

// v0.17.1
declare module "hermes-parser" {
  type HermesParserOptions = {
    allowReturnOutsideFunction?: boolean;
    babel?: boolean;
    flow?: "all" | "detect";
    enableExperimentalComponentSyntax?: boolean;
    sourceFilename?: string;
    sourceType?: "module" | "script" | "unambiguous";
    tokens?: boolean;
  };
  export function parse(code: string, options: Partial<HermesParserOptions>);
}
