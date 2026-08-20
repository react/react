const {mutate} = require('shared-runtime');

function Component(props) {
  const object = {};
  // We optimistically assume function calls within callbacks don't mutate (unless the function
  // is known to be called during render), so this should get memoized
  const onClick = () => {
    mutate(object);
  };
  return <Foo callback={onClick}>{props.children}</Foo>;
}

function Foo({children}) {
  return children;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{children: <div>Hello</div>}],
};
