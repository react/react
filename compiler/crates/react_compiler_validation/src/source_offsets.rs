// Copyright (c) Meta Platforms, Inc. and affiliates.
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

//! Conversion between the UTF-16 code unit offsets carried by Babel/JS
//! `SourceLocation` and the UTF-8 byte offsets that Rust string slicing uses.

/// Babel/JS `loc` indices are UTF-16 code unit offsets, but Rust strings are
/// UTF-8. Converts a UTF-16 offset to a byte offset, returning None if the
/// offset is out of range or splits a surrogate pair.
pub(crate) fn utf16_offset_to_byte(code: &str, target: usize) -> Option<usize> {
    let mut utf16 = 0usize;
    for (byte_idx, ch) in code.char_indices() {
        if utf16 == target {
            return Some(byte_idx);
        }
        if utf16 > target {
            return None; // target fell inside a surrogate pair
        }
        utf16 += ch.len_utf16();
    }
    (utf16 == target).then_some(code.len())
}

/// Slices `code` by a UTF-16 code unit range, returning None if either offset
/// is out of range or splits a surrogate pair.
pub(crate) fn slice_by_utf16_range(
    code: &str,
    start_utf16: usize,
    end_utf16: usize,
) -> Option<&str> {
    if start_utf16 >= end_utf16 {
        return None;
    }
    let start = utf16_offset_to_byte(code, start_utf16)?;
    // The prefix contributes exactly start_utf16 units, so the delta is valid
    // relative to the remainder — avoids rescanning from byte 0.
    let end = start + utf16_offset_to_byte(&code[start..], end_utf16 - start_utf16)?;
    Some(&code[start..end])
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn ascii_offsets_are_byte_offsets() {
        let code = "const setState = 0;";
        assert_eq!(utf16_offset_to_byte(code, 0), Some(0));
        assert_eq!(utf16_offset_to_byte(code, 6), Some(6));
        assert_eq!(slice_by_utf16_range(code, 6, 14), Some("setState"));
    }

    #[test]
    fn bmp_characters_take_three_bytes_and_one_unit() {
        // Each BMP character here is 3 bytes in UTF-8 but 1 UTF-16 code unit.
        let code = "// 日本語\nsetState";
        assert_eq!(utf16_offset_to_byte(code, 3), Some(3));
        assert_eq!(utf16_offset_to_byte(code, 6), Some(12));
        assert_eq!(slice_by_utf16_range(code, 7, 15), Some("setState"));
    }

    #[test]
    fn astral_characters_take_two_units() {
        // A surrogate pair is 4 bytes in UTF-8 and 2 UTF-16 code units, so an
        // implementation counting characters instead of code units diverges here.
        let code = "🎉🎉setState";
        assert_eq!(utf16_offset_to_byte(code, 2), Some(4));
        assert_eq!(utf16_offset_to_byte(code, 4), Some(8));
        assert_eq!(slice_by_utf16_range(code, 4, 12), Some("setState"));
    }

    #[test]
    fn offset_inside_a_surrogate_pair_is_rejected() {
        let code = "🎉setState";
        assert_eq!(utf16_offset_to_byte(code, 1), None);
        assert_eq!(slice_by_utf16_range(code, 1, 10), None);
    }

    #[test]
    fn offset_at_end_of_string_resolves() {
        let code = "🎉ab";
        assert_eq!(utf16_offset_to_byte(code, 4), Some(code.len()));
        assert_eq!(slice_by_utf16_range(code, 2, 4), Some("ab"));
    }

    #[test]
    fn out_of_range_offset_is_rejected() {
        let code = "ab";
        assert_eq!(utf16_offset_to_byte(code, 3), None);
        assert_eq!(slice_by_utf16_range(code, 0, 5), None);
    }

    #[test]
    fn empty_and_inverted_ranges_are_rejected() {
        let code = "setState";
        assert_eq!(slice_by_utf16_range(code, 3, 3), None);
        assert_eq!(slice_by_utf16_range(code, 5, 2), None);
    }
}
