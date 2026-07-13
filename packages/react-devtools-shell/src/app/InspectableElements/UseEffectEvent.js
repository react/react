import * as React from 'react';

const {useState, useEffect} = React;
const useEffectEvent =
  React.useEffectEvent || React.experimental_useEffectEvent;

export default function UseEffectEvent(): React.Node {
  return (
    <>
      <SingleHookCase />
      <HookTreeCase />
    </>
  );
}

function SingleHookCase() {
  const onClick = useEffectEvent(() => {});

  return <div onClick={onClick} />;
}

function useCustomHook() {
  const [state, setState] = useState();
  const onClick = useEffectEvent(() => {});
  useEffect(() => {});

  return [state, setState, onClick];
}

function HookTreeCase() {
  const onClick = useCustomHook();

  return <div onClick={onClick} />;
}
