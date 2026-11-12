
## Input

```javascript
// HIR Pattern: JSXTEXT_NBSP_ENCODING (29 files, 9%)
// TS renders &nbsp; as " ", Rust renders as "\u{a0}"

/**
 * @flow strict-local
 */
export default component HeadlineWithAddOn() {
  return (
    <Text>
      <Row>
        <RowItem>
          <Row verticalAlign="center">
            <RowItem xstyle={styles.nonBreakingSpace}>&nbsp;</RowItem>
          </Row>
        </RowItem>
      </Row>
    </Text>
  );
}

```


## Error

```
Missing semicolon. (7:24)
```
          
      