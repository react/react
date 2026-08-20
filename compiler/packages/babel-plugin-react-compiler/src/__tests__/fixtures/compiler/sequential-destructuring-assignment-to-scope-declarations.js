import {identity} from 'shared-runtime';

function Component(statusName) {
  const {status, text} = foo(statusName);
  const {bg, color} = getStyles(status);
  return (
    <div className={identity(bg)}>
      <span className={identity(color)}>{[text]}</span>
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
    bg: '#eee8d5',
    color: '#657b83',
  };
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: ['Mofei'],
};
