/**
 * Fault tolerance test: two independent errors should both be reported.
 *
 * Error 1 (BuildHIR): `var` declarations are not supported (treated as `let`)
 * Error 2 (InferMutationAliasingEffects): Mutation of frozen props
 */
function Component(props) {
  // Error: var declaration (Todo from BuildHIR)
  var items = props.items;

  // Error: mutating frozen props (detected during inference)
  props.items = [];

  return <div>{items.length}</div>;
}
