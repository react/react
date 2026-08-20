function component(a) {
  let y = function () {
    m(x);
  };

  let x = {a};
  m(x);
  return y;
}

function m(x) {}

export const FIXTURE_ENTRYPOINT = {
  fn: component,
  params: [{name: 'Jason'}],
};
