
## Input

```javascript
import {useFragment} from 'shared-runtime';

function Component(props) {
  const user = useFragment(
    graphql`
      fragment Component_user on User {
        name
      }
    `,
    props.user
  );
  const posts = user.timeline.posts.edges.nodes.map(node => (
    <Post post={node} />
  ));
  posts.push({});
  const count = posts.length;
  foo(count);
  return <>{posts}</>;
}

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { useFragment } from "shared-runtime";

function Component(props) {
  const $ = _c(5);
  const user = useFragment(
    graphql`
      fragment Component_user on User {
        name
      }
    `,
    props.user,
  );
  let posts;
  if ($[0] !== user.timeline.posts.edges.nodes) {
    posts = user.timeline.posts.edges.nodes.map(_temp);
    let t0;
    if ($[2] === Symbol.for("react.memo_cache_sentinel")) {
      t0 = {};
      $[2] = t0;
    } else {
      t0 = $[2];
    }
    posts.push(t0);
    $[0] = user.timeline.posts.edges.nodes;
    $[1] = posts;
  } else {
    posts = $[1];
  }
  const count = posts.length;
  foo(count);
  let t0;
  if ($[3] !== posts) {
    t0 = <>{posts}</>;
    $[3] = posts;
    $[4] = t0;
  } else {
    t0 = $[4];
  }
  return t0;
}
function _temp(node) {
  return <Post post={node} />;
}

```
      