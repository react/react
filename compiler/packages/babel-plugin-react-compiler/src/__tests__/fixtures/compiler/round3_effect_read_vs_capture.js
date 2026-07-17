// Round 3: InferMutationAliasingRanges — location difference cascading to effect/reactive diffs
// Root cause: loc diff at statement level (e.g., 26:8-26:16 vs 26:2-26:22)
// This propagates into effect annotation (read vs capture) and reactive flag diffs
// Frontier: InferMutationAliasingRanges pass
// Source: ParseBusinessProfile.js, EditorAdgroup...PluginCommon.js
function useParseProfile(node) {
  Object.keys(profile).forEach(key => {});
  const commands = [];
  node.forEachChildWithTag('command', commandNode => {
    commands.push({name, description});
  });
}
