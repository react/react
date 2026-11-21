import * as React from 'react';
import {useState} from 'react';
import {Stringify} from 'shared-runtime';

function Component() {
  const [namespaceValue] = React!.useState(1);
  const [namedValue] = useState!(2);
  return <Stringify namespaceValue={namespaceValue} namedValue={namedValue} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [],
};
