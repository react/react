// @validatePreserveExistingMemoizationGuarantees
import {useCallback, useEffect, useState} from 'react';

/**
 * Regression test for: https://github.com/facebook/react/issues/36384
 *
 * The compiler was incorrectly inferring `setImages` (a state setter) as a
 * required dependency of the useCallback scope in this specific pattern,
 * where JSON.parse of an external value is used as initial state.
 *
 * Without the fix, the compiler would produce:
 *   "Compilation Skipped: Existing memoization could not be preserved.
 *    The inferred dependency was `setImages`, but the source dependencies were []."
 *
 * This test should compile successfully — state setters are stable values
 * and must not be required in manual dependency arrays.
 */

function getValue() {
  return 'true';
}

function ImageLibraryPicker() {
  const boolString = getValue();
  const [images, setImages] = useState('');
  const [booleanState, setBooleanState] = useState<boolean>(
    JSON.parse(boolString),
  );

  const search = useCallback(() => {
    setImages('');
  }, []);

  useEffect(() => {
    search();
  }, [search]);

  return null;
}

export const FIXTURE_ENTRYPOINT = {
  fn: ImageLibraryPicker,
  params: [],
};
