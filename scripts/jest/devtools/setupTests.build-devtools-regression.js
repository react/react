'use strict';

// Regression tests use a React DOM profiling, so we need
// to replace these tests with scheduler/tracing-profiling
jest.mock('scheduler/tracing', () => {
  return jest.requireActual('scheduler/tracing-profiling');
});
