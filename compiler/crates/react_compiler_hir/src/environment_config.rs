// Copyright (c) Meta Platforms, Inc. and affiliates.
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

//! Environment configuration, ported from EnvironmentConfigSchema in Environment.ts.
//!
//! Contains feature flags and custom hook definitions that control compiler behavior.

use indexmap::IndexMap;
use rustc_hash::{FxBuildHasher, FxHashMap};

use serde::{Deserialize, Serialize};

use crate::Effect;
use crate::type_config::{TypeConfig, ValueKind};

/// External function reference (source module + import name).
/// Corresponds to TS `ExternalFunction`.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExternalFunctionConfig {
    pub source: String,
    pub import_specifier_name: String,
}

/// Instrumentation configuration.
/// Corresponds to TS `InstrumentationSchema`.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InstrumentationConfig {
    #[serde(rename = "fn")]
    pub fn_: ExternalFunctionConfig,
    #[serde(default)]
    pub gating: Option<ExternalFunctionConfig>,
    #[serde(default)]
    pub global_gating: Option<String>,
}

/// Custom hook configuration, ported from TS `HookSchema`.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HookConfig {
    pub effect_kind: Effect,
    pub value_kind: ValueKind,
    #[serde(default)]
    pub no_alias: bool,
    #[serde(default)]
    pub transitive_mixed_data: bool,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum ExhaustiveEffectDepsMode {
    #[serde(rename = "off")]
    Off,
    #[serde(rename = "all")]
    All,
    #[serde(rename = "missing-only")]
    MissingOnly,
    #[serde(rename = "extra-only")]
    ExtraOnly,
}

impl Default for ExhaustiveEffectDepsMode {
    fn default() -> Self {
        Self::Off
    }
}

fn default_true() -> bool {
    true
}

/// Compiler environment configuration. Contains feature flags and settings.
///
/// Fields that would require passing JS functions across the JS/Rust boundary
/// are omitted with TODO comments. The Rust port uses hardcoded defaults for
/// these (e.g., `defaultModuleTypeProvider`).
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EnvironmentConfig {
    /// Custom hook type definitions, keyed by hook name.
    #[serde(default)]
    pub custom_hooks: FxHashMap<String, HookConfig>,

    /// Pre-resolved module type provider results.
    /// Map from module name to TypeConfig, computed by the JS shim.
    #[serde(default)]
    pub module_type_provider: Option<IndexMap<String, TypeConfig, FxBuildHasher>>,

    /// Custom macro-like function names that should have their operands
    /// memoized in the same scope (similar to fbt).
    #[serde(default)]
    pub custom_macros: Option<Vec<String>>,

    /// If true, emit code to reset the memo cache on source file changes (HMR/fast refresh).
    /// If null (None), HMR detection is conditionally enabled based on NODE_ENV/__DEV__.
    #[serde(default)]
    pub enable_reset_cache_on_source_file_changes: Option<bool>,

    #[serde(default = "default_true")]
    pub enable_preserve_existing_memoization_guarantees: bool,
    #[serde(default = "default_true")]
    pub validate_preserve_existing_memoization_guarantees: bool,
    #[serde(default = "default_true")]
    pub validate_exhaustive_memoization_dependencies: bool,
    #[serde(default)]
    pub validate_exhaustive_effect_dependencies: ExhaustiveEffectDepsMode,

    // TODO: flowTypeProvider — requires JS function callback.
    #[serde(default = "default_true")]
    pub enable_optional_dependencies: bool,
    #[serde(default)]
    pub enable_name_anonymous_functions: bool,
    #[serde(default = "default_true")]
    pub validate_hooks_usage: bool,
    #[serde(default = "default_true")]
    pub validate_ref_access_during_render: bool,
    #[serde(default = "default_true")]
    pub validate_no_set_state_in_render: bool,
    #[serde(default)]
    pub enable_use_keyed_state: bool,
    #[serde(default)]
    pub validate_no_set_state_in_effects: bool,
    #[serde(default)]
    pub validate_no_derived_computations_in_effects: bool,
    #[serde(default)]
    #[serde(alias = "validateNoDerivedComputationsInEffects_exp")]
    pub validate_no_derived_computations_in_effects_exp: bool,
    #[serde(default)]
    #[serde(alias = "validateNoJSXInTryStatements")]
    pub validate_no_jsx_in_try_statements: bool,
    #[serde(default)]
    pub validate_static_components: bool,
    #[serde(default)]
    pub validate_no_capitalized_calls: Option<Vec<String>>,
    #[serde(default)]
    #[serde(alias = "restrictedImports")]
    pub validate_blocklisted_imports: Option<Vec<String>>,
    #[serde(default)]
    pub validate_source_locations: bool,
    #[serde(default)]
    pub validate_no_impure_functions_in_render: bool,
    #[serde(default)]
    pub validate_no_freezing_known_mutable_functions: bool,
    #[serde(default = "default_true")]
    pub enable_assume_hooks_follow_rules_of_react: bool,
    #[serde(default = "default_true")]
    pub enable_transitively_freeze_function_expressions: bool,

    /// Hook guard configuration. When set, wraps hook calls with dispatcher guard calls.
    #[serde(default)]
    pub enable_emit_hook_guards: Option<ExternalFunctionConfig>,

    /// Instrumentation configuration. When set, emits calls to instrument functions.
    #[serde(default)]
    pub enable_emit_instrument_forget: Option<InstrumentationConfig>,

    #[serde(default = "default_true")]
    pub enable_function_outlining: bool,
    #[serde(default)]
    pub enable_jsx_outlining: bool,
    #[serde(default)]
    pub assert_valid_mutable_ranges: bool,
    #[serde(default)]
    #[serde(alias = "throwUnknownException__testonly")]
    pub throw_unknown_exception_testonly: bool,
    #[serde(default)]
    pub enable_custom_type_definition_for_reanimated: bool,
    #[serde(default = "default_true")]
    pub enable_treat_ref_like_identifiers_as_refs: bool,
    #[serde(default)]
    pub enable_treat_set_identifiers_as_state_setters: bool,

    /// When a value has an unresolved/unknown type (no inferred shape) and a
    /// known non-mutating builtin collection method is called on it (e.g.
    /// `unknownValue.map(...)`, `.filter`, `.slice`, `.at`, ...), optimistically
    /// resolve that method against the builtin `Array` shape so its precise,
    /// receiver-non-mutating signature is used, instead of falling back to the
    /// conservative default that treats the method as potentially mutating the
    /// receiver.
    ///
    /// This relies on the same soundness argument that motivates
    /// `BuiltInMixedReadonly` (used for hook return values): assuming builtins are
    /// not patched, the only way `value.map` can exist and be callable is if
    /// `value` is an Array (or array-like), so `Array.prototype.map` semantics
    /// apply. See the doc comment on `BuiltInMixedReadonlyId` in ObjectShape.ts.
    /// The `Array` shape is used rather than `MixedReadonly` because its `map`
    /// (and siblings) carry an explicit aliasing signature that reads — rather
    /// than conditionally mutates — the receiver, which is what keeps the
    /// receiver out of the method call's reactive scope.
    ///
    /// Soundness tradeoff: this assumes the receiver is a real collection whose
    /// builtin (non-patched) method is being invoked. If user code shadows a
    /// collection method with a mutating implementation of the same name, this
    /// would under-approximate mutation. That risk is why this is default-off.
    ///
    /// Note the optimism compounds through return types: resolving against the
    /// Array shape also asserts the method's *return* is a real Array, so e.g.
    /// `unknown.slice()` becomes Array-typed and later methods on that result
    /// (including mutating ones like `.push`) resolve against the builtin Array
    /// shape with full confidence, without any further flag check.
    ///
    /// Motivating case (facebook/react#35902): the result of a plain function
    /// call (`const processedData = expensiveProcessing(data)`) has an unknown
    /// type, so `processedData.map(cb)` is treated conservatively and the map's
    /// mutable range extends over `processedData`, merging it into the same
    /// reactive scope as an unrelated captured value in `cb`. With this flag the
    /// `.map` is known to be non-mutating and `expensiveProcessing(data)` gets its
    /// own scope keyed only on `data`.
    #[serde(default)]
    pub enable_optimistic_builtin_method_shapes: bool,

    #[serde(default = "default_true")]
    pub validate_no_void_use_memo: bool,
    #[serde(default = "default_true")]
    pub enable_allow_set_state_from_refs_in_effects: bool,
    #[serde(default)]
    pub enable_verbose_no_set_state_in_effect: bool,

    // 🌲
    #[serde(default)]
    pub enable_forest: bool,
}

impl Default for EnvironmentConfig {
    fn default() -> Self {
        Self {
            custom_hooks: FxHashMap::default(),
            enable_reset_cache_on_source_file_changes: None,
            module_type_provider: None,
            enable_preserve_existing_memoization_guarantees: true,
            validate_preserve_existing_memoization_guarantees: true,
            validate_exhaustive_memoization_dependencies: true,
            validate_exhaustive_effect_dependencies: ExhaustiveEffectDepsMode::Off,
            enable_optional_dependencies: true,
            enable_name_anonymous_functions: false,
            validate_hooks_usage: true,
            validate_ref_access_during_render: true,
            validate_no_set_state_in_render: true,
            enable_use_keyed_state: false,
            validate_no_set_state_in_effects: false,
            validate_no_derived_computations_in_effects: false,
            validate_no_derived_computations_in_effects_exp: false,
            validate_no_jsx_in_try_statements: false,
            validate_static_components: false,
            validate_no_capitalized_calls: None,
            validate_blocklisted_imports: None,
            validate_source_locations: false,
            validate_no_impure_functions_in_render: false,
            validate_no_freezing_known_mutable_functions: false,
            enable_assume_hooks_follow_rules_of_react: true,
            enable_transitively_freeze_function_expressions: true,
            enable_emit_hook_guards: None,
            enable_emit_instrument_forget: None,
            enable_function_outlining: true,
            enable_jsx_outlining: false,
            assert_valid_mutable_ranges: false,
            throw_unknown_exception_testonly: false,
            enable_custom_type_definition_for_reanimated: false,
            enable_treat_ref_like_identifiers_as_refs: true,
            enable_treat_set_identifiers_as_state_setters: false,
            enable_optimistic_builtin_method_shapes: false,
            validate_no_void_use_memo: true,
            enable_allow_set_state_from_refs_in_effects: true,
            enable_verbose_no_set_state_in_effect: false,
            enable_forest: false,
            custom_macros: None,
        }
    }
}
