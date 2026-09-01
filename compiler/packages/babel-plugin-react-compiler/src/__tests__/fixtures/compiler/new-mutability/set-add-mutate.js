// @enableNewMutationAliasingModel
function useHook({el1, el2}) {
  const s = new Set();
  const arr = makeArray(el1);
  s.add(arr);
  // Mutate after store
  arr.push(el2);

  s.add(makeArray(el2));
  return s.size;
}
