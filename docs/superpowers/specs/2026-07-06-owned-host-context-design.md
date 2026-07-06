# Owned Host Context

## Summary

Owned Host Context is a proposed React primitive that lets a function component observe state from a host component it directly owns, without changing normal parent-to-child context flow.

The motivating case is `useFormStatus`. Today, `useFormStatus()` reads the nearest parent form's host transition context. It cannot read a `<form>` returned by the same component because React evaluates hooks before reconciling the returned host children.

This proposal keeps normal context semantics intact and adds a separate, renderer-owned channel for stateful host resources declared by the same component.

## Goals

- Allow the ergonomic form pattern:

  ```js
  function Form() {
    const {pending} = useFormStatus();
    return (
      <form action={submit}>
        <button disabled={pending}>Save</button>
      </form>
    );
  }
  ```

- Preserve existing descendant behavior:

  ```js
  function Submit() {
    const {pending} = useFormStatus();
    return <button disabled={pending}>Save</button>;
  }
  ```

- Avoid guessing when one component owns multiple possible providers.
- Avoid adding overhead to every normal Context read.
- Keep the mechanism renderer-defined, so React DOM can use it for forms without forcing every renderer to support the same host resources.

## Non-Goals

- Do not make ordinary React Context flow upward or sideways.
- Do not make hooks inspect JSX directly during hook evaluation.
- Do not infer status from arbitrary nested forms, portals, or components.
- Do not change public `useFormStatus` behavior for already-supported child components.

## Current Model

React DOM form status is implemented as a host transition context.

- A form host fiber is upgraded to be stateful when a form action starts.
- During host context push, React DOM writes the form status into `HostTransitionContext`.
- Descendants read that context through `useHostTransitionStatus`, which powers `useFormStatus`.
- The component that returns the `<form>` cannot read that form's status, because hooks run before React has reconciled the returned `<form>` fiber.

This is correct under normal Context semantics: providers affect descendants, not the component that returns them.

## Proposed Concept

Add an internal primitive called Owned Host Context.

An owned host context is a relationship between:

- an owner function fiber,
- a renderer-recognized host fiber returned by that owner, and
- a host state value exposed to hooks in the owner.

Unlike normal Context, this is not lexical parent-to-child propagation. It is an owner-to-owned-resource subscription, closer to a render-observable ref, but integrated with scheduling and Fiber identity.

## Implicit Ergonomics

For the common case, `useFormStatus()` can implicitly request an owned form status if no parent form status exists.

Render behavior:

1. `useFormStatus()` reads the current parent `HostTransitionContext`.
2. If a parent form is pending, return that status exactly as today.
3. If no parent form is active, record an unresolved owned-host-context dependency on the currently rendering function fiber.
4. Continue rendering normally.
5. During reconciliation of the returned children, if React sees exactly one directly owned `<form>` host fiber, bind the dependency to that form fiber.
6. When the form status changes, schedule the owning function fiber to render.

Directly owned means the `<form>` appears in the returned element tree before crossing another function/class component boundary. This avoids turning owned host context into a general descendant query.

## Ambiguity

If a component calls `useFormStatus()` and directly owns multiple forms, React must not guess.

Development behavior:

- Warn that `useFormStatus()` is ambiguous because the component owns multiple forms.
- Return `NotPending`.
- Suggest the explicit scope API.

Production behavior:

- Return `NotPending`.
- Do not bind implicitly.

If a component calls `useFormStatus()` and owns no form, behavior remains equivalent to today: it reads the parent context if one exists, otherwise returns `NotPending`.

## Explicit Scope API

For ambiguous or advanced cases, add an explicit renderer-owned scope token.

Possible API shape:

```js
function Form() {
  const form = useHostContextScope('form');
  const {pending} = useFormStatus(form);

  return (
    <form unstable_scope={form} action={submit}>
      <button disabled={pending}>Save</button>
    </form>
  );
}
```

The token is opaque. React DOM owns its meaning. React core only tracks the relationship between the token, the owner fiber, and the host fiber that consumes it.

Rules:

- A scope token may be attached to one matching host component per render.
- Attaching a token to the wrong host type warns in development.
- Reusing a token for multiple host instances warns in development.
- `useFormStatus(scope)` reads only that scoped form's status.

This API can remain unstable until a second host use case validates the abstraction.

## Scheduling

When a host resource status changes:

- Existing descendant context propagation continues as today.
- Any owner fibers subscribed through owned host context are scheduled on the same lane as the host status update.
- If the owner re-renders and no longer owns the host fiber, the subscription is detached during reconciliation.

This prevents stale status reads while preserving React's render-before-commit model.

## Fiber Data Model

The implementation can be modeled with two internal structures:

- On the owner function fiber: a list of requested owned host context dependencies.
- On the host fiber: a back-reference set of owner fibers or dependency records that observe its host status.

For `useFormStatus`, the dependency stores:

- host resource kind: `form`,
- optional explicit scope token,
- last bound host fiber,
- last observed status.

The host fiber remains the source of truth for pending form status.

## Server Rendering

During server render, form actions are not pending. `useFormStatus()` already returns `NotPending`.

Owned host context should preserve that behavior:

- No owned host subscriptions are created on the server.
- Implicit self-form status always resolves to `NotPending`.
- Markup output is unchanged.

## Error Handling

Development warnings:

- Multiple implicitly owned forms.
- Explicit scope attached to no host by the end of reconciliation.
- Explicit scope attached to the wrong host type.
- Explicit scope reused by multiple host instances.

Runtime errors should be avoided because the current hook returns `NotPending` outside a form rather than throwing.

## Testing Plan

React DOM tests should cover:

- `useFormStatus()` in the same component as a single returned `<form>`.
- Existing child-component `useFormStatus()` behavior remains unchanged.
- Parent form context wins over owned form context when nested ownership-like shapes appear through components.
- Multiple directly owned forms warn in development and return `NotPending`.
- Explicit scope selects the intended form among multiple forms.
- Scope warnings for wrong host type and duplicate attachment.
- Server rendering returns `NotPending` and does not change markup.

## Risks

- This is a new direction for React dataflow. Naming and documentation must avoid implying ordinary Context can flow upward.
- Implicit binding may be hard to explain if the returned JSX is conditional.
- Owner subscriptions add a new invalidation edge from host fibers back to function fibers.
- The explicit API needs careful naming because `scope` may imply CSS or DOM scoping.

## Recommendation

Implement this in two stages.

Stage 1:

- Internal owned-host-context dependency infrastructure.
- Implicit `useFormStatus()` support for the single directly owned form case.
- Development warnings for ambiguity.

Stage 2:

- Add the explicit scope token API behind an unstable name.
- Use it to resolve multiple-form cases.
- Revisit whether the abstraction should remain form-specific or become a public renderer capability.

