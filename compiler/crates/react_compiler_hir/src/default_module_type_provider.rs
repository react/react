// Copyright (c) Meta Platforms, Inc. and affiliates.
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

//! Default module type provider, ported from DefaultModuleTypeProvider.ts.
//!
//! Provides hardcoded type overrides for known-incompatible third-party libraries.

use indexmap::IndexMap;

use crate::Effect;
use crate::type_config::{
    BuiltInTypeRef, FunctionTypeConfig, HookTypeConfig, ObjectTypeConfig, TypeConfig,
    TypeReferenceConfig, ValueKind,
};

/// Returns type configuration for known third-party modules that are
/// incompatible with memoization. Ported from TS `defaultModuleTypeProvider`.
pub fn default_module_type_provider(module_name: &str) -> Option<TypeConfig> {
    match module_name {
        "react-hook-form" => Some(TypeConfig::Object(ObjectTypeConfig {
            properties: Some(IndexMap::from([(
                "useForm".to_string(),
                TypeConfig::Hook(HookTypeConfig {
                    return_type: Box::new(TypeConfig::Object(ObjectTypeConfig {
                        properties: Some(IndexMap::from([(
                            "watch".to_string(),
                            TypeConfig::Function(FunctionTypeConfig {
                                positional_params: Vec::new(),
                                rest_param: Some(Effect::Read),
                                callee_effect: Effect::Read,
                                return_type: Box::new(TypeConfig::TypeReference(
                                    TypeReferenceConfig {
                                        name: BuiltInTypeRef::Any,
                                    },
                                )),
                                return_value_kind: ValueKind::Mutable,
                                no_alias: None,
                                mutable_only_if_operands_are_mutable: None,
                                impure: None,
                                canonical_name: None,
                                aliasing: None,
                                known_incompatible: Some(
                                    "React Hook Form's `useForm()` API returns a `watch()` function which cannot be memoized safely.".to_string(),
                                ),
                            }),
                        )])),
                    })),
                    positional_params: None,
                    rest_param: None,
                    return_value_kind: None,
                    no_alias: None,
                    aliasing: None,
                    known_incompatible: None,
                }),
            )])),
        })),

        "@tanstack/react-table" => Some(TypeConfig::Object(ObjectTypeConfig {
            properties: Some(IndexMap::from([(
                "useReactTable".to_string(),
                TypeConfig::Hook(HookTypeConfig {
                    positional_params: Some(Vec::new()),
                    rest_param: Some(Effect::Read),
                    return_type: Box::new(TypeConfig::TypeReference(TypeReferenceConfig {
                        name: BuiltInTypeRef::Any,
                    })),
                    return_value_kind: None,
                    no_alias: None,
                    aliasing: None,
                    known_incompatible: Some(
                        "TanStack Table's `useReactTable()` API returns functions that cannot be memoized safely".to_string(),
                    ),
                }),
            )])),
        })),

        "@tanstack/react-virtual" => Some(TypeConfig::Object(ObjectTypeConfig {
            properties: Some(IndexMap::from([(
                "useVirtualizer".to_string(),
                TypeConfig::Hook(HookTypeConfig {
                    positional_params: Some(Vec::new()),
                    rest_param: Some(Effect::Read),
                    return_type: Box::new(TypeConfig::TypeReference(TypeReferenceConfig {
                        name: BuiltInTypeRef::Any,
                    })),
                    return_value_kind: None,
                    no_alias: None,
                    aliasing: None,
                    known_incompatible: Some(
                        "TanStack Virtual's `useVirtualizer()` API returns functions that cannot be memoized safely".to_string(),
                    ),
                }),
            )])),
        })),

        _ => None,
    }
}
