use serde::{Deserialize, Serialize};

use crate::common::BaseNode;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StringLiteral {
    #[serde(flatten)]
    pub base: BaseNode,
    pub value: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NumericLiteral {
    #[serde(flatten)]
    pub base: BaseNode,
    pub value: f64,
    /// Babel's extra field containing the raw source text.
    /// Used to recover exact f64 values that serde_json may parse imprecisely.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub extra: Option<NumericLiteralExtra>,
}

impl NumericLiteral {
    /// Get the f64 value, preferring re-parsing from `extra.raw` when available
    /// to avoid serde_json float parsing precision issues.
    pub fn precise_value(&self) -> f64 {
        if let Some(extra) = &self.extra {
            if let Ok(v) = extra.raw.parse::<f64>() {
                return v;
            }
        }
        self.value
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NumericLiteralExtra {
    pub raw: String,
    #[serde(default, rename = "rawValue")]
    pub raw_value: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BooleanLiteral {
    #[serde(flatten)]
    pub base: BaseNode,
    pub value: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NullLiteral {
    #[serde(flatten)]
    pub base: BaseNode,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BigIntLiteral {
    #[serde(flatten)]
    pub base: BaseNode,
    pub value: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RegExpLiteral {
    #[serde(flatten)]
    pub base: BaseNode,
    pub pattern: String,
    pub flags: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TemplateElement {
    #[serde(flatten)]
    pub base: BaseNode,
    pub value: TemplateElementValue,
    pub tail: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TemplateElementValue {
    pub raw: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub cooked: Option<String>,
}
