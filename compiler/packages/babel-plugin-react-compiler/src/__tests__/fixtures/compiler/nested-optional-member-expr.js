// We should codegen nested optional properties correctly
// (i.e. placing `?` in the correct PropertyLoad)
function Component(props) {
  let x = foo(props.a?.b.c.d);
  return x;
}
