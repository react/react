import {useNoAlias} from 'shared-runtime';

function Component(props) {
  const item = {a: props.a};
  const x = useNoAlias(item, () => {
    console.log(props);
  }, [props.a]);
  return [x, item];
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{a: {id: 42}}],
  isComponent: true,
};
