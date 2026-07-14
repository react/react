
## Input

```javascript
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

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // Round 3: effect read vs capture — v2
// Pattern: variable from ternary → object literal → forEach lambda mutation
// Source: ParseBusinessProfile.js
function useProfile(node) {
  const $ = _c(2);
  let profile;
  if ($[0] !== node) {
    const childNode = node.maybeChild("key");
    const value = childNode ? childNode.contentString() : undefined;
    profile = { key_value: value };
    Object.keys(profile).forEach((key) => {
      if (profile[key] == null) {
        delete profile[key];
      }
    });
    $[0] = node;
    $[1] = profile;
  } else {
    profile = $[1];
  }
  return profile;
}

```
      
### Eval output
(kind: exception) Fixture not implemented