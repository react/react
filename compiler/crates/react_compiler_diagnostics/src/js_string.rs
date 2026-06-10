//! A JavaScript string value. JS strings are sequences of UTF-16 code units
//! with no validity requirement, so a value can contain unpaired surrogate
//! halves that Rust's `String` cannot represent. `JsString` keeps the common
//! valid case as UTF-8 and falls back to code units only when the value is
//! ill-formed, so the compiler computes on true program values instead of
//! replacement characters or escape hatches.
//!
//! Wire format: the babel bridge transports lone surrogates as
//! `__SURROGATE_XXXX__` markers (see `sanitizeJsonSurrogates` in bridge.ts),
//! because serde_json can neither parse nor emit a lone `\uXXXX` escape.
//! Serde for `JsString` decodes and re-emits that marker form, which keeps the
//! JS side of the bridge unchanged.

use std::fmt;

use serde::Deserialize;
use serde::Serialize;

#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum JsString {
    /// A well-formed string (no unpaired surrogates), stored as UTF-8.
    Utf8(String),
    /// An ill-formed string, stored as UTF-16 code units.
    Wtf16(Vec<u16>),
}

impl JsString {
    /// Build from UTF-16 code units, normalizing to `Utf8` when well-formed.
    pub fn from_code_units(units: Vec<u16>) -> Self {
        match String::from_utf16(&units) {
            Ok(s) => JsString::Utf8(s),
            Err(_) => JsString::Wtf16(units),
        }
    }

    /// The UTF-8 view, when the value is well-formed.
    pub fn as_str(&self) -> Option<&str> {
        match self {
            JsString::Utf8(s) => Some(s),
            JsString::Wtf16(_) => None,
        }
    }

    pub fn code_units(&self) -> Vec<u16> {
        match self {
            JsString::Utf8(s) => s.encode_utf16().collect(),
            JsString::Wtf16(units) => units.clone(),
        }
    }

    /// Length in UTF-16 code units (JS `String.prototype.length`).
    pub fn len_utf16(&self) -> usize {
        match self {
            JsString::Utf8(s) => s.encode_utf16().count(),
            JsString::Wtf16(units) => units.len(),
        }
    }

    /// The value with unpaired surrogates replaced by U+FFFD, for consumers
    /// whose string type cannot represent ill-formed values.
    pub fn to_string_lossy(&self) -> String {
        match self {
            JsString::Utf8(s) => s.clone(),
            JsString::Wtf16(units) => String::from_utf16_lossy(units),
        }
    }

    /// Decode the bridge wire form: a UTF-8 string in which lone surrogates
    /// appear as `__SURROGATE_XXXX__` markers.
    pub fn from_marker_string(s: &str) -> Self {
        if !s.contains("__SURROGATE_") {
            return JsString::Utf8(s.to_string());
        }
        let mut units: Vec<u16> = Vec::with_capacity(s.len());
        let mut rest = s;
        while let Some(idx) = rest.find("__SURROGATE_") {
            units.extend(rest[..idx].encode_utf16());
            let tail = &rest[idx..];
            // Marker shape: __SURROGATE_ + 4 hex digits + __
            if tail.len() >= 18 && &tail[16..18] == "__" {
                if let Ok(unit) = u16::from_str_radix(&tail[12..16], 16) {
                    units.push(unit);
                    rest = &tail[18..];
                    continue;
                }
            }
            // Not a well-formed marker: keep the literal text and move on.
            units.extend("__SURROGATE_".encode_utf16());
            rest = &tail["__SURROGATE_".len()..];
        }
        units.extend(rest.encode_utf16());
        JsString::from_code_units(units)
    }

    /// Encode to the bridge wire form (markers for unpaired surrogates).
    pub fn to_marker_string(&self) -> String {
        match self {
            JsString::Utf8(s) => s.clone(),
            JsString::Wtf16(units) => {
                let mut out = String::with_capacity(units.len() * 2);
                let mut iter = units.iter().copied().peekable();
                while let Some(unit) = iter.next() {
                    match unit {
                        0xD800..=0xDBFF => {
                            if let Some(&next) = iter.peek() {
                                if (0xDC00..=0xDFFF).contains(&next) {
                                    iter.next();
                                    let cp = 0x10000
                                        + ((unit as u32 - 0xD800) << 10)
                                        + (next as u32 - 0xDC00);
                                    out.push(char::from_u32(cp).expect("valid supplementary"));
                                    continue;
                                }
                            }
                            out.push_str(&format!("__SURROGATE_{unit:04X}__"));
                        }
                        0xDC00..=0xDFFF => {
                            out.push_str(&format!("__SURROGATE_{unit:04X}__"));
                        }
                        _ => {
                            out.push(
                                char::from_u32(unit as u32).expect("BMP non-surrogate is a char"),
                            );
                        }
                    }
                }
                out
            }
        }
    }

    /// Render as JS-source-style escaped text, matching the form TS's debug
    /// printer produces via JSON.stringify: unpaired surrogates print as
    /// lowercase `\udXXX` escapes inside the otherwise UTF-8 text.
    pub fn to_escaped_string(&self) -> String {
        match self {
            JsString::Utf8(s) => s.clone(),
            JsString::Wtf16(units) => {
                let mut out = String::with_capacity(units.len() * 2);
                let mut iter = units.iter().copied().peekable();
                while let Some(unit) = iter.next() {
                    match unit {
                        0xD800..=0xDBFF => {
                            if let Some(&next) = iter.peek() {
                                if (0xDC00..=0xDFFF).contains(&next) {
                                    iter.next();
                                    let cp = 0x10000
                                        + ((unit as u32 - 0xD800) << 10)
                                        + (next as u32 - 0xDC00);
                                    out.push(char::from_u32(cp).expect("valid supplementary"));
                                    continue;
                                }
                            }
                            out.push_str(&format!("\\u{unit:04x}"));
                        }
                        0xDC00..=0xDFFF => {
                            out.push_str(&format!("\\u{unit:04x}"));
                        }
                        _ => {
                            out.push(
                                char::from_u32(unit as u32).expect("BMP non-surrogate is a char"),
                            );
                        }
                    }
                }
                out
            }
        }
    }
}

impl From<String> for JsString {
    fn from(s: String) -> Self {
        JsString::Utf8(s)
    }
}

impl From<&str> for JsString {
    fn from(s: &str) -> Self {
        JsString::Utf8(s.to_string())
    }
}

impl PartialEq<str> for JsString {
    fn eq(&self, other: &str) -> bool {
        self.as_str() == Some(other)
    }
}

impl PartialEq<&str> for JsString {
    fn eq(&self, other: &&str) -> bool {
        self.as_str() == Some(*other)
    }
}

impl fmt::Display for JsString {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(&self.to_escaped_string())
    }
}

impl Serialize for JsString {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        serializer.serialize_str(&self.to_marker_string())
    }
}

impl<'de> Deserialize<'de> for JsString {
    fn deserialize<D: serde::Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        let s = String::deserialize(deserializer)?;
        Ok(JsString::from_marker_string(&s))
    }
}

#[cfg(test)]
mod tests {
    use super::JsString;

    #[test]
    fn marker_round_trip_preserves_lone_surrogates() {
        let js = JsString::from_marker_string("__SURROGATE_D83E__");
        assert_eq!(js.code_units(), vec![0xD83E]);
        assert_eq!(js.to_marker_string(), "__SURROGATE_D83E__");
        assert_eq!(js.to_escaped_string(), "\\ud83e");
    }

    #[test]
    fn paired_halves_render_as_the_supplementary_character() {
        let js = JsString::from_code_units(vec![0xD83E, 0xDD21]);
        assert_eq!(js.as_str(), Some("\u{1F921}"));
    }

    #[test]
    fn plain_strings_stay_utf8_and_compare_with_str() {
        let js = JsString::from("use memo");
        assert!(js == "use memo");
        assert_eq!(js.to_marker_string(), "use memo");
    }

    #[test]
    fn malformed_marker_text_is_kept_literally() {
        let js = JsString::from_marker_string("__SURROGATE_XYZ__");
        assert_eq!(js.as_str(), Some("__SURROGATE_XYZ__"));
    }
}
