import {Stringify} from 'shared-runtime';

function Repro(props) {
  const MY_CONST = -2;
  return <Stringify>{props.arg - MY_CONST}</Stringify>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Repro,
  params: [
    {
      arg: 3,
    },
  ],
};
