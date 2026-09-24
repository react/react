import ReactAlias from 'react';

const Context = ReactAlias.createContext(null);

function Component() {
  const value = ReactAlias.use(Context);
  return <div>{value}</div>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [],
};
