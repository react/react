pub mod code_frame;
pub mod js_string;

pub use js_string::JsString;

use serde::{Deserialize, Serialize};

/// Error categories matching the TS ErrorCategory enum
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum ErrorCategory {
    Hooks,
    CapitalizedCalls,
    StaticComponents,
    UseMemo,
    VoidUseMemo,
    PreserveManualMemo,
    MemoDependencies,
    IncompatibleLibrary,
    Immutability,
    Globals,
    Refs,
    EffectDependencies,
    EffectExhaustiveDependencies,
    EffectSetState,
    EffectDerivationsOfState,
    ErrorBoundaries,
    Purity,
    RenderSetState,
    Invariant,
    Todo,
    Syntax,
    UnsupportedSyntax,
    Config,
    Gating,
    Suppression,
    FBT,
}

/// Error severity levels
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum ErrorSeverity {
    Error,
    Warning,
    Hint,
    Off,
}

impl ErrorCategory {
    pub fn severity(&self) -> ErrorSeverity {
        match self {
            // These map to "Compilation Skipped" (Warning severity)
            ErrorCategory::EffectDependencies
            | ErrorCategory::IncompatibleLibrary
            | ErrorCategory::PreserveManualMemo
            | ErrorCategory::UnsupportedSyntax => ErrorSeverity::Warning,

            // Todo is Hint
            ErrorCategory::Todo => ErrorSeverity::Hint,

            // Invariant and all others are Error severity
            _ => ErrorSeverity::Error,
        }
    }

    /// The severity to use in logged output, matching the TS compiler's
    /// `getRuleForCategory()`. This may differ from the internal `severity()`
    /// used for panicThreshold logic. In particular, `PreserveManualMemo` is
    /// `Warning` internally (so it doesn't trigger panicThreshold throws) but
    /// `Error` in logged output (matching TS behavior).
    pub fn logged_severity(&self) -> ErrorSeverity {
        match self {
            ErrorCategory::PreserveManualMemo => ErrorSeverity::Error,
            _ => self.severity(),
        }
    }
}

/// Suggestion operations for auto-fixes
#[derive(Debug, Clone, Serialize)]
pub enum CompilerSuggestionOperation {
    InsertBefore,
    InsertAfter,
    Remove,
    Replace,
}

/// A compiler suggestion for fixing an error
#[derive(Debug, Clone, Serialize)]
pub struct CompilerSuggestion {
    pub op: CompilerSuggestionOperation,
    pub range: (usize, usize),
    pub description: String,
    pub text: Option<String>, // None for Remove operations
}

/// Source location (matches Babel's SourceLocation format)
/// This is the HIR source location, separate from AST's BaseNode location.
/// GeneratedSource is represented as None.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct SourceLocation {
    pub start: Position,
    pub end: Position,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct Position {
    pub line: u32,
    pub column: u32,
    /// Byte offset in the source file. Preserved for logger event serialization.
    #[serde(default, skip_serializing)]
    pub index: Option<u32>,
}

/// Sentinel value for generated/synthetic source locations
pub const GENERATED_SOURCE: Option<SourceLocation> = None;

/// Detail for a diagnostic
#[derive(Debug, Clone, Serialize)]
pub enum CompilerDiagnosticDetail {
    Error {
        loc: Option<SourceLocation>,
        message: Option<String>,
        /// The identifier name from the AST source location, if this error
        /// points to an identifier node. Preserved for logger event serialization
        /// to match Babel's SourceLocation.identifierName field.
        #[serde(skip)]
        identifier_name: Option<String>,
    },
    Hint {
        message: String,
    },
}

/// A single compiler diagnostic (new-style)
#[derive(Debug, Clone)]
pub struct CompilerDiagnostic {
    pub category: ErrorCategory,
    pub reason: String,
    pub description: Option<String>,
    pub details: Vec<CompilerDiagnosticDetail>,
    pub suggestions: Option<Vec<CompilerSuggestion>>,
}

impl CompilerDiagnostic {
    pub fn new(
        category: ErrorCategory,
        reason: impl Into<String>,
        description: Option<String>,
    ) -> Self {
        Self {
            category,
            reason: reason.into(),
            description,
            details: Vec::new(),
            suggestions: None,
        }
    }

    pub fn severity(&self) -> ErrorSeverity {
        self.category.severity()
    }

    pub fn logged_severity(&self) -> ErrorSeverity {
        self.category.logged_severity()
    }

    pub fn with_detail(mut self, detail: CompilerDiagnosticDetail) -> Self {
        self.details.push(detail);
        self
    }

    /// Create a Todo diagnostic (matches TS `CompilerError.throwTodo()`).
    pub fn todo(reason: impl Into<String>, loc: Option<SourceLocation>) -> Self {
        let reason = reason.into();
        let mut diag = Self::new(ErrorCategory::Todo, reason.clone(), None);
        diag.details.push(CompilerDiagnosticDetail::Error {
            loc,
            message: Some(reason),
            identifier_name: None,
        });
        diag
    }

    /// Create a diagnostic from a CompilerErrorDetail.
    pub fn from_detail(detail: CompilerErrorDetail) -> Self {
        Self::new(
            detail.category,
            detail.reason.clone(),
            detail.description.clone(),
        )
        .with_detail(CompilerDiagnosticDetail::Error {
            loc: detail.loc,
            message: Some(detail.reason),
            identifier_name: None,
        })
    }

    pub fn primary_location(&self) -> Option<&SourceLocation> {
        self.details.iter().find_map(|d| match d {
            CompilerDiagnosticDetail::Error { loc, .. } => loc.as_ref(), // identifier_name covered by ..
            _ => None,
        })
    }
}

/// Legacy-style error detail (matches CompilerErrorDetail in TS)
#[derive(Debug, Clone, Serialize)]
pub struct CompilerErrorDetail {
    pub category: ErrorCategory,
    pub reason: String,
    pub description: Option<String>,
    pub loc: Option<SourceLocation>,
    pub suggestions: Option<Vec<CompilerSuggestion>>,
}

impl CompilerErrorDetail {
    pub fn new(category: ErrorCategory, reason: impl Into<String>) -> Self {
        Self {
            category,
            reason: reason.into(),
            description: None,
            loc: None,
            suggestions: None,
        }
    }

    pub fn with_description(mut self, description: impl Into<String>) -> Self {
        self.description = Some(description.into());
        self
    }

    pub fn with_loc(mut self, loc: Option<SourceLocation>) -> Self {
        self.loc = loc;
        self
    }

    pub fn severity(&self) -> ErrorSeverity {
        self.category.severity()
    }

    pub fn logged_severity(&self) -> ErrorSeverity {
        self.category.logged_severity()
    }
}

/// Aggregate compiler error - can contain multiple diagnostics.
/// This is the main error type thrown/returned by the compiler.
#[derive(Debug, Clone)]
pub struct CompilerError {
    pub details: Vec<CompilerErrorOrDiagnostic>,
    /// When false, this error was accumulated on the Environment via
    /// `record_error()` / `record_diagnostic()` and returned at the end
    /// of the pipeline. In TS, `CompileUnexpectedThrow` is only emitted
    /// for errors that are **thrown** (not accumulated). Defaults to `true`
    /// because errors created directly (e.g., via `?` from a pass) are
    /// analogous to thrown errors in the TS code.
    pub is_thrown: bool,
}

/// Either a new-style diagnostic or legacy error detail
#[derive(Debug, Clone)]
pub enum CompilerErrorOrDiagnostic {
    Diagnostic(CompilerDiagnostic),
    ErrorDetail(CompilerErrorDetail),
}

impl CompilerErrorOrDiagnostic {
    pub fn severity(&self) -> ErrorSeverity {
        match self {
            Self::Diagnostic(d) => d.severity(),
            Self::ErrorDetail(d) => d.severity(),
        }
    }

    pub fn logged_severity(&self) -> ErrorSeverity {
        match self {
            Self::Diagnostic(d) => d.logged_severity(),
            Self::ErrorDetail(d) => d.logged_severity(),
        }
    }
}

impl CompilerError {
    pub fn new() -> Self {
        Self {
            details: Vec::new(),
            is_thrown: true,
        }
    }

    pub fn push_diagnostic(&mut self, diagnostic: CompilerDiagnostic) {
        if diagnostic.severity() != ErrorSeverity::Off {
            self.details
                .push(CompilerErrorOrDiagnostic::Diagnostic(diagnostic));
        }
    }

    pub fn push_error_detail(&mut self, detail: CompilerErrorDetail) {
        if detail.severity() != ErrorSeverity::Off {
            self.details
                .push(CompilerErrorOrDiagnostic::ErrorDetail(detail));
        }
    }

    pub fn has_errors(&self) -> bool {
        self.details
            .iter()
            .any(|d| d.severity() == ErrorSeverity::Error)
    }

    pub fn has_any_errors(&self) -> bool {
        !self.details.is_empty()
    }

    /// Check if any error detail has Invariant category.
    pub fn has_invariant_errors(&self) -> bool {
        self.details.iter().any(|d| {
            let cat = match d {
                CompilerErrorOrDiagnostic::Diagnostic(d) => d.category,
                CompilerErrorOrDiagnostic::ErrorDetail(d) => d.category,
            };
            cat == ErrorCategory::Invariant
        })
    }

    pub fn merge(&mut self, other: CompilerError) {
        self.details.extend(other.details);
    }

    /// Check if all error details are non-invariant.
    /// In TS, this is used to determine if an error thrown during compilation
    /// should be logged as CompileUnexpectedThrow.
    pub fn is_all_non_invariant(&self) -> bool {
        self.details.iter().all(|d| {
            let cat = match d {
                CompilerErrorOrDiagnostic::Diagnostic(d) => d.category,
                CompilerErrorOrDiagnostic::ErrorDetail(d) => d.category,
            };
            cat != ErrorCategory::Invariant
        })
    }

    /// Format as a string matching the TS `CompilerError.toString()` output.
    /// Used for the `data` field of `CompileUnexpectedThrow` events.
    ///
    /// Format per detail: `"Category: reason. Description. (line:column)"`
    /// Multiple details are joined with `"\n\n"`.
    pub fn to_string_for_event(&self) -> String {
        self.details
            .iter()
            .map(|d| {
                let (category, reason, description, loc) = match d {
                    CompilerErrorOrDiagnostic::Diagnostic(d) => {
                        let loc = d.primary_location().cloned();
                        (d.category, &d.reason, &d.description, loc)
                    }
                    CompilerErrorOrDiagnostic::ErrorDetail(d) => {
                        (d.category, &d.reason, &d.description, d.loc)
                    }
                };
                let mut buf = format!("{}: {}", format_category_heading(category), reason);
                if let Some(desc) = description {
                    buf.push_str(&format!(". {}.", desc));
                }
                if let Some(loc) = loc {
                    buf.push_str(&format!(" ({}:{})", loc.start.line, loc.start.column));
                }
                buf
            })
            .collect::<Vec<_>>()
            .join("\n\n")
    }
}

impl Default for CompilerError {
    fn default() -> Self {
        Self::new()
    }
}

/// Allow `?` to convert a `CompilerError` into a `CompilerDiagnostic`
/// when the enclosing function returns `Result<T, CompilerDiagnostic>`.
///
/// This typically happens when `record_error()` returns `Err(CompilerError)`
/// for an Invariant error, and the calling function already returns
/// `Result<T, CompilerDiagnostic>`. The conversion extracts the first
/// error detail from the aggregate error.
impl From<CompilerError> for CompilerDiagnostic {
    fn from(err: CompilerError) -> Self {
        if let Some(first) = err.details.into_iter().next() {
            match first {
                CompilerErrorOrDiagnostic::Diagnostic(d) => d,
                CompilerErrorOrDiagnostic::ErrorDetail(d) => CompilerDiagnostic::from_detail(d),
            }
        } else {
            CompilerDiagnostic::new(ErrorCategory::Invariant, "Unknown compiler error", None)
        }
    }
}

impl From<CompilerDiagnostic> for CompilerError {
    fn from(diagnostic: CompilerDiagnostic) -> Self {
        let mut error = CompilerError::new();
        // Todo diagnostics should produce ErrorDetail (flat loc format), matching
        // the TS behavior where CompilerError.throwTodo() creates a CompilerErrorDetail
        // with loc directly on it, not a CompilerDiagnostic with sub-details.
        if diagnostic.category == ErrorCategory::Todo {
            let loc = diagnostic.primary_location().cloned();
            error.push_error_detail(CompilerErrorDetail {
                category: diagnostic.category,
                reason: diagnostic.reason,
                description: diagnostic.description,
                loc,
                suggestions: diagnostic.suggestions,
            });
        } else {
            error.push_diagnostic(diagnostic);
        }
        error
    }
}

impl std::fmt::Display for CompilerError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        for detail in &self.details {
            match detail {
                CompilerErrorOrDiagnostic::Diagnostic(d) => {
                    write!(f, "{}: {}", format_category_heading(d.category), d.reason)?;
                    if let Some(desc) = &d.description {
                        write!(f, ". {}.", desc)?;
                    }
                }
                CompilerErrorOrDiagnostic::ErrorDetail(d) => {
                    write!(f, "{}: {}", format_category_heading(d.category), d.reason)?;
                    if let Some(desc) = &d.description {
                        write!(f, ". {}.", desc)?;
                    }
                }
            }
            writeln!(f)?;
        }
        Ok(())
    }
}

impl std::error::Error for CompilerError {}

pub fn format_category_heading(category: ErrorCategory) -> &'static str {
    match category {
        ErrorCategory::EffectDependencies
        | ErrorCategory::IncompatibleLibrary
        | ErrorCategory::PreserveManualMemo
        | ErrorCategory::UnsupportedSyntax => "Compilation Skipped",
        ErrorCategory::Invariant => "Invariant",
        ErrorCategory::Todo => "Todo",
        _ => "Error",
    }
}
