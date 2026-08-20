let b = 1;

export default function useMyHook() {
  const fn = () => {
    b = 2;
  };
  return fn;
}

export const FIXTURE_ENTRYPOINT = {
  fn: useMyHook,
  params: [],
};
