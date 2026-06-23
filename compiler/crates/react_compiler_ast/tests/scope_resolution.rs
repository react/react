use std::path::PathBuf;

use react_compiler_ast::declarations::*;
use react_compiler_ast::expressions::*;
use react_compiler_ast::jsx::*;
use react_compiler_ast::patterns::*;
use react_compiler_ast::scope::ScopeInfo;
use react_compiler_ast::statements::*;

fn get_fixture_json_dir() -> PathBuf {
    if let Ok(dir) = std::env::var("FIXTURE_JSON_DIR") {
        return PathBuf::from(dir);
    }
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("tests/fixtures")
}

/// Recursively sort all keys in a JSON value for order-independent comparison.
fn normalize_json(value: &serde_json::Value) -> serde_json::Value {
    match value {
        serde_json::Value::Object(map) => {
            let mut sorted: Vec<(String, serde_json::Value)> = map
                .iter()
                .map(|(k, v)| (k.clone(), normalize_json(v)))
                .collect();
            sorted.sort_by(|a, b| a.0.cmp(&b.0));
            serde_json::Value::Object(sorted.into_iter().collect())
        }
        serde_json::Value::Array(arr) => {
            serde_json::Value::Array(arr.iter().map(normalize_json).collect())
        }
        serde_json::Value::Number(n) => {
            if let Some(f) = n.as_f64() {
                if f.fract() == 0.0 && f.is_finite() && f.abs() < (i64::MAX as f64) {
                    serde_json::Value::Number(serde_json::Number::from(f as i64))
                } else {
                    value.clone()
                }
            } else {
                value.clone()
            }
        }
        other => other.clone(),
    }
}

fn compute_diff(original: &str, round_tripped: &str) -> String {
    use similar::ChangeTag;
    use similar::TextDiff;
    let diff = TextDiff::from_lines(original, round_tripped);
    let mut output = String::new();
    let mut lines_written = 0;
    const MAX_DIFF_LINES: usize = 50;
    for change in diff.iter_all_changes() {
        if lines_written >= MAX_DIFF_LINES {
            output.push_str("... (diff truncated)\n");
            break;
        }
        let sign = match change.tag() {
            ChangeTag::Delete => "-",
            ChangeTag::Insert => "+",
            ChangeTag::Equal => continue,
        };
        output.push_str(&format!("{sign} {change}"));
        lines_written += 1;
    }
    output
}

#[test]
fn scope_info_round_trip() {
    let json_dir = get_fixture_json_dir();
    let mut failures: Vec<(String, String)> = Vec::new();
    let mut total = 0;
    let mut passed = 0;
    let mut skipped = 0;

    for entry in walkdir::WalkDir::new(&json_dir)
        .into_iter()
        .filter_map(|e| e.ok())
        .filter(|e| {
            e.path().extension().is_some_and(|ext| ext == "json")
                && !e.path().to_string_lossy().contains(".scope.")
                && !e.path().to_string_lossy().contains(".renamed.")
        })
    {
        let ast_path_str = entry.path().to_string_lossy().to_string();
        let scope_path_str = ast_path_str.replace(".json", ".scope.json");
        let scope_path = std::path::Path::new(&scope_path_str);

        if !scope_path.exists() {
            skipped += 1;
            continue;
        }

        let fixture_name = entry
            .path()
            .strip_prefix(&json_dir)
            .unwrap()
            .display()
            .to_string();
        total += 1;

        let scope_json = std::fs::read_to_string(scope_path).unwrap();

        let scope_info: react_compiler_ast::scope::ScopeInfo =
            match serde_json::from_str(&scope_json) {
                Ok(info) => info,
                Err(e) => {
                    failures.push((fixture_name, format!("Scope deserialization error: {e}")));
                    continue;
                }
            };

        let round_tripped = serde_json::to_string_pretty(&scope_info).unwrap();
        let original_value: serde_json::Value = serde_json::from_str(&scope_json).unwrap();
        let round_tripped_value: serde_json::Value = serde_json::from_str(&round_tripped).unwrap();

        let original_normalized = normalize_json(&original_value);
        let round_tripped_normalized = normalize_json(&round_tripped_value);

        if original_normalized != round_tripped_normalized {
            let orig_str = serde_json::to_string_pretty(&original_normalized).unwrap();
            let rt_str = serde_json::to_string_pretty(&round_tripped_normalized).unwrap();
            let diff = compute_diff(&orig_str, &rt_str);
            failures.push((fixture_name, format!("Round-trip mismatch:\n{diff}")));
            continue;
        }

        let mut consistency_error = None;

        for binding in &scope_info.bindings {
            if binding.scope.0 as usize >= scope_info.scopes.len() {
                consistency_error = Some(format!(
                    "Binding {} has scope {} but only {} scopes exist",
                    binding.name,
                    binding.scope.0,
                    scope_info.scopes.len()
                ));
                break;
            }
        }

        if consistency_error.is_none() {
            for scope in &scope_info.scopes {
                for (name, &bid) in &scope.bindings {
                    if bid.0 as usize >= scope_info.bindings.len() {
                        consistency_error = Some(format!(
                            "Scope {} has binding '{}' with id {} but only {} bindings exist",
                            scope.id.0,
                            name,
                            bid.0,
                            scope_info.bindings.len()
                        ));
                        break;
                    }
                }
                if consistency_error.is_some() {
                    break;
                }
                if let Some(parent) = scope.parent {
                    if parent.0 as usize >= scope_info.scopes.len() {
                        consistency_error = Some(format!(
                            "Scope {} has parent {} but only {} scopes exist",
                            scope.id.0,
                            parent.0,
                            scope_info.scopes.len()
                        ));
                        break;
                    }
                }
            }
        }

        if consistency_error.is_none() {
            for (&_offset, &bid) in &scope_info.reference_to_binding {
                if bid.0 as usize >= scope_info.bindings.len() {
                    consistency_error = Some(format!(
                        "reference_to_binding has binding id {} but only {} bindings exist",
                        bid.0,
                        scope_info.bindings.len()
                    ));
                    break;
                }
            }
        }

        if consistency_error.is_none() {
            for (&_offset, &sid) in &scope_info.node_to_scope {
                if sid.0 as usize >= scope_info.scopes.len() {
                    consistency_error = Some(format!(
                        "node_to_scope has scope id {} but only {} scopes exist",
                        sid.0,
                        scope_info.scopes.len()
                    ));
                    break;
                }
            }
        }

        // Validate node-ID maps
        if consistency_error.is_none() {
            for (&_nid, &bid) in &scope_info.ref_node_id_to_binding {
                if bid.0 as usize >= scope_info.bindings.len() {
                    consistency_error = Some(format!(
                        "ref_node_id_to_binding has binding id {} but only {} bindings exist",
                        bid.0,
                        scope_info.bindings.len()
                    ));
                    break;
                }
            }
        }

        if consistency_error.is_none() {
            for (&_nid, &sid) in &scope_info.node_id_to_scope {
                if sid.0 as usize >= scope_info.scopes.len() {
                    consistency_error = Some(format!(
                        "node_id_to_scope has scope id {} but only {} scopes exist",
                        sid.0,
                        scope_info.scopes.len()
                    ));
                    break;
                }
            }
        }

        if let Some(err) = consistency_error {
            failures.push((fixture_name, format!("Consistency error: {err}")));
            continue;
        }

        passed += 1;
    }

    println!(
        "\n{passed}/{total} fixtures passed scope info round-trip ({skipped} skipped - no scope.json)"
    );

    if !failures.is_empty() {
        let show_count = failures.len().min(5);
        let mut msg = format!(
            "\n{} of {total} fixtures failed scope info test (showing first {show_count}):\n\n",
            failures.len()
        );
        for (name, err) in failures.iter().take(show_count) {
            msg.push_str(&format!("--- {name} ---\n{err}\n\n"));
        }
        if failures.len() > show_count {
            msg.push_str(&format!(
                "... and {} more failures\n",
                failures.len() - show_count
            ));
        }
        panic!("{msg}");
    }
}

// ============================================================================
// Typed AST traversal for identifier renaming
// ============================================================================

/// Rename an Identifier if it has a binding in ref_node_id_to_binding.
/// Uses the declaring scope from the binding table — no scope stack needed.
fn rename_id(id: &mut Identifier, si: &ScopeInfo) {
    if let Some(nid) = id.base.node_id {
        if let Some(bid) = si.resolve_reference_by_node_id(nid) {
            let scope = si.bindings[bid.0 as usize].scope.0;
            id.name = format!("{}_{}", id.name, format_args!("{scope}_{}", bid.0));
        }
    }
    visit_json_opt(&mut id.type_annotation, si);
    if let Some(decorators) = &mut id.decorators {
        visit_json_vec(decorators, si);
    }
}

/// Fallback walker for serde_json::Value fields (class bodies, type annotations, decorators, etc.)
fn visit_json(val: &mut serde_json::Value, si: &ScopeInfo) {
    match val {
        serde_json::Value::Object(map) => {
            if map.get("type").and_then(|v| v.as_str()) == Some("Identifier") {
                if let Some(nid) = map.get("_nodeId").and_then(|v| v.as_u64()) {
                    if let Some(bid) = si.resolve_reference_by_node_id(nid as u32) {
                        let scope = si.bindings[bid.0 as usize].scope.0;
                        if let Some(name) = map
                            .get("name")
                            .and_then(|v| v.as_str())
                            .map(|s| s.to_string())
                        {
                            map.insert(
                                "name".to_string(),
                                serde_json::Value::String(format!("{name}_{scope}_{}", bid.0)),
                            );
                        }
                    }
                }
            }
            let keys: Vec<String> = map.keys().cloned().collect();
            for key in keys {
                if let Some(child) = map.get_mut(&key) {
                    visit_json(child, si);
                }
            }
        }
        serde_json::Value::Array(arr) => {
            for item in arr.iter_mut() {
                visit_json(item, si);
            }
        }
        _ => {}
    }
}

fn visit_raw(val: &mut react_compiler_ast::common::RawNode, si: &ScopeInfo) {
    let mut v = val.parse_value();
    visit_json(&mut v, si);
    *val = react_compiler_ast::common::RawNode::from_value(&v);
}

fn visit_json_vec(vals: &mut [react_compiler_ast::common::RawNode], si: &ScopeInfo) {
    for val in vals.iter_mut() {
        visit_raw(val, si);
    }
}

fn visit_json_opt(val: &mut Option<react_compiler_ast::common::RawNode>, si: &ScopeInfo) {
    if let Some(v) = val {
        visit_raw(v, si);
    }
}

fn rename_identifiers(file: &mut react_compiler_ast::File, si: &ScopeInfo) {
    visit_program(&mut file.program, si);
}

fn visit_program(prog: &mut react_compiler_ast::Program, si: &ScopeInfo) {
    for stmt in &mut prog.body {
        visit_stmt(stmt, si);
    }
}

fn visit_block(block: &mut BlockStatement, si: &ScopeInfo) {
    for stmt in &mut block.body {
        visit_stmt(stmt, si);
    }
}

fn visit_stmt(stmt: &mut Statement, si: &ScopeInfo) {
    match stmt {
        Statement::BlockStatement(s) => visit_block(s, si),
        Statement::ReturnStatement(s) => {
            if let Some(arg) = &mut s.argument {
                visit_expr(arg, si);
            }
        }
        Statement::ExpressionStatement(s) => visit_expr(&mut s.expression, si),
        Statement::IfStatement(s) => {
            visit_expr(&mut s.test, si);
            visit_stmt(&mut s.consequent, si);
            if let Some(alt) = &mut s.alternate {
                visit_stmt(alt, si);
            }
        }
        Statement::ForStatement(s) => {
            if let Some(init) = &mut s.init {
                match init.as_mut() {
                    ForInit::VariableDeclaration(d) => visit_var_decl(d, si),
                    ForInit::Expression(e) => visit_expr(e, si),
                }
            }
            if let Some(test) = &mut s.test {
                visit_expr(test, si);
            }
            if let Some(update) = &mut s.update {
                visit_expr(update, si);
            }
            visit_stmt(&mut s.body, si);
        }
        Statement::WhileStatement(s) => {
            visit_expr(&mut s.test, si);
            visit_stmt(&mut s.body, si);
        }
        Statement::DoWhileStatement(s) => {
            visit_stmt(&mut s.body, si);
            visit_expr(&mut s.test, si);
        }
        Statement::ForInStatement(s) => {
            visit_for_left(&mut s.left, si);
            visit_expr(&mut s.right, si);
            visit_stmt(&mut s.body, si);
        }
        Statement::ForOfStatement(s) => {
            visit_for_left(&mut s.left, si);
            visit_expr(&mut s.right, si);
            visit_stmt(&mut s.body, si);
        }
        Statement::SwitchStatement(s) => {
            visit_expr(&mut s.discriminant, si);
            for case in &mut s.cases {
                if let Some(test) = &mut case.test {
                    visit_expr(test, si);
                }
                for child in &mut case.consequent {
                    visit_stmt(child, si);
                }
            }
        }
        Statement::ThrowStatement(s) => visit_expr(&mut s.argument, si),
        Statement::TryStatement(s) => {
            visit_block(&mut s.block, si);
            if let Some(handler) = &mut s.handler {
                if let Some(param) = &mut handler.param {
                    visit_pat(param, si);
                }
                visit_block(&mut handler.body, si);
            }
            if let Some(fin) = &mut s.finalizer {
                visit_block(fin, si);
            }
        }
        Statement::LabeledStatement(s) => visit_stmt(&mut s.body, si),
        Statement::WithStatement(s) => {
            visit_expr(&mut s.object, si);
            visit_stmt(&mut s.body, si);
        }
        Statement::VariableDeclaration(d) => visit_var_decl(d, si),
        Statement::FunctionDeclaration(f) => visit_func_decl(f, si),
        Statement::ClassDeclaration(c) => visit_class_decl(c, si),
        Statement::ImportDeclaration(d) => visit_import_decl(d, si),
        Statement::ExportNamedDeclaration(d) => visit_export_named(d, si),
        Statement::ExportDefaultDeclaration(d) => visit_export_default(d, si),
        Statement::TSTypeAliasDeclaration(d) => {
            rename_id(&mut d.id, si);
            visit_raw(&mut d.type_annotation, si);
            visit_json_opt(&mut d.type_parameters, si);
        }
        Statement::TSInterfaceDeclaration(d) => {
            rename_id(&mut d.id, si);
            visit_raw(&mut d.body, si);
            visit_json_opt(&mut d.type_parameters, si);
            if let Some(ext) = &mut d.extends {
                visit_json_vec(ext, si);
            }
        }
        Statement::TSEnumDeclaration(d) => {
            rename_id(&mut d.id, si);
            visit_json_vec(&mut d.members, si);
        }
        Statement::TSModuleDeclaration(d) => {
            visit_raw(&mut d.id, si);
            visit_raw(&mut d.body, si);
        }
        Statement::TSDeclareFunction(d) => {
            if let Some(id) = &mut d.id {
                rename_id(id, si);
            }
            visit_json_vec(&mut d.params, si);
            visit_json_opt(&mut d.return_type, si);
            visit_json_opt(&mut d.type_parameters, si);
        }
        Statement::TypeAlias(d) => {
            rename_id(&mut d.id, si);
            visit_raw(&mut d.right, si);
            visit_json_opt(&mut d.type_parameters, si);
        }
        Statement::OpaqueType(d) => {
            rename_id(&mut d.id, si);
            if let Some(st) = &mut d.supertype {
                visit_raw(st, si);
            }
            visit_raw(&mut d.impltype, si);
            visit_json_opt(&mut d.type_parameters, si);
        }
        Statement::InterfaceDeclaration(d) => {
            rename_id(&mut d.id, si);
            visit_raw(&mut d.body, si);
            visit_json_opt(&mut d.type_parameters, si);
            if let Some(ext) = &mut d.extends {
                visit_json_vec(ext, si);
            }
        }
        Statement::DeclareVariable(d) => rename_id(&mut d.id, si),
        Statement::DeclareFunction(d) => {
            rename_id(&mut d.id, si);
            if let Some(pred) = &mut d.predicate {
                visit_raw(pred, si);
            }
        }
        Statement::DeclareClass(d) => {
            rename_id(&mut d.id, si);
            visit_raw(&mut d.body, si);
            visit_json_opt(&mut d.type_parameters, si);
            if let Some(ext) = &mut d.extends {
                visit_json_vec(ext, si);
            }
        }
        Statement::DeclareModule(d) => {
            visit_raw(&mut d.id, si);
            visit_raw(&mut d.body, si);
        }
        Statement::DeclareModuleExports(d) => visit_raw(&mut d.type_annotation, si),
        Statement::DeclareExportDeclaration(d) => {
            if let Some(decl) = &mut d.declaration {
                visit_raw(decl, si);
            }
            if let Some(specs) = &mut d.specifiers {
                visit_json_vec(specs, si);
            }
        }
        Statement::DeclareInterface(d) => {
            rename_id(&mut d.id, si);
            visit_raw(&mut d.body, si);
            visit_json_opt(&mut d.type_parameters, si);
            if let Some(ext) = &mut d.extends {
                visit_json_vec(ext, si);
            }
        }
        Statement::DeclareTypeAlias(d) => {
            rename_id(&mut d.id, si);
            visit_raw(&mut d.right, si);
            visit_json_opt(&mut d.type_parameters, si);
        }
        Statement::DeclareOpaqueType(d) => {
            rename_id(&mut d.id, si);
            if let Some(st) = &mut d.supertype {
                visit_raw(st, si);
            }
            if let Some(impl_) = &mut d.impltype {
                visit_raw(impl_, si);
            }
            visit_json_opt(&mut d.type_parameters, si);
        }
        Statement::EnumDeclaration(d) => {
            rename_id(&mut d.id, si);
            visit_raw(&mut d.body, si);
        }
        Statement::Unknown(d) => {
            d.with_raw_mut(|raw| visit_raw(raw, si))
                .expect("identifier rename preserves the node `type`");
        }
        Statement::BreakStatement(_)
        | Statement::ContinueStatement(_)
        | Statement::EmptyStatement(_)
        | Statement::DebuggerStatement(_)
        | Statement::ExportAllDeclaration(_)
        | Statement::DeclareExportAllDeclaration(_) => {}
    }
}

fn visit_expr(expr: &mut Expression, si: &ScopeInfo) {
    match expr {
        Expression::Identifier(id) => rename_id(id, si),
        Expression::CallExpression(e) => {
            visit_expr(&mut e.callee, si);
            for arg in &mut e.arguments {
                visit_expr(arg, si);
            }
            visit_json_opt(&mut e.type_parameters, si);
            visit_json_opt(&mut e.type_arguments, si);
        }
        Expression::MemberExpression(e) => {
            visit_expr(&mut e.object, si);
            visit_expr(&mut e.property, si);
        }
        Expression::OptionalCallExpression(e) => {
            visit_expr(&mut e.callee, si);
            for arg in &mut e.arguments {
                visit_expr(arg, si);
            }
            visit_json_opt(&mut e.type_parameters, si);
            visit_json_opt(&mut e.type_arguments, si);
        }
        Expression::OptionalMemberExpression(e) => {
            visit_expr(&mut e.object, si);
            visit_expr(&mut e.property, si);
        }
        Expression::BinaryExpression(e) => {
            visit_expr(&mut e.left, si);
            visit_expr(&mut e.right, si);
        }
        Expression::LogicalExpression(e) => {
            visit_expr(&mut e.left, si);
            visit_expr(&mut e.right, si);
        }
        Expression::UnaryExpression(e) => visit_expr(&mut e.argument, si),
        Expression::UpdateExpression(e) => visit_expr(&mut e.argument, si),
        Expression::ConditionalExpression(e) => {
            visit_expr(&mut e.test, si);
            visit_expr(&mut e.consequent, si);
            visit_expr(&mut e.alternate, si);
        }
        Expression::AssignmentExpression(e) => {
            visit_pat(&mut e.left, si);
            visit_expr(&mut e.right, si);
        }
        Expression::SequenceExpression(e) => {
            for child in &mut e.expressions {
                visit_expr(child, si);
            }
        }
        Expression::ArrowFunctionExpression(e) => {
            if let Some(id) = &mut e.id {
                rename_id(id, si);
            }
            for param in &mut e.params {
                visit_pat(param, si);
            }
            match e.body.as_mut() {
                ArrowFunctionBody::BlockStatement(block) => visit_block(block, si),
                ArrowFunctionBody::Expression(expr) => visit_expr(expr, si),
            }
            visit_json_opt(&mut e.return_type, si);
            visit_json_opt(&mut e.type_parameters, si);
            visit_json_opt(&mut e.predicate, si);
        }
        Expression::FunctionExpression(e) => {
            if let Some(id) = &mut e.id {
                rename_id(id, si);
            }
            for param in &mut e.params {
                visit_pat(param, si);
            }
            visit_block(&mut e.body, si);
            visit_json_opt(&mut e.return_type, si);
            visit_json_opt(&mut e.type_parameters, si);
        }
        Expression::ObjectExpression(e) => {
            for prop in &mut e.properties {
                match prop {
                    ObjectExpressionProperty::ObjectProperty(p) => {
                        visit_expr(&mut p.key, si);
                        visit_expr(&mut p.value, si);
                    }
                    ObjectExpressionProperty::ObjectMethod(m) => {
                        visit_expr(&mut m.key, si);
                        for param in &mut m.params {
                            visit_pat(param, si);
                        }
                        visit_block(&mut m.body, si);
                        visit_json_opt(&mut m.return_type, si);
                        visit_json_opt(&mut m.type_parameters, si);
                    }
                    ObjectExpressionProperty::SpreadElement(s) => visit_expr(&mut s.argument, si),
                }
            }
        }
        Expression::ArrayExpression(e) => {
            for elem in &mut e.elements {
                if let Some(el) = elem {
                    visit_expr(el, si);
                }
            }
        }
        Expression::NewExpression(e) => {
            visit_expr(&mut e.callee, si);
            for arg in &mut e.arguments {
                visit_expr(arg, si);
            }
            visit_json_opt(&mut e.type_parameters, si);
            visit_json_opt(&mut e.type_arguments, si);
        }
        Expression::TemplateLiteral(e) => {
            for child in &mut e.expressions {
                visit_expr(child, si);
            }
        }
        Expression::TaggedTemplateExpression(e) => {
            visit_expr(&mut e.tag, si);
            for child in &mut e.quasi.expressions {
                visit_expr(child, si);
            }
            visit_json_opt(&mut e.type_parameters, si);
        }
        Expression::AwaitExpression(e) => visit_expr(&mut e.argument, si),
        Expression::YieldExpression(e) => {
            if let Some(arg) = &mut e.argument {
                visit_expr(arg, si);
            }
        }
        Expression::SpreadElement(e) => visit_expr(&mut e.argument, si),
        Expression::MetaProperty(e) => {
            rename_id(&mut e.meta, si);
            rename_id(&mut e.property, si);
        }
        Expression::ClassExpression(e) => {
            if let Some(id) = &mut e.id {
                rename_id(id, si);
            }
            if let Some(sc) = &mut e.super_class {
                visit_expr(sc, si);
            }
            visit_json_vec(&mut e.body.body, si);
            if let Some(dec) = &mut e.decorators {
                visit_json_vec(dec, si);
            }
            visit_json_opt(&mut e.super_type_parameters, si);
            visit_json_opt(&mut e.type_parameters, si);
            if let Some(imp) = &mut e.implements {
                visit_json_vec(imp, si);
            }
        }
        Expression::PrivateName(e) => rename_id(&mut e.id, si),
        Expression::ParenthesizedExpression(e) => visit_expr(&mut e.expression, si),
        Expression::AssignmentPattern(p) => {
            visit_pat(&mut p.left, si);
            visit_expr(&mut p.right, si);
        }
        Expression::TSAsExpression(e) => {
            visit_expr(&mut e.expression, si);
            visit_raw(&mut e.type_annotation, si);
        }
        Expression::TSSatisfiesExpression(e) => {
            visit_expr(&mut e.expression, si);
            visit_raw(&mut e.type_annotation, si);
        }
        Expression::TSNonNullExpression(e) => visit_expr(&mut e.expression, si),
        Expression::TSTypeAssertion(e) => {
            visit_expr(&mut e.expression, si);
            visit_raw(&mut e.type_annotation, si);
        }
        Expression::TSInstantiationExpression(e) => {
            visit_expr(&mut e.expression, si);
            visit_raw(&mut e.type_parameters, si);
        }
        Expression::TypeCastExpression(e) => {
            visit_expr(&mut e.expression, si);
            visit_raw(&mut e.type_annotation, si);
        }
        Expression::JSXElement(e) => visit_jsx_element(e, si),
        Expression::JSXFragment(f) => {
            for child in &mut f.children {
                visit_jsx_child(child, si);
            }
        }
        Expression::StringLiteral(_)
        | Expression::NumericLiteral(_)
        | Expression::BooleanLiteral(_)
        | Expression::NullLiteral(_)
        | Expression::BigIntLiteral(_)
        | Expression::RegExpLiteral(_)
        | Expression::Super(_)
        | Expression::Import(_)
        | Expression::ThisExpression(_) => {}
    }
}

fn visit_pat(pat: &mut PatternLike, si: &ScopeInfo) {
    match pat {
        PatternLike::Identifier(id) => rename_id(id, si),
        PatternLike::ObjectPattern(op) => {
            for prop in &mut op.properties {
                match prop {
                    ObjectPatternProperty::ObjectProperty(pp) => {
                        visit_expr(&mut pp.key, si);
                        visit_pat(&mut pp.value, si);
                    }
                    ObjectPatternProperty::RestElement(r) => {
                        visit_pat(&mut r.argument, si);
                        visit_json_opt(&mut r.type_annotation, si);
                    }
                }
            }
            visit_json_opt(&mut op.type_annotation, si);
        }
        PatternLike::ArrayPattern(ap) => {
            for elem in &mut ap.elements {
                if let Some(el) = elem {
                    visit_pat(el, si);
                }
            }
            visit_json_opt(&mut ap.type_annotation, si);
        }
        PatternLike::AssignmentPattern(ap) => {
            visit_pat(&mut ap.left, si);
            visit_expr(&mut ap.right, si);
            visit_json_opt(&mut ap.type_annotation, si);
        }
        PatternLike::RestElement(re) => {
            visit_pat(&mut re.argument, si);
            visit_json_opt(&mut re.type_annotation, si);
        }
        PatternLike::MemberExpression(e) => {
            visit_expr(&mut e.object, si);
            visit_expr(&mut e.property, si);
        }
        PatternLike::TSAsExpression(e) => {
            visit_expr(&mut e.expression, si);
            visit_raw(&mut e.type_annotation, si);
        }
        PatternLike::TSSatisfiesExpression(e) => {
            visit_expr(&mut e.expression, si);
            visit_raw(&mut e.type_annotation, si);
        }
        PatternLike::TSNonNullExpression(e) => {
            visit_expr(&mut e.expression, si);
        }
        PatternLike::TSTypeAssertion(e) => {
            visit_expr(&mut e.expression, si);
            visit_raw(&mut e.type_annotation, si);
        }
        PatternLike::TypeCastExpression(e) => {
            visit_expr(&mut e.expression, si);
            visit_raw(&mut e.type_annotation, si);
        }
    }
}

fn visit_for_left(left: &mut Box<ForInOfLeft>, si: &ScopeInfo) {
    match left.as_mut() {
        ForInOfLeft::VariableDeclaration(d) => visit_var_decl(d, si),
        ForInOfLeft::Pattern(p) => visit_pat(p, si),
    }
}

fn visit_var_decl(d: &mut VariableDeclaration, si: &ScopeInfo) {
    for decl in &mut d.declarations {
        visit_pat(&mut decl.id, si);
        if let Some(init) = &mut decl.init {
            visit_expr(init, si);
        }
    }
}

fn visit_func_decl(f: &mut FunctionDeclaration, si: &ScopeInfo) {
    if let Some(id) = &mut f.id {
        rename_id(id, si);
    }
    for param in &mut f.params {
        visit_pat(param, si);
    }
    visit_block(&mut f.body, si);
    visit_json_opt(&mut f.return_type, si);
    visit_json_opt(&mut f.type_parameters, si);
    visit_json_opt(&mut f.predicate, si);
}

fn visit_class_decl(c: &mut ClassDeclaration, si: &ScopeInfo) {
    if let Some(id) = &mut c.id {
        rename_id(id, si);
    }
    if let Some(sc) = &mut c.super_class {
        visit_expr(sc, si);
    }
    visit_json_vec(&mut c.body.body, si);
    if let Some(dec) = &mut c.decorators {
        visit_json_vec(dec, si);
    }
    visit_json_opt(&mut c.super_type_parameters, si);
    visit_json_opt(&mut c.type_parameters, si);
    if let Some(imp) = &mut c.implements {
        visit_json_vec(imp, si);
    }
}

fn visit_import_decl(d: &mut ImportDeclaration, si: &ScopeInfo) {
    for spec in &mut d.specifiers {
        match spec {
            ImportSpecifier::ImportSpecifier(s) => {
                rename_id(&mut s.local, si);
                visit_module_export_name(&mut s.imported, si);
            }
            ImportSpecifier::ImportDefaultSpecifier(s) => rename_id(&mut s.local, si),
            ImportSpecifier::ImportNamespaceSpecifier(s) => rename_id(&mut s.local, si),
        }
    }
}

fn visit_export_named(d: &mut ExportNamedDeclaration, si: &ScopeInfo) {
    if let Some(decl) = &mut d.declaration {
        visit_declaration(decl, si);
    }
    for spec in &mut d.specifiers {
        match spec {
            ExportSpecifier::ExportSpecifier(s) => {
                visit_module_export_name(&mut s.local, si);
                visit_module_export_name(&mut s.exported, si);
            }
            ExportSpecifier::ExportDefaultSpecifier(s) => rename_id(&mut s.exported, si),
            ExportSpecifier::ExportNamespaceSpecifier(s) => {
                visit_module_export_name(&mut s.exported, si);
            }
        }
    }
}

fn visit_export_default(d: &mut ExportDefaultDeclaration, si: &ScopeInfo) {
    match d.declaration.as_mut() {
        ExportDefaultDecl::FunctionDeclaration(f) => visit_func_decl(f, si),
        ExportDefaultDecl::ClassDeclaration(c) => visit_class_decl(c, si),
        ExportDefaultDecl::EnumDeclaration(_) => {} // Flow enums are opaque
        ExportDefaultDecl::Expression(e) => visit_expr(e, si),
    }
}

fn visit_declaration(d: &mut Declaration, si: &ScopeInfo) {
    match d {
        Declaration::FunctionDeclaration(f) => visit_func_decl(f, si),
        Declaration::ClassDeclaration(c) => visit_class_decl(c, si),
        Declaration::VariableDeclaration(v) => visit_var_decl(v, si),
        Declaration::TSTypeAliasDeclaration(d) => {
            rename_id(&mut d.id, si);
            visit_raw(&mut d.type_annotation, si);
            visit_json_opt(&mut d.type_parameters, si);
        }
        Declaration::TSInterfaceDeclaration(d) => {
            rename_id(&mut d.id, si);
            visit_raw(&mut d.body, si);
            visit_json_opt(&mut d.type_parameters, si);
            if let Some(ext) = &mut d.extends {
                visit_json_vec(ext, si);
            }
        }
        Declaration::TSEnumDeclaration(d) => {
            rename_id(&mut d.id, si);
            visit_json_vec(&mut d.members, si);
        }
        Declaration::TSModuleDeclaration(d) => {
            visit_raw(&mut d.id, si);
            visit_raw(&mut d.body, si);
        }
        Declaration::TSDeclareFunction(d) => {
            if let Some(id) = &mut d.id {
                rename_id(id, si);
            }
            visit_json_vec(&mut d.params, si);
            visit_json_opt(&mut d.return_type, si);
            visit_json_opt(&mut d.type_parameters, si);
        }
        Declaration::TypeAlias(d) => {
            rename_id(&mut d.id, si);
            visit_raw(&mut d.right, si);
            visit_json_opt(&mut d.type_parameters, si);
        }
        Declaration::OpaqueType(d) => {
            rename_id(&mut d.id, si);
            if let Some(st) = &mut d.supertype {
                visit_raw(st, si);
            }
            visit_raw(&mut d.impltype, si);
            visit_json_opt(&mut d.type_parameters, si);
        }
        Declaration::InterfaceDeclaration(d) => {
            rename_id(&mut d.id, si);
            visit_raw(&mut d.body, si);
            visit_json_opt(&mut d.type_parameters, si);
            if let Some(ext) = &mut d.extends {
                visit_json_vec(ext, si);
            }
        }
        Declaration::EnumDeclaration(d) => {
            rename_id(&mut d.id, si);
            visit_raw(&mut d.body, si);
        }
    }
}

fn visit_module_export_name(n: &mut ModuleExportName, si: &ScopeInfo) {
    match n {
        ModuleExportName::Identifier(id) => rename_id(id, si),
        ModuleExportName::StringLiteral(_) => {}
    }
}

fn visit_jsx_element(el: &mut JSXElement, si: &ScopeInfo) {
    for attr in &mut el.opening_element.attributes {
        match attr {
            JSXAttributeItem::JSXAttribute(a) => {
                if let Some(val) = &mut a.value {
                    match val {
                        JSXAttributeValue::JSXExpressionContainer(c) => {
                            visit_jsx_expr(&mut c.expression, si);
                        }
                        JSXAttributeValue::JSXElement(e) => visit_jsx_element(e, si),
                        JSXAttributeValue::JSXFragment(f) => {
                            for child in &mut f.children {
                                visit_jsx_child(child, si);
                            }
                        }
                        JSXAttributeValue::StringLiteral(_) => {}
                    }
                }
            }
            JSXAttributeItem::JSXSpreadAttribute(s) => visit_expr(&mut s.argument, si),
        }
    }
    visit_json_opt(&mut el.opening_element.type_parameters, si);
    for child in &mut el.children {
        visit_jsx_child(child, si);
    }
}

fn visit_jsx_child(child: &mut JSXChild, si: &ScopeInfo) {
    match child {
        JSXChild::JSXElement(e) => visit_jsx_element(e, si),
        JSXChild::JSXFragment(f) => {
            for child in &mut f.children {
                visit_jsx_child(child, si);
            }
        }
        JSXChild::JSXExpressionContainer(c) => visit_jsx_expr(&mut c.expression, si),
        JSXChild::JSXSpreadChild(s) => visit_expr(&mut s.expression, si),
        JSXChild::JSXText(_) => {}
    }
}

fn visit_jsx_expr(expr: &mut JSXExpressionContainerExpr, si: &ScopeInfo) {
    match expr {
        JSXExpressionContainerExpr::Expression(e) => visit_expr(e, si),
        JSXExpressionContainerExpr::JSXEmptyExpression(_) => {}
    }
}

#[test]
fn scope_resolution_rename() {
    let json_dir = get_fixture_json_dir();
    let mut failures: Vec<(String, String)> = Vec::new();
    let mut total = 0;
    let mut passed = 0;
    let mut skipped = 0;

    let known_failures: &[&str] = &[
        "lone-surrogate-string-values",
        "component-in-object-method-body.flow",
        "error.todo-hoist-type-alias-before-declaration",
        "error.todo-round2_severity_diff",
        "error.todo-update-expression-context-variable-via-type-annotation",
    ];

    for entry in walkdir::WalkDir::new(&json_dir)
        .into_iter()
        .filter_map(|e| e.ok())
        .filter(|e| {
            e.path().extension().is_some_and(|ext| ext == "json")
                && !e.path().to_string_lossy().contains(".scope.")
                && !e.path().to_string_lossy().contains(".renamed.")
        })
    {
        let ast_path_str = entry.path().to_string_lossy().to_string();
        let scope_path_str = ast_path_str.replace(".json", ".scope.json");
        let renamed_path_str = ast_path_str.replace(".json", ".renamed.json");
        let scope_path = std::path::Path::new(&scope_path_str);
        let renamed_path = std::path::Path::new(&renamed_path_str);

        if !scope_path.exists() || !renamed_path.exists() {
            skipped += 1;
            continue;
        }

        let fixture_name = entry
            .path()
            .strip_prefix(&json_dir)
            .unwrap()
            .display()
            .to_string();

        if known_failures.iter().any(|kf| fixture_name.contains(kf)) {
            continue;
        }

        total += 1;

        let ast_json = std::fs::read_to_string(entry.path()).unwrap();
        let scope_json = std::fs::read_to_string(scope_path).unwrap();
        let babel_renamed_json = std::fs::read_to_string(renamed_path).unwrap();

        let scope_info: react_compiler_ast::scope::ScopeInfo =
            match serde_json::from_str(&scope_json) {
                Ok(info) => info,
                Err(e) => {
                    failures.push((fixture_name, format!("Scope deserialization error: {e}")));
                    continue;
                }
            };

        // Deserialize into typed AST, rename using scope info, re-serialize
        let mut file: react_compiler_ast::File = match serde_json::from_str(&ast_json) {
            Ok(f) => f,
            Err(e) => {
                failures.push((fixture_name, format!("AST deserialization error: {e}")));
                continue;
            }
        };
        rename_identifiers(&mut file, &scope_info);
        let rust_renamed = serde_json::to_value(&file).unwrap();

        let babel_renamed_value: serde_json::Value =
            serde_json::from_str(&babel_renamed_json).unwrap();

        let rust_normalized = normalize_json(&rust_renamed);
        let babel_normalized = normalize_json(&babel_renamed_value);

        if rust_normalized != babel_normalized {
            let rust_str = serde_json::to_string_pretty(&rust_normalized).unwrap();
            let babel_str = serde_json::to_string_pretty(&babel_normalized).unwrap();
            let diff = compute_diff(&babel_str, &rust_str);
            failures.push((fixture_name, format!("Rename mismatch:\n{diff}")));
        } else {
            passed += 1;
        }
    }

    println!("\n{passed}/{total} fixtures passed scope resolution rename ({skipped} skipped)");

    if !failures.is_empty() {
        let show_count = failures.len().min(5);
        let mut msg = format!(
            "\n{} of {total} fixtures failed scope resolution rename (showing first {show_count}):\n\n",
            failures.len()
        );
        for (name, err) in failures.iter().take(show_count) {
            msg.push_str(&format!("--- {name} ---\n{err}\n\n"));
        }
        if failures.len() > show_count {
            msg.push_str(&format!(
                "... and {} more failures\n",
                failures.len() - show_count
            ));
        }
        panic!("{msg}");
    }
}
