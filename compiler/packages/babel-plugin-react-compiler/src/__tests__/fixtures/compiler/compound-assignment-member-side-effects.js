function Component(props) {
  const calls = [];
  const obj = {a: 1, b: 10, nested: {a: 0, b: 0}};
  const getObj = () => {
    calls.push('getObj');
    return obj;
  };
  const keys = ['a', 'b', 'a', 'b'];
  const getKey = () => {
    calls.push('getKey');
    return keys.shift();
  };
  // The object and the computed key must each be evaluated once
  getObj().a += props.value;
  obj[getKey()] *= 2;
  getObj()[getKey()] -= 1;
  getObj().nested[getKey()]++;
  const updated = ++getObj()[getKey()];
  return [obj, updated, calls];
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{value: 3}],
};
