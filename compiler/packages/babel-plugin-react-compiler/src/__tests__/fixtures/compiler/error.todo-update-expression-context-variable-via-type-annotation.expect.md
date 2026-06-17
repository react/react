
## Input

```javascript
// @flow @compilationMode(infer)
function Component(props: {data: Array<[string, mixed]>}) {
  let id = 0;
  for (const [key, value] of props.data) {
    const item = {
      key,
      id: '' + id++,
    };
  }
  const getIndex = ((): ((id: string) => number) => {
    return (id: string): number => 0;
  })();
  return <div />;
}

```


## Error

```
Found 1 error:

Todo: (BuildHIR::lowerExpression) Handle UpdateExpression to variables captured within lambdas.

   5 |     const item = {
   6 |       key,
>  7 |       id: '' + id++,
     |                ^^^^ (BuildHIR::lowerExpression) Handle UpdateExpression to variables captured within lambdas.
   8 |     };
   9 |   }
  10 |   const getIndex = ((): ((id: string) => number) => {
```
          
      