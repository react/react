/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

function ignoreStrings(
  methodName: string,
  stringsToIgnore: Array<string>,
): void {
  // $FlowFixMe[prop-missing] index access only allowed for objects with index keys
  console[methodName] = (...args: $ReadOnlyArray<mixed>) => {
    const maybeString = args[0];
    if (typeof maybeString === 'string') {
      for (let i = 0; i < stringsToIgnore.length; i++) {
        if (maybeString.startsWith(stringsToIgnore[i])) {
          return;
        }
      }
    }

    // --- ADDED FIX START: Intercept component stacks for source mapping ---
    if (methodName === 'error') {
      const lastArg = args[args.length - 1];
      if (typeof lastArg === 'string' && lastArg.includes('\n    in ')) {
        resolveSourceMap(lastArg).then(resolvedStack => {
          if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
            window.__REACT_DEVTOOLS_GLOBAL_HOOK__.emit('resolvedErrorStack', resolvedStack);
          }
        });
      }
    }
    // --- ADDED FIX END ---

    
    // HACKY In the test harness, DevTools overrides the parent window's console.
    // Our test app code uses the iframe's console though.
    // To simulate a more accurate end-to-end environment,
    // the shell's console patching should pass through to the parent override methods.
    window.parent.console[methodName](...args);
  };
}

export function ignoreErrors(errorsToIgnore: Array<string>): void {
  ignoreStrings('error', errorsToIgnore);
}

export function ignoreWarnings(warningsToIgnore: Array<string>): void {
  ignoreStrings('warn', warningsToIgnore);
}

export function ignoreLogs(logsToIgnore: Array<string>): void {
  ignoreStrings('log', logsToIgnore);
}

// --- ADDED FIX: Source Map Resolution Logic ---
async function resolveSourceMap(stack: string): Promise<string> {
  if (!stack || typeof stack !== 'string') return stack;
  
  const lines = stack.split('\n');
  const resolvedLines = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Match URLs in stack traces like (http://localhost:3000/static/js/main.js:10:25)
    const match = line.match(/(https?:\/\/[^\s]+):(\d+):(\d+)/);
    
    if (match) {
      const [fullUrl, scriptUrl] = match; // Extract the base script URL
      try {
        // DevTools runs in the browser, so we can fetch the map directly
        const mapRes = await fetch(`${scriptUrl}.map`);
        if (mapRes.ok) {
          // Append a badge so DevTools knows the map is available
          resolvedLines.push(`${line} [Source Map Available]`);
          continue;
        }
      } catch (err) {
        // Silently fail if no source map exists or CORS blocks it
      }
    }
    resolvedLines.push(line);
  }
  return resolvedLines.join('\n');
}