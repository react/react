function Component({a, b, cond, items}) {
  try {
    const x = a?.value;
    // items.length is accessed WITHIN the ternary expression - throws if items is null
    const y = cond ? b?.first : items.length;
    const z = x && y;
    return (
      <div>
        {String(x)}-{String(y)}-{String(z)}
      </div>
    );
  } catch {
    return <div>error</div>;
  }
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [
    {
      a: {value: 'A'},
      b: {first: 'B1', second: 'B2'},
      cond: true,
      items: [1, 2, 3],
    },
  ],
  sequentialRenders: [
    {
      a: {value: 'A'},
      b: {first: 'B1', second: 'B2'},
      cond: true,
      items: [1, 2, 3],
    },
    {
      a: {value: 'A'},
      b: {first: 'B1', second: 'B2'},
      cond: true,
      items: [1, 2, 3],
    },
    {
      a: {value: 'A'},
      b: {first: 'B1', second: 'B2'},
      cond: false,
      items: [1, 2],
    },
    {a: null, b: {first: 'B1', second: 'B2'}, cond: true, items: [1, 2, 3]},
    {a: {value: 'A'}, b: null, cond: true, items: [1, 2, 3]}, // b?.first is safe (returns undefined)
    {a: {value: 'A'}, b: {first: 'B1', second: 'B2'}, cond: false, items: null}, // errors because items.length throws when cond=false
    {
      a: {value: ''},
      b: {first: 'B1', second: 'B2'},
      cond: true,
      items: [1, 2, 3, 4],
    },
  ],
};
