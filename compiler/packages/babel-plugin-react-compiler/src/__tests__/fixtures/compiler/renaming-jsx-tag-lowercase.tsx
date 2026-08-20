import {Stringify, identity, useIdentity} from 'shared-runtime';

function Foo({}) {
  const x = {};
  const y = {};
  useIdentity(0);
  return (
    <>
      <Stringify value={identity(y)} />
      <Stringify value={identity(x)} />
    </>
  );
}

export const FIXTURE_ENTRYPOINT = {
  fn: Foo,
  params: [{}],
};
