function hasAbsoluteFileName(hook) {
  const fileName = hook.hookSource ? hook.hookSource.fileName : null;
  if (fileName == null) {
    return false;
  } else {
    return fileName.indexOf('/react-devtools-shared/') > 0;
  }
}

function serializeHook(hook) {
  if (!hook.hookSource) return hook;

  // Remove user-specific portions of this file path.
  let fileName = hook.hookSource.fileName;
  const index = fileName.lastIndexOf('/react-devtools-shared/');
  fileName = fileName.slice(index + 1);

  let subHooks = hook.subHooks;
  if (subHooks) {
    subHooks = subHooks.map(serializeHook);
  }

  return {
    ...hook,
    hookSource: {
      ...hook.hookSource,
      fileName,

      // Otherwise changes in any test case or formatting might invalidate other tests.
      columnNumber: 'removed by Jest serializer',
      lineNumber: 'removed by Jest serializer',
    },
    subHooks,
  };
}

// `test` is part of Jest's serializer API
export function test(maybeHook) {
  if (maybeHook === null || typeof maybeHook !== 'object') {
    return false;
  }

  const hasOwnProperty = Object.prototype.hasOwnProperty.bind(maybeHook);

  return (
    hasOwnProperty('id') &&
    hasOwnProperty('isStateEditable') &&
    hasOwnProperty('name') &&
    hasOwnProperty('subHooks') &&
    hasOwnProperty('value') &&
    // Don't re-process an already printed hook.
    hasAbsoluteFileName(maybeHook)
  );
}

// print() is part of Jest's serializer API
export function print(hook, serialize, indent) {
  // Don't stringify this object; that would break nested serializers.
  return serialize(serializeHook(hook));
}
