function Component({data, fallback}) {
  try {
    // fallback.default is accessed WITHIN the optional chain via nullish coalescing
    const value = data?.nested?.deeply?.value ?? fallback.default;
    return <div>{value}</div>;
  } catch {
    return <div>error</div>;
  }
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [
    {data: {nested: {deeply: {value: 'found'}}}, fallback: {default: 'none'}},
  ],
  sequentialRenders: [
    {data: {nested: {deeply: {value: 'found'}}}, fallback: {default: 'none'}},
    {data: {nested: {deeply: {value: 'found'}}}, fallback: {default: 'none'}},
    {data: {nested: {deeply: {value: 'changed'}}}, fallback: {default: 'none'}},
    {data: {nested: {deeply: null}}, fallback: {default: 'none'}}, // uses fallback.default
    {data: {nested: null}, fallback: {default: 'none'}}, // uses fallback.default
    {data: null, fallback: null}, // errors because fallback.default throws
    {data: {nested: {deeply: {value: 42}}}, fallback: {default: 'none'}},
  ],
};
