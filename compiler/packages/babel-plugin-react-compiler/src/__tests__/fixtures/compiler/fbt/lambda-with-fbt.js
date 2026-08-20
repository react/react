import {fbt} from 'fbt';

function Component() {
  const buttonLabel = () => {
    if (!someCondition) {
      return <fbt desc="My label">{'Purchase as a gift'}</fbt>;
    } else if (
      !iconOnly &&
      showPrice &&
      item?.current_gift_offer?.price?.formatted != null
    ) {
      return (
        <fbt desc="Gift button's label">
          {'Gift | '}
          <fbt:param name="price">
            {item?.current_gift_offer?.price?.formatted}
          </fbt:param>
        </fbt>
      );
    } else if (!iconOnly && !showPrice) {
      return <fbt desc="Gift button's label">{'Gift'}</fbt>;
    }
  };

  return (
    <View>
      <Button text={buttonLabel()} />
    </View>
  );
}
