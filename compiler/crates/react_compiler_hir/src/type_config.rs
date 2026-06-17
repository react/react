// Copyright (c) Meta Platforms, Inc. and affiliates.
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

//! Type configuration types, ported from TypeSchema.ts.
//!
//! These are the JSON-serializable config types used by `moduleTypeProvider`
//! and `installTypeConfig` to describe module/function/hook types.

use indexmap::IndexMap;

use crate::Effect;

/// Mirrors TS `ValueKind` enum for use in config.
#[derive(Debug, Clone, Copy, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ValueKind {
    Mutable,
    Frozen,
    Primitive,
    #[serde(rename = "maybefrozen")]
    MaybeFrozen,
    Global,
    Context,
}

/// Mirrors TS `ValueReason` enum for use in config.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, serde::Serialize, serde::Deserialize)]
pub enum ValueReason {
    #[serde(rename = "known-return-signature")]
    KnownReturnSignature,
    #[serde(rename = "state")]
    State,
    #[serde(rename = "reducer-state")]
    ReducerState,
    #[serde(rename = "context")]
    Context,
    #[serde(rename = "effect")]
    Effect,
    #[serde(rename = "hook-captured")]
    HookCaptured,
    #[serde(rename = "hook-return")]
    HookReturn,
    #[serde(rename = "global")]
    Global,
    #[serde(rename = "jsx-captured")]
    JsxCaptured,
    #[serde(rename = "store-local")]
    StoreLocal,
    #[serde(rename = "reactive-function-argument")]
    ReactiveFunctionArgument,
    #[serde(rename = "other")]
    Other,
}

// =============================================================================
// Aliasing effect config types (from TypeSchema.ts)
// =============================================================================

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(tag = "kind")]
pub enum AliasingEffectConfig {
    Freeze {
        value: String,
        reason: ValueReason,
    },
    Create {
        into: String,
        value: ValueKind,
        reason: ValueReason,
    },
    CreateFrom {
        from: String,
        into: String,
    },
    Assign {
        from: String,
        into: String,
    },
    Alias {
        from: String,
        into: String,
    },
    Capture {
        from: String,
        into: String,
    },
    ImmutableCapture {
        from: String,
        into: String,
    },
    Impure {
        place: String,
    },
    Mutate {
        value: String,
    },
    MutateTransitiveConditionally {
        value: String,
    },
    Apply {
        receiver: String,
        function: String,
        #[serde(rename = "mutatesFunction")]
        mutates_function: bool,
        args: Vec<ApplyArgConfig>,
        into: String,
    },
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(untagged)]
pub enum ApplyArgConfig {
    Place(String),
    Spread {
        #[allow(dead_code)]
        kind: ApplyArgSpreadKind,
        place: String,
    },
    Hole {
        #[allow(dead_code)]
        kind: ApplyArgHoleKind,
    },
}

/// Helper enum for tagged serde of `ApplyArgConfig::Spread`.
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub enum ApplyArgSpreadKind {
    Spread,
}

/// Helper enum for tagged serde of `ApplyArgConfig::Hole`.
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub enum ApplyArgHoleKind {
    Hole,
}

/// Aliasing signature config, the JSON-serializable form.
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct AliasingSignatureConfig {
    pub receiver: String,
    pub params: Vec<String>,
    pub rest: Option<String>,
    pub returns: String,
    pub temporaries: Vec<String>,
    pub effects: Vec<AliasingEffectConfig>,
}

// =============================================================================
// Type config (from TypeSchema.ts)
// =============================================================================

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(tag = "kind")]
pub enum TypeConfig {
    #[serde(rename = "object")]
    Object(ObjectTypeConfig),
    #[serde(rename = "function")]
    Function(FunctionTypeConfig),
    #[serde(rename = "hook")]
    Hook(HookTypeConfig),
    #[serde(rename = "type")]
    TypeReference(TypeReferenceConfig),
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct ObjectTypeConfig {
    pub properties: Option<IndexMap<String, TypeConfig>>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FunctionTypeConfig {
    pub positional_params: Vec<Effect>,
    pub rest_param: Option<Effect>,
    pub callee_effect: Effect,
    pub return_type: Box<TypeConfig>,
    pub return_value_kind: ValueKind,
    pub no_alias: Option<bool>,
    pub mutable_only_if_operands_are_mutable: Option<bool>,
    pub impure: Option<bool>,
    pub canonical_name: Option<String>,
    pub aliasing: Option<AliasingSignatureConfig>,
    pub known_incompatible: Option<String>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HookTypeConfig {
    pub positional_params: Option<Vec<Effect>>,
    pub rest_param: Option<Effect>,
    pub return_type: Box<TypeConfig>,
    pub return_value_kind: Option<ValueKind>,
    pub no_alias: Option<bool>,
    pub aliasing: Option<AliasingSignatureConfig>,
    pub known_incompatible: Option<String>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
pub enum BuiltInTypeRef {
    Any,
    Ref,
    Array,
    Primitive,
    MixedReadonly,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct TypeReferenceConfig {
    pub name: BuiltInTypeRef,
}
