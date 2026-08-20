import {useFragment} from 'shared-runtime';

function Component(props) {
  const item = useFragment(
    graphql`
      fragment F on T {
        id
      }
    `,
    props.item
  );
  return item.items?.map(item => renderItem(item)) ?? [];
}
