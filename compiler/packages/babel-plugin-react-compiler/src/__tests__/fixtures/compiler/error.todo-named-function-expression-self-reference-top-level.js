const Component = function Self() {
  return <div onClick={() => consume(Self)} />;
};
