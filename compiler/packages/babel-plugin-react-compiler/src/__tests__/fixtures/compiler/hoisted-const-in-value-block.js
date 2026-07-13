// When a const variable is hoisted (used before declaration in the source),
// the lowering emits a DeclareContext with HoistedConst kind.
// PruneHoistedContexts removes these from top-level blocks, but if the
// DeclareContext ends up inside a SequenceExpression (value block), the
// visitor uses visitInstruction (not transformInstruction) and can't remove it.
// Codegen must convert hoisted kinds to their non-hoisted equivalents.

function Component({cond, items}) {
  const result = cond ? foo(items) : null;
  return result;
}

function foo(items) {
  return items.map(x => x.id);
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{cond: true, items: [{id: 1}]}],
};
