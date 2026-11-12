use serde::Deserialize;
use serde::Serialize;

use crate::common::BaseNode;
use crate::common::RawNode;
use crate::expressions::Expression;
use crate::expressions::Identifier;
use crate::literals::StringLiteral;

/// Union of Declaration types that can appear in export declarations
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum Declaration {
    FunctionDeclaration(crate::statements::FunctionDeclaration),
    ClassDeclaration(crate::statements::ClassDeclaration),
    VariableDeclaration(crate::statements::VariableDeclaration),
    TSTypeAliasDeclaration(TSTypeAliasDeclaration),
    TSInterfaceDeclaration(TSInterfaceDeclaration),
    TSEnumDeclaration(TSEnumDeclaration),
    TSModuleDeclaration(TSModuleDeclaration),
    TSDeclareFunction(TSDeclareFunction),
    TypeAlias(TypeAlias),
    OpaqueType(OpaqueType),
    InterfaceDeclaration(InterfaceDeclaration),
    EnumDeclaration(EnumDeclaration),
}

/// The declaration/expression that can appear in `export default <decl>`
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum ExportDefaultDecl {
    FunctionDeclaration(crate::statements::FunctionDeclaration),
    ClassDeclaration(crate::statements::ClassDeclaration),
    EnumDeclaration(EnumDeclaration),
    #[serde(untagged)]
    Expression(Box<Expression>),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImportDeclaration {
    #[serde(flatten)]
    pub base: BaseNode,
    pub specifiers: Vec<ImportSpecifier>,
    pub source: StringLiteral,
    #[serde(
        default,
        skip_serializing_if = "Option::is_none",
        rename = "importKind"
    )]
    pub import_kind: Option<ImportKind>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub assertions: Option<Vec<ImportAttribute>>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub attributes: Option<Vec<ImportAttribute>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ImportKind {
    Value,
    Type,
    Typeof,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum ImportSpecifier {
    ImportSpecifier(ImportSpecifierData),
    ImportDefaultSpecifier(ImportDefaultSpecifierData),
    ImportNamespaceSpecifier(ImportNamespaceSpecifierData),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImportSpecifierData {
    #[serde(flatten)]
    pub base: BaseNode,
    pub local: Identifier,
    pub imported: ModuleExportName,
    #[serde(default, rename = "importKind")]
    pub import_kind: Option<ImportKind>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImportDefaultSpecifierData {
    #[serde(flatten)]
    pub base: BaseNode,
    pub local: Identifier,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImportNamespaceSpecifierData {
    #[serde(flatten)]
    pub base: BaseNode,
    pub local: Identifier,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImportAttribute {
    #[serde(flatten)]
    pub base: BaseNode,
    pub key: Identifier,
    pub value: StringLiteral,
}

/// Identifier or StringLiteral used as module export names
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum ModuleExportName {
    Identifier(Identifier),
    StringLiteral(StringLiteral),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExportNamedDeclaration {
    #[serde(flatten)]
    pub base: BaseNode,
    pub declaration: Option<Box<Declaration>>,
    pub specifiers: Vec<ExportSpecifier>,
    pub source: Option<StringLiteral>,
    #[serde(default, rename = "exportKind")]
    pub export_kind: Option<ExportKind>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub assertions: Option<Vec<ImportAttribute>>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub attributes: Option<Vec<ImportAttribute>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ExportKind {
    Value,
    Type,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum ExportSpecifier {
    ExportSpecifier(ExportSpecifierData),
    ExportDefaultSpecifier(ExportDefaultSpecifierData),
    ExportNamespaceSpecifier(ExportNamespaceSpecifierData),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExportSpecifierData {
    #[serde(flatten)]
    pub base: BaseNode,
    pub local: ModuleExportName,
    pub exported: ModuleExportName,
    #[serde(
        default,
        skip_serializing_if = "Option::is_none",
        rename = "exportKind"
    )]
    pub export_kind: Option<ExportKind>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExportDefaultSpecifierData {
    #[serde(flatten)]
    pub base: BaseNode,
    pub exported: Identifier,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExportNamespaceSpecifierData {
    #[serde(flatten)]
    pub base: BaseNode,
    pub exported: ModuleExportName,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExportDefaultDeclaration {
    #[serde(flatten)]
    pub base: BaseNode,
    pub declaration: Box<ExportDefaultDecl>,
    #[serde(
        default,
        skip_serializing_if = "Option::is_none",
        rename = "exportKind"
    )]
    pub export_kind: Option<ExportKind>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExportAllDeclaration {
    #[serde(flatten)]
    pub base: BaseNode,
    pub source: StringLiteral,
    #[serde(
        default,
        skip_serializing_if = "Option::is_none",
        rename = "exportKind"
    )]
    pub export_kind: Option<ExportKind>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub assertions: Option<Vec<ImportAttribute>>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub attributes: Option<Vec<ImportAttribute>>,
}

// TypeScript declarations (pass-through via RawNode for bodies)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TSTypeAliasDeclaration {
    #[serde(flatten)]
    pub base: BaseNode,
    pub id: Identifier,
    #[serde(rename = "typeAnnotation")]
    pub type_annotation: RawNode,
    #[serde(
        default,
        skip_serializing_if = "Option::is_none",
        rename = "typeParameters"
    )]
    pub type_parameters: Option<RawNode>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub declare: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TSInterfaceDeclaration {
    #[serde(flatten)]
    pub base: BaseNode,
    pub id: Identifier,
    pub body: RawNode,
    #[serde(
        default,
        skip_serializing_if = "Option::is_none",
        rename = "typeParameters"
    )]
    pub type_parameters: Option<RawNode>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub extends: Option<Vec<RawNode>>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub declare: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TSEnumDeclaration {
    #[serde(flatten)]
    pub base: BaseNode,
    pub id: Identifier,
    pub members: Vec<RawNode>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub declare: Option<bool>,
    #[serde(default, skip_serializing_if = "Option::is_none", rename = "const")]
    pub is_const: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TSModuleDeclaration {
    #[serde(flatten)]
    pub base: BaseNode,
    pub id: RawNode,
    pub body: RawNode,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub declare: Option<bool>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub global: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TSDeclareFunction {
    #[serde(flatten)]
    pub base: BaseNode,
    pub id: Option<Identifier>,
    pub params: Vec<RawNode>,
    #[serde(default, skip_serializing_if = "Option::is_none", rename = "async")]
    pub is_async: Option<bool>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub declare: Option<bool>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub generator: Option<bool>,
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
}

// Flow declarations (pass-through)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TypeAlias {
    #[serde(flatten)]
    pub base: BaseNode,
    pub id: Identifier,
    pub right: RawNode,
    #[serde(default, rename = "typeParameters")]
    pub type_parameters: Option<RawNode>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OpaqueType {
    #[serde(flatten)]
    pub base: BaseNode,
    pub id: Identifier,
    #[serde(rename = "supertype")]
    pub supertype: Option<RawNode>,
    pub impltype: RawNode,
    #[serde(
        default,
        skip_serializing_if = "Option::is_none",
        rename = "typeParameters"
    )]
    pub type_parameters: Option<RawNode>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InterfaceDeclaration {
    #[serde(flatten)]
    pub base: BaseNode,
    pub id: Identifier,
    pub body: RawNode,
    #[serde(
        default,
        skip_serializing_if = "Option::is_none",
        rename = "typeParameters"
    )]
    pub type_parameters: Option<RawNode>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub extends: Option<Vec<RawNode>>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub mixins: Option<Vec<RawNode>>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub implements: Option<Vec<RawNode>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeclareVariable {
    #[serde(flatten)]
    pub base: BaseNode,
    pub id: Identifier,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeclareFunction {
    #[serde(flatten)]
    pub base: BaseNode,
    pub id: Identifier,
    #[serde(
        default,
        skip_serializing_if = "Option::is_none",
        deserialize_with = "crate::common::nullable_value"
    )]
    pub predicate: Option<RawNode>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeclareClass {
    #[serde(flatten)]
    pub base: BaseNode,
    pub id: Identifier,
    pub body: RawNode,
    #[serde(
        default,
        skip_serializing_if = "Option::is_none",
        rename = "typeParameters"
    )]
    pub type_parameters: Option<RawNode>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub extends: Option<Vec<RawNode>>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub mixins: Option<Vec<RawNode>>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub implements: Option<Vec<RawNode>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeclareModule {
    #[serde(flatten)]
    pub base: BaseNode,
    pub id: RawNode,
    pub body: RawNode,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub kind: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeclareModuleExports {
    #[serde(flatten)]
    pub base: BaseNode,
    #[serde(rename = "typeAnnotation")]
    pub type_annotation: RawNode,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeclareExportDeclaration {
    #[serde(flatten)]
    pub base: BaseNode,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub declaration: Option<RawNode>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub specifiers: Option<Vec<RawNode>>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub source: Option<StringLiteral>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub default: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeclareExportAllDeclaration {
    #[serde(flatten)]
    pub base: BaseNode,
    pub source: StringLiteral,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeclareInterface {
    #[serde(flatten)]
    pub base: BaseNode,
    pub id: Identifier,
    pub body: RawNode,
    #[serde(
        default,
        skip_serializing_if = "Option::is_none",
        rename = "typeParameters"
    )]
    pub type_parameters: Option<RawNode>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub extends: Option<Vec<RawNode>>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub mixins: Option<Vec<RawNode>>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub implements: Option<Vec<RawNode>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeclareTypeAlias {
    #[serde(flatten)]
    pub base: BaseNode,
    pub id: Identifier,
    pub right: RawNode,
    #[serde(
        default,
        skip_serializing_if = "Option::is_none",
        rename = "typeParameters"
    )]
    pub type_parameters: Option<RawNode>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeclareOpaqueType {
    #[serde(flatten)]
    pub base: BaseNode,
    pub id: Identifier,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub supertype: Option<RawNode>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub impltype: Option<RawNode>,
    #[serde(
        default,
        skip_serializing_if = "Option::is_none",
        rename = "typeParameters"
    )]
    pub type_parameters: Option<RawNode>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EnumDeclaration {
    #[serde(flatten)]
    pub base: BaseNode,
    pub id: Identifier,
    pub body: RawNode,
}
