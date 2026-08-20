let b = 1;

export default function MyApp() {
  const fn = () => {
    b = 2;
  };
  return useFoo(fn);
}

function useFoo(fn) {}

export const FIXTURE_ENTRYPOINT = {
  fn: MyApp,
  params: [],
};
