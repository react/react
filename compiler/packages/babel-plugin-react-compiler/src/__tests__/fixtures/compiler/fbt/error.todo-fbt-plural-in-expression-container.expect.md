
## Input

```javascript
// @compilationMode(infer)
function Component(props) {
  return (
    <fbt desc="test">
      <fbt:plural count={props.count} many="items" showCount="yes">
        item
      </fbt:plural>
      <fbt:param name="nested">
        {props.showAlt ? (
          <fbt desc="nested">
            <fbt:plural count={props.altCount} many="things">
              thing
            </fbt:plural>
          </fbt>
        ) : null}
      </fbt:param>
    </fbt>
  );
}

```


## Error

```
Found 1 error:

Todo: Support duplicate fbt tags

Support `<fbt>` tags with multiple `<fbt:plural>` values.

error.todo-fbt-plural-in-expression-container.ts:5:7
  3 |   return (
  4 |     <fbt desc="test">
> 5 |       <fbt:plural count={props.count} many="items" showCount="yes">
    |        ^^^^^^^^^^ Multiple `<fbt:plural>` tags found
  6 |         item
  7 |       </fbt:plural>
  8 |       <fbt:param name="nested">

error.todo-fbt-plural-in-expression-container.ts:11:13
   9 |         {props.showAlt ? (
  10 |           <fbt desc="nested">
> 11 |             <fbt:plural count={props.altCount} many="things">
     |              ^^^^^^^^^^ Multiple `<fbt:plural>` tags found
  12 |               thing
  13 |             </fbt:plural>
  14 |           </fbt>
```
          
      