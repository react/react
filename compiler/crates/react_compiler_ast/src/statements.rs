use serde::Deserialize;
use serde::Deserializer;
use serde::Serialize;
use serde::Serializer;
use serde::de::Error as _;

use crate::common::BaseNode;
use crate::common::RawNode;
use crate::expressions::Expression;
use crate::expressions::Identifier;
use crate::patterns::PatternLike;

fn is_false(v: &bool) -> bool {
    !v
}

#[derive(Debug, Clone, Serialize)]
#[serde(tag = "type")]
pub enum Statement {
    // Statements
    BlockStatement(BlockStatement),
    ReturnStatement(ReturnStatement),
    IfStatement(IfStatement),
    ForStatement(ForStatement),
    WhileStatement(WhileStatement),
    DoWhileStatement(DoWhileStatement),
    ForInStatement(ForInStatement),
    ForOfStatement(ForOfStatement),
    SwitchStatement(SwitchStatement),
    ThrowStatement(ThrowStatement),
    TryStatement(TryStatement),
    BreakStatement(BreakStatement),
    ContinueStatement(ContinueStatement),
    LabeledStatement(LabeledStatement),
    ExpressionStatement(ExpressionStatement),
    EmptyStatement(EmptyStatement),
    DebuggerStatement(DebuggerStatement),
    WithStatement(WithStatement),
    // Declarations are also statements
    VariableDeclaration(VariableDeclaration),
    FunctionDeclaration(FunctionDeclaration),
    ClassDeclaration(ClassDeclaration),
    // Import/export declarations
    ImportDeclaration(crate::declarations::ImportDeclaration),
    ExportNamedDeclaration(crate::declarations::ExportNamedDeclaration),
    ExportDefaultDeclaration(crate::declarations::ExportDefaultDeclaration),
    ExportAllDeclaration(crate::declarations::ExportAllDeclaration),
    // TypeScript/Flow enum declarations. Kept as typed variants because the
    // bailout path serializes them back out via `original_node`.
    TSEnumDeclaration(crate::declarations::TSEnumDeclaration),
    EnumDeclaration(crate::declarations::EnumDeclaration),
    // NOTE: TS/Flow *type-only* declarations (TSTypeAliasDeclaration,
    // TypeAlias, Declare*, etc.) are intentionally NOT modeled as typed
    // variants. The compiler never inspects their structure — it skips them in
    // function bodies and preserves them verbatim at module level — so they
    // deserialize to `Unknown` below, which keeps their serde/clone code out of
    // the binary. [`is_type_only_statement_tag`] lists those tags.
    /// Catch-all for statement `type`s the typed AST does not model, e.g. the
    /// TypeScript module-interop statements `import x = require(...)`,
    /// `export = x`, and `export as namespace X`. Carries the complete raw
    /// Babel node so the Babel path can preserve unmodeled top-level
    /// statements verbatim instead of failing the whole file.
    ///
    /// Deserialization dispatches through [`KnownStatement`]: a modeled `type`
    /// whose body is malformed errors with the typed variant's precise message
    /// rather than degrading to `Unknown`. Adding a variant to this enum
    /// requires adding it to the `known_statements!` list below, which is the
    /// single source for the dispatch enum, its `From` mapping, and
    /// [`KNOWN_STATEMENT_TYPES`]. A variant added here but not there degrades
    /// to `Unknown` silently; that is the one drift case structure cannot
    /// catch.
    #[serde(untagged)]
    Unknown(UnknownStatement),
}

// NOTE: `Deserialize` for `Statement` is hand-written below; the
// `#[serde(tag = "type")]` and `#[serde(untagged)]` attributes on the enum
// configure only the derived `Serialize`.

#[derive(Debug, Clone)]
pub struct UnknownStatement {
    raw: RawNode,
    base: BaseNode,
}

impl UnknownStatement {
    pub fn from_raw(raw: RawNode) -> Result<Self, String> {
        match raw.type_name() {
            Some(_) => {
                // Parsing into BaseNode reads only the fields BaseNode declares,
                // not the whole (arbitrarily large) unknown subtree.
                let base = crate::common::from_json_str_unbounded::<BaseNode>(raw.get())
                    .map_err(|err| format!("failed to read unknown statement base: {err}"))?;
                Ok(Self { raw, base })
            }
            None => Err("unknown statement is missing a string `type` field".to_string()),
        }
    }

    /// The node's `type` discriminant, read from the captured [`BaseNode`].
    /// Falls back to `"Unknown"` rather than panicking if the raw node was
    /// mutated out from under it.
    pub fn node_type(&self) -> &str {
        self.base.node_type.as_deref().unwrap_or("Unknown")
    }

    pub fn raw(&self) -> &RawNode {
        &self.raw
    }

    /// Mutate the raw node, then refresh the cached [`BaseNode`] so `base()`
    /// and `node_type()` cannot drift from `raw`. Mutations that remove the
    /// string `type` field are rejected and rolled back.
    pub fn with_raw_mut<R>(&mut self, f: impl FnOnce(&mut RawNode) -> R) -> Result<R, String> {
        let saved = self.raw.clone();
        let result = f(&mut self.raw);
        if self.raw.type_name().is_none() {
            self.raw = saved;
            return Err("unknown statement mutation removed the string `type` field".to_string());
        }
        match crate::common::from_json_str_unbounded::<BaseNode>(self.raw.get()) {
            Ok(base) => {
                self.base = base;
                Ok(result)
            }
            Err(err) => {
                self.raw = saved;
                Err(format!("failed to refresh unknown statement base: {err}"))
            }
        }
    }

    pub fn base(&self) -> &BaseNode {
        &self.base
    }
}

impl Serialize for UnknownStatement {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        self.raw.serialize(serializer)
    }
}

impl<'de> Deserialize<'de> for UnknownStatement {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: Deserializer<'de>,
    {
        let raw = RawNode::deserialize(deserializer)?;
        Self::from_raw(raw).map_err(D::Error::custom)
    }
}

impl<'de> Deserialize<'de> for Statement {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: Deserializer<'de>,
    {
        let raw = RawNode::deserialize(deserializer)?;
        let node_type = raw
            .type_name()
            .ok_or_else(|| D::Error::custom("statement is missing a string `type` field"))?;

        if is_known_statement_type(&node_type) {
            let known: KnownStatement =
                crate::common::from_json_str_unbounded(raw.get()).map_err(D::Error::custom)?;
            Ok(known.into())
        } else {
            UnknownStatement::from_raw(raw)
                .map(Statement::Unknown)
                .map_err(D::Error::custom)
        }
    }
}

/// Single source of truth for the statement `type` tags [`Statement`] models.
/// Generates the [`KnownStatement`] dispatch enum, its `From` mapping, and
/// [`KNOWN_STATEMENT_TYPES`] from one list, so the three cannot drift from
/// each other. A variant added to [`Statement`] but not listed here still
/// degrades to [`Statement::Unknown`] silently; that residual gap is
/// documented on the variant.
macro_rules! known_statements {
    ($($variant:ident => $ty:ty),+ $(,)?) => {
        const KNOWN_STATEMENT_TYPES: &[&str] = &[$(stringify!($variant)),+];

        /// Whether `node_type` is a statement `type` tag modeled by
        /// [`Statement`], i.e. one that deserializes into a typed variant
        /// rather than the [`Statement::Unknown`] catch-all. Callers that
        /// need to discriminate statements from other node kinds must use
        /// this instead of attempting a `Statement` deserialization: with
        /// the tolerant catch-all, that attempt succeeds for any object
        /// carrying a string `type` tag.
        pub fn is_known_statement_type(node_type: &str) -> bool {
            KNOWN_STATEMENT_TYPES.contains(&node_type)
        }

        #[derive(Debug, Deserialize)]
        #[serde(tag = "type")]
        enum KnownStatement {
            $($variant($ty),)+
        }

        impl From<KnownStatement> for Statement {
            fn from(value: KnownStatement) -> Self {
                match value {
                    $(KnownStatement::$variant(s) => Statement::$variant(s),)+
                }
            }
        }
    };
}

known_statements! {
    BlockStatement => BlockStatement,
    ReturnStatement => ReturnStatement,
    IfStatement => IfStatement,
    ForStatement => ForStatement,
    WhileStatement => WhileStatement,
    DoWhileStatement => DoWhileStatement,
    ForInStatement => ForInStatement,
    ForOfStatement => ForOfStatement,
    SwitchStatement => SwitchStatement,
    ThrowStatement => ThrowStatement,
    TryStatement => TryStatement,
    BreakStatement => BreakStatement,
    ContinueStatement => ContinueStatement,
    LabeledStatement => LabeledStatement,
    ExpressionStatement => ExpressionStatement,
    EmptyStatement => EmptyStatement,
    DebuggerStatement => DebuggerStatement,
    WithStatement => WithStatement,
    VariableDeclaration => VariableDeclaration,
    FunctionDeclaration => FunctionDeclaration,
    ClassDeclaration => ClassDeclaration,
    ImportDeclaration => crate::declarations::ImportDeclaration,
    ExportNamedDeclaration => crate::declarations::ExportNamedDeclaration,
    ExportDefaultDeclaration => crate::declarations::ExportDefaultDeclaration,
    ExportAllDeclaration => crate::declarations::ExportAllDeclaration,
    TSEnumDeclaration => crate::declarations::TSEnumDeclaration,
    EnumDeclaration => crate::declarations::EnumDeclaration,
}

/// Whether `node_type` is a TS/Flow *type-only* declaration tag — a statement
/// the compiler does not model with a typed variant because it carries no
/// runtime semantics. These deserialize to [`Statement::Unknown`]; lowering
/// skips them in function bodies (matching the TS reference) and the module
/// level preserves them verbatim. Keeping them as a tag list rather than typed
/// `Statement` variants keeps their serde/clone code out of the binary.
pub fn is_type_only_statement_tag(node_type: &str) -> bool {
    const TYPE_ONLY_STATEMENT_TYPES: &[&str] = &[
        "TSTypeAliasDeclaration",
        "TSInterfaceDeclaration",
        "TSModuleDeclaration",
        "TSDeclareFunction",
        "TypeAlias",
        "OpaqueType",
        "InterfaceDeclaration",
        "DeclareVariable",
        "DeclareFunction",
        "DeclareClass",
        "DeclareModule",
        "DeclareModuleExports",
        "DeclareExportDeclaration",
        "DeclareExportAllDeclaration",
        "DeclareInterface",
        "DeclareTypeAlias",
        "DeclareOpaqueType",
    ];
    TYPE_ONLY_STATEMENT_TYPES.contains(&node_type)
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BlockStatement {
    #[serde(flatten)]
    pub base: BaseNode,
    pub body: Vec<Statement>,
    #[serde(default)]
    pub directives: Vec<Directive>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Directive {
    #[serde(flatten)]
    pub base: BaseNode,
    pub value: DirectiveLiteral,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DirectiveLiteral {
    #[serde(flatten)]
    pub base: BaseNode,
    pub value: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReturnStatement {
    #[serde(flatten)]
    pub base: BaseNode,
    pub argument: Option<Box<Expression>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExpressionStatement {
    #[serde(flatten)]
    pub base: BaseNode,
    pub expression: Box<Expression>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IfStatement {
    #[serde(flatten)]
    pub base: BaseNode,
    pub test: Box<Expression>,
    pub consequent: Box<Statement>,
    pub alternate: Option<Box<Statement>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ForStatement {
    #[serde(flatten)]
    pub base: BaseNode,
    pub init: Option<Box<ForInit>>,
    pub test: Option<Box<Expression>>,
    pub update: Option<Box<Expression>>,
    pub body: Box<Statement>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum ForInit {
    VariableDeclaration(VariableDeclaration),
    #[serde(untagged)]
    Expression(Box<Expression>),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WhileStatement {
    #[serde(flatten)]
    pub base: BaseNode,
    pub test: Box<Expression>,
    pub body: Box<Statement>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DoWhileStatement {
    #[serde(flatten)]
    pub base: BaseNode,
    pub test: Box<Expression>,
    pub body: Box<Statement>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ForInStatement {
    #[serde(flatten)]
    pub base: BaseNode,
    pub left: Box<ForInOfLeft>,
    pub right: Box<Expression>,
    pub body: Box<Statement>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ForOfStatement {
    #[serde(flatten)]
    pub base: BaseNode,
    pub left: Box<ForInOfLeft>,
    pub right: Box<Expression>,
    pub body: Box<Statement>,
    #[serde(default, rename = "await")]
    pub is_await: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum ForInOfLeft {
    VariableDeclaration(VariableDeclaration),
    #[serde(untagged)]
    Pattern(Box<PatternLike>),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SwitchStatement {
    #[serde(flatten)]
    pub base: BaseNode,
    pub discriminant: Box<Expression>,
    pub cases: Vec<SwitchCase>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SwitchCase {
    #[serde(flatten)]
    pub base: BaseNode,
    pub test: Option<Box<Expression>>,
    pub consequent: Vec<Statement>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ThrowStatement {
    #[serde(flatten)]
    pub base: BaseNode,
    pub argument: Box<Expression>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TryStatement {
    #[serde(flatten)]
    pub base: BaseNode,
    pub block: BlockStatement,
    pub handler: Option<CatchClause>,
    pub finalizer: Option<BlockStatement>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CatchClause {
    #[serde(flatten)]
    pub base: BaseNode,
    pub param: Option<PatternLike>,
    pub body: BlockStatement,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BreakStatement {
    #[serde(flatten)]
    pub base: BaseNode,
    pub label: Option<Identifier>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContinueStatement {
    #[serde(flatten)]
    pub base: BaseNode,
    pub label: Option<Identifier>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LabeledStatement {
    #[serde(flatten)]
    pub base: BaseNode,
    pub label: Identifier,
    pub body: Box<Statement>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EmptyStatement {
    #[serde(flatten)]
    pub base: BaseNode,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DebuggerStatement {
    #[serde(flatten)]
    pub base: BaseNode,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WithStatement {
    #[serde(flatten)]
    pub base: BaseNode,
    pub object: Box<Expression>,
    pub body: Box<Statement>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VariableDeclaration {
    #[serde(flatten)]
    pub base: BaseNode,
    pub declarations: Vec<VariableDeclarator>,
    pub kind: VariableDeclarationKind,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub declare: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum VariableDeclarationKind {
    Var,
    Let,
    Const,
    Using,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VariableDeclarator {
    #[serde(flatten)]
    pub base: BaseNode,
    pub id: PatternLike,
    pub init: Option<Box<Expression>>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub definite: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FunctionDeclaration {
    #[serde(flatten)]
    pub base: BaseNode,
    pub id: Option<Identifier>,
    pub params: Vec<PatternLike>,
    pub body: BlockStatement,
    #[serde(default)]
    pub generator: bool,
    #[serde(default, rename = "async")]
    pub is_async: bool,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub declare: Option<bool>,
    #[serde(
        default,
        skip_serializing_if = "Option::is_none",
        rename = "returnType"
    )]
    pub return_type: Option<RawNode>,
    #[serde(
        default,
        skip_serializing_if = "Option::is_none",
        rename = "typeParameters"
    )]
    pub type_parameters: Option<RawNode>,
    #[serde(
        default,
        skip_serializing_if = "Option::is_none",
        rename = "predicate",
        deserialize_with = "crate::common::nullable_value"
    )]
    pub predicate: Option<RawNode>,
    /// Set by the Hermes parser for Flow `component Foo(...) { ... }` syntax
    #[serde(
        default,
        skip_serializing_if = "is_false",
        rename = "__componentDeclaration"
    )]
    pub component_declaration: bool,
    /// Set by the Hermes parser for Flow `hook useFoo(...) { ... }` syntax
    #[serde(
        default,
        skip_serializing_if = "is_false",
        rename = "__hookDeclaration"
    )]
    pub hook_declaration: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClassDeclaration {
    #[serde(flatten)]
    pub base: BaseNode,
    pub id: Option<Identifier>,
    #[serde(rename = "superClass")]
    pub super_class: Option<Box<Expression>>,
    pub body: crate::expressions::ClassBody,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub decorators: Option<Vec<RawNode>>,
    #[serde(default, skip_serializing_if = "Option::is_none", rename = "abstract")]
    pub is_abstract: Option<bool>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub declare: Option<bool>,
    #[serde(
        default,
        skip_serializing_if = "Option::is_none",
        rename = "implements"
    )]
    pub implements: Option<Vec<RawNode>>,
    #[serde(
        default,
        skip_serializing_if = "Option::is_none",
        rename = "superTypeParameters"
    )]
    pub super_type_parameters: Option<RawNode>,
    #[serde(
        default,
        skip_serializing_if = "Option::is_none",
        rename = "typeParameters"
    )]
    pub type_parameters: Option<RawNode>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub mixins: Option<Vec<RawNode>>,
}

#[cfg(test)]
mod tests {
    use serde_json::json;

    use super::Statement;
    use crate::common::RawNode;

    #[test]
    fn unknown_statement_round_trips_at_program_level() {
        let input = json!({
            "type": "File",
            "comments": [],
            "errors": [],
            "program": {
                "type": "Program",
                "sourceType": "module",
                "interpreter": null,
                "body": [
                    {
                        "type": "TSImportEqualsDeclaration",
                        "start": 0,
                        "end": 39,
                        "importKind": "value",
                        "isExport": false,
                        "id": { "type": "Identifier", "name": "lib" },
                        "moduleReference": {
                            "type": "TSExternalModuleReference",
                            "expression": { "type": "StringLiteral", "value": "shared-runtime" }
                        }
                    }
                ],
                "directives": []
            }
        });

        let file: crate::File = serde_json::from_value(input.clone()).unwrap();

        match &file.program.body[0] {
            Statement::Unknown(unknown) => {
                assert_eq!(unknown.node_type(), "TSImportEqualsDeclaration");
            }
            other => panic!("expected Unknown, got {other:?}"),
        }
        assert_eq!(serde_json::to_value(&file).unwrap(), input);
    }

    #[test]
    fn unknown_statement_round_trips_inside_function_block() {
        let input = json!({
            "type": "FunctionDeclaration",
            "id": null,
            "generator": false,
            "async": false,
            "params": [],
            "body": {
                "type": "BlockStatement",
                "body": [
                    {
                        "type": "TSExportAssignment",
                        "expression": { "type": "Identifier", "name": "x" }
                    }
                ],
                "directives": []
            }
        });

        let stmt: Statement = serde_json::from_value(input.clone()).unwrap();
        let Statement::FunctionDeclaration(function) = &stmt else {
            panic!("expected function declaration, got {stmt:?}");
        };
        assert!(matches!(function.body.body[0], Statement::Unknown(_)));
        assert_eq!(serde_json::to_value(&stmt).unwrap(), input);
    }

    /// The public discrimination helper mirrors the deserializer's dispatch:
    /// exactly the macro-listed statement tags are "known".
    #[test]
    fn is_known_statement_type_matches_macro_list() {
        assert!(super::is_known_statement_type("IfStatement"));
        assert!(super::is_known_statement_type("VariableDeclaration"));
        assert!(!super::is_known_statement_type("CallExpression"));
        assert!(!super::is_known_statement_type("TSImportEqualsDeclaration"));
    }

    #[test]
    fn known_statement_type_uses_typed_variant() {
        let stmt: Statement = serde_json::from_value(json!({
            "type": "EmptyStatement"
        }))
        .unwrap();

        assert!(matches!(stmt, Statement::EmptyStatement(_)));
    }

    #[test]
    fn malformed_known_statement_type_errors() {
        let err = serde_json::from_value::<Statement>(json!({
            "type": "IfStatement",
            "consequent": {
                "type": "EmptyStatement"
            }
        }))
        .unwrap_err();

        assert!(
            err.to_string().contains("missing field `test`"),
            "unexpected error: {err}"
        );
    }

    #[test]
    fn statement_without_type_field_errors() {
        let err = serde_json::from_value::<Statement>(json!({
            "start": 0,
            "end": 1
        }))
        .unwrap_err();

        assert!(
            err.to_string().contains("`type`"),
            "unexpected error: {err}"
        );
    }

    #[test]
    fn non_object_statement_errors() {
        let err = serde_json::from_value::<Statement>(json!([1, 2])).unwrap_err();
        assert!(
            err.to_string().contains("`type`"),
            "unexpected error: {err}"
        );
    }

    #[test]
    fn non_string_type_field_errors() {
        let err = serde_json::from_value::<Statement>(json!({ "type": 7 })).unwrap_err();
        assert!(
            err.to_string().contains("`type`"),
            "unexpected error: {err}"
        );
    }

    /// Mutating the raw node through the scoped mutator refreshes the cached
    /// base, and mutations that strip `type` are rejected.
    #[test]
    fn with_raw_mut_refreshes_base_and_guards_type() {
        let raw = json!({
            "type": "TSExportAssignment",
            "start": 5,
            "expression": { "type": "Identifier", "name": "x" }
        });
        let Statement::Unknown(mut unknown) = serde_json::from_value(raw).unwrap() else {
            panic!("expected Unknown");
        };

        unknown
            .with_raw_mut(|v| {
                let mut parsed = v.parse_value();
                parsed["start"] = json!(9);
                parsed["expression"]["name"] = json!("y");
                *v = RawNode::from_value(&parsed);
            })
            .unwrap();
        assert_eq!(unknown.base().start, Some(9));
        assert_eq!(
            unknown.raw().parse_value()["expression"]["name"],
            json!("y")
        );

        let err = unknown.with_raw_mut(|v| {
            let mut parsed = v.parse_value();
            parsed.as_object_mut().unwrap().remove("type");
            *v = RawNode::from_value(&parsed);
        });
        assert!(err.is_err(), "type removal must be rejected");
    }
}
