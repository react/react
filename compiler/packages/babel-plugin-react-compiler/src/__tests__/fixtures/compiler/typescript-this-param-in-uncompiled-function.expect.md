
## Input

```javascript
// @expectNothingCompiled @compilationMode:"infer"
export function Decorate() {
  return function (
    _target: object,
    _key: string,
    descriptor: PropertyDescriptor,
  ) {
    const original = descriptor.value;
    descriptor.value = function (this: unknown) {
      return original.apply(this, []);
    };
  };
}

```

## Code

```javascript
// @expectNothingCompiled @compilationMode:"infer"
export function Decorate() {
  return function (
    _target: object,
    _key: string,
    descriptor: PropertyDescriptor,
  ) {
    const original = descriptor.value;
    descriptor.value = function (this: unknown) {
      return original.apply(this, []);
    };
  };
}

```
      
### Eval output
(kind: exception) Fixture not implemented