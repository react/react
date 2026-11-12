import {Stringify} from 'shared-runtime';

function tag(strings, ...values) {
  return {strings: [...strings], values};
}

function Component({name, count}) {
  const user = {name};
  const message = tag`Hello ${user}, you have ${count} messages`;
  // `tag` may capture `user`, so this mutation is memoized with `message`
  user.count = count;
  return <Stringify message={message} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{name: 'Alice', count: 1}],
  sequentialRenders: [
    {name: 'Alice', count: 1},
    {name: 'Alice', count: 1},
    {name: 'Bob', count: 2},
  ],
};
