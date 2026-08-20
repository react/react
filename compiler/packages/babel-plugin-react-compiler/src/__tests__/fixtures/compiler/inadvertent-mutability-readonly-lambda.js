function Component(props) {
  const [value, setValue] = useState(null);
  // NOTE: this lambda does not capture any mutable values (only the state setter)
  // and thus should be treated as readonly
  const onChange = e => setValue(value => value + e.target.value);

  useOtherHook();

  // x should be independently memoizeable, since foo(x, onChange) cannot modify onChange
  const x = {};
  foo(x, onChange);
  return x;
}
