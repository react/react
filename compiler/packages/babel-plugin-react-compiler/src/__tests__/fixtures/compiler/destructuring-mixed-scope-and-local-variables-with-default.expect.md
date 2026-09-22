
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
  const $ = _c(9);
  let t0;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t0 = graphql`
      fragment F on T {
        id
      }
    `;
    $[0] = t0;
  } else {
    t0 = $[0];
  }
  const post = useFragment(t0, props.post);
  let t1;
  if ($[1] !== post) {
    const allUrls = [];
    const { media: t2, comments: t3, urls: t4 } = post;
    const media = t2 === undefined ? null : t2;
    let t5;
    if ($[3] !== t3) {
      t5 = t3 === undefined ? [] : t3;
      $[3] = t3;
      $[4] = t5;
    } else {
      t5 = $[4];
    }
    const comments = t5;
    let t6;
    if ($[5] !== t4) {
      t6 = t4 === undefined ? [] : t4;
      $[5] = t4;
      $[6] = t6;
    } else {
      t6 = $[6];
    }
    const urls = t6;
    let t7;
    if ($[7] !== comments.length) {
      t7 = (e) => {
        if (!comments.length) {
          return;
        }
        console.log(comments.length);
      };
      $[7] = comments.length;
      $[8] = t7;
    } else {
      t7 = $[8];
    }
    const onClick = t7;
    allUrls.push(...urls);
    t1 = <Stringify media={media} allUrls={allUrls} onClick={onClick} />;
    $[1] = post;
    $[2] = t1;
  } else {
    t1 = $[2];
  }
  return t1;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ post: {} }],
  isComponent: true,
};

```
      
### Eval output
(kind: ok) <div>{"media":null,"allUrls":["url1","url2","url3"],"onClick":"[[ function params=1 ]]"}</div>