// @compilationMode:"infer"
import {useState} from 'react';
const wrap = (...x) => x[x.length - 1];
const useThing = () => 1;
const Foo = wrap(() => {
  const [s, setS] = useState(0);
  return <div onClick={() => setS(1)}>{s}</div>;
});
const Bar = wrap(useThing(), function () {
  const [s] = useState(0);
  return <span>{s}</span>;
});
const baz = wrap(() => {
  const [s] = useState(0);
  return <span>{s}</span>;
});
export const FIXTURE_ENTRYPOINT = {fn: Foo, params: [{}]};
