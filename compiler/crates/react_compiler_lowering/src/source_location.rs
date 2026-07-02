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

#[cfg(test)]
mod tests {
    use react_compiler_ast::common::BaseNode;
    use react_compiler_ast::common::Position as AstPosition;
    use react_compiler_ast::common::SourceLocation as AstSourceLocation;

    use super::convert_base_loc;

    #[test]
    fn convert_base_loc_keeps_start_end_offsets_separate_from_loc_index() {
        let base = BaseNode {
            node_type: Some("Identifier".to_string()),
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
            ..Default::default()
        };

        let loc = convert_base_loc(&base).unwrap();

        assert_eq!(loc.start.index, Some(70));
        assert_eq!(loc.end.index, Some(130));
        assert_eq!(loc.start_offset, Some(7));
        assert_eq!(loc.end_offset, Some(13));
    }
}
