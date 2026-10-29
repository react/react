function useFoo() {
  return 1;
}

function Component() {
  return <Child foo={useFoo} />;
}
