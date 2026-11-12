
## Input

```javascript
// Pattern 2: shapeId null→generated + return Type→Object{BuiltInArray}
// Component with Array.splice
// Divergence: TS has shapeId:null, return:Type(75); Rust has shapeId:"<generated_1>", return:Object{BuiltInArray}

/**
 * @flow strict-local
 */
const styles = stylex.create({
  liftCardsContent: {},
});
export default component LayoutRow() {
  if (hidden === true) {
  }
  const children = [];
  React.Children.forEach();
  return (
    <Layout className={joinClasses(className, cx('styles/cards/row'))}>
      <LayoutColumn className={cx({})}>{children.splice(0, 1)}</LayoutColumn>
      <FillColumn {...stylex.props(styles.liftCardsContent)}></FillColumn>
    </Layout>
  );
}

```


## Error

```
Missing semicolon. (11:24)
```
          
      