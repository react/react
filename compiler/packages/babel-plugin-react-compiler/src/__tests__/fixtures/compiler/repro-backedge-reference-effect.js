import {Stringify} from 'shared-runtime';

function Foo({userIds}) {
  return (
    <Stringify
      fn={() => {
        const arr = [];

        for (const selectedUser of userIds) {
          arr.push(selectedUser);
        }
        return arr;
      }}
      shouldInvokeFns={true}
    />
  );
}

export const FIXTURE_ENTRYPOINT = {
  fn: Foo,
  params: [{userIds: [1, 2, 3]}],
  sequentialRenders: [{userIds: [1, 2, 4]}],
};
