const MAX_DECIMAL_PLACES = 3;

// `test` is part of Jest's serializer API
export function test(maybeNumber) {
  return (
    typeof maybeNumber === 'number' &&
    Number.isFinite(maybeNumber) &&
    !Number.isInteger(maybeNumber) &&
    !Number.isNaN(maybeNumber)
  );
}

// print() is part of Jest's serializer API
export function print(number, serialize, indent) {
  const string = number.toString();
  const pieces = string.split('.');
  if (pieces.length === 2) {
    if (pieces[1].length > MAX_DECIMAL_PLACES) {
      return number.toFixed(MAX_DECIMAL_PLACES);
    }
  }

  return string;
}
