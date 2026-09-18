import fbt from 'fbt';

// Minimized from MDCAIGlassesPDPRxOOSBadge.react.js
// Tests that expand_fbt_scope_range syncs identifier mutable_ranges
// after expanding a scope's range (Rust value semantics vs TS shared reference).

function Component({selectedColor, selectedProduct, rxData}) {
  const rxIds = [];
  rxData.forEach(data => data.non_rx_id != null && rxIds.push(data.non_rx_id));

  const otherSize = selectedColor?.matchingProducts
    ?.filter(
      product =>
        product.id != null &&
        product.tags?.get('bridge') === selectedProduct?.tags?.get('bridge')
    )
    .find(
      product =>
        product.tags?.get('size') !== selectedProduct?.tags?.get('size')
    );

  const otherFrameSize = otherSize?.tags?.get('size');
  if (
    otherSize?.id != null &&
    otherFrameSize != null &&
    rxIds.includes(otherSize.id)
  ) {
    return (
      <div>
        {fbt(
          `Only available in ${fbt.param('frame size', otherFrameSize)} size`,
          'Badge text'
        )}
      </div>
    );
  }

  if (rxData.futureData.includes(selectedProduct?.id)) {
    return <div>{fbt('Out of stock', 'Badge text')}</div>;
  }

  return <div>{fbt('Not available', 'Badge text')}</div>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [
    {
      selectedColor: {
        matchingProducts: [
          {
            id: '1',
            tags: new Map([
              ['bridge', 'A'],
              ['size', 'S'],
            ]),
          },
        ],
      },
      selectedProduct: {
        id: '1',
        tags: new Map([
          ['bridge', 'A'],
          ['size', 'M'],
        ]),
      },
      rxData: Object.assign([{non_rx_id: '1'}], {futureData: []}),
    },
  ],
};
