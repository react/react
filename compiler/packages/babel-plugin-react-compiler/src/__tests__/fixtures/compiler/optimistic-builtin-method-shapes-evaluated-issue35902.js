// @enableOptimisticBuiltinMethodShapes

/**
 * Evaluated regression test for https://github.com/facebook/react/issues/35902
 *
 * Runtime companion to
 * optimistic-builtin-method-shapes-unknown-receiver-map-issue35902 (a
 * compile-snapshot-only fixture). Here the sprout harness actually executes
 * both the original and the compiled output and asserts identical rendered
 * results across a sequence of re-renders, proving the flag-on code is
 * semantically correct.
 *
 * `expensiveProcessing` is defined module-locally (not imported from
 * shared-runtime) so its return value keeps an UNKNOWN type -- a typed import
 * would give the `.map` receiver a known shape and defeat the flag path under
 * test. With @enableOptimisticBuiltinMethodShapes the unknown receiver's `.map`
 * resolves to the builtin Array shape, so calling `.map` does not extend the
 * receiver's mutable range into the `onClick`-capturing `handleClick` callback.
 * As a result `expensiveProcessing(data)` lands in its own reactive scope keyed
 * only on `data` and does not re-run when only `onClick` changes.
 *
 * The sequentialRenders below exercise re-renders where only the non-data input
 * (`onClick` identity) changes with a stable `data` reference, then re-renders
 * where `data` itself changes.
 */
import {Stringify} from 'shared-runtime';

function expensiveProcessing(data) {
  return data.map(value => ({id: value}));
}

function ExpensiveComponent({data, onClick}) {
  const processedData = expensiveProcessing(data);

  const handleClick = item => {
    onClick(item.id);
  };

  return (
    <div>
      {processedData.map(item => (
        <Stringify
          key={item.id}
          id={item.id}
          onClick={() => handleClick(item)}
        />
      ))}
    </div>
  );
}

const DATA1 = [1, 2, 3];
const DATA2 = [4, 5];
const onClickA = id => id;
const onClickB = id => id;

export const FIXTURE_ENTRYPOINT = {
  fn: ExpensiveComponent,
  params: [{data: DATA1, onClick: onClickA}],
  sequentialRenders: [
    // initial
    {data: DATA1, onClick: onClickA},
    // same data reference, only the non-data input (onClick identity) changes
    {data: DATA1, onClick: onClickB},
    // same data reference and same onClick: nothing changes
    {data: DATA1, onClick: onClickB},
    // data changes, onClick held constant
    {data: DATA2, onClick: onClickB},
    // same data reference, onClick identity changes
    {data: DATA2, onClick: onClickA},
  ],
};
