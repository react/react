
## Input

```javascript
function Component(props) {
  return <View {...props} />;
}

const View = React.memo(({items}) => {
  return (
    <ul>
      {items.map(item => (
        <li key={item.id}>{item.name}</li>
      ))}
    </ul>
  );
});

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [
    {
      items: [
        {id: 2, name: 'foo'},
        {id: 3, name: 'bar'},
      ],
    },
  ],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
function Component(props) {
  const $ = _c(2);
  let t0;
  if ($[0] !== props) {
    t0 = <View {...props} />;
    $[0] = props;
    $[1] = t0;
  } else {
    t0 = $[1];
  }
  return t0;
}

const View = React.memo((t0) => {
  const $ = _c(4);
  const { items } = t0;
  let t1;
  if ($[0] !== items) {
    t1 = items.map(_temp);
    $[0] = items;
    $[1] = t1;
  } else {
    t1 = $[1];
  }
  let t2;
  if ($[2] !== t1) {
    t2 = <ul>{t1}</ul>;
    $[2] = t1;
    $[3] = t2;
  } else {
    t2 = $[3];
  }
  return t2;
});

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [
    {
      items: [
        { id: 2, name: "foo" },
        { id: 3, name: "bar" },
      ],
    },
  ],
};
function _temp(item) {
  return <li key={item.id}>{item.name}</li>;
}

```
      
### Eval output
(kind: ok) <ul><li>foo</li><li>bar</li></ul>