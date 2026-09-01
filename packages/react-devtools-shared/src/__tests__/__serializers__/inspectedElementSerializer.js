// `test` is part of Jest's serializer API
export function test(maybeInspectedElement) {
  if (
    maybeInspectedElement === null ||
    typeof maybeInspectedElement !== 'object'
  ) {
    return false;
  }

  const hasOwnProperty = Object.prototype.hasOwnProperty.bind(
    maybeInspectedElement,
  );

  return (
    hasOwnProperty('canEditFunctionProps') &&
    hasOwnProperty('canEditHooks') &&
    hasOwnProperty('canToggleSuspense') &&
    hasOwnProperty('canToggleError')
  );
}

// print() is part of Jest's serializer API
export function print(inspectedElement, serialize, indent) {
  // Don't stringify this object; that would break nested serializers.
  return serialize({
    context: inspectedElement.context,
    events: inspectedElement.events,
    hooks: inspectedElement.hooks,
    id: inspectedElement.id,
    owners: inspectedElement.owners,
    props: inspectedElement.props,
    rootType: inspectedElement.rootType,
    state: inspectedElement.state,
  });
}
