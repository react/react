use serde::{Deserialize, Serialize};

use crate::common::BaseNode;
use crate::common::RawNode;
use crate::expressions::Expression;
use crate::literals::StringLiteral;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JSXElement {
    #[serde(flatten)]
    pub base: BaseNode,
    #[serde(rename = "openingElement")]
    pub opening_element: JSXOpeningElement,
    #[serde(rename = "closingElement")]
    pub closing_element: Option<JSXClosingElement>,
    pub children: Vec<JSXChild>,
    #[serde(
        rename = "selfClosing",
        default,
        skip_serializing_if = "Option::is_none"
    )]
    pub self_closing: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JSXFragment {
    #[serde(flatten)]
    pub base: BaseNode,
    #[serde(rename = "openingFragment")]
    pub opening_fragment: JSXOpeningFragment,
    #[serde(rename = "closingFragment")]
    pub closing_fragment: JSXClosingFragment,
    pub children: Vec<JSXChild>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JSXOpeningElement {
    #[serde(flatten)]
    pub base: BaseNode,
    pub name: JSXElementName,
    pub attributes: Vec<JSXAttributeItem>,
    #[serde(rename = "selfClosing")]
    pub self_closing: bool,
    #[serde(
        default,
        skip_serializing_if = "Option::is_none",
        rename = "typeParameters"
    )]
    pub type_parameters: Option<RawNode>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JSXClosingElement {
    #[serde(flatten)]
    pub base: BaseNode,
    pub name: JSXElementName,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JSXOpeningFragment {
    #[serde(flatten)]
    pub base: BaseNode,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JSXClosingFragment {
    #[serde(flatten)]
    pub base: BaseNode,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum JSXElementName {
    JSXIdentifier(JSXIdentifier),
    JSXMemberExpression(JSXMemberExpression),
    JSXNamespacedName(JSXNamespacedName),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum JSXChild {
    JSXElement(Box<JSXElement>),
    JSXFragment(JSXFragment),
    JSXExpressionContainer(JSXExpressionContainer),
    JSXSpreadChild(JSXSpreadChild),
    JSXText(JSXText),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum JSXAttributeItem {
    JSXAttribute(JSXAttribute),
    JSXSpreadAttribute(JSXSpreadAttribute),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JSXAttribute {
    #[serde(flatten)]
    pub base: BaseNode,
    pub name: JSXAttributeName,
    pub value: Option<JSXAttributeValue>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum JSXAttributeName {
    JSXIdentifier(JSXIdentifier),
    JSXNamespacedName(JSXNamespacedName),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum JSXAttributeValue {
    StringLiteral(StringLiteral),
    JSXExpressionContainer(JSXExpressionContainer),
    JSXElement(Box<JSXElement>),
    JSXFragment(JSXFragment),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JSXSpreadAttribute {
    #[serde(flatten)]
    pub base: BaseNode,
    pub argument: Box<Expression>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JSXExpressionContainer {
    #[serde(flatten)]
    pub base: BaseNode,
    pub expression: JSXExpressionContainerExpr,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum JSXExpressionContainerExpr {
    JSXEmptyExpression(JSXEmptyExpression),
    #[serde(untagged)]
    Expression(Box<Expression>),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JSXSpreadChild {
    #[serde(flatten)]
    pub base: BaseNode,
    pub expression: Box<Expression>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JSXText {
    #[serde(flatten)]
    pub base: BaseNode,
    pub value: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JSXEmptyExpression {
    #[serde(flatten)]
    pub base: BaseNode,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JSXIdentifier {
    #[serde(flatten)]
    pub base: BaseNode,
    pub name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JSXMemberExpression {
    #[serde(flatten)]
    pub base: BaseNode,
    pub object: Box<JSXMemberExprObject>,
    pub property: JSXIdentifier,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum JSXMemberExprObject {
    JSXIdentifier(JSXIdentifier),
    JSXMemberExpression(Box<JSXMemberExpression>),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JSXNamespacedName {
    #[serde(flatten)]
    pub base: BaseNode,
    pub namespace: JSXIdentifier,
    pub name: JSXIdentifier,
}
