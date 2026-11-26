
## Input

```javascript
function Component(options) {
  const {title, visible, retries} = options;
  title ??= options.lookup('title');
  visible ||= options.lookup('visible');
  retries &&= options.lookup('retries');
  return [title, visible, retries];
}

```


## Error

```
Found 3 errors:

Todo: Logical assignment to a `const` variable is not supported

error.todo-immutable-fallback-selection.ts:3:2
  1 | function Component(options) {
  2 |   const {title, visible, retries} = options;
> 3 |   title ??= options.lookup('title');
    |   ^^^^^ Logical assignment to a `const` variable is not supported
  4 |   visible ||= options.lookup('visible');
  5 |   retries &&= options.lookup('retries');
  6 |   return [title, visible, retries];

Todo: Logical assignment to a `const` variable is not supported

error.todo-immutable-fallback-selection.ts:4:2
  2 |   const {title, visible, retries} = options;
  3 |   title ??= options.lookup('title');
> 4 |   visible ||= options.lookup('visible');
    |   ^^^^^^^ Logical assignment to a `const` variable is not supported
  5 |   retries &&= options.lookup('retries');
  6 |   return [title, visible, retries];
  7 | }

Todo: Logical assignment to a `const` variable is not supported

error.todo-immutable-fallback-selection.ts:5:2
  3 |   title ??= options.lookup('title');
  4 |   visible ||= options.lookup('visible');
> 5 |   retries &&= options.lookup('retries');
    |   ^^^^^^^ Logical assignment to a `const` variable is not supported
  6 |   return [title, visible, retries];
  7 | }
  8 |
```
          
      