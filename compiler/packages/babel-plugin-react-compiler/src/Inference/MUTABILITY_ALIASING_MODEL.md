# The Mutability & Aliasing Model

This document describes the new (as of June 2025) mutability and aliasing model powering React Compiler. The mutability and aliasing system is a conceptual subcomponent whose primary role is to determine minimal sets of values that mutate together, and the range of instructions over which those mutations occur. These minimal sets of values that mutate together, and the corresponding instructions doing those mutations, are ultimately grouped into reactive scopes, which then translate into memoization blocks in the output (after substantial additional processing described in the comments of those passes).

To build an intuition, consider the following example:

```js
function Component() {
    // a is created and mutated over the course of these two instructions:
    const a = {};
    mutate(a);

    // b and c are created and mutated together — mutate might modify b via c
    const b = {};
    const c = {b};
    mutate(c);

    // does not modify a/b/c
    return <Foo a={a} c={c} />
}
```

The goal of mutability and aliasing inference is to understand the set of instructions that create/modify a, b, and c.

In code, the mutability and aliasing model is compromised of the following phases:

* `InferMutationAliasingEffects`. Infers a set of mutation and aliasing effects for each instruction. The approach is to generate a set of candidate effects based purely on the semantics of each instruction and the types of the operands, then use abstract interpretation to determine the actual effects (or errors) that would apply. For example, an instruction that by default has a Capture effect might downgrade to an ImmutableCapture effect if the value is known to be frozen.
* `InferMutationAliasingRanges`. Infers a mutable range (start:end instruction ids) for each value in the program, and annotates each Place with its effect type for usage in later passes. This builds a graph of data flow through the program over time in order to understand which mutations effect which values.
* `InferReactiveScopeVariables`. Given the per-Place effects, determines disjoint sets of values that mutate together and assigns all identifiers in each set to a unique scope, and updates the range to include the ranges of all constituent values.

Finally, `AnalyzeFunctions` needs to understand the mutation and aliasing semantics of nested FunctionExpression and ObjectMethod values. `AnalyzeFunctions` calls `InferFunctionExpressionAliasingEffectsSignature` to determine the publicly observable set of mutation/aliasing effects for nested functions.

## Mutation and Aliasing Effects

The inference model is based on a set of "effects" that describe subtle aspects of mutation, aliasing, and other changes to the state of values over time

### Creation Effects

#### Create

```js
{
    kind: 'Create';
    into: Place;
    value: ValueKind;
    reason: ValueReason;
}
```

Describes the creation of a new value with the given kind, and reason for having that kind. For example, `x = 10` might have an effect like `Create x = ValueKind.Primitive [ValueReason.Other]`.

#### CreateFunction

```js
{
    kind: 'CreateFunction';
    captures: Array<Place>;
    function: FunctionExpression | ObjectMethod;
    into: Place;
}
```

Describes the creation of new function value, capturing the given set of mutable values. CreateFunction is used to specifically track function types so that we can precisely model calls to those functions with `Apply`.

#### Apply

```js
{
    kind: 'Apply';
    receiver: Place;
    function: Place; // same as receiver for function calls
    mutatesFunction: boolean; // indicates if this is a type that we consider to mutate the function itself by default
    args: Array<Place | SpreadPattern | Hole>;
    into: Place; // where result is stored
    signature: FunctionSignature | null;
}
```

Describes the potential creation of a value by calling a function. This models `new`, function calls, and method calls. The inference algorithm uses the most precise signature it can determine:

* If the function is a locally created function expression, we use a signature inferred from the behavior of that function to interpret the effects of calling it with the given arguments.
* Else if the function has a known aliasing signature (new style precise effects signature), we apply the arguments to that signature to get a precise set of effects.
* Else if the function has a legacy style signature (with per-param effects) we convert the legacy per-Place effects into aliasing effects (described in this doc) and apply those.
* Else fall back to inferring a generic set of effects.

The generic fallback is to assume:
- The return value may alias any of the arguments (Alias param -> return)
- Any arguments *may* be transitively mutated (MutateTransitiveConditionally param)
- Any argument may be captured into any other argument (Capture paramN -> paramM for all N,M where N != M)

### Aliasing Effects

These effects describe data-flow only, separately from mutation or other state-changing semantics.

#### Assign

```js
{
    kind: 'Assign';
    from: Place;
    into: Place;
}
```

Describes an `x = y` assignment, where the receiving (into) value is overwritten with a new (from) value. After this effect, any previous assignments/aliases to the receiving value are dropped. Note that `Alias` initializes the receiving value.

> TODO: InferMutationAliasingRanges may not fully reset aliases on encountering this effect

#### Alias

```js
{
    kind: 'Alias';
    from: Place;
    into: Place;
}
```

Describes that an assignment _may_ occur, but that the possible assignment is non-exclusive. The canonical use-case for `Alias` is a function that may return more than one of its arguments, such as `(x, y, z) => x ? y : z`. Here, the result of this function may be `y` or `z`, but neither one overwrites the other. Note that `Alias` does _not_ initialize the receiving value: it should always be paired with an effect to create the receiving value.

#### Capture

```js
{
    kind: 'Capture';
    from: Place;
    into: Place;
}
```

Describes that a reference to one variable (from) is stored within another value (into). Examples include:
- An array expression captures the items of the array (`array = [capturedValue]`)
- Array.prototype.push captures the pushed values into the array (`array.push(capturedValue)`)
- Property assignment captures the value onto the object (`object.property = capturedValue`)

#### CreateFrom

```js
{
    kind: 'CreateFrom';
    from: Place;
    into: Place;
}
```

This is somewhat the inverse of `Capture`. The `CreateFrom` effect describes that a variable is initialized by extracting _part_ of another value, without taking a direct alias to the full other value. Examples include:

- Indexing into an array (`createdFrom = array[0]`)
- Reading an object property (`createdFrom = object.property`)
- Getting a Map key (`createdFrom = map.get(key)`)

#### ImmutableCapture

Describes immutable data flow from one value to another. This is not currently used for anything, but is intended to eventually power a more sophisticated escape analysis.

### MaybeAlias

Describes potential data flow that the compiler knows may occur behind a function call, but cannot be sure about. For example, `foo(x)` _may_ be the identity function and return `x`, or `cond(a, b, c)` may conditionally return `b` or `c` depending on the value of `a`, but those functions could just as easily return new mutable values and not capture any information from their arguments. MaybeAlias represents that we have to consider the potential for data flow when deciding mutable ranges, but should be conservative about reporting errors. For example, `foo(someFrozenValue).property = true` should not error since we don't know for certain that foo returns its input.

### State-Changing Effects

The following effects describe state changes to specific values, not data flow. In many cases, JavaScript semantics will involve a combination of both data-flow effects *and* state-change effects. For example, `object.property = value` has data flow (`Capture object <- value`) and mutation (`Mutate object`).

#### Freeze

```js
{
    kind: 'Freeze',
    // The reference being frozen
    value: Place;
    // The reason the value is frozen (passed to a hook, passed to jsx, etc)
    reason: ValueReason;
}
```

Once a reference to a value has been passed to React, that value is generally not safe to mutate further. This is not a strictly required property of React, but is a natural consequence of making components and hooks composable without leaking implementation details. Concretely, once a value has been passed as a JSX prop, passed as argument to a hook, or returned from a hook, it must be assumed that the other "side" — receiver of the prop/argument/return value — will use that value as an input to an effect or memoization unit. Mutating that value (instead of creating a new value) will fail to cause the consuming computation to update:

```js
// INVALID DO NOT DO THIS
function Component(props) {
    const array = useArray(props.value);
    // OOPS! this value is memoized, the array won't get re-created
    // when `props.value` changes, so we might just keep pushing new
    // values to the same array on every render!
    array.push(props.otherValue);
}

function useArray(a) {
    return useMemo(() => [a], [a]);
}
```

The **Freeze** effect accepts a variable reference and a reason that the value is being frozen. Note: _freeze only applies to the reference, not the underlying value_. Our inference is conservative, and assumes that there may still be other references to the same underlying value which are mutated later. For example:

```js
const x = {};
const y = [];
x.y = y;
freeze(y); // y _reference_ is frozen
x.y.push(props.value); // but y is still considered mutable bc of this
```

#### Mutate (and MutateConditionally)

```js
{
    kind: 'Mutate';
    value: Place;
}
```

Mutate indicates that a value is mutated, without modifying any of the values that it may transitively have captured. Canonical examples include:

- Pushing an item onto an array modifies the array, but does not modify any items stored _within_ the array (unless the array has a reference to itself!)
- Assigning a value to an object property modifies the object, but not any values stored in the object's other properties.

This helps explain the distinction between Assign/Alias and Capture: Mutate only affects assign/alias but not captures.

`MutateConditionally` is an alternative in which the mutation _may_ happen depending on the type of the value. The conditional variant is not generally used and included for completeness.



#### MutateTransitiveConditionally (and MutateTransitive)

`MutateTransitiveConditionally` represents an operation that may mutate _any_ aspect of a value, including reaching arbitrarily deep into nested values to mutate them. This is the default semantic for unknown functions — we have no idea what they do, so we assume that they are idempotent but may mutate any aspect of the mutable values that are passed to them.

There is also `MutateTransitive` for completeness, but this is not generally used.

### Side Effects

Finally, there are a few effects that describe error, or potential error, conditions:

- `MutateFrozen` is always an error, because it indicates known mutation of a value that should not be mutated.
- `MutateGlobal` indicates known mutation of a global value, which is not safe during render. This effect is an error if reachable during render, but allowed if only reachable via an event handler or useEffect.
- `Impure` indicates calling some other logic that is impure/side-effecting. This is an error if reachable during render, but allowed if only reachable via an event handler or useEffect.
  - TODO: we could probably merge this and MutateGlobal
- `Render` indicates a value that is not mutated, but is known to be called during render. It's used for a few particular places like JSX tags and JSX children, which we assume are accessed during render (while other props may be event handlers etc). This helps to detect more MutateGlobal/Impure effects and reject more invalid programs.


## Rules

### Mutation of Alias Mutates the Source Value

```
Alias a <- b
Mutate a
=>
Mutate b
```

Example:

```js
const a = maybeIdentity(b); // Alias a <- b
a.property = value; // a could be b, so this mutates b
```

### Mutation of Assignment Mutates the Source Value

```
Assign a <- b
Mutate a
=>
Mutate b
```

Example:

```js
const a = b;
a.property = value // a _is_ b, this mutates b
```

### Mutation of CreateFrom Mutates the Source Value

```
CreateFrom a <- b
Mutate a
=>
Mutate b
```

Example:

```js
const a = b[index];
a.property = value // the contents of b are transitively mutated
```


### Mutation of Capture Does *Not* Mutate the Source Value

```
Capture a <- b
Mutate a
!=>
~Mutate b~
```

Example:

```js
const a = {};
a.b = b;
a.property = value; // mutates a, not b
```

### Mutation of Source Affects Alias, Assignment, CreateFrom, and Capture

```
Alias a <- b OR Assign a <- b OR CreateFrom a <- b OR Capture a <- b
Mutate b
=>
Mutate a
```

A derived value changes when it's source value is mutated.

Example:

```js
const x = {};
const y = [x];
x.y = true; // this changes the value within `y` ie mutates y
```


### TransitiveMutation of Alias, Assignment, CreateFrom, or Capture Mutates the Source

```
Alias a <- b OR Assign a <- b OR CreateFrom a <- b OR Capture a <- b
MutateTransitive a
=>
MutateTransitive b
```

Remember, the intuition for a transitive mutation is that it's something that could traverse arbitrarily deep into an object and mutate whatever it finds. Imagine something that recurses into every nested object/array and sets `.field = value`. Given a function `mutate()` that does this, then:

```js
const a = b; // assign
mutate(a); // clearly can transitively mutate b

const a = maybeIdentity(b); // alias
mutate(a); // clearly can transitively mutate b

const a = b[index]; // createfrom
mutate(a); // clearly can transitively mutate b

const a = {};
a.b = b; // capture
mutate(a); // can transitively mutate b
```

### MaybeAlias makes mutation conditional

Because we don't know for certain that the aliasing occurs, we consider the mutation conditional against the source.

```
MaybeAlias a <- b
Mutate a
=>
MutateConditional b
```

### Freeze Does Not Freeze the Value

Freeze does not freeze the value itself:

```
Create x
Assign y <- x OR Alias y <- x OR CreateFrom y <- x OR Capture y <- x
Freeze y
!=>
~Freeze x~
```

This means that subsequent mutations of the original value are valid:

```
Create x
Assign y <- x OR Alias y <- x OR CreateFrom y <- x OR Capture y <- x
Freeze y
Mutate x
=>
Mutate x (mutation is ok)
```

As well as mutations through other assignments/aliases/captures/createfroms of the original value:

```
Create x
Assign y <- x OR Alias y <- x OR CreateFrom y <- x OR Capture y <- x
Freeze y
Alias z <- x OR Capture z <- x OR CreateFrom z <- x OR Assign z <- x
Mutate z
=>
Mutate x (mutation is ok)
```

### Freeze Freezes The Reference 

Although freeze doesn't freeze the value, it does affect the reference. The reference cannot be used to mutate.

Conditional mutations of the reference are no-ops:

```
Create x
Assign y <- x OR Alias y <- x OR CreateFrom y <- x OR Capture y <- x
Freeze y
MutateConditional y
=>
(no mutation)
```

And known mutations of the reference are errors:

```
Create x
Assign y <- x OR Alias y <- x OR CreateFrom y <- x OR Capture y <- x
Freeze y
MutateConditional y
=>
MutateFrozen y error=...
```

### Corollary: Transitivity of Assign/Alias/CreateFrom/Capture

A key part of the inference model is inferring a signature for function expressions. The signature is a minimal set of effects that describes the publicly observable behavior of the function. This can include "global" effects like side effects (MutateGlobal/Impure) as well as mutations/aliasing of parameters and free variables.

In order to determine the aliasing of params and free variables into each other and/or the return value, we may encounter chains of assign, alias, createfrom, and capture effects. For example:

```js
const f = (x) => {
    const y = [x];  // capture y <- x
    const z = y[0]; // createfrom z <- y
    return z;     // assign return <- z
}
// <Effect> return <- x
```

In this example we can see that there should be some effect on `f` that tracks the flow of data from `x` into the return value. The key constraint is preserving the semantics around how local/transitive mutations of the destination would affect the source.

#### Each of the effects is transitive with itself

```
Assign b <- a
Assign c <- b
=>
Assign c <- a
```

```
Alias b <- a
Alias c <- b
=>
Alias c <- a
```

```
CreateFrom b <- a
CreateFrom c <- b
=>
CreateFrom c <- a
```

```
Capture b <- a
Capture c <- b
=>
Capture c <- a
```

#### Alias > Assign

```
Assign b <- a
Alias c <- b
=>
Alias c <- a
```

```
Alias b <- a
Assign c <- b
=>
Alias c <- a
```

### CreateFrom > Assign/Alias

Intuition: 

```
CreateFrom b <- a
Alias c <- b OR Assign c <- b
=>
CreateFrom c <- a
```

```
Alias b <- a OR Assign b <- a
CreateFrom c <- b
=>
CreateFrom c <- a
```

### Capture > Assign/Alias

Intuition: capturing means that a local mutation of the destination will not affect the source, so we preserve the capture.

```
Capture b <- a
Alias c <- b OR Assign c <- b
=>
Capture c <- a
```

```
Alias b <- a OR Assign b <- a
Capture c <- b
=>
Capture c <- a
```

### Capture And CreateFrom

Intuition: these effects are inverses of each other (capturing into an object, extracting from an object). The result is based on the order of operations:

Capture then CreateFrom is equivalent to Alias: we have to assume that the result _is_ the original value and that a local mutation of the result could mutate the original.

```js
const b = [a]; // capture
const c = b[0]; // createfrom
mutate(c); // this clearly can mutate a, so the result must be one of Assign/Alias/CreateFrom 
```

We use Alias as the return type because the mutability kind of the result is not derived from the source value (there's a fresh object in between due to the capture), so the full set of effects in practice would be a Create+Alias.

```
Capture b <- a
CreateFrom c <- b
=>
Alias c <- a
```

Meanwhile the opposite direction preserves the capture, because the result is not the same as the source:

```js
const b = a[0]; // createfrom
const c = [b]; // capture
mutate(c); // does not mutate a, so the result must be Capture
```

```
CreateFrom b <- a
Capture c <- b
=>
Capture c <- a
```