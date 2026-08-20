let b = 1;

export default function MyApp() {
  const fn = () => {
    b = 2;
  };
  return foo(fn);
}

function foo(fn) {}

export const FIXTURE_ENTRYPOINT = {
  fn: MyApp,
  params: [],
};
