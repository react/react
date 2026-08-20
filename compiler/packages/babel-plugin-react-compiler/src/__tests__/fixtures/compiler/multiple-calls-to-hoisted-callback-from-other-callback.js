import {useState} from 'react';

function Component(props) {
  const [_state, setState] = useState();
  const a = () => {
    return b();
  };
  const b = () => {
    return (
      <>
        <div onClick={() => onClick(true)}>a</div>
        <div onClick={() => onClick(false)}>b</div>
      </>
    );
  };
  const onClick = value => {
    setState(value);
  };

  return <div>{a()}</div>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{}],
};
