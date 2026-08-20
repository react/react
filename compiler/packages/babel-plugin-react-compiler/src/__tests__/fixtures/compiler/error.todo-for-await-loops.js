async function Component({items}) {
  const x = [];
  for await (const item of items) {
    x.push(item);
  }
  return x;
}
