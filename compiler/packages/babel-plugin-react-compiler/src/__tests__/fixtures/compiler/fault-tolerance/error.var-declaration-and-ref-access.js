// @validateRefAccessDuringRender
/**
 * Fault tolerance test: two independent errors should both be reported.
 *
 * Error 1 (BuildHIR): `var` declarations are not supported (treated as `let`)
 * Error 2 (ValidateNoRefAccessInRender): reading ref.current during render
 */
function Component() {
  const ref = useRef(null);

  // Error: var declaration (Todo from BuildHIR)
  var items = [1, 2, 3];

  // Error: reading ref during render
  const value = ref.current;

  return (
    <div>
      {value}
      {items.length}
    </div>
  );
}
