import fbt from 'fbt';
import {identity} from 'shared-runtime';

function Component(props) {
  return (
    <span>
      <fbt desc="Title">
        <fbt:plural count={identity(props.count)} name="count" showCount="yes">
          vote
        </fbt:plural>{' '}
        for <fbt:param name="option"> {props.option}</fbt:param>
      </fbt>
      !
    </span>
  );
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{count: 42, option: 'thing'}],
  sequentialRenders: [
    {count: 42, option: 'thing'},
    {count: 42, option: 'thing'},
    {count: 1, option: 'other'},
    {count: 1, option: 'other'},
    {count: 42, option: 'thing'},
    {count: 1, option: 'other'},
    {count: 42, option: 'thing'},
    {count: 1, option: 'other'},
  ],
};
