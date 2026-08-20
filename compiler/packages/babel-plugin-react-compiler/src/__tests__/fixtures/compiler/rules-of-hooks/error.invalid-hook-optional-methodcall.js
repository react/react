function Component() {
  const {result} = Module.useConditionalHook?.() ?? {};
  return result;
}
