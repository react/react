# Rust Port Step 2: Scope Types

## Goal

Define a normalized, parser-agnostic scope information model (`ScopeInfo`) that captures binding resolution, scope chains, and import metadata needed by the compiler's HIR lowering phase. The scope data is stored separately from the AST and linked via position-based lookup maps.

**Current status**: Complete (human reviewed). Scope types defined in `react_compiler_ast::scope`. Babel serialization in `babel-ast-to-json.mjs`. Scope resolution test passes for all 1714 fixtures.

---

## Design Goals

1. **Normalized/flat**: All data stored in flat `Vec`s indexed by `Copy`-able ID newtypes. No reference cycles, no `Rc`/`Arc`. Scope and binding records reference each other via IDs, not pointers.
2. **Parser-agnostic**: The scope types capture what the compiler needs, not the specifics of any parser's scope API. Any parser that can produce binding resolution and scope chain information can populate these types.
3. **AST types stay clean**: The AST crate's serde types have no scope-related fields. Scope-to-AST linkage is via position-based lookup maps in a separate `ScopeInfo` container.
4. **Sufficient for HIR lowering**: Must support all operations the compiler currently performs via Babel's scope API: `getBinding(name)`, `binding.kind`, `binding.scope`, `binding.path` (declaration node type), scope chain walking, `scope.bindings` iteration, and import source resolution.

---

## Core ID Types

```rust
/// Identifies a scope in the scope table. Copy-able, used as an index.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct ScopeId(pub u32);

/// Identifies a binding (variable declaration) in the binding table. Copy-able, used as an index.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct BindingId(pub u32);
```

Both are newtype wrappers around `u32` and implement `Copy`. They serve as indices into flat `Vec`s in the `ScopeInfo` container. This pattern matches OXC's `ScopeId`/`SymbolId` and the compiler's own HIR `IdentifierId`.

---

## Normalized Tables

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScopeData {
    pub id: ScopeId,
    pub parent: Option<ScopeId>,
    pub kind: ScopeKind,
    /// Bindings declared directly in this scope, keyed by name.
    /// Maps to BindingId for lookup in the binding table.
    pub bindings: HashMap<String, BindingId>,
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
pub struct BindingData {
    pub id: BindingId,
    pub name: String,
    pub kind: BindingKind,
    /// The scope this binding is declared in.
    pub scope: ScopeId,
    /// The type of the declaration AST node (e.g., "FunctionDeclaration",
    /// "VariableDeclarator"). Used by the compiler to distinguish function
    /// declarations from variable declarations during hoisting.
    /// COMMENT: make this an enum similar to BindingKind
    pub declaration_type: String,
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
```

Key differences from Babel's in-memory representation:
- **Bindings are stored in a flat table** indexed by `BindingId`, not nested inside scope objects. Each `ScopeData` stores `HashMap<String, BindingId>` mapping names to binding IDs rather than containing full binding data inline.
- **`declaration_type`** replaces Babel's `binding.path.isFunctionDeclaration()` / `binding.path.isVariableDeclarator()` checks. The compiler uses these to determine hoisting behavior — storing the declaration node type as a string avoids needing to cross-reference back into the AST.
- **`ImportBindingData`** captures import source, kind, and imported name, covering all the import resolution the compiler does via `binding.path.isImportSpecifier()` etc.

---

## ScopeInfo Container

```rust
/// Complete scope information for a program. Stored separately from the AST
/// and linked via position-based lookup maps.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScopeInfo {
    /// All scopes, indexed by ScopeId. scopes[id.0] gives the ScopeData for that scope.
    pub scopes: Vec<ScopeData>,
    /// All bindings, indexed by BindingId. bindings[id.0] gives the BindingData.
    pub bindings: Vec<BindingData>,

    /// Maps an AST node's start offset to the scope it creates.
    /// Populated for scope-creating nodes: Program, FunctionDeclaration,
    /// FunctionExpression, ArrowFunctionExpression, BlockStatement,
    /// ForStatement, ForInStatement, ForOfStatement, SwitchStatement,
    /// CatchClause, ClassDeclaration, ClassExpression.
    pub node_to_scope: HashMap<u32, ScopeId>,

    /// Maps an Identifier AST node's start offset to the binding it resolves to.
    /// Only present for identifiers that resolve to a binding (not globals).
    /// An identifier whose start offset is absent from this map is a global reference.
    pub reference_to_binding: HashMap<u32, BindingId>,

    /// The program-level (module) scope. Always scopes[0].
    pub program_scope: ScopeId,
}
```

**AST-to-scope linkage**: The AST types themselves carry no scope information — they remain pure serde data types for JSON round-tripping. The `ScopeInfo` links to AST nodes via start offsets (`u32`), which are stable across serialization. Start offsets are unique per node in Babel's output, making them reliable keys.

**Resolution algorithm** — equivalent to Babel's `scope.getBinding(name)`:

```rust
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

    /// Look up the binding for an identifier reference by its AST node start offset.
    /// Returns None for globals/unresolved references.
    pub fn resolve_reference(&self, identifier_start: u32) -> Option<&BindingData> {
        self.reference_to_binding
            .get(&identifier_start)
            .map(|id| &self.bindings[id.0 as usize])
    }

    /// Get all bindings declared in a scope (for hoisting iteration).
    pub fn scope_bindings(&self, scope_id: ScopeId) -> impl Iterator<Item = &BindingData> {
        self.scopes[scope_id.0 as usize]
            .bindings
            .values()
            .map(|id| &self.bindings[id.0 as usize])
    }
}
```

**Identity comparison**: Babel uses object identity (`binding1.identifier === binding2.identifier`) to compare bindings. In the normalized form, `BindingId` equality serves this purpose — two references that resolve to the same `BindingId` refer to the same declaration. This is equivalent to OXC's `SymbolId` equality.

**`generateUid`/`rename`**: These are mutating operations in Babel used during HIR lowering. In the Rust port, the scope info is read-only input. Unique name generation moves to the Rust side (the Environment already tracks a counter). Renaming is tracked in Rust's own data structures, same as the existing compiler does with its `HIRBuilder.#bindings` map.

---

## Conversion from Other Parsers

The `ScopeInfo` structure is parser-agnostic. Each parser integration produces an `(ast::File, ScopeInfo)` pair. The conversion patterns differ by parser:

**From Babel** (current path): The Node.js side runs `@babel/traverse` on the parsed AST and serializes two JSON blobs: the AST (already implemented) and the `ScopeInfo`. The traversal assigns `ScopeId`s in preorder, assigns `BindingId`s in declaration order, and populates the lookup maps by recording each identifier reference's start offset and resolved binding.

**From OXC**: OXC's `oxc_semantic` crate produces an arena-indexed `ScopeTree` + `SymbolTable` + `ReferenceTable` that maps closely to our structure:

| OXC type | Our type | Conversion |
|----------|----------|------------|
| `oxc_semantic::ScopeId(u32)` | `ScopeId(u32)` | Direct ID remapping |
| `oxc_semantic::SymbolId(u32)` | `BindingId(u32)` | Direct ID remapping |
| `ScopeTree` (parent IDs, flags, bindings) | `Vec<ScopeData>` | Map flags to `ScopeKind`, copy parent chain, convert binding maps from `SymbolId` to `BindingId` |
| `SymbolTable` (name, scope, flags) | `Vec<BindingData>` | Map flags to `BindingKind`, copy name and scope ID |
| `ReferenceTable` (symbol ID per reference) | `reference_to_binding: HashMap<u32, BindingId>` | Map each reference's AST node span start to its resolved `BindingId` |
| AST node `scope_id` fields | `node_to_scope: HashMap<u32, ScopeId>` | Map each scope-creating node's span start to its `ScopeId` |

OXC is the most natural fit — both use arena-indexed flat tables with `Copy`-able ID newtypes. The conversion is essentially remapping IDs, which is O(n) with no structural transformation.

**From SWC**: SWC does not produce a separate scope tree. Instead, its resolver pass annotates each `Ident` node with a `SyntaxContext` (an interned ID encoding hygiene/scope context). Converting to our model requires:

1. Run SWC's resolver pass to populate `SyntaxContext` on all identifiers
2. Traverse the resolved AST, building scope data by tracking `SyntaxContext` values and their nesting
3. For each unique `(name, SyntaxContext)` pair, create a `BindingData` entry
4. For each identifier reference, record its start offset → `BindingId` mapping
5. For each scope-creating node, record its start offset → `ScopeId` mapping

This is more work than the OXC path but straightforward — SWC's `SyntaxContext` uniquely identifies each binding's scope context, which gives us the information we need to reconstruct a scope tree.

---

## Completed Work

All items below have been implemented and verified against all 1714 test fixtures.

### Scope info types — Done

Defined `ScopeInfo`, `ScopeData`, `BindingData`, and related types as Rust structs in `react_compiler_ast::scope`. Includes `ScopeId`, `BindingId` newtypes, `ScopeKind`, `BindingKind`, `ImportBindingData`, and the resolution methods on `ScopeInfo`.

### Babel scope serialization — Done

Extended `compiler/scripts/babel-ast-to-json.mjs` to produce `.scope.json` and `.renamed.json` files alongside the AST JSON. Uses `@babel/traverse` to collect scope/binding data with preorder ID assignment, then renames identifiers per the `name_s{scopeId}_b{bindingId}` scheme.

### Scope resolution test — Done

Implemented in `compiler/crates/react_compiler_ast/tests/scope_resolution.rs` with two tests:
1. **`scope_info_round_trip`**: Verifies ScopeInfo JSON deserializes, re-serializes correctly, and passes internal consistency checks.
2. **`scope_resolution_rename`**: Walks the AST JSON using ScopeInfo to rename identifiers, then compares against Babel's renamed output. Verifies that the ScopeInfo structure correctly reproduces Babel's binding resolution for all 1714 fixtures.

Both tests run from `compiler/scripts/test-babel-ast.sh`.
