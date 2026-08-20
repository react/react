// @flow @enableAssumeHooksFollowRulesOfReact
function Component({label, highlightedItem}) {
  const serverTime = useServerTime();
  const highlight = new Highlight(highlightedItem);

  const time = serverTime.get();
  // subtle bit here: the binary expression infers the result of the call
  // as a primitive and not needing memoization. the logical is necessary
  // because without it there are no intermediate scopes which observe
  // the result of the binary expression, so its memoization can be pruned
  const timestampLabel = time / 1000 || label;

  return (
    <>
      {highlight.render()}
      {timestampLabel}
    </>
  );
}

function useServerTime() {
  'use no forget';

  return {
    get() {
      return 42000; // would be a constant value from the server
    },
  };
}

class Highlight {
  constructor(value) {
    this.value = value;
  }

  render() {
    return this.value;
  }
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{label: '<unused>', highlightedItem: 'Seconds passed: '}],
};
