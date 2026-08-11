// Repro for method-call scope alignment range sync: when
// AlignMethodCallScopes merges scopes for a method call and its
// computed property, the updated scope range must be propagated
// to identifier mutable_ranges so later passes see correct ranges.

function Component({items}) {
  const filtered = items.filter(x => x.active);
  const mapped = filtered.map(x => x.name);
  const sorted = mapped.sort();
  return <List items={sorted} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [
    {
      items: [
        {active: true, name: 'a'},
        {active: false, name: 'b'},
      ],
    },
  ],
};
