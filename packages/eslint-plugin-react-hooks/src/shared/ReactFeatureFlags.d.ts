/**
 * Type declarations for shared/ReactFeatureFlags
 *
 * This allows importing from the Flow-typed ReactFeatureFlags.js file
 * without TypeScript errors.
 */
declare module 'shared/ReactFeatureFlags' {
  export const eprh_enableUseKeyedStateCompilerLint: boolean;
  export const eprh_enableVerboseNoSetStateInEffectCompilerLint: boolean;
  export const eprh_enableExhaustiveEffectDependenciesCompilerLint:
    | 'off'
    | 'all'
    | 'extra-only'
    | 'missing-only';
}
