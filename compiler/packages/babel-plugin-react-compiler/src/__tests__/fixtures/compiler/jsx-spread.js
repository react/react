function Component(props) {
  return (
    <Component {...props} {...{bar: props.cond ? props.foo : props.bar}} />
  );
}
