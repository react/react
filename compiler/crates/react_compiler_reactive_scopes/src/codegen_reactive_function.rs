// Copyright (c) Meta Platforms, Inc. and affiliates.
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

//! Code generation pass: converts a `ReactiveFunction` tree back into a Babel-compatible
//! AST with memoization (useMemoCache) wired in.
//!
//! This is the final pass in the compilation pipeline.
//!
//! Corresponds to `src/ReactiveScopes/CodegenReactiveFunction.ts` in the TS compiler.

use rustc_hash::{FxHashMap, FxHashSet};

use react_compiler_ast::common::BaseNode;
use react_compiler_ast::common::Position as AstPosition;
use react_compiler_ast::common::RawNode;
use react_compiler_ast::common::SourceLocation as AstSourceLocation;
use react_compiler_ast::expressions::ArrowFunctionBody;
use react_compiler_ast::expressions::Expression;
use react_compiler_ast::expressions::Identifier as AstIdentifier;
use react_compiler_ast::expressions::{self as ast_expr};
use react_compiler_ast::jsx::JSXAttribute as AstJSXAttribute;
use react_compiler_ast::jsx::JSXAttributeItem;
use react_compiler_ast::jsx::JSXAttributeName;
use react_compiler_ast::jsx::JSXAttributeValue;
use react_compiler_ast::jsx::JSXChild;
use react_compiler_ast::jsx::JSXClosingElement;
use react_compiler_ast::jsx::JSXClosingFragment;
use react_compiler_ast::jsx::JSXElement;
use react_compiler_ast::jsx::JSXElementName;
use react_compiler_ast::jsx::JSXExpressionContainer;
use react_compiler_ast::jsx::JSXExpressionContainerExpr;
use react_compiler_ast::jsx::JSXFragment;
use react_compiler_ast::jsx::JSXIdentifier;
use react_compiler_ast::jsx::JSXMemberExprObject;
use react_compiler_ast::jsx::JSXMemberExpression;
use react_compiler_ast::jsx::JSXNamespacedName;
use react_compiler_ast::jsx::JSXOpeningElement;
use react_compiler_ast::jsx::JSXOpeningFragment;
use react_compiler_ast::jsx::JSXSpreadAttribute;
use react_compiler_ast::jsx::JSXText;
use react_compiler_ast::literals::BooleanLiteral;
use react_compiler_ast::literals::NullLiteral;
use react_compiler_ast::literals::NumericLiteral;
use react_compiler_ast::literals::RegExpLiteral as AstRegExpLiteral;
use react_compiler_ast::literals::StringLiteral;
use react_compiler_ast::literals::TemplateElement;
use react_compiler_ast::literals::TemplateElementValue;
use react_compiler_ast::operators::AssignmentOperator;
use react_compiler_ast::operators::BinaryOperator as AstBinaryOperator;
use react_compiler_ast::operators::LogicalOperator as AstLogicalOperator;
use react_compiler_ast::operators::UnaryOperator as AstUnaryOperator;
use react_compiler_ast::operators::UpdateOperator as AstUpdateOperator;
use react_compiler_ast::patterns::ArrayPattern as AstArrayPattern;
use react_compiler_ast::patterns::ObjectPatternProp;
use react_compiler_ast::patterns::ObjectPatternProperty;
use react_compiler_ast::patterns::PatternLike;
use react_compiler_ast::patterns::RestElement;
use react_compiler_ast::statements::BlockStatement;
use react_compiler_ast::statements::BreakStatement;
use react_compiler_ast::statements::CatchClause;
use react_compiler_ast::statements::ContinueStatement;
use react_compiler_ast::statements::DebuggerStatement;
use react_compiler_ast::statements::Directive;
use react_compiler_ast::statements::DirectiveLiteral;
use react_compiler_ast::statements::DoWhileStatement;
use react_compiler_ast::statements::EmptyStatement;
use react_compiler_ast::statements::ExpressionStatement;
use react_compiler_ast::statements::ForInStatement;
use react_compiler_ast::statements::ForInit;
use react_compiler_ast::statements::ForOfStatement;
use react_compiler_ast::statements::ForStatement;
use react_compiler_ast::statements::FunctionDeclaration;
use react_compiler_ast::statements::IfStatement;
use react_compiler_ast::statements::LabeledStatement;
use react_compiler_ast::statements::ReturnStatement;
use react_compiler_ast::statements::Statement;
use react_compiler_ast::statements::SwitchCase;
use react_compiler_ast::statements::SwitchStatement;
use react_compiler_ast::statements::ThrowStatement;
use react_compiler_ast::statements::TryStatement;
use react_compiler_ast::statements::UnknownStatement;
use react_compiler_ast::statements::VariableDeclaration;
use react_compiler_ast::statements::VariableDeclarationKind;
use react_compiler_ast::statements::VariableDeclarator;
use react_compiler_ast::statements::WhileStatement;
use react_compiler_ast::statements::is_known_statement_type;
use react_compiler_diagnostics::CompilerDiagnostic;
use react_compiler_diagnostics::CompilerDiagnosticDetail;
use react_compiler_diagnostics::CompilerError;
use react_compiler_diagnostics::CompilerErrorDetail;
use react_compiler_diagnostics::ErrorCategory;
use react_compiler_diagnostics::SourceLocation as DiagSourceLocation;
use react_compiler_hir::ArrayElement;
use react_compiler_hir::ArrayPattern;
use react_compiler_hir::BlockId;
use react_compiler_hir::DeclarationId;
use react_compiler_hir::FunctionExpressionType;
use react_compiler_hir::IdentifierId;
use react_compiler_hir::InstructionKind;
use react_compiler_hir::InstructionValue;
use react_compiler_hir::JsxAttribute;
use react_compiler_hir::JsxTag;
use react_compiler_hir::LogicalOperator;
use react_compiler_hir::ObjectPattern;
use react_compiler_hir::ObjectPropertyKey;
use react_compiler_hir::ObjectPropertyOrSpread;
use react_compiler_hir::ObjectPropertyType;
use react_compiler_hir::ParamPattern;
use react_compiler_hir::Pattern;
use react_compiler_hir::Place;
use react_compiler_hir::PlaceOrSpread;
use react_compiler_hir::PrimitiveValue;
use react_compiler_hir::PropertyLiteral;
use react_compiler_hir::ScopeId;
use react_compiler_hir::SpreadPattern;
use react_compiler_hir::environment::Environment;
use react_compiler_hir::reactive::PrunedReactiveScopeBlock;
use react_compiler_hir::reactive::ReactiveBlock;
use react_compiler_hir::reactive::ReactiveFunction;
use react_compiler_hir::reactive::ReactiveInstruction;
use react_compiler_hir::reactive::ReactiveScopeBlock;
use react_compiler_hir::reactive::ReactiveStatement;
use react_compiler_hir::reactive::ReactiveTerminal;
use react_compiler_hir::reactive::ReactiveTerminalTargetKind;
use react_compiler_hir::reactive::ReactiveValue;

use crate::build_reactive_function::build_reactive_function;
use crate::promote_used_temporaries::promote_used_temporaries;
use crate::prune_hoisted_contexts::prune_hoisted_contexts;
use crate::prune_unused_labels::prune_unused_labels;
use crate::prune_unused_lvalues::prune_unused_lvalues;
use crate::rename_variables::rename_variables;
use crate::visitors::ReactiveFunctionVisitor;
use crate::visitors::visit_reactive_function;

// =============================================================================
// Public API
// =============================================================================

pub const MEMO_CACHE_SENTINEL: &str = "react.memo_cache_sentinel";
pub const EARLY_RETURN_SENTINEL: &str = "react.early_return_sentinel";

/// FBT tags whose children get special codegen treatment.
const SINGLE_CHILD_FBT_TAGS: &[&str] = &["fbt:param", "fbs:param"];

/// Result of code generation for a single function.
pub struct CodegenFunction {
    pub loc: Option<DiagSourceLocation>,
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

impl std::fmt::Debug for CodegenFunction {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("CodegenFunction")
            .field("memo_slots_used", &self.memo_slots_used)
            .field("memo_blocks", &self.memo_blocks)
            .field("memo_values", &self.memo_values)
            .field("pruned_memo_blocks", &self.pruned_memo_blocks)
            .field("pruned_memo_values", &self.pruned_memo_values)
            .finish()
    }
}

/// An outlined function extracted during compilation.
pub struct OutlinedFunction {
    pub func: CodegenFunction,
    pub fn_type: Option<react_compiler_hir::ReactFunctionType>,
}

/// Top-level entry point: generates code for a reactive function.
/// Computes the Fast Refresh source hash used to bust the memo cache when the
/// source file changes. Matches the TS compiler's
/// `createHmac('sha256', code).digest('hex')`: an HMAC-SHA256 keyed by the
/// source code, hashing empty data.
fn source_file_hash(code: &str) -> String {
    hmac_sha256::HMAC::mac(b"", code.as_bytes())
        .iter()
        .map(|b| format!("{b:02x}"))
        .collect()
}

pub fn codegen_function(
    func: &ReactiveFunction,
    env: &mut Environment,
    unique_identifiers: FxHashSet<String>,
    fbt_operands: FxHashSet<IdentifierId>,
) -> Result<CodegenFunction, CompilerError> {
    let fn_name = func.id.as_deref().unwrap_or("[[ anonymous ]]");
    let mut cx = Context::new(env, fn_name.to_string(), unique_identifiers, fbt_operands);

    // Fast Refresh: compute source hash and reserve a cache slot if enabled
    let fast_refresh_state: Option<(u32, String)> =
        if cx.env.config.enable_reset_cache_on_source_file_changes == Some(true) {
            if let Some(ref code) = cx.env.code {
                let hash = source_file_hash(code);
                let cache_index = cx.alloc_cache_index(); // Reserve slot 0 for the hash check
                Some((cache_index, hash))
            } else {
                None
            }
        } else {
            None
        };

    let mut compiled = codegen_reactive_function(&mut cx, func)?;

    // enableEmitHookGuards: wrap entire function body in try/finally with
    // $dispatcherGuard(PushHookGuard=0) / $dispatcherGuard(PopHookGuard=1).
    // Per-hook-call wrapping is done inline during codegen (CallExpression/MethodCall).
    if cx.env.hook_guard_name.is_some()
        && cx.env.output_mode == react_compiler_hir::environment::OutputMode::Client
    {
        let guard_name = cx.env.hook_guard_name.as_ref().unwrap().clone();
        let body_stmts = std::mem::replace(&mut compiled.body.body, Vec::new());
        compiled.body.body = vec![create_function_body_hook_guard(
            &guard_name,
            body_stmts,
            0,
            1,
        )];
    }

    let cache_count = compiled.memo_slots_used;
    if cache_count != 0 {
        let mut preface: Vec<Statement> = Vec::new();
        let cache_name = cx.synthesize_name("$");

        // const $ = useMemoCache(N)
        preface.push(Statement::VariableDeclaration(VariableDeclaration {
            base: BaseNode::typed("VariableDeclaration"),
            declarations: vec![VariableDeclarator {
                base: BaseNode::typed("VariableDeclarator"),
                id: PatternLike::Identifier(make_identifier(&cache_name)),
                init: Some(Box::new(Expression::CallExpression(
                    ast_expr::CallExpression {
                        base: BaseNode::typed("CallExpression"),
                        callee: Box::new(Expression::Identifier(make_identifier("useMemoCache"))),
                        arguments: vec![Expression::NumericLiteral(NumericLiteral {
                            base: BaseNode::typed("NumericLiteral"),
                            value: cache_count as f64,
                            extra: None,
                        })],
                        type_parameters: None,
                        type_arguments: None,
                        optional: None,
                    },
                ))),
                definite: None,
            }],
            kind: VariableDeclarationKind::Const,
            declare: None,
        }));

        // Fast Refresh: emit cache invalidation check after useMemoCache
        if let Some((cache_index, ref hash)) = fast_refresh_state {
            let index_var = cx.synthesize_name("$i");
            // if ($[cacheIndex] !== "hash") { for (let $i = 0; $i < N; $i += 1) { $[$i] = Symbol.for("react.memo_cache_sentinel"); } $[cacheIndex] = "hash"; }
            preface.push(Statement::IfStatement(IfStatement {
                base: BaseNode::typed("IfStatement"),
                test: Box::new(Expression::BinaryExpression(ast_expr::BinaryExpression {
                    base: BaseNode::typed("BinaryExpression"),
                    operator: AstBinaryOperator::StrictNeq,
                    left: Box::new(Expression::MemberExpression(ast_expr::MemberExpression {
                        base: BaseNode::typed("MemberExpression"),
                        object: Box::new(Expression::Identifier(make_identifier(&cache_name))),
                        property: Box::new(Expression::NumericLiteral(NumericLiteral {
                            base: BaseNode::typed("NumericLiteral"),
                            value: cache_index as f64,
                            extra: None,
                        })),
                        computed: true,
                    })),
                    right: Box::new(Expression::StringLiteral(StringLiteral {
                        base: BaseNode::typed("StringLiteral"),
                        value: hash.clone().into(),
                    })),
                })),
                consequent: Box::new(Statement::BlockStatement(BlockStatement {
                    base: BaseNode::typed("BlockStatement"),
                    body: vec![
                        // for (let $i = 0; $i < N; $i += 1) { $[$i] = Symbol.for("react.memo_cache_sentinel"); }
                        Statement::ForStatement(ForStatement {
                            base: BaseNode::typed("ForStatement"),
                            init: Some(Box::new(ForInit::VariableDeclaration(
                                VariableDeclaration {
                                    base: BaseNode::typed("VariableDeclaration"),
                                    declarations: vec![VariableDeclarator {
                                        base: BaseNode::typed("VariableDeclarator"),
                                        id: PatternLike::Identifier(make_identifier(&index_var)),
                                        init: Some(Box::new(Expression::NumericLiteral(
                                            NumericLiteral {
                                                base: BaseNode::typed("NumericLiteral"),
                                                value: 0.0,
                                                extra: None,
                                            },
                                        ))),
                                        definite: None,
                                    }],
                                    kind: VariableDeclarationKind::Let,
                                    declare: None,
                                },
                            ))),
                            test: Some(Box::new(Expression::BinaryExpression(
                                ast_expr::BinaryExpression {
                                    base: BaseNode::typed("BinaryExpression"),
                                    operator: AstBinaryOperator::Lt,
                                    left: Box::new(Expression::Identifier(make_identifier(
                                        &index_var,
                                    ))),
                                    right: Box::new(Expression::NumericLiteral(NumericLiteral {
                                        base: BaseNode::typed("NumericLiteral"),
                                        value: cache_count as f64,
                                        extra: None,
                                    })),
                                },
                            ))),
                            update: Some(Box::new(Expression::AssignmentExpression(
                                ast_expr::AssignmentExpression {
                                    base: BaseNode::typed("AssignmentExpression"),
                                    operator: AssignmentOperator::AddAssign,
                                    left: Box::new(PatternLike::Identifier(make_identifier(
                                        &index_var,
                                    ))),
                                    right: Box::new(Expression::NumericLiteral(NumericLiteral {
                                        base: BaseNode::typed("NumericLiteral"),
                                        value: 1.0,
                                        extra: None,
                                    })),
                                },
                            ))),
                            body: Box::new(Statement::BlockStatement(BlockStatement {
                                base: BaseNode::typed("BlockStatement"),
                                body: vec![Statement::ExpressionStatement(ExpressionStatement {
                                    base: BaseNode::typed("ExpressionStatement"),
                                    expression: Box::new(Expression::AssignmentExpression(
                                        ast_expr::AssignmentExpression {
                                            base: BaseNode::typed("AssignmentExpression"),
                                            operator: AssignmentOperator::Assign,
                                            left: Box::new(PatternLike::MemberExpression(
                                                ast_expr::MemberExpression {
                                                    base: BaseNode::typed("MemberExpression"),
                                                    object: Box::new(Expression::Identifier(
                                                        make_identifier(&cache_name),
                                                    )),
                                                    property: Box::new(Expression::Identifier(
                                                        make_identifier(&index_var),
                                                    )),
                                                    computed: true,
                                                },
                                            )),
                                            right: Box::new(Expression::CallExpression(
                                                ast_expr::CallExpression {
                                                    base: BaseNode::typed("CallExpression"),
                                                    callee: Box::new(Expression::MemberExpression(
                                                        ast_expr::MemberExpression {
                                                            base: BaseNode::typed(
                                                                "MemberExpression",
                                                            ),
                                                            object: Box::new(
                                                                Expression::Identifier(
                                                                    make_identifier("Symbol"),
                                                                ),
                                                            ),
                                                            property: Box::new(
                                                                Expression::Identifier(
                                                                    make_identifier("for"),
                                                                ),
                                                            ),
                                                            computed: false,
                                                        },
                                                    )),
                                                    arguments: vec![Expression::StringLiteral(
                                                        StringLiteral {
                                                            base: BaseNode::typed("StringLiteral"),
                                                            value: MEMO_CACHE_SENTINEL
                                                                .to_string()
                                                                .into(),
                                                        },
                                                    )],
                                                    type_parameters: None,
                                                    type_arguments: None,
                                                    optional: None,
                                                },
                                            )),
                                        },
                                    )),
                                })],
                                directives: Vec::new(),
                            })),
                        }),
                        // $[cacheIndex] = "hash"
                        Statement::ExpressionStatement(ExpressionStatement {
                            base: BaseNode::typed("ExpressionStatement"),
                            expression: Box::new(Expression::AssignmentExpression(
                                ast_expr::AssignmentExpression {
                                    base: BaseNode::typed("AssignmentExpression"),
                                    operator: AssignmentOperator::Assign,
                                    left: Box::new(PatternLike::MemberExpression(
                                        ast_expr::MemberExpression {
                                            base: BaseNode::typed("MemberExpression"),
                                            object: Box::new(Expression::Identifier(
                                                make_identifier(&cache_name),
                                            )),
                                            property: Box::new(Expression::NumericLiteral(
                                                NumericLiteral {
                                                    base: BaseNode::typed("NumericLiteral"),
                                                    value: cache_index as f64,
                                                    extra: None,
                                                },
                                            )),
                                            computed: true,
                                        },
                                    )),
                                    right: Box::new(Expression::StringLiteral(StringLiteral {
                                        base: BaseNode::typed("StringLiteral"),
                                        value: hash.clone().into(),
                                    })),
                                },
                            )),
                        }),
                    ],
                    directives: Vec::new(),
                })),
                alternate: None,
            }));
        }

        // Insert preface at the beginning of the body
        let mut new_body = preface;
        new_body.append(&mut compiled.body.body);
        compiled.body.body = new_body;
    }

    // Instrument forget: emit instrumentation call at the top of the function body
    let emit_instrument_forget = cx.env.config.enable_emit_instrument_forget.clone();
    if let Some(ref instrument_config) = emit_instrument_forget {
        if func.id.is_some()
            && cx.env.output_mode == react_compiler_hir::environment::OutputMode::Client
        {
            // Use pre-resolved import names from environment (set by program-level code)
            let instrument_fn_local = cx
                .env
                .instrument_fn_name
                .clone()
                .unwrap_or_else(|| instrument_config.fn_.import_specifier_name.clone());
            let instrument_gating_local = cx.env.instrument_gating_name.clone();

            // Build the gating condition
            let gating_expr: Option<Expression> =
                instrument_gating_local.map(|name| Expression::Identifier(make_identifier(&name)));
            let global_gating_expr: Option<Expression> = instrument_config
                .global_gating
                .as_ref()
                .map(|g| Expression::Identifier(make_identifier(g)));

            let if_test = match (gating_expr, global_gating_expr) {
                (Some(gating), Some(global)) => {
                    Expression::LogicalExpression(ast_expr::LogicalExpression {
                        base: BaseNode::typed("LogicalExpression"),
                        operator: AstLogicalOperator::And,
                        left: Box::new(global),
                        right: Box::new(gating),
                    })
                }
                (Some(gating), None) => gating,
                (None, Some(global)) => global,
                (None, None) => unreachable!(
                    "InstrumentationConfig requires at least one of gating or globalGating"
                ),
            };

            let fn_name_str = func.id.as_deref().unwrap_or("");
            let filename_str = cx.env.filename.as_deref().unwrap_or("");

            let instrument_call = Statement::IfStatement(IfStatement {
                base: BaseNode::typed("IfStatement"),
                test: Box::new(if_test),
                consequent: Box::new(Statement::ExpressionStatement(ExpressionStatement {
                    base: BaseNode::typed("ExpressionStatement"),
                    expression: Box::new(Expression::CallExpression(ast_expr::CallExpression {
                        base: BaseNode::typed("CallExpression"),
                        callee: Box::new(Expression::Identifier(make_identifier(
                            &instrument_fn_local,
                        ))),
                        arguments: vec![
                            Expression::StringLiteral(StringLiteral {
                                base: BaseNode::typed("StringLiteral"),
                                value: fn_name_str.to_string().into(),
                            }),
                            Expression::StringLiteral(StringLiteral {
                                base: BaseNode::typed("StringLiteral"),
                                value: filename_str.to_string().into(),
                            }),
                        ],
                        type_parameters: None,
                        type_arguments: None,
                        optional: None,
                    })),
                })),
                alternate: None,
            });
            compiled.body.body.insert(0, instrument_call);
        }
    }

    // Process outlined functions.
    // Use clone (not take) to match TS behavior: getOutlinedFunctions() returns
    // a reference, so outlined functions persist on the environment and are also
    // available to the parent function's codegen. The inner function codegen
    // processes them here, and the parent/top-level codegen processes them again.
    let outlined_entries = cx.env.get_outlined_functions().to_vec();
    let mut outlined: Vec<OutlinedFunction> = Vec::new();
    for entry in outlined_entries {
        let reactive_fn = build_reactive_function(&entry.func, cx.env)?;
        let mut reactive_fn_mut = reactive_fn;
        prune_unused_labels(&mut reactive_fn_mut, cx.env)?;
        prune_unused_lvalues(&mut reactive_fn_mut, cx.env);
        // Outlined functions are codegen'd outside the main pipeline, which
        // runs PromoteUsedTemporaries before codegen. Without it, temporaries
        // here can be inlined past an interposing store (e.g. the write-back
        // of a postfix update), reordering effects and changing semantics.
        promote_used_temporaries(&mut reactive_fn_mut, cx.env);
        prune_hoisted_contexts(&mut reactive_fn_mut, cx.env)?;

        let identifiers = rename_variables(&mut reactive_fn_mut, cx.env);
        let mut outlined_cx = Context::new(
            cx.env,
            reactive_fn_mut
                .id
                .as_deref()
                .unwrap_or("[[ anonymous ]]")
                .to_string(),
            identifiers,
            cx.fbt_operands.clone(),
        );
        let codegen = codegen_reactive_function(&mut outlined_cx, &reactive_fn_mut)?;
        outlined.push(OutlinedFunction {
            func: codegen,
            fn_type: entry.fn_type,
        });
    }
    compiled.outlined = outlined;

    Ok(compiled)
}

// =============================================================================
// Context
// =============================================================================

type Temporaries = FxHashMap<DeclarationId, Option<ExpressionOrJsxText>>;

#[derive(Clone)]
enum ExpressionOrJsxText {
    Expression(Expression),
    JsxText(JSXText),
}

struct Context<'env> {
    env: &'env mut Environment,
    #[allow(dead_code)]
    fn_name: String,
    next_cache_index: u32,
    declarations: FxHashSet<DeclarationId>,
    temp: Temporaries,
    object_methods: FxHashMap<
        IdentifierId,
        (
            InstructionValue,
            Option<react_compiler_diagnostics::SourceLocation>,
        ),
    >,
    unique_identifiers: FxHashSet<String>,
    fbt_operands: FxHashSet<IdentifierId>,
    synthesized_names: FxHashMap<String, String>,
}

impl<'env> Context<'env> {
    fn new(
        env: &'env mut Environment,
        fn_name: String,
        unique_identifiers: FxHashSet<String>,
        fbt_operands: FxHashSet<IdentifierId>,
    ) -> Self {
        Context {
            env,
            fn_name,
            next_cache_index: 0,
            declarations: FxHashSet::default(),
            temp: FxHashMap::default(),
            object_methods: FxHashMap::default(),
            unique_identifiers,
            fbt_operands,
            synthesized_names: FxHashMap::default(),
        }
    }

    fn alloc_cache_index(&mut self) -> u32 {
        let idx = self.next_cache_index;
        self.next_cache_index += 1;
        idx
    }

    fn declare(&mut self, identifier_id: IdentifierId) {
        let ident = &self.env.identifiers[identifier_id.0 as usize];
        self.declarations.insert(ident.declaration_id);
    }

    fn has_declared(&self, identifier_id: IdentifierId) -> bool {
        let ident = &self.env.identifiers[identifier_id.0 as usize];
        self.declarations.contains(&ident.declaration_id)
    }

    fn synthesize_name(&mut self, name: &str) -> String {
        if let Some(prev) = self.synthesized_names.get(name) {
            return prev.clone();
        }
        let mut validated = name.to_string();
        let mut index = 0u32;
        while self.unique_identifiers.contains(&validated) {
            validated = format!("{name}{index}");
            index += 1;
        }
        self.unique_identifiers.insert(validated.clone());
        self.synthesized_names
            .insert(name.to_string(), validated.clone());
        validated
    }

    fn record_error(&mut self, detail: CompilerErrorDetail) -> Result<(), CompilerError> {
        self.env.record_error(detail)
    }
}

// =============================================================================
// Core codegen functions
// =============================================================================

fn codegen_reactive_function(
    cx: &mut Context,
    func: &ReactiveFunction,
) -> Result<CodegenFunction, CompilerError> {
    // Register parameters
    for param in &func.params {
        let place = match param {
            ParamPattern::Place(p) => p,
            ParamPattern::Spread(sp) => &sp.place,
        };
        let ident = &cx.env.identifiers[place.identifier.0 as usize];
        cx.temp.insert(ident.declaration_id, None);
        cx.declare(place.identifier);
    }

    let params: Vec<PatternLike> = func
        .params
        .iter()
        .map(|p| convert_parameter(p, cx.env))
        .collect::<Result<_, _>>()?;
    let mut body = codegen_block(cx, &func.body)?;

    // Add directives
    body.directives = func
        .directives
        .iter()
        .map(|d| Directive {
            base: BaseNode::typed("Directive"),
            value: DirectiveLiteral {
                base: BaseNode::typed("DirectiveLiteral"),
                value: d.clone(),
            },
        })
        .collect();

    // Remove trailing `return undefined`
    if let Some(last) = body.body.last() {
        if matches!(last, Statement::ReturnStatement(ret) if ret.argument.is_none()) {
            body.body.pop();
        }
    }

    // Count memo blocks
    let (memo_blocks, memo_values, pruned_memo_blocks, pruned_memo_values) =
        count_memo_blocks(func, cx.env);

    Ok(CodegenFunction {
        loc: func.loc,
        id: func.id.as_ref().map(|name| make_identifier(name)),
        name_hint: func.name_hint.clone(),
        params,
        body,
        generator: func.generator,
        is_async: func.is_async,
        memo_slots_used: cx.next_cache_index,
        memo_blocks,
        memo_values,
        pruned_memo_blocks,
        pruned_memo_values,
        outlined: Vec::new(),
    })
}

fn convert_parameter(
    param: &ParamPattern,
    env: &Environment,
) -> Result<PatternLike, CompilerError> {
    match param {
        ParamPattern::Place(place) => Ok(PatternLike::Identifier(convert_identifier(
            place.identifier,
            env,
        )?)),
        ParamPattern::Spread(spread) => Ok(PatternLike::RestElement(RestElement {
            base: BaseNode::typed("RestElement"),
            argument: Box::new(PatternLike::Identifier(convert_identifier(
                spread.place.identifier,
                env,
            )?)),
            type_annotation: None,
            decorators: None,
        })),
    }
}

// =============================================================================
// Block codegen
// =============================================================================

fn codegen_block(cx: &mut Context, block: &ReactiveBlock) -> Result<BlockStatement, CompilerError> {
    let temp_snapshot: Temporaries = cx.temp.clone();
    let result = codegen_block_no_reset(cx, block)?;
    cx.temp = temp_snapshot;
    Ok(result)
}

fn codegen_block_no_reset(
    cx: &mut Context,
    block: &ReactiveBlock,
) -> Result<BlockStatement, CompilerError> {
    let mut statements: Vec<Statement> = Vec::new();
    for item in block {
        match item {
            ReactiveStatement::Instruction(instr) => {
                if let Some(stmt) = codegen_instruction_nullable(cx, instr)? {
                    statements.push(stmt);
                }
            }
            ReactiveStatement::PrunedScope(PrunedReactiveScopeBlock { instructions, .. }) => {
                let scope_block = codegen_block_no_reset(cx, instructions)?;
                statements.extend(scope_block.body);
            }
            ReactiveStatement::Scope(ReactiveScopeBlock {
                scope,
                instructions,
            }) => {
                let temp_snapshot = cx.temp.clone();
                codegen_reactive_scope(cx, &mut statements, *scope, instructions)?;
                cx.temp = temp_snapshot;
            }
            ReactiveStatement::Terminal(term_stmt) => {
                let stmt = codegen_terminal(cx, &term_stmt.terminal)?;
                let Some(stmt) = stmt else {
                    continue;
                };
                if let Some(ref label) = term_stmt.label {
                    if !label.implicit {
                        let inner = if let Statement::BlockStatement(bs) = &stmt {
                            if bs.body.len() == 1 {
                                bs.body[0].clone()
                            } else {
                                stmt
                            }
                        } else {
                            stmt
                        };
                        statements.push(Statement::LabeledStatement(LabeledStatement {
                            base: BaseNode::typed("LabeledStatement"),
                            label: make_identifier(&codegen_label(label.id)),
                            body: Box::new(inner),
                        }));
                    } else if let Statement::BlockStatement(bs) = stmt {
                        statements.extend(bs.body);
                    } else {
                        statements.push(stmt);
                    }
                } else if let Statement::BlockStatement(bs) = stmt {
                    statements.extend(bs.body);
                } else {
                    statements.push(stmt);
                }
            }
        }
    }
    Ok(BlockStatement {
        base: BaseNode::typed("BlockStatement"),
        body: statements,
        directives: Vec::new(),
    })
}

// =============================================================================
// Reactive scope codegen (memoization)
// =============================================================================

fn codegen_reactive_scope(
    cx: &mut Context,
    statements: &mut Vec<Statement>,
    scope_id: ScopeId,
    block: &ReactiveBlock,
) -> Result<(), CompilerError> {
    // Clone scope data upfront to avoid holding a borrow on cx.env
    let scope_deps = cx.env.scopes[scope_id.0 as usize].dependencies.clone();
    let scope_decls = cx.env.scopes[scope_id.0 as usize].declarations.clone();
    let scope_reassignments = cx.env.scopes[scope_id.0 as usize].reassignments.clone();

    let mut cache_store_stmts: Vec<Statement> = Vec::new();
    let mut cache_load_stmts: Vec<Statement> = Vec::new();
    let mut cache_loads: Vec<(AstIdentifier, u32, Expression)> = Vec::new();
    let mut change_exprs: Vec<Expression> = Vec::new();

    // Sort dependencies
    let mut deps = scope_deps;
    deps.sort_by(|a, b| compare_scope_dependency(a, b, cx.env));

    for dep in &deps {
        let index = cx.alloc_cache_index();
        let cache_name = cx.synthesize_name("$");
        let comparison = Expression::BinaryExpression(ast_expr::BinaryExpression {
            base: BaseNode::typed("BinaryExpression"),
            operator: AstBinaryOperator::StrictNeq,
            left: Box::new(Expression::MemberExpression(ast_expr::MemberExpression {
                base: BaseNode::typed("MemberExpression"),
                object: Box::new(Expression::Identifier(make_identifier(&cache_name))),
                property: Box::new(Expression::NumericLiteral(NumericLiteral {
                    base: BaseNode::typed("NumericLiteral"),
                    value: index as f64,
                    extra: None,
                })),
                computed: true,
            })),
            right: Box::new(codegen_dependency(cx, dep)?),
        });
        change_exprs.push(comparison);

        // Store dependency value into cache
        let dep_value = codegen_dependency(cx, dep)?;
        cache_store_stmts.push(Statement::ExpressionStatement(ExpressionStatement {
            base: BaseNode::typed("ExpressionStatement"),
            expression: Box::new(Expression::AssignmentExpression(
                ast_expr::AssignmentExpression {
                    base: BaseNode::typed("AssignmentExpression"),
                    operator: AssignmentOperator::Assign,
                    left: Box::new(PatternLike::MemberExpression(ast_expr::MemberExpression {
                        base: BaseNode::typed("MemberExpression"),
                        object: Box::new(Expression::Identifier(make_identifier(&cache_name))),
                        property: Box::new(Expression::NumericLiteral(NumericLiteral {
                            base: BaseNode::typed("NumericLiteral"),
                            value: index as f64,
                            extra: None,
                        })),
                        computed: true,
                    })),
                    right: Box::new(dep_value),
                },
            )),
        }));
    }

    let mut first_output_index: Option<u32> = None;

    // Sort declarations
    let mut decls = scope_decls;
    decls.sort_by(|(_id_a, a), (_id_b, b)| compare_scope_declaration(a, b, cx.env));

    for (_ident_id, decl) in &decls {
        let index = cx.alloc_cache_index();
        if first_output_index.is_none() {
            first_output_index = Some(index);
        }

        let ident = &cx.env.identifiers[decl.identifier.0 as usize];
        invariant(
            ident.name.is_some(),
            &format!(
                "Expected scope declaration identifier to be named, id={}",
                decl.identifier.0
            ),
            None,
        )?;

        let name = convert_identifier(decl.identifier, cx.env)?;
        if !cx.has_declared(decl.identifier) {
            statements.push(Statement::VariableDeclaration(VariableDeclaration {
                base: BaseNode::typed("VariableDeclaration"),
                declarations: vec![make_var_declarator(
                    PatternLike::Identifier(name.clone()),
                    None,
                )],
                kind: VariableDeclarationKind::Let,
                declare: None,
            }));
        }
        cache_loads.push((name.clone(), index, Expression::Identifier(name.clone())));
        cx.declare(decl.identifier);
    }

    for reassignment_id in scope_reassignments {
        let index = cx.alloc_cache_index();
        if first_output_index.is_none() {
            first_output_index = Some(index);
        }
        let name = convert_identifier(reassignment_id, cx.env)?;
        cache_loads.push((name.clone(), index, Expression::Identifier(name)));
    }

    // Build test condition
    let test_condition = if change_exprs.is_empty() {
        let first_idx = first_output_index.ok_or_else(|| {
            invariant_err("Expected scope to have at least one declaration", None)
        })?;
        let cache_name = cx.synthesize_name("$");
        Expression::BinaryExpression(ast_expr::BinaryExpression {
            base: BaseNode::typed("BinaryExpression"),
            operator: AstBinaryOperator::StrictEq,
            left: Box::new(Expression::MemberExpression(ast_expr::MemberExpression {
                base: BaseNode::typed("MemberExpression"),
                object: Box::new(Expression::Identifier(make_identifier(&cache_name))),
                property: Box::new(Expression::NumericLiteral(NumericLiteral {
                    base: BaseNode::typed("NumericLiteral"),
                    value: first_idx as f64,
                    extra: None,
                })),
                computed: true,
            })),
            right: Box::new(symbol_for(MEMO_CACHE_SENTINEL)),
        })
    } else {
        change_exprs
            .into_iter()
            .reduce(|acc, expr| {
                Expression::LogicalExpression(ast_expr::LogicalExpression {
                    base: BaseNode::typed("LogicalExpression"),
                    operator: AstLogicalOperator::Or,
                    left: Box::new(acc),
                    right: Box::new(expr),
                })
            })
            .unwrap()
    };

    let mut computation_block = codegen_block(cx, block)?;

    // Build cache store and load statements for declarations
    for (name, index, value) in &cache_loads {
        let cache_name = cx.synthesize_name("$");
        cache_store_stmts.push(Statement::ExpressionStatement(ExpressionStatement {
            base: BaseNode::typed("ExpressionStatement"),
            expression: Box::new(Expression::AssignmentExpression(
                ast_expr::AssignmentExpression {
                    base: BaseNode::typed("AssignmentExpression"),
                    operator: AssignmentOperator::Assign,
                    left: Box::new(PatternLike::MemberExpression(ast_expr::MemberExpression {
                        base: BaseNode::typed("MemberExpression"),
                        object: Box::new(Expression::Identifier(make_identifier(&cache_name))),
                        property: Box::new(Expression::NumericLiteral(NumericLiteral {
                            base: BaseNode::typed("NumericLiteral"),
                            value: *index as f64,
                            extra: None,
                        })),
                        computed: true,
                    })),
                    right: Box::new(value.clone()),
                },
            )),
        }));
        cache_load_stmts.push(Statement::ExpressionStatement(ExpressionStatement {
            base: BaseNode::typed("ExpressionStatement"),
            expression: Box::new(Expression::AssignmentExpression(
                ast_expr::AssignmentExpression {
                    base: BaseNode::typed("AssignmentExpression"),
                    operator: AssignmentOperator::Assign,
                    left: Box::new(PatternLike::Identifier(name.clone())),
                    right: Box::new(Expression::MemberExpression(ast_expr::MemberExpression {
                        base: BaseNode::typed("MemberExpression"),
                        object: Box::new(Expression::Identifier(make_identifier(&cache_name))),
                        property: Box::new(Expression::NumericLiteral(NumericLiteral {
                            base: BaseNode::typed("NumericLiteral"),
                            value: *index as f64,
                            extra: None,
                        })),
                        computed: true,
                    })),
                },
            )),
        }));
    }

    computation_block.body.extend(cache_store_stmts);

    let memo_stmt = Statement::IfStatement(IfStatement {
        base: BaseNode::typed("IfStatement"),
        test: Box::new(test_condition),
        consequent: Box::new(Statement::BlockStatement(computation_block)),
        alternate: Some(Box::new(Statement::BlockStatement(BlockStatement {
            base: BaseNode::typed("BlockStatement"),
            body: cache_load_stmts,
            directives: Vec::new(),
        }))),
    });
    statements.push(memo_stmt);

    // Handle early return
    let early_return_value = cx.env.scopes[scope_id.0 as usize]
        .early_return_value
        .clone();
    if let Some(ref early_return) = early_return_value {
        let early_ident = &cx.env.identifiers[early_return.value.0 as usize];
        let name = match &early_ident.name {
            Some(react_compiler_hir::IdentifierName::Named(n)) => n.clone(),
            Some(react_compiler_hir::IdentifierName::Promoted(n)) => n.clone(),
            None => {
                return Err(invariant_err(
                    "Expected early return value to be promoted to a named variable",
                    early_return.loc,
                ));
            }
        };
        statements.push(Statement::IfStatement(IfStatement {
            base: BaseNode::typed("IfStatement"),
            test: Box::new(Expression::BinaryExpression(ast_expr::BinaryExpression {
                base: BaseNode::typed("BinaryExpression"),
                operator: AstBinaryOperator::StrictNeq,
                left: Box::new(Expression::Identifier(make_identifier(&name))),
                right: Box::new(symbol_for(EARLY_RETURN_SENTINEL)),
            })),
            consequent: Box::new(Statement::BlockStatement(BlockStatement {
                base: BaseNode::typed("BlockStatement"),
                body: vec![Statement::ReturnStatement(ReturnStatement {
                    base: BaseNode::typed("ReturnStatement"),
                    argument: Some(Box::new(Expression::Identifier(make_identifier(&name)))),
                })],
                directives: Vec::new(),
            })),
            alternate: None,
        }));
    }

    Ok(())
}

// =============================================================================
// Terminal codegen
// =============================================================================

fn codegen_terminal(
    cx: &mut Context,
    terminal: &ReactiveTerminal,
) -> Result<Option<Statement>, CompilerError> {
    match terminal {
        ReactiveTerminal::Break {
            target,
            target_kind,
            loc,
            ..
        } => {
            if *target_kind == ReactiveTerminalTargetKind::Implicit {
                return Ok(None);
            }
            Ok(Some(Statement::BreakStatement(BreakStatement {
                base: base_node_with_loc("BreakStatement", *loc),
                label: if *target_kind == ReactiveTerminalTargetKind::Labeled {
                    Some(make_identifier(&codegen_label(*target)))
                } else {
                    None
                },
            })))
        }
        ReactiveTerminal::Continue {
            target,
            target_kind,
            loc,
            ..
        } => {
            if *target_kind == ReactiveTerminalTargetKind::Implicit {
                return Ok(None);
            }
            Ok(Some(Statement::ContinueStatement(ContinueStatement {
                base: base_node_with_loc("ContinueStatement", *loc),
                label: if *target_kind == ReactiveTerminalTargetKind::Labeled {
                    Some(make_identifier(&codegen_label(*target)))
                } else {
                    None
                },
            })))
        }
        ReactiveTerminal::Return { value, loc, .. } => {
            let expr = codegen_place_to_expression(cx, value)?;
            if let Expression::Identifier(ref ident) = expr {
                if ident.name == "undefined" {
                    return Ok(Some(Statement::ReturnStatement(ReturnStatement {
                        base: base_node_with_loc("ReturnStatement", *loc),
                        argument: None,
                    })));
                }
            }
            Ok(Some(Statement::ReturnStatement(ReturnStatement {
                base: base_node_with_loc("ReturnStatement", *loc),
                argument: Some(Box::new(expr)),
            })))
        }
        ReactiveTerminal::Throw { value, loc, .. } => {
            let expr = codegen_place_to_expression(cx, value)?;
            Ok(Some(Statement::ThrowStatement(ThrowStatement {
                base: base_node_with_loc("ThrowStatement", *loc),
                argument: Box::new(expr),
            })))
        }
        ReactiveTerminal::If {
            test,
            consequent,
            alternate,
            loc,
            ..
        } => {
            let test_expr = codegen_place_to_expression(cx, test)?;
            let consequent_block = codegen_block(cx, consequent)?;
            let alternate_stmt = if let Some(alt) = alternate {
                let block = codegen_block(cx, alt)?;
                if block.body.is_empty() {
                    None
                } else {
                    Some(Box::new(Statement::BlockStatement(block)))
                }
            } else {
                None
            };
            Ok(Some(Statement::IfStatement(IfStatement {
                base: base_node_with_loc("IfStatement", *loc),
                test: Box::new(test_expr),
                consequent: Box::new(Statement::BlockStatement(consequent_block)),
                alternate: alternate_stmt,
            })))
        }
        ReactiveTerminal::Switch {
            test, cases, loc, ..
        } => {
            let test_expr = codegen_place_to_expression(cx, test)?;
            let switch_cases: Vec<SwitchCase> = cases
                .iter()
                .map(|case| {
                    let test = case
                        .test
                        .as_ref()
                        .map(|t| codegen_place_to_expression(cx, t))
                        .transpose()?;
                    let block = case
                        .block
                        .as_ref()
                        .map(|b| codegen_block(cx, b))
                        .transpose()?;
                    let consequent = match block {
                        Some(b) if b.body.is_empty() => Vec::new(),
                        Some(b) => vec![Statement::BlockStatement(b)],
                        None => Vec::new(),
                    };
                    Ok(SwitchCase {
                        base: BaseNode::typed("SwitchCase"),
                        test: test.map(Box::new),
                        consequent,
                    })
                })
                .collect::<Result<_, CompilerError>>()?;
            Ok(Some(Statement::SwitchStatement(SwitchStatement {
                base: base_node_with_loc("SwitchStatement", *loc),
                discriminant: Box::new(test_expr),
                cases: switch_cases,
            })))
        }
        ReactiveTerminal::DoWhile {
            loop_block,
            test,
            loc,
            ..
        } => {
            let test_expr = codegen_instruction_value_to_expression(cx, test)?;
            let body = codegen_block(cx, loop_block)?;
            Ok(Some(Statement::DoWhileStatement(DoWhileStatement {
                base: base_node_with_loc("DoWhileStatement", *loc),
                test: Box::new(test_expr),
                body: Box::new(Statement::BlockStatement(body)),
            })))
        }
        ReactiveTerminal::While {
            test,
            loop_block,
            loc,
            ..
        } => {
            let test_expr = codegen_instruction_value_to_expression(cx, test)?;
            let body = codegen_block(cx, loop_block)?;
            Ok(Some(Statement::WhileStatement(WhileStatement {
                base: base_node_with_loc("WhileStatement", *loc),
                test: Box::new(test_expr),
                body: Box::new(Statement::BlockStatement(body)),
            })))
        }
        ReactiveTerminal::For {
            init,
            test,
            update,
            loop_block,
            loc,
            ..
        } => {
            let init_val = codegen_for_init(cx, init)?;
            let test_expr = codegen_instruction_value_to_expression(cx, test)?;
            let update_expr = update
                .as_ref()
                .map(|u| codegen_instruction_value_to_expression(cx, u))
                .transpose()?;
            let body = codegen_block(cx, loop_block)?;
            Ok(Some(Statement::ForStatement(ForStatement {
                base: base_node_with_loc("ForStatement", *loc),
                init: init_val.map(|v| Box::new(v)),
                test: Some(Box::new(test_expr)),
                update: update_expr.map(Box::new),
                body: Box::new(Statement::BlockStatement(body)),
            })))
        }
        ReactiveTerminal::ForIn {
            init,
            loop_block,
            loc,
            ..
        } => codegen_for_in(cx, init, loop_block, *loc),
        ReactiveTerminal::ForOf {
            init,
            test,
            loop_block,
            loc,
            ..
        } => codegen_for_of(cx, init, test, loop_block, *loc),
        ReactiveTerminal::Label { block, .. } => {
            let body = codegen_block(cx, block)?;
            Ok(Some(Statement::BlockStatement(body)))
        }
        ReactiveTerminal::Try {
            block,
            handler_binding,
            handler,
            loc,
            ..
        } => {
            let catch_param = match handler_binding.as_ref() {
                Some(binding) => {
                    let ident = &cx.env.identifiers[binding.identifier.0 as usize];
                    cx.temp.insert(ident.declaration_id, None);
                    Some(PatternLike::Identifier(convert_identifier(
                        binding.identifier,
                        cx.env,
                    )?))
                }
                None => None,
            };
            let try_block = codegen_block(cx, block)?;
            let handler_block = codegen_block(cx, handler)?;
            Ok(Some(Statement::TryStatement(TryStatement {
                base: base_node_with_loc("TryStatement", *loc),
                block: try_block,
                handler: Some(CatchClause {
                    base: BaseNode::typed("CatchClause"),
                    param: catch_param,
                    body: handler_block,
                }),
                finalizer: None,
            })))
        }
    }
}

fn codegen_for_in(
    cx: &mut Context,
    init: &ReactiveValue,
    loop_block: &ReactiveBlock,
    loc: Option<DiagSourceLocation>,
) -> Result<Option<Statement>, CompilerError> {
    let ReactiveValue::SequenceExpression { instructions, .. } = init else {
        return Err(invariant_err(
            "Expected a sequence expression init for for..in",
            None,
        ));
    };
    if instructions.len() != 2 {
        cx.record_error(CompilerErrorDetail {
            category: ErrorCategory::Todo,
            reason: "Support non-trivial for..in inits".to_string(),
            description: None,
            loc,
            suggestions: None,
        })?;
        return Ok(Some(Statement::EmptyStatement(EmptyStatement {
            base: BaseNode::typed("EmptyStatement"),
        })));
    }
    let iterable_collection = &instructions[0];
    let iterable_item = &instructions[1];
    let instr_value = get_instruction_value(&iterable_item.value)?;
    let (lval, var_decl_kind) = extract_for_in_of_lval(cx, instr_value, "for..in", loc)?;
    let right = codegen_instruction_value_to_expression(cx, &iterable_collection.value)?;
    let body = codegen_block(cx, loop_block)?;
    Ok(Some(Statement::ForInStatement(ForInStatement {
        base: base_node_with_loc("ForInStatement", loc),
        left: Box::new(
            react_compiler_ast::statements::ForInOfLeft::VariableDeclaration(VariableDeclaration {
                base: BaseNode::typed("VariableDeclaration"),
                declarations: vec![VariableDeclarator {
                    base: BaseNode::typed("VariableDeclarator"),
                    id: lval,
                    init: None,
                    definite: None,
                }],
                kind: var_decl_kind,
                declare: None,
            }),
        ),
        right: Box::new(right),
        body: Box::new(Statement::BlockStatement(body)),
    })))
}

fn codegen_for_of(
    cx: &mut Context,
    init: &ReactiveValue,
    test: &ReactiveValue,
    loop_block: &ReactiveBlock,
    loc: Option<DiagSourceLocation>,
) -> Result<Option<Statement>, CompilerError> {
    // Validate init is SequenceExpression with single GetIterator instruction
    let ReactiveValue::SequenceExpression {
        instructions: init_instrs,
        ..
    } = init
    else {
        return Err(invariant_err(
            "Expected a sequence expression init for for..of",
            None,
        ));
    };
    if init_instrs.len() != 1 {
        return Err(invariant_err(
            "Expected a single-expression sequence expression init for for..of",
            None,
        ));
    }
    let get_iter_value = get_instruction_value(&init_instrs[0].value)?;
    let InstructionValue::GetIterator { collection, .. } = get_iter_value else {
        return Err(invariant_err("Expected GetIterator in for..of init", None));
    };

    let ReactiveValue::SequenceExpression {
        instructions: test_instrs,
        ..
    } = test
    else {
        return Err(invariant_err(
            "Expected a sequence expression test for for..of",
            None,
        ));
    };
    if test_instrs.len() != 2 {
        cx.record_error(CompilerErrorDetail {
            category: ErrorCategory::Todo,
            reason: "Support non-trivial for..of inits".to_string(),
            description: None,
            loc,
            suggestions: None,
        })?;
        return Ok(Some(Statement::EmptyStatement(EmptyStatement {
            base: BaseNode::typed("EmptyStatement"),
        })));
    }
    let iterable_item = &test_instrs[1];
    let instr_value = get_instruction_value(&iterable_item.value)?;
    let (lval, var_decl_kind) = extract_for_in_of_lval(cx, instr_value, "for..of", loc)?;

    let right = codegen_place_to_expression(cx, collection)?;
    let body = codegen_block(cx, loop_block)?;
    Ok(Some(Statement::ForOfStatement(ForOfStatement {
        base: base_node_with_loc("ForOfStatement", loc),
        left: Box::new(
            react_compiler_ast::statements::ForInOfLeft::VariableDeclaration(VariableDeclaration {
                base: BaseNode::typed("VariableDeclaration"),
                declarations: vec![VariableDeclarator {
                    base: BaseNode::typed("VariableDeclarator"),
                    id: lval,
                    init: None,
                    definite: None,
                }],
                kind: var_decl_kind,
                declare: None,
            }),
        ),
        right: Box::new(right),
        body: Box::new(Statement::BlockStatement(body)),
        is_await: false,
    })))
}

/// Extract lval and declaration kind from a for-in/for-of iterable item instruction.
fn extract_for_in_of_lval(
    cx: &mut Context,
    instr_value: &InstructionValue,
    context_name: &str,
    loc: Option<DiagSourceLocation>,
) -> Result<(PatternLike, VariableDeclarationKind), CompilerError> {
    let (lval, kind) = match instr_value {
        InstructionValue::StoreLocal { lvalue, .. } => (
            codegen_lvalue(cx, &LvalueRef::Place(&lvalue.place))?,
            lvalue.kind,
        ),
        InstructionValue::Destructure { lvalue, .. } => (
            codegen_lvalue(cx, &LvalueRef::Pattern(&lvalue.pattern))?,
            lvalue.kind,
        ),
        InstructionValue::StoreContext { .. } => {
            cx.record_error(CompilerErrorDetail {
                category: ErrorCategory::Todo,
                reason: format!("Support non-trivial {} inits", context_name),
                description: None,
                loc,
                suggestions: None,
            })?;
            return Ok((
                PatternLike::Identifier(make_identifier("_")),
                VariableDeclarationKind::Let,
            ));
        }
        _ => {
            return Err(invariant_err(
                &format!(
                    "Expected a StoreLocal or Destructure in {} collection, found {:?}",
                    context_name,
                    std::mem::discriminant(instr_value)
                ),
                None,
            ));
        }
    };
    let var_decl_kind = match kind {
        InstructionKind::Const => VariableDeclarationKind::Const,
        InstructionKind::Let => VariableDeclarationKind::Let,
        _ => {
            return Err(invariant_err(
                &format!(
                    "Unexpected {:?} variable in {} collection",
                    kind, context_name
                ),
                None,
            ));
        }
    };
    Ok((lval, var_decl_kind))
}

fn codegen_for_init(
    cx: &mut Context,
    init: &ReactiveValue,
) -> Result<Option<ForInit>, CompilerError> {
    if let ReactiveValue::SequenceExpression { instructions, .. } = init {
        let block_items: Vec<ReactiveStatement> = instructions
            .iter()
            .map(|i| ReactiveStatement::Instruction(i.clone()))
            .collect();
        let body = codegen_block(cx, &block_items)?.body;
        let mut declarators: Vec<VariableDeclarator> = Vec::new();
        let mut kind = VariableDeclarationKind::Const;
        for instr in body {
            // Check if this is an assignment that can be folded into the last declarator
            if let Statement::ExpressionStatement(ref expr_stmt) = instr {
                if let Expression::AssignmentExpression(ref assign) = *expr_stmt.expression {
                    if matches!(assign.operator, AssignmentOperator::Assign) {
                        if let PatternLike::Identifier(ref left_ident) = *assign.left {
                            if let Some(top) = declarators.last_mut() {
                                if let PatternLike::Identifier(ref top_ident) = top.id {
                                    if top_ident.name == left_ident.name && top.init.is_none() {
                                        top.init = Some(assign.right.clone());
                                        continue;
                                    }
                                }
                            }
                        }
                    }
                }
            }

            if let Statement::VariableDeclaration(var_decl) = instr {
                match var_decl.kind {
                    VariableDeclarationKind::Let | VariableDeclarationKind::Const => {}
                    _ => {
                        return Err(invariant_err(
                            "Expected a let or const variable declaration",
                            None,
                        ));
                    }
                }
                if matches!(var_decl.kind, VariableDeclarationKind::Let) {
                    kind = VariableDeclarationKind::Let;
                }
                declarators.extend(var_decl.declarations);
            } else {
                let stmt_type = get_statement_type_name(&instr);
                let stmt_loc = get_statement_loc(&instr);
                let reason = "Expected a variable declaration".to_string();
                let mut err = CompilerError::new();
                err.push_diagnostic(
                    CompilerDiagnostic::new(
                        ErrorCategory::Invariant,
                        reason.clone(),
                        Some(format!("Got {}", stmt_type)),
                    )
                    .with_detail(CompilerDiagnosticDetail::Error {
                        loc: stmt_loc,
                        message: Some(reason),
                        identifier_name: None,
                    }),
                );
                return Err(err);
            }
        }
        if declarators.is_empty() {
            return Err(invariant_err(
                "Expected a variable declaration in for-init",
                None,
            ));
        }
        Ok(Some(ForInit::VariableDeclaration(VariableDeclaration {
            base: BaseNode::typed("VariableDeclaration"),
            declarations: declarators,
            kind,
            declare: None,
        })))
    } else {
        let expr = codegen_instruction_value_to_expression(cx, init)?;
        Ok(Some(ForInit::Expression(Box::new(expr))))
    }
}

// =============================================================================
// Instruction codegen
// =============================================================================

/// How statement-position codegen disposes of an `UnsupportedNode`'s
/// `original_node`. See [`codegen_unsupported_original_node`].
enum UnsupportedOriginalNode {
    /// Emit this statement directly (early return).
    Statement(Statement),
    /// Flow through the general expression codegen path so the instruction's
    /// lvalue temporary is bound/registered.
    ExpressionCodegen,
}

/// Discriminate an `UnsupportedNode`'s `original_node` by its `type` tag.
///
/// Lowering serializes typed `Expression`/`Statement`/`PatternLike` bailout
/// nodes, plus the raw nodes of `Statement::Unknown` (whose tags are
/// unmodeled by construction). Dispatch accordingly:
///
/// - Modeled statement tag: parse the typed statement and emit it directly.
///   A parse failure here is a serialize/deserialize asymmetry, surfaced as
///   an invariant rather than degraded.
/// - Tag parseable as `Expression` or `PatternLike` (both enums are strict,
///   no catch-all): expression codegen. Patterns (e.g. `ObjectPattern`
///   destructuring targets) keep their existing placeholder fallback there.
/// - Anything else is an unmodeled tag, producible only by the
///   unknown-statement lowering bailout — i.e. it came from a statement
///   position — so preserve it verbatim as `Statement::Unknown`, matching
///   the TS codegen's `return node` for non-expressions.
fn codegen_unsupported_original_node(
    node: &serde_json::Value,
) -> Result<UnsupportedOriginalNode, CompilerError> {
    let tag = node.get("type").and_then(serde_json::Value::as_str);
    if tag.is_some_and(is_known_statement_type) {
        let stmt: Statement = serde_json::from_value(node.clone()).map_err(|e| {
            invariant_err(
                &format!("Failed to deserialize original AST node: {}", e),
                None,
            )
        })?;
        return Ok(UnsupportedOriginalNode::Statement(stmt));
    }
    if serde_json::from_value::<Expression>(node.clone()).is_ok()
        || serde_json::from_value::<PatternLike>(node.clone()).is_ok()
    {
        return Ok(UnsupportedOriginalNode::ExpressionCodegen);
    }
    let unknown = UnknownStatement::from_raw(RawNode::from_value(node)).map_err(|e| {
        invariant_err(
            &format!("Failed to read unsupported original AST node: {}", e),
            None,
        )
    })?;
    Ok(UnsupportedOriginalNode::Statement(Statement::Unknown(
        unknown,
    )))
}

fn codegen_instruction_nullable(
    cx: &mut Context,
    instr: &ReactiveInstruction,
) -> Result<Option<Statement>, CompilerError> {
    // Only check specific InstructionValue kinds for the base Instruction variant
    if let ReactiveValue::Instruction(ref value) = instr.value {
        match value {
            InstructionValue::StoreLocal { .. }
            | InstructionValue::StoreContext { .. }
            | InstructionValue::Destructure { .. }
            | InstructionValue::DeclareLocal { .. }
            | InstructionValue::DeclareContext { .. } => {
                return codegen_store_or_declare(cx, instr, value);
            }
            InstructionValue::StartMemoize { .. } | InstructionValue::FinishMemoize { .. } => {
                return Ok(None);
            }
            InstructionValue::Debugger { .. } => {
                return Ok(Some(Statement::DebuggerStatement(DebuggerStatement {
                    base: base_node_with_loc("DebuggerStatement", instr.loc),
                })));
            }
            InstructionValue::UnsupportedNode {
                original_node: Some(node),
                ..
            } => {
                // Statement-vs-expression discrimination must be explicit by
                // `type` tag: `Statement`'s deserializer has a tolerant
                // `Statement::Unknown` catch-all, so "does it deserialize as
                // a Statement?" succeeds for ANY tagged object and would
                // emit expression nodes as raw statements, orphaning their
                // lvalue temporaries (the regression the explicit dispatch
                // below prevents; TS codegen's equivalent check is
                // `if (!t.isExpression(node)) return node; value = node`).
                match codegen_unsupported_original_node(node)? {
                    UnsupportedOriginalNode::Statement(stmt) => return Ok(Some(stmt)),
                    UnsupportedOriginalNode::ExpressionCodegen => {
                        // Expression (or pattern) node — fall through to the
                        // general codegen path which handles lvalue binding
                        // and temporary registration.
                    }
                }
            }
            InstructionValue::ObjectMethod { loc, .. } => {
                invariant(
                    instr.lvalue.is_some(),
                    "Expected object methods to have a temp lvalue",
                    None,
                )?;
                let lvalue = instr.lvalue.as_ref().unwrap();
                cx.object_methods
                    .insert(lvalue.identifier, (value.clone(), *loc));
                return Ok(None);
            }
            _ => {} // fall through to general codegen
        }
    }
    // General case: codegen the full ReactiveValue
    let expr_value = codegen_instruction_value(cx, &instr.value)?;
    let stmt = codegen_instruction(cx, instr, expr_value)?;
    if matches!(stmt, Statement::EmptyStatement(_)) {
        Ok(None)
    } else {
        Ok(Some(stmt))
    }
}

fn codegen_store_or_declare(
    cx: &mut Context,
    instr: &ReactiveInstruction,
    value: &InstructionValue,
) -> Result<Option<Statement>, CompilerError> {
    match value {
        InstructionValue::StoreLocal {
            lvalue, value: val, ..
        } => {
            let mut kind = lvalue.kind;
            if cx.has_declared(lvalue.place.identifier) {
                kind = InstructionKind::Reassign;
            }
            let rhs = codegen_place_to_expression(cx, val)?;
            emit_store(cx, instr, kind, &LvalueRef::Place(&lvalue.place), Some(rhs))
        }
        InstructionValue::StoreContext {
            lvalue, value: val, ..
        } => {
            let rhs = codegen_place_to_expression(cx, val)?;
            emit_store(
                cx,
                instr,
                lvalue.kind,
                &LvalueRef::Place(&lvalue.place),
                Some(rhs),
            )
        }
        InstructionValue::DeclareLocal { lvalue, .. }
        | InstructionValue::DeclareContext { lvalue, .. } => {
            if cx.has_declared(lvalue.place.identifier) {
                return Ok(None);
            }
            emit_store(
                cx,
                instr,
                lvalue.kind,
                &LvalueRef::Place(&lvalue.place),
                None,
            )
        }
        InstructionValue::Destructure {
            lvalue, value: val, ..
        } => {
            let kind = lvalue.kind;
            // Register temporaries for unnamed pattern operands
            for place in react_compiler_hir::visitors::each_pattern_operand(&lvalue.pattern) {
                let ident = &cx.env.identifiers[place.identifier.0 as usize];
                if kind != InstructionKind::Reassign && ident.name.is_none() {
                    cx.temp.insert(ident.declaration_id, None);
                }
            }
            let rhs = codegen_place_to_expression(cx, val)?;
            emit_store(
                cx,
                instr,
                kind,
                &LvalueRef::Pattern(&lvalue.pattern),
                Some(rhs),
            )
        }
        _ => unreachable!(),
    }
}

fn emit_store(
    cx: &mut Context,
    instr: &ReactiveInstruction,
    kind: InstructionKind,
    lvalue: &LvalueRef,
    value: Option<Expression>,
) -> Result<Option<Statement>, CompilerError> {
    match kind {
        InstructionKind::Const => {
            // Invariant: Const declarations cannot also have an outer lvalue
            // (i.e., cannot be referenced as an expression)
            if instr.lvalue.is_some() {
                return Err(invariant_err_with_detail_message(
                    "Const declaration cannot be referenced as an expression",
                    "this is Const",
                    instr.loc,
                ));
            }
            let lval = codegen_lvalue(cx, lvalue)?;
            Ok(Some(Statement::VariableDeclaration(VariableDeclaration {
                base: base_node_with_loc("VariableDeclaration", instr.loc),
                declarations: vec![make_var_declarator(lval, value)],
                kind: VariableDeclarationKind::Const,
                declare: None,
            })))
        }
        InstructionKind::Function => {
            let lval = codegen_lvalue(cx, lvalue)?;
            let PatternLike::Identifier(fn_id) = lval else {
                return Err(invariant_err(
                    "Expected an identifier as function declaration lvalue",
                    None,
                ));
            };
            let Some(rhs) = value else {
                return Err(invariant_err(
                    "Expected a function value for function declaration",
                    None,
                ));
            };
            match rhs {
                Expression::FunctionExpression(func_expr) => {
                    Ok(Some(Statement::FunctionDeclaration(FunctionDeclaration {
                        base: base_node_with_loc("FunctionDeclaration", instr.loc),
                        id: Some(fn_id),
                        params: func_expr.params,
                        body: func_expr.body,
                        generator: func_expr.generator,
                        is_async: func_expr.is_async,
                        declare: None,
                        return_type: None,
                        type_parameters: None,
                        predicate: None,
                        component_declaration: false,
                        hook_declaration: false,
                    })))
                }
                _ => Err(invariant_err(
                    "Expected a function expression for function declaration",
                    None,
                )),
            }
        }
        InstructionKind::Let => {
            // Invariant: Let declarations cannot also have an outer lvalue
            if instr.lvalue.is_some() {
                return Err(invariant_err_with_detail_message(
                    "Const declaration cannot be referenced as an expression",
                    "this is Let",
                    instr.loc,
                ));
            }
            let lval = codegen_lvalue(cx, lvalue)?;
            Ok(Some(Statement::VariableDeclaration(VariableDeclaration {
                base: base_node_with_loc("VariableDeclaration", instr.loc),
                declarations: vec![make_var_declarator(lval, value)],
                kind: VariableDeclarationKind::Let,
                declare: None,
            })))
        }
        InstructionKind::Reassign => {
            let Some(rhs) = value else {
                return Err(invariant_err("Expected a value for reassignment", None));
            };
            let lval = codegen_lvalue(cx, lvalue)?;
            let expr = Expression::AssignmentExpression(ast_expr::AssignmentExpression {
                base: BaseNode::typed("AssignmentExpression"),
                operator: AssignmentOperator::Assign,
                left: Box::new(lval),
                right: Box::new(rhs),
            });
            if let Some(ref lvalue_place) = instr.lvalue {
                let is_store_context = matches!(
                    &instr.value,
                    ReactiveValue::Instruction(InstructionValue::StoreContext { .. })
                );
                if !is_store_context {
                    let ident = &cx.env.identifiers[lvalue_place.identifier.0 as usize];
                    cx.temp.insert(
                        ident.declaration_id,
                        Some(ExpressionOrJsxText::Expression(expr)),
                    );
                    return Ok(None);
                } else {
                    let stmt =
                        codegen_instruction(cx, instr, ExpressionOrJsxText::Expression(expr))?;
                    if matches!(stmt, Statement::EmptyStatement(_)) {
                        return Ok(None);
                    }
                    return Ok(Some(stmt));
                }
            }
            Ok(Some(Statement::ExpressionStatement(ExpressionStatement {
                base: base_node_with_loc("ExpressionStatement", instr.loc),
                expression: Box::new(expr),
            })))
        }
        InstructionKind::Catch => Ok(Some(Statement::EmptyStatement(EmptyStatement {
            base: BaseNode::typed("EmptyStatement"),
        }))),
        InstructionKind::HoistedLet
        | InstructionKind::HoistedConst
        | InstructionKind::HoistedFunction => Err(invariant_err(
            &format!(
                "Expected {:?} to have been pruned in PruneHoistedContexts",
                kind
            ),
            None,
        )),
    }
}

fn codegen_instruction(
    cx: &mut Context,
    instr: &ReactiveInstruction,
    value: ExpressionOrJsxText,
) -> Result<Statement, CompilerError> {
    let Some(ref lvalue) = instr.lvalue else {
        let expr = convert_value_to_expression(value);
        return Ok(Statement::ExpressionStatement(ExpressionStatement {
            base: base_node_with_loc("ExpressionStatement", instr.loc),
            expression: Box::new(expr),
        }));
    };
    let ident = &cx.env.identifiers[lvalue.identifier.0 as usize];
    if ident.name.is_none() {
        // temporary
        cx.temp.insert(ident.declaration_id, Some(value));
        return Ok(Statement::EmptyStatement(EmptyStatement {
            base: BaseNode::typed("EmptyStatement"),
        }));
    }
    let expr_value = convert_value_to_expression(value);
    if cx.has_declared(lvalue.identifier) {
        Ok(Statement::ExpressionStatement(ExpressionStatement {
            base: base_node_with_loc("ExpressionStatement", instr.loc),
            expression: Box::new(Expression::AssignmentExpression(
                ast_expr::AssignmentExpression {
                    base: BaseNode::typed("AssignmentExpression"),
                    operator: AssignmentOperator::Assign,
                    left: Box::new(PatternLike::Identifier(convert_identifier(
                        lvalue.identifier,
                        cx.env,
                    )?)),
                    right: Box::new(expr_value),
                },
            )),
        }))
    } else {
        Ok(Statement::VariableDeclaration(VariableDeclaration {
            base: base_node_with_loc("VariableDeclaration", instr.loc),
            declarations: vec![make_var_declarator(
                PatternLike::Identifier(convert_identifier(lvalue.identifier, cx.env)?),
                Some(expr_value),
            )],
            kind: VariableDeclarationKind::Const,
            declare: None,
        }))
    }
}

// =============================================================================
// Instruction value codegen
// =============================================================================

fn codegen_instruction_value_to_expression(
    cx: &mut Context,
    instr_value: &ReactiveValue,
) -> Result<Expression, CompilerError> {
    let value = codegen_instruction_value(cx, instr_value)?;
    Ok(convert_value_to_expression(value))
}

fn codegen_instruction_value(
    cx: &mut Context,
    instr_value: &ReactiveValue,
) -> Result<ExpressionOrJsxText, CompilerError> {
    match instr_value {
        ReactiveValue::Instruction(iv) => {
            let mut result = codegen_base_instruction_value(cx, iv)?;
            // Propagate instrValue.loc to the generated expression, matching TS:
            //   if (instrValue.loc != null && instrValue.loc != GeneratedSource) {
            //       value.loc = instrValue.loc;
            //   }
            if let Some(loc) = iv.loc() {
                apply_loc_to_value(&mut result, *loc);
            }
            Ok(result)
        }
        ReactiveValue::LogicalExpression {
            operator,
            left,
            right,
            ..
        } => {
            let left_expr = codegen_instruction_value_to_expression(cx, left)?;
            let right_expr = codegen_instruction_value_to_expression(cx, right)?;
            Ok(ExpressionOrJsxText::Expression(
                Expression::LogicalExpression(ast_expr::LogicalExpression {
                    base: BaseNode::typed("LogicalExpression"),
                    operator: convert_logical_operator(operator),
                    left: Box::new(left_expr),
                    right: Box::new(right_expr),
                }),
            ))
        }
        ReactiveValue::ConditionalExpression {
            test,
            consequent,
            alternate,
            ..
        } => {
            let test_expr = codegen_instruction_value_to_expression(cx, test)?;
            let cons_expr = codegen_instruction_value_to_expression(cx, consequent)?;
            let alt_expr = codegen_instruction_value_to_expression(cx, alternate)?;
            Ok(ExpressionOrJsxText::Expression(
                Expression::ConditionalExpression(ast_expr::ConditionalExpression {
                    base: BaseNode::typed("ConditionalExpression"),
                    test: Box::new(test_expr),
                    consequent: Box::new(cons_expr),
                    alternate: Box::new(alt_expr),
                }),
            ))
        }
        ReactiveValue::SequenceExpression {
            instructions,
            value,
            ..
        } => {
            let block_items: Vec<ReactiveStatement> = instructions
                .iter()
                .map(|i| ReactiveStatement::Instruction(i.clone()))
                .collect();
            let body = codegen_block_no_reset(cx, &block_items)?.body;
            let mut expressions: Vec<Expression> = Vec::new();
            for stmt in body {
                match stmt {
                    Statement::ExpressionStatement(es) => {
                        expressions.push(*es.expression);
                    }
                    Statement::VariableDeclaration(ref var_decl) => {
                        let _declarator = &var_decl.declarations[0];
                        cx.record_error(CompilerErrorDetail {
                            category: ErrorCategory::Todo,
                            reason: format!(
                                "(CodegenReactiveFunction::codegenInstructionValue) Cannot declare variables in a value block"
                            ),
                            description: None,
                            loc: None,
                            suggestions: None,
                        })?;
                        expressions.push(Expression::StringLiteral(StringLiteral {
                            base: BaseNode::typed("StringLiteral"),
                            value: format!("TODO handle declaration").into(),
                        }));
                    }
                    _ => {
                        cx.record_error(CompilerErrorDetail {
                            category: ErrorCategory::Todo,
                            reason: format!(
                                "(CodegenReactiveFunction::codegenInstructionValue) Handle conversion of statement to expression"
                            ),
                            description: None,
                            loc: None,
                            suggestions: None,
                        })?;
                        expressions.push(Expression::StringLiteral(StringLiteral {
                            base: BaseNode::typed("StringLiteral"),
                            value: format!("TODO handle statement").into(),
                        }));
                    }
                }
            }
            let final_expr = codegen_instruction_value_to_expression(cx, value)?;
            if expressions.is_empty() {
                Ok(ExpressionOrJsxText::Expression(final_expr))
            } else {
                expressions.push(final_expr);
                Ok(ExpressionOrJsxText::Expression(
                    Expression::SequenceExpression(ast_expr::SequenceExpression {
                        base: BaseNode::typed("SequenceExpression"),
                        expressions,
                    }),
                ))
            }
        }
        ReactiveValue::OptionalExpression {
            value, optional, ..
        } => {
            let opt_value = codegen_instruction_value_to_expression(cx, value)?;
            match opt_value {
                Expression::OptionalCallExpression(oce) => Ok(ExpressionOrJsxText::Expression(
                    Expression::OptionalCallExpression(ast_expr::OptionalCallExpression {
                        base: BaseNode::typed("OptionalCallExpression"),
                        callee: oce.callee,
                        arguments: oce.arguments,
                        optional: *optional,
                        type_parameters: oce.type_parameters,
                        type_arguments: oce.type_arguments,
                    }),
                )),
                Expression::CallExpression(ce) => Ok(ExpressionOrJsxText::Expression(
                    Expression::OptionalCallExpression(ast_expr::OptionalCallExpression {
                        base: BaseNode::typed("OptionalCallExpression"),
                        callee: ce.callee,
                        arguments: ce.arguments,
                        optional: *optional,
                        type_parameters: None,
                        type_arguments: None,
                    }),
                )),
                Expression::OptionalMemberExpression(ome) => Ok(ExpressionOrJsxText::Expression(
                    Expression::OptionalMemberExpression(ast_expr::OptionalMemberExpression {
                        base: BaseNode::typed("OptionalMemberExpression"),
                        object: ome.object,
                        property: ome.property,
                        computed: ome.computed,
                        optional: *optional,
                    }),
                )),
                Expression::MemberExpression(me) => Ok(ExpressionOrJsxText::Expression(
                    Expression::OptionalMemberExpression(ast_expr::OptionalMemberExpression {
                        base: BaseNode::typed("OptionalMemberExpression"),
                        object: me.object,
                        property: me.property,
                        computed: me.computed,
                        optional: *optional,
                    }),
                )),
                other => Err(invariant_err(
                    &format!(
                        "Expected optional value to resolve to call or member expression, got {:?}",
                        std::mem::discriminant(&other)
                    ),
                    None,
                )),
            }
        }
    }
}

fn codegen_base_instruction_value(
    cx: &mut Context,
    iv: &InstructionValue,
) -> Result<ExpressionOrJsxText, CompilerError> {
    match iv {
        InstructionValue::Primitive { value, loc } => Ok(ExpressionOrJsxText::Expression(
            codegen_primitive_value(value, *loc),
        )),
        InstructionValue::BinaryExpression {
            operator,
            left,
            right,
            ..
        } => {
            let left_expr = codegen_place_to_expression(cx, left)?;
            let right_expr = codegen_place_to_expression(cx, right)?;
            Ok(ExpressionOrJsxText::Expression(
                Expression::BinaryExpression(ast_expr::BinaryExpression {
                    base: BaseNode::typed("BinaryExpression"),
                    operator: convert_binary_operator(operator),
                    left: Box::new(left_expr),
                    right: Box::new(right_expr),
                }),
            ))
        }
        InstructionValue::UnaryExpression {
            operator, value, ..
        } => {
            let arg = codegen_place_to_expression(cx, value)?;
            Ok(ExpressionOrJsxText::Expression(
                Expression::UnaryExpression(ast_expr::UnaryExpression {
                    base: BaseNode::typed("UnaryExpression"),
                    operator: convert_unary_operator(operator),
                    prefix: true,
                    argument: Box::new(arg),
                }),
            ))
        }
        InstructionValue::LoadLocal { place, .. } | InstructionValue::LoadContext { place, .. } => {
            let expr = codegen_place_to_expression(cx, place)?;
            Ok(ExpressionOrJsxText::Expression(expr))
        }
        InstructionValue::LoadGlobal { binding, .. } => Ok(ExpressionOrJsxText::Expression(
            Expression::Identifier(make_identifier(binding.name())),
        )),
        InstructionValue::CallExpression {
            callee,
            args,
            loc: _,
        } => {
            let callee_expr = codegen_place_to_expression(cx, callee)?;
            let arguments = args
                .iter()
                .map(|arg| codegen_argument(cx, arg))
                .collect::<Result<_, _>>()?;
            let call_expr = Expression::CallExpression(ast_expr::CallExpression {
                base: BaseNode::typed("CallExpression"),
                callee: Box::new(callee_expr),
                arguments,
                type_parameters: None,
                type_arguments: None,
                optional: None,
            });
            // enableEmitHookGuards: wrap hook calls in try/finally IIFE
            let result = maybe_wrap_hook_call(cx, call_expr, callee.identifier);
            Ok(ExpressionOrJsxText::Expression(result))
        }
        InstructionValue::MethodCall {
            receiver: _,
            property,
            args,
            loc: _,
        } => {
            let member_expr = codegen_place_to_expression(cx, property)?;
            // Invariant: MethodCall::property must resolve to a MemberExpression
            if !matches!(
                member_expr,
                Expression::MemberExpression(_) | Expression::OptionalMemberExpression(_)
            ) {
                let expr_type = match &member_expr {
                    Expression::Identifier(_) => "Identifier",
                    _ => "unknown",
                };
                {
                    let msg = format!("Got: '{}'", expr_type);
                    let mut err = CompilerError::new();
                    err.push_diagnostic(
                        CompilerDiagnostic::new(
                            ErrorCategory::Invariant,
                            "[Codegen] Internal error: MethodCall::property must be an unpromoted + unmemoized MemberExpression",
                            None,
                        )
                        .with_detail(CompilerDiagnosticDetail::Error {
                            loc: property.loc,
                            message: Some(msg),
                            identifier_name: None,
                        }),
                    );
                    return Err(err);
                }
            }
            let arguments = args
                .iter()
                .map(|arg| codegen_argument(cx, arg))
                .collect::<Result<_, _>>()?;
            let call_expr = Expression::CallExpression(ast_expr::CallExpression {
                base: BaseNode::typed("CallExpression"),
                callee: Box::new(member_expr),
                arguments,
                type_parameters: None,
                type_arguments: None,
                optional: None,
            });
            // enableEmitHookGuards: wrap hook method calls in try/finally IIFE
            let result = maybe_wrap_hook_call(cx, call_expr, property.identifier);
            Ok(ExpressionOrJsxText::Expression(result))
        }
        InstructionValue::NewExpression { callee, args, .. } => {
            let callee_expr = codegen_place_to_expression(cx, callee)?;
            let arguments = args
                .iter()
                .map(|arg| codegen_argument(cx, arg))
                .collect::<Result<_, _>>()?;
            Ok(ExpressionOrJsxText::Expression(Expression::NewExpression(
                ast_expr::NewExpression {
                    base: BaseNode::typed("NewExpression"),
                    callee: Box::new(callee_expr),
                    arguments,
                    type_parameters: None,
                    type_arguments: None,
                },
            )))
        }
        InstructionValue::ArrayExpression { elements, .. } => {
            let elems: Vec<Option<Expression>> = elements
                .iter()
                .map(|el| match el {
                    ArrayElement::Place(place) => Ok(Some(codegen_place_to_expression(cx, place)?)),
                    ArrayElement::Spread(spread) => {
                        let arg = codegen_place_to_expression(cx, &spread.place)?;
                        Ok(Some(Expression::SpreadElement(ast_expr::SpreadElement {
                            base: BaseNode::typed("SpreadElement"),
                            argument: Box::new(arg),
                        })))
                    }
                    ArrayElement::Hole => Ok(None),
                })
                .collect::<Result<_, CompilerError>>()?;
            Ok(ExpressionOrJsxText::Expression(
                Expression::ArrayExpression(ast_expr::ArrayExpression {
                    base: BaseNode::typed("ArrayExpression"),
                    elements: elems,
                }),
            ))
        }
        InstructionValue::ObjectExpression { properties, .. } => {
            codegen_object_expression(cx, properties)
        }
        InstructionValue::PropertyLoad {
            object, property, ..
        } => {
            let obj = codegen_place_to_expression(cx, object)?;
            let (prop, computed) = property_literal_to_expression(property);
            Ok(ExpressionOrJsxText::Expression(
                Expression::MemberExpression(ast_expr::MemberExpression {
                    base: BaseNode::typed("MemberExpression"),
                    object: Box::new(obj),
                    property: Box::new(prop),
                    computed,
                }),
            ))
        }
        InstructionValue::PropertyStore {
            object,
            property,
            value,
            ..
        } => {
            let obj = codegen_place_to_expression(cx, object)?;
            let (prop, computed) = property_literal_to_expression(property);
            let val = codegen_place_to_expression(cx, value)?;
            Ok(ExpressionOrJsxText::Expression(
                Expression::AssignmentExpression(ast_expr::AssignmentExpression {
                    base: BaseNode::typed("AssignmentExpression"),
                    operator: AssignmentOperator::Assign,
                    left: Box::new(PatternLike::MemberExpression(ast_expr::MemberExpression {
                        base: BaseNode::typed("MemberExpression"),
                        object: Box::new(obj),
                        property: Box::new(prop),
                        computed,
                    })),
                    right: Box::new(val),
                }),
            ))
        }
        InstructionValue::PropertyDelete {
            object, property, ..
        } => {
            let obj = codegen_place_to_expression(cx, object)?;
            let (prop, computed) = property_literal_to_expression(property);
            Ok(ExpressionOrJsxText::Expression(
                Expression::UnaryExpression(ast_expr::UnaryExpression {
                    base: BaseNode::typed("UnaryExpression"),
                    operator: AstUnaryOperator::Delete,
                    prefix: true,
                    argument: Box::new(Expression::MemberExpression(ast_expr::MemberExpression {
                        base: BaseNode::typed("MemberExpression"),
                        object: Box::new(obj),
                        property: Box::new(prop),
                        computed,
                    })),
                }),
            ))
        }
        InstructionValue::ComputedLoad {
            object, property, ..
        } => {
            let obj = codegen_place_to_expression(cx, object)?;
            let prop = codegen_place_to_expression(cx, property)?;
            Ok(ExpressionOrJsxText::Expression(
                Expression::MemberExpression(ast_expr::MemberExpression {
                    base: BaseNode::typed("MemberExpression"),
                    object: Box::new(obj),
                    property: Box::new(prop),
                    computed: true,
                }),
            ))
        }
        InstructionValue::ComputedStore {
            object,
            property,
            value,
            ..
        } => {
            let obj = codegen_place_to_expression(cx, object)?;
            let prop = codegen_place_to_expression(cx, property)?;
            let val = codegen_place_to_expression(cx, value)?;
            Ok(ExpressionOrJsxText::Expression(
                Expression::AssignmentExpression(ast_expr::AssignmentExpression {
                    base: BaseNode::typed("AssignmentExpression"),
                    operator: AssignmentOperator::Assign,
                    left: Box::new(PatternLike::MemberExpression(ast_expr::MemberExpression {
                        base: BaseNode::typed("MemberExpression"),
                        object: Box::new(obj),
                        property: Box::new(prop),
                        computed: true,
                    })),
                    right: Box::new(val),
                }),
            ))
        }
        InstructionValue::ComputedDelete {
            object, property, ..
        } => {
            let obj = codegen_place_to_expression(cx, object)?;
            let prop = codegen_place_to_expression(cx, property)?;
            Ok(ExpressionOrJsxText::Expression(
                Expression::UnaryExpression(ast_expr::UnaryExpression {
                    base: BaseNode::typed("UnaryExpression"),
                    operator: AstUnaryOperator::Delete,
                    prefix: true,
                    argument: Box::new(Expression::MemberExpression(ast_expr::MemberExpression {
                        base: BaseNode::typed("MemberExpression"),
                        object: Box::new(obj),
                        property: Box::new(prop),
                        computed: true,
                    })),
                }),
            ))
        }
        InstructionValue::RegExpLiteral { pattern, flags, .. } => Ok(
            ExpressionOrJsxText::Expression(Expression::RegExpLiteral(AstRegExpLiteral {
                base: BaseNode::typed("RegExpLiteral"),
                pattern: pattern.clone(),
                flags: flags.clone(),
            })),
        ),
        InstructionValue::MetaProperty { meta, property, .. } => Ok(
            ExpressionOrJsxText::Expression(Expression::MetaProperty(ast_expr::MetaProperty {
                base: BaseNode::typed("MetaProperty"),
                meta: make_identifier(meta),
                property: make_identifier(property),
            })),
        ),
        InstructionValue::Await { value, .. } => {
            let arg = codegen_place_to_expression(cx, value)?;
            Ok(ExpressionOrJsxText::Expression(
                Expression::AwaitExpression(ast_expr::AwaitExpression {
                    base: BaseNode::typed("AwaitExpression"),
                    argument: Box::new(arg),
                }),
            ))
        }
        InstructionValue::GetIterator { collection, .. } => {
            let expr = codegen_place_to_expression(cx, collection)?;
            Ok(ExpressionOrJsxText::Expression(expr))
        }
        InstructionValue::IteratorNext { iterator, .. } => {
            let expr = codegen_place_to_expression(cx, iterator)?;
            Ok(ExpressionOrJsxText::Expression(expr))
        }
        InstructionValue::NextPropertyOf { value, .. } => {
            let expr = codegen_place_to_expression(cx, value)?;
            Ok(ExpressionOrJsxText::Expression(expr))
        }
        InstructionValue::PostfixUpdate {
            operation, lvalue, ..
        } => {
            let arg = codegen_place_to_expression(cx, lvalue)?;
            Ok(ExpressionOrJsxText::Expression(
                Expression::UpdateExpression(ast_expr::UpdateExpression {
                    base: BaseNode::typed("UpdateExpression"),
                    operator: convert_update_operator(operation),
                    argument: Box::new(arg),
                    prefix: false,
                }),
            ))
        }
        InstructionValue::PrefixUpdate {
            operation, lvalue, ..
        } => {
            let arg = codegen_place_to_expression(cx, lvalue)?;
            Ok(ExpressionOrJsxText::Expression(
                Expression::UpdateExpression(ast_expr::UpdateExpression {
                    base: BaseNode::typed("UpdateExpression"),
                    operator: convert_update_operator(operation),
                    argument: Box::new(arg),
                    prefix: true,
                }),
            ))
        }
        InstructionValue::StoreLocal { lvalue, value, .. } => {
            invariant(
                lvalue.kind == InstructionKind::Reassign,
                "Unexpected StoreLocal in codegenInstructionValue",
                None,
            )?;
            let lval = codegen_lvalue(cx, &LvalueRef::Place(&lvalue.place))?;
            let rhs = codegen_place_to_expression(cx, value)?;
            Ok(ExpressionOrJsxText::Expression(
                Expression::AssignmentExpression(ast_expr::AssignmentExpression {
                    base: BaseNode::typed("AssignmentExpression"),
                    operator: AssignmentOperator::Assign,
                    left: Box::new(lval),
                    right: Box::new(rhs),
                }),
            ))
        }
        InstructionValue::StoreGlobal { name, value, .. } => {
            let rhs = codegen_place_to_expression(cx, value)?;
            Ok(ExpressionOrJsxText::Expression(
                Expression::AssignmentExpression(ast_expr::AssignmentExpression {
                    base: BaseNode::typed("AssignmentExpression"),
                    operator: AssignmentOperator::Assign,
                    left: Box::new(PatternLike::Identifier(make_identifier(name))),
                    right: Box::new(rhs),
                }),
            ))
        }
        InstructionValue::FunctionExpression {
            name,
            name_hint,
            lowered_func,
            expr_type,
            ..
        } => codegen_function_expression(cx, name, name_hint, lowered_func, expr_type),
        InstructionValue::TaggedTemplateExpression { tag, value, .. } => {
            let tag_expr = codegen_place_to_expression(cx, tag)?;
            Ok(ExpressionOrJsxText::Expression(
                Expression::TaggedTemplateExpression(ast_expr::TaggedTemplateExpression {
                    base: BaseNode::typed("TaggedTemplateExpression"),
                    tag: Box::new(tag_expr),
                    quasi: ast_expr::TemplateLiteral {
                        base: BaseNode::typed("TemplateLiteral"),
                        quasis: vec![TemplateElement {
                            base: BaseNode::typed("TemplateElement"),
                            value: TemplateElementValue {
                                raw: value.raw.clone(),
                                cooked: value.cooked.clone(),
                            },
                            tail: true,
                        }],
                        expressions: Vec::new(),
                    },
                    type_parameters: None,
                }),
            ))
        }
        InstructionValue::TemplateLiteral {
            subexprs, quasis, ..
        } => {
            let exprs: Vec<Expression> = subexprs
                .iter()
                .map(|p| codegen_place_to_expression(cx, p))
                .collect::<Result<_, _>>()?;
            let template_elems: Vec<TemplateElement> = quasis
                .iter()
                .enumerate()
                .map(|(i, q)| TemplateElement {
                    base: BaseNode::typed("TemplateElement"),
                    value: TemplateElementValue {
                        raw: q.raw.clone(),
                        cooked: q.cooked.clone(),
                    },
                    tail: i == quasis.len() - 1,
                })
                .collect();
            Ok(ExpressionOrJsxText::Expression(
                Expression::TemplateLiteral(ast_expr::TemplateLiteral {
                    base: BaseNode::typed("TemplateLiteral"),
                    quasis: template_elems,
                    expressions: exprs,
                }),
            ))
        }
        InstructionValue::TypeCastExpression {
            value,
            type_annotation_kind,
            type_annotation,
            ..
        } => {
            let expr = codegen_place_to_expression(cx, value)?;
            let wrapped = match (type_annotation_kind.as_deref(), type_annotation) {
                (Some("satisfies"), Some(ta)) => {
                    let mut ta = ta.clone();
                    apply_renames_to_json(&mut ta, &cx.env.renames, &cx.env.reference_node_ids);
                    Expression::TSSatisfiesExpression(ast_expr::TSSatisfiesExpression {
                        base: BaseNode::typed("TSSatisfiesExpression"),
                        expression: Box::new(expr),
                        type_annotation: RawNode::from_value(&ta),
                    })
                }
                (Some("as"), Some(ta)) => {
                    let mut ta = ta.clone();
                    apply_renames_to_json(&mut ta, &cx.env.renames, &cx.env.reference_node_ids);
                    Expression::TSAsExpression(ast_expr::TSAsExpression {
                        base: BaseNode::typed("TSAsExpression"),
                        expression: Box::new(expr),
                        type_annotation: RawNode::from_value(&ta),
                    })
                }
                (Some("cast"), Some(ta)) => {
                    let mut ta = ta.clone();
                    apply_renames_to_json(&mut ta, &cx.env.renames, &cx.env.reference_node_ids);
                    Expression::TypeCastExpression(ast_expr::TypeCastExpression {
                        base: BaseNode::typed("TypeCastExpression"),
                        expression: Box::new(expr),
                        type_annotation: RawNode::from_value(&ta),
                    })
                }
                _ => expr,
            };
            Ok(ExpressionOrJsxText::Expression(wrapped))
        }
        InstructionValue::JSXText { value, loc } => Ok(ExpressionOrJsxText::JsxText(JSXText {
            base: base_node_with_loc("JSXText", *loc),
            value: value.clone(),
        })),
        InstructionValue::JsxExpression {
            tag,
            props,
            children,
            loc,
            opening_loc,
            closing_loc,
        } => codegen_jsx_expression(cx, tag, props, children, *loc, *opening_loc, *closing_loc),
        InstructionValue::JsxFragment { children, .. } => {
            let child_elems: Vec<JSXChild> = children
                .iter()
                .map(|child| codegen_jsx_element(cx, child))
                .collect::<Result<_, _>>()?;
            Ok(ExpressionOrJsxText::Expression(Expression::JSXFragment(
                JSXFragment {
                    base: BaseNode::typed("JSXFragment"),
                    opening_fragment: JSXOpeningFragment {
                        base: BaseNode::typed("JSXOpeningFragment"),
                    },
                    closing_fragment: JSXClosingFragment {
                        base: BaseNode::typed("JSXClosingFragment"),
                    },
                    children: child_elems,
                },
            )))
        }
        InstructionValue::UnsupportedNode {
            original_node,
            node_type,
            ..
        } => {
            // Try to deserialize the original AST node from JSON (mirrors statement-level handler)
            match original_node {
                Some(node) => {
                    match serde_json::from_value::<Expression>(node.clone()) {
                        Ok(expr) => Ok(ExpressionOrJsxText::Expression(expr)),
                        Err(_) => {
                            // Not a valid expression — fall back to placeholder
                            Ok(ExpressionOrJsxText::Expression(Expression::Identifier(
                                make_identifier(&format!(
                                    "__unsupported_{}",
                                    node_type.as_deref().unwrap_or("unknown")
                                )),
                            )))
                        }
                    }
                }
                None => {
                    // No original node available — fall back to placeholder
                    Ok(ExpressionOrJsxText::Expression(Expression::Identifier(
                        make_identifier(&format!(
                            "__unsupported_{}",
                            node_type.as_deref().unwrap_or("unknown")
                        )),
                    )))
                }
            }
        }
        InstructionValue::StartMemoize { .. }
        | InstructionValue::FinishMemoize { .. }
        | InstructionValue::Debugger { .. }
        | InstructionValue::DeclareLocal { .. }
        | InstructionValue::DeclareContext { .. }
        | InstructionValue::Destructure { .. }
        | InstructionValue::ObjectMethod { .. }
        | InstructionValue::StoreContext { .. } => Err(invariant_err(
            &format!(
                "Unexpected {:?} in codegenInstructionValue",
                std::mem::discriminant(iv)
            ),
            None,
        )),
    }
}

// =============================================================================
// Function expression codegen
// =============================================================================

fn codegen_function_expression(
    cx: &mut Context,
    name: &Option<String>,
    name_hint: &Option<String>,
    lowered_func: &react_compiler_hir::LoweredFunction,
    expr_type: &FunctionExpressionType,
) -> Result<ExpressionOrJsxText, CompilerError> {
    let func = &cx.env.functions[lowered_func.func.0 as usize];
    let reactive_fn = build_reactive_function(func, cx.env)?;
    let mut reactive_fn_mut = reactive_fn;
    prune_unused_labels(&mut reactive_fn_mut, cx.env)?;
    prune_unused_lvalues(&mut reactive_fn_mut, cx.env);
    prune_hoisted_contexts(&mut reactive_fn_mut, cx.env)?;

    let mut inner_cx = Context::new(
        cx.env,
        reactive_fn_mut
            .id
            .as_deref()
            .unwrap_or("[[ anonymous ]]")
            .to_string(),
        cx.unique_identifiers.clone(),
        cx.fbt_operands.clone(),
    );
    inner_cx.temp = cx.temp.clone();

    let fn_result = codegen_reactive_function(&mut inner_cx, &reactive_fn_mut)?;

    let value = match expr_type {
        FunctionExpressionType::ArrowFunctionExpression => {
            let mut body: ArrowFunctionBody =
                ArrowFunctionBody::BlockStatement(fn_result.body.clone());
            // Optimize single-return arrow functions
            if fn_result.body.body.len() == 1 && reactive_fn_mut.directives.is_empty() {
                if let Statement::ReturnStatement(ret) = &fn_result.body.body[0] {
                    if let Some(ref arg) = ret.argument {
                        body = ArrowFunctionBody::Expression(arg.clone());
                    }
                }
            }
            let is_expression = matches!(body, ArrowFunctionBody::Expression(_));
            Expression::ArrowFunctionExpression(ast_expr::ArrowFunctionExpression {
                base: BaseNode::typed("ArrowFunctionExpression"),
                params: fn_result.params,
                body: Box::new(body),
                id: None,
                generator: false,
                is_async: fn_result.is_async,
                expression: Some(is_expression),
                return_type: None,
                type_parameters: None,
                predicate: None,
            })
        }
        _ => Expression::FunctionExpression(ast_expr::FunctionExpression {
            base: BaseNode::typed("FunctionExpression"),
            params: fn_result.params,
            body: fn_result.body,
            id: name.as_ref().map(|n| make_identifier(n)),
            generator: fn_result.generator,
            is_async: fn_result.is_async,
            return_type: None,
            type_parameters: None,
            predicate: None,
        }),
    };

    // Handle enableNameAnonymousFunctions
    if cx.env.config.enable_name_anonymous_functions && name.is_none() && name_hint.is_some() {
        let hint = name_hint.as_ref().unwrap();
        let wrapped = Expression::MemberExpression(ast_expr::MemberExpression {
            base: BaseNode::typed("MemberExpression"),
            object: Box::new(Expression::ObjectExpression(ast_expr::ObjectExpression {
                base: BaseNode::typed("ObjectExpression"),
                properties: vec![ast_expr::ObjectExpressionProperty::ObjectProperty(
                    ast_expr::ObjectProperty {
                        base: BaseNode::typed("ObjectProperty"),
                        key: Box::new(Expression::StringLiteral(StringLiteral {
                            base: BaseNode::typed("StringLiteral"),
                            value: hint.clone().into(),
                        })),
                        value: Box::new(value),
                        computed: false,
                        shorthand: false,
                        decorators: None,
                        method: None,
                    },
                )],
            })),
            property: Box::new(Expression::StringLiteral(StringLiteral {
                base: BaseNode::typed("StringLiteral"),
                value: hint.clone().into(),
            })),
            computed: true,
        });
        return Ok(ExpressionOrJsxText::Expression(wrapped));
    }

    Ok(ExpressionOrJsxText::Expression(value))
}

// =============================================================================
// Object expression codegen
// =============================================================================

fn codegen_object_expression(
    cx: &mut Context,
    properties: &[ObjectPropertyOrSpread],
) -> Result<ExpressionOrJsxText, CompilerError> {
    let mut ast_properties: Vec<ast_expr::ObjectExpressionProperty> = Vec::new();
    for prop in properties {
        match prop {
            ObjectPropertyOrSpread::Property(obj_prop) => {
                let key = codegen_object_property_key(cx, &obj_prop.key)?;
                match obj_prop.property_type {
                    ObjectPropertyType::Property => {
                        let value = codegen_place_to_expression(cx, &obj_prop.place)?;
                        let is_shorthand = matches!(&key, Expression::Identifier(k_id)
                            if matches!(&value, Expression::Identifier(v_id) if v_id.name == k_id.name));
                        ast_properties.push(ast_expr::ObjectExpressionProperty::ObjectProperty(
                            ast_expr::ObjectProperty {
                                base: BaseNode::typed("ObjectProperty"),
                                key: Box::new(key),
                                value: Box::new(value),
                                computed: matches!(
                                    obj_prop.key,
                                    ObjectPropertyKey::Computed { .. }
                                ),
                                shorthand: is_shorthand,
                                decorators: None,
                                method: None,
                            },
                        ));
                    }
                    ObjectPropertyType::Method => {
                        let method_data = cx.object_methods.get(&obj_prop.place.identifier);
                        let method_data = method_data.cloned();
                        let Some((InstructionValue::ObjectMethod { lowered_func, .. }, _)) =
                            method_data
                        else {
                            return Err(invariant_err("Expected ObjectMethod instruction", None));
                        };

                        let func = &cx.env.functions[lowered_func.func.0 as usize];
                        let reactive_fn = build_reactive_function(func, cx.env)?;
                        let mut reactive_fn_mut = reactive_fn;
                        prune_unused_labels(&mut reactive_fn_mut, cx.env)?;
                        prune_unused_lvalues(&mut reactive_fn_mut, cx.env);

                        let mut inner_cx = Context::new(
                            cx.env,
                            reactive_fn_mut
                                .id
                                .as_deref()
                                .unwrap_or("[[ anonymous ]]")
                                .to_string(),
                            cx.unique_identifiers.clone(),
                            cx.fbt_operands.clone(),
                        );
                        inner_cx.temp = cx.temp.clone();

                        let fn_result = codegen_reactive_function(&mut inner_cx, &reactive_fn_mut)?;

                        ast_properties.push(ast_expr::ObjectExpressionProperty::ObjectMethod(
                            ast_expr::ObjectMethod {
                                base: BaseNode::typed("ObjectMethod"),
                                method: true,
                                kind: ast_expr::ObjectMethodKind::Method,
                                key: Box::new(key),
                                params: fn_result.params,
                                body: fn_result.body,
                                computed: matches!(
                                    obj_prop.key,
                                    ObjectPropertyKey::Computed { .. }
                                ),
                                id: None,
                                generator: fn_result.generator,
                                is_async: fn_result.is_async,
                                decorators: None,
                                return_type: None,
                                type_parameters: None,
                                predicate: None,
                            },
                        ));
                    }
                }
            }
            ObjectPropertyOrSpread::Spread(spread) => {
                let arg = codegen_place_to_expression(cx, &spread.place)?;
                ast_properties.push(ast_expr::ObjectExpressionProperty::SpreadElement(
                    ast_expr::SpreadElement {
                        base: BaseNode::typed("SpreadElement"),
                        argument: Box::new(arg),
                    },
                ));
            }
        }
    }
    Ok(ExpressionOrJsxText::Expression(
        Expression::ObjectExpression(ast_expr::ObjectExpression {
            base: BaseNode::typed("ObjectExpression"),
            properties: ast_properties,
        }),
    ))
}

fn codegen_object_property_key(
    cx: &mut Context,
    key: &ObjectPropertyKey,
) -> Result<Expression, CompilerError> {
    match key {
        ObjectPropertyKey::String { name } => Ok(Expression::StringLiteral(StringLiteral {
            base: BaseNode::typed("StringLiteral"),
            value: name.clone().into(),
        })),
        ObjectPropertyKey::Identifier { name } => Ok(Expression::Identifier(make_identifier(name))),
        ObjectPropertyKey::Computed { name } => {
            let expr = codegen_place(cx, name)?;
            match expr {
                ExpressionOrJsxText::Expression(e) => Ok(e),
                ExpressionOrJsxText::JsxText(_) => Err(invariant_err(
                    "Expected object property key to be an expression",
                    None,
                )),
            }
        }
        ObjectPropertyKey::Number { name } => Ok(Expression::NumericLiteral(NumericLiteral {
            base: BaseNode::typed("NumericLiteral"),
            value: name.value(),
            extra: None,
        })),
    }
}

// =============================================================================
// JSX codegen
// =============================================================================

fn codegen_jsx_expression(
    cx: &mut Context,
    tag: &JsxTag,
    props: &[JsxAttribute],
    children: &Option<Vec<Place>>,
    loc: Option<DiagSourceLocation>,
    opening_loc: Option<DiagSourceLocation>,
    closing_loc: Option<DiagSourceLocation>,
) -> Result<ExpressionOrJsxText, CompilerError> {
    let mut attributes: Vec<JSXAttributeItem> = Vec::new();
    for attr in props {
        attributes.push(codegen_jsx_attribute(cx, attr)?);
    }

    let (tag_value, _tag_loc) = match tag {
        JsxTag::Place(place) => (codegen_place_to_expression(cx, place)?, place.loc),
        JsxTag::Builtin(builtin) => (
            Expression::StringLiteral(StringLiteral {
                base: BaseNode::typed("StringLiteral"),
                value: builtin.name.clone().into(),
            }),
            None,
        ),
    };

    let jsx_tag = expression_to_jsx_tag(&tag_value, jsx_tag_loc(tag))?;

    let is_fbt_tag = if let Expression::StringLiteral(ref s) = tag_value {
        s.value
            .as_str()
            .is_some_and(|v| SINGLE_CHILD_FBT_TAGS.contains(&v))
    } else {
        false
    };

    let child_nodes = if is_fbt_tag {
        children
            .as_ref()
            .map(|c| {
                c.iter()
                    .map(|child| codegen_jsx_fbt_child_element(cx, child))
                    .collect::<Result<Vec<_>, _>>()
            })
            .transpose()?
            .unwrap_or_default()
    } else {
        children
            .as_ref()
            .map(|c| {
                c.iter()
                    .map(|child| codegen_jsx_element(cx, child))
                    .collect::<Result<Vec<_>, _>>()
            })
            .transpose()?
            .unwrap_or_default()
    };

    let is_self_closing = children.is_none();

    let element = JSXElement {
        base: base_node_with_loc("JSXElement", loc),
        opening_element: JSXOpeningElement {
            base: base_node_with_loc("JSXOpeningElement", opening_loc),
            name: jsx_tag.clone(),
            attributes,
            self_closing: is_self_closing,
            type_parameters: None,
        },
        closing_element: if !is_self_closing {
            Some(JSXClosingElement {
                base: base_node_with_loc("JSXClosingElement", closing_loc),
                name: jsx_tag,
            })
        } else {
            None
        },
        children: child_nodes,
        self_closing: if is_self_closing { Some(true) } else { None },
    };

    Ok(ExpressionOrJsxText::Expression(Expression::JSXElement(
        Box::new(element),
    )))
}

const JSX_TEXT_CHILD_REQUIRES_EXPR_CONTAINER_PATTERN: &[char] = &['<', '>', '&', '{', '}'];
const STRING_REQUIRES_EXPR_CONTAINER_CHARS: &str = "\"\\";

fn string_requires_expr_container(s: &str) -> bool {
    for c in s.chars() {
        if STRING_REQUIRES_EXPR_CONTAINER_CHARS.contains(c) {
            return true;
        }
        // Check for control chars and non-basic-latin
        let code = c as u32;
        if code <= 0x1F || code == 0x7F || (code >= 0x80 && code <= 0x9F) || (code >= 0xA0) {
            return true;
        }
    }
    false
}

fn codegen_jsx_attribute(
    cx: &mut Context,
    attr: &JsxAttribute,
) -> Result<JSXAttributeItem, CompilerError> {
    match attr {
        JsxAttribute::Attribute { name, place } => {
            let prop_name = if name.contains(':') {
                let parts: Vec<&str> = name.splitn(2, ':').collect();
                JSXAttributeName::JSXNamespacedName(JSXNamespacedName {
                    base: BaseNode::typed("JSXNamespacedName"),
                    namespace: JSXIdentifier {
                        base: BaseNode::typed("JSXIdentifier"),
                        name: parts[0].to_string(),
                    },
                    name: JSXIdentifier {
                        base: BaseNode::typed("JSXIdentifier"),
                        name: parts[1].to_string(),
                    },
                })
            } else {
                JSXAttributeName::JSXIdentifier(JSXIdentifier {
                    base: BaseNode::typed("JSXIdentifier"),
                    name: name.clone(),
                })
            };

            let inner_value = codegen_place_to_expression(cx, place)?;
            let attr_value = match &inner_value {
                Expression::StringLiteral(s) => {
                    if string_requires_expr_container(&s.value.to_marker_string())
                        && !cx.fbt_operands.contains(&place.identifier)
                    {
                        Some(JSXAttributeValue::JSXExpressionContainer(
                            JSXExpressionContainer {
                                base: base_node_with_loc("JSXExpressionContainer", place.loc),
                                expression: JSXExpressionContainerExpr::Expression(Box::new(
                                    inner_value,
                                )),
                            },
                        ))
                    } else {
                        // Preserve loc from the inner StringLiteral (or fall back to
                        // the place's loc) so downstream plugins (e.g., babel-plugin-fbt)
                        // can read loc on attribute values.
                        let base = if s.base.loc.is_some() {
                            s.base.clone()
                        } else {
                            base_node_with_loc("StringLiteral", place.loc)
                        };
                        Some(JSXAttributeValue::StringLiteral(StringLiteral {
                            base,
                            value: s.value.clone(),
                        }))
                    }
                }
                _ => Some(JSXAttributeValue::JSXExpressionContainer(
                    JSXExpressionContainer {
                        base: base_node_with_loc("JSXExpressionContainer", place.loc),
                        expression: JSXExpressionContainerExpr::Expression(Box::new(inner_value)),
                    },
                )),
            };
            Ok(JSXAttributeItem::JSXAttribute(AstJSXAttribute {
                base: base_node_with_loc("JSXAttribute", place.loc),
                name: prop_name,
                value: attr_value,
            }))
        }
        JsxAttribute::SpreadAttribute { argument } => {
            let expr = codegen_place_to_expression(cx, argument)?;
            Ok(JSXAttributeItem::JSXSpreadAttribute(JSXSpreadAttribute {
                base: BaseNode::typed("JSXSpreadAttribute"),
                argument: Box::new(expr),
            }))
        }
    }
}

fn codegen_jsx_element(cx: &mut Context, place: &Place) -> Result<JSXChild, CompilerError> {
    let loc = place.loc;
    let value = codegen_place(cx, place)?;
    match value {
        ExpressionOrJsxText::JsxText(text) => {
            if text
                .value
                .contains(JSX_TEXT_CHILD_REQUIRES_EXPR_CONTAINER_PATTERN)
            {
                Ok(JSXChild::JSXExpressionContainer(JSXExpressionContainer {
                    base: base_node_with_loc("JSXExpressionContainer", loc),
                    expression: JSXExpressionContainerExpr::Expression(Box::new(
                        Expression::StringLiteral(StringLiteral {
                            base: base_node_with_loc("StringLiteral", loc),
                            value: text.value.clone().into(),
                        }),
                    )),
                }))
            } else {
                Ok(JSXChild::JSXText(text))
            }
        }
        ExpressionOrJsxText::Expression(Expression::JSXElement(elem)) => {
            Ok(JSXChild::JSXElement(elem))
        }
        ExpressionOrJsxText::Expression(Expression::JSXFragment(frag)) => {
            Ok(JSXChild::JSXFragment(frag))
        }
        ExpressionOrJsxText::Expression(expr) => {
            Ok(JSXChild::JSXExpressionContainer(JSXExpressionContainer {
                base: base_node_with_loc("JSXExpressionContainer", loc),
                expression: JSXExpressionContainerExpr::Expression(Box::new(expr)),
            }))
        }
    }
}

fn codegen_jsx_fbt_child_element(
    cx: &mut Context,
    place: &Place,
) -> Result<JSXChild, CompilerError> {
    let loc = place.loc;
    let value = codegen_place(cx, place)?;
    match value {
        ExpressionOrJsxText::JsxText(text) => Ok(JSXChild::JSXText(text)),
        ExpressionOrJsxText::Expression(Expression::JSXElement(elem)) => {
            Ok(JSXChild::JSXElement(elem))
        }
        ExpressionOrJsxText::Expression(expr) => {
            Ok(JSXChild::JSXExpressionContainer(JSXExpressionContainer {
                base: base_node_with_loc("JSXExpressionContainer", loc),
                expression: JSXExpressionContainerExpr::Expression(Box::new(expr)),
            }))
        }
    }
}

fn expression_to_jsx_tag(
    expr: &Expression,
    loc: Option<DiagSourceLocation>,
) -> Result<JSXElementName, CompilerError> {
    match expr {
        Expression::Identifier(ident) => Ok(JSXElementName::JSXIdentifier(JSXIdentifier {
            base: base_node_with_loc("JSXIdentifier", loc),
            name: ident.name.clone(),
        })),
        Expression::MemberExpression(me) => Ok(JSXElementName::JSXMemberExpression(
            convert_member_expression_to_jsx(me)?,
        )),
        Expression::StringLiteral(s) => {
            // JSX tag names are identifier-shaped; the marker form preserves
            // the pre-JsString behavior for pathological values.
            let tag_text = s.value.to_marker_string();
            if tag_text.contains(':') {
                let parts: Vec<&str> = tag_text.splitn(2, ':').collect();
                Ok(JSXElementName::JSXNamespacedName(JSXNamespacedName {
                    base: base_node_with_loc("JSXNamespacedName", loc),
                    namespace: JSXIdentifier {
                        base: base_node_with_loc("JSXIdentifier", loc),
                        name: parts[0].to_string(),
                    },
                    name: JSXIdentifier {
                        base: base_node_with_loc("JSXIdentifier", loc),
                        name: parts[1].to_string(),
                    },
                }))
            } else {
                Ok(JSXElementName::JSXIdentifier(JSXIdentifier {
                    base: base_node_with_loc("JSXIdentifier", loc),
                    name: tag_text,
                }))
            }
        }
        _ => Err(invariant_err(
            &format!("Expected JSX tag to be an identifier or string"),
            None,
        )),
    }
}

fn convert_member_expression_to_jsx(
    me: &ast_expr::MemberExpression,
) -> Result<JSXMemberExpression, CompilerError> {
    let Expression::Identifier(ref prop_ident) = *me.property else {
        return Err(invariant_err(
            "Expected JSX member expression property to be a string",
            None,
        ));
    };
    let property = JSXIdentifier {
        base: BaseNode::typed("JSXIdentifier"),
        name: prop_ident.name.clone(),
    };
    match &*me.object {
        Expression::Identifier(ident) => Ok(JSXMemberExpression {
            base: BaseNode::typed("JSXMemberExpression"),
            object: Box::new(JSXMemberExprObject::JSXIdentifier(JSXIdentifier {
                base: BaseNode::typed("JSXIdentifier"),
                name: ident.name.clone(),
            })),
            property,
        }),
        Expression::MemberExpression(inner_me) => {
            let inner = convert_member_expression_to_jsx(inner_me)?;
            Ok(JSXMemberExpression {
                base: BaseNode::typed("JSXMemberExpression"),
                object: Box::new(JSXMemberExprObject::JSXMemberExpression(Box::new(inner))),
                property,
            })
        }
        _ => Err(invariant_err(
            "Expected JSX member expression to be an identifier or nested member expression",
            None,
        )),
    }
}

// =============================================================================
// Pattern codegen (lvalues)
// =============================================================================

enum LvalueRef<'a> {
    Place(&'a Place),
    Pattern(&'a Pattern),
    Spread(&'a SpreadPattern),
}

fn codegen_lvalue(cx: &mut Context, pattern: &LvalueRef) -> Result<PatternLike, CompilerError> {
    match pattern {
        LvalueRef::Place(place) => Ok(PatternLike::Identifier(convert_identifier(
            place.identifier,
            cx.env,
        )?)),
        LvalueRef::Pattern(pat) => match pat {
            Pattern::Array(arr) => codegen_array_pattern(cx, arr),
            Pattern::Object(obj) => codegen_object_pattern(cx, obj),
        },
        LvalueRef::Spread(spread) => {
            let inner = codegen_lvalue(cx, &LvalueRef::Place(&spread.place))?;
            Ok(PatternLike::RestElement(RestElement {
                base: BaseNode::typed("RestElement"),
                argument: Box::new(inner),
                type_annotation: None,
                decorators: None,
            }))
        }
    }
}

fn codegen_array_pattern(
    cx: &mut Context,
    pattern: &ArrayPattern,
) -> Result<PatternLike, CompilerError> {
    let elements: Vec<Option<PatternLike>> = pattern
        .items
        .iter()
        .map(|item| match item {
            react_compiler_hir::ArrayPatternElement::Place(place) => {
                Ok(Some(codegen_lvalue(cx, &LvalueRef::Place(place))?))
            }
            react_compiler_hir::ArrayPatternElement::Spread(spread) => {
                Ok(Some(codegen_lvalue(cx, &LvalueRef::Spread(spread))?))
            }
            react_compiler_hir::ArrayPatternElement::Hole => Ok(None),
        })
        .collect::<Result<_, CompilerError>>()?;
    Ok(PatternLike::ArrayPattern(AstArrayPattern {
        base: base_node_with_loc("ArrayPattern", pattern.loc),
        elements,
        type_annotation: None,
        decorators: None,
    }))
}

fn codegen_object_pattern(
    cx: &mut Context,
    pattern: &ObjectPattern,
) -> Result<PatternLike, CompilerError> {
    let properties: Vec<ObjectPatternProperty> = pattern
        .properties
        .iter()
        .map(|prop| match prop {
            ObjectPropertyOrSpread::Property(obj_prop) => {
                let key = codegen_object_property_key(cx, &obj_prop.key)?;
                let value = codegen_lvalue(cx, &LvalueRef::Place(&obj_prop.place))?;
                let is_shorthand = matches!(&key, Expression::Identifier(k_id)
                    if matches!(&value, PatternLike::Identifier(v_id) if v_id.name == k_id.name));
                Ok(ObjectPatternProperty::ObjectProperty(ObjectPatternProp {
                    base: BaseNode::typed("ObjectProperty"),
                    key: Box::new(key),
                    value: Box::new(value),
                    computed: matches!(obj_prop.key, ObjectPropertyKey::Computed { .. }),
                    shorthand: is_shorthand,
                    decorators: None,
                    method: None,
                }))
            }
            ObjectPropertyOrSpread::Spread(spread) => {
                let inner = codegen_lvalue(cx, &LvalueRef::Place(&spread.place))?;
                Ok(ObjectPatternProperty::RestElement(RestElement {
                    base: BaseNode::typed("RestElement"),
                    argument: Box::new(inner),
                    type_annotation: None,
                    decorators: None,
                }))
            }
        })
        .collect::<Result<_, CompilerError>>()?;
    Ok(PatternLike::ObjectPattern(
        react_compiler_ast::patterns::ObjectPattern {
            base: base_node_with_loc("ObjectPattern", pattern.loc),
            properties,
            type_annotation: None,
            decorators: None,
        },
    ))
}

// =============================================================================
// Place / identifier codegen
// =============================================================================

fn codegen_place_to_expression(
    cx: &mut Context,
    place: &Place,
) -> Result<Expression, CompilerError> {
    let value = codegen_place(cx, place)?;
    Ok(convert_value_to_expression(value))
}

fn codegen_place(cx: &mut Context, place: &Place) -> Result<ExpressionOrJsxText, CompilerError> {
    let ident = &cx.env.identifiers[place.identifier.0 as usize];
    if let Some(tmp) = cx.temp.get(&ident.declaration_id) {
        if let Some(val) = tmp {
            return Ok(val.clone());
        }
        // tmp is None — means declared but no temp value, fall through
    }
    // Check if it's an unnamed identifier without a temp
    if ident.name.is_none() && !cx.temp.contains_key(&ident.declaration_id) {
        return Err(invariant_err(
            &format!(
                "[Codegen] No value found for temporary, identifier id={}",
                place.identifier.0
            ),
            place.loc,
        ));
    }
    let mut ast_ident = convert_identifier(place.identifier, cx.env)?;
    // Override identifier loc with place.loc, matching TS: identifier.loc = place.loc
    if let Some(loc) = place.loc {
        ast_ident.base.loc = Some(AstSourceLocation {
            start: AstPosition {
                line: loc.start.line,
                column: loc.start.column,
                index: None,
            },
            end: AstPosition {
                line: loc.end.line,
                column: loc.end.column,
                index: None,
            },
            filename: None,
            identifier_name: None,
        });
    }
    Ok(ExpressionOrJsxText::Expression(Expression::Identifier(
        ast_ident,
    )))
}

fn convert_identifier(
    identifier_id: IdentifierId,
    env: &Environment,
) -> Result<AstIdentifier, CompilerError> {
    let ident = &env.identifiers[identifier_id.0 as usize];
    let name = match &ident.name {
        Some(react_compiler_hir::IdentifierName::Named(n)) => n.clone(),
        Some(react_compiler_hir::IdentifierName::Promoted(n)) => n.clone(),
        None => {
            // Use CompilerDiagnostic (with details array) to match TS CompilerError.invariant()
            // which creates a CompilerDiagnostic with details: [{kind: "error", loc, message}].
            let reason =
                "Expected temporaries to be promoted to named identifiers in an earlier pass"
                    .to_string();
            let description = format!("identifier {} is unnamed", identifier_id.0);
            let mut err = CompilerError::new();
            err.push_diagnostic(
                CompilerDiagnostic::new(
                    ErrorCategory::Invariant,
                    reason.clone(),
                    Some(description),
                )
                .with_detail(CompilerDiagnosticDetail::Error {
                    loc: None,
                    message: Some(reason),
                    identifier_name: None,
                }),
            );
            return Err(err);
        }
    };
    Ok(make_identifier_with_loc(&name, ident.loc))
}

fn codegen_argument(cx: &mut Context, arg: &PlaceOrSpread) -> Result<Expression, CompilerError> {
    match arg {
        PlaceOrSpread::Place(place) => codegen_place_to_expression(cx, place),
        PlaceOrSpread::Spread(spread) => {
            let expr = codegen_place_to_expression(cx, &spread.place)?;
            Ok(Expression::SpreadElement(ast_expr::SpreadElement {
                base: BaseNode::typed("SpreadElement"),
                argument: Box::new(expr),
            }))
        }
    }
}

// =============================================================================
// Dependency codegen
// =============================================================================

fn codegen_dependency(
    cx: &mut Context,
    dep: &react_compiler_hir::ReactiveScopeDependency,
) -> Result<Expression, CompilerError> {
    let mut object: Expression =
        Expression::Identifier(convert_identifier(dep.identifier, cx.env)?);
    if !dep.path.is_empty() {
        let has_optional = dep.path.iter().any(|p| p.optional);
        for path_entry in &dep.path {
            let (property, is_computed) = property_literal_to_expression(&path_entry.property);
            if has_optional {
                object = Expression::OptionalMemberExpression(ast_expr::OptionalMemberExpression {
                    base: BaseNode::typed("OptionalMemberExpression"),
                    object: Box::new(object),
                    property: Box::new(property),
                    computed: is_computed,
                    optional: path_entry.optional,
                });
            } else {
                object = Expression::MemberExpression(ast_expr::MemberExpression {
                    base: BaseNode::typed("MemberExpression"),
                    object: Box::new(object),
                    property: Box::new(property),
                    computed: is_computed,
                });
            }
        }
    }
    Ok(object)
}

// =============================================================================
// CountMemoBlockVisitor — uses ReactiveFunctionVisitor trait
// =============================================================================

/// Counts memo blocks and pruned memo blocks in a reactive function.
/// TS: `class CountMemoBlockVisitor extends ReactiveFunctionVisitor<void>`
struct CountMemoBlockVisitor<'a> {
    env: &'a Environment,
}

struct CountMemoBlockState {
    memo_blocks: u32,
    memo_values: u32,
    pruned_memo_blocks: u32,
    pruned_memo_values: u32,
}

impl<'a> ReactiveFunctionVisitor for CountMemoBlockVisitor<'a> {
    type State = CountMemoBlockState;

    fn env(&self) -> &Environment {
        self.env
    }

    fn visit_scope(&self, scope_block: &ReactiveScopeBlock, state: &mut CountMemoBlockState) {
        state.memo_blocks += 1;
        let scope = &self.env.scopes[scope_block.scope.0 as usize];
        state.memo_values += scope.declarations.len() as u32;
        self.traverse_scope(scope_block, state);
    }

    fn visit_pruned_scope(
        &self,
        scope_block: &PrunedReactiveScopeBlock,
        state: &mut CountMemoBlockState,
    ) {
        state.pruned_memo_blocks += 1;
        let scope = &self.env.scopes[scope_block.scope.0 as usize];
        state.pruned_memo_values += scope.declarations.len() as u32;
        self.traverse_pruned_scope(scope_block, state);
    }
}

fn count_memo_blocks(func: &ReactiveFunction, env: &Environment) -> (u32, u32, u32, u32) {
    let visitor = CountMemoBlockVisitor { env };
    let mut state = CountMemoBlockState {
        memo_blocks: 0,
        memo_values: 0,
        pruned_memo_blocks: 0,
        pruned_memo_values: 0,
    };
    visit_reactive_function(func, &visitor, &mut state);
    (
        state.memo_blocks,
        state.memo_values,
        state.pruned_memo_blocks,
        state.pruned_memo_values,
    )
}

// =============================================================================
// Operator conversions
// =============================================================================

fn convert_binary_operator(op: &react_compiler_hir::BinaryOperator) -> AstBinaryOperator {
    match op {
        react_compiler_hir::BinaryOperator::Equal => AstBinaryOperator::Eq,
        react_compiler_hir::BinaryOperator::NotEqual => AstBinaryOperator::Neq,
        react_compiler_hir::BinaryOperator::StrictEqual => AstBinaryOperator::StrictEq,
        react_compiler_hir::BinaryOperator::StrictNotEqual => AstBinaryOperator::StrictNeq,
        react_compiler_hir::BinaryOperator::LessThan => AstBinaryOperator::Lt,
        react_compiler_hir::BinaryOperator::LessEqual => AstBinaryOperator::Lte,
        react_compiler_hir::BinaryOperator::GreaterThan => AstBinaryOperator::Gt,
        react_compiler_hir::BinaryOperator::GreaterEqual => AstBinaryOperator::Gte,
        react_compiler_hir::BinaryOperator::ShiftLeft => AstBinaryOperator::Shl,
        react_compiler_hir::BinaryOperator::ShiftRight => AstBinaryOperator::Shr,
        react_compiler_hir::BinaryOperator::UnsignedShiftRight => AstBinaryOperator::UShr,
        react_compiler_hir::BinaryOperator::Add => AstBinaryOperator::Add,
        react_compiler_hir::BinaryOperator::Subtract => AstBinaryOperator::Sub,
        react_compiler_hir::BinaryOperator::Multiply => AstBinaryOperator::Mul,
        react_compiler_hir::BinaryOperator::Divide => AstBinaryOperator::Div,
        react_compiler_hir::BinaryOperator::Modulo => AstBinaryOperator::Rem,
        react_compiler_hir::BinaryOperator::Exponent => AstBinaryOperator::Exp,
        react_compiler_hir::BinaryOperator::BitwiseOr => AstBinaryOperator::BitOr,
        react_compiler_hir::BinaryOperator::BitwiseXor => AstBinaryOperator::BitXor,
        react_compiler_hir::BinaryOperator::BitwiseAnd => AstBinaryOperator::BitAnd,
        react_compiler_hir::BinaryOperator::In => AstBinaryOperator::In,
        react_compiler_hir::BinaryOperator::InstanceOf => AstBinaryOperator::Instanceof,
    }
}

fn convert_unary_operator(op: &react_compiler_hir::UnaryOperator) -> AstUnaryOperator {
    match op {
        react_compiler_hir::UnaryOperator::Minus => AstUnaryOperator::Neg,
        react_compiler_hir::UnaryOperator::Plus => AstUnaryOperator::Plus,
        react_compiler_hir::UnaryOperator::Not => AstUnaryOperator::Not,
        react_compiler_hir::UnaryOperator::BitwiseNot => AstUnaryOperator::BitNot,
        react_compiler_hir::UnaryOperator::TypeOf => AstUnaryOperator::TypeOf,
        react_compiler_hir::UnaryOperator::Void => AstUnaryOperator::Void,
    }
}

fn convert_logical_operator(op: &LogicalOperator) -> AstLogicalOperator {
    match op {
        LogicalOperator::And => AstLogicalOperator::And,
        LogicalOperator::Or => AstLogicalOperator::Or,
        LogicalOperator::NullishCoalescing => AstLogicalOperator::NullishCoalescing,
    }
}

fn convert_update_operator(op: &react_compiler_hir::UpdateOperator) -> AstUpdateOperator {
    match op {
        react_compiler_hir::UpdateOperator::Increment => AstUpdateOperator::Increment,
        react_compiler_hir::UpdateOperator::Decrement => AstUpdateOperator::Decrement,
    }
}

// =============================================================================
// Helpers
// =============================================================================

/// Create a BaseNode with the given type name and optional source location.
/// Converts from the diagnostics SourceLocation (line, column) to the AST
/// SourceLocation format. This is critical for Babel's `retainLines: true`
/// option to insert blank lines at correct positions.
fn base_node_with_loc(type_name: &str, loc: Option<DiagSourceLocation>) -> BaseNode {
    match loc {
        Some(loc) => BaseNode {
            node_type: Some(type_name.to_string()),
            loc: Some(AstSourceLocation {
                start: AstPosition {
                    line: loc.start.line,
                    column: loc.start.column,
                    index: loc.start.index,
                },
                end: AstPosition {
                    line: loc.end.line,
                    column: loc.end.column,
                    index: loc.end.index,
                },
                filename: None,
                identifier_name: None,
            }),
            ..Default::default()
        },
        None => BaseNode::typed(type_name),
    }
}

fn make_identifier(name: &str) -> AstIdentifier {
    AstIdentifier {
        base: BaseNode::typed("Identifier"),
        name: name.to_string(),
        type_annotation: None,
        optional: None,
        decorators: None,
    }
}

fn make_identifier_with_loc(name: &str, loc: Option<DiagSourceLocation>) -> AstIdentifier {
    AstIdentifier {
        base: base_node_with_loc("Identifier", loc),
        name: name.to_string(),
        type_annotation: None,
        optional: None,
        decorators: None,
    }
}

fn make_var_declarator(id: PatternLike, init: Option<Expression>) -> VariableDeclarator {
    // Reconstruct VariableDeclarator.loc from id.loc.start and init.loc.end,
    // matching TS createVariableDeclarator behavior for retainLines support.
    let loc = get_pattern_loc(&id).and_then(|id_loc| {
        let end = match &init {
            Some(expr) => get_expression_loc(expr)
                .map(|l| l.end.clone())
                .unwrap_or_else(|| id_loc.end.clone()),
            None => id_loc.end.clone(),
        };
        Some(AstSourceLocation {
            start: id_loc.start.clone(),
            end,
            filename: id_loc.filename.clone(),
            identifier_name: None,
        })
    });
    VariableDeclarator {
        base: if let Some(loc) = loc {
            BaseNode {
                node_type: Some("VariableDeclarator".to_string()),
                loc: Some(loc),
                ..Default::default()
            }
        } else {
            BaseNode::typed("VariableDeclarator")
        },
        id,
        init: init.map(Box::new),
        definite: None,
    }
}

/// Extract the loc from a PatternLike's base node.
fn get_pattern_loc(pattern: &PatternLike) -> Option<&AstSourceLocation> {
    match pattern {
        PatternLike::Identifier(id) => id.base.loc.as_ref(),
        PatternLike::ObjectPattern(p) => p.base.loc.as_ref(),
        PatternLike::ArrayPattern(p) => p.base.loc.as_ref(),
        PatternLike::AssignmentPattern(p) => p.base.loc.as_ref(),
        PatternLike::RestElement(p) => p.base.loc.as_ref(),
        _ => None,
    }
}

/// Extract the loc from an Expression's base node.
fn get_expression_loc(expr: &Expression) -> Option<&AstSourceLocation> {
    match expr {
        Expression::Identifier(e) => e.base.loc.as_ref(),
        Expression::StringLiteral(e) => e.base.loc.as_ref(),
        Expression::NumericLiteral(e) => e.base.loc.as_ref(),
        Expression::BooleanLiteral(e) => e.base.loc.as_ref(),
        Expression::NullLiteral(e) => e.base.loc.as_ref(),
        Expression::CallExpression(e) => e.base.loc.as_ref(),
        Expression::MemberExpression(e) => e.base.loc.as_ref(),
        Expression::OptionalMemberExpression(e) => e.base.loc.as_ref(),
        Expression::ArrayExpression(e) => e.base.loc.as_ref(),
        Expression::ObjectExpression(e) => e.base.loc.as_ref(),
        Expression::ArrowFunctionExpression(e) => e.base.loc.as_ref(),
        Expression::FunctionExpression(e) => e.base.loc.as_ref(),
        Expression::BinaryExpression(e) => e.base.loc.as_ref(),
        Expression::UnaryExpression(e) => e.base.loc.as_ref(),
        Expression::UpdateExpression(e) => e.base.loc.as_ref(),
        Expression::LogicalExpression(e) => e.base.loc.as_ref(),
        Expression::ConditionalExpression(e) => e.base.loc.as_ref(),
        Expression::SequenceExpression(e) => e.base.loc.as_ref(),
        Expression::AssignmentExpression(e) => e.base.loc.as_ref(),
        Expression::TemplateLiteral(e) => e.base.loc.as_ref(),
        Expression::TaggedTemplateExpression(e) => e.base.loc.as_ref(),
        Expression::SpreadElement(e) => e.base.loc.as_ref(),
        Expression::RegExpLiteral(e) => e.base.loc.as_ref(),
        Expression::JSXElement(e) => e.base.loc.as_ref(),
        Expression::JSXFragment(e) => e.base.loc.as_ref(),
        Expression::NewExpression(e) => e.base.loc.as_ref(),
        Expression::OptionalCallExpression(e) => e.base.loc.as_ref(),
        _ => None,
    }
}

/// Apply a source location to an ExpressionOrJsxText value, matching the TS behavior
/// where `value.loc = instrValue.loc` is set at the end of codegenInstructionValue.
fn apply_loc_to_value(value: &mut ExpressionOrJsxText, loc: DiagSourceLocation) {
    let ast_loc = AstSourceLocation {
        start: AstPosition {
            line: loc.start.line,
            column: loc.start.column,
            index: None,
        },
        end: AstPosition {
            line: loc.end.line,
            column: loc.end.column,
            index: None,
        },
        filename: None,
        identifier_name: None,
    };
    match value {
        ExpressionOrJsxText::Expression(expr) => {
            apply_loc_to_expression(expr, ast_loc);
        }
        ExpressionOrJsxText::JsxText(text) => {
            text.base.loc = Some(ast_loc);
        }
    }
}

/// Apply a source location to an Expression's base node.
fn apply_loc_to_expression(expr: &mut Expression, loc: AstSourceLocation) {
    let base = match expr {
        Expression::Identifier(e) => &mut e.base,
        Expression::StringLiteral(e) => &mut e.base,
        Expression::NumericLiteral(e) => &mut e.base,
        Expression::BooleanLiteral(e) => &mut e.base,
        Expression::NullLiteral(e) => &mut e.base,
        Expression::CallExpression(e) => &mut e.base,
        Expression::MemberExpression(e) => &mut e.base,
        Expression::OptionalMemberExpression(e) => &mut e.base,
        Expression::ArrayExpression(e) => &mut e.base,
        Expression::ObjectExpression(e) => &mut e.base,
        Expression::ArrowFunctionExpression(e) => &mut e.base,
        Expression::FunctionExpression(e) => &mut e.base,
        Expression::BinaryExpression(e) => &mut e.base,
        Expression::UnaryExpression(e) => &mut e.base,
        Expression::UpdateExpression(e) => &mut e.base,
        Expression::LogicalExpression(e) => &mut e.base,
        Expression::ConditionalExpression(e) => &mut e.base,
        Expression::SequenceExpression(e) => &mut e.base,
        Expression::AssignmentExpression(e) => &mut e.base,
        Expression::TemplateLiteral(e) => &mut e.base,
        Expression::TaggedTemplateExpression(e) => &mut e.base,
        Expression::SpreadElement(e) => &mut e.base,
        Expression::RegExpLiteral(e) => &mut e.base,
        Expression::JSXElement(e) => &mut e.base,
        Expression::JSXFragment(e) => &mut e.base,
        Expression::NewExpression(e) => &mut e.base,
        Expression::OptionalCallExpression(e) => &mut e.base,
        _ => return,
    };
    base.loc = Some(loc);
}

fn codegen_label(id: BlockId) -> String {
    format!("bb{}", id.0)
}

fn symbol_for(name: &str) -> Expression {
    Expression::CallExpression(ast_expr::CallExpression {
        base: BaseNode::typed("CallExpression"),
        callee: Box::new(Expression::MemberExpression(ast_expr::MemberExpression {
            base: BaseNode::typed("MemberExpression"),
            object: Box::new(Expression::Identifier(make_identifier("Symbol"))),
            property: Box::new(Expression::Identifier(make_identifier("for"))),
            computed: false,
        })),
        arguments: vec![Expression::StringLiteral(StringLiteral {
            base: BaseNode::typed("StringLiteral"),
            value: name.to_string().into(),
        })],
        type_parameters: None,
        type_arguments: None,
        optional: None,
    })
}

fn codegen_primitive_value(value: &PrimitiveValue, loc: Option<DiagSourceLocation>) -> Expression {
    match value {
        PrimitiveValue::Number(n) => {
            let f = n.value();
            if f.is_nan() {
                Expression::Identifier(make_identifier("NaN"))
            } else if f.is_infinite() {
                if f > 0.0 {
                    Expression::Identifier(make_identifier("Infinity"))
                } else {
                    Expression::UnaryExpression(ast_expr::UnaryExpression {
                        base: base_node_with_loc("UnaryExpression", loc),
                        operator: AstUnaryOperator::Neg,
                        prefix: true,
                        argument: Box::new(Expression::Identifier(make_identifier("Infinity"))),
                    })
                }
            } else if f < 0.0 {
                Expression::UnaryExpression(ast_expr::UnaryExpression {
                    base: base_node_with_loc("UnaryExpression", loc),
                    operator: AstUnaryOperator::Neg,
                    prefix: true,
                    argument: Box::new(Expression::NumericLiteral(NumericLiteral {
                        base: base_node_with_loc("NumericLiteral", loc),
                        value: -f,
                        extra: None,
                    })),
                })
            } else {
                Expression::NumericLiteral(NumericLiteral {
                    base: base_node_with_loc("NumericLiteral", loc),
                    value: f,
                    extra: None,
                })
            }
        }
        PrimitiveValue::Boolean(b) => Expression::BooleanLiteral(BooleanLiteral {
            base: base_node_with_loc("BooleanLiteral", loc),
            value: *b,
        }),
        PrimitiveValue::String(s) => Expression::StringLiteral(StringLiteral {
            base: base_node_with_loc("StringLiteral", loc),
            value: s.clone(),
        }),
        PrimitiveValue::Null => Expression::NullLiteral(NullLiteral {
            base: base_node_with_loc("NullLiteral", loc),
        }),
        PrimitiveValue::Undefined => Expression::Identifier(make_identifier("undefined")),
    }
}

fn property_literal_to_expression(prop: &PropertyLiteral) -> (Expression, bool) {
    match prop {
        PropertyLiteral::String(s) => (Expression::Identifier(make_identifier(s)), false),
        PropertyLiteral::Number(n) => (
            Expression::NumericLiteral(NumericLiteral {
                base: BaseNode::typed("NumericLiteral"),
                value: n.value(),
                extra: None,
            }),
            true,
        ),
    }
}

fn convert_value_to_expression(value: ExpressionOrJsxText) -> Expression {
    match value {
        ExpressionOrJsxText::Expression(e) => e,
        ExpressionOrJsxText::JsxText(text) => Expression::StringLiteral(StringLiteral {
            base: BaseNode::typed("StringLiteral"),
            value: text.value.into(),
        }),
    }
}

fn get_instruction_value(
    reactive_value: &ReactiveValue,
) -> Result<&InstructionValue, CompilerError> {
    match reactive_value {
        ReactiveValue::Instruction(iv) => Ok(iv),
        _ => Err(invariant_err("Expected base instruction value", None)),
    }
}

fn invariant(
    condition: bool,
    reason: &str,
    loc: Option<DiagSourceLocation>,
) -> Result<(), CompilerError> {
    if !condition {
        Err(invariant_err(reason, loc))
    } else {
        Ok(())
    }
}

fn invariant_err(reason: &str, loc: Option<DiagSourceLocation>) -> CompilerError {
    // Use CompilerDiagnostic (with details array) to match TS CompilerError.invariant()
    let mut err = CompilerError::new();
    err.push_diagnostic(
        CompilerDiagnostic::new(ErrorCategory::Invariant, reason, None::<String>).with_detail(
            CompilerDiagnosticDetail::Error {
                loc,
                message: Some(reason.to_string()),
                identifier_name: None,
            },
        ),
    );
    err
}

fn invariant_err_with_detail_message(
    reason: &str,
    message: &str,
    loc: Option<DiagSourceLocation>,
) -> CompilerError {
    let mut err = CompilerError::new();
    let diagnostic = react_compiler_diagnostics::CompilerDiagnostic::new(
        ErrorCategory::Invariant,
        reason,
        None::<String>,
    )
    .with_detail(
        react_compiler_diagnostics::CompilerDiagnosticDetail::Error {
            loc,
            message: Some(message.to_string()),
            identifier_name: None,
        },
    );
    err.push_diagnostic(diagnostic);
    err
}

fn get_statement_type_name(stmt: &Statement) -> &'static str {
    match stmt {
        Statement::ExpressionStatement(_) => "ExpressionStatement",
        Statement::BlockStatement(_) => "BlockStatement",
        Statement::VariableDeclaration(_) => "VariableDeclaration",
        Statement::ReturnStatement(_) => "ReturnStatement",
        Statement::IfStatement(_) => "IfStatement",
        Statement::SwitchStatement(_) => "SwitchStatement",
        Statement::ForStatement(_) => "ForStatement",
        Statement::ForInStatement(_) => "ForInStatement",
        Statement::ForOfStatement(_) => "ForOfStatement",
        Statement::WhileStatement(_) => "WhileStatement",
        Statement::DoWhileStatement(_) => "DoWhileStatement",
        Statement::LabeledStatement(_) => "LabeledStatement",
        Statement::ThrowStatement(_) => "ThrowStatement",
        Statement::TryStatement(_) => "TryStatement",
        Statement::BreakStatement(_) => "BreakStatement",
        Statement::ContinueStatement(_) => "ContinueStatement",
        Statement::FunctionDeclaration(_) => "FunctionDeclaration",
        Statement::DebuggerStatement(_) => "DebuggerStatement",
        Statement::EmptyStatement(_) => "EmptyStatement",
        _ => "Statement",
    }
}

fn get_statement_loc(stmt: &Statement) -> Option<DiagSourceLocation> {
    let base = match stmt {
        Statement::ExpressionStatement(s) => &s.base,
        Statement::BlockStatement(s) => &s.base,
        Statement::VariableDeclaration(s) => &s.base,
        Statement::ReturnStatement(s) => &s.base,
        Statement::IfStatement(s) => &s.base,
        Statement::ForStatement(s) => &s.base,
        Statement::ForInStatement(s) => &s.base,
        Statement::ForOfStatement(s) => &s.base,
        Statement::WhileStatement(s) => &s.base,
        Statement::DoWhileStatement(s) => &s.base,
        Statement::LabeledStatement(s) => &s.base,
        Statement::ThrowStatement(s) => &s.base,
        Statement::TryStatement(s) => &s.base,
        Statement::SwitchStatement(s) => &s.base,
        Statement::BreakStatement(s) => &s.base,
        Statement::ContinueStatement(s) => &s.base,
        Statement::FunctionDeclaration(s) => &s.base,
        Statement::DebuggerStatement(s) => &s.base,
        Statement::EmptyStatement(s) => &s.base,
        _ => return None,
    };
    base.loc.as_ref().map(|loc| DiagSourceLocation {
        start: react_compiler_diagnostics::Position {
            line: loc.start.line,
            column: loc.start.column,
            index: loc.start.index,
        },
        end: react_compiler_diagnostics::Position {
            line: loc.end.line,
            column: loc.end.column,
            index: loc.end.index,
        },
    })
}

fn compare_scope_dependency(
    a: &react_compiler_hir::ReactiveScopeDependency,
    b: &react_compiler_hir::ReactiveScopeDependency,
    env: &Environment,
) -> std::cmp::Ordering {
    let a_name = dep_to_sort_key(a, env);
    let b_name = dep_to_sort_key(b, env);
    a_name.cmp(&b_name)
}

fn dep_to_sort_key(dep: &react_compiler_hir::ReactiveScopeDependency, env: &Environment) -> String {
    let ident = &env.identifiers[dep.identifier.0 as usize];
    let base = match &ident.name {
        Some(react_compiler_hir::IdentifierName::Named(n)) => n.clone(),
        Some(react_compiler_hir::IdentifierName::Promoted(n)) => n.clone(),
        None => format!("_t{}", dep.identifier.0),
    };
    let mut parts = vec![base];
    for entry in &dep.path {
        let prefix = if entry.optional { "?" } else { "" };
        let prop = match &entry.property {
            PropertyLiteral::String(s) => s.clone(),
            PropertyLiteral::Number(n) => format!("{}", n),
        };
        parts.push(format!("{prefix}{prop}"));
    }
    parts.join(".")
}

fn compare_scope_declaration(
    a: &react_compiler_hir::ReactiveScopeDeclaration,
    b: &react_compiler_hir::ReactiveScopeDeclaration,
    env: &Environment,
) -> std::cmp::Ordering {
    let a_name = ident_sort_key(a.identifier, env);
    let b_name = ident_sort_key(b.identifier, env);
    a_name.cmp(&b_name)
}

fn ident_sort_key(id: IdentifierId, env: &Environment) -> String {
    let ident = &env.identifiers[id.0 as usize];
    match &ident.name {
        Some(react_compiler_hir::IdentifierName::Named(n)) => n.clone(),
        Some(react_compiler_hir::IdentifierName::Promoted(n)) => n.clone(),
        None => format!("_t{}", id.0),
    }
}

fn jsx_tag_loc(tag: &JsxTag) -> Option<DiagSourceLocation> {
    match tag {
        JsxTag::Place(p) => p.loc,
        JsxTag::Builtin(_) => None,
    }
}

/// Conditionally wrap a call expression in a hook guard IIFE if enableEmitHookGuards
/// is enabled and the callee is a hook.
fn maybe_wrap_hook_call(
    cx: &Context<'_>,
    call_expr: Expression,
    callee_id: IdentifierId,
) -> Expression {
    if let Some(ref guard_name) = cx.env.hook_guard_name {
        if cx.env.output_mode == react_compiler_hir::environment::OutputMode::Client
            && is_hook_identifier(cx, callee_id)
        {
            return wrap_hook_call_with_guard(guard_name, call_expr, 2, 3);
        }
    }
    call_expr
}

/// Check if a callee identifier refers to a hook function.
fn is_hook_identifier(cx: &Context<'_>, identifier_id: IdentifierId) -> bool {
    let identifier = &cx.env.identifiers[identifier_id.0 as usize];
    let type_ = &cx.env.types[identifier.type_.0 as usize];
    cx.env
        .get_hook_kind_for_type(type_)
        .ok()
        .flatten()
        .is_some()
}

/// Create the hook guard IIFE wrapper for a hook call expression.
/// Wraps the call in: `(function() { try { $guard(before); return callExpr; } finally { $guard(after); } })()`
fn wrap_hook_call_with_guard(
    guard_name: &str,
    call_expr: Expression,
    before: u32,
    after: u32,
) -> Expression {
    let guard_call = |kind: u32| -> Statement {
        Statement::ExpressionStatement(ExpressionStatement {
            base: BaseNode::typed("ExpressionStatement"),
            expression: Box::new(Expression::CallExpression(ast_expr::CallExpression {
                base: BaseNode::typed("CallExpression"),
                callee: Box::new(Expression::Identifier(make_identifier(guard_name))),
                arguments: vec![Expression::NumericLiteral(NumericLiteral {
                    base: BaseNode::typed("NumericLiteral"),
                    value: kind as f64,
                    extra: None,
                })],
                type_parameters: None,
                type_arguments: None,
                optional: None,
            })),
        })
    };

    let try_stmt = Statement::TryStatement(TryStatement {
        base: BaseNode::typed("TryStatement"),
        block: BlockStatement {
            base: BaseNode::typed("BlockStatement"),
            body: vec![
                guard_call(before),
                Statement::ReturnStatement(ReturnStatement {
                    base: BaseNode::typed("ReturnStatement"),
                    argument: Some(Box::new(call_expr)),
                }),
            ],
            directives: Vec::new(),
        },
        handler: None,
        finalizer: Some(BlockStatement {
            base: BaseNode::typed("BlockStatement"),
            body: vec![guard_call(after)],
            directives: Vec::new(),
        }),
    });

    let iife = Expression::FunctionExpression(ast_expr::FunctionExpression {
        base: BaseNode::typed("FunctionExpression"),
        id: None,
        params: Vec::new(),
        body: BlockStatement {
            base: BaseNode::typed("BlockStatement"),
            body: vec![try_stmt],
            directives: Vec::new(),
        },
        generator: false,
        is_async: false,
        return_type: None,
        type_parameters: None,
        predicate: None,
    });

    Expression::CallExpression(ast_expr::CallExpression {
        base: BaseNode::typed("CallExpression"),
        callee: Box::new(iife),
        arguments: vec![],
        type_parameters: None,
        type_arguments: None,
        optional: None,
    })
}

/// Create a try/finally wrapping for the entire function body.
/// `try { $guard(before); ...body...; } finally { $guard(after); }`
fn create_function_body_hook_guard(
    guard_name: &str,
    body_stmts: Vec<Statement>,
    before: u32,
    after: u32,
) -> Statement {
    let guard_call = |kind: u32| -> Statement {
        Statement::ExpressionStatement(ExpressionStatement {
            base: BaseNode::typed("ExpressionStatement"),
            expression: Box::new(Expression::CallExpression(ast_expr::CallExpression {
                base: BaseNode::typed("CallExpression"),
                callee: Box::new(Expression::Identifier(make_identifier(guard_name))),
                arguments: vec![Expression::NumericLiteral(NumericLiteral {
                    base: BaseNode::typed("NumericLiteral"),
                    value: kind as f64,
                    extra: None,
                })],
                type_parameters: None,
                type_arguments: None,
                optional: None,
            })),
        })
    };

    let mut try_body = vec![guard_call(before)];
    try_body.extend(body_stmts);

    Statement::TryStatement(TryStatement {
        base: BaseNode::typed("TryStatement"),
        block: BlockStatement {
            base: BaseNode::typed("BlockStatement"),
            body: try_body,
            directives: Vec::new(),
        },
        handler: None,
        finalizer: Some(BlockStatement {
            base: BaseNode::typed("BlockStatement"),
            body: vec![guard_call(after)],
            directives: Vec::new(),
        }),
    })
}

fn apply_renames_to_json(
    value: &mut serde_json::Value,
    renames: &[react_compiler_hir::environment::BindingRename],
    reference_node_ids: &rustc_hash::FxHashSet<u32>,
) {
    apply_renames_to_json_inner(value, renames, reference_node_ids, false);
}

fn apply_renames_to_json_inner(
    value: &mut serde_json::Value,
    renames: &[react_compiler_hir::environment::BindingRename],
    reference_node_ids: &rustc_hash::FxHashSet<u32>,
    is_property_key: bool,
) {
    if renames.is_empty() {
        return;
    }
    match value {
        serde_json::Value::Object(map) => {
            let node_type = map
                .get("type")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();
            // Rename Identifier nodes that are NOT object property keys.
            // Property keys in object type annotations (e.g., `id: string`)
            // use the original property name, not a variable binding name.
            if (node_type == "Identifier" || node_type == "GenericTypeAnnotation")
                && !is_property_key
            {
                let ident_node_id = map.get("_nodeId").and_then(|v| v.as_u64()).unwrap_or(0) as u32;
                let ident_start = map.get("start").and_then(|v| v.as_u64()).unwrap_or(0) as u32;
                // Only rename identifiers that are actual references to bindings
                // (identified by node_id). Type-level labels (e.g., ObjectTypeIndexer
                // params) are NOT in the reference set and keep their original names.
                let is_reference = ident_node_id > 0 && reference_node_ids.contains(&ident_node_id);
                let maybe_rename = if is_reference {
                    map.get("name").and_then(|v| v.as_str()).and_then(|name| {
                        renames
                            .iter()
                            .filter(|r| r.original == name && r.declaration_start <= ident_start)
                            .max_by_key(|r| r.declaration_start)
                            .map(|r| r.renamed.clone())
                    })
                } else if ident_node_id == 0 {
                    map.get("name").and_then(|v| v.as_str()).and_then(|name| {
                        renames
                            .iter()
                            .find(|r| r.original == name)
                            .map(|r| r.renamed.clone())
                    })
                } else {
                    None
                };
                if let Some(renamed) = maybe_rename {
                    map.insert("name".to_string(), serde_json::Value::String(renamed));
                }
                if let Some(id) = map.get_mut("id") {
                    apply_renames_to_json_inner(id, renames, reference_node_ids, false);
                }
            }
            let is_obj_type_prop =
                node_type == "ObjectTypeProperty" || node_type == "ObjectTypeIndexer";
            for (key, val) in map.iter_mut() {
                let child_is_key = is_obj_type_prop && key == "key";
                apply_renames_to_json_inner(val, renames, reference_node_ids, child_is_key);
            }
        }
        serde_json::Value::Array(arr) => {
            for item in arr {
                apply_renames_to_json_inner(item, renames, reference_node_ids, false);
            }
        }
        _ => {}
    }
}

#[cfg(test)]
mod tests {
    use react_compiler_ast::statements::Statement;
    use serde_json::json;

    use super::{UnsupportedOriginalNode, codegen_unsupported_original_node};

    /// The Fast Refresh source hash must match Node's
    /// `createHmac('sha256', code).digest('hex')` byte-for-byte, or hot-reload
    /// cache invalidation would diverge from the TS compiler. Reference values
    /// were computed with Node's `crypto` module.
    #[test]
    fn source_file_hash_matches_node_create_hmac() {
        use super::source_file_hash;
        assert_eq!(
            source_file_hash("hello world"),
            "0de8bee5d7f9c5d209f8c6fabed0ea84cb3fca1244e8ed38079a61b599a84c47"
        );
        assert_eq!(
            source_file_hash(""),
            "b613679a0814d9ec772f95d778c35fc5ff1697c493715653c6c712144292c5ad"
        );
        assert_eq!(
            source_file_hash("function App(){}"),
            "d637acb4985c789d6622c70197db2b62dda282f16f3276aa810b598d6e6cab7b"
        );
    }

    /// A modeled statement tag parses typed and is emitted directly.
    #[test]
    fn unsupported_original_node_modeled_statement_tag_emits_statement() {
        let node = json!({ "type": "DebuggerStatement", "start": 0, "end": 9 });
        match codegen_unsupported_original_node(&node).unwrap() {
            UnsupportedOriginalNode::Statement(Statement::DebuggerStatement(_)) => {}
            UnsupportedOriginalNode::Statement(other) => {
                panic!("expected typed DebuggerStatement, got {other:?}")
            }
            UnsupportedOriginalNode::ExpressionCodegen => {
                panic!("statement tag must not flow to expression codegen")
            }
        }
    }

    /// A modeled statement tag with a malformed body is a serialize/
    /// deserialize asymmetry: error loudly, never degrade to `Unknown`.
    #[test]
    fn unsupported_original_node_malformed_statement_tag_errors() {
        let node = json!({ "type": "IfStatement", "consequent": { "type": "EmptyStatement" } });
        assert!(codegen_unsupported_original_node(&node).is_err());
    }

    /// An expression tag flows to expression codegen, which binds the
    /// instruction's lvalue temporary. With the tolerant `Statement`
    /// deserializer, a plain try-parse-as-`Statement` would wrongly claim
    /// this node as `Statement::Unknown`.
    #[test]
    fn unsupported_original_node_expression_tag_flows_to_expression_codegen() {
        let node = json!({
            "type": "CallExpression",
            "callee": { "type": "Identifier", "name": "foo" },
            "arguments": []
        });
        assert!(matches!(
            codegen_unsupported_original_node(&node).unwrap(),
            UnsupportedOriginalNode::ExpressionCodegen
        ));
    }

    /// A pattern tag (destructuring bailout target) also flows to expression
    /// codegen, preserving its placeholder fallback there.
    #[test]
    fn unsupported_original_node_pattern_tag_flows_to_expression_codegen() {
        let node = json!({ "type": "ObjectPattern", "properties": [] });
        assert!(matches!(
            codegen_unsupported_original_node(&node).unwrap(),
            UnsupportedOriginalNode::ExpressionCodegen
        ));
    }

    /// A genuinely unmodeled tag is producible only by the unknown-statement
    /// lowering bailout, so it is preserved verbatim at statement position.
    #[test]
    fn unsupported_original_node_unknown_tag_becomes_unknown_statement() {
        let node = json!({
            "type": "TSImportEqualsDeclaration",
            "start": 0,
            "end": 39,
            "id": { "type": "Identifier", "name": "lib" }
        });
        match codegen_unsupported_original_node(&node).unwrap() {
            UnsupportedOriginalNode::Statement(Statement::Unknown(unknown)) => {
                assert_eq!(unknown.node_type(), "TSImportEqualsDeclaration");
                assert_eq!(unknown.raw().parse_value(), node);
            }
            UnsupportedOriginalNode::Statement(other) => {
                panic!("expected Statement::Unknown, got {other:?}")
            }
            UnsupportedOriginalNode::ExpressionCodegen => {
                panic!("unmodeled tag must not flow to expression codegen")
            }
        }
    }
}
