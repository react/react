function Component() {
  const {result} = useConditionalHook?.() ?? {};
  return result;
}
