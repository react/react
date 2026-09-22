use react_compiler_diagnostics::JsString;
use serde::{Deserialize, Serialize};

use crate::common::BaseNode;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StringLiteral {
    #[serde(flatten)]
    pub base: BaseNode,
    /// JS string values may contain unpaired surrogates; see [`JsString`].
    pub value: JsString,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(try_from = "NumericLiteralWire")]
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

/// Wire form of [`NumericLiteral`]. `JSON.stringify` writes non-finite numbers
/// as `null`, so a literal that overflows to Infinity (e.g. `1e999`) arrives
/// with `value: null` and its value has to be recovered from `extra.raw`.
#[derive(Deserialize)]
struct NumericLiteralWire {
    #[serde(flatten)]
    base: BaseNode,
    value: Option<f64>,
    #[serde(default)]
    extra: Option<NumericLiteralExtra>,
}

impl TryFrom<NumericLiteralWire> for NumericLiteral {
    type Error = &'static str;

    fn try_from(wire: NumericLiteralWire) -> Result<Self, Self::Error> {
        let value = match wire.value {
            Some(value) => value,
            None => wire
                .extra
                .as_ref()
                .and_then(|extra| extra.raw.parse::<f64>().ok())
                .ok_or("NumericLiteral has a non-finite value and no parseable raw text")?,
        };
        Ok(NumericLiteral {
            base: wire.base,
            value,
            extra: wire.extra,
        })
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

#[cfg(test)]
mod tests {
    use serde_json::json;

    use super::NumericLiteral;

    #[test]
    fn numeric_literal_recovers_infinity_from_raw() {
        let lit: NumericLiteral = serde_json::from_value(json!({
            "type": "NumericLiteral",
            "value": null,
            "extra": { "raw": "1e999", "rawValue": null }
        }))
        .unwrap();
        assert_eq!(lit.value, f64::INFINITY);
    }

    #[test]
    fn numeric_literal_rejects_null_without_raw() {
        let result = serde_json::from_value::<NumericLiteral>(json!({
            "type": "NumericLiteral",
            "value": null
        }));
        assert!(result.is_err());
    }
}
