
## Input

```javascript
const Component2 = props => {
  return (
    <ul>
      {props.items.map(item => (
        <li key={item.id}>{item.name}</li>
      ))}
    </ul>
  );
};

export const FIXTURE_ENTRYPOINT = {
  fn: Component2,
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
const Component2 = (props) => {
  const $ = _c(4);
  let t0;
  if ($[0] !== props.items) {
    t0 = props.items.map(_temp);
    $[0] = props.items;
    $[1] = t0;
  } else {
    t0 = $[1];
  }
  let t1;
  if ($[2] !== t0) {
    t1 = <ul>{t0}</ul>;
    $[2] = t0;
    $[3] = t1;
  } else {
    t1 = $[3];
  }
  return t1;
};

export const FIXTURE_ENTRYPOINT = {
  fn: Component2,
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