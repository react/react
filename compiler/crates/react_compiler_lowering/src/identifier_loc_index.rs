//! Builds an index mapping identifier node-IDs to source locations.
//!
//! Walks the function's AST to collect `(node_id, start, SourceLocation, is_jsx)`
//! for every Identifier and JSXIdentifier node. Keyed by node_id for identity
//! lookups; each entry also stores `start` (byte offset) for range-containment
//! checks in `gather_captured_context`.

use std::collections::HashMap;

use react_compiler_ast::expressions::*;
use react_compiler_ast::jsx::JSXIdentifier;
use react_compiler_ast::jsx::JSXOpeningElement;
use react_compiler_ast::scope::ScopeId;
use react_compiler_ast::scope::ScopeInfo;
use react_compiler_ast::statements::FunctionDeclaration;
use react_compiler_ast::visitor::AstWalker;
use react_compiler_ast::visitor::Visitor;
use react_compiler_hir::SourceLocation;

use crate::FunctionNode;

/// Source location and whether the identifier is a JSXIdentifier.
pub struct IdentifierLocEntry {
    /// The byte offset of the identifier (base.start). Stored here so that
    /// callers iterating by node_id can still do position-range containment
    /// checks without a separate bridge map.
    pub start: u32,
    pub loc: SourceLocation,
    pub is_jsx: bool,
    /// For JSX identifiers that are the root name of a JSXOpeningElement,
    /// stores the JSXOpeningElement's loc (which spans the full tag).
    pub opening_element_loc: Option<SourceLocation>,
    /// True if this identifier is the name of a function/class declaration
    /// (not an expression reference). Used by `gather_captured_context` to
    /// skip non-expression positions, matching the TS behavior where the
    /// Expression visitor doesn't visit declaration names.
    pub is_declaration_name: bool,
    /// True if this identifier sits inside a type annotation subtree
    /// (TypeAnnotation/TSTypeAnnotation/TypeAlias/TSTypeAliasDeclaration).
    /// `gather_captured_context` skips these to match the TS
    /// gatherCapturedContext traverse, which skips those subtrees; the
    /// hoisting analysis and FindContextIdentifiers do NOT skip them in TS.
    pub in_type_annotation: bool,
}

/// Index mapping node_id → IdentifierLocEntry for all Identifier
/// and JSXIdentifier nodes in a function's AST.
pub type IdentifierLocIndex = HashMap<u32, IdentifierLocEntry>;

struct IdentifierLocVisitor {
    index: IdentifierLocIndex,
    /// Tracks the current JSXOpeningElement's loc while walking its name.
    current_opening_element_loc: Option<SourceLocation>,
}

fn convert_loc(loc: &react_compiler_ast::common::SourceLocation) -> SourceLocation {
    SourceLocation {
        start: react_compiler_hir::Position {
            line: loc.start.line,
            column: loc.start.column,
            index: loc.start.index,
        },
        end: react_compiler_hir::Position {
            line: loc.end.line,
            column: loc.end.column,
            index: loc.end.index,
        },
    }
}

impl IdentifierLocVisitor {
    fn insert_identifier(&mut self, node: &Identifier, is_declaration_name: bool) {
        if let (Some(nid), Some(start), Some(loc)) =
            (node.base.node_id, node.base.start, &node.base.loc)
        {
            self.index.insert(
                nid,
                IdentifierLocEntry {
                    start,
                    loc: convert_loc(loc),
                    is_jsx: false,
                    opening_element_loc: None,
                    is_declaration_name,
                    in_type_annotation: false,
                },
            );
        }
    }

    /// Recursively walk a serde_json::Value tree to find and index all Identifier
    /// and JSXIdentifier nodes. Used for class bodies which are stored as untyped
    /// JSON and not walked by the typed AstWalker. This matches the TS behavior
    /// where gatherCapturedContext's Babel traverse walks into class bodies.
    ///
    /// `in_annotation` is true once the walk has descended through a type
    /// annotation container node; identifiers found there are flagged so
    /// `gather_captured_context` can mirror TS's TypeAnnotation subtree skip.
    fn walk_json_for_identifiers(&mut self, value: &serde_json::Value, in_annotation: bool) {
        match value {
            serde_json::Value::Object(obj) => {
                let node_in_annotation = in_annotation
                    || matches!(
                        obj.get("type").and_then(|t| t.as_str()),
                        Some(
                            "TypeAnnotation"
                                | "TSTypeAnnotation"
                                | "TypeAlias"
                                | "TSTypeAliasDeclaration"
                        )
                    );
                if let Some(serde_json::Value::String(ty)) = obj.get("type") {
                    if ty == "Identifier" || ty == "JSXIdentifier" {
                        if let (Some(nid), Some(start)) = (
                            obj.get("_nodeId").and_then(|s| s.as_u64()),
                            obj.get("start").and_then(|s| s.as_u64()),
                        ) {
                            if let Some(loc) = Self::extract_loc_from_json(obj) {
                                let is_jsx = ty == "JSXIdentifier";
                                self.index.entry(nid as u32).or_insert(IdentifierLocEntry {
                                    start: start as u32,
                                    loc,
                                    is_jsx,
                                    opening_element_loc: None,
                                    is_declaration_name: false,
                                    in_type_annotation: node_in_annotation,
                                });
                            }
                        }
                    }
                }
                for (_, v) in obj {
                    self.walk_json_for_identifiers(v, node_in_annotation);
                }
            }
            serde_json::Value::Array(arr) => {
                for v in arr {
                    self.walk_json_for_identifiers(v, in_annotation);
                }
            }
            _ => {}
        }
    }

    fn extract_loc_from_json(
        obj: &serde_json::Map<String, serde_json::Value>,
    ) -> Option<SourceLocation> {
        let loc = obj.get("loc")?.as_object()?;
        let start = loc.get("start")?.as_object()?;
        let end = loc.get("end")?.as_object()?;
        Some(SourceLocation {
            start: react_compiler_hir::Position {
                line: start.get("line")?.as_u64()? as u32,
                column: start.get("column")?.as_u64()? as u32,
                index: start
                    .get("index")
                    .and_then(|i| i.as_u64())
                    .map(|i| i as u32),
            },
            end: react_compiler_hir::Position {
                line: end.get("line")?.as_u64()? as u32,
                column: end.get("column")?.as_u64()? as u32,
                index: end.get("index").and_then(|i| i.as_u64()).map(|i| i as u32),
            },
        })
    }
}

impl<'ast> Visitor<'ast> for IdentifierLocVisitor {
    fn enter_identifier(&mut self, node: &'ast Identifier, _scope_stack: &[ScopeId]) {
        self.insert_identifier(node, false);
    }

    fn enter_jsx_identifier(&mut self, node: &'ast JSXIdentifier, _scope_stack: &[ScopeId]) {
        if let (Some(nid), Some(start), Some(loc)) =
            (node.base.node_id, node.base.start, &node.base.loc)
        {
            self.index.insert(
                nid,
                IdentifierLocEntry {
                    start,
                    loc: convert_loc(loc),
                    is_jsx: true,
                    opening_element_loc: self.current_opening_element_loc.clone(),
                    is_declaration_name: false,
                    in_type_annotation: false,
                },
            );
        }
    }

    fn enter_jsx_opening_element(
        &mut self,
        node: &'ast JSXOpeningElement,
        _scope_stack: &[ScopeId],
    ) {
        self.current_opening_element_loc = node.base.loc.as_ref().map(|loc| convert_loc(loc));
    }

    fn leave_jsx_opening_element(
        &mut self,
        _node: &'ast JSXOpeningElement,
        _scope_stack: &[ScopeId],
    ) {
        self.current_opening_element_loc = None;
    }

    // Visit function/class declaration and expression name identifiers,
    // which are not walked by the generic walker (to avoid affecting
    // other Visitor consumers like find_context_identifiers).
    fn enter_function_declaration(
        &mut self,
        node: &'ast FunctionDeclaration,
        _scope_stack: &[ScopeId],
    ) {
        if let Some(id) = &node.id {
            self.insert_identifier(id, true);
        }
    }

    fn enter_function_expression(
        &mut self,
        node: &'ast FunctionExpression,
        _scope_stack: &[ScopeId],
    ) {
        if let Some(id) = &node.id {
            self.insert_identifier(id, true);
        }
    }

    fn enter_class_declaration(
        &mut self,
        node: &'ast react_compiler_ast::statements::ClassDeclaration,
        _scope_stack: &[ScopeId],
    ) {
        if let Some(id) = &node.id {
            self.insert_identifier(id, true);
        }
        // Walk class body JSON to index identifiers inside class methods.
        // The typed AstWalker skips class bodies (stored as Vec<serde_json::Value>),
        // but gatherCapturedContext in TS traverses them via Babel's traverse.
        for member in &node.body.body {
            self.walk_json_for_identifiers(&member.parse_value(), false);
        }
    }

    fn enter_class_expression(
        &mut self,
        node: &'ast react_compiler_ast::expressions::ClassExpression,
        _scope_stack: &[ScopeId],
    ) {
        if let Some(id) = &node.id {
            self.insert_identifier(id, true);
        }
        // Walk class body JSON to index identifiers inside class methods
        for member in &node.body.body {
            self.walk_json_for_identifiers(&member.parse_value(), false);
        }
    }
}

/// Build an index of all Identifier and JSXIdentifier positions in a function's AST.
pub fn build_identifier_loc_index(
    func: &FunctionNode<'_>,
    scope_info: &ScopeInfo,
) -> IdentifierLocIndex {
    let func_scope = scope_info
        .resolve_scope_for_node(func.node_id())
        .unwrap_or(scope_info.program_scope);

    let mut visitor = IdentifierLocVisitor {
        index: HashMap::new(),
        current_opening_element_loc: None,
    };
    let mut walker = AstWalker::with_initial_scope(scope_info, func_scope);

    // Visit the top-level function's own name identifier (if any),
    // since the walker only walks params + body, not the function node itself.
    match func {
        FunctionNode::FunctionDeclaration(d) => {
            if let Some(id) = &d.id {
                visitor.enter_identifier(id, &[]);
            }
            for param in &d.params {
                walker.walk_pattern(&mut visitor, param);
            }
            walker.walk_block_statement(&mut visitor, &d.body);
        }
        FunctionNode::FunctionExpression(e) => {
            if let Some(id) = &e.id {
                visitor.enter_identifier(id, &[]);
            }
            for param in &e.params {
                walker.walk_pattern(&mut visitor, param);
            }
            walker.walk_block_statement(&mut visitor, &e.body);
        }
        FunctionNode::ArrowFunctionExpression(a) => {
            for param in &a.params {
                walker.walk_pattern(&mut visitor, param);
            }
            match a.body.as_ref() {
                ArrowFunctionBody::BlockStatement(block) => {
                    walker.walk_block_statement(&mut visitor, block);
                }
                ArrowFunctionBody::Expression(expr) => {
                    walker.walk_expression(&mut visitor, expr);
                }
            }
        }
    }

    // Walk type annotations that the AST walker skips.
    // The walker skips TypeAlias, TSTypeAliasDeclaration, and similar statements,
    // but Babel's isReferencedIdentifier() returns true for identifiers inside them
    // (e.g., typeof x in `type T = ReturnType<typeof x>`). The TS compiler's
    // FindContextIdentifiers includes these via its Identifier visitor. We match by
    // serializing the function body to JSON and walking the full JSON tree.
    // The walk_json_for_identifiers method uses entry().or_insert() so it won't
    // overwrite entries already added by the typed walker above.
    let body_json: Option<serde_json::Value> = match func {
        FunctionNode::FunctionDeclaration(d) => serde_json::to_value(&d.body).ok(),
        FunctionNode::FunctionExpression(e) => serde_json::to_value(&e.body).ok(),
        FunctionNode::ArrowFunctionExpression(a) => serde_json::to_value(&a.body).ok(),
    };
    if let Some(json) = body_json {
        visitor.walk_json_for_identifiers(&json, false);
    }

    visitor.index
}
