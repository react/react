
## Input

```javascript
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


## Error

```
Found 1 error:

Error: Expected a non-reserved identifier name

`this` is a reserved word in JavaScript and cannot be used as an identifier name.
```
          
      