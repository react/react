import fbt from 'fbt';

function Component({name, data, icon}) {
  return (
    <Text type="body4">
      <fbt desc="Lorem ipsum">
        <fbt:param name="item author">
          <Text type="h4">{name}</Text>
        </fbt:param>
        <fbt:param name="icon">{icon}</fbt:param>
        <Text type="h4">
          <fbt:param name="item details">{data}</fbt:param>
        </Text>
      </fbt>
    </Text>
  );
}
