// Copyright (c) Meta Platforms, Inc. and affiliates.
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

//! Propagates scope dependencies through the HIR, computing which values each
//! reactive scope depends on.
//!
//! Ported from TypeScript:
//! - `src/HIR/PropagateScopeDependenciesHIR.ts`
//! - `src/HIR/CollectOptionalChainDependencies.ts`
//! - `src/HIR/CollectHoistablePropertyLoads.ts`
//! - `src/HIR/DeriveMinimalDependenciesHIR.ts`

use indexmap::IndexMap;
use std::collections::{BTreeSet, HashMap, HashSet};

use react_compiler_hir::environment::Environment;
use react_compiler_hir::visitors::{ScopeBlockInfo, ScopeBlockTraversal};
use react_compiler_hir::{
    BasicBlock, BlockId, DeclarationId, DependencyPathEntry, EvaluationOrder, FunctionId,
    GotoVariant, HirFunction, IdentifierId, Instruction, InstructionId, InstructionKind,
    InstructionValue, MutableRange, ParamPattern, Place, PlaceOrSpread, PropertyLiteral,
    ReactFunctionType, ReactiveScopeDependency, ScopeId, Terminal, Type, visitors,
};

// =============================================================================
// Public entry point
// =============================================================================

/// Main entry point: propagate scope dependencies through the HIR.
/// Corresponds to TS `propagateScopeDependenciesHIR(fn)`.
pub fn propagate_scope_dependencies_hir(func: &mut HirFunction, env: &mut Environment) {
    let used_outside_declaring_scope = find_temporaries_used_outside_declaring_scope(func, env);
    let temporaries = collect_temporaries_sidemap(func, env, &used_outside_declaring_scope);

    let OptionalChainSidemap {
        temporaries_read_in_optional,
        processed_instrs_in_optional,
        hoistable_objects,
    } = collect_optional_chain_sidemap(func, env);

    let hoistable_property_loads = {
        let (working, registry) =
            collect_hoistable_and_propagate(func, env, &temporaries, &hoistable_objects);
        // Convert to scope-keyed map with full dependency paths
        let mut keyed: HashMap<ScopeId, Vec<ReactiveScopeDependency>> = HashMap::new();
        for (_block_id, block) in &func.body.blocks {
            if let Terminal::Scope {
                scope,
                block: inner_block,
                ..
            } = &block.terminal
            {
                if let Some(node_indices) = working.get(inner_block) {
                    let deps: Vec<ReactiveScopeDependency> = node_indices
                        .iter()
                        .map(|&idx| registry.nodes[idx].full_path.clone())
                        .collect();
                    keyed.insert(*scope, deps);
                }
            }
        }
        keyed
    };

    // Merge temporaries + temporariesReadInOptional
    let mut merged_temporaries = temporaries;
    for (k, v) in temporaries_read_in_optional {
        merged_temporaries.insert(k, v);
    }

    let scope_deps = collect_dependencies(
        func,
        env,
        &used_outside_declaring_scope,
        &merged_temporaries,
        &processed_instrs_in_optional,
    );

    // Derive the minimal set of hoistable dependencies for each scope.
    for (scope_id, deps) in &scope_deps {
        if deps.is_empty() {
            continue;
        }

        let hoistables = hoistable_property_loads.get(scope_id);
        let hoistables =
            hoistables.expect("[PropagateScopeDependencies] Scope not found in tracked blocks");

        // Step 2: Calculate hoistable dependencies using the tree.
        let mut tree = ReactiveScopeDependencyTreeHIR::new(hoistables.iter(), env);
        for dep in deps {
            tree.add_dependency(dep.clone(), env);
        }

        // Step 3: Reduce dependencies to a minimal set.
        let candidates = tree.derive_minimal_dependencies(env);
        let scope = &mut env.scopes[scope_id.0 as usize];
        for candidate_dep in candidates {
            let already_exists = scope.dependencies.iter().any(|existing_dep| {
                let existing_decl_id =
                    env.identifiers[existing_dep.identifier.0 as usize].declaration_id;
                let candidate_decl_id =
                    env.identifiers[candidate_dep.identifier.0 as usize].declaration_id;
                existing_decl_id == candidate_decl_id
                    && are_equal_paths(&existing_dep.path, &candidate_dep.path)
            });
            if !already_exists {
                scope.dependencies.push(candidate_dep);
            }
        }
    }
}

fn are_equal_paths(a: &[DependencyPathEntry], b: &[DependencyPathEntry]) -> bool {
    a.len() == b.len()
        && a.iter()
            .zip(b.iter())
            .all(|(ai, bi)| ai.property == bi.property && ai.optional == bi.optional)
}

// =============================================================================
// findTemporariesUsedOutsideDeclaringScope
// =============================================================================

/// Corresponds to TS `findTemporariesUsedOutsideDeclaringScope`.
fn find_temporaries_used_outside_declaring_scope(
    func: &HirFunction,
    env: &Environment,
) -> HashSet<DeclarationId> {
    let mut declarations: HashMap<DeclarationId, ScopeId> = HashMap::new();
    let mut pruned_scopes: HashSet<ScopeId> = HashSet::new();
    let mut traversal = ScopeBlockTraversal::new();
    let mut used_outside_declaring_scope: HashSet<DeclarationId> = HashSet::new();

    let handle_place = |place_id: IdentifierId,
                        declarations: &HashMap<DeclarationId, ScopeId>,
                        traversal: &ScopeBlockTraversal,
                        pruned_scopes: &HashSet<ScopeId>,
                        used_outside: &mut HashSet<DeclarationId>,
                        env: &Environment| {
        let decl_id = env.identifiers[place_id.0 as usize].declaration_id;
        if let Some(&declaring_scope) = declarations.get(&decl_id) {
            if !traversal.is_scope_active(declaring_scope)
                && !pruned_scopes.contains(&declaring_scope)
            {
                used_outside.insert(decl_id);
            }
        }
    };

    for (block_id, block) in &func.body.blocks {
        // recordScopes
        traversal.record_scopes(block);

        let scope_start_info = traversal.block_infos.get(block_id);
        if let Some(ScopeBlockInfo::Begin {
            scope,
            pruned: true,
            ..
        }) = scope_start_info
        {
            pruned_scopes.insert(*scope);
        }

        for &instr_id in &block.instructions {
            let instr = &func.instructions[instr_id.0 as usize];
            // Handle operands
            for op_id in visitors::each_instruction_operand(instr, env)
                .into_iter()
                .map(|p| p.identifier)
                .collect::<Vec<_>>()
            {
                handle_place(
                    op_id,
                    &declarations,
                    &traversal,
                    &pruned_scopes,
                    &mut used_outside_declaring_scope,
                    env,
                );
            }
            // Handle instruction (track declarations)
            let current_scope = traversal.current_scope();
            if let Some(scope) = current_scope {
                if !pruned_scopes.contains(&scope) {
                    match &instr.value {
                        InstructionValue::LoadLocal { .. }
                        | InstructionValue::LoadContext { .. }
                        | InstructionValue::PropertyLoad { .. } => {
                            let decl_id =
                                env.identifiers[instr.lvalue.identifier.0 as usize].declaration_id;
                            declarations.insert(decl_id, scope);
                        }
                        _ => {}
                    }
                }
            }
        }

        // Terminal operands
        for op_id in visitors::each_terminal_operand(&block.terminal)
            .into_iter()
            .map(|p| p.identifier)
            .collect::<Vec<_>>()
        {
            handle_place(
                op_id,
                &declarations,
                &traversal,
                &pruned_scopes,
                &mut used_outside_declaring_scope,
                env,
            );
        }
    }

    used_outside_declaring_scope
}

// =============================================================================
// collectTemporariesSidemap
// =============================================================================

/// Corresponds to TS `collectTemporariesSidemap`.
fn collect_temporaries_sidemap(
    func: &HirFunction,
    env: &Environment,
    used_outside_declaring_scope: &HashSet<DeclarationId>,
) -> HashMap<IdentifierId, ReactiveScopeDependency> {
    let mut temporaries = HashMap::new();
    collect_temporaries_sidemap_impl(
        func,
        env,
        used_outside_declaring_scope,
        &mut temporaries,
        None,
    );
    temporaries
}

/// Corresponds to TS `isLoadContextMutable`.
fn is_load_context_mutable(
    value: &InstructionValue,
    id: EvaluationOrder,
    env: &Environment,
) -> bool {
    if let InstructionValue::LoadContext { place, .. } = value {
        if let Some(scope_id) = env.identifiers[place.identifier.0 as usize].scope {
            let scope_range = &env.scopes[scope_id.0 as usize].range;
            return id >= scope_range.end;
        }
    }
    false
}

/// Corresponds to TS `convertHoistedLValueKind` — returns None for non-hoisted kinds.
fn convert_hoisted_lvalue_kind(kind: InstructionKind) -> Option<InstructionKind> {
    match kind {
        InstructionKind::HoistedLet => Some(InstructionKind::Let),
        InstructionKind::HoistedConst => Some(InstructionKind::Const),
        InstructionKind::HoistedFunction => Some(InstructionKind::Function),
        _ => None,
    }
}

/// Recursive implementation. Corresponds to TS `collectTemporariesSidemapImpl`.
fn collect_temporaries_sidemap_impl(
    func: &HirFunction,
    env: &Environment,
    used_outside_declaring_scope: &HashSet<DeclarationId>,
    temporaries: &mut HashMap<IdentifierId, ReactiveScopeDependency>,
    inner_fn_context: Option<EvaluationOrder>,
) {
    for (_block_id, block) in &func.body.blocks {
        for &instr_id in &block.instructions {
            let instr = &func.instructions[instr_id.0 as usize];
            let instr_eval_order = if let Some(outer_id) = inner_fn_context {
                outer_id
            } else {
                instr.id
            };
            let lvalue_decl_id = env.identifiers[instr.lvalue.identifier.0 as usize].declaration_id;
            let used_outside = used_outside_declaring_scope.contains(&lvalue_decl_id);

            match &instr.value {
                InstructionValue::PropertyLoad {
                    object,
                    property,
                    loc,
                    ..
                } if !used_outside => {
                    if inner_fn_context.is_none() || temporaries.contains_key(&object.identifier) {
                        let prop = get_property(object, property, false, *loc, temporaries, env);
                        temporaries.insert(instr.lvalue.identifier, prop);
                    }
                }
                InstructionValue::LoadLocal { place, loc, .. }
                    if env.identifiers[instr.lvalue.identifier.0 as usize]
                        .name
                        .is_none()
                        && env.identifiers[place.identifier.0 as usize].name.is_some()
                        && !used_outside =>
                {
                    if inner_fn_context.is_none()
                        || func
                            .context
                            .iter()
                            .any(|ctx| ctx.identifier == place.identifier)
                    {
                        temporaries.insert(
                            instr.lvalue.identifier,
                            ReactiveScopeDependency {
                                identifier: place.identifier,
                                reactive: place.reactive,
                                path: vec![],
                                loc: *loc,
                            },
                        );
                    }
                }
                value @ InstructionValue::LoadContext { place, loc, .. }
                    if is_load_context_mutable(value, instr_eval_order, env)
                        && env.identifiers[instr.lvalue.identifier.0 as usize]
                            .name
                            .is_none()
                        && env.identifiers[place.identifier.0 as usize].name.is_some()
                        && !used_outside =>
                {
                    if inner_fn_context.is_none()
                        || func
                            .context
                            .iter()
                            .any(|ctx| ctx.identifier == place.identifier)
                    {
                        temporaries.insert(
                            instr.lvalue.identifier,
                            ReactiveScopeDependency {
                                identifier: place.identifier,
                                reactive: place.reactive,
                                path: vec![],
                                loc: *loc,
                            },
                        );
                    }
                }
                InstructionValue::FunctionExpression { lowered_func, .. }
                | InstructionValue::ObjectMethod { lowered_func, .. } => {
                    let inner_func = &env.functions[lowered_func.func.0 as usize];
                    let ctx = inner_fn_context.unwrap_or(instr.id);
                    collect_temporaries_sidemap_impl(
                        inner_func,
                        env,
                        used_outside_declaring_scope,
                        temporaries,
                        Some(ctx),
                    );
                }
                _ => {}
            }
        }
    }
}

/// Corresponds to TS `getProperty`.
fn get_property(
    object: &Place,
    property_name: &PropertyLiteral,
    optional: bool,
    loc: Option<react_compiler_hir::SourceLocation>,
    temporaries: &HashMap<IdentifierId, ReactiveScopeDependency>,
    _env: &Environment,
) -> ReactiveScopeDependency {
    let resolved = temporaries.get(&object.identifier);
    if let Some(resolved) = resolved {
        let mut path = resolved.path.clone();
        path.push(DependencyPathEntry {
            property: property_name.clone(),
            optional,
            loc,
        });
        ReactiveScopeDependency {
            identifier: resolved.identifier,
            reactive: resolved.reactive,
            path,
            loc,
        }
    } else {
        ReactiveScopeDependency {
            identifier: object.identifier,
            reactive: object.reactive,
            path: vec![DependencyPathEntry {
                property: property_name.clone(),
                optional,
                loc,
            }],
            loc,
        }
    }
}

// =============================================================================
// CollectOptionalChainDependencies
// =============================================================================

struct OptionalChainSidemap {
    temporaries_read_in_optional: HashMap<IdentifierId, ReactiveScopeDependency>,
    processed_instrs_in_optional: HashSet<ProcessedInstr>,
    hoistable_objects: HashMap<BlockId, ReactiveScopeDependency>,
}

/// We track processed instructions/terminals by their lvalue IdentifierId + block id.
/// In TS this uses reference identity (Set<Instruction | Terminal>).
/// We use IdentifierId for instructions (globally unique across functions) and
/// BlockId for terminals. Note: EvaluationOrder (instruction id) is NOT unique
/// across functions, so we cannot use it here.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
enum ProcessedInstr {
    Instruction(IdentifierId),
    Terminal(BlockId),
}

fn collect_optional_chain_sidemap(func: &HirFunction, env: &Environment) -> OptionalChainSidemap {
    let mut ctx = OptionalTraversalContext {
        seen_optionals: HashSet::new(),
        processed_instrs_in_optional: HashSet::new(),
        temporaries_read_in_optional: HashMap::new(),
        hoistable_objects: HashMap::new(),
    };

    traverse_function_optional(func, env, &mut ctx);

    OptionalChainSidemap {
        temporaries_read_in_optional: ctx.temporaries_read_in_optional,
        processed_instrs_in_optional: ctx.processed_instrs_in_optional,
        hoistable_objects: ctx.hoistable_objects,
    }
}

struct OptionalTraversalContext {
    seen_optionals: HashSet<BlockId>,
    processed_instrs_in_optional: HashSet<ProcessedInstr>,
    temporaries_read_in_optional: HashMap<IdentifierId, ReactiveScopeDependency>,
    hoistable_objects: HashMap<BlockId, ReactiveScopeDependency>,
}

fn traverse_function_optional(
    func: &HirFunction,
    env: &Environment,
    ctx: &mut OptionalTraversalContext,
) {
    for (_block_id, block) in &func.body.blocks {
        for &instr_id in &block.instructions {
            let instr = &func.instructions[instr_id.0 as usize];
            match &instr.value {
                InstructionValue::FunctionExpression { lowered_func, .. }
                | InstructionValue::ObjectMethod { lowered_func, .. } => {
                    let inner_func = &env.functions[lowered_func.func.0 as usize];
                    traverse_function_optional(inner_func, env, ctx);
                }
                _ => {}
            }
        }
        if let Terminal::Optional { .. } = &block.terminal {
            if !ctx.seen_optionals.contains(&block.id) {
                traverse_optional_block(block, func, env, ctx, None);
            }
        }
    }
}

struct MatchConsequentResult {
    consequent_id: IdentifierId,
    property: PropertyLiteral,
    property_id: IdentifierId,
    store_local_lvalue_id: IdentifierId,
    consequent_goto: BlockId,
    property_load_loc: Option<react_compiler_hir::SourceLocation>,
}

fn match_optional_test_block(
    test: &Terminal,
    func: &HirFunction,
    _env: &Environment,
) -> Option<MatchConsequentResult> {
    let (test_place, consequent_block_id, alternate_block_id) = match test {
        Terminal::Branch {
            test,
            consequent,
            alternate,
            ..
        } => (test, *consequent, *alternate),
        _ => return None,
    };

    let consequent_block = func.body.blocks.get(&consequent_block_id)?;
    if consequent_block.instructions.len() != 2 {
        return None;
    }

    let instr0 = &func.instructions[consequent_block.instructions[0].0 as usize];
    let instr1 = &func.instructions[consequent_block.instructions[1].0 as usize];

    let (property_load_object, property, property_load_loc) = match &instr0.value {
        InstructionValue::PropertyLoad {
            object,
            property,
            loc,
        } => (object, property, loc),
        _ => return None,
    };

    let store_local_value = match &instr1.value {
        InstructionValue::StoreLocal { value, lvalue, .. } => {
            // Verify the store local's value matches the property load's lvalue
            if value.identifier != instr0.lvalue.identifier {
                return None;
            }
            &lvalue.place
        }
        _ => return None,
    };

    // Verify property load's object matches the test
    if property_load_object.identifier != test_place.identifier {
        return None;
    }

    // Check consequent block terminal is goto break
    match &consequent_block.terminal {
        Terminal::Goto {
            variant: GotoVariant::Break,
            block: goto_block,
            ..
        } => {
            // Verify alternate block structure
            let alternate_block = func.body.blocks.get(&alternate_block_id)?;
            if alternate_block.instructions.len() != 2 {
                return None;
            }
            let alt_instr0 = &func.instructions[alternate_block.instructions[0].0 as usize];
            let alt_instr1 = &func.instructions[alternate_block.instructions[1].0 as usize];
            match (&alt_instr0.value, &alt_instr1.value) {
                (InstructionValue::Primitive { .. }, InstructionValue::StoreLocal { .. }) => {}
                _ => return None,
            }

            Some(MatchConsequentResult {
                consequent_id: store_local_value.identifier,
                property: property.clone(),
                property_id: instr0.lvalue.identifier,
                store_local_lvalue_id: instr1.lvalue.identifier,
                consequent_goto: *goto_block,
                property_load_loc: *property_load_loc,
            })
        }
        _ => None,
    }
}

fn traverse_optional_block(
    optional_block: &BasicBlock,
    func: &HirFunction,
    env: &Environment,
    ctx: &mut OptionalTraversalContext,
    outer_alternate: Option<BlockId>,
) -> Option<IdentifierId> {
    ctx.seen_optionals.insert(optional_block.id);

    let (test_block_id, is_optional, fallthrough_block_id) = match &optional_block.terminal {
        Terminal::Optional {
            test,
            optional,
            fallthrough,
            ..
        } => (*test, *optional, *fallthrough),
        _ => return None,
    };

    let maybe_test_block = func.body.blocks.get(&test_block_id)?;

    let (test_terminal, base_object) = match &maybe_test_block.terminal {
        Terminal::Branch { .. } => {
            // Base case: optional must be true
            if !is_optional {
                return None;
            }
            // Match base expression that is straightforward PropertyLoad chain
            if maybe_test_block.instructions.is_empty() {
                return None;
            }
            let first_instr = &func.instructions[maybe_test_block.instructions[0].0 as usize];
            if !matches!(&first_instr.value, InstructionValue::LoadLocal { .. }) {
                return None;
            }

            let mut path: Vec<DependencyPathEntry> = Vec::new();
            for i in 1..maybe_test_block.instructions.len() {
                let curr_instr = &func.instructions[maybe_test_block.instructions[i].0 as usize];
                let prev_instr =
                    &func.instructions[maybe_test_block.instructions[i - 1].0 as usize];
                match &curr_instr.value {
                    InstructionValue::PropertyLoad {
                        object,
                        property,
                        loc,
                        ..
                    } if object.identifier == prev_instr.lvalue.identifier => {
                        path.push(DependencyPathEntry {
                            property: property.clone(),
                            optional: false,
                            loc: *loc,
                        });
                    }
                    _ => return None,
                }
            }

            // Verify test expression matches last instruction's lvalue
            let last_instr_id = *maybe_test_block.instructions.last().unwrap();
            let last_instr = &func.instructions[last_instr_id.0 as usize];
            let test_ident = match &maybe_test_block.terminal {
                Terminal::Branch { test, .. } => test.identifier,
                _ => return None,
            };
            if test_ident != last_instr.lvalue.identifier {
                return None;
            }

            let first_place = match &first_instr.value {
                InstructionValue::LoadLocal { place, .. } => place,
                _ => return None,
            };

            let base = ReactiveScopeDependency {
                identifier: first_place.identifier,
                reactive: first_place.reactive,
                path,
                loc: first_place.loc,
            };
            (&maybe_test_block.terminal, base)
        }
        Terminal::Optional {
            fallthrough: inner_fallthrough,
            optional: _inner_optional,
            ..
        } => {
            let test_block = func.body.blocks.get(inner_fallthrough)?;
            if !matches!(&test_block.terminal, Terminal::Branch { .. }) {
                return None;
            }

            // Recurse into inner optional
            let inner_alternate = match &test_block.terminal {
                Terminal::Branch { alternate, .. } => Some(*alternate),
                _ => None,
            };
            let inner_optional_result =
                traverse_optional_block(maybe_test_block, func, env, ctx, inner_alternate);
            let inner_optional_id = inner_optional_result?;

            // Check that inner optional is part of the same chain
            let test_ident = match &test_block.terminal {
                Terminal::Branch { test, .. } => test.identifier,
                _ => return None,
            };
            if test_ident != inner_optional_id {
                return None;
            }

            if !is_optional {
                // Non-optional load: record that PropertyLoads from inner optional are hoistable
                if let Some(inner_dep) = ctx.temporaries_read_in_optional.get(&inner_optional_id) {
                    ctx.hoistable_objects
                        .insert(optional_block.id, inner_dep.clone());
                }
            }

            let base = ctx
                .temporaries_read_in_optional
                .get(&inner_optional_id)?
                .clone();
            (&test_block.terminal, base)
        }
        _ => return None,
    };

    // Verify alternate matches outer_alternate if present
    if let Some(outer_alt) = outer_alternate {
        let test_alternate = match test_terminal {
            Terminal::Branch { alternate, .. } => *alternate,
            _ => return None,
        };
        if test_alternate == outer_alt {
            // Verify optional block has no instructions
            if !optional_block.instructions.is_empty() {
                return None;
            }
        }
    }

    let match_result = match_optional_test_block(test_terminal, func, env)?;

    // Verify consequent goto matches optional fallthrough
    if match_result.consequent_goto != fallthrough_block_id {
        return None;
    }

    let load = ReactiveScopeDependency {
        identifier: base_object.identifier,
        reactive: base_object.reactive,
        path: {
            let mut p = base_object.path.clone();
            p.push(DependencyPathEntry {
                property: match_result.property.clone(),
                optional: is_optional,
                loc: match_result.property_load_loc,
            });
            p
        },
        loc: match_result.property_load_loc,
    };

    ctx.processed_instrs_in_optional
        .insert(ProcessedInstr::Instruction(
            match_result.store_local_lvalue_id,
        ));
    ctx.processed_instrs_in_optional
        .insert(ProcessedInstr::Terminal(match &test_terminal {
            Terminal::Branch { .. } => {
                // Find the block ID for this terminal
                // The terminal belongs to either maybe_test_block or the fallthrough block of inner optional
                // We need to identify which block this terminal belongs to.
                // For the base case, it's test_block_id.
                // For nested optional, it's the fallthrough block.
                // We'll use the block_id approach based on what we know.
                // Actually, we tracked the terminal by its block, so we need to find which block
                // contains this terminal. Let's use a pragmatic approach:
                // The test terminal we matched was from maybe_test_block or from the inner fallthrough block.
                // We'll search for it.

                // For the base case (Branch terminal at maybe_test_block), block_id = test_block_id
                // For the nested case, the test terminal is at the fallthrough block of inner optional
                // In either case, we stored the terminal as test_terminal which comes from a known block.
                // We need to find the block that owns this terminal.

                // Let's take a simpler approach: find the block whose terminal matches
                // This is the block we got test_terminal from.
                // In the first branch of the match, test_terminal = &maybe_test_block.terminal
                //   and maybe_test_block.id = test_block_id
                // In the second branch, test_terminal = &test_block.terminal
                //   and test_block = func.body.blocks.get(inner_fallthrough)
                // We can't easily tell which case we're in here since we're past the match.

                // Actually, since test_terminal is a reference to a terminal in a block,
                // we can just look up which block it belongs to by finding blocks whose terminal
                // pointer matches. But that's expensive. Instead, let's use the block approach
                // and find the block from the terminal's properties.

                // For simplicity, use a sentinel approach: just check all blocks.
                // This is O(n) but only happens for optional chains.
                let mut found_block = BlockId(0);
                for (bid, blk) in &func.body.blocks {
                    if std::ptr::eq(&blk.terminal, test_terminal) {
                        found_block = *bid;
                        break;
                    }
                }
                found_block
            }
            _ => BlockId(0),
        }));
    ctx.temporaries_read_in_optional
        .insert(match_result.consequent_id, load.clone());
    ctx.temporaries_read_in_optional
        .insert(match_result.property_id, load);

    Some(match_result.consequent_id)
}

// =============================================================================
// CollectHoistablePropertyLoads
// =============================================================================

#[derive(Debug, Clone)]
struct PropertyPathNode {
    properties: HashMap<PropertyLiteral, usize>, // index into registry
    optional_properties: HashMap<PropertyLiteral, usize>, // index into registry
    #[allow(dead_code)]
    parent: Option<usize>,
    full_path: ReactiveScopeDependency,
    has_optional: bool,
    #[allow(dead_code)]
    root: Option<IdentifierId>,
}

struct PropertyPathRegistry {
    nodes: Vec<PropertyPathNode>,
    roots: HashMap<IdentifierId, usize>,
}

impl PropertyPathRegistry {
    fn new() -> Self {
        Self {
            nodes: Vec::new(),
            roots: HashMap::new(),
        }
    }

    fn get_or_create_identifier(
        &mut self,
        identifier_id: IdentifierId,
        reactive: bool,
        loc: Option<react_compiler_hir::SourceLocation>,
    ) -> usize {
        if let Some(&idx) = self.roots.get(&identifier_id) {
            return idx;
        }
        let idx = self.nodes.len();
        self.nodes.push(PropertyPathNode {
            properties: HashMap::new(),
            optional_properties: HashMap::new(),
            parent: None,
            full_path: ReactiveScopeDependency {
                identifier: identifier_id,
                reactive,
                path: vec![],
                loc,
            },
            has_optional: false,
            root: Some(identifier_id),
        });
        self.roots.insert(identifier_id, idx);
        idx
    }

    fn get_or_create_property_entry(
        &mut self,
        parent_idx: usize,
        entry: &DependencyPathEntry,
    ) -> usize {
        let map_key = entry.property.clone();
        let existing = if entry.optional {
            self.nodes[parent_idx]
                .optional_properties
                .get(&map_key)
                .copied()
        } else {
            self.nodes[parent_idx].properties.get(&map_key).copied()
        };
        if let Some(idx) = existing {
            return idx;
        }
        let parent_full_path = self.nodes[parent_idx].full_path.clone();
        let parent_has_optional = self.nodes[parent_idx].has_optional;
        let idx = self.nodes.len();
        let mut new_path = parent_full_path.path.clone();
        new_path.push(entry.clone());
        self.nodes.push(PropertyPathNode {
            properties: HashMap::new(),
            optional_properties: HashMap::new(),
            parent: Some(parent_idx),
            full_path: ReactiveScopeDependency {
                identifier: parent_full_path.identifier,
                reactive: parent_full_path.reactive,
                path: new_path,
                loc: entry.loc,
            },
            has_optional: parent_has_optional || entry.optional,
            root: None,
        });
        if entry.optional {
            self.nodes[parent_idx]
                .optional_properties
                .insert(map_key, idx);
        } else {
            self.nodes[parent_idx].properties.insert(map_key, idx);
        }
        idx
    }

    fn get_or_create_property(&mut self, dep: &ReactiveScopeDependency) -> usize {
        let mut curr = self.get_or_create_identifier(dep.identifier, dep.reactive, dep.loc);
        for entry in &dep.path {
            curr = self.get_or_create_property_entry(curr, entry);
        }
        curr
    }
}

/// Reduces optional chains in a set of property path nodes.
///
/// Any two optional chains with different operations (`.` vs `?.`) but the same set
/// of property string paths de-duplicates. If unconditional reads from `<base>` are
/// hoistable (i.e., `<base>` is in the set), we replace `<base>?.PROPERTY` with
/// `<base>.PROPERTY`.
///
/// Port of `reduceMaybeOptionalChains` from CollectHoistablePropertyLoads.ts.
fn reduce_maybe_optional_chains(nodes: &mut BTreeSet<usize>, registry: &mut PropertyPathRegistry) {
    // Collect indices of nodes that have optional in their path
    let mut optional_chain_nodes: BTreeSet<usize> = nodes
        .iter()
        .copied()
        .filter(|&idx| registry.nodes[idx].has_optional)
        .collect();

    if optional_chain_nodes.is_empty() {
        return;
    }

    loop {
        let mut changed = false;

        // Collect the indices to process (snapshot to avoid borrow issues)
        let to_process: Vec<usize> = optional_chain_nodes.iter().copied().collect();

        for original_idx in to_process {
            let full_path = registry.nodes[original_idx].full_path.clone();

            let mut curr_node = registry.get_or_create_identifier(
                full_path.identifier,
                full_path.reactive,
                full_path.loc,
            );

            for entry in &full_path.path {
                // If the base is known to be non-null (in the set), replace optional with non-optional
                let next_entry = if entry.optional && nodes.contains(&curr_node) {
                    DependencyPathEntry {
                        property: entry.property.clone(),
                        optional: false,
                        loc: entry.loc,
                    }
                } else {
                    entry.clone()
                };
                curr_node = registry.get_or_create_property_entry(curr_node, &next_entry);
            }

            if curr_node != original_idx {
                changed = true;
                optional_chain_nodes.remove(&original_idx);
                optional_chain_nodes.insert(curr_node);
                nodes.remove(&original_idx);
                nodes.insert(curr_node);
            }
        }

        if !changed {
            break;
        }
    }
}

#[derive(Debug, Clone)]
struct BlockInfo {
    assumed_non_null_objects: BTreeSet<usize>, // indices into PropertyPathRegistry
}

#[allow(dead_code)]
fn collect_hoistable_property_loads(
    func: &HirFunction,
    env: &Environment,
    temporaries: &HashMap<IdentifierId, ReactiveScopeDependency>,
    hoistable_from_optionals: &HashMap<BlockId, ReactiveScopeDependency>,
) -> HashMap<BlockId, BlockInfo> {
    let mut registry = PropertyPathRegistry::new();
    let known_immutable_identifiers: HashSet<IdentifierId> = if func.fn_type
        == ReactFunctionType::Component
        || func.fn_type == ReactFunctionType::Hook
    {
        func.params
            .iter()
            .filter_map(|p| match p {
                ParamPattern::Place(place) => Some(place.identifier),
                _ => None,
            })
            .collect()
    } else {
        HashSet::new()
    };

    let assumed_invoked_fns = get_assumed_invoked_functions(func, env);
    let ctx = CollectHoistableContext {
        temporaries,
        known_immutable_identifiers: &known_immutable_identifiers,
        hoistable_from_optionals,
        nested_fn_immutable_context: None,
        assumed_invoked_fns: &assumed_invoked_fns,
    };

    collect_hoistable_property_loads_impl(func, env, &ctx, &mut registry)
}

struct CollectHoistableContext<'a> {
    temporaries: &'a HashMap<IdentifierId, ReactiveScopeDependency>,
    known_immutable_identifiers: &'a HashSet<IdentifierId>,
    hoistable_from_optionals: &'a HashMap<BlockId, ReactiveScopeDependency>,
    nested_fn_immutable_context: Option<&'a HashSet<IdentifierId>>,
    assumed_invoked_fns: &'a HashSet<FunctionId>,
}

fn is_immutable_at_instr(
    identifier_id: IdentifierId,
    instr_id: EvaluationOrder,
    env: &Environment,
    ctx: &CollectHoistableContext,
) -> bool {
    if let Some(nested_ctx) = ctx.nested_fn_immutable_context {
        return nested_ctx.contains(&identifier_id);
    }
    let ident = &env.identifiers[identifier_id.0 as usize];
    let mutable_at_instr = ident.mutable_range.end
        > EvaluationOrder(ident.mutable_range.start.0 + 1)
        && ident.scope.is_some()
        && {
            let scope = &env.scopes[ident.scope.unwrap().0 as usize];
            in_range(instr_id, &scope.range)
        };
    !mutable_at_instr || ctx.known_immutable_identifiers.contains(&identifier_id)
}

fn in_range(id: EvaluationOrder, range: &MutableRange) -> bool {
    id >= range.start && id < range.end
}

fn get_maybe_non_null_in_instruction(
    value: &InstructionValue,
    temporaries: &HashMap<IdentifierId, ReactiveScopeDependency>,
) -> Option<ReactiveScopeDependency> {
    match value {
        InstructionValue::PropertyLoad { object, .. } => Some(
            temporaries
                .get(&object.identifier)
                .cloned()
                .unwrap_or_else(|| ReactiveScopeDependency {
                    identifier: object.identifier,
                    reactive: object.reactive,
                    path: vec![],
                    loc: object.loc,
                }),
        ),
        InstructionValue::Destructure { value: val, .. } => {
            temporaries.get(&val.identifier).cloned()
        }
        InstructionValue::ComputedLoad { object, .. } => {
            temporaries.get(&object.identifier).cloned()
        }
        _ => None,
    }
}

#[allow(dead_code)]
fn collect_hoistable_property_loads_impl(
    func: &HirFunction,
    env: &Environment,
    ctx: &CollectHoistableContext,
    registry: &mut PropertyPathRegistry,
) -> HashMap<BlockId, BlockInfo> {
    let nodes = collect_non_nulls_in_blocks(func, env, ctx, registry);
    let working = propagate_non_null(func, &nodes, registry);
    // Return the propagated results, converting HashSet<usize> back to BlockInfo
    working
        .into_iter()
        .map(|(k, v)| {
            (
                k,
                BlockInfo {
                    assumed_non_null_objects: v,
                },
            )
        })
        .collect()
}

/// Corresponds to TS `getAssumedInvokedFunctions`.
/// Returns the set of LoweredFunction FunctionIds that are assumed to be invoked.
/// The `temporaries` map is shared across recursive calls (matching TS behavior where
/// the same Map is passed to recursive invocations for inner functions).
fn get_assumed_invoked_functions(func: &HirFunction, env: &Environment) -> HashSet<FunctionId> {
    let mut temporaries: HashMap<IdentifierId, (FunctionId, HashSet<FunctionId>)> = HashMap::new();
    get_assumed_invoked_functions_impl(func, env, &mut temporaries)
}

fn get_assumed_invoked_functions_impl(
    func: &HirFunction,
    env: &Environment,
    temporaries: &mut HashMap<IdentifierId, (FunctionId, HashSet<FunctionId>)>,
) -> HashSet<FunctionId> {
    let mut hoistable: HashSet<FunctionId> = HashSet::new();

    // Step 1: Collect identifier to function expression mappings
    for (_block_id, block) in &func.body.blocks {
        for &instr_id in &block.instructions {
            let instr = &func.instructions[instr_id.0 as usize];
            match &instr.value {
                InstructionValue::FunctionExpression { lowered_func, .. } => {
                    temporaries
                        .insert(instr.lvalue.identifier, (lowered_func.func, HashSet::new()));
                }
                InstructionValue::StoreLocal {
                    value: val, lvalue, ..
                } => {
                    if let Some(entry) = temporaries.get(&val.identifier).cloned() {
                        temporaries.insert(lvalue.place.identifier, entry);
                    }
                }
                InstructionValue::LoadLocal { place, .. } => {
                    if let Some(entry) = temporaries.get(&place.identifier).cloned() {
                        temporaries.insert(instr.lvalue.identifier, entry);
                    }
                }
                _ => {}
            }
        }
    }

    // Step 2: Forward pass to analyze assumed function calls
    for (_block_id, block) in &func.body.blocks {
        for &instr_id in &block.instructions {
            let instr = &func.instructions[instr_id.0 as usize];
            match &instr.value {
                InstructionValue::CallExpression { callee, args, .. } => {
                    let callee_ty =
                        &env.types[env.identifiers[callee.identifier.0 as usize].type_.0 as usize];
                    let maybe_hook = env.get_hook_kind_for_type(callee_ty).ok().flatten();
                    if let Some(entry) = temporaries.get(&callee.identifier) {
                        // Direct calls
                        hoistable.insert(entry.0);
                    } else if maybe_hook.is_some() {
                        // Assume arguments to all hooks are safe to invoke
                        for arg in args {
                            if let PlaceOrSpread::Place(p) = arg {
                                if let Some(entry) = temporaries.get(&p.identifier) {
                                    hoistable.insert(entry.0);
                                }
                            }
                        }
                    }
                }
                InstructionValue::JsxExpression {
                    props, children, ..
                } => {
                    // Assume JSX attributes and children are safe to invoke
                    for prop in props {
                        if let react_compiler_hir::JsxAttribute::Attribute { place, .. } = prop {
                            if let Some(entry) = temporaries.get(&place.identifier) {
                                hoistable.insert(entry.0);
                            }
                        }
                    }
                    if let Some(children) = children {
                        for child in children {
                            if let Some(entry) = temporaries.get(&child.identifier) {
                                hoistable.insert(entry.0);
                            }
                        }
                    }
                }
                InstructionValue::JsxFragment { children, .. } => {
                    for child in children {
                        if let Some(entry) = temporaries.get(&child.identifier) {
                            hoistable.insert(entry.0);
                        }
                    }
                }
                InstructionValue::FunctionExpression { lowered_func, .. } => {
                    // Recursively traverse into other function expressions
                    // TS passes the shared temporaries map to the recursive call
                    let inner_func = &env.functions[lowered_func.func.0 as usize];
                    let lambdas_called =
                        get_assumed_invoked_functions_impl(inner_func, env, temporaries);
                    if let Some(entry) = temporaries.get_mut(&instr.lvalue.identifier) {
                        for called in lambdas_called {
                            entry.1.insert(called);
                        }
                    }
                }
                _ => {}
            }
        }

        // Assume directly returned functions are safe to call
        if let Terminal::Return { value, .. } = &block.terminal {
            if let Some(entry) = temporaries.get(&value.identifier) {
                hoistable.insert(entry.0);
            }
        }
    }

    // Step 3: Propagate assumed-invoked status through mayInvoke chains
    let mut changed = true;
    while changed {
        changed = false;
        // Two-phase: collect then insert
        let mut to_add = Vec::new();
        for (_, (func_id, may_invoke)) in temporaries.iter() {
            if hoistable.contains(func_id) {
                for &called in may_invoke {
                    if !hoistable.contains(&called) {
                        to_add.push(called);
                    }
                }
            }
        }
        for id in to_add {
            changed = true;
            hoistable.insert(id);
        }
        if !changed {
            break;
        }
    }

    hoistable
}

fn collect_non_nulls_in_blocks(
    func: &HirFunction,
    env: &Environment,
    ctx: &CollectHoistableContext,
    registry: &mut PropertyPathRegistry,
) -> HashMap<BlockId, BlockInfo> {
    // Known non-null identifiers (e.g. component props)
    let mut known_non_null: BTreeSet<usize> = BTreeSet::new();
    if func.fn_type == ReactFunctionType::Component && !func.params.is_empty() {
        if let ParamPattern::Place(place) = &func.params[0] {
            let node_idx = registry.get_or_create_identifier(place.identifier, true, place.loc);
            known_non_null.insert(node_idx);
        }
    }

    let mut nodes: HashMap<BlockId, BlockInfo> = HashMap::new();

    for (block_id, block) in &func.body.blocks {
        let mut assumed = known_non_null.clone();

        // Check hoistable from optionals
        if let Some(optional_chain) = ctx.hoistable_from_optionals.get(block_id) {
            let node_idx = registry.get_or_create_property(optional_chain);
            assumed.insert(node_idx);
        }

        for &instr_id in &block.instructions {
            let instr = &func.instructions[instr_id.0 as usize];
            if let Some(path) = get_maybe_non_null_in_instruction(&instr.value, ctx.temporaries) {
                let path_ident = path.identifier;
                if is_immutable_at_instr(path_ident, instr.id, env, ctx) {
                    let node_idx = registry.get_or_create_property(&path);
                    assumed.insert(node_idx);
                }
            }

            // Handle StartMemoize deps for enablePreserveExistingMemoizationGuarantees
            if env.enable_preserve_existing_memoization_guarantees {
                if let InstructionValue::StartMemoize {
                    deps: Some(deps), ..
                } = &instr.value
                {
                    for dep in deps {
                        if let react_compiler_hir::ManualMemoDependencyRoot::NamedLocal {
                            value: val,
                            ..
                        } = &dep.root
                        {
                            if !is_immutable_at_instr(val.identifier, instr.id, env, ctx) {
                                continue;
                            }
                            for i in 0..dep.path.len() {
                                if dep.path[i].optional {
                                    break;
                                }
                                let sub_dep = ReactiveScopeDependency {
                                    identifier: val.identifier,
                                    reactive: val.reactive,
                                    path: dep.path[..i].to_vec(),
                                    loc: dep.loc,
                                };
                                let node_idx = registry.get_or_create_property(&sub_dep);
                                assumed.insert(node_idx);
                            }
                        }
                    }
                }
            }

            // Handle assumed-invoked inner functions
            if let InstructionValue::FunctionExpression { lowered_func, .. } = &instr.value {
                if ctx.assumed_invoked_fns.contains(&lowered_func.func) {
                    let inner_func = &env.functions[lowered_func.func.0 as usize];
                    // Build nested fn immutable context
                    let nested_fn_immutable_context: HashSet<IdentifierId> =
                        if ctx.nested_fn_immutable_context.is_some() {
                            // Already in a nested fn context, use existing
                            ctx.nested_fn_immutable_context.unwrap().clone()
                        } else {
                            inner_func
                                .context
                                .iter()
                                .filter(|place| {
                                    is_immutable_at_instr(place.identifier, instr.id, env, ctx)
                                })
                                .map(|place| place.identifier)
                                .collect()
                        };
                    let inner_assumed = get_assumed_invoked_functions(inner_func, env);
                    let inner_ctx = CollectHoistableContext {
                        temporaries: ctx.temporaries,
                        known_immutable_identifiers: &HashSet::new(),
                        hoistable_from_optionals: ctx.hoistable_from_optionals,
                        nested_fn_immutable_context: Some(&nested_fn_immutable_context),
                        assumed_invoked_fns: &inner_assumed,
                    };
                    let inner_nodes =
                        collect_non_nulls_in_blocks(inner_func, env, &inner_ctx, registry);
                    // Propagate non-null from inner function
                    let inner_working = propagate_non_null(inner_func, &inner_nodes, registry);
                    // Get hoistables from inner function's entry block (after propagation)
                    let inner_entry = inner_func.body.entry;
                    if let Some(inner_set) = inner_working.get(&inner_entry) {
                        for &node_idx in inner_set {
                            assumed.insert(node_idx);
                        }
                    }
                }
            }
        }

        nodes.insert(
            *block_id,
            BlockInfo {
                assumed_non_null_objects: assumed,
            },
        );
    }

    nodes
}

/// Recursive DFS propagation of non-null information through the CFG.
/// Uses 'active'/'done' state tracking to correctly handle cycles (backedges in loops).
///
/// Port of TS `propagateNonNull` which uses `recursivelyPropagateNonNull`.
/// Key insight: when computing the intersection of neighbor sets, only include
/// neighbors that are 'done' (not 'active'). Active neighbors are part of a cycle
/// and should be filtered out, allowing non-null info to propagate through non-cyclic paths.
fn propagate_non_null(
    func: &HirFunction,
    nodes: &HashMap<BlockId, BlockInfo>,
    registry: &mut PropertyPathRegistry,
) -> HashMap<BlockId, BTreeSet<usize>> {
    // Build successor map. Use BTreeSet to iterate successors in sorted BlockId
    // order, matching the TS Set<BlockId> insertion order (blocks are created in
    // ascending BlockId order).
    let mut block_successors: HashMap<BlockId, BTreeSet<BlockId>> = HashMap::new();
    for (block_id, block) in &func.body.blocks {
        for pred in &block.preds {
            block_successors.entry(*pred).or_default().insert(*block_id);
        }
    }

    // Clone nodes into mutable working set
    let mut working: HashMap<BlockId, BTreeSet<usize>> = nodes
        .iter()
        .map(|(k, v)| (*k, v.assumed_non_null_objects.clone()))
        .collect();

    let block_ids: Vec<BlockId> = func.body.blocks.keys().copied().collect();
    let mut reversed_block_ids = block_ids.clone();
    reversed_block_ids.reverse();

    for _ in 0..100 {
        let mut changed = false;

        // Forward pass (using predecessors)
        let mut traversal_state: HashMap<BlockId, TraversalState> = HashMap::new();
        for &block_id in &block_ids {
            let block_changed = recursively_propagate_non_null(
                block_id,
                PropagationDirection::Forward,
                &mut traversal_state,
                &mut working,
                func,
                &block_successors,
                registry,
            );
            changed |= block_changed;
        }

        // Backward pass (using successors)
        traversal_state.clear();
        for &block_id in &reversed_block_ids {
            let block_changed = recursively_propagate_non_null(
                block_id,
                PropagationDirection::Backward,
                &mut traversal_state,
                &mut working,
                func,
                &block_successors,
                registry,
            );
            changed |= block_changed;
        }

        if !changed {
            break;
        }
    }

    working
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum TraversalState {
    Active,
    Done,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum PropagationDirection {
    Forward,
    Backward,
}

fn recursively_propagate_non_null(
    node_id: BlockId,
    direction: PropagationDirection,
    traversal_state: &mut HashMap<BlockId, TraversalState>,
    working: &mut HashMap<BlockId, BTreeSet<usize>>,
    func: &HirFunction,
    block_successors: &HashMap<BlockId, BTreeSet<BlockId>>,
    registry: &mut PropertyPathRegistry,
) -> bool {
    // Avoid re-visiting computed or currently active nodes
    if traversal_state.contains_key(&node_id) {
        return false;
    }
    traversal_state.insert(node_id, TraversalState::Active);

    let neighbors: Vec<BlockId> = match direction {
        PropagationDirection::Backward => block_successors
            .get(&node_id)
            .map(|s| s.iter().copied().collect())
            .unwrap_or_default(),
        PropagationDirection::Forward => func
            .body
            .blocks
            .get(&node_id)
            .map(|b| b.preds.iter().copied().collect())
            .unwrap_or_default(),
    };

    let mut changed = false;
    for &neighbor in &neighbors {
        if !traversal_state.contains_key(&neighbor) {
            let neighbor_changed = recursively_propagate_non_null(
                neighbor,
                direction,
                traversal_state,
                working,
                func,
                block_successors,
                registry,
            );
            changed |= neighbor_changed;
        }
    }

    // Compute intersection of 'done' neighbors only (filter out 'active' = cycle nodes)
    let done_neighbor_sets: Vec<BTreeSet<usize>> = neighbors
        .iter()
        .filter(|n| traversal_state.get(n) == Some(&TraversalState::Done))
        .filter_map(|n| working.get(n).cloned())
        .collect();

    let neighbor_intersection = if done_neighbor_sets.is_empty() {
        BTreeSet::new()
    } else {
        let mut iter = done_neighbor_sets.into_iter();
        let first = iter.next().unwrap();
        iter.fold(first, |acc, s| acc.intersection(&s).copied().collect())
    };

    let prev_objects = working.get(&node_id).cloned().unwrap_or_default();
    let mut merged: BTreeSet<usize> = prev_objects
        .union(&neighbor_intersection)
        .copied()
        .collect();
    reduce_maybe_optional_chains(&mut merged, registry);

    working.insert(node_id, merged.clone());
    traversal_state.insert(node_id, TraversalState::Done);

    // Compare with previous value — can't just check size due to reduce_maybe_optional_chains
    changed |= prev_objects != merged;
    changed
}

fn collect_hoistable_and_propagate(
    func: &HirFunction,
    env: &Environment,
    temporaries: &HashMap<IdentifierId, ReactiveScopeDependency>,
    hoistable_from_optionals: &HashMap<BlockId, ReactiveScopeDependency>,
) -> (HashMap<BlockId, BTreeSet<usize>>, PropertyPathRegistry) {
    let mut registry = PropertyPathRegistry::new();
    let assumed_invoked_fns = get_assumed_invoked_functions(func, env);
    let known_immutable_identifiers: HashSet<IdentifierId> = if func.fn_type
        == ReactFunctionType::Component
        || func.fn_type == ReactFunctionType::Hook
    {
        func.params
            .iter()
            .filter_map(|p| match p {
                ParamPattern::Place(place) => Some(place.identifier),
                _ => None,
            })
            .collect()
    } else {
        HashSet::new()
    };

    let ctx = CollectHoistableContext {
        temporaries,
        known_immutable_identifiers: &known_immutable_identifiers,
        hoistable_from_optionals,
        nested_fn_immutable_context: None,
        assumed_invoked_fns: &assumed_invoked_fns,
    };

    let nodes = collect_non_nulls_in_blocks(func, env, &ctx, &mut registry);
    let working = propagate_non_null(func, &nodes, &mut registry);

    (working, registry)
}

// Restructured version used by the main entry point
#[allow(dead_code)]
fn key_by_scope_id(
    func: &HirFunction,
    block_keyed: &HashMap<BlockId, BlockInfo>,
) -> HashMap<ScopeId, BlockInfo> {
    let mut keyed: HashMap<ScopeId, BlockInfo> = HashMap::new();
    for (_block_id, block) in &func.body.blocks {
        if let Terminal::Scope {
            scope,
            block: inner_block,
            ..
        } = &block.terminal
        {
            if let Some(info) = block_keyed.get(inner_block) {
                keyed.insert(*scope, info.clone());
            }
        }
    }
    keyed
}

// =============================================================================
// DeriveMinimalDependenciesHIR
// =============================================================================

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum PropertyAccessType {
    OptionalAccess,
    UnconditionalAccess,
    OptionalDependency,
    UnconditionalDependency,
}

fn is_optional_access(access: PropertyAccessType) -> bool {
    matches!(
        access,
        PropertyAccessType::OptionalAccess | PropertyAccessType::OptionalDependency
    )
}

fn is_dependency_access(access: PropertyAccessType) -> bool {
    matches!(
        access,
        PropertyAccessType::OptionalDependency | PropertyAccessType::UnconditionalDependency
    )
}

fn merge_access(a: PropertyAccessType, b: PropertyAccessType) -> PropertyAccessType {
    let is_unconditional = !(is_optional_access(a) && is_optional_access(b));
    let is_dep = is_dependency_access(a) || is_dependency_access(b);
    match (is_unconditional, is_dep) {
        (true, true) => PropertyAccessType::UnconditionalDependency,
        (true, false) => PropertyAccessType::UnconditionalAccess,
        (false, true) => PropertyAccessType::OptionalDependency,
        (false, false) => PropertyAccessType::OptionalAccess,
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum HoistableAccessType {
    Optional,
    NonNull,
}

struct HoistableNode {
    properties: HashMap<PropertyLiteral, Box<HoistableNodeEntry>>,
    access_type: HoistableAccessType,
}

struct HoistableNodeEntry {
    node: HoistableNode,
}

struct DependencyNode {
    properties: IndexMap<PropertyLiteral, Box<DependencyNodeEntry>>,
    access_type: PropertyAccessType,
    loc: Option<react_compiler_hir::SourceLocation>,
}

struct DependencyNodeEntry {
    node: DependencyNode,
}

struct ReactiveScopeDependencyTreeHIR {
    hoistable_roots: HashMap<IdentifierId, (HoistableNode, bool)>, // node + reactive
    dep_roots: IndexMap<IdentifierId, (DependencyNode, bool)>, // node + reactive (preserves insertion order like JS Map)
}

impl ReactiveScopeDependencyTreeHIR {
    fn new<'a>(
        hoistable_objects: impl Iterator<Item = &'a ReactiveScopeDependency>,
        _env: &Environment,
    ) -> Self {
        let mut hoistable_roots: HashMap<IdentifierId, (HoistableNode, bool)> = HashMap::new();

        // Sort hoistable objects so that entries with optional first path come
        // before non-optional ones. This matches the TS behavior where
        // hoistableFromOptionals entries are inserted into the JS Set before
        // instruction-based entries, and the first insertion determines the
        // root access type.
        let mut sorted_deps: Vec<&ReactiveScopeDependency> = hoistable_objects.collect();
        sorted_deps.sort_by(|a, b| {
            let a_optional = !a.path.is_empty() && a.path[0].optional;
            let b_optional = !b.path.is_empty() && b.path[0].optional;
            b_optional.cmp(&a_optional)
        });

        for dep in sorted_deps {
            let root = hoistable_roots.entry(dep.identifier).or_insert_with(|| {
                let access_type = if !dep.path.is_empty() && dep.path[0].optional {
                    HoistableAccessType::Optional
                } else {
                    HoistableAccessType::NonNull
                };
                (
                    HoistableNode {
                        properties: HashMap::new(),
                        access_type,
                    },
                    dep.reactive,
                )
            });

            let mut curr = &mut root.0;
            for i in 0..dep.path.len() {
                let access_type = if i + 1 < dep.path.len() && dep.path[i + 1].optional {
                    HoistableAccessType::Optional
                } else {
                    HoistableAccessType::NonNull
                };
                let entry = curr
                    .properties
                    .entry(dep.path[i].property.clone())
                    .or_insert_with(|| {
                        Box::new(HoistableNodeEntry {
                            node: HoistableNode {
                                properties: HashMap::new(),
                                access_type,
                            },
                        })
                    });
                curr = &mut entry.node;
            }
        }

        Self {
            hoistable_roots,
            dep_roots: IndexMap::new(),
        }
    }

    fn add_dependency(&mut self, dep: ReactiveScopeDependency, _env: &Environment) {
        let root = self.dep_roots.entry(dep.identifier).or_insert_with(|| {
            (
                DependencyNode {
                    properties: IndexMap::new(),
                    access_type: PropertyAccessType::UnconditionalAccess,
                    loc: dep.loc,
                },
                dep.reactive,
            )
        });

        let mut dep_cursor = &mut root.0;
        let hoistable_cursor_root = self.hoistable_roots.get(&dep.identifier);
        let mut hoistable_ptr: Option<&HoistableNode> = hoistable_cursor_root.map(|(n, _)| n);

        for entry in &dep.path {
            let next_hoistable: Option<&HoistableNode>;
            let access_type: PropertyAccessType;

            if entry.optional {
                next_hoistable =
                    hoistable_ptr.and_then(|h| h.properties.get(&entry.property).map(|e| &e.node));

                if hoistable_ptr.is_some()
                    && hoistable_ptr.unwrap().access_type == HoistableAccessType::NonNull
                {
                    access_type = PropertyAccessType::UnconditionalAccess;
                } else {
                    access_type = PropertyAccessType::OptionalAccess;
                }
            } else if hoistable_ptr.is_some()
                && hoistable_ptr.unwrap().access_type == HoistableAccessType::NonNull
            {
                next_hoistable =
                    hoistable_ptr.and_then(|h| h.properties.get(&entry.property).map(|e| &e.node));
                access_type = PropertyAccessType::UnconditionalAccess;
            } else {
                // Break: truncate dependency
                break;
            }

            // make_or_merge_property
            let child = dep_cursor
                .properties
                .entry(entry.property.clone())
                .or_insert_with(|| {
                    Box::new(DependencyNodeEntry {
                        node: DependencyNode {
                            properties: IndexMap::new(),
                            access_type,
                            loc: entry.loc,
                        },
                    })
                });
            child.node.access_type = merge_access(child.node.access_type, access_type);

            dep_cursor = &mut child.node;
            hoistable_ptr = next_hoistable;
        }

        // Mark final node as dependency
        dep_cursor.access_type = merge_access(
            dep_cursor.access_type,
            PropertyAccessType::OptionalDependency,
        );
    }

    fn derive_minimal_dependencies(&self, _env: &Environment) -> Vec<ReactiveScopeDependency> {
        let mut results = Vec::new();
        for (&root_id, (root_node, reactive)) in &self.dep_roots {
            collect_minimal_deps_in_subtree(root_node, *reactive, root_id, &[], &mut results);
        }
        results
    }
}

fn collect_minimal_deps_in_subtree(
    node: &DependencyNode,
    reactive: bool,
    root_id: IdentifierId,
    path: &[DependencyPathEntry],
    results: &mut Vec<ReactiveScopeDependency>,
) {
    if is_dependency_access(node.access_type) {
        results.push(ReactiveScopeDependency {
            identifier: root_id,
            reactive,
            path: path.to_vec(),
            loc: node.loc,
        });
    } else {
        for (child_name, child_entry) in &node.properties {
            let mut new_path = path.to_vec();
            new_path.push(DependencyPathEntry {
                property: child_name.clone(),
                optional: is_optional_access(child_entry.node.access_type),
                loc: child_entry.node.loc,
            });
            collect_minimal_deps_in_subtree(
                &child_entry.node,
                reactive,
                root_id,
                &new_path,
                results,
            );
        }
    }
}

// =============================================================================
// collectDependencies
// =============================================================================

/// A declaration record: instruction id + scope stack at declaration time.
#[derive(Clone)]
struct Decl {
    id: EvaluationOrder,
    scope_stack: Vec<ScopeId>, // copy of the scope stack at time of declaration
}

/// Context for dependency collection.
struct DependencyCollectionContext<'a> {
    declarations: HashMap<DeclarationId, Decl>,
    reassignments: HashMap<IdentifierId, Decl>,
    scope_stack: Vec<ScopeId>,
    dep_stack: Vec<Vec<ReactiveScopeDependency>>,
    deps: IndexMap<ScopeId, Vec<ReactiveScopeDependency>>,
    temporaries: &'a HashMap<IdentifierId, ReactiveScopeDependency>,
    #[allow(dead_code)]
    temporaries_used_outside_scope: &'a HashSet<DeclarationId>,
    processed_instrs_in_optional: &'a HashSet<ProcessedInstr>,
    inner_fn_context: Option<EvaluationOrder>,
}

impl<'a> DependencyCollectionContext<'a> {
    fn new(
        temporaries_used_outside_scope: &'a HashSet<DeclarationId>,
        temporaries: &'a HashMap<IdentifierId, ReactiveScopeDependency>,
        processed_instrs_in_optional: &'a HashSet<ProcessedInstr>,
    ) -> Self {
        Self {
            declarations: HashMap::new(),
            reassignments: HashMap::new(),
            scope_stack: Vec::new(),
            dep_stack: Vec::new(),
            deps: IndexMap::new(),
            temporaries,
            temporaries_used_outside_scope,
            processed_instrs_in_optional,
            inner_fn_context: None,
        }
    }

    fn enter_scope(&mut self, scope_id: ScopeId) {
        self.dep_stack.push(Vec::new());
        self.scope_stack.push(scope_id);
    }

    fn exit_scope(&mut self, scope_id: ScopeId, pruned: bool, env: &mut Environment) {
        let scoped_deps = self
            .dep_stack
            .pop()
            .expect("[PropagateScopeDeps]: Unexpected scope mismatch");
        self.scope_stack.pop();

        // Propagate dependencies upward
        for dep in &scoped_deps {
            if self.check_valid_dependency(dep, env) {
                if let Some(top) = self.dep_stack.last_mut() {
                    top.push(dep.clone());
                }
            }
        }

        if !pruned {
            self.deps.insert(scope_id, scoped_deps);
        }
    }

    fn current_scope(&self) -> Option<ScopeId> {
        self.scope_stack.last().copied()
    }

    fn declare(&mut self, identifier_id: IdentifierId, decl: Decl, env: &Environment) {
        if self.inner_fn_context.is_some() {
            return;
        }
        let decl_id = env.identifiers[identifier_id.0 as usize].declaration_id;
        if !self.declarations.contains_key(&decl_id) {
            self.declarations.insert(decl_id, decl.clone());
        }
        self.reassignments.insert(identifier_id, decl);
    }

    fn has_declared(&self, identifier_id: IdentifierId, env: &Environment) -> bool {
        let decl_id = env.identifiers[identifier_id.0 as usize].declaration_id;
        self.declarations.contains_key(&decl_id)
    }

    fn check_valid_dependency(&self, dep: &ReactiveScopeDependency, env: &Environment) -> bool {
        // Ref value is not a valid dep
        let ty = &env.types[env.identifiers[dep.identifier.0 as usize].type_.0 as usize];
        if react_compiler_hir::is_ref_value_type(ty) {
            return false;
        }
        // Object methods are not deps
        if matches!(ty, Type::ObjectMethod) {
            return false;
        }

        let ident = &env.identifiers[dep.identifier.0 as usize];
        let current_declaration = self
            .reassignments
            .get(&dep.identifier)
            .or_else(|| self.declarations.get(&ident.declaration_id));

        if let Some(current_scope) = self.current_scope() {
            if let Some(decl) = current_declaration {
                let scope_range_start = env.scopes[current_scope.0 as usize].range.start;
                return decl.id < scope_range_start;
            }
        }
        false
    }

    fn visit_operand(&mut self, place: &Place, env: &mut Environment) {
        let dep = self
            .temporaries
            .get(&place.identifier)
            .cloned()
            .unwrap_or_else(|| ReactiveScopeDependency {
                identifier: place.identifier,
                reactive: place.reactive,
                path: vec![],
                loc: place.loc,
            });
        self.visit_dependency(dep, env);
    }

    fn visit_property(
        &mut self,
        object: &Place,
        property: &PropertyLiteral,
        optional: bool,
        loc: Option<react_compiler_hir::SourceLocation>,
        env: &mut Environment,
    ) {
        let dep = get_property(object, property, optional, loc, self.temporaries, env);
        self.visit_dependency(dep, env);
    }

    fn visit_dependency(&mut self, dep: ReactiveScopeDependency, env: &mut Environment) {
        let ident = &env.identifiers[dep.identifier.0 as usize];
        let decl_id = ident.declaration_id;

        // Record scope declarations for values used outside their declaring scope
        if let Some(original_decl) = self.declarations.get(&decl_id) {
            if !original_decl.scope_stack.is_empty() {
                let orig_scope_stack = original_decl.scope_stack.clone();
                for &scope_id in &orig_scope_stack {
                    if !self.scope_stack.contains(&scope_id) {
                        // Check if already declared in this scope
                        let scope = &env.scopes[scope_id.0 as usize];
                        let already_declared = scope.declarations.iter().any(|(_, d)| {
                            env.identifiers[d.identifier.0 as usize].declaration_id == decl_id
                        });
                        if !already_declared {
                            let orig_scope_id = *orig_scope_stack.last().unwrap();
                            let new_decl = react_compiler_hir::ReactiveScopeDeclaration {
                                identifier: dep.identifier,
                                scope: orig_scope_id,
                            };
                            env.scopes[scope_id.0 as usize]
                                .declarations
                                .push((dep.identifier, new_decl));
                        }
                    }
                }
            }
        }

        // Handle ref.current access
        let dep = if react_compiler_hir::is_use_ref_type(
            &env.types[env.identifiers[dep.identifier.0 as usize].type_.0 as usize],
        ) && dep
            .path
            .first()
            .map(|p| p.property == PropertyLiteral::String("current".to_string()))
            .unwrap_or(false)
        {
            ReactiveScopeDependency {
                identifier: dep.identifier,
                reactive: dep.reactive,
                path: vec![],
                loc: dep.loc,
            }
        } else {
            dep
        };

        if self.check_valid_dependency(&dep, env) {
            if let Some(top) = self.dep_stack.last_mut() {
                top.push(dep);
            }
        }
    }

    fn visit_reassignment(&mut self, place: &Place, env: &mut Environment) {
        if let Some(current_scope) = self.current_scope() {
            let scope = &env.scopes[current_scope.0 as usize];
            let already = scope.reassignments.iter().any(|id| {
                env.identifiers[id.0 as usize].declaration_id
                    == env.identifiers[place.identifier.0 as usize].declaration_id
            });
            if !already
                && self.check_valid_dependency(
                    &ReactiveScopeDependency {
                        identifier: place.identifier,
                        reactive: place.reactive,
                        path: vec![],
                        loc: place.loc,
                    },
                    env,
                )
            {
                env.scopes[current_scope.0 as usize]
                    .reassignments
                    .push(place.identifier);
            }
        }
    }

    fn is_deferred_dependency_instr(&self, instr: &Instruction) -> bool {
        self.processed_instrs_in_optional
            .contains(&ProcessedInstr::Instruction(instr.lvalue.identifier))
            || self.temporaries.contains_key(&instr.lvalue.identifier)
    }

    fn is_deferred_dependency_terminal(&self, block_id: BlockId) -> bool {
        self.processed_instrs_in_optional
            .contains(&ProcessedInstr::Terminal(block_id))
    }
}

/// Recursively visit an inner function's blocks, processing all instructions
/// including nested FunctionExpressions. This mirrors the TS pattern of
/// `context.enterInnerFn(instr, () => handleFunction(innerFn))`.
fn visit_inner_function_blocks(
    func_id: FunctionId,
    ctx: &mut DependencyCollectionContext,
    env: &mut Environment,
) {
    // Clone inner function's instructions and block structure to avoid
    // borrow conflicts when mutating env through handle_instruction.
    let inner_instrs: Vec<Instruction> = env.functions[func_id.0 as usize].instructions.clone();
    let inner_blocks: Vec<(
        BlockId,
        Vec<InstructionId>,
        Vec<(BlockId, IdentifierId)>,
        Terminal,
    )> = env.functions[func_id.0 as usize]
        .body
        .blocks
        .iter()
        .map(|(bid, blk)| {
            let phi_ops: Vec<(BlockId, IdentifierId)> = blk
                .phis
                .iter()
                .flat_map(|phi| {
                    phi.operands
                        .iter()
                        .map(|(pred, place)| (*pred, place.identifier))
                })
                .collect();
            (
                *bid,
                blk.instructions.clone(),
                phi_ops,
                blk.terminal.clone(),
            )
        })
        .collect();

    for (inner_bid, inner_instr_ids, inner_phis, inner_terminal) in &inner_blocks {
        for &(_pred_id, op_id) in inner_phis {
            if let Some(maybe_optional) = ctx.temporaries.get(&op_id) {
                ctx.visit_dependency(maybe_optional.clone(), env);
            }
        }

        for &iid in inner_instr_ids {
            let inner_instr = &inner_instrs[iid.0 as usize];
            match &inner_instr.value {
                InstructionValue::FunctionExpression { lowered_func, .. }
                | InstructionValue::ObjectMethod { lowered_func, .. } => {
                    // Recursively visit nested function expressions
                    let scope_stack_copy = ctx.scope_stack.clone();
                    ctx.declare(
                        inner_instr.lvalue.identifier,
                        Decl {
                            id: inner_instr.id,
                            scope_stack: scope_stack_copy,
                        },
                        env,
                    );
                    visit_inner_function_blocks(lowered_func.func, ctx, env);
                }
                _ => {
                    handle_instruction(inner_instr, ctx, env);
                }
            }
        }

        if !ctx.is_deferred_dependency_terminal(*inner_bid) {
            let terminal_ops = visitors::each_terminal_operand(inner_terminal);
            for op in &terminal_ops {
                ctx.visit_operand(op, env);
            }
        }
    }
}

fn handle_instruction(
    instr: &Instruction,
    ctx: &mut DependencyCollectionContext,
    env: &mut Environment,
) {
    let id = instr.id;
    let scope_stack_copy = ctx.scope_stack.clone();
    ctx.declare(
        instr.lvalue.identifier,
        Decl {
            id,
            scope_stack: scope_stack_copy,
        },
        env,
    );

    if ctx.is_deferred_dependency_instr(instr) {
        return;
    }

    match &instr.value {
        InstructionValue::PropertyLoad {
            object,
            property,
            loc,
            ..
        } => {
            ctx.visit_property(object, property, false, *loc, env);
        }
        InstructionValue::StoreLocal {
            value: val, lvalue, ..
        } => {
            ctx.visit_operand(val, env);
            if lvalue.kind == InstructionKind::Reassign {
                ctx.visit_reassignment(&lvalue.place, env);
            }
            let scope_stack_copy = ctx.scope_stack.clone();
            ctx.declare(
                lvalue.place.identifier,
                Decl {
                    id,
                    scope_stack: scope_stack_copy,
                },
                env,
            );
        }
        InstructionValue::DeclareLocal { lvalue, .. }
        | InstructionValue::DeclareContext { lvalue, .. } => {
            if convert_hoisted_lvalue_kind(lvalue.kind).is_none() {
                let scope_stack_copy = ctx.scope_stack.clone();
                ctx.declare(
                    lvalue.place.identifier,
                    Decl {
                        id,
                        scope_stack: scope_stack_copy,
                    },
                    env,
                );
            }
        }
        InstructionValue::Destructure {
            value: val, lvalue, ..
        } => {
            ctx.visit_operand(val, env);
            let pattern_places = visitors::each_pattern_operand(&lvalue.pattern);
            for place in &pattern_places {
                if lvalue.kind == InstructionKind::Reassign {
                    ctx.visit_reassignment(place, env);
                }
                let scope_stack_copy = ctx.scope_stack.clone();
                ctx.declare(
                    place.identifier,
                    Decl {
                        id,
                        scope_stack: scope_stack_copy,
                    },
                    env,
                );
            }
        }
        InstructionValue::StoreContext {
            lvalue, value: val, ..
        } => {
            if !ctx.has_declared(lvalue.place.identifier, env)
                || lvalue.kind != InstructionKind::Reassign
            {
                let scope_stack_copy = ctx.scope_stack.clone();
                ctx.declare(
                    lvalue.place.identifier,
                    Decl {
                        id,
                        scope_stack: scope_stack_copy,
                    },
                    env,
                );
            }
            // Visit all operands (lvalue.place AND value)
            ctx.visit_operand(&lvalue.place, env);
            ctx.visit_operand(val, env);
        }
        _ => {
            // Visit all value operands
            let operands = visitors::each_instruction_value_operand(&instr.value, env);
            for operand in &operands {
                ctx.visit_operand(operand, env);
            }
        }
    }
}

fn collect_dependencies(
    func: &HirFunction,
    env: &mut Environment,
    used_outside_declaring_scope: &HashSet<DeclarationId>,
    temporaries: &HashMap<IdentifierId, ReactiveScopeDependency>,
    processed_instrs_in_optional: &HashSet<ProcessedInstr>,
) -> IndexMap<ScopeId, Vec<ReactiveScopeDependency>> {
    let mut ctx = DependencyCollectionContext::new(
        used_outside_declaring_scope,
        temporaries,
        processed_instrs_in_optional,
    );

    // Declare params
    for param in &func.params {
        match param {
            ParamPattern::Place(place) => {
                ctx.declare(
                    place.identifier,
                    Decl {
                        id: EvaluationOrder(0),
                        scope_stack: vec![],
                    },
                    env,
                );
            }
            ParamPattern::Spread(spread) => {
                ctx.declare(
                    spread.place.identifier,
                    Decl {
                        id: EvaluationOrder(0),
                        scope_stack: vec![],
                    },
                    env,
                );
            }
        }
    }

    let mut traversal = ScopeBlockTraversal::new();

    handle_function_deps(func, env, &mut ctx, &mut traversal);

    ctx.deps
}

fn handle_function_deps(
    func: &HirFunction,
    env: &mut Environment,
    ctx: &mut DependencyCollectionContext,
    traversal: &mut ScopeBlockTraversal,
) {
    for (block_id, block) in &func.body.blocks {
        // Record scopes
        traversal.record_scopes(block);

        let scope_block_info = traversal.block_infos.get(block_id).cloned();
        match &scope_block_info {
            Some(ScopeBlockInfo::Begin { scope, .. }) => {
                ctx.enter_scope(*scope);
            }
            Some(ScopeBlockInfo::End { scope, pruned, .. }) => {
                ctx.exit_scope(*scope, *pruned, env);
            }
            None => {}
        }

        // Record phi operands
        for phi in &block.phis {
            for (_pred_id, operand) in &phi.operands {
                if let Some(maybe_optional_chain) = ctx.temporaries.get(&operand.identifier) {
                    ctx.visit_dependency(maybe_optional_chain.clone(), env);
                }
            }
        }

        for &instr_id in &block.instructions {
            let instr = &func.instructions[instr_id.0 as usize];
            match &instr.value {
                InstructionValue::FunctionExpression { lowered_func, .. }
                | InstructionValue::ObjectMethod { lowered_func, .. } => {
                    let scope_stack_copy = ctx.scope_stack.clone();
                    ctx.declare(
                        instr.lvalue.identifier,
                        Decl {
                            id: instr.id,
                            scope_stack: scope_stack_copy,
                        },
                        env,
                    );

                    // Recursively visit inner function
                    let inner_func_id = lowered_func.func;
                    let prev_inner = ctx.inner_fn_context;
                    if ctx.inner_fn_context.is_none() {
                        ctx.inner_fn_context = Some(instr.id);
                    }

                    visit_inner_function_blocks(inner_func_id, ctx, env);

                    ctx.inner_fn_context = prev_inner;
                }
                _ => {
                    handle_instruction(instr, ctx, env);
                }
            }
        }

        // Terminal operands
        if !ctx.is_deferred_dependency_terminal(*block_id) {
            let terminal_ops = visitors::each_terminal_operand(&block.terminal);
            for op in &terminal_ops {
                ctx.visit_operand(op, env);
            }
        }
    }
}
