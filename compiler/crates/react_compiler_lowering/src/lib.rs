pub mod build_hir;
pub mod find_context_identifiers;
pub mod hir_builder;
pub mod identifier_loc_index;

use react_compiler_ast::expressions::ArrowFunctionExpression;
use react_compiler_ast::expressions::FunctionExpression;
use react_compiler_ast::statements::FunctionDeclaration;
use react_compiler_hir::BindingKind;

/// Convert AST binding kind to HIR binding kind.
pub fn convert_binding_kind(kind: &react_compiler_ast::scope::BindingKind) -> BindingKind {
    match kind {
        react_compiler_ast::scope::BindingKind::Var => BindingKind::Var,
        react_compiler_ast::scope::BindingKind::Let => BindingKind::Let,
        react_compiler_ast::scope::BindingKind::Const => BindingKind::Const,
        react_compiler_ast::scope::BindingKind::Param => BindingKind::Param,
        react_compiler_ast::scope::BindingKind::Module => BindingKind::Module,
        react_compiler_ast::scope::BindingKind::Hoisted => BindingKind::Hoisted,
        react_compiler_ast::scope::BindingKind::Local => BindingKind::Local,
        react_compiler_ast::scope::BindingKind::Unknown => BindingKind::Unknown,
    }
}

/// Represents a reference to a function AST node for lowering.
/// Analogous to TS's `NodePath<t.Function>` / `BabelFn`.
pub enum FunctionNode<'a> {
    FunctionDeclaration(&'a FunctionDeclaration),
    FunctionExpression(&'a FunctionExpression),
    ArrowFunctionExpression(&'a ArrowFunctionExpression),
}

impl<'a> FunctionNode<'a> {
    /// Get the node_id of the function node. Panics if not set.
    pub fn node_id(&self) -> Option<u32> {
        match self {
            FunctionNode::FunctionDeclaration(d) => d.base.node_id,
            FunctionNode::FunctionExpression(e) => e.base.node_id,
            FunctionNode::ArrowFunctionExpression(a) => a.base.node_id,
        }
    }
}

// The main lower() function - delegates to build_hir
pub use build_hir::lower;
// Re-export post-build helper functions used by optimization passes
pub use hir_builder::{
    create_temporary_place, get_reverse_postordered_blocks, mark_instruction_ids,
    mark_predecessors, remove_dead_do_while_statements, remove_unnecessary_try_catch,
    remove_unreachable_for_updates,
};
pub use react_compiler_hir::visitors::each_terminal_successor;
pub use react_compiler_hir::visitors::terminal_fallthrough;
