import fbt from 'fbt';

function Foo(props) {
  return (
    <fbt desc="Some text to be translated">
      <fbt:enum
        enum-range={{'0': 'hello', '1': 'goodbye'}}
        value={props.value ? '0' : '1'}
      />{' '}
      <fbt:param name="value">{props.value}</fbt:param>
      {', '}
    </fbt>
  );
}

export const FIXTURE_ENTRYPOINT = {
  fn: Foo,
  params: [{value: 1}],
  sequentialRenders: [{value: 1}, {value: 0}],
};
