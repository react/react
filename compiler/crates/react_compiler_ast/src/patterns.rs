use serde::{Deserialize, Serialize};

use crate::common::BaseNode;
use crate::common::RawNode;
use crate::expressions::{Expression, Identifier};

/// Covers assignment targets and patterns.
/// In Babel, LVal includes Identifier, MemberExpression, ObjectPattern, ArrayPattern,
/// RestElement, AssignmentPattern.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum PatternLike {
    Identifier(Identifier),
    ObjectPattern(ObjectPattern),
    ArrayPattern(ArrayPattern),
    AssignmentPattern(AssignmentPattern),
    RestElement(RestElement),
    // Expressions can appear in pattern positions (e.g., MemberExpression as LVal)
    MemberExpression(crate::expressions::MemberExpression),
    TSAsExpression(crate::expressions::TSAsExpression),
    TSSatisfiesExpression(crate::expressions::TSSatisfiesExpression),
    TSNonNullExpression(crate::expressions::TSNonNullExpression),
    TSTypeAssertion(crate::expressions::TSTypeAssertion),
    // Flow's analogue of the TS cast wrappers: `(expr: SomeType)`.
    TypeCastExpression(crate::expressions::TypeCastExpression),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ObjectPattern {
    #[serde(flatten)]
    pub base: BaseNode,
    pub properties: Vec<ObjectPatternProperty>,
    #[serde(
        default,
        skip_serializing_if = "Option::is_none",
        rename = "typeAnnotation"
    )]
    pub type_annotation: Option<RawNode>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub decorators: Option<Vec<RawNode>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum ObjectPatternProperty {
    ObjectProperty(ObjectPatternProp),
    RestElement(RestElement),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ObjectPatternProp {
    #[serde(flatten)]
    pub base: BaseNode,
    pub key: Box<Expression>,
    pub value: Box<PatternLike>,
    pub computed: bool,
    pub shorthand: bool,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub decorators: Option<Vec<RawNode>>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub method: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ArrayPattern {
    #[serde(flatten)]
    pub base: BaseNode,
    pub elements: Vec<Option<PatternLike>>,
    #[serde(
        default,
        skip_serializing_if = "Option::is_none",
        rename = "typeAnnotation"
    )]
    pub type_annotation: Option<RawNode>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub decorators: Option<Vec<RawNode>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AssignmentPattern {
    #[serde(flatten)]
    pub base: BaseNode,
    pub left: Box<PatternLike>,
    pub right: Box<Expression>,
    #[serde(
        default,
        skip_serializing_if = "Option::is_none",
        rename = "typeAnnotation"
    )]
    pub type_annotation: Option<RawNode>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub decorators: Option<Vec<RawNode>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RestElement {
    #[serde(flatten)]
    pub base: BaseNode,
    pub argument: Box<PatternLike>,
    #[serde(
        default,
        skip_serializing_if = "Option::is_none",
        rename = "typeAnnotation"
    )]
    pub type_annotation: Option<RawNode>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub decorators: Option<Vec<RawNode>>,
}
