// Repro for fbt scope range sync: when expandFbtScopeRange modifies
// scope.range.start, identifier mutable_ranges must be synced so
// MergeOverlappingReactiveScopesHIR can detect the overlap.
import fbt from 'fbt';

function Component({size, icon}) {
  return (
    <Badge icon={icon}>
      {fbt(
        `Available in ${fbt.param('size', size)} only`,
        'Badge text with dynamic param'
      )}
    </Badge>
  );
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{size: 'Large', icon: 'rx'}],
};
