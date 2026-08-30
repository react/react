// Round 3: effect read vs capture — v2
// Pattern: variable from ternary → object literal → forEach lambda mutation
// Source: ParseBusinessProfile.js
function useProfile(node) {
  const childNode = node.maybeChild('key');
  const value = childNode ? childNode.contentString() : undefined;
  const profile = {
    key_value: value,
  };
  Object.keys(profile).forEach(key => {
    if (profile[key] == null) {
      delete profile[key];
    }
  });
  return profile;
}
