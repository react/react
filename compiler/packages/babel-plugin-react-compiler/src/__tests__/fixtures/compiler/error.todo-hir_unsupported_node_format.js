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
