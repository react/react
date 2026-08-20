import {useActionState} from 'react';

function Component() {
  const [actionState, dispatchAction] = useActionState();
  const onSubmitAction = () => {
    dispatchAction();
  };
  return <Foo onSubmitAction={onSubmitAction} />;
}

function Foo() {}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [],
};
