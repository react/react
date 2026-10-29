const useFoo = () => 1;

function Component(props) {
  if (props.cond) {
    useFoo();
  }
  return null;
}
