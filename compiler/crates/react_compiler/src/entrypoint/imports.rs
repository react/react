/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
use rustc_hash::{FxHashMap, FxHashSet};

use react_compiler_ast::common::{BaseNode, Comment};
use react_compiler_ast::declarations::{
    ImportDeclaration, ImportKind, ImportSpecifier, ImportSpecifierData, ModuleExportName,
};
use react_compiler_ast::expressions::{CallExpression, Expression, Identifier};
use react_compiler_ast::literals::StringLiteral;
use react_compiler_ast::patterns::{
    ObjectPattern, ObjectPatternProp, ObjectPatternProperty, PatternLike,
};
use react_compiler_ast::scope::ScopeInfo;
use react_compiler_ast::statements::{
    Statement, VariableDeclaration, VariableDeclarationKind, VariableDeclarator,
};
use react_compiler_ast::{Program, SourceType};
use react_compiler_diagnostics::{
    CompilerError, CompilerErrorDetail, ErrorCategory, Position, SourceLocation,
};

use super::compile_result::{DebugLogEntry, LoggerEvent, OrderedLogItem};
use super::plugin_options::{CompilerTarget, PluginOptions};
use super::suppression::SuppressionRange;
use crate::timing::TimingData;

/// An import specifier tracked by ProgramContext.
/// Corresponds to NonLocalImportSpecifier in the TS compiler.
#[derive(Debug, Clone)]
pub struct NonLocalImportSpecifier {
    pub name: String,
    pub module: String,
    pub imported: String,
}

/// Context for the program being compiled.
/// Tracks compiled functions, generated names, and import requirements.
/// Equivalent to ProgramContext class in Imports.ts.
pub struct ProgramContext {
    pub opts: PluginOptions,
    pub filename: Option<String>,
    /// The source filename from the parser's sourceFilename option.
    /// This is the filename stored on AST node `loc.filename` fields,
    /// which may differ from `filename` (e.g., no path prefix).
    source_filename: Option<String>,
    pub code: Option<String>,
    pub react_runtime_module: String,
    pub suppressions: Vec<SuppressionRange>,
    pub has_module_scope_opt_out: bool,
    pub events: Vec<LoggerEvent>,
    /// Unified ordered log that interleaves events and debug entries
    /// in the order they were emitted during compilation.
    pub ordered_log: Vec<OrderedLogItem>,

    // Pre-resolved import local names for codegen
    pub instrument_fn_name: Option<String>,
    pub instrument_gating_name: Option<String>,
    pub hook_guard_name: Option<String>,

    // Variable renames from lowering, to be applied back to the Babel AST
    pub renames: Vec<react_compiler_hir::environment::BindingRename>,

    /// Timing data for profiling. Accumulates across all function compilations.
    pub timing: TimingData,

    /// Whether debug logging is enabled (HIR formatting after each pass).
    pub debug_enabled: bool,

    // Internal state
    already_compiled: FxHashSet<u32>,
    known_referenced_names: FxHashSet<String>,
    imports: FxHashMap<String, FxHashMap<String, NonLocalImportSpecifier>>,
}

impl ProgramContext {
    pub fn new(
        opts: PluginOptions,
        filename: Option<String>,
        code: Option<String>,
        suppressions: Vec<SuppressionRange>,
        has_module_scope_opt_out: bool,
    ) -> Self {
        let react_runtime_module = get_react_compiler_runtime_module(&opts.target);
        let profiling = opts.profiling;
        let debug_enabled = opts.debug;
        Self {
            opts,
            filename,
            source_filename: None,
            code,
            react_runtime_module,
            suppressions,
            has_module_scope_opt_out,
            events: Vec::new(),
            ordered_log: Vec::new(),
            instrument_fn_name: None,
            instrument_gating_name: None,
            hook_guard_name: None,
            renames: Vec::new(),
            timing: TimingData::new(profiling),
            debug_enabled,
            already_compiled: FxHashSet::default(),
            known_referenced_names: FxHashSet::default(),
            imports: FxHashMap::default(),
        }
    }

    /// Set the source filename (from AST node loc.filename).
    pub fn set_source_filename(&mut self, filename: Option<String>) {
        if self.source_filename.is_none() {
            self.source_filename = filename;
        }
    }

    /// Get the source filename for logger events.
    pub fn source_filename(&self) -> Option<String> {
        self.source_filename.clone()
    }

    /// Check if a function at the given start position has already been compiled.
    /// This is a workaround for Babel not consistently respecting skip().
    pub fn is_already_compiled(&self, start: u32) -> bool {
        self.already_compiled.contains(&start)
    }

    /// Mark a function at the given start position as compiled.
    pub fn mark_compiled(&mut self, start: u32) {
        self.already_compiled.insert(start);
    }

    /// Initialize known referenced names from scope bindings.
    /// Call this after construction to seed conflict detection with program scope bindings.
    pub fn init_from_scope(&mut self, scope: &ScopeInfo) {
        // Register ALL bindings (not just program-scope) so that UID generation
        // avoids name conflicts with any binding in the file. This matches
        // Babel's generateUid() which checks all scopes.
        for binding in &scope.bindings {
            self.known_referenced_names.insert(binding.name.clone());
        }
    }

    /// Check if a name conflicts with known references.
    pub fn has_reference(&self, name: &str) -> bool {
        self.known_referenced_names.contains(name)
    }

    /// Generate a unique identifier name that doesn't conflict with existing bindings.
    ///
    /// For hook names (use*), preserves the original name to avoid breaking
    /// hook-name-based type inference. For other names, prefixes with underscore
    /// similar to Babel's generateUid.
    pub fn new_uid(&mut self, name: &str) -> String {
        if is_hook_name(name) {
            // Don't prefix hooks with underscore, since InferTypes might
            // type HookKind based on callee naming convention.
            let mut uid = name.to_string();
            let mut i = 0;
            while self.has_reference(&uid) {
                uid = format!("{}_{}", name, i);
                i += 1;
            }
            self.known_referenced_names.insert(uid.clone());
            uid
        } else if !self.has_reference(name) {
            self.known_referenced_names.insert(name.to_string());
            name.to_string()
        } else {
            // Generate unique name with underscore prefix (similar to Babel's generateUid).
            // Babel strips leading underscores before prefixing, so:
            //   generateUid("_c") → strips to "c" → generates "_c", "_c2", "_c3", ...
            //   generateUid("foo") → generates "_foo", "_foo2", "_foo3", ...
            let base = name.trim_start_matches('_');
            let mut uid = format!("_{}", base);
            let mut i = 2;
            while self.has_reference(&uid) {
                uid = format!("_{}{}", base, i);
                i += 1;
            }
            self.known_referenced_names.insert(uid.clone());
            uid
        }
    }

    /// Add the memo cache import (the `c` function from the compiler runtime).
    pub fn add_memo_cache_import(&mut self) -> NonLocalImportSpecifier {
        let module = self.react_runtime_module.clone();
        self.add_import_specifier(&module, "c", Some("_c"))
    }

    /// Add an import specifier, reusing an existing one if it was already added.
    ///
    /// If `name_hint` is provided, it will be used as the basis for the local
    /// name; otherwise `specifier` is used.
    pub fn add_import_specifier(
        &mut self,
        module: &str,
        specifier: &str,
        name_hint: Option<&str>,
    ) -> NonLocalImportSpecifier {
        // Check if already imported
        if let Some(module_imports) = self.imports.get(module) {
            if let Some(existing) = module_imports.get(specifier) {
                return existing.clone();
            }
        }

        let name = self.new_uid(name_hint.unwrap_or(specifier));
        let binding = NonLocalImportSpecifier {
            name,
            module: module.to_string(),
            imported: specifier.to_string(),
        };

        self.imports
            .entry(module.to_string())
            .or_default()
            .insert(specifier.to_string(), binding.clone());

        binding
    }

    /// Register a name as referenced so future uid generation avoids it.
    pub fn add_new_reference(&mut self, name: String) {
        self.known_referenced_names.insert(name);
    }

    /// Get the set of known referenced names for seeding per-function Environment UID generation.
    pub fn known_referenced_names(&self) -> &FxHashSet<String> {
        &self.known_referenced_names
    }

    /// Merge UID names generated during a function compilation back into the program context,
    /// so subsequent function compilations avoid collisions.
    pub fn merge_uid_known_names(&mut self, names: &FxHashSet<String>) {
        self.known_referenced_names.extend(names.iter().cloned());
    }

    /// Log a compilation event.
    pub fn log_event(&mut self, event: LoggerEvent) {
        self.ordered_log.push(OrderedLogItem::Event {
            event: event.clone(),
        });
        self.events.push(event);
    }

    /// Log a debug entry (for debugLogIRs support).
    pub fn log_debug(&mut self, entry: DebugLogEntry) {
        self.ordered_log.push(OrderedLogItem::Debug { entry });
    }

    /// Check if there are any pending imports to add to the program.
    pub fn has_pending_imports(&self) -> bool {
        !self.imports.is_empty()
    }

    /// Get an immutable view of the generated imports.
    pub fn imports(&self) -> &FxHashMap<String, FxHashMap<String, NonLocalImportSpecifier>> {
        &self.imports
    }
}

/// Check for blocklisted import modules.
/// Returns a CompilerError if any blocklisted imports are found.
pub fn validate_restricted_imports(
    program: &Program,
    blocklisted: &Option<Vec<String>>,
) -> Option<CompilerError> {
    let blocklisted = match blocklisted {
        Some(b) if !b.is_empty() => b,
        _ => return None,
    };
    let restricted: FxHashSet<&str> = blocklisted.iter().map(|s| s.as_str()).collect();
    let mut error = CompilerError::new();

    for stmt in &program.body {
        if let Statement::ImportDeclaration(import) = stmt {
            if import
                .source
                .value
                .as_str()
                .is_some_and(|v| restricted.contains(v))
            {
                let mut detail = CompilerErrorDetail::new(
                    ErrorCategory::Todo,
                    "Bailing out due to blocklisted import",
                )
                .with_description(format!("Import from module {}", import.source.value));
                detail.loc = import.base.loc.as_ref().map(|loc| SourceLocation {
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
                });
                error.push_error_detail(detail);
            }
        }
    }

    if error.has_any_errors() {
        Some(error)
    } else {
        None
    }
}

/// Insert import declarations into the program body.
/// Handles both ESM imports and CommonJS require.
///
/// For existing imports of the same module (non-namespaced, value imports),
/// new specifiers are merged into the existing declaration. Otherwise,
/// new import/require statements are prepended to the program body.
pub fn add_imports_to_program(program: &mut Program, context: &ProgramContext) {
    if context.imports.is_empty() {
        return;
    }

    // Collect existing non-namespaced imports by module name
    let existing_import_indices: FxHashMap<String, usize> = program
        .body
        .iter()
        .enumerate()
        .filter_map(|(idx, stmt)| {
            if let Statement::ImportDeclaration(import) = stmt {
                if is_non_namespaced_import(import) {
                    return Some((import.source.value.to_marker_string(), idx));
                }
            }
            None
        })
        .collect();

    let mut stmts: Vec<Statement> = Vec::new();
    let mut sorted_modules: Vec<_> = context.imports.iter().collect();
    sorted_modules.sort_by(|(a, _), (b, _)| a.to_lowercase().cmp(&b.to_lowercase()));

    for (module_name, imports_map) in sorted_modules {
        let sorted_imports = {
            let mut sorted: Vec<_> = imports_map.values().collect();
            sorted.sort_by_key(|s| &s.imported);
            sorted
        };

        let import_specifiers: Vec<ImportSpecifier> = sorted_imports
            .iter()
            .map(|spec| make_import_specifier(spec))
            .collect();

        // If an existing import of this module exists, merge into it
        if let Some(&idx) = existing_import_indices.get(module_name.as_str()) {
            if let Statement::ImportDeclaration(ref mut import) = program.body[idx] {
                import.specifiers.extend(import_specifiers);
            }
        } else if matches!(program.source_type, SourceType::Module) {
            // ESM: import { ... } from 'module'
            stmts.push(Statement::ImportDeclaration(ImportDeclaration {
                base: BaseNode::typed("ImportDeclaration"),
                specifiers: import_specifiers,
                source: StringLiteral {
                    base: BaseNode::typed("StringLiteral"),
                    value: module_name.clone().into(),
                },
                import_kind: None,
                assertions: None,
                attributes: None,
            }));
        } else {
            // CommonJS: const { imported: local, ... } = require('module')
            let properties: Vec<ObjectPatternProperty> = sorted_imports
                .iter()
                .map(|spec| {
                    ObjectPatternProperty::ObjectProperty(ObjectPatternProp {
                        base: BaseNode::typed("ObjectProperty"),
                        key: Box::new(Expression::Identifier(Identifier {
                            base: BaseNode::typed("Identifier"),
                            name: spec.imported.clone(),
                            type_annotation: None,
                            optional: None,
                            decorators: None,
                        })),
                        value: Box::new(PatternLike::Identifier(Identifier {
                            base: BaseNode::typed("Identifier"),
                            name: spec.name.clone(),
                            type_annotation: None,
                            optional: None,
                            decorators: None,
                        })),
                        computed: false,
                        shorthand: false,
                        decorators: None,
                        method: None,
                    })
                })
                .collect();

            stmts.push(Statement::VariableDeclaration(VariableDeclaration {
                base: BaseNode::typed("VariableDeclaration"),
                kind: VariableDeclarationKind::Const,
                declarations: vec![VariableDeclarator {
                    base: BaseNode::typed("VariableDeclarator"),
                    id: PatternLike::ObjectPattern(ObjectPattern {
                        base: BaseNode::typed("ObjectPattern"),
                        properties,
                        type_annotation: None,
                        decorators: None,
                    }),
                    init: Some(Box::new(Expression::CallExpression(CallExpression {
                        base: BaseNode::typed("CallExpression"),
                        callee: Box::new(Expression::Identifier(Identifier {
                            base: BaseNode::typed("Identifier"),
                            name: "require".to_string(),
                            type_annotation: None,
                            optional: None,
                            decorators: None,
                        })),
                        arguments: vec![Expression::StringLiteral(StringLiteral {
                            base: BaseNode::typed("StringLiteral"),
                            value: module_name.clone().into(),
                        })],
                        type_parameters: None,
                        type_arguments: None,
                        optional: None,
                    }))),
                    definite: None,
                }],
                declare: None,
            }));
        }
    }

    // Prepend new import statements to the program body
    if !stmts.is_empty() {
        if let Some(first_statement) = program.body.first_mut() {
            // Downstream JSX transforms only read pragmas before the first statement.
            // Keep other annotations attached to their original statement.
            let pragmas = first_statement.take_leading_comments_if(is_jsx_pragma);
            let base = match &mut stmts[0] {
                Statement::ImportDeclaration(s) => &mut s.base,
                Statement::VariableDeclaration(s) => &mut s.base,
                _ => unreachable!("generated imports are import or require declarations"),
            };
            base.leading_comments = Some(pragmas);
        }
        let mut new_body = stmts;
        new_body.append(&mut program.body);
        program.body = new_body;
    }
}

fn is_jsx_pragma(comment: &Comment) -> bool {
    let (Comment::CommentBlock(data) | Comment::CommentLine(data)) = comment;
    // Match /@jsx(?:ImportSource|Runtime|Frag)?\s/ in Imports.ts, including JS whitespace.
    data.value.match_indices("@jsx").any(|(index, _)| {
        ["ImportSource", "Runtime", "Frag", ""]
            .iter()
            .any(|suffix| {
                data.value[index + 4..]
                    .strip_prefix(suffix)
                    .is_some_and(|rest| {
                        rest.starts_with(|c| {
                            matches!(c,
                                '\u{9}'..='\u{d}' | ' ' | '\u{a0}' | '\u{1680}' |
                                '\u{2000}'..='\u{200a}' | '\u{2028}' | '\u{2029}' |
                                '\u{202f}' | '\u{205f}' | '\u{3000}' | '\u{feff}'
                            )
                        })
                    })
            })
    })
}

/// Create an ImportSpecifier AST node from a NonLocalImportSpecifier.
fn make_import_specifier(spec: &NonLocalImportSpecifier) -> ImportSpecifier {
    ImportSpecifier::ImportSpecifier(ImportSpecifierData {
        base: BaseNode::typed("ImportSpecifier"),
        local: Identifier {
            base: BaseNode::typed("Identifier"),
            name: spec.name.clone(),
            type_annotation: None,
            optional: None,
            decorators: None,
        },
        imported: ModuleExportName::Identifier(Identifier {
            base: BaseNode::typed("Identifier"),
            name: spec.imported.clone(),
            type_annotation: None,
            optional: None,
            decorators: None,
        }),
        import_kind: None,
    })
}

/// Check if an import declaration is a non-namespaced value import.
/// Matches `import { ... } from 'module'` but NOT:
///   - `import * as Foo from 'module'` (namespace)
///   - `import type { Foo } from 'module'` (type import)
///   - `import typeof { Foo } from 'module'` (typeof import)
fn is_non_namespaced_import(import: &ImportDeclaration) -> bool {
    import
        .specifiers
        .iter()
        .all(|s| matches!(s, ImportSpecifier::ImportSpecifier(_)))
        && import
            .import_kind
            .as_ref()
            .map_or(true, |k| matches!(k, ImportKind::Value))
}

/// Check if a name follows the React hook naming convention (use[A-Z0-9]...).
fn is_hook_name(name: &str) -> bool {
    let bytes = name.as_bytes();
    bytes.len() >= 4
        && bytes[0] == b'u'
        && bytes[1] == b's'
        && bytes[2] == b'e'
        && bytes
            .get(3)
            .map_or(false, |c| c.is_ascii_uppercase() || c.is_ascii_digit())
}

/// Get the runtime module name based on the compiler target.
pub fn get_react_compiler_runtime_module(target: &CompilerTarget) -> String {
    match target {
        CompilerTarget::Version(v) if v == "19" => "react/compiler-runtime".to_string(),
        CompilerTarget::Version(v) if v == "17" || v == "18" => {
            "react-compiler-runtime".to_string()
        }
        CompilerTarget::MetaInternal { runtime_module, .. } => runtime_module.clone(),
        // Default to React 19 runtime for unrecognized versions
        CompilerTarget::Version(_) => "react/compiler-runtime".to_string(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn preserves_jsx_pragmas_before_generated_imports() {
        let pragmas = json!([
            {"type": "CommentBlock", "value": "* @jsxImportSource custom-jsx "},
            {"type": "CommentLine", "value": " @jsxRuntime\tautomatic"},
            {"type": "CommentBlock", "value": "* @jsx customJsx "},
            {"type": "CommentBlock", "value": "* @jsxFrag\u{feff}CustomFragment "}
        ]);
        let annotations = json!([
            {"type": "CommentLine", "value": " Keep this annotation with the statement."},
            {"type": "CommentBlock", "value": " @jsxImportSourceSuffix custom-jsx "},
            {"type": "CommentBlock", "value": " @jsx"},
            {"type": "CommentBlock", "value": " @jsx\u{85}customJsx "}
        ]);
        for source_type in ["module", "script"] {
            for statement in [
                json!({"type": "EmptyStatement"}),
                json!({"type": "ExportDefaultDeclaration", "declaration": {"type": "Identifier", "name": "Component"}}),
                json!({"type": "TSNamespaceExportDeclaration", "id": {"type": "Identifier", "name": "Library"}}),
                json!({"type": "ImportDeclaration", "specifiers": [], "source": {"type": "StringLiteral", "value": "react/compiler-runtime"}}),
            ] {
                let mut statement = statement;
                let comments: Vec<_> = pragmas
                    .as_array()
                    .unwrap()
                    .iter()
                    .zip(annotations.as_array().unwrap())
                    .flat_map(|(a, b)| [a.clone(), b.clone()])
                    .collect();
                statement["leadingComments"] = json!(comments);
                let mut program: Program = serde_json::from_value(json!({
                    "type": "Program", "sourceType": source_type, "body": [statement]
                }))
                .unwrap();
                let opts = serde_json::from_value(json!({
                    "shouldCompile": true, "enableReanimated": false, "isDev": false
                }))
                .unwrap();
                let mut context = ProgramContext::new(opts, None, None, vec![], false);
                let original = serde_json::to_value(&program).unwrap();
                add_imports_to_program(&mut program, &context);
                assert_eq!(serde_json::to_value(&program).unwrap(), original);
                context.add_memo_cache_import();
                add_imports_to_program(&mut program, &context);
                let output = serde_json::to_value(&program).unwrap();
                if statement["type"] == "ImportDeclaration" {
                    assert_eq!(output["body"][0]["leadingComments"], json!(comments));
                    assert_eq!(program.body.len(), 1);
                } else {
                    assert_eq!(output["body"][0]["leadingComments"], pragmas);
                    assert_eq!(output["body"][1]["leadingComments"], annotations);
                    let mut expected = statement.clone();
                    expected["leadingComments"] = annotations.clone();
                    assert_eq!(
                        output["body"][1],
                        serde_json::to_value(
                            serde_json::from_value::<Statement>(expected).unwrap()
                        )
                        .unwrap()
                    );
                }
            }
        }
    }
}
