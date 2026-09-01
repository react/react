
## Input

```javascript
// @expectNothingCompiled @skip
// Passed but should have failed

class ClassComponentWithHook extends React.Component {
  render() {
    React.useState();
  }
}

```

## Code

```javascript
// @expectNothingCompiled @skip
// Passed but should have failed

class ClassComponentWithHook extends React.Component {
  render() {
    React.useState();
  }
}

```
      