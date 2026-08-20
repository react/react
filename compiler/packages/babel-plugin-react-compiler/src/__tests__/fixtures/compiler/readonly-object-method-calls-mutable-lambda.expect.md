
## Input

```javascript
import {useFragment} from 'shared-runtime';

function Component(props) {
  const x = makeObject();
  const user = useFragment(
    graphql`
      fragment Component_user on User {
        name
      }
    `,
    props.user
  );
  const posts = user.timeline.posts.edges.nodes.map(node => {
    x.y = true;
    return <Post post={node} />;
  });
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
  const $ = _c(3);
  const x = makeObject();
  const user = useFragment(
    graphql`
      fragment Component_user on User {
        name
      }
    `,
    props.user,
  );
  const posts = user.timeline.posts.edges.nodes.map((node) => {
    x.y = true;
    return <Post post={node} />;
  });
  let t0;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t0 = {};
    $[0] = t0;
  } else {
    t0 = $[0];
  }
  posts.push(t0);
  const count = posts.length;
  foo(count);
  let t1;
  if ($[1] !== posts) {
    t1 = <>{posts}</>;
    $[1] = posts;
    $[2] = t1;
  } else {
    t1 = $[2];
  }
  return t1;
}

```
      