// @flow @enableNewMutationAliasingModel

import fbt from 'fbt';

component Component() {
  const sections = Object.keys(items);

  for (let i = 0; i < sections.length; i += 3) {
    chunks.push(
      sections.slice(i, i + 3).map(section => {
        return <Child />;
      })
    );
  }

  return <Child />;
}
