import {useFragment} from 'shared-runtime';

function Component(props) {
  const user = useFragment(
    graphql`
      fragment F on User {
        name
      }
    `,
    props.user
  );
  return user.name;
}
