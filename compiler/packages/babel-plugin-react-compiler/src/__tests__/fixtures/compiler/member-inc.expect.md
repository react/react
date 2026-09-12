
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
  let t0 = x.a;
  t0++;
  x.a = t0;
  let t1 = x.a;
  t1--;
  x.a = t1;
  let t2 = x.a;
  const t3 = ++t2;
  x.a = t2;
  console.log(t3);
  let t4 = x.a;
  const t5 = t4++;
  x.a = t4;
  console.log(t5);

  console.log(x.a);
  let t6 = x.a;
  const t7 = t6++;
  x.a = t6;
  const y = t7;
  console.log(y);
  console.log(x.a);

  let t8 = x.a;
  const t9 = ++t8;
  x.a = t8;
  const t10 = t9.toString();
  let t11 = x.a;
  const t12 = t11++;
  x.a = t11;
  console.log(t10, t12.toString(), x.a);
}

export const FIXTURE_ENTRYPOINT = {
  fn: Foo,
  params: [],
};

```
      
### Eval output
(kind: ok) 
logs: [2,2,3,3,4,'5','5',6]