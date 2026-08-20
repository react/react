import {Stringify} from 'shared-runtime';

function Component({foo}) {
  let bar = foo.bar;
  return (
    <Stringify
      handler={() => {
        foo = true;
      }}
    />
  );
}
