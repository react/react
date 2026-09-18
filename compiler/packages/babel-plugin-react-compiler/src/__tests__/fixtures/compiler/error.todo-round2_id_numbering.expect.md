
## Input

```javascript
// Round 2 HIR: ID_NUMBERING_DIFF (12 files)
// Identifier IDs diverge — DeclareContext vs LoadGlobal for component ref param
/**
 * @flow strict-local
 */
export function makeComponentWithOnScroll<
  TElement extends ?HTMLElement = HTMLElement,
>() {
  component Wrapper(ref?: TRefFor<TElement>) {
    const innerOnScroll = useCallback(
      (e: SyntheticEvent<HTMLElement, Event>) => {}
    );
  }
}

```


## Error

```
Unexpected token (7:19)
```
          
      