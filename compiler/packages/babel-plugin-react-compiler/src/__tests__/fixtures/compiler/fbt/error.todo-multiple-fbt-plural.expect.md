
## Input

```javascript
import fbt from 'fbt';

/**
 * Forget + fbt inconsistency. Evaluator errors with the following
 *   Found differences in evaluator results
 *   Non-forget (expected):
 *   (kind: ok) 1 rewrite to Rust · 2 months traveling
 *   Forget:
 *   (kind: ok) 1 rewrites to Rust · 2 months traveling
 *
 * The root issue here is that fbt:plural/enum/pronoun read `.start` and `.end` from
 * babel nodes to slice into source strings for some complex dedupe logic
 * (see [_getStringVariationCombinations](https://github.com/facebook/fbt/blob/main/packages/babel-plugin-fbt/src/JSFbtBuilder.js#L297))
 *
 *
 * Since Forget does not add `.start` and `.end` for babel nodes it synthesizes,
 * [getRawSource](https://github.com/facebook/fbt/blob/main/packages/babel-plugin-fbt/src/FbtUtil.js#L666-L673)
 * simply returns the whole source code string. As a result, all fbt nodes dedupe together
 * and _getStringVariationCombinations ends up early exiting (before adding valid candidate values).
 *
 *
 *
 * For fbt:plural tags specifically, the `count` node require that a `.start/.end`
 * (see [code in FbtPluralNode](https://github.com/facebook/fbt/blob/main/packages/babel-plugin-fbt/src/fbt-nodes/FbtPluralNode.js#L87-L90))
 */
function Foo({rewrites, months}) {
  return (
    <fbt desc="Test fbt description">
      <fbt:plural count={rewrites} name="number of rewrites" showCount="yes">
        rewrite
      </fbt:plural>
      to Rust ·
      <fbt:plural count={months} name="number of months" showCount="yes">
        month
      </fbt:plural>
      traveling
    </fbt>
  );
}

export const FIXTURE_ENTRYPOINT = {
  fn: Foo,
  params: [{rewrites: 1, months: 2}],
};

```


## Error

```
Found 1 error:

Todo: Support duplicate fbt tags

Support `<fbt>` tags with multiple `<fbt:plural>` values.

error.todo-multiple-fbt-plural.ts:29:7
  27 |   return (
  28 |     <fbt desc="Test fbt description">
> 29 |       <fbt:plural count={rewrites} name="number of rewrites" showCount="yes">
     |        ^^^^^^^^^^ Multiple `<fbt:plural>` tags found
  30 |         rewrite
  31 |       </fbt:plural>
  32 |       to Rust ·

error.todo-multiple-fbt-plural.ts:33:7
  31 |       </fbt:plural>
  32 |       to Rust ·
> 33 |       <fbt:plural count={months} name="number of months" showCount="yes">
     |        ^^^^^^^^^^ Multiple `<fbt:plural>` tags found
  34 |         month
  35 |       </fbt:plural>
  36 |       traveling
```
          
      