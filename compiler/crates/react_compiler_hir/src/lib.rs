pub mod default_module_type_provider;
pub mod dominator;
pub mod environment;
pub mod environment_config;
pub mod globals;
pub mod object_shape;
pub mod print;
pub mod reactive;
pub mod type_config;
pub mod visitors;

use indexmap::{IndexMap, IndexSet};
pub use react_compiler_diagnostics::CompilerDiagnostic;
pub use react_compiler_diagnostics::ErrorCategory;
pub use react_compiler_diagnostics::GENERATED_SOURCE;
pub use react_compiler_diagnostics::Position;
pub use react_compiler_diagnostics::SourceLocation;
pub use reactive::*;
use rustc_hash::FxBuildHasher;

// =============================================================================
// ID newtypes
// =============================================================================

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, PartialOrd, Ord)]
pub struct BlockId(pub u32);

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, PartialOrd, Ord)]
pub struct IdentifierId(pub u32);

/// Index into the flat instruction table on HirFunction.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, PartialOrd, Ord)]
pub struct InstructionId(pub u32);

/// Evaluation order assigned to instructions and terminals during numbering.
/// This was previously called InstructionId in the TypeScript compiler.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, PartialOrd, Ord)]
pub struct EvaluationOrder(pub u32);

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, PartialOrd, Ord)]
pub struct DeclarationId(pub u32);

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, PartialOrd, Ord)]
pub struct ScopeId(pub u32);

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, PartialOrd, Ord)]
pub struct TypeId(pub u32);

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, PartialOrd, Ord)]
pub struct FunctionId(pub u32);

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub struct MutableRangeId(pub u32);

// =============================================================================
// FloatValue wrapper
// =============================================================================

/// Wrapper around f64 that stores raw bytes for deterministic equality and hashing.
/// This allows use in FxHashMap keys and ensures NaN == NaN (bitwise comparison).
#[derive(Debug, Clone, Copy)]
pub struct FloatValue(u64);

impl FloatValue {
    pub fn new(value: f64) -> Self {
        FloatValue(value.to_bits())
    }

    pub fn value(self) -> f64 {
        f64::from_bits(self.0)
    }
}

impl From<f64> for FloatValue {
    fn from(value: f64) -> Self {
        FloatValue::new(value)
    }
}

impl From<FloatValue> for f64 {
    fn from(value: FloatValue) -> Self {
        value.value()
    }
}

impl PartialEq for FloatValue {
    fn eq(&self, other: &Self) -> bool {
        self.0 == other.0
    }
}

impl Eq for FloatValue {}

impl std::hash::Hash for FloatValue {
    fn hash<H: std::hash::Hasher>(&self, state: &mut H) {
        self.0.hash(state);
    }
}

impl std::fmt::Display for FloatValue {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", format_js_number(self.value()))
    }
}

/// Format an f64 the way JavaScript's `Number.prototype.toString()` does.
///
/// Key differences from Rust's default `Display`:
/// - Uses scientific notation for |x| >= 1e21 (e.g. `1e+21`, `2.18739127891275e+22`)
/// - Uses scientific notation for 0 < |x| < 1e-6 (e.g. `1e-7`, `1.5e-8`)
/// - Uses minimal significant digits that round-trip to the same f64
/// - Formats -0 as "0"
pub fn format_js_number(n: f64) -> String {
    if n.is_nan() {
        return "NaN".to_string();
    }
    if n.is_infinite() {
        return if n > 0.0 {
            "Infinity".to_string()
        } else {
            "-Infinity".to_string()
        };
    }
    if n == 0.0 {
        return "0".to_string();
    }

    let abs = n.abs();
    let sign = if n < 0.0 { "-" } else { "" };

    if abs >= 1e21 || (abs > 0.0 && abs < 1e-6) {
        // Use scientific notation matching JS format: coefficient + "e+" or "e-" + exponent
        // Rust's {:e} uses "e" (lowercase) like JS, but formats as e.g. "1.5e21" not "1.5e+21"
        let formatted = format!("{:e}", abs);
        // Split into coefficient and exponent parts
        let (coeff, exp_str) = formatted.split_once('e').unwrap();
        let exp: i32 = exp_str.parse().unwrap();
        // JS uses e+N for positive exponents, e-N for negative
        if exp >= 0 {
            format!("{}{}e+{}", sign, coeff, exp)
        } else {
            format!("{}{}e-{}", sign, coeff, exp.unsigned_abs())
        }
    } else if abs.fract() == 0.0 && abs < (i64::MAX as f64) {
        // Integer that fits in i64 — format without decimal point
        format!("{}{}", sign, abs as i64)
    } else {
        // Regular float: Rust's default Display gives us the right digits
        format!("{}", n)
    }
}

// =============================================================================
// Core HIR types
// =============================================================================

/// A function lowered to HIR form
#[derive(Debug, Clone)]
pub struct HirFunction {
    pub loc: Option<SourceLocation>,
    pub id: Option<String>,
    pub name_hint: Option<String>,
    pub fn_type: ReactFunctionType,
    pub params: Vec<ParamPattern>,
    pub return_type_annotation: Option<String>,
    pub returns: Place,
    pub context: Vec<Place>,
    pub body: HIR,
    pub instructions: Vec<Instruction>,
    pub generator: bool,
    pub is_async: bool,
    pub directives: Vec<String>,
    pub aliasing_effects: Option<Vec<AliasingEffect>>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ReactFunctionType {
    Component,
    Hook,
    Other,
}

#[derive(Debug, Clone)]
pub enum ParamPattern {
    Place(Place),
    Spread(SpreadPattern),
}

/// The HIR control-flow graph
#[derive(Debug, Clone)]
pub struct HIR {
    pub entry: BlockId,
    pub blocks: IndexMap<BlockId, BasicBlock, FxBuildHasher>,
}

/// Block kinds
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BlockKind {
    Block,
    Value,
    Loop,
    Sequence,
    Catch,
}

impl std::fmt::Display for BlockKind {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            BlockKind::Block => write!(f, "block"),
            BlockKind::Value => write!(f, "value"),
            BlockKind::Loop => write!(f, "loop"),
            BlockKind::Sequence => write!(f, "sequence"),
            BlockKind::Catch => write!(f, "catch"),
        }
    }
}

/// A basic block in the CFG
#[derive(Debug, Clone)]
pub struct BasicBlock {
    pub kind: BlockKind,
    pub id: BlockId,
    pub instructions: Vec<InstructionId>,
    pub terminal: Terminal,
    pub preds: IndexSet<BlockId, FxBuildHasher>,
    pub phis: Vec<Phi>,
}

/// Phi node for SSA
#[derive(Debug, Clone)]
pub struct Phi {
    pub place: Place,
    pub operands: IndexMap<BlockId, Place, FxBuildHasher>,
}

// =============================================================================
// Terminal enum
// =============================================================================

#[derive(Debug, Clone)]
pub enum Terminal {
    Unsupported {
        id: EvaluationOrder,
        loc: Option<SourceLocation>,
    },
    Unreachable {
        id: EvaluationOrder,
        loc: Option<SourceLocation>,
    },
    Throw {
        value: Place,
        id: EvaluationOrder,
        loc: Option<SourceLocation>,
    },
    Return {
        value: Place,
        return_variant: ReturnVariant,
        id: EvaluationOrder,
        loc: Option<SourceLocation>,
        effects: Option<Vec<AliasingEffect>>,
    },
    Goto {
        block: BlockId,
        variant: GotoVariant,
        id: EvaluationOrder,
        loc: Option<SourceLocation>,
    },
    If {
        test: Place,
        consequent: BlockId,
        alternate: BlockId,
        fallthrough: BlockId,
        id: EvaluationOrder,
        loc: Option<SourceLocation>,
    },
    Branch {
        test: Place,
        consequent: BlockId,
        alternate: BlockId,
        fallthrough: BlockId,
        id: EvaluationOrder,
        loc: Option<SourceLocation>,
    },
    Switch {
        test: Place,
        cases: Vec<Case>,
        fallthrough: BlockId,
        id: EvaluationOrder,
        loc: Option<SourceLocation>,
    },
    DoWhile {
        loop_block: BlockId,
        test: BlockId,
        fallthrough: BlockId,
        id: EvaluationOrder,
        loc: Option<SourceLocation>,
    },
    While {
        test: BlockId,
        loop_block: BlockId,
        fallthrough: BlockId,
        id: EvaluationOrder,
        loc: Option<SourceLocation>,
    },
    For {
        init: BlockId,
        test: BlockId,
        update: Option<BlockId>,
        loop_block: BlockId,
        fallthrough: BlockId,
        id: EvaluationOrder,
        loc: Option<SourceLocation>,
    },
    ForOf {
        init: BlockId,
        test: BlockId,
        loop_block: BlockId,
        fallthrough: BlockId,
        id: EvaluationOrder,
        loc: Option<SourceLocation>,
    },
    ForIn {
        init: BlockId,
        loop_block: BlockId,
        fallthrough: BlockId,
        id: EvaluationOrder,
        loc: Option<SourceLocation>,
    },
    Logical {
        operator: LogicalOperator,
        test: BlockId,
        fallthrough: BlockId,
        id: EvaluationOrder,
        loc: Option<SourceLocation>,
    },
    Ternary {
        test: BlockId,
        fallthrough: BlockId,
        id: EvaluationOrder,
        loc: Option<SourceLocation>,
    },
    Optional {
        optional: bool,
        test: BlockId,
        fallthrough: BlockId,
        id: EvaluationOrder,
        loc: Option<SourceLocation>,
    },
    Label {
        block: BlockId,
        fallthrough: BlockId,
        id: EvaluationOrder,
        loc: Option<SourceLocation>,
    },
    Sequence {
        block: BlockId,
        fallthrough: BlockId,
        id: EvaluationOrder,
        loc: Option<SourceLocation>,
    },
    MaybeThrow {
        continuation: BlockId,
        handler: Option<BlockId>,
        id: EvaluationOrder,
        loc: Option<SourceLocation>,
        effects: Option<Vec<AliasingEffect>>,
    },
    Try {
        block: BlockId,
        handler_binding: Option<Place>,
        handler: BlockId,
        fallthrough: BlockId,
        id: EvaluationOrder,
        loc: Option<SourceLocation>,
    },
    Scope {
        fallthrough: BlockId,
        block: BlockId,
        scope: ScopeId,
        id: EvaluationOrder,
        loc: Option<SourceLocation>,
    },
    PrunedScope {
        fallthrough: BlockId,
        block: BlockId,
        scope: ScopeId,
        id: EvaluationOrder,
        loc: Option<SourceLocation>,
    },
}

impl Terminal {
    /// Get the evaluation order of this terminal
    pub fn evaluation_order(&self) -> EvaluationOrder {
        match self {
            Terminal::Unsupported { id, .. }
            | Terminal::Unreachable { id, .. }
            | Terminal::Throw { id, .. }
            | Terminal::Return { id, .. }
            | Terminal::Goto { id, .. }
            | Terminal::If { id, .. }
            | Terminal::Branch { id, .. }
            | Terminal::Switch { id, .. }
            | Terminal::DoWhile { id, .. }
            | Terminal::While { id, .. }
            | Terminal::For { id, .. }
            | Terminal::ForOf { id, .. }
            | Terminal::ForIn { id, .. }
            | Terminal::Logical { id, .. }
            | Terminal::Ternary { id, .. }
            | Terminal::Optional { id, .. }
            | Terminal::Label { id, .. }
            | Terminal::Sequence { id, .. }
            | Terminal::MaybeThrow { id, .. }
            | Terminal::Try { id, .. }
            | Terminal::Scope { id, .. }
            | Terminal::PrunedScope { id, .. } => *id,
        }
    }

    /// Get the source location of this terminal
    pub fn loc(&self) -> Option<&SourceLocation> {
        match self {
            Terminal::Unsupported { loc, .. }
            | Terminal::Unreachable { loc, .. }
            | Terminal::Throw { loc, .. }
            | Terminal::Return { loc, .. }
            | Terminal::Goto { loc, .. }
            | Terminal::If { loc, .. }
            | Terminal::Branch { loc, .. }
            | Terminal::Switch { loc, .. }
            | Terminal::DoWhile { loc, .. }
            | Terminal::While { loc, .. }
            | Terminal::For { loc, .. }
            | Terminal::ForOf { loc, .. }
            | Terminal::ForIn { loc, .. }
            | Terminal::Logical { loc, .. }
            | Terminal::Ternary { loc, .. }
            | Terminal::Optional { loc, .. }
            | Terminal::Label { loc, .. }
            | Terminal::Sequence { loc, .. }
            | Terminal::MaybeThrow { loc, .. }
            | Terminal::Try { loc, .. }
            | Terminal::Scope { loc, .. }
            | Terminal::PrunedScope { loc, .. } => loc.as_ref(),
        }
    }

    /// Set the evaluation order of this terminal
    pub fn set_evaluation_order(&mut self, new_id: EvaluationOrder) {
        match self {
            Terminal::Unsupported { id, .. }
            | Terminal::Unreachable { id, .. }
            | Terminal::Throw { id, .. }
            | Terminal::Return { id, .. }
            | Terminal::Goto { id, .. }
            | Terminal::If { id, .. }
            | Terminal::Branch { id, .. }
            | Terminal::Switch { id, .. }
            | Terminal::DoWhile { id, .. }
            | Terminal::While { id, .. }
            | Terminal::For { id, .. }
            | Terminal::ForOf { id, .. }
            | Terminal::ForIn { id, .. }
            | Terminal::Logical { id, .. }
            | Terminal::Ternary { id, .. }
            | Terminal::Optional { id, .. }
            | Terminal::Label { id, .. }
            | Terminal::Sequence { id, .. }
            | Terminal::MaybeThrow { id, .. }
            | Terminal::Try { id, .. }
            | Terminal::Scope { id, .. }
            | Terminal::PrunedScope { id, .. } => *id = new_id,
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ReturnVariant {
    Void,
    Implicit,
    Explicit,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum GotoVariant {
    Break,
    Continue,
    Try,
}

#[derive(Debug, Clone)]
pub struct Case {
    pub test: Option<Place>,
    pub block: BlockId,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum LogicalOperator {
    And,
    Or,
    NullishCoalescing,
}

impl std::fmt::Display for LogicalOperator {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            LogicalOperator::And => write!(f, "&&"),
            LogicalOperator::Or => write!(f, "||"),
            LogicalOperator::NullishCoalescing => write!(f, "??"),
        }
    }
}

// =============================================================================
// Instruction types
// =============================================================================

#[derive(Debug, Clone)]
pub struct Instruction {
    pub id: EvaluationOrder,
    pub lvalue: Place,
    pub value: InstructionValue,
    pub loc: Option<SourceLocation>,
    pub effects: Option<Vec<AliasingEffect>>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum InstructionKind {
    Const,
    Let,
    Reassign,
    Catch,
    HoistedConst,
    HoistedLet,
    HoistedFunction,
    Function,
}

#[derive(Debug, Clone)]
pub struct LValue {
    pub place: Place,
    pub kind: InstructionKind,
}

#[derive(Debug, Clone)]
pub struct LValuePattern {
    pub pattern: Pattern,
    pub kind: InstructionKind,
}

#[derive(Debug, Clone)]
pub enum Pattern {
    Array(ArrayPattern),
    Object(ObjectPattern),
}

// =============================================================================
// InstructionValue enum
// =============================================================================

#[derive(Debug, Clone)]
pub enum InstructionValue {
    LoadLocal {
        place: Place,
        loc: Option<SourceLocation>,
    },
    LoadContext {
        place: Place,
        loc: Option<SourceLocation>,
    },
    DeclareLocal {
        lvalue: LValue,
        type_annotation: Option<String>,
        loc: Option<SourceLocation>,
    },
    DeclareContext {
        lvalue: LValue,
        loc: Option<SourceLocation>,
    },
    StoreLocal {
        lvalue: LValue,
        value: Place,
        type_annotation: Option<String>,
        loc: Option<SourceLocation>,
    },
    StoreContext {
        lvalue: LValue,
        value: Place,
        loc: Option<SourceLocation>,
    },
    Destructure {
        lvalue: LValuePattern,
        value: Place,
        loc: Option<SourceLocation>,
    },
    Primitive {
        value: PrimitiveValue,
        loc: Option<SourceLocation>,
    },
    JSXText {
        value: String,
        loc: Option<SourceLocation>,
    },
    BinaryExpression {
        operator: BinaryOperator,
        left: Place,
        right: Place,
        loc: Option<SourceLocation>,
    },
    NewExpression {
        callee: Place,
        args: Vec<PlaceOrSpread>,
        loc: Option<SourceLocation>,
    },
    CallExpression {
        callee: Place,
        args: Vec<PlaceOrSpread>,
        loc: Option<SourceLocation>,
    },
    MethodCall {
        receiver: Place,
        property: Place,
        args: Vec<PlaceOrSpread>,
        loc: Option<SourceLocation>,
    },
    UnaryExpression {
        operator: UnaryOperator,
        value: Place,
        loc: Option<SourceLocation>,
    },
    TypeCastExpression {
        value: Place,
        type_: Type,
        type_annotation_name: Option<String>,
        type_annotation_kind: Option<String>,
        /// The original AST type annotation node, preserved for codegen.
        /// For Flow: the inner type from TypeAnnotation.typeAnnotation
        /// For TS: the TSType node from TSAsExpression/TSSatisfiesExpression
        type_annotation: Option<Box<serde_json::Value>>,
        loc: Option<SourceLocation>,
    },
    /// TSNonNullExpression (`expr!`). Lowered as its own instruction rather
    /// than a transparent unwrap so dependency collection stops at the
    /// asserted value instead of hoisting member accesses past a `!` that
    /// only holds inside guarded callbacks (react/react#34752).
    NonNullExpression {
        value: Place,
        loc: Option<SourceLocation>,
    },
    JsxExpression {
        tag: JsxTag,
        props: Vec<JsxAttribute>,
        children: Option<Vec<Place>>,
        loc: Option<SourceLocation>,
        opening_loc: Option<SourceLocation>,
        closing_loc: Option<SourceLocation>,
    },
    ObjectExpression {
        properties: Vec<ObjectPropertyOrSpread>,
        loc: Option<SourceLocation>,
    },
    ObjectMethod {
        loc: Option<SourceLocation>,
        lowered_func: LoweredFunction,
    },
    ArrayExpression {
        elements: Vec<ArrayElement>,
        loc: Option<SourceLocation>,
    },
    JsxFragment {
        children: Vec<Place>,
        loc: Option<SourceLocation>,
    },
    RegExpLiteral {
        pattern: String,
        flags: String,
        loc: Option<SourceLocation>,
    },
    MetaProperty {
        meta: String,
        property: String,
        loc: Option<SourceLocation>,
    },
    PropertyStore {
        object: Place,
        property: PropertyLiteral,
        value: Place,
        loc: Option<SourceLocation>,
    },
    PropertyLoad {
        object: Place,
        property: PropertyLiteral,
        loc: Option<SourceLocation>,
    },
    PropertyDelete {
        object: Place,
        property: PropertyLiteral,
        loc: Option<SourceLocation>,
    },
    ComputedStore {
        object: Place,
        property: Place,
        value: Place,
        loc: Option<SourceLocation>,
    },
    ComputedLoad {
        object: Place,
        property: Place,
        loc: Option<SourceLocation>,
    },
    ComputedDelete {
        object: Place,
        property: Place,
        loc: Option<SourceLocation>,
    },
    LoadGlobal {
        binding: NonLocalBinding,
        loc: Option<SourceLocation>,
    },
    StoreGlobal {
        name: String,
        value: Place,
        loc: Option<SourceLocation>,
    },
    FunctionExpression {
        name: Option<String>,
        name_hint: Option<String>,
        lowered_func: LoweredFunction,
        expr_type: FunctionExpressionType,
        loc: Option<SourceLocation>,
    },
    TaggedTemplateExpression {
        tag: Place,
        value: TemplateQuasi,
        loc: Option<SourceLocation>,
    },
    TemplateLiteral {
        subexprs: Vec<Place>,
        quasis: Vec<TemplateQuasi>,
        loc: Option<SourceLocation>,
    },
    Await {
        value: Place,
        loc: Option<SourceLocation>,
    },
    GetIterator {
        collection: Place,
        loc: Option<SourceLocation>,
    },
    IteratorNext {
        iterator: Place,
        collection: Place,
        loc: Option<SourceLocation>,
    },
    NextPropertyOf {
        value: Place,
        loc: Option<SourceLocation>,
    },
    PrefixUpdate {
        lvalue: Place,
        operation: UpdateOperator,
        value: Place,
        loc: Option<SourceLocation>,
    },
    PostfixUpdate {
        lvalue: Place,
        operation: UpdateOperator,
        value: Place,
        loc: Option<SourceLocation>,
    },
    Debugger {
        loc: Option<SourceLocation>,
    },
    StartMemoize {
        manual_memo_id: u32,
        deps: Option<Vec<ManualMemoDependency>>,
        deps_loc: Option<Option<SourceLocation>>,
        has_invalid_deps: bool,
        loc: Option<SourceLocation>,
    },
    FinishMemoize {
        manual_memo_id: u32,
        decl: Place,
        pruned: bool,
        loc: Option<SourceLocation>,
    },
    UnsupportedNode {
        node_type: Option<String>,
        /// The original AST node serialized as JSON, so codegen can emit it verbatim.
        original_node: Option<serde_json::Value>,
        loc: Option<SourceLocation>,
    },
}

impl InstructionValue {
    pub fn loc(&self) -> Option<&SourceLocation> {
        match self {
            InstructionValue::LoadLocal { loc, .. }
            | InstructionValue::LoadContext { loc, .. }
            | InstructionValue::DeclareLocal { loc, .. }
            | InstructionValue::DeclareContext { loc, .. }
            | InstructionValue::StoreLocal { loc, .. }
            | InstructionValue::StoreContext { loc, .. }
            | InstructionValue::Destructure { loc, .. }
            | InstructionValue::Primitive { loc, .. }
            | InstructionValue::JSXText { loc, .. }
            | InstructionValue::BinaryExpression { loc, .. }
            | InstructionValue::NewExpression { loc, .. }
            | InstructionValue::CallExpression { loc, .. }
            | InstructionValue::MethodCall { loc, .. }
            | InstructionValue::UnaryExpression { loc, .. }
            | InstructionValue::TypeCastExpression { loc, .. }
            | InstructionValue::NonNullExpression { loc, .. }
            | InstructionValue::JsxExpression { loc, .. }
            | InstructionValue::ObjectExpression { loc, .. }
            | InstructionValue::ObjectMethod { loc, .. }
            | InstructionValue::ArrayExpression { loc, .. }
            | InstructionValue::JsxFragment { loc, .. }
            | InstructionValue::RegExpLiteral { loc, .. }
            | InstructionValue::MetaProperty { loc, .. }
            | InstructionValue::PropertyStore { loc, .. }
            | InstructionValue::PropertyLoad { loc, .. }
            | InstructionValue::PropertyDelete { loc, .. }
            | InstructionValue::ComputedStore { loc, .. }
            | InstructionValue::ComputedLoad { loc, .. }
            | InstructionValue::ComputedDelete { loc, .. }
            | InstructionValue::LoadGlobal { loc, .. }
            | InstructionValue::StoreGlobal { loc, .. }
            | InstructionValue::FunctionExpression { loc, .. }
            | InstructionValue::TaggedTemplateExpression { loc, .. }
            | InstructionValue::TemplateLiteral { loc, .. }
            | InstructionValue::Await { loc, .. }
            | InstructionValue::GetIterator { loc, .. }
            | InstructionValue::IteratorNext { loc, .. }
            | InstructionValue::NextPropertyOf { loc, .. }
            | InstructionValue::PrefixUpdate { loc, .. }
            | InstructionValue::PostfixUpdate { loc, .. }
            | InstructionValue::Debugger { loc, .. }
            | InstructionValue::StartMemoize { loc, .. }
            | InstructionValue::FinishMemoize { loc, .. }
            | InstructionValue::UnsupportedNode { loc, .. } => loc.as_ref(),
        }
    }
}

// =============================================================================
// Supporting types
// =============================================================================

#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum PrimitiveValue {
    Null,
    Undefined,
    Boolean(bool),
    Number(FloatValue),
    String(react_compiler_diagnostics::JsString),
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BinaryOperator {
    Equal,
    NotEqual,
    StrictEqual,
    StrictNotEqual,
    LessThan,
    LessEqual,
    GreaterThan,
    GreaterEqual,
    ShiftLeft,
    ShiftRight,
    UnsignedShiftRight,
    Add,
    Subtract,
    Multiply,
    Divide,
    Modulo,
    Exponent,
    BitwiseOr,
    BitwiseXor,
    BitwiseAnd,
    In,
    InstanceOf,
}

impl std::fmt::Display for BinaryOperator {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            BinaryOperator::Equal => write!(f, "=="),
            BinaryOperator::NotEqual => write!(f, "!="),
            BinaryOperator::StrictEqual => write!(f, "==="),
            BinaryOperator::StrictNotEqual => write!(f, "!=="),
            BinaryOperator::LessThan => write!(f, "<"),
            BinaryOperator::LessEqual => write!(f, "<="),
            BinaryOperator::GreaterThan => write!(f, ">"),
            BinaryOperator::GreaterEqual => write!(f, ">="),
            BinaryOperator::ShiftLeft => write!(f, "<<"),
            BinaryOperator::ShiftRight => write!(f, ">>"),
            BinaryOperator::UnsignedShiftRight => write!(f, ">>>"),
            BinaryOperator::Add => write!(f, "+"),
            BinaryOperator::Subtract => write!(f, "-"),
            BinaryOperator::Multiply => write!(f, "*"),
            BinaryOperator::Divide => write!(f, "/"),
            BinaryOperator::Modulo => write!(f, "%"),
            BinaryOperator::Exponent => write!(f, "**"),
            BinaryOperator::BitwiseOr => write!(f, "|"),
            BinaryOperator::BitwiseXor => write!(f, "^"),
            BinaryOperator::BitwiseAnd => write!(f, "&"),
            BinaryOperator::In => write!(f, "in"),
            BinaryOperator::InstanceOf => write!(f, "instanceof"),
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum UnaryOperator {
    Minus,
    Plus,
    Not,
    BitwiseNot,
    TypeOf,
    Void,
}

impl std::fmt::Display for UnaryOperator {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            UnaryOperator::Minus => write!(f, "-"),
            UnaryOperator::Plus => write!(f, "+"),
            UnaryOperator::Not => write!(f, "!"),
            UnaryOperator::BitwiseNot => write!(f, "~"),
            UnaryOperator::TypeOf => write!(f, "typeof"),
            UnaryOperator::Void => write!(f, "void"),
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum UpdateOperator {
    Increment,
    Decrement,
}

impl std::fmt::Display for UpdateOperator {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            UpdateOperator::Increment => write!(f, "++"),
            UpdateOperator::Decrement => write!(f, "--"),
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum FunctionExpressionType {
    ArrowFunctionExpression,
    FunctionExpression,
    FunctionDeclaration,
}

#[derive(Debug, Clone)]
pub struct TemplateQuasi {
    pub raw: String,
    pub cooked: Option<String>,
}

#[derive(Debug, Clone)]
pub struct ManualMemoDependency {
    pub root: ManualMemoDependencyRoot,
    pub path: Vec<DependencyPathEntry>,
    pub loc: Option<SourceLocation>,
}

#[derive(Debug, Clone)]
pub enum ManualMemoDependencyRoot {
    NamedLocal { value: Place, constant: bool },
    Global { identifier_name: String },
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct DependencyPathEntry {
    pub property: PropertyLiteral,
    pub optional: bool,
    pub loc: Option<SourceLocation>,
}

// =============================================================================
// Place, Identifier, and related types
// =============================================================================

#[derive(Debug, Clone)]
pub struct Place {
    pub identifier: IdentifierId,
    pub effect: Effect,
    pub reactive: bool,
    pub loc: Option<SourceLocation>,
}

#[derive(Debug, Clone)]
pub struct Identifier {
    pub id: IdentifierId,
    pub declaration_id: DeclarationId,
    pub name: Option<IdentifierName>,
    pub mutable_range: MutableRange,
    pub scope: Option<ScopeId>,
    pub type_: TypeId,
    pub loc: Option<SourceLocation>,
}

#[derive(Debug, Clone)]
pub struct MutableRange {
    /// Unique identity for this logical range. Cloning preserves the ID
    /// (same logical range); use `Environment::new_mutable_range()` to create
    /// a range with a fresh ID.
    pub id: MutableRangeId,
    pub start: EvaluationOrder,
    pub end: EvaluationOrder,
}

impl MutableRange {
    /// Returns true if the given evaluation order falls within this mutable range.
    /// Corresponds to TS `inRange({id}, range)` / `isMutable(instr, place)`.
    pub fn contains(&self, eval_order: EvaluationOrder) -> bool {
        eval_order >= self.start && eval_order < self.end
    }

    /// Returns true if this range has the same identity as `other`.
    /// In the TS compiler, this corresponds to checking whether two mutableRange
    /// references point to the same JS object (=== identity).
    pub fn same_range(&self, other: &MutableRange) -> bool {
        self.id == other.id
    }
}

#[derive(Debug, Clone)]
pub enum IdentifierName {
    Named(String),
    Promoted(String),
}

impl IdentifierName {
    pub fn value(&self) -> &str {
        match self {
            IdentifierName::Named(v) | IdentifierName::Promoted(v) => v,
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
pub enum Effect {
    #[serde(rename = "<unknown>")]
    Unknown,
    #[serde(rename = "freeze")]
    Freeze,
    #[serde(rename = "read")]
    Read,
    #[serde(rename = "capture")]
    Capture,
    #[serde(rename = "mutate-iterator?")]
    ConditionallyMutateIterator,
    #[serde(rename = "mutate?")]
    ConditionallyMutate,
    #[serde(rename = "mutate")]
    Mutate,
    #[serde(rename = "store")]
    Store,
}

impl Effect {
    /// Returns true if this effect represents a mutable operation.
    /// Mutable effects are: Capture, Store, ConditionallyMutate,
    /// ConditionallyMutateIterator, and Mutate.
    pub fn is_mutable(&self) -> bool {
        matches!(
            self,
            Effect::Capture
                | Effect::Store
                | Effect::ConditionallyMutate
                | Effect::ConditionallyMutateIterator
                | Effect::Mutate
        )
    }
}

impl std::fmt::Display for Effect {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Effect::Unknown => write!(f, "<unknown>"),
            Effect::Freeze => write!(f, "freeze"),
            Effect::Read => write!(f, "read"),
            Effect::Capture => write!(f, "capture"),
            Effect::ConditionallyMutateIterator => write!(f, "mutate-iterator?"),
            Effect::ConditionallyMutate => write!(f, "mutate?"),
            Effect::Mutate => write!(f, "mutate"),
            Effect::Store => write!(f, "store"),
        }
    }
}

#[derive(Debug, Clone)]
pub struct SpreadPattern {
    pub place: Place,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Hole {
    Hole,
}

#[derive(Debug, Clone)]
pub struct ArrayPattern {
    pub items: Vec<ArrayPatternElement>,
    pub loc: Option<SourceLocation>,
}

#[derive(Debug, Clone)]
pub enum ArrayPatternElement {
    Place(Place),
    Spread(SpreadPattern),
    Hole,
}

#[derive(Debug, Clone)]
pub struct ObjectPattern {
    pub properties: Vec<ObjectPropertyOrSpread>,
    pub loc: Option<SourceLocation>,
}

#[derive(Debug, Clone)]
pub enum ObjectPropertyOrSpread {
    Property(ObjectProperty),
    Spread(SpreadPattern),
}

#[derive(Debug, Clone)]
pub struct ObjectProperty {
    pub key: ObjectPropertyKey,
    pub property_type: ObjectPropertyType,
    pub place: Place,
}

#[derive(Debug, Clone)]
pub enum ObjectPropertyKey {
    String { name: String },
    Identifier { name: String },
    Computed { name: Place },
    Number { name: FloatValue },
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ObjectPropertyType {
    Property,
    Method,
}

impl std::fmt::Display for ObjectPropertyType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ObjectPropertyType::Property => write!(f, "property"),
            ObjectPropertyType::Method => write!(f, "method"),
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum PropertyLiteral {
    String(String),
    Number(FloatValue),
}

impl std::fmt::Display for PropertyLiteral {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            PropertyLiteral::String(s) => write!(f, "{}", s),
            PropertyLiteral::Number(n) => write!(f, "{}", n),
        }
    }
}

#[derive(Debug, Clone)]
pub enum PlaceOrSpread {
    Place(Place),
    Spread(SpreadPattern),
}

#[derive(Debug, Clone)]
pub enum ArrayElement {
    Place(Place),
    Spread(SpreadPattern),
    Hole,
}

#[derive(Debug, Clone)]
pub struct LoweredFunction {
    pub func: FunctionId,
}

#[derive(Debug, Clone)]
pub struct BuiltinTag {
    pub name: String,
    pub loc: Option<SourceLocation>,
}

#[derive(Debug, Clone)]
pub enum JsxTag {
    Place(Place),
    Builtin(BuiltinTag),
}

#[derive(Debug, Clone)]
pub enum JsxAttribute {
    SpreadAttribute { argument: Place },
    Attribute { name: String, place: Place },
}

// =============================================================================
// Variable Binding types
// =============================================================================

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BindingKind {
    Var,
    Let,
    Const,
    Param,
    Module,
    Hoisted,
    Local,
    Unknown,
}

#[derive(Debug, Clone)]
pub enum VariableBinding {
    Identifier {
        identifier: IdentifierId,
        binding_kind: BindingKind,
    },
    Global {
        name: String,
    },
    ImportDefault {
        name: String,
        module: String,
    },
    ImportSpecifier {
        name: String,
        module: String,
        imported: String,
    },
    ImportNamespace {
        name: String,
        module: String,
    },
    ModuleLocal {
        name: String,
    },
}

#[derive(Debug, Clone)]
pub enum NonLocalBinding {
    ImportDefault {
        name: String,
        module: String,
    },
    ImportSpecifier {
        name: String,
        module: String,
        imported: String,
    },
    ImportNamespace {
        name: String,
        module: String,
    },
    ModuleLocal {
        name: String,
    },
    Global {
        name: String,
    },
}

impl NonLocalBinding {
    /// Returns the `name` field common to all variants.
    pub fn name(&self) -> &str {
        match self {
            NonLocalBinding::ImportDefault { name, .. }
            | NonLocalBinding::ImportSpecifier { name, .. }
            | NonLocalBinding::ImportNamespace { name, .. }
            | NonLocalBinding::ModuleLocal { name, .. }
            | NonLocalBinding::Global { name, .. } => name,
        }
    }
}

// =============================================================================
// Type system (from Types.ts)
// =============================================================================

#[derive(Debug, Clone)]
pub enum Type {
    Primitive,
    Function {
        shape_id: Option<String>,
        return_type: Box<Type>,
        is_constructor: bool,
    },
    Object {
        shape_id: Option<String>,
    },
    TypeVar {
        id: TypeId,
    },
    Poly,
    Phi {
        operands: Vec<Type>,
    },
    Property {
        object_type: Box<Type>,
        object_name: String,
        property_name: PropertyNameKind,
    },
    ObjectMethod,
}

#[derive(Debug, Clone)]
pub enum PropertyNameKind {
    Literal { value: PropertyLiteral },
    Computed { value: Box<Type> },
}

// =============================================================================
// ReactiveScope
// =============================================================================

#[derive(Debug, Clone)]
pub struct ReactiveScope {
    pub id: ScopeId,
    pub range: MutableRange,

    /// The inputs to this reactive scope (populated by later passes)
    pub dependencies: Vec<ReactiveScopeDependency>,

    /// The set of values produced by this scope (populated by later passes)
    pub declarations: Vec<(IdentifierId, ReactiveScopeDeclaration)>,

    /// Identifiers which are reassigned by this scope (populated by later passes)
    pub reassignments: Vec<IdentifierId>,

    /// If the scope contains an early return, this stores info about it (populated by later passes)
    pub early_return_value: Option<ReactiveScopeEarlyReturn>,

    /// Scopes that were merged into this one (populated by later passes)
    pub merged: Vec<ScopeId>,

    /// Source location spanning the scope
    pub loc: Option<SourceLocation>,
}

/// A dependency of a reactive scope.
#[derive(Debug, Clone)]
pub struct ReactiveScopeDependency {
    pub identifier: IdentifierId,
    pub reactive: bool,
    pub path: Vec<DependencyPathEntry>,
    pub loc: Option<SourceLocation>,
}

/// A declaration produced by a reactive scope.
#[derive(Debug, Clone)]
pub struct ReactiveScopeDeclaration {
    pub identifier: IdentifierId,
    pub scope: ScopeId,
}

/// Early return value info for a reactive scope.
#[derive(Debug, Clone)]
pub struct ReactiveScopeEarlyReturn {
    pub value: IdentifierId,
    pub loc: Option<SourceLocation>,
    pub label: BlockId,
}

// =============================================================================
// Aliasing effects (runtime types, from AliasingEffects.ts)
// =============================================================================

use crate::object_shape::FunctionSignature;
use crate::type_config::ValueKind;
use crate::type_config::ValueReason;

/// Reason for a mutation, used for generating hints (e.g. rename to "Ref").
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum MutationReason {
    AssignCurrentProperty,
}

/// Describes the aliasing/mutation/data-flow effects of an instruction or terminal.
/// Ported from TS `AliasingEffect` in `AliasingEffects.ts`.
#[derive(Debug, Clone)]
pub enum AliasingEffect {
    /// Marks the given value and its direct aliases as frozen.
    Freeze { value: Place, reason: ValueReason },
    /// Mutate the value and any direct aliases.
    Mutate {
        value: Place,
        reason: Option<MutationReason>,
    },
    /// Mutate the value conditionally (only if mutable).
    MutateConditionally { value: Place },
    /// Mutate the value and transitive captures.
    MutateTransitive { value: Place },
    /// Mutate the value and transitive captures conditionally.
    MutateTransitiveConditionally { value: Place },
    /// Information flow from `from` to `into` (non-aliasing capture).
    Capture { from: Place, into: Place },
    /// Direct aliasing: mutation of `into` implies mutation of `from`.
    Alias { from: Place, into: Place },
    /// Potential aliasing relationship.
    MaybeAlias { from: Place, into: Place },
    /// Direct assignment: `into = from`.
    Assign { from: Place, into: Place },
    /// Creates a value of the given kind at the given place.
    Create {
        into: Place,
        value: ValueKind,
        reason: ValueReason,
    },
    /// Creates a new value with the same kind as the source.
    CreateFrom { from: Place, into: Place },
    /// Immutable data flow (escape analysis only, no mutable range influence).
    ImmutableCapture { from: Place, into: Place },
    /// Function call application.
    Apply {
        receiver: Place,
        function: Place,
        mutates_function: bool,
        args: Vec<PlaceOrSpreadOrHole>,
        into: Place,
        signature: Option<FunctionSignature>,
        loc: Option<SourceLocation>,
    },
    /// Function expression creation with captures.
    CreateFunction {
        captures: Vec<Place>,
        function_id: FunctionId,
        into: Place,
    },
    /// Mutation of a value known to be frozen (error).
    MutateFrozen {
        place: Place,
        error: CompilerDiagnostic,
    },
    /// Mutation of a global value (error).
    MutateGlobal {
        place: Place,
        error: CompilerDiagnostic,
    },
    /// Side-effect not safe during render.
    Impure {
        place: Place,
        error: CompilerDiagnostic,
    },
    /// Value is accessed during render.
    Render { place: Place },
}

/// Combined Place/Spread/Hole for Apply args.
#[derive(Debug, Clone)]
pub enum PlaceOrSpreadOrHole {
    Place(Place),
    Spread(SpreadPattern),
    Hole,
}

/// Aliasing signature for function calls.
/// Ported from TS `AliasingSignature` in `AliasingEffects.ts`.
#[derive(Debug, Clone)]
pub struct AliasingSignature {
    pub receiver: IdentifierId,
    pub params: Vec<IdentifierId>,
    pub rest: Option<IdentifierId>,
    pub returns: IdentifierId,
    pub effects: Vec<AliasingEffect>,
    pub temporaries: Vec<Place>,
}

// =============================================================================
// Type helper functions (ported from HIR.ts)
// =============================================================================

use crate::object_shape::BUILT_IN_ARRAY_ID;
use crate::object_shape::BUILT_IN_JSX_ID;
use crate::object_shape::BUILT_IN_MAP_ID;
use crate::object_shape::BUILT_IN_PROPS_ID;
use crate::object_shape::BUILT_IN_REF_VALUE_ID;
use crate::object_shape::BUILT_IN_SET_ID;
use crate::object_shape::BUILT_IN_USE_OPERATOR_ID;
use crate::object_shape::BUILT_IN_USE_REF_ID;

/// Returns true if the type (looked up via identifier) is primitive.
pub fn is_primitive_type(ty: &Type) -> bool {
    matches!(ty, Type::Primitive)
}

/// Returns true if the type is the props object.
pub fn is_props_type(ty: &Type) -> bool {
    matches!(ty, Type::Object { shape_id: Some(id) } if id == BUILT_IN_PROPS_ID)
}

/// Returns true if the type is an array.
pub fn is_array_type(ty: &Type) -> bool {
    matches!(ty, Type::Object { shape_id: Some(id) } if id == BUILT_IN_ARRAY_ID)
}

/// Returns true if the type is a Set.
pub fn is_set_type(ty: &Type) -> bool {
    matches!(ty, Type::Object { shape_id: Some(id) } if id == BUILT_IN_SET_ID)
}

/// Returns true if the type is a Map.
pub fn is_map_type(ty: &Type) -> bool {
    matches!(ty, Type::Object { shape_id: Some(id) } if id == BUILT_IN_MAP_ID)
}

/// Returns true if the type is JSX.
pub fn is_jsx_type(ty: &Type) -> bool {
    matches!(ty, Type::Object { shape_id: Some(id) } if id == BUILT_IN_JSX_ID)
}

/// Returns true if the identifier type is a ref value.
pub fn is_ref_value_type(ty: &Type) -> bool {
    matches!(ty, Type::Object { shape_id: Some(id) } if id == BUILT_IN_REF_VALUE_ID)
}

/// Returns true if the identifier type is useRef.
pub fn is_use_ref_type(ty: &Type) -> bool {
    matches!(ty, Type::Object { shape_id: Some(id) } if id == BUILT_IN_USE_REF_ID)
}

/// Returns true if the type is a ref or ref value.
pub fn is_ref_or_ref_value(ty: &Type) -> bool {
    is_use_ref_type(ty) || is_ref_value_type(ty)
}

/// Returns true if the type is a useState result (BuiltInUseState).
pub fn is_use_state_type(ty: &Type) -> bool {
    matches!(ty, Type::Object { shape_id: Some(id) } if id == object_shape::BUILT_IN_USE_STATE_ID)
}

/// Returns true if the type is a setState function (BuiltInSetState).
pub fn is_set_state_type(ty: &Type) -> bool {
    matches!(ty, Type::Function { shape_id: Some(id), .. } if id == object_shape::BUILT_IN_SET_STATE_ID)
}

/// Returns true if the type is a useEffect hook.
pub fn is_use_effect_hook_type(ty: &Type) -> bool {
    matches!(ty, Type::Function { shape_id: Some(id), .. } if id == object_shape::BUILT_IN_USE_EFFECT_HOOK_ID)
}

/// Returns true if the type is a useLayoutEffect hook.
pub fn is_use_layout_effect_hook_type(ty: &Type) -> bool {
    matches!(ty, Type::Function { shape_id: Some(id), .. } if id == object_shape::BUILT_IN_USE_LAYOUT_EFFECT_HOOK_ID)
}

/// Returns true if the type is a useInsertionEffect hook.
pub fn is_use_insertion_effect_hook_type(ty: &Type) -> bool {
    matches!(ty, Type::Function { shape_id: Some(id), .. } if id == object_shape::BUILT_IN_USE_INSERTION_EFFECT_HOOK_ID)
}

/// Returns true if the type is a useEffectEvent function.
pub fn is_use_effect_event_type(ty: &Type) -> bool {
    matches!(ty, Type::Function { shape_id: Some(id), .. } if id == object_shape::BUILT_IN_USE_EFFECT_EVENT_ID)
}

/// Returns true if the type is a ref or ref-like mutable type (e.g. Reanimated shared values).
pub fn is_ref_or_ref_like_mutable_type(ty: &Type) -> bool {
    matches!(ty, Type::Object { shape_id: Some(id) }
        if id == object_shape::BUILT_IN_USE_REF_ID || id == object_shape::REANIMATED_SHARED_VALUE_ID)
}

/// Returns true if the type is the `use()` operator (React.use).
pub fn is_use_operator_type(ty: &Type) -> bool {
    matches!(
        ty,
        Type::Function { shape_id: Some(id), .. }
            if id == BUILT_IN_USE_OPERATOR_ID
    )
}

/// Returns true if the type is a plain object (BuiltInObject).
pub fn is_plain_object_type(ty: &Type) -> bool {
    matches!(ty, Type::Object { shape_id: Some(id) } if id == object_shape::BUILT_IN_OBJECT_ID)
}

/// Returns true if the type is a startTransition function (BuiltInStartTransition).
pub fn is_start_transition_type(ty: &Type) -> bool {
    matches!(ty, Type::Function { shape_id: Some(id), .. } if id == object_shape::BUILT_IN_START_TRANSITION_ID)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_format_js_number() {
        // Scientific notation for large numbers (>= 1e21)
        assert_eq!(format_js_number(1e21), "1e+21");
        assert_eq!(format_js_number(1.5e21), "1.5e+21");
        assert_eq!(
            format_js_number(2.18739127891275e22),
            "2.18739127891275e+22"
        );
        assert_eq!(format_js_number(1e100), "1e+100");
        assert_eq!(format_js_number(-1e21), "-1e+21");
        assert_eq!(format_js_number(-1e100), "-1e+100");

        // Scientific notation for small numbers (< 1e-6)
        assert_eq!(format_js_number(1e-7), "1e-7");
        assert_eq!(format_js_number(5e-7), "5e-7");
        assert_eq!(format_js_number(1.5e-8), "1.5e-8");
        assert_eq!(format_js_number(-1.5e-8), "-1.5e-8");

        // Non-scientific large numbers (< 1e21)
        assert_eq!(format_js_number(1e20), "100000000000000000000");
        assert_eq!(format_js_number(1e-6), "0.000001");

        // Integers
        assert_eq!(format_js_number(0.0), "0");
        assert_eq!(format_js_number(-0.0), "0");
        assert_eq!(format_js_number(1.0), "1");
        assert_eq!(format_js_number(100.0), "100");

        // Regular floats
        assert_eq!(format_js_number(1.5), "1.5");
        assert_eq!(format_js_number(0.5), "0.5");
        assert_eq!(format_js_number(0.1), "0.1");

        // Special values
        assert_eq!(format_js_number(f64::NAN), "NaN");
        assert_eq!(format_js_number(f64::INFINITY), "Infinity");
        assert_eq!(format_js_number(f64::NEG_INFINITY), "-Infinity");
    }
}
