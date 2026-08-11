use react_compiler_ast::File;
use react_compiler_ast::expressions::Identifier as AstIdentifier;
use react_compiler_ast::patterns::PatternLike;
use react_compiler_ast::statements::BlockStatement;
use react_compiler_diagnostics::SourceLocation;
use react_compiler_hir::ReactFunctionType;
use serde::Serialize;

use crate::timing::TimingEntry;

/// Source location with index and filename fields for logger event serialization.
/// Matches the Babel SourceLocation format that the TS compiler emits in logger events.
#[derive(Debug, Clone, Serialize)]
pub struct LoggerSourceLocation {
    pub start: LoggerPosition,
    pub end: LoggerPosition,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub filename: Option<String>,
    #[serde(rename = "identifierName", skip_serializing_if = "Option::is_none")]
    pub identifier_name: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct LoggerPosition {
    pub line: u32,
    pub column: u32,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub index: Option<u32>,
}

impl LoggerSourceLocation {
    /// Create from a diagnostics SourceLocation, adding index and filename.
    pub fn from_loc(
        loc: &SourceLocation,
        filename: Option<&str>,
        start_index: Option<u32>,
        end_index: Option<u32>,
    ) -> Self {
        Self {
            start: LoggerPosition {
                line: loc.start.line,
                column: loc.start.column,
                index: start_index,
            },
            end: LoggerPosition {
                line: loc.end.line,
                column: loc.end.column,
                index: end_index,
            },
            filename: filename.map(|s| s.to_string()),
            identifier_name: None,
        }
    }

    /// Create from a diagnostics SourceLocation without index or filename.
    pub fn from_loc_simple(loc: &SourceLocation) -> Self {
        Self {
            start: LoggerPosition {
                line: loc.start.line,
                column: loc.start.column,
                index: None,
            },
            end: LoggerPosition {
                line: loc.end.line,
                column: loc.end.column,
                index: None,
            },
            filename: None,
            identifier_name: None,
        }
    }
}

/// A variable rename from lowering, serialized for the JS shim.
#[derive(Debug, Clone, Serialize)]
pub struct BindingRenameInfo {
    pub original: String,
    pub renamed: String,
    #[serde(rename = "declarationStart")]
    pub declaration_start: u32,
}

/// Main result type returned by the compile function.
/// Serialized to JSON and returned to the JS shim.
#[derive(Debug, Serialize)]
#[serde(tag = "kind", rename_all = "lowercase")]
pub enum CompileResult {
    /// Compilation succeeded (or no functions needed compilation).
    /// `ast` is None if no changes were made to the program.
    /// The compiled Babel AST is returned by value so in-process Rust consumers
    /// (the oxc/swc frontends) use it directly instead of round-tripping through
    /// JSON. CompileResult still derives Serialize, so the napi consumer
    /// serializes the whole result (inlining the File) as before.
    Success {
        ast: Option<File>,
        events: Vec<LoggerEvent>,
        /// Unified ordered log interleaving events and debug entries.
        /// Items appear in the order they were emitted during compilation.
        /// The JS side uses this as the single source of truth (preferred over
        /// separate events/debugLogs arrays).
        #[serde(rename = "orderedLog", skip_serializing_if = "Vec::is_empty")]
        ordered_log: Vec<OrderedLogItem>,
        /// Variable renames from lowering, for applying back to the Babel AST.
        /// Each entry maps an original binding name to its renamed version,
        /// identified by the binding's declaration start position in the source.
        #[serde(skip_serializing_if = "Vec::is_empty")]
        renames: Vec<BindingRenameInfo>,
        /// Timing data for profiling. Only populated when __profiling is enabled.
        #[serde(skip_serializing_if = "Vec::is_empty")]
        timing: Vec<TimingEntry>,
    },
    /// A fatal error occurred and panicThreshold dictates it should throw.
    Error {
        error: CompilerErrorInfo,
        events: Vec<LoggerEvent>,
        #[serde(rename = "orderedLog", skip_serializing_if = "Vec::is_empty")]
        ordered_log: Vec<OrderedLogItem>,
        /// Timing data for profiling. Only populated when __profiling is enabled.
        #[serde(skip_serializing_if = "Vec::is_empty")]
        timing: Vec<TimingEntry>,
    },
}

/// An item in the ordered log, which can be either a logger event or a debug entry.
#[derive(Debug, Clone, Serialize)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum OrderedLogItem {
    Event { event: LoggerEvent },
    Debug { entry: DebugLogEntry },
}

/// Structured error information for the JS shim.
#[derive(Debug, Clone, Serialize)]
pub struct CompilerErrorInfo {
    pub reason: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    pub details: Vec<CompilerErrorDetailInfo>,
    /// When set, the JS shim should throw an Error with this exact message
    /// instead of formatting through formatCompilerError(). This is used
    /// for simulated unknown exceptions (throwUnknownException__testonly)
    /// which in the TS compiler are plain Error objects, not CompilerErrors.
    #[serde(rename = "rawMessage", skip_serializing_if = "Option::is_none")]
    pub raw_message: Option<String>,
    /// Pre-formatted error message produced by Rust, matching the JS
    /// formatCompilerError() output. When present, the JS shim uses this
    /// directly instead of calling formatCompilerError() on the JS side.
    #[serde(rename = "formattedMessage", skip_serializing_if = "Option::is_none")]
    pub formatted_message: Option<String>,
}

/// Serializable error detail — flat plain object matching the TS
/// `formatDetailForLogging()` output. All fields are direct properties.
#[derive(Debug, Clone, Serialize)]
pub struct CompilerErrorDetailInfo {
    pub category: String,
    pub reason: String,
    pub description: Option<String>,
    pub severity: String,
    pub suggestions: Option<Vec<LoggerSuggestionInfo>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub details: Option<Vec<CompilerErrorItemInfo>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub loc: Option<LoggerSourceLocation>,
}

/// Serializable suggestion info for logger events.
#[derive(Debug, Clone, Serialize)]
pub struct LoggerSuggestionInfo {
    pub description: String,
    pub op: LoggerSuggestionOp,
    pub range: (usize, usize),
    #[serde(skip_serializing_if = "Option::is_none")]
    pub text: Option<String>,
}

/// Numeric enum matching TS `CompilerSuggestionOperation`.
#[derive(Debug, Clone, Copy)]
pub enum LoggerSuggestionOp {
    InsertBefore = 0,
    InsertAfter = 1,
    Remove = 2,
    Replace = 3,
}

impl serde::Serialize for LoggerSuggestionOp {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        serializer.serialize_u8(*self as u8)
    }
}

/// Individual error or hint item within a CompilerErrorDetailInfo.
#[derive(Debug, Clone, Serialize)]
pub struct CompilerErrorItemInfo {
    pub kind: String,
    pub loc: Option<LoggerSourceLocation>,
    /// Serialized as `null` when None (not omitted), matching TS behavior.
    pub message: Option<String>,
}

/// Debug log entry for debugLogIRs support.
/// Currently only supports the 'debug' variant (string values).
#[derive(Debug, Clone, Serialize)]
pub struct DebugLogEntry {
    pub kind: &'static str,
    pub name: String,
    pub value: String,
}

impl DebugLogEntry {
    pub fn new(name: impl Into<String>, value: impl Into<String>) -> Self {
        Self {
            kind: "debug",
            name: name.into(),
            value: value.into(),
        }
    }
}

/// Codegen output for a single compiled function.
/// Carries the generated AST fields needed to replace the original function.
#[derive(Debug, Clone)]
pub struct CodegenFunction {
    pub loc: Option<SourceLocation>,
    pub id: Option<AstIdentifier>,
    pub name_hint: Option<String>,
    pub params: Vec<PatternLike>,
    pub body: BlockStatement,
    pub generator: bool,
    pub is_async: bool,
    pub memo_slots_used: u32,
    pub memo_blocks: u32,
    pub memo_values: u32,
    pub pruned_memo_blocks: u32,
    pub pruned_memo_values: u32,
    pub outlined: Vec<OutlinedFunction>,
}

/// An outlined function extracted during compilation.
#[derive(Debug, Clone)]
pub struct OutlinedFunction {
    pub func: CodegenFunction,
    pub fn_type: Option<ReactFunctionType>,
}

/// Logger events emitted during compilation.
/// These are returned to JS for the logger callback.
#[derive(Debug, Clone, Serialize)]
#[serde(tag = "kind")]
pub enum LoggerEvent {
    CompileSuccess {
        #[serde(rename = "fnLoc")]
        fn_loc: Option<LoggerSourceLocation>,
        #[serde(rename = "fnName")]
        fn_name: Option<String>,
        #[serde(rename = "memoSlots")]
        memo_slots: u32,
        #[serde(rename = "memoBlocks")]
        memo_blocks: u32,
        #[serde(rename = "memoValues")]
        memo_values: u32,
        #[serde(rename = "prunedMemoBlocks")]
        pruned_memo_blocks: u32,
        #[serde(rename = "prunedMemoValues")]
        pruned_memo_values: u32,
    },
    CompileError {
        detail: CompilerErrorDetailInfo,
        #[serde(rename = "fnLoc")]
        fn_loc: Option<LoggerSourceLocation>,
    },
    /// Same as CompileError but serializes fnLoc before detail (matching TS program.ts output)
    #[serde(rename = "CompileError")]
    CompileErrorWithLoc {
        #[serde(rename = "fnLoc")]
        fn_loc: LoggerSourceLocation,
        detail: CompilerErrorDetailInfo,
    },
    CompileSkip {
        #[serde(rename = "fnLoc")]
        fn_loc: Option<LoggerSourceLocation>,
        reason: String,
        #[serde(skip_serializing_if = "Option::is_none")]
        loc: Option<LoggerSourceLocation>,
    },
    CompileUnexpectedThrow {
        #[serde(rename = "fnLoc")]
        fn_loc: Option<LoggerSourceLocation>,
        data: String,
    },
    PipelineError {
        #[serde(rename = "fnLoc")]
        fn_loc: Option<LoggerSourceLocation>,
        data: String,
    },
}
