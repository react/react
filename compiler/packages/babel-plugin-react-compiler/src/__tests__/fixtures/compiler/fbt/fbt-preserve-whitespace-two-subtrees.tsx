import fbt from 'fbt';

function Foo({name1, name2}) {
  return (
    <fbt desc="Text that is displayed when two people accepts the user's pull request.">
      <fbt:param name="user1">
        <span key={name1}>
          <b>{name1}</b>
        </span>
      </fbt:param>
      and
      <fbt:param name="user2">
        <span key={name2}>
          <b>{name2}</b>
        </span>
      </fbt:param>
      accepted your PR!
    </fbt>
  );
}

export const FIXTURE_ENTRYPOINT = {
  fn: Foo,
  params: [{name1: 'Mike', name2: 'Jan'}],
};
