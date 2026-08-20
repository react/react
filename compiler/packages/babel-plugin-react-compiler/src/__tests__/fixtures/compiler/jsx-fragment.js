function Foo(props) {
  return (
    <>
      Hello {props.greeting}{' '}
      <div>
        <>Text</>
      </div>
    </>
  );
}

export const FIXTURE_ENTRYPOINT = {
  fn: Foo,
  params: ['TodoAdd'],
  isComponent: 'TodoAdd',
};
