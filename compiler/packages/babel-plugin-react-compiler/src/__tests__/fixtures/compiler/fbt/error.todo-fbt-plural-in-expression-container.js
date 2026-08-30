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
