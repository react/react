//! Preserve original AST node offsets independently of position indices.

use react_compiler_ast::common::BaseNode;
use react_compiler_hir::Position;
use react_compiler_hir::SourceLocation;

/// Converts a node's location without deriving offsets from position indices.
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

#[cfg(test)]
mod tests {
    use react_compiler_ast::common::BaseNode;
    use react_compiler_ast::common::Position as AstPosition;
    use react_compiler_ast::common::SourceLocation as AstSourceLocation;

    use super::convert_base_loc;

    fn source_node() -> BaseNode {
        BaseNode {
            start: Some(7),
            end: Some(13),
            loc: Some(AstSourceLocation {
                start: AstPosition {
                    line: 1,
                    column: 2,
                    index: Some(70),
                },
                end: AstPosition {
                    line: 1,
                    column: 8,
                    index: Some(130),
                },
                filename: None,
                identifier_name: None,
            }),
            ..BaseNode::typed("Identifier")
        }
    }

    #[test]
    fn convert_base_loc_keeps_start_end_offsets_separate_from_loc_index() {
        let base = source_node();
        let loc = convert_base_loc(&base).expect("original source location");

        assert_eq!((loc.start.index, loc.end.index), (Some(70), Some(130)));
        assert_eq!((loc.start_offset, loc.end_offset), (Some(7), Some(13)));
    }

    #[test]
    fn convert_base_loc_does_not_infer_missing_offsets_from_indices() {
        let mut base = source_node();
        base.start = None;
        base.end = None;
        let loc = convert_base_loc(&base).expect("location survives missing offsets");

        assert_eq!((loc.start.index, loc.end.index), (Some(70), Some(130)));
        assert_eq!((loc.start_offset, loc.end_offset), (None, None));
    }

    #[test]
    fn convert_base_loc_does_not_infer_missing_location_from_offsets() {
        let mut base = source_node();
        base.loc = None;

        assert_eq!(convert_base_loc(&base), None);
    }
}
