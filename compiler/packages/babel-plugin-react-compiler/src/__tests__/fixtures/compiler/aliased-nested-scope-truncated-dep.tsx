import {
  Stringify,
  mutate,
  identity,
  shallowCopy,
  setPropertyByKey,
} from 'shared-runtime';

/**
 * This fixture is similar to `bug-aliased-capture-aliased-mutate` and
 * `nonmutating-capture-in-unsplittable-memo-block`, but with a focus on
 * dependency extraction.
 *
 * NOTE: this fixture is currently valid, but will break with optimizations:
 * - Scope and mutable-range based reordering may move the array creation
 *     *after* the `mutate(aliasedObj)` call. This is invalid if mutate
 *     reassigns inner properties.
 * - RecycleInto or other deeper-equality optimizations may produce invalid
 *     output -- it may compare the array's contents / dependencies too early.
 * - Runtime validation for immutable values will break if `mutate` does
 *     interior mutation of the value captured into the array.
 *
 * Before scope block creation, HIR looks like this:
 *  //
 *  // $1 is unscoped as obj's mutable range will be
 *  // extended in a later pass
 *  //
 *  $1    = LoadLocal obj@0[0:12]
 *  $2    = PropertyLoad $1.id
 *  //
 *  // $3 gets assigned a scope as Array is an allocating
 *  // instruction, but this does *not* get extended or
 *  // merged into the later mutation site.
 *  // (explained in `bug-aliased-capture-aliased-mutate`)
 *  //
 *  $3@1  = Array[$2]
 *  ...
 *  $10@0 = LoadLocal shallowCopy@0[0, 12]
 *  $11   = LoadGlobal mutate
 *  $12   = $11($10@0[0, 12])
 *
 * When filling in scope dependencies, we find that it's incorrect to depend on
 * PropertyLoads from obj as it hasn't completed its mutable range. Following
 * the immutable / mutable-new typing system, we check the identity of obj to
 * detect whether it was newly created (and thus mutable) in this render pass.
 *
 * HIR with scopes looks like this.
 * bb0:
 *  $1    = LoadLocal obj@0[0:12]
 *  $2    = PropertyLoad $1.id
 *  scopeTerminal deps=[obj@0] block=bb1 fallt=bb2
 * bb1:
 *  $3@1  = Array[$2]
 *  goto bb2
 * bb2:
 *  ...
 *
 * This is surprising as deps now is entirely decoupled from temporaries used
 * by the block itself. scope @1's instructions now reference a value (1)
 * produced outside its scope range and (2) not represented in its dependencies
 *
 * The right thing to do is to ensure that all Loads from a value get assigned
 * the value's reactive scope. This also requires track mutating and aliasing
 * separately from scope range. In this example, that would correctly merge
 * the scopes of $3 with obj.
 * Runtime validation and optimizations such as ReactiveGraph-based reordering
 * require this as well.
 *
 * A tempting fix is to instead extend $3's ReactiveScope range up to include
 * $2 (the PropertyLoad). This fixes dependency deduping but not reordering
 * and mutability.
 */
function Component({prop}) {
  let obj = shallowCopy(prop);
  const aliasedObj = identity(obj);

  // [obj.id] currently is assigned its own reactive scope
  const id = [obj.id];

  // Writing to the alias may reassign to previously captured references.
  // The compiler currently produces valid output, but this breaks with
  // reordering, recycleInto, and other potential optimizations.
  mutate(aliasedObj);
  setPropertyByKey(aliasedObj, 'id', prop.id + 1);

  return <Stringify id={id} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{prop: {id: 1}}],
  sequentialRenders: [{prop: {id: 1}}, {prop: {id: 1}}, {prop: {id: 2}}],
};
