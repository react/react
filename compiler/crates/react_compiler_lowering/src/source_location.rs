use react_compiler_ast::common::BaseNode;
use react_compiler_hir::Position;
use react_compiler_hir::SourceLocation;

// =============================================================================
// Source location conversion
// =============================================================================

pub(crate) fn convert_base_loc(base: &BaseNode) -> Option<SourceLocation> {
    base.loc.as_ref().map(|loc| SourceLocation {
        start: Position {
            line: loc.start.line,
            column: loc.start.column,
            index: loc.start.index,
        },
        end: Position {
            line: loc.end.line,
            column: loc.end.column,
            index: loc.end.index,
        },
        start_offset: base.start,
        end_offset: base.end,
    })
}
