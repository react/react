/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

// v0.17.1
declare module 'hermes-eslint' {
  // https://fburl.com/2vikhmaa
  type ParseForESLintOptions = {
    /**
     * Whether the whole script is executed under node.js environment.
     * When enabled, the scope manager adds a function scope immediately following the global scope.
     * Defaults to `false`.
     */
    globalReturn: boolean;

    /**
     * The identifier that's used for JSX Element creation (after transpilation).
     * This should not be a member expression - just the root identifier (i.e. use "React" instead of "React.createElement").
     *
     * To use the new global JSX transform function, you can explicitly set this to `null`.
     *
     * Defaults to `"React"`.
     */
    jsxPragma: string | null;

    /**
     * The identifier that's used for JSX fragment elements (after transpilation).
     * If `null`, assumes transpilation will always use a member on `jsxFactory` (i.e. React.Fragment).
     * This should not be a member expression - just the root identifier (i.e. use "h" instead of "h.Fragment").
     * Defaults to `null`.
     */
    jsxFragmentName: string | null;

    /**
     * The source type of the script.
     */
    sourceType: 'script' | 'module';

    /**
     * Ignore <fbt /> JSX elements when adding references to the module-level `React` variable.
     * FBT is JSX that's transformed to non-JSX and thus references differently
     *
     * https://facebook.github.io/fbt/
     */
    fbt: boolean;

    /**
     * Support experimental component syntax
     *
     * Defaults to `true`.
     */
    enableExperimentalComponentSyntax?: boolean;
  };
  export function parse(code: string, options?: Partial<ParseForESLintOptions>);
}
