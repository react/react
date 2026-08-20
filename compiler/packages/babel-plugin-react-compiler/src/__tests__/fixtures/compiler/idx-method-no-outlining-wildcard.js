// @customMacros:"idx.*.b"

function Component(props) {
  // outlined
  const groupName1 = idx(props, _ => _.group.label);
  // outlined
  const groupName2 = idx.a(props, _ => _.group.label);
  // not outlined
  const groupName3 = idx.a.b(props, _ => _.group.label);
  // not outlined
  const groupName4 = idx.hello_world.b(props, _ => _.group.label);
  // outlined
  const groupName5 = idx.hello_world.b.c(props, _ => _.group.label);
  return (
    <div>
      {groupName1}
      {groupName2}
      {groupName3}
      {groupName4}
      {groupName5}
    </div>
  );
}
