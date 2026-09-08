// When multiple functions in the same file generate UIDs, they should not
// collide. Babel's generateUid accumulates names at the program scope, so
// the second function's UIDs start where the first function left off.

function Component1({items}) {
  const mapped = items.map(x => x.id);
  return <div>{mapped}</div>;
}

function Component2({items}) {
  const mapped = items.map(x => x.name);
  return <span>{mapped}</span>;
}

export {Component1, Component2};
