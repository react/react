function lower(value) {
  if (value == null) {
    throw new Error('lower: missing value');
  }
  return value.toLowerCase();
}

function upper(value) {
  if (value == null) {
    throw new Error('upper: missing value');
  }
  return value.toUpperCase();
}

function Component({value}) {
  const labels = [];
  switch (value) {
    case null:
      labels.push('empty');
      break;
    case lower(value):
      labels.push('lowercase');
      break;
    case upper(value):
      labels.push('uppercase');
      break;
  }
  return labels;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{value: null}],
};
