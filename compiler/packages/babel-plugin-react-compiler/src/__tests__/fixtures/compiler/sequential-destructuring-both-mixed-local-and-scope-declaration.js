import {identity} from 'shared-runtime';

function Component(statusName) {
  // status is local, text is a scope declaration
  const {status, text} = foo(statusName);
  // color is local, font is a scope declaration
  const {color, font} = getStyles(status);
  // bg is a declaration
  const bg = identity(color);
  return (
    <div className={bg}>
      <span className={font}>{[text]}</span>
    </div>
  );
}
function foo(name) {
  return {
    status: `<status>`,
    text: `${name}!`,
  };
}

function getStyles(status) {
  return {
    font: 'comic-sans',
    color: '#657b83',
  };
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: ['Sathya'],
};
