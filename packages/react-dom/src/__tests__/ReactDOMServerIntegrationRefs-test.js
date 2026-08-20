/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @emails react-core
 */

'use strict';

const ReactDOMServerIntegrationUtils = require('./utils/ReactDOMServerIntegrationTestUtils');

let React;
let ReactDOMClient;
let ReactDOMServer;

function initModules() {
  // Reset warning cache.
  jest.resetModules();
  React = require('react');
  ReactDOMClient = require('react-dom/client');
  ReactDOMServer = require('react-dom/server');

  // Make them available to the helpers.
  return {
    ReactDOMClient,
    ReactDOMServer,
  };
}

const {resetModules, clientRenderOnServerString, expectMarkupMatch} =
  ReactDOMServerIntegrationUtils(initModules);

describe('ReactDOMServerIntegration', () => {
  beforeEach(() => {
    resetModules();
  });

  describe('refs', function () {
    it('should not run ref code on server', async () => {
      let refCount = 0;
      class RefsComponent extends React.Component {
        render() {
          return <div ref={e => refCount++} />;
        }
      }
      await expectMarkupMatch(<RefsComponent />, <div />);
      expect(refCount).toBe(0);
    });

    it('should run ref code on client', async () => {
      let refCount = 0;
      class RefsComponent extends React.Component {
        render() {
          return <div ref={e => refCount++} />;
        }
      }
      await expectMarkupMatch(<div />, <RefsComponent />);
      expect(refCount).toBe(1);
    });

    it('should send the correct element to ref functions on client', async () => {
      let refElement = null;
      class RefsComponent extends React.Component {
        render() {
          return <div ref={e => (refElement = e)} />;
        }
      }
      const e = await clientRenderOnServerString(<RefsComponent />);
      expect(refElement).not.toBe(null);
      expect(refElement).toBe(e);
    });
  });

  it('should forward refs', async () => {
    const divRef = React.createRef();

    class InnerComponent extends React.Component {
      render() {
        return <div ref={this.props.forwardedRef}>{this.props.value}</div>;
      }
    }

    const OuterComponent = React.forwardRef((props, ref) => (
      <InnerComponent {...props} forwardedRef={ref} />
    ));

    await clientRenderOnServerString(
      <OuterComponent ref={divRef} value="hello" />,
    );

    expect(divRef.current).not.toBe(null);
    expect(divRef.current.textContent).toBe('hello');
  });
});
