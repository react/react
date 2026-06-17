use std::collections::{HashMap, HashSet};

use indexmap::IndexMap;
use react_compiler_diagnostics::{CompilerDiagnostic, CompilerDiagnosticDetail, ErrorCategory};
use react_compiler_hir::environment::Environment;
use react_compiler_hir::visitors;
use react_compiler_hir::*;

// =============================================================================
// SSABuilder
// =============================================================================

struct IncompletePhi {
    old_place: Place,
    new_place: Place,
}

struct State {
    defs: HashMap<IdentifierId, IdentifierId>,
    incomplete_phis: Vec<IncompletePhi>,
}

struct SSABuilder {
    states: HashMap<BlockId, State>,
    current: Option<BlockId>,
    unsealed_preds: HashMap<BlockId, u32>,
    block_preds: HashMap<BlockId, Vec<BlockId>>,
    unknown: HashSet<IdentifierId>,
    context: HashSet<IdentifierId>,
    pending_phis: HashMap<BlockId, Vec<Phi>>,
    processed_functions: Vec<FunctionId>,
}

impl SSABuilder {
    fn new(blocks: &IndexMap<BlockId, BasicBlock>) -> Self {
        let mut block_preds = HashMap::new();
        for (id, block) in blocks {
            block_preds.insert(*id, block.preds.iter().copied().collect());
        }
        SSABuilder {
            states: HashMap::new(),
            current: None,
            unsealed_preds: HashMap::new(),
            block_preds,
            unknown: HashSet::new(),
            context: HashSet::new(),
            pending_phis: HashMap::new(),
            processed_functions: Vec::new(),
        }
    }

    fn define_function(&mut self, func: &HirFunction) {
        for (id, block) in &func.body.blocks {
            self.block_preds
                .insert(*id, block.preds.iter().copied().collect());
        }
    }

    fn state_mut(&mut self) -> &mut State {
        let current = self
            .current
            .expect("we need to be in a block to access state!");
        self.states
            .get_mut(&current)
            .expect("state not found for current block")
    }

    fn make_id(&mut self, old_id: IdentifierId, env: &mut Environment) -> IdentifierId {
        let new_id = env.next_identifier_id();
        let old = &env.identifiers[old_id.0 as usize];
        let declaration_id = old.declaration_id;
        let name = old.name.clone();
        let loc = old.loc;
        let new_ident = &mut env.identifiers[new_id.0 as usize];
        new_ident.declaration_id = declaration_id;
        new_ident.name = name;
        new_ident.loc = loc;
        new_id
    }

    fn define_place(
        &mut self,
        old_place: &Place,
        env: &mut Environment,
    ) -> Result<Place, CompilerDiagnostic> {
        let old_id = old_place.identifier;

        if self.unknown.contains(&old_id) {
            let ident = &env.identifiers[old_id.0 as usize];
            let name = match &ident.name {
                Some(name) => format!("{}${}", name.value(), old_id.0),
                None => format!("${}", old_id.0),
            };
            return Err(CompilerDiagnostic::new(
                ErrorCategory::Todo,
                "[hoisting] EnterSSA: Expected identifier to be defined before being used",
                Some(format!("Identifier {} is undefined", name)),
            )
            .with_detail(CompilerDiagnosticDetail::Error {
                loc: old_place.loc,
                message: None,
                identifier_name: None,
            }));
        }

        // Do not redefine context references.
        if self.context.contains(&old_id) {
            return Ok(self.get_place(old_place, env));
        }

        let new_id = self.make_id(old_id, env);
        self.state_mut().defs.insert(old_id, new_id);
        Ok(Place {
            identifier: new_id,
            effect: old_place.effect,
            reactive: old_place.reactive,
            loc: old_place.loc,
        })
    }

    #[allow(dead_code)]
    fn define_context(
        &mut self,
        old_place: &Place,
        env: &mut Environment,
    ) -> Result<Place, CompilerDiagnostic> {
        let old_id = old_place.identifier;
        let new_place = self.define_place(old_place, env)?;
        self.context.insert(old_id);
        Ok(new_place)
    }

    /// A function's context places capture a *binding*, not a value: the
    /// variable is only read when the function is later called, so a context
    /// place may reference a binding that is declared after the function
    /// expression itself (eg `const colgroup = useMemo(() => <colgroup>...)`,
    /// where the JSX tag name resolves to the variable being assigned). Unmark
    /// such identifiers so the later declaration doesn't error; if the function
    /// body actually *reads* the variable before it is defined, visiting the
    /// body re-marks it and the hoisting bailout in define_place still applies.
    fn unmark_unknown(&mut self, id: IdentifierId) {
        self.unknown.remove(&id);
    }

    fn get_place(&mut self, old_place: &Place, env: &mut Environment) -> Place {
        let current_id = self.current.expect("must be in a block");
        let new_id = self.get_id_at(old_place, current_id, env);
        Place {
            identifier: new_id,
            effect: old_place.effect,
            reactive: old_place.reactive,
            loc: old_place.loc,
        }
    }

    fn get_id_at(
        &mut self,
        old_place: &Place,
        block_id: BlockId,
        env: &mut Environment,
    ) -> IdentifierId {
        if let Some(state) = self.states.get(&block_id) {
            if let Some(&new_id) = state.defs.get(&old_place.identifier) {
                return new_id;
            }
        }

        let preds = self.block_preds.get(&block_id).cloned().unwrap_or_default();

        if preds.is_empty() {
            self.unknown.insert(old_place.identifier);
            return old_place.identifier;
        }

        let unsealed = self.unsealed_preds.get(&block_id).copied().unwrap_or(0);
        if unsealed > 0 {
            let new_id = self.make_id(old_place.identifier, env);
            let new_place = Place {
                identifier: new_id,
                effect: old_place.effect,
                reactive: old_place.reactive,
                loc: old_place.loc,
            };
            let state = self.states.get_mut(&block_id).unwrap();
            state.incomplete_phis.push(IncompletePhi {
                old_place: old_place.clone(),
                new_place,
            });
            state.defs.insert(old_place.identifier, new_id);
            return new_id;
        }

        if preds.len() == 1 {
            let pred = preds[0];
            let new_id = self.get_id_at(old_place, pred, env);
            self.states
                .get_mut(&block_id)
                .unwrap()
                .defs
                .insert(old_place.identifier, new_id);
            return new_id;
        }

        let new_id = self.make_id(old_place.identifier, env);
        self.states
            .get_mut(&block_id)
            .unwrap()
            .defs
            .insert(old_place.identifier, new_id);
        let new_place = Place {
            identifier: new_id,
            effect: old_place.effect,
            reactive: old_place.reactive,
            loc: old_place.loc,
        };
        self.add_phi(block_id, old_place, &new_place, env);
        new_id
    }

    fn add_phi(
        &mut self,
        block_id: BlockId,
        old_place: &Place,
        new_place: &Place,
        env: &mut Environment,
    ) {
        let preds = self.block_preds.get(&block_id).cloned().unwrap_or_default();

        let mut pred_defs: IndexMap<BlockId, Place> = IndexMap::new();
        for pred_block_id in &preds {
            let pred_id = self.get_id_at(old_place, *pred_block_id, env);
            pred_defs.insert(
                *pred_block_id,
                Place {
                    identifier: pred_id,
                    effect: old_place.effect,
                    reactive: old_place.reactive,
                    loc: old_place.loc,
                },
            );
        }

        let phi = Phi {
            place: new_place.clone(),
            operands: pred_defs,
        };

        self.pending_phis.entry(block_id).or_default().push(phi);
    }

    fn fix_incomplete_phis(&mut self, block_id: BlockId, env: &mut Environment) {
        let incomplete_phis: Vec<IncompletePhi> = self
            .states
            .get_mut(&block_id)
            .unwrap()
            .incomplete_phis
            .drain(..)
            .collect();
        for phi in &incomplete_phis {
            self.add_phi(block_id, &phi.old_place, &phi.new_place, env);
        }
    }

    fn start_block(&mut self, block_id: BlockId) {
        self.current = Some(block_id);
        self.states.insert(
            block_id,
            State {
                defs: HashMap::new(),
                incomplete_phis: Vec::new(),
            },
        );
    }
}

// =============================================================================
// Public entry point
// =============================================================================

pub fn enter_ssa(func: &mut HirFunction, env: &mut Environment) -> Result<(), CompilerDiagnostic> {
    let mut builder = SSABuilder::new(&func.body.blocks);
    let root_entry = func.body.entry;
    enter_ssa_impl(func, &mut builder, env, root_entry)?;

    // Apply all pending phis to the actual blocks
    apply_pending_phis(func, env, &mut builder);

    Ok(())
}

fn apply_pending_phis(func: &mut HirFunction, env: &mut Environment, builder: &mut SSABuilder) {
    for (block_id, block) in func.body.blocks.iter_mut() {
        if let Some(phis) = builder.pending_phis.remove(block_id) {
            block.phis.extend(phis);
        }
    }
    for fid in &builder.processed_functions.clone() {
        let inner_func = &mut env.functions[fid.0 as usize];
        for (block_id, block) in inner_func.body.blocks.iter_mut() {
            if let Some(phis) = builder.pending_phis.remove(block_id) {
                block.phis.extend(phis);
            }
        }
    }
}

fn enter_ssa_impl(
    func: &mut HirFunction,
    builder: &mut SSABuilder,
    env: &mut Environment,
    root_entry: BlockId,
) -> Result<(), CompilerDiagnostic> {
    let mut visited_blocks: HashSet<BlockId> = HashSet::new();
    let block_ids: Vec<BlockId> = func.body.blocks.keys().copied().collect();

    for block_id in &block_ids {
        let block_id = *block_id;

        if visited_blocks.contains(&block_id) {
            return Err(CompilerDiagnostic::new(
                ErrorCategory::Invariant,
                format!("found a cycle! visiting bb{} again", block_id.0),
                None,
            ));
        }

        visited_blocks.insert(block_id);
        builder.start_block(block_id);

        // Handle params at the root entry
        if block_id == root_entry {
            if !func.context.is_empty() {
                return Err(CompilerDiagnostic::new(
                    ErrorCategory::Invariant,
                    "Expected function context to be empty for outer function declarations",
                    None,
                ));
            }
            let params = std::mem::take(&mut func.params);
            let mut new_params = Vec::with_capacity(params.len());
            for param in params {
                new_params.push(match param {
                    ParamPattern::Place(p) => ParamPattern::Place(builder.define_place(&p, env)?),
                    ParamPattern::Spread(s) => ParamPattern::Spread(SpreadPattern {
                        place: builder.define_place(&s.place, env)?,
                    }),
                });
            }
            func.params = new_params;
        }

        // Process instructions
        let instruction_ids: Vec<InstructionId> = func
            .body
            .blocks
            .get(&block_id)
            .unwrap()
            .instructions
            .clone();

        for instr_id in &instruction_ids {
            let instr_idx = instr_id.0 as usize;
            let instr = &mut func.instructions[instr_idx];

            // For FunctionExpression/ObjectMethod, we need to handle context
            // mapping specially because env.functions is borrowed by the closure.
            // First, check if this is a FunctionExpression/ObjectMethod and handle
            // context mapping separately.
            let func_expr_id = match &instr.value {
                InstructionValue::FunctionExpression { lowered_func, .. }
                | InstructionValue::ObjectMethod { lowered_func, .. } => Some(lowered_func.func),
                _ => None,
            };

            // Map context places for function expressions before other operands
            if let Some(fid) = func_expr_id {
                let context = std::mem::take(&mut env.functions[fid.0 as usize].context);
                env.functions[fid.0 as usize].context = context
                    .into_iter()
                    .map(|place| builder.get_place(&place, env))
                    .collect();
            }

            // Map non-context operands
            visitors::for_each_instruction_value_operand_mut(&mut instr.value, &mut |place| {
                *place = builder.get_place(place, env);
            });

            // Map lvalues (skip DeclareContext/StoreContext — context variables
            // don't participate in SSA renaming)
            let instr = &mut func.instructions[instr_idx];
            let mut lvalue_err: Option<CompilerDiagnostic> = None;
            visitors::for_each_instruction_lvalue_mut(instr, &mut |place| {
                if lvalue_err.is_none() {
                    match builder.define_place(place, env) {
                        Ok(new_place) => *place = new_place,
                        Err(e) => lvalue_err = Some(e),
                    }
                }
            });
            if let Some(e) = lvalue_err {
                return Err(e);
            }

            // Handle inner function SSA
            if let Some(fid) = func_expr_id {
                let context_ids: Vec<IdentifierId> = env.functions[fid.0 as usize]
                    .context
                    .iter()
                    .map(|place| place.identifier)
                    .collect();
                for id in context_ids {
                    builder.unmark_unknown(id);
                }
                builder.processed_functions.push(fid);
                let inner_func = &mut env.functions[fid.0 as usize];
                let inner_entry = inner_func.body.entry;
                let entry_block = inner_func.body.blocks.get_mut(&inner_entry).unwrap();

                if !entry_block.preds.is_empty() {
                    return Err(CompilerDiagnostic::new(
                        ErrorCategory::Invariant,
                        "Expected function expression entry block to have zero predecessors",
                        None,
                    ));
                }
                entry_block.preds.insert(block_id);

                builder.define_function(inner_func);

                let saved_current = builder.current;

                // Map inner function params
                let inner_params = std::mem::take(&mut env.functions[fid.0 as usize].params);
                let mut new_inner_params = Vec::with_capacity(inner_params.len());
                for param in inner_params {
                    new_inner_params.push(match param {
                        ParamPattern::Place(p) => {
                            ParamPattern::Place(builder.define_place(&p, env)?)
                        }
                        ParamPattern::Spread(s) => ParamPattern::Spread(SpreadPattern {
                            place: builder.define_place(&s.place, env)?,
                        }),
                    });
                }
                env.functions[fid.0 as usize].params = new_inner_params;

                // Take the inner function out of the arena to process it
                let mut inner_func =
                    std::mem::replace(&mut env.functions[fid.0 as usize], placeholder_function());

                enter_ssa_impl(&mut inner_func, builder, env, root_entry)?;

                // Put it back
                env.functions[fid.0 as usize] = inner_func;

                builder.current = saved_current;

                // Clear entry preds
                env.functions[fid.0 as usize]
                    .body
                    .blocks
                    .get_mut(&inner_entry)
                    .unwrap()
                    .preds
                    .clear();
                builder.block_preds.insert(inner_entry, Vec::new());
            }
        }

        // Map terminal operands
        let terminal = &mut func.body.blocks.get_mut(&block_id).unwrap().terminal;
        visitors::for_each_terminal_operand_mut(terminal, &mut |place| {
            *place = builder.get_place(place, env);
        });

        // Handle successors
        let terminal_ref = &func.body.blocks.get(&block_id).unwrap().terminal;
        let successors = visitors::each_terminal_successor(terminal_ref);
        for output_id in successors {
            let output_preds_len = builder
                .block_preds
                .get(&output_id)
                .map(|p| p.len() as u32)
                .unwrap_or(0);

            let count = if builder.unsealed_preds.contains_key(&output_id) {
                builder.unsealed_preds[&output_id] - 1
            } else {
                output_preds_len - 1
            };
            builder.unsealed_preds.insert(output_id, count);

            if count == 0 && visited_blocks.contains(&output_id) {
                builder.fix_incomplete_phis(output_id, env);
            }
        }
    }

    Ok(())
}

/// Create a placeholder HirFunction for temporarily swapping an inner function
/// out of `env.functions` via `std::mem::replace`. The placeholder is never
/// read — the real function is swapped back immediately after processing.
pub fn placeholder_function() -> HirFunction {
    HirFunction {
        loc: None,
        id: None,
        name_hint: None,
        fn_type: ReactFunctionType::Other,
        params: Vec::new(),
        return_type_annotation: None,
        returns: Place {
            identifier: IdentifierId(0),
            effect: Effect::Unknown,
            reactive: false,
            loc: None,
        },
        context: Vec::new(),
        body: HIR {
            entry: BlockId(0),
            blocks: IndexMap::new(),
        },
        instructions: Vec::new(),
        generator: false,
        is_async: false,
        directives: Vec::new(),
        aliasing_effects: None,
    }
}
