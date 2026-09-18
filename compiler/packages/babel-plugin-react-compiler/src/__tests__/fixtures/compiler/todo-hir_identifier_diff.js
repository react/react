// HIR Pattern: IDENTIFIER_DIFF (20 files, 6%)
// Extra identifier in Rust's context/params for jest.mock factory functions

/**
 * @flow strict-local
 */
/* eslint-disable no-shadow */
jest.mock('RouterRootContextFactory.react', () => {
  const React = require('react');
  const tracePolicyCtxMod: any = jest.requireActual();
  return function MockRouterRootContextFactory(props: {
    children: React.Node,
    routeInfo: {},
  }) {
    return (
      <RouterRenderTypeContext.Provider
        value={{}}></RouterRenderTypeContext.Provider>
    );
  };
});
