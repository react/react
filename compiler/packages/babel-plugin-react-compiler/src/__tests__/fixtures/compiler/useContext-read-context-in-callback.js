import {createContext, useContext} from 'react';

const FooContext = createContext({current: null});

function Component(props) {
  const foo = useContext(FooContext);
  // This function should be memoized since it is only reading the context value
  const onClick = () => {
    console.log(foo.current);
  };
  return <div onClick={onClick}>{props.children}</div>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{children: <div>Hello</div>}],
};
