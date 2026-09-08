// Copyright (c) Meta Platforms, Inc. and affiliates.
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

//! Reactive function types — tree representation of a compiled function.
//!
//! `ReactiveFunction` is derived from the HIR CFG by `BuildReactiveFunction`.
//! Control flow constructs (if/switch/loops/try) and reactive scopes become
//! nested blocks rather than block references.
//!
//! Corresponds to the reactive types in `HIR.ts`.

use react_compiler_diagnostics::SourceLocation;

use crate::{
    AliasingEffect, BlockId, EvaluationOrder, InstructionValue, LogicalOperator, ParamPattern,
    Place, ScopeId,
};

// =============================================================================
// ReactiveFunction
// =============================================================================

/// Tree representation of a compiled function, converted from the CFG-based HIR.
/// TS: ReactiveFunction in HIR.ts
#[derive(Debug, Clone)]
pub struct ReactiveFunction {
    pub loc: Option<SourceLocation>,
    pub id: Option<String>,
    pub name_hint: Option<String>,
    pub params: Vec<ParamPattern>,
    pub generator: bool,
    pub is_async: bool,
    pub body: ReactiveBlock,
    pub directives: Vec<String>,
    // No env field — passed separately per established Rust convention
}

// =============================================================================
// ReactiveBlock and ReactiveStatement
// =============================================================================

/// TS: ReactiveBlock = Array<ReactiveStatement>
pub type ReactiveBlock = Vec<ReactiveStatement>;

/// TS: ReactiveStatement (discriminated union with 'kind' field)
#[derive(Debug, Clone)]
pub enum ReactiveStatement {
    Instruction(ReactiveInstruction),
    Terminal(ReactiveTerminalStatement),
    Scope(ReactiveScopeBlock),
    PrunedScope(PrunedReactiveScopeBlock),
}

// =============================================================================
// ReactiveInstruction and ReactiveValue
// =============================================================================

/// TS: ReactiveInstruction
#[derive(Debug, Clone)]
pub struct ReactiveInstruction {
    pub id: EvaluationOrder,
    pub lvalue: Option<Place>,
    pub value: ReactiveValue,
    pub effects: Option<Vec<AliasingEffect>>,
    pub loc: Option<SourceLocation>,
}

/// Extends InstructionValue with compound expression types that were
/// separate blocks+terminals in HIR but become nested expressions here.
/// TS: ReactiveValue = InstructionValue | ReactiveLogicalValue | ...
#[derive(Debug, Clone)]
pub enum ReactiveValue {
    /// All ~35 base instruction value kinds
    Instruction(InstructionValue),

    /// TS: ReactiveLogicalValue
    LogicalExpression {
        operator: LogicalOperator,
        left: Box<ReactiveValue>,
        right: Box<ReactiveValue>,
        loc: Option<SourceLocation>,
    },

    /// TS: ReactiveTernaryValue
    ConditionalExpression {
        test: Box<ReactiveValue>,
        consequent: Box<ReactiveValue>,
        alternate: Box<ReactiveValue>,
        loc: Option<SourceLocation>,
    },

    /// TS: ReactiveSequenceValue
    SequenceExpression {
        instructions: Vec<ReactiveInstruction>,
        id: EvaluationOrder,
        value: Box<ReactiveValue>,
        loc: Option<SourceLocation>,
    },

    /// TS: ReactiveOptionalCallValue
    OptionalExpression {
        id: EvaluationOrder,
        value: Box<ReactiveValue>,
        optional: bool,
        loc: Option<SourceLocation>,
    },
}

// =============================================================================
// Terminals
// =============================================================================

#[derive(Debug, Clone)]
pub struct ReactiveTerminalStatement {
    pub terminal: ReactiveTerminal,
    pub label: Option<ReactiveLabel>,
}

#[derive(Debug, Clone)]
pub struct ReactiveLabel {
    pub id: BlockId,
    pub implicit: bool,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ReactiveTerminalTargetKind {
    Implicit,
    Labeled,
    Unlabeled,
}

impl std::fmt::Display for ReactiveTerminalTargetKind {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ReactiveTerminalTargetKind::Implicit => write!(f, "implicit"),
            ReactiveTerminalTargetKind::Labeled => write!(f, "labeled"),
            ReactiveTerminalTargetKind::Unlabeled => write!(f, "unlabeled"),
        }
    }
}

#[derive(Debug, Clone)]
pub enum ReactiveTerminal {
    Break {
        target: BlockId,
        id: EvaluationOrder,
        target_kind: ReactiveTerminalTargetKind,
        loc: Option<SourceLocation>,
    },
    Continue {
        target: BlockId,
        id: EvaluationOrder,
        target_kind: ReactiveTerminalTargetKind,
        loc: Option<SourceLocation>,
    },
    Return {
        value: Place,
        id: EvaluationOrder,
        loc: Option<SourceLocation>,
    },
    Throw {
        value: Place,
        id: EvaluationOrder,
        loc: Option<SourceLocation>,
    },
    Switch {
        test: Place,
        cases: Vec<ReactiveSwitchCase>,
        id: EvaluationOrder,
        loc: Option<SourceLocation>,
    },
    DoWhile {
        loop_block: ReactiveBlock,
        test: ReactiveValue,
        id: EvaluationOrder,
        loc: Option<SourceLocation>,
    },
    While {
        test: ReactiveValue,
        loop_block: ReactiveBlock,
        id: EvaluationOrder,
        loc: Option<SourceLocation>,
    },
    For {
        init: ReactiveValue,
        test: ReactiveValue,
        update: Option<ReactiveValue>,
        loop_block: ReactiveBlock,
        id: EvaluationOrder,
        loc: Option<SourceLocation>,
    },
    ForOf {
        init: ReactiveValue,
        test: ReactiveValue,
        loop_block: ReactiveBlock,
        id: EvaluationOrder,
        loc: Option<SourceLocation>,
    },
    ForIn {
        init: ReactiveValue,
        loop_block: ReactiveBlock,
        id: EvaluationOrder,
        loc: Option<SourceLocation>,
    },
    If {
        test: Place,
        consequent: ReactiveBlock,
        alternate: Option<ReactiveBlock>,
        id: EvaluationOrder,
        loc: Option<SourceLocation>,
    },
    Label {
        block: ReactiveBlock,
        id: EvaluationOrder,
        loc: Option<SourceLocation>,
    },
    Try {
        block: ReactiveBlock,
        handler_binding: Option<Place>,
        handler: ReactiveBlock,
        id: EvaluationOrder,
        loc: Option<SourceLocation>,
    },
}

#[derive(Debug, Clone)]
pub struct ReactiveSwitchCase {
    pub test: Option<Place>,
    pub block: Option<ReactiveBlock>,
}

// =============================================================================
// Scope Blocks
// =============================================================================

#[derive(Debug, Clone)]
pub struct ReactiveScopeBlock {
    pub scope: ScopeId,
    pub instructions: ReactiveBlock,
}

#[derive(Debug, Clone)]
pub struct PrunedReactiveScopeBlock {
    pub scope: ScopeId,
    pub instructions: ReactiveBlock,
}
