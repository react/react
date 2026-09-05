
## Input

```javascript
function SignedZero({negative}) {
  'use memo';
  let value;
  if (negative) {
    value = -0;
  } else {
    value = 0;
  }
  return 1 / value < 0 ? 'negative' : 'positive';
}

export const FIXTURE_ENTRYPOINT = {
  fn: SignedZero,
  params: [{negative: false}],
  sequentialRenders: [{negative: false}, {negative: true}],
};

```

## Code

```javascript
function SignedZero(t0) {
  "use memo";
  const { negative } = t0;

  let value;
  if (negative) {
    value = -0;
  } else {
    value = 0;
  }

  return 1 / value < 0 ? "negative" : "positive";
}

export const FIXTURE_ENTRYPOINT = {
  fn: SignedZero,
  params: [{ negative: false }],
  sequentialRenders: [{ negative: false }, { negative: true }],
};

```
      
### Eval output
(kind: ok) "positive"
"negative"