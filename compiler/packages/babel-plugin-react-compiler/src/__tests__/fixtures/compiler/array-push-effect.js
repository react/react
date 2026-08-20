// arrayInstance.push should have the following effects:
//  - read on all args (rest parameter)
//  - mutate on receiver
function Component(props) {
  const x = foo(props.x);
  const y = {y: props.y};
  const arr = [];
  arr.push({});
  arr.push(x, y);
  return arr;
}
