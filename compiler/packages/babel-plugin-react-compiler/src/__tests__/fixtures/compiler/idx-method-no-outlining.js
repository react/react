// @customMacros:"idx.a"

function Component(props) {
  // outlined
  const groupName1 = idx(props, _ => _.group.label);
  // not outlined
  const groupName2 = idx.a(props, _ => _.group.label);
  // outlined
  const groupName3 = idx.a.b(props, _ => _.group.label);
  return (
    <div>
      {groupName1}
      {groupName2}
      {groupName3}
    </div>
  );
}
