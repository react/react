// Template literal constant folding uses format_js_number to convert
// numbers to strings. Without the shared implementation, large numbers
// may format incorrectly (e.g. 1e21 as "1e21" instead of "1e+21").

function Component() {
  const x = `value is ${1e21}`;
  return <div>{x}</div>;
}
