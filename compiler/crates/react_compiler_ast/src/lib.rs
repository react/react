pub mod common;
pub mod declarations;
pub mod expressions;
pub mod jsx;
pub mod literals;
pub mod operators;
pub mod patterns;
pub mod scope;
pub mod statements;
pub mod visitor;

use serde::{Deserialize, Serialize};

use crate::common::{BaseNode, Comment};
use crate::statements::{Directive, Statement};

/// The root type returned by @babel/parser
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct File {
    #[serde(flatten)]
    pub base: BaseNode,
    pub program: Program,
    #[serde(default)]
    pub comments: Vec<Comment>,
    #[serde(default)]
    pub errors: Vec<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Program {
    #[serde(flatten)]
    pub base: BaseNode,
    pub body: Vec<Statement>,
    #[serde(default)]
    pub directives: Vec<Directive>,
    #[serde(rename = "sourceType")]
    pub source_type: SourceType,
    #[serde(default)]
    pub interpreter: Option<InterpreterDirective>,
    #[serde(
        rename = "sourceFile",
        default,
        skip_serializing_if = "Option::is_none"
    )]
    pub source_file: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum SourceType {
    Module,
    Script,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InterpreterDirective {
    #[serde(flatten)]
    pub base: BaseNode,
    pub value: String,
}
