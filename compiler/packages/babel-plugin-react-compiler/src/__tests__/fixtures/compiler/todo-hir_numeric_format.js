// HIR Pattern: NUMERIC_FORMAT_DIFF (5 files, 1.5%)
// TS: 2.18739127891275e+22 (scientific), Rust: 21873912789127500000000 (decimal)

describe('logUnsafeIntResponse', () => {
  afterEach(() => {});
  it('logs when unsafe integer found in response', () => {
    logUnsafeIntResponse('GET', '/api/v1/test/', {
      abc: 21873912789127498217412,
    });
    expect(MockLogger.Logger).toHaveBeenCalledWith();
    expect(MockLogger.warn).toHaveBeenNthCalledWith();
  });
});
