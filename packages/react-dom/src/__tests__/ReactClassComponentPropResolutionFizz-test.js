/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @emails react-core
 */

'use strict';

import {insertNodesAndExecuteScripts} from '../test-utils/FizzTestUtils';
import {patchMessageChannel} from '../../../../scripts/jest/patchMessageChannel';

// Polyfills for test environment
global.ReadableStream =
  require('web-streams-polyfill/ponyfill/es6').ReadableStream;
global.TextEncoder = require('util').TextEncoder;

let React;
let ReactDOMServer;
let Scheduler;
let assertLog;
let container;
let serverAct;

describe('ReactClassComponentPropResolutionFizz', () => {
  beforeEach(() => {
    jest.resetModules();
    Scheduler = require('scheduler');
    patchMessageChannel();

    React = require('react');
    ReactDOMServer = require('react-dom/server.browser');
    assertLog = require('internal-test-utils').assertLog;
    serverAct = require('internal-test-utils').serverAct;
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  async function readIntoContainer(stream) {
    const reader = stream.getReader();
    let result = '';
    while (true) {
      const {done, value} = await reader.read();
      if (done) {
        break;
      }
      result += Buffer.from(value).toString('utf8');
    }
    const temp = document.createElement('div');
    temp.innerHTML = result;
    insertNodesAndExecuteScripts(temp, container, null);
  }

  function Text({text}) {
    Scheduler.log(text);
    return text;
  }

  it('resolves ref and default props before calling lifecycle methods', async () => {
    function getPropKeys(props) {
      return Object.keys(props).join(', ');
    }

    class Component extends React.Component {
      constructor(props) {
        super(props);
        Scheduler.log('constructor: ' + getPropKeys(props));
      }
      UNSAFE_componentWillMount() {
        Scheduler.log('componentWillMount: ' + getPropKeys(this.props));
      }
      render() {
        return <Text text={'render: ' + getPropKeys(this.props)} />;
      }
    }

    Component.defaultProps = {
      default: 'yo',
    };

    // `ref` should never appear as a prop. `default` always should.

    const ref = React.createRef();
    const stream = await serverAct(() =>
      ReactDOMServer.renderToReadableStream(<Component text="Yay" ref={ref} />),
    );
    await readIntoContainer(stream);

    assertLog([
      'constructor: text, default',
      'componentWillMount: text, default',
      'render: text, default',
    ]);
  });
});
