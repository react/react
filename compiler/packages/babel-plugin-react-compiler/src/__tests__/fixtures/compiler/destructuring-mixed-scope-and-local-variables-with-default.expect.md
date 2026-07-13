
## Input

```javascript
import {Stringify, graphql} from 'shared-runtime';

function useFragment(_arg1, _arg2) {
  'use no forget';
  return {
    urls: ['url1', 'url2', 'url3'],
    comments: ['comment1'],
  };
}

function Component(props) {
  const post = useFragment(
    graphql`
      fragment F on T {
        id
      }
    `,
    props.post
  );
  const allUrls = [];
  // `media` and `urls` are exported from the scope that will wrap this code,
  // but `comments` is not (it doesn't need to be memoized, bc the callback
  // only checks `comments.length`)
  // because of the scope, the let declaration for media and urls are lifted
  // out of the scope, and the destructure statement ends up turning into
  // a reassignment, instead of a const declaration. this means we try to
  // reassign `comments` when there's no declaration for it.
  const {media = null, comments = [], urls = []} = post;
  const onClick = e => {
    if (!comments.length) {
      return;
    }
    console.log(comments.length);
  };
  allUrls.push(...urls);
  return <Stringify media={media} allUrls={allUrls} onClick={onClick} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{post: {}}],
  isComponent: true,
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { Stringify, graphql } from "shared-runtime";

function useFragment(_arg1, _arg2) {
  "use no forget";
  return {
    urls: ["url1", "url2", "url3"],
    comments: ["comment1"],
  };
}

function Component(props) {
  const $ = _c(8);
  const post = useFragment(
    graphql`
      fragment F on T {
        id
      }
    `,
    props.post,
  );
  let t0;
  if ($[0] !== post) {
    const allUrls = [];
    const { media: t1, comments: t2, urls: t3 } = post;
    const media = t1 === undefined ? null : t1;
    let t4;
    if ($[2] !== t2) {
      t4 = t2 === undefined ? [] : t2;
      $[2] = t2;
      $[3] = t4;
    } else {
      t4 = $[3];
    }
    const comments = t4;
    let t5;
    if ($[4] !== t3) {
      t5 = t3 === undefined ? [] : t3;
      $[4] = t3;
      $[5] = t5;
    } else {
      t5 = $[5];
    }
    const urls = t5;
    let t6;
    if ($[6] !== comments.length) {
      t6 = (e) => {
        if (!comments.length) {
          return;
        }
        console.log(comments.length);
      };
      $[6] = comments.length;
      $[7] = t6;
    } else {
      t6 = $[7];
    }
    const onClick = t6;
    allUrls.push(...urls);
    t0 = <Stringify media={media} allUrls={allUrls} onClick={onClick} />;
    $[0] = post;
    $[1] = t0;
  } else {
    t0 = $[1];
  }
  return t0;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ post: {} }],
  isComponent: true,
};

```
      
### Eval output
(kind: ok) <div>{"media":null,"allUrls":["url1","url2","url3"],"onClick":"[[ function params=1 ]]"}</div>