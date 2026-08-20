function Component(props) {
  const item = useFragment(FRAGMENT, props.item);
  useFreeze(item);

  const count = new MaybeMutable(item);
  return (
    <View>
      <View>
        {<span>Text</span>}
        {<span>{maybeMutate(count)}</span>}
      </View>
    </View>
  );
}
