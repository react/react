// @flow
function Component({config}: {config: {[key: string]: unknown}}) {
  const items = [];
  for (const [key, value] of Object.entries(config)) {
    items.push((value: {[key: string]: string}));
  }
  return <List items={items} />;
}
