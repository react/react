'use strict';

jest.mock('shared/ReactFeatureFlags', () => {
  jest.mock(
    'ReactFeatureFlags',
    () => jest.requireActual('shared/forks/ReactFeatureFlags.www-dynamic'),
    {virtual: true}
  );
  const actual = jest.requireActual('shared/forks/ReactFeatureFlags.www');

  // Flags that aren't currently used, but we still want to force variants to keep the
  // code live.
  actual.disableInputAttributeSyncing = __VARIANT__;

  // These are hardcoded to true for the next release,
  // but still run the tests against both variants until
  // we remove the flag.
  actual.disableClientCache = __VARIANT__;

  // Some value that doesn't impact existing tests
  actual.ownerStackLimit = __VARIANT__ ? 500 : 1e4;

  return actual;
});

jest.mock('scheduler/src/SchedulerFeatureFlags', () => {
  const schedulerSrcPath = process.cwd() + '/packages/scheduler';
  jest.mock(
    'SchedulerFeatureFlags',
    () =>
      jest.requireActual(
        schedulerSrcPath + '/src/forks/SchedulerFeatureFlags.www-dynamic'
      ),
    {virtual: true}
  );
  const actual = jest.requireActual(
    schedulerSrcPath + '/src/forks/SchedulerFeatureFlags.www'
  );

  // Add flags here that are not a dynamic on www,
  // but we still want to run tests in both versions.
  // <this list is empty>

  return actual;
});

global.__WWW__ = true;
