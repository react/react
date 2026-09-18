use std::path::PathBuf;

fn get_fixture_json_dir() -> PathBuf {
    if let Ok(dir) = std::env::var("FIXTURE_JSON_DIR") {
        return PathBuf::from(dir);
    }
    // Default: fixtures checked in alongside the test
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("tests/fixtures")
}

/// Recursively sort all keys in a JSON value for order-independent comparison.
fn normalize_json(value: &serde_json::Value) -> serde_json::Value {
    match value {
        serde_json::Value::Object(map) => {
            let mut sorted: Vec<(String, serde_json::Value)> = map
                .iter()
                .map(|(k, v)| (k.clone(), normalize_json(v)))
                .collect();
            sorted.sort_by(|a, b| a.0.cmp(&b.0));
            serde_json::Value::Object(sorted.into_iter().collect())
        }
        serde_json::Value::Array(arr) => {
            serde_json::Value::Array(arr.iter().map(normalize_json).collect())
        }
        // Normalize numbers: f64 values like 1.0 should compare equal to integer 1
        serde_json::Value::Number(n) => {
            if let Some(f) = n.as_f64() {
                if f.fract() == 0.0 && f.is_finite() && f.abs() < (i64::MAX as f64) {
                    serde_json::Value::Number(serde_json::Number::from(f as i64))
                } else {
                    value.clone()
                }
            } else {
                value.clone()
            }
        }
        other => other.clone(),
    }
}

fn compute_diff(original: &str, round_tripped: &str) -> String {
    use similar::ChangeTag;
    use similar::TextDiff;

    let diff = TextDiff::from_lines(original, round_tripped);
    let mut output = String::new();
    let mut lines_written = 0;
    const MAX_DIFF_LINES: usize = 50;

    for change in diff.iter_all_changes() {
        if lines_written >= MAX_DIFF_LINES {
            output.push_str("... (diff truncated)\n");
            break;
        }
        let sign = match change.tag() {
            ChangeTag::Delete => "-",
            ChangeTag::Insert => "+",
            ChangeTag::Equal => continue,
        };
        output.push_str(&format!("{sign} {change}"));
        lines_written += 1;
    }

    output
}

#[test]
fn round_trip_all_fixtures() {
    let json_dir = get_fixture_json_dir();

    let mut failures: Vec<(String, String)> = Vec::new();
    let mut total = 0;
    let mut passed = 0;

    // Fixtures with known issues that can't be fixed in the AST crate:
    // - lone-surrogate-string-values: contains lone Unicode surrogates (\uD800)
    //   that serde_json rejects during deserialization.
    let known_failures: &[&str] = &["lone-surrogate-string-values"];

    for entry in walkdir::WalkDir::new(&json_dir)
        .into_iter()
        .filter_map(|e| e.ok())
        .filter(|e| {
            e.path().extension().is_some_and(|ext| ext == "json")
                && !e.path().to_string_lossy().ends_with(".scope.json")
                && !e.path().to_string_lossy().ends_with(".renamed.json")
        })
    {
        let fixture_name = entry
            .path()
            .strip_prefix(&json_dir)
            .unwrap()
            .display()
            .to_string();
        let original_json = std::fs::read_to_string(entry.path()).unwrap();

        if known_failures.iter().any(|kf| fixture_name.contains(kf)) {
            continue;
        }

        total += 1;

        // Deserialize into our Rust types
        let ast: react_compiler_ast::File = match serde_json::from_str(&original_json) {
            Ok(ast) => ast,
            Err(e) => {
                failures.push((fixture_name, format!("Deserialization error: {e}")));
                continue;
            }
        };

        // Re-serialize back to JSON
        let round_tripped = serde_json::to_string_pretty(&ast).unwrap();

        // Normalize and compare
        let original_value: serde_json::Value = serde_json::from_str(&original_json).unwrap();
        let round_tripped_value: serde_json::Value = serde_json::from_str(&round_tripped).unwrap();

        let original_normalized = normalize_json(&original_value);
        let round_tripped_normalized = normalize_json(&round_tripped_value);

        if original_normalized != round_tripped_normalized {
            let orig_str = serde_json::to_string_pretty(&original_normalized).unwrap();
            let rt_str = serde_json::to_string_pretty(&round_tripped_normalized).unwrap();
            let diff = compute_diff(&orig_str, &rt_str);
            failures.push((fixture_name, diff));
        } else {
            passed += 1;
        }
    }

    println!("\n{passed}/{total} fixtures passed round-trip");

    if !failures.is_empty() {
        let show_count = failures.len().min(5);
        let mut msg = format!(
            "\n{} of {total} fixtures failed round-trip (showing first {show_count}):\n\n",
            failures.len()
        );
        for (name, diff) in failures.iter().take(show_count) {
            msg.push_str(&format!("--- {name} ---\n{diff}\n\n"));
        }
        if failures.len() > show_count {
            msg.push_str(&format!(
                "... and {} more failures\n",
                failures.len() - show_count
            ));
        }
        panic!("{msg}");
    }
}
