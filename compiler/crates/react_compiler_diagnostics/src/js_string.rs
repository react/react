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

/// Invariant: `Repr::Utf8` holds every well-formed value and `Repr::Wtf16`
/// only ill-formed ones (at least one unpaired surrogate). The derived
/// `PartialEq`/`Hash` are only sound under this invariant: a well-formed
/// value smuggled into `Wtf16` would compare unequal to its `Utf8` twin. The
/// representation is private so the invariant holds by construction; match on
/// [`JsString::as_ref`] to branch on well-formedness.
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub struct JsString(Repr);

#[derive(Debug, Clone, PartialEq, Eq, Hash)]
enum Repr {
    /// A well-formed string (no unpaired surrogates), stored as UTF-8.
    Utf8(String),
    /// An ill-formed string, stored as UTF-16 code units.
    Wtf16(Vec<u16>),
}

/// Borrowed view of a [`JsString`] for callers that need to branch on
/// well-formedness.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum JsStringRef<'a> {
    Utf8(&'a str),
    Wtf16(&'a [u16]),
}

impl JsString {
    /// Build from UTF-16 code units, normalizing to UTF-8 when well-formed.
    pub fn from_code_units(units: Vec<u16>) -> Self {
        match String::from_utf16(&units) {
            Ok(s) => JsString(Repr::Utf8(s)),
            Err(_) => JsString(Repr::Wtf16(units)),
        }
    }

    pub fn as_ref(&self) -> JsStringRef<'_> {
        match &self.0 {
            Repr::Utf8(s) => JsStringRef::Utf8(s),
            Repr::Wtf16(units) => JsStringRef::Wtf16(units),
        }
    }

    /// The UTF-8 view, when the value is well-formed.
    pub fn as_str(&self) -> Option<&str> {
        match &self.0 {
            Repr::Utf8(s) => Some(s),
            Repr::Wtf16(_) => None,
        }
    }

    pub fn code_units(&self) -> Vec<u16> {
        match &self.0 {
            Repr::Utf8(s) => s.encode_utf16().collect(),
            Repr::Wtf16(units) => units.clone(),
        }
    }

    /// Length in UTF-16 code units (JS `String.prototype.length`).
    pub fn len_utf16(&self) -> usize {
        match &self.0 {
            Repr::Utf8(s) => s.encode_utf16().count(),
            Repr::Wtf16(units) => units.len(),
        }
    }

    /// The value with unpaired surrogates replaced by U+FFFD, for consumers
    /// whose string type cannot represent ill-formed values.
    pub fn to_string_lossy(&self) -> String {
        match &self.0 {
            Repr::Utf8(s) => s.clone(),
            Repr::Wtf16(units) => String::from_utf16_lossy(units),
        }
    }

    /// Decode the bridge wire form: a UTF-8 string in which lone surrogates
    /// appear as `__SURROGATE_XXXX__` markers (uppercase hex, mirroring what
    /// `sanitizeJsonSurrogates` emits and `restoreJsonSurrogates` accepts).
    ///
    /// All scanning is byte-wise: a marker is 18 ASCII bytes, so byte-slice
    /// comparisons cannot land on a UTF-8 char boundary the way `str` range
    /// indexing can when multibyte text follows the prefix.
    pub fn from_marker_string(s: &str) -> Self {
        const PREFIX: &[u8] = b"__SURROGATE_";
        const MARKER_LEN: usize = 18;
        if !s.contains("__SURROGATE_") {
            return JsString(Repr::Utf8(s.to_string()));
        }
        let bytes = s.as_bytes();
        let mut units: Vec<u16> = Vec::with_capacity(s.len());
        let mut pos = 0;
        let mut segment_start = 0;
        while let Some(found) = s[pos..].find("__SURROGATE_") {
            let idx = pos + found;
            let tail = &bytes[idx..];
            let well_formed = tail.len() >= MARKER_LEN
                && &tail[MARKER_LEN - 2..MARKER_LEN] == b"__"
                && tail[PREFIX.len()..PREFIX.len() + 4]
                    .iter()
                    .all(|b| b.is_ascii_hexdigit() && !b.is_ascii_lowercase());
            if well_formed {
                let hex = std::str::from_utf8(&tail[PREFIX.len()..PREFIX.len() + 4])
                    .expect("ascii hex is valid utf8");
                let unit = u16::from_str_radix(hex, 16).expect("validated hex digits");
                units.extend(s[segment_start..idx].encode_utf16());
                units.push(unit);
                pos = idx + MARKER_LEN;
                segment_start = pos;
            } else {
                // Not a well-formed marker: keep the literal text and continue
                // scanning after the prefix.
                pos = idx + PREFIX.len();
            }
        }
        units.extend(s[segment_start..].encode_utf16());
        JsString::from_code_units(units)
    }

    /// Encode to the bridge wire form (markers for unpaired surrogates).
    pub fn to_marker_string(&self) -> String {
        match &self.0 {
            Repr::Utf8(s) => s.clone(),
            Repr::Wtf16(units) => {
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
        match &self.0 {
            Repr::Utf8(s) => s.clone(),
            Repr::Wtf16(units) => {
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
        // A Rust String is valid UTF-8 and so cannot contain an unpaired
        // surrogate; constructing Utf8 directly preserves the invariant.
        JsString(Repr::Utf8(s))
    }
}

impl From<&str> for JsString {
    fn from(s: &str) -> Self {
        JsString(Repr::Utf8(s.to_string()))
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
    use super::JsStringRef;

    #[test]
    fn as_ref_views_match_well_formedness() {
        assert!(matches!(
            JsString::from("plain").as_ref(),
            JsStringRef::Utf8("plain")
        ));
        assert!(matches!(
            JsString::from_code_units(vec![0xD83E]).as_ref(),
            JsStringRef::Wtf16(&[0xD83E])
        ));
        // Well-formed code units normalize to the Utf8 representation, so
        // equal logical strings are equal values regardless of how they
        // were constructed.
        assert_eq!(
            JsString::from_code_units("plain".encode_utf16().collect()),
            JsString::from("plain")
        );
    }

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

    #[test]
    fn multibyte_text_after_marker_prefix_does_not_panic() {
        let input = "__SURROGATE_\u{20AC}\u{20AC}";
        let js = JsString::from_marker_string(input);
        assert_eq!(js.as_str(), Some(input));

        let truncated = "__SURROGATE_D8";
        assert_eq!(
            JsString::from_marker_string(truncated).as_str(),
            Some(truncated)
        );

        let mixed = "a\u{20AC}__SURROGATE_D83E__b\u{20AC}";
        let js = JsString::from_marker_string(mixed);
        let mut expected: Vec<u16> = "a\u{20AC}".encode_utf16().collect();
        expected.push(0xD83E);
        expected.extend("b\u{20AC}".encode_utf16());
        assert_eq!(js.code_units(), expected);
    }

    #[test]
    fn lowercase_hex_markers_are_not_decoded() {
        // The bridge emits uppercase hex only; lowercase marker-shaped text is
        // user text and must survive verbatim.
        let input = "__SURROGATE_d83e__";
        assert_eq!(JsString::from_marker_string(input).as_str(), Some(input));
    }
}
