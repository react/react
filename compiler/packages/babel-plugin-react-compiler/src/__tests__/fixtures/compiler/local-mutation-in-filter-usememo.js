import React from 'react';

export function Component({items}) {
  const stuff = React.useMemo(() => {
    let isCool = false;
    const someItems = items.filter(cause => {
      if (cause.foo) {
        isCool = true;
      }
      return true;
    });

    if (someItems.length > 0) {
      return {someItems, isCool};
    }
  }, [items]);
  return <div>{stuff?.someItems.length}</div>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{items: [{foo: true}, {foo: false}]}],
};
