// @validateExhaustiveMemoizationDependencies:false
export function useFormatRelativeTime(opts = {}) {
  const {timeZone, minimal} = opts;
  const format = useCallback(function formatWithUnit() {}, [minimal]);
  // We previously recorded `{timeZone}` as capturing timeZone into the object,
  // then assumed that dateTimeFormat() mutates that object,
  // which in turn could mutate timeZone and the object it came from,
  // which meanteans that the value `minimal` is derived from can change.
  //
  // The fix was to record a Capture from a maybefrozen value as an ImmutableCapture
  // which doesn't propagate mutations
  dateTimeFormat({timeZone});
  return format;
}
