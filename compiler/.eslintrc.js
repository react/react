/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * Our philosophy for linting is that lints should be very high-signal:
 * - Error, don't warn. If it's worth mentioning it's worth fixing.
 * - Enable rules that consistently identify real problems. If we frequently would have to
 *   disable the rule due to false positives, it isn't high-signal.
 * - Enable rules that help improve consistent style (to avoid code review about style rather
 *   than substance).
 */
module.exports = {
  extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended"],
  rules: {
    /*
     * We prefer using const where variables are not reassigned, but occassional mistakes
     * aren't a major issue
     */
    "prefer-const": "off",

    // Not valuable enough to enable
    "no-useless-escape": "off",

    /*
     * There are valid use cases for loops with constant conditions where the body contains the
     * break
     */
    "no-constant-condition": "off",

    // eslint only knows about builtin control flow (eg throw, return, break) and not custom ones
    // like invariant.
    "no-fallthrough": "off",

    /*
     * Low-value: this fires even for declarations that capture references which wouldn't be as
     * obvious if the declaration was lifted to the parent root
     */
    "no-inner-declarations": "off",

    "multiline-comment-style": ["error", "starred-block"],

    /**
     * We sometimes need to check for control characters in regexes for things like preserving input
     * strings
     */
    "no-control-regex": "off",

    "@typescript-eslint/no-empty-function": "off",

    /*
     * Explicitly casting to/through any is sometimes required, often for error messages to
     * assertExhaustive()
     */
    "@typescript-eslint/no-explicit-any": "off",

    /*
     * We use non-null assertions carefully. Ideally, there would be a TS option to codegen
     * a non-null check at the assertion site.
     */
    "@typescript-eslint/no-non-null-assertion": "off",

    // Being explicit provides value in cases where inference may later change
    "@typescript-eslint/no-inferrable-types": "off",
    "@typescript-eslint/explicit-function-return-type": "error",

    /*
     * Unused variables are frequently a bug. Prefix unused variables with an _ to fix, but note
     * that eslint won't warn you that an underscore prefixed variable is used and that the prefix
     * should be dropped.
     */
    "@typescript-eslint/no-unused-vars": [
      "error",
      {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
        caughtErrorsIgnorePattern: "^_",
      },
    ],

    // Consider enabling for consistency. Ideally violations could be auto-fixed.
    "@typescript-eslint/consistent-generic-constructors": [
      "off",
      "constructor",
    ],
    "@typescript-eslint/array-type": ["error", { default: "generic" }],
    "@typescript-eslint/triple-slash-reference": "off",
    "@typescript-eslint/no-var-requires": "off",
  },
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint"],
  root: true,
  ignorePatterns: ["**/__tests__/**/*", "**/*.d.ts", "**/dist/**/*"],
  env: {
    node: true,
  },
  /*
   * If rules need to be disabled then the rule is insufficiently high signal
   * and should be diasbled altogether or customized (in either case via a standalone PR)
   */
  noInlineConfig: true,
  reportUnusedDisableDirectives: true,
};
