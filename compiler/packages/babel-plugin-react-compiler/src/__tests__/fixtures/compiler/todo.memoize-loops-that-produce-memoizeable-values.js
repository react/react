function useHook(nodeID, condition) {
  const graph = useContext(GraphContext);
  const node = nodeID != null ? graph[nodeID] : null;

  // (2) Instead we can create a scope around the loop since the loop produces an escaping value
  let value;
  for (const key of Object.keys(node?.fields ?? {})) {
    if (condition) {
      // (1) We currently create a scope just for this instruction, then later prune the scope because
      // it's inside a loop
      value = new Class(node.fields?.[field]);
      break;
    }
  }
  return value;
}
