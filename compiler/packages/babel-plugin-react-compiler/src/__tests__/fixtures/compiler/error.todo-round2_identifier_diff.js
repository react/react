// Round 2 HIR: IDENTIFIER_DIFF (11 files)
// Extra/different context identifiers — class components with this/setState
/**
 * @flow strict-local
 */
export default function withRemountOnChange<OuterProps extends {}>(
  shouldRemount: () => boolean
): () => React.ComponentType<OuterProps> {
  return function withRemountOnChangeInner(WrappedComponent) {
    return class Wrapper extends React.Component<OuterProps, WrapperState> {
      static displayName: ?string = `withRemountOnChange(${getDisplayName()})`;
      state: WrapperState = {};
      componentDidUpdate(prevProps: OuterProps, prevState: WrapperState) {
        if (shouldRemount()) {
          this.setState(({keyId}) => {});
        }
      }
      render(): React.MixedElement {}
    };
  };
}
