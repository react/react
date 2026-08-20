function Test() {
  const obj = {
    21: 'dimaMachina',
  };
  // Destructuring assignment
  const {21: myVar} = obj;
  return (
    <div>
      {obj[21]}
      {myVar}
    </div>
  );
}

export const FIXTURE_ENTRYPOINT = {
  fn: Test,
  params: [{}],
};
