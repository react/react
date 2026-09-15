const ERROR_PATTERNS = [
  {
    regex: /Cannot read properties of null \(reading '(.+)'\)/,
    type: 'NullDereference',
    suggestion: (match) => `You are trying to access '${match[1]}' on a null object. Ensure the state or prop containing this object is initialized before rendering, or use optional chaining (?.).`
  },
  {
    regex: /Objects are not valid as a React child/,
    type: 'InvalidChild',
    suggestion: () => `You are trying to render an object directly. If you meant to render an array, map over it. If you meant to render a property, access it directly (e.g., {obj.name}).`
  },
  {
    regex: /Invalid hook call/,
    type: 'HookError',
    suggestion: () => `Hooks can only be called inside the body of a function component. Check for mismatched React versions or breaking the Rules of Hooks.`
  }
];

export function analyzeError(errorMessage) {
  for (let pattern of ERROR_PATTERNS) {
    const match = errorMessage.match(pattern.regex);
    if (match) {
      return {
        type: pattern.type,
        suggestion: pattern.suggestion(match)
      };
    }
  }
  return null; // Unknown error
}