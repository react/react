// Copyright (c) Meta Platforms, Inc. and affiliates.
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

//! Object shapes and function signatures, ported from ObjectShape.ts.
//!
//! Defines the shape registry used by Environment to resolve property types
//! and function call signatures for built-in objects, hooks, and user-defined types.

use rustc_hash::FxHashMap;

use crate::Effect;
use crate::Type;
use crate::type_config::{AliasingEffectConfig, AliasingSignatureConfig, ValueKind, ValueReason};

// =============================================================================
// Shape ID constants (matching TS ObjectShape.ts)
// =============================================================================

pub const BUILT_IN_PROPS_ID: &str = "BuiltInProps";
pub const BUILT_IN_ARRAY_ID: &str = "BuiltInArray";
pub const BUILT_IN_SET_ID: &str = "BuiltInSet";
pub const BUILT_IN_MAP_ID: &str = "BuiltInMap";
pub const BUILT_IN_WEAK_SET_ID: &str = "BuiltInWeakSet";
pub const BUILT_IN_WEAK_MAP_ID: &str = "BuiltInWeakMap";
pub const BUILT_IN_FUNCTION_ID: &str = "BuiltInFunction";
pub const BUILT_IN_JSX_ID: &str = "BuiltInJsx";
pub const BUILT_IN_OBJECT_ID: &str = "BuiltInObject";
pub const BUILT_IN_USE_STATE_ID: &str = "BuiltInUseState";
pub const BUILT_IN_SET_STATE_ID: &str = "BuiltInSetState";
pub const BUILT_IN_USE_ACTION_STATE_ID: &str = "BuiltInUseActionState";
pub const BUILT_IN_SET_ACTION_STATE_ID: &str = "BuiltInSetActionState";
pub const BUILT_IN_USE_REF_ID: &str = "BuiltInUseRefId";
pub const BUILT_IN_REF_VALUE_ID: &str = "BuiltInRefValue";
pub const BUILT_IN_MIXED_READONLY_ID: &str = "BuiltInMixedReadonly";
pub const BUILT_IN_USE_EFFECT_HOOK_ID: &str = "BuiltInUseEffectHook";
pub const BUILT_IN_USE_LAYOUT_EFFECT_HOOK_ID: &str = "BuiltInUseLayoutEffectHook";
pub const BUILT_IN_USE_INSERTION_EFFECT_HOOK_ID: &str = "BuiltInUseInsertionEffectHook";
pub const BUILT_IN_USE_OPERATOR_ID: &str = "BuiltInUseOperator";
pub const BUILT_IN_USE_REDUCER_ID: &str = "BuiltInUseReducer";
pub const BUILT_IN_DISPATCH_ID: &str = "BuiltInDispatch";
pub const BUILT_IN_USE_CONTEXT_HOOK_ID: &str = "BuiltInUseContextHook";
pub const BUILT_IN_USE_TRANSITION_ID: &str = "BuiltInUseTransition";
pub const BUILT_IN_USE_OPTIMISTIC_ID: &str = "BuiltInUseOptimistic";
pub const BUILT_IN_SET_OPTIMISTIC_ID: &str = "BuiltInSetOptimistic";
pub const BUILT_IN_START_TRANSITION_ID: &str = "BuiltInStartTransition";
pub const BUILT_IN_USE_EFFECT_EVENT_ID: &str = "BuiltInUseEffectEvent";
pub const BUILT_IN_EFFECT_EVENT_ID: &str = "BuiltInEffectEventFunction";
pub const REANIMATED_SHARED_VALUE_ID: &str = "ReanimatedSharedValueId";

// =============================================================================
// Core types
// =============================================================================

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum HookKind {
    UseContext,
    UseState,
    UseActionState,
    UseReducer,
    UseRef,
    UseEffect,
    UseLayoutEffect,
    UseInsertionEffect,
    UseMemo,
    UseCallback,
    UseTransition,
    UseImperativeHandle,
    UseEffectEvent,
    UseOptimistic,
    Custom,
}

impl std::fmt::Display for HookKind {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            HookKind::UseContext => write!(f, "useContext"),
            HookKind::UseState => write!(f, "useState"),
            HookKind::UseActionState => write!(f, "useActionState"),
            HookKind::UseReducer => write!(f, "useReducer"),
            HookKind::UseRef => write!(f, "useRef"),
            HookKind::UseEffect => write!(f, "useEffect"),
            HookKind::UseLayoutEffect => write!(f, "useLayoutEffect"),
            HookKind::UseInsertionEffect => write!(f, "useInsertionEffect"),
            HookKind::UseMemo => write!(f, "useMemo"),
            HookKind::UseCallback => write!(f, "useCallback"),
            HookKind::UseTransition => write!(f, "useTransition"),
            HookKind::UseImperativeHandle => write!(f, "useImperativeHandle"),
            HookKind::UseEffectEvent => write!(f, "useEffectEvent"),
            HookKind::UseOptimistic => write!(f, "useOptimistic"),
            HookKind::Custom => write!(f, "Custom"),
        }
    }
}

/// Call signature of a function, used for type and effect inference.
/// Ported from TS `FunctionSignature`.
#[derive(Debug, Clone)]
pub struct FunctionSignature {
    pub positional_params: Vec<Effect>,
    pub rest_param: Option<Effect>,
    pub return_type: Type,
    pub return_value_kind: ValueKind,
    pub return_value_reason: Option<ValueReason>,
    pub callee_effect: Effect,
    pub hook_kind: Option<HookKind>,
    pub no_alias: bool,
    pub mutable_only_if_operands_are_mutable: bool,
    pub impure: bool,
    pub known_incompatible: Option<String>,
    pub canonical_name: Option<String>,
    /// Aliasing signature in config form. Full parsing into AliasingSignature
    /// with Place values is deferred until the aliasing effects system is ported.
    pub aliasing: Option<AliasingSignatureConfig>,
}

/// Shape of an object or function type.
/// Ported from TS `ObjectShape`.
#[derive(Debug, Clone)]
pub struct ObjectShape {
    pub properties: FxHashMap<String, Type>,
    pub function_type: Option<FunctionSignature>,
}

/// Registry mapping shape IDs to their ObjectShape definitions.
///
/// Supports two modes:
/// - **Builder mode** (`base=None`): wraps a single FxHashMap, used during
///   `build_builtin_shapes` / `build_default_globals` to construct the static base.
/// - **Overlay mode** (`base=Some`): holds a `&'static FxHashMap` base plus a small
///   extras FxHashMap. Lookups check extras first, then base. Inserts go into extras.
///   Cloning only copies the extras map (the base pointer is shared).
pub struct ShapeRegistry {
    base: Option<&'static FxHashMap<String, ObjectShape>>,
    entries: FxHashMap<String, ObjectShape>,
}

impl ShapeRegistry {
    /// Create an empty builder-mode registry.
    pub fn new() -> Self {
        Self {
            base: None,
            entries: FxHashMap::default(),
        }
    }

    /// Create an overlay-mode registry backed by a static base.
    pub fn with_base(base: &'static FxHashMap<String, ObjectShape>) -> Self {
        Self {
            base: Some(base),
            entries: FxHashMap::default(),
        }
    }

    pub fn get(&self, key: &str) -> Option<&ObjectShape> {
        self.entries
            .get(key)
            .or_else(|| self.base.and_then(|b| b.get(key)))
    }

    pub fn insert(&mut self, key: String, value: ObjectShape) {
        self.entries.insert(key, value);
    }

    /// Consume the registry and return the inner FxHashMap.
    /// Only valid in builder mode (no base).
    pub fn into_inner(self) -> FxHashMap<String, ObjectShape> {
        debug_assert!(
            self.base.is_none(),
            "into_inner() called on overlay-mode ShapeRegistry"
        );
        self.entries
    }
}

impl Clone for ShapeRegistry {
    fn clone(&self) -> Self {
        Self {
            base: self.base,
            entries: self.entries.clone(),
        }
    }
}

// =============================================================================
// Counter for anonymous shape IDs
// =============================================================================

/// Thread-local counter for generating unique anonymous shape IDs.
/// Mirrors TS `nextAnonId` in ObjectShape.ts.
fn next_anon_id() -> String {
    use std::sync::atomic::{AtomicU32, Ordering};
    static COUNTER: AtomicU32 = AtomicU32::new(0);
    let id = COUNTER.fetch_add(1, Ordering::Relaxed);
    format!("<generated_{}>", id)
}

// =============================================================================
// Builder functions (matching TS addFunction, addHook, addObject)
// =============================================================================

/// Add a non-hook function to a ShapeRegistry.
/// Returns a `Type::Function` representing the added function.
pub fn add_function(
    registry: &mut ShapeRegistry,
    properties: Vec<(String, Type)>,
    sig: FunctionSignatureBuilder,
    id: Option<&str>,
    is_constructor: bool,
) -> Type {
    let shape_id = id.map(|s| s.to_string()).unwrap_or_else(next_anon_id);
    let return_type = sig.return_type.clone();
    add_shape(
        registry,
        &shape_id,
        properties,
        Some(FunctionSignature {
            positional_params: sig.positional_params,
            rest_param: sig.rest_param,
            return_type: sig.return_type,
            return_value_kind: sig.return_value_kind,
            return_value_reason: sig.return_value_reason,
            callee_effect: sig.callee_effect,
            hook_kind: None,
            no_alias: sig.no_alias,
            mutable_only_if_operands_are_mutable: sig.mutable_only_if_operands_are_mutable,
            impure: sig.impure,
            known_incompatible: sig.known_incompatible,
            canonical_name: sig.canonical_name,
            aliasing: sig.aliasing,
        }),
    );
    Type::Function {
        shape_id: Some(shape_id),
        return_type: Box::new(return_type),
        is_constructor,
    }
}

/// Add a hook to a ShapeRegistry.
/// Returns a `Type::Function` representing the added hook.
pub fn add_hook(registry: &mut ShapeRegistry, sig: HookSignatureBuilder, id: Option<&str>) -> Type {
    let shape_id = id.map(|s| s.to_string()).unwrap_or_else(next_anon_id);
    let return_type = sig.return_type.clone();
    add_shape(
        registry,
        &shape_id,
        Vec::new(),
        Some(FunctionSignature {
            positional_params: sig.positional_params,
            rest_param: sig.rest_param,
            return_type: sig.return_type,
            return_value_kind: sig.return_value_kind,
            return_value_reason: sig.return_value_reason,
            callee_effect: sig.callee_effect,
            hook_kind: Some(sig.hook_kind),
            no_alias: sig.no_alias,
            mutable_only_if_operands_are_mutable: false,
            impure: false,
            known_incompatible: sig.known_incompatible,
            canonical_name: None,
            aliasing: sig.aliasing,
        }),
    );
    Type::Function {
        shape_id: Some(shape_id),
        return_type: Box::new(return_type),
        is_constructor: false,
    }
}

/// Add an object to a ShapeRegistry.
/// Returns a `Type::Object` representing the added object.
pub fn add_object(
    registry: &mut ShapeRegistry,
    id: Option<&str>,
    properties: Vec<(String, Type)>,
) -> Type {
    let shape_id = id.map(|s| s.to_string()).unwrap_or_else(next_anon_id);
    add_shape(registry, &shape_id, properties, None);
    Type::Object {
        shape_id: Some(shape_id),
    }
}

fn add_shape(
    registry: &mut ShapeRegistry,
    id: &str,
    properties: Vec<(String, Type)>,
    function_type: Option<FunctionSignature>,
) {
    let shape = ObjectShape {
        properties: properties.into_iter().collect(),
        function_type,
    };
    // Note: TS has an invariant that the id doesn't already exist. We use
    // insert which overwrites. In practice duplicates don't occur for built-in
    // shapes, and for user configs we want last-write-wins behavior.
    registry.insert(id.to_string(), shape);
}

// =============================================================================
// Builder structs (to avoid large parameter lists)
// =============================================================================

/// Builder for non-hook function signatures.
pub struct FunctionSignatureBuilder {
    pub positional_params: Vec<Effect>,
    pub rest_param: Option<Effect>,
    pub return_type: Type,
    pub return_value_kind: ValueKind,
    pub return_value_reason: Option<ValueReason>,
    pub callee_effect: Effect,
    pub no_alias: bool,
    pub mutable_only_if_operands_are_mutable: bool,
    pub impure: bool,
    pub known_incompatible: Option<String>,
    pub canonical_name: Option<String>,
    pub aliasing: Option<AliasingSignatureConfig>,
}

impl Default for FunctionSignatureBuilder {
    fn default() -> Self {
        Self {
            positional_params: Vec::new(),
            rest_param: None,
            return_type: Type::Poly,
            return_value_kind: ValueKind::Mutable,
            return_value_reason: None,
            callee_effect: Effect::Read,
            no_alias: false,
            mutable_only_if_operands_are_mutable: false,
            impure: false,
            known_incompatible: None,
            canonical_name: None,
            aliasing: None,
        }
    }
}

/// Builder for hook signatures.
pub struct HookSignatureBuilder {
    pub positional_params: Vec<Effect>,
    pub rest_param: Option<Effect>,
    pub return_type: Type,
    pub return_value_kind: ValueKind,
    pub return_value_reason: Option<ValueReason>,
    pub callee_effect: Effect,
    pub hook_kind: HookKind,
    pub no_alias: bool,
    pub known_incompatible: Option<String>,
    pub aliasing: Option<AliasingSignatureConfig>,
}

impl Default for HookSignatureBuilder {
    fn default() -> Self {
        Self {
            positional_params: Vec::new(),
            rest_param: None,
            return_type: Type::Poly,
            return_value_kind: ValueKind::Frozen,
            return_value_reason: None,
            callee_effect: Effect::Read,
            hook_kind: HookKind::Custom,
            no_alias: false,
            known_incompatible: None,
            aliasing: None,
        }
    }
}

// =============================================================================
// Default hook types used for unknown hooks
// =============================================================================

/// Default type for hooks when enableAssumeHooksFollowRulesOfReact is true.
/// Matches TS `DefaultNonmutatingHook`.
pub fn default_nonmutating_hook(registry: &mut ShapeRegistry) -> Type {
    add_hook(
        registry,
        HookSignatureBuilder {
            rest_param: Some(Effect::Freeze),
            return_type: Type::Poly,
            return_value_kind: ValueKind::Frozen,
            hook_kind: HookKind::Custom,
            aliasing: Some(AliasingSignatureConfig {
                receiver: "@receiver".to_string(),
                params: Vec::new(),
                rest: Some("@rest".to_string()),
                returns: "@returns".to_string(),
                temporaries: Vec::new(),
                effects: vec![
                    // Freeze the arguments
                    AliasingEffectConfig::Freeze {
                        value: "@rest".to_string(),
                        reason: ValueReason::HookCaptured,
                    },
                    // Returns a frozen value
                    AliasingEffectConfig::Create {
                        into: "@returns".to_string(),
                        value: ValueKind::Frozen,
                        reason: ValueReason::HookReturn,
                    },
                    // May alias any arguments into the return
                    AliasingEffectConfig::Alias {
                        from: "@rest".to_string(),
                        into: "@returns".to_string(),
                    },
                ],
            }),
            ..Default::default()
        },
        Some("DefaultNonmutatingHook"),
    )
}

/// Default type for hooks when enableAssumeHooksFollowRulesOfReact is false.
/// Matches TS `DefaultMutatingHook`.
pub fn default_mutating_hook(registry: &mut ShapeRegistry) -> Type {
    add_hook(
        registry,
        HookSignatureBuilder {
            rest_param: Some(Effect::ConditionallyMutate),
            return_type: Type::Poly,
            return_value_kind: ValueKind::Mutable,
            hook_kind: HookKind::Custom,
            ..Default::default()
        },
        Some("DefaultMutatingHook"),
    )
}
