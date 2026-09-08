function Component() {
  return (function () {
    function Inner() {
      return <div onClick={() => null} />;
    }
    return <Inner />;
  })();
}
