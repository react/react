use rustc_hash::{FxBuildHasher, FxHashMap};

use indexmap::IndexMap;
use serde::Deserialize;
use serde::Serialize;

/// Identifies a scope in the scope table. Copy-able, used as an index.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct ScopeId(pub u32);

/// Identifies a binding (variable declaration) in the binding table. Copy-able, used as an index.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct BindingId(pub u32);

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ScopeData {
    pub id: ScopeId,
    pub parent: Option<ScopeId>,
    pub kind: ScopeKind,
    /// Bindings declared directly in this scope, keyed by name.
    /// Maps to BindingId for lookup in the binding table.
    pub bindings: FxHashMap<String, BindingId>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ScopeKind {
    Program,
    Function,
    Block,
    #[serde(rename = "for")]
    For,
    Class,
    Switch,
    Catch,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BindingData {
    pub id: BindingId,
    pub name: String,
    pub kind: BindingKind,
    /// The scope this binding is declared in.
    pub scope: ScopeId,
    /// The type of the declaration AST node (e.g., "FunctionDeclaration",
    /// "VariableDeclarator"). Used by the compiler to distinguish function
    /// declarations from variable declarations during hoisting.
    pub declaration_type: String,
    /// The start offset of the binding's declaration identifier.
    /// Used to distinguish declaration sites from references in `reference_to_binding`.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub declaration_start: Option<u32>,
    /// The node-ID of the binding's declaration identifier.
    /// Preferred over `declaration_start` for distinguishing declarations from
    /// references, as positions can collide for synthetic nodes at position 0.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub declaration_node_id: Option<u32>,
    /// For import bindings: the source module and import details.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub import: Option<ImportBindingData>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum BindingKind {
    Var,
    Let,
    Const,
    Param,
    /// Import bindings (import declarations).
    Module,
    /// Function declarations (hoisted).
    Hoisted,
    /// Other local bindings (class declarations, etc.).
    Local,
    /// Binding kind not recognized by the serializer.
    Unknown,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImportBindingData {
    /// The module specifier string (e.g., "react" in `import {useState} from 'react'`).
    pub source: String,
    pub kind: ImportBindingKind,
    /// For named imports: the imported name (e.g., "bar" in `import {bar as baz} from 'foo'`).
    /// None for default and namespace imports.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub imported: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ImportBindingKind {
    Default,
    Named,
    Namespace,
}

/// Complete scope information for a program. Stored separately from the AST
/// and linked via position-based lookup maps.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ScopeInfo {
    /// All scopes, indexed by ScopeId. scopes[id.0] gives the ScopeData for that scope.
    pub scopes: Vec<ScopeData>,
    /// All bindings, indexed by BindingId. bindings[id.0] gives the BindingData.
    pub bindings: Vec<BindingData>,

    /// Maps an AST node's start offset to the scope it creates.
    ///
    /// **NOT for identity lookups** — use `node_id_to_scope` (via `resolve_scope_for_node`)
    /// instead. Retained only for position-range containment queries
    /// (e.g., "is reference R inside function scope S?").
    pub node_to_scope: FxHashMap<u32, ScopeId>,

    /// Maps an AST node's start offset to the node's end offset.
    /// Parallel to `node_to_scope` — used for position-range containment checks.
    #[serde(default, skip_serializing_if = "FxHashMap::is_empty")]
    pub node_to_scope_end: FxHashMap<u32, u32>,

    /// **DEPRECATED** — retained only for Babel bridge JSON deserialization.
    /// All backends pass empty maps; only the Babel bridge populates this.
    /// Use `ref_node_id_to_binding` for all lookups and iteration.
    #[serde(default)]
    pub reference_to_binding: IndexMap<u32, BindingId, FxBuildHasher>,

    /// Maps an identifier reference's node-ID to the binding it resolves to.
    /// Only present for identifiers that resolve to a binding (not globals).
    /// Uses IndexMap to preserve insertion order.
    #[serde(
        default,
        skip_serializing_if = "IndexMap::is_empty",
        rename = "refNodeIdToBinding"
    )]
    pub ref_node_id_to_binding: IndexMap<u32, BindingId, FxBuildHasher>,

    /// Maps a scope-creating AST node's node-ID to the scope it creates.
    #[serde(
        default,
        skip_serializing_if = "FxHashMap::is_empty",
        rename = "nodeIdToScope"
    )]
    pub node_id_to_scope: FxHashMap<u32, ScopeId>,

    /// The program-level (module) scope. Always scopes[0].
    pub program_scope: ScopeId,
}

impl ScopeInfo {
    /// Look up a binding by name starting from the given scope,
    /// walking up the parent chain. Returns None for globals.
    pub fn get_binding(&self, scope_id: ScopeId, name: &str) -> Option<BindingId> {
        let mut current = Some(scope_id);
        while let Some(id) = current {
            let scope = &self.scopes[id.0 as usize];
            if let Some(&binding_id) = scope.bindings.get(name) {
                return Some(binding_id);
            }
            current = scope.parent;
        }
        None
    }

    /// Look up the scope for an AST node by its unique node ID.
    pub fn resolve_scope_by_node_id(&self, node_id: u32) -> Option<ScopeId> {
        self.node_id_to_scope.get(&node_id).copied()
    }

    /// Resolve the scope for an AST node by node_id.
    /// Returns None if node_id is None (the node has no scope entry) or if the
    /// node_id doesn't map to any scope. This is expected for AST nodes that
    /// don't create their own scope — e.g., a function body BlockStatement in
    /// Babel shares the function's scope and never gets a _nodeId assigned by
    /// scope extraction.
    pub fn resolve_scope_for_node(&self, node_id: Option<u32>) -> Option<ScopeId> {
        let nid = node_id?;
        self.node_id_to_scope.get(&nid).copied()
    }

    /// Look up the binding for an identifier reference by its unique node ID.
    /// Returns None for globals/unresolved references.
    pub fn resolve_reference_by_node_id(&self, node_id: u32) -> Option<BindingId> {
        self.ref_node_id_to_binding.get(&node_id).copied()
    }

    /// Resolve the binding for an identifier by node_id.
    /// Returns None if node_id is None or if the identifier doesn't resolve to
    /// a binding (i.e., it's a global/unresolved reference).
    pub fn resolve_reference_id_for_node(&self, node_id: Option<u32>) -> Option<BindingId> {
        let nid = node_id?;
        self.ref_node_id_to_binding.get(&nid).copied()
    }

    /// Resolve the binding for an identifier by node_id.
    /// Returns None if node_id is None or if the identifier doesn't resolve to
    /// a binding (i.e., it's a global/unresolved reference).
    pub fn resolve_reference_for_node(&self, node_id: Option<u32>) -> Option<&BindingData> {
        self.resolve_reference_id_for_node(node_id)
            .map(|id| &self.bindings[id.0 as usize])
    }

    /// Find a binding by name within the descendants of a given scope.
    pub fn find_binding_in_descendants(
        &self,
        name: &str,
        ancestor: ScopeId,
    ) -> Option<&BindingData> {
        let mut descendants = rustc_hash::FxHashSet::default();
        descendants.insert(ancestor);
        let mut changed = true;
        while changed {
            changed = false;
            for (i, scope) in self.scopes.iter().enumerate() {
                let sid = ScopeId(i as u32);
                if let Some(parent) = scope.parent {
                    if descendants.contains(&parent) && !descendants.contains(&sid) {
                        descendants.insert(sid);
                        changed = true;
                    }
                }
            }
        }
        for sid in &descendants {
            let scope = &self.scopes[sid.0 as usize];
            if let Some(id) = scope.bindings.get(name) {
                return Some(&self.bindings[id.0 as usize]);
            }
        }
        None
    }

    /// Like find_binding_in_descendants, but returns the BindingData with its id
    /// for use in resolve_binding.
    pub fn find_binding_id_in_descendants(
        &self,
        name: &str,
        ancestor: ScopeId,
    ) -> Option<(BindingId, &BindingData)> {
        let mut descendants = rustc_hash::FxHashSet::default();
        descendants.insert(ancestor);
        let mut changed = true;
        while changed {
            changed = false;
            for (i, scope) in self.scopes.iter().enumerate() {
                let sid = ScopeId(i as u32);
                if let Some(parent) = scope.parent {
                    if descendants.contains(&parent) && !descendants.contains(&sid) {
                        descendants.insert(sid);
                        changed = true;
                    }
                }
            }
        }
        for sid in &descendants {
            let scope = &self.scopes[sid.0 as usize];
            if let Some(&id) = scope.bindings.get(name) {
                return Some((id, &self.bindings[id.0 as usize]));
            }
        }
        None
    }

    /// Get all bindings declared in a scope (for hoisting iteration).
    pub fn scope_bindings(&self, scope_id: ScopeId) -> impl Iterator<Item = &BindingData> {
        self.scopes[scope_id.0 as usize]
            .bindings
            .values()
            .map(|id| &self.bindings[id.0 as usize])
    }

    /// Get bindings from a scope AND its direct child block scopes.
    /// In Babel, a function body's BlockStatement shares the function's scope,
    /// so all bindings (var, const, let) appear in one scope. But our scope
    /// extraction may split them: function scope has params/var, a child block
    /// scope has const/let. This method merges them to match TS behavior.
    pub fn scope_bindings_with_children(
        &self,
        scope_id: ScopeId,
    ) -> impl Iterator<Item = &BindingData> {
        let mut binding_ids: Vec<BindingId> = Vec::new();
        // Add bindings from the scope itself
        for &id in self.scopes[scope_id.0 as usize].bindings.values() {
            binding_ids.push(id);
        }
        // Add bindings from direct child block scopes
        for scope in self.scopes.iter() {
            if scope.parent == Some(scope_id) && matches!(scope.kind, ScopeKind::Block) {
                for &id in scope.bindings.values() {
                    binding_ids.push(id);
                }
            }
        }
        binding_ids
            .into_iter()
            .map(|id| &self.bindings[id.0 as usize])
    }

    /// Find a block scope by matching variable names declared within it.
    /// Used for synthetic blocks (position 0) where position-based lookup fails.
    /// The `is_claimed` predicate allows skipping scopes already matched to other blocks.
    pub fn find_block_scope_by_bindings(
        &self,
        names: &[&str],
        ancestor: ScopeId,
        is_claimed: impl Fn(ScopeId) -> bool,
    ) -> Option<ScopeId> {
        let mut descendants = rustc_hash::FxHashSet::default();
        descendants.insert(ancestor);
        let mut changed = true;
        while changed {
            changed = false;
            for (i, scope) in self.scopes.iter().enumerate() {
                let sid = ScopeId(i as u32);
                if let Some(parent) = scope.parent {
                    if descendants.contains(&parent) && !descendants.contains(&sid) {
                        descendants.insert(sid);
                        changed = true;
                    }
                }
            }
        }
        for sid in &descendants {
            let scope = &self.scopes[sid.0 as usize];
            if matches!(scope.kind, ScopeKind::Function) {
                continue;
            }
            if is_claimed(*sid) {
                continue;
            }
            let all_match = names.iter().all(|name| scope.bindings.contains_key(*name));
            if all_match {
                return Some(*sid);
            }
        }
        None
    }
}
