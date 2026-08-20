import fbt from 'fbt';

/**
 * Note that fbt whitespace rules apply to the entire fbt subtree,
 * not just direct children of fbt elements.
 * (e.g. here, the JSXText children of the span element also use
 * fbt whitespace rules)
 */

function Foo(props) {
  return (
    <fbt desc={'Dialog to show to user'}>
      <span key={props.name}>
        <fbt:param name="user name really long description for prettier">
          {props.name}
        </fbt:param>
        !
      </span>
    </fbt>
  );
}

export const FIXTURE_ENTRYPOINT = {
  fn: Foo,
  params: [{name: 'Jason'}],
};
