
## Input

```javascript
// HIR Pattern: UNSUPPORTED_NODE_FORMAT (186 files, 56%)
// UnsupportedNode: TS includes type:"Import", Rust omits it
// Also: error reason text differs

const ConfirmationCodeInput = React.lazy(
  () => import('ConfirmationCodeInput.react')
) as React.ComponentType<React.ElementConfig<ConfirmationCodeInputType>>;
export const examples = [
  {
    render(): React.MixedElement {
      return (
        <ConfirmationCodeInput
          helperText={isCompleted && `Your code entry is completed: ${value}`}
          label={fbt()}
        />
      );
    },
  },
];

```


## Error

```
Found 1 error:

Todo: (BuildHIR::lowerExpression) Handle Import expressions

error.todo-hir_unsupported_node_format.ts:6:8
  4 |
  5 | const ConfirmationCodeInput = React.lazy(
> 6 |   () => import('ConfirmationCodeInput.react')
    |         ^^^^^^ (BuildHIR::lowerExpression) Handle Import expressions
  7 | ) as React.ComponentType<React.ElementConfig<ConfirmationCodeInputType>>;
  8 | export const examples = [
  9 |   {
```
          
      