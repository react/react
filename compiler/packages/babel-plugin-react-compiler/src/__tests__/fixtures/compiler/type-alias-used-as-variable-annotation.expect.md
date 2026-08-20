
## Input

```javascript
// @enableAssumeHooksFollowRulesOfReact @enableTransitivelyFreezeFunctionExpressions
type Bar = string;
function TypeAliasUsedAsVariableAnnotation() {
  type Foo = Bar;
  const fun = f => {
    let g: Foo = f;
    console.log(g);
  };
  fun('hello, world');
}

export const FIXTURE_ENTRYPOINT = {
  fn: TypeAliasUsedAsVariableAnnotation,
  params: [],
};

```

## Code

```javascript
// @enableAssumeHooksFollowRulesOfReact @enableTransitivelyFreezeFunctionExpressions
type Bar = string;
function TypeAliasUsedAsVariableAnnotation() {
  const fun = _temp;

  fun("hello, world");
}
function _temp(f) {
  const g = f;
  console.log(g);
}

export const FIXTURE_ENTRYPOINT = {
  fn: TypeAliasUsedAsVariableAnnotation,
  params: [],
};

```
      
### Eval output
(kind: ok) 
logs: ['hello, world']