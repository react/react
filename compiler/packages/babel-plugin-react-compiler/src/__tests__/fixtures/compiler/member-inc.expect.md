
## Input

```javascript
//@flow

component Foo() {
  let x = {a: 1};
  x.a++;
  x.a--;
  console.log(++x.a);
  console.log(x.a++);

  console.log(x.a);
  let y = x.a++;
  console.log(y);
  console.log(x.a);

  console.log((++x.a).toString(), (x.a++).toString(), x.a);
}

export const FIXTURE_ENTRYPOINT = {
  fn: Foo,
  params: [],
};

```

## Code

```javascript
function Foo() {
  const x = { a: 1 };
  x.a = x.a + 1;
  x.a = x.a - 1;
  console.log((x.a = x.a + 1));
  const t0 = x.a;
  x.a = t0 + 1;
  console.log(t0);

  console.log(x.a);
  const t1 = x.a;
  x.a = t1 + 1;
  const y = t1;
  console.log(y);
  console.log(x.a);

  const t2 = (x.a = x.a + 1).toString();
  const t3 = x.a;
  x.a = t3 + 1;
  console.log(t2, t3.toString(), x.a);
}

export const FIXTURE_ENTRYPOINT = {
  fn: Foo,
  params: [],
};

```
      
### Eval output
(kind: ok) 
logs: [2,2,3,3,4,'5','5',6]