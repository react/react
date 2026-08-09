
## Input

```javascript
// Pattern 1b: shapeId null→generated + return Type→Primitive
// Test with forEach callback
// Divergence: TS has shapeId:null, return:Type(53); Rust has shapeId:"<generated_0>", return:Primitive

describe('equalsIterable', () => {
  const TEST_CASES: Array<{}> = [];
  TEST_CASES.forEach(testCase => {
    it(testCase.name, () => {
      expect(equalsIterable(mapOne, mapTwo, compareKeyValuePair)).toBe();
    });
  });
});

```

## Code

```javascript
// Pattern 1b: shapeId null→generated + return Type→Primitive
// Test with forEach callback
// Divergence: TS has shapeId:null, return:Type(53); Rust has shapeId:"<generated_0>", return:Primitive

describe("equalsIterable", () => {
  const TEST_CASES = [];
  TEST_CASES.forEach(_temp2);
});
function _temp() {
  expect(equalsIterable(mapOne, mapTwo, compareKeyValuePair)).toBe();
}
function _temp2(testCase) {
  it(testCase.name, _temp);
}

```
      