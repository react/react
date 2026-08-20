function useHook(nodeID, condition) {
  const graph = useContext(GraphContext);
  const node = nodeID != null ? graph[nodeID] : null;

  for (const key of Object.keys(node?.fields ?? {})) {
    if (condition) {
      return new Class(node.fields?.[field]);
    }
  }
  return new Class();
}
