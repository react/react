/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @emails react-core
 */

'use strict';

let React;
let ReactDOMClient;
let act;
let root;

const ChildComponent = ({id, eventHandler}) => (
  <div
    id={id + '__DIV'}
    onClickCapture={e => eventHandler(e.currentTarget.id, 'captured', e.type)}
    onClick={e => eventHandler(e.currentTarget.id, 'bubbled', e.type)}
    onMouseEnter={e => eventHandler(e.currentTarget.id, e.type)}
    onMouseLeave={e => eventHandler(e.currentTarget.id, e.type)}>
    <div
      id={id + '__DIV_1'}
      onClickCapture={e => eventHandler(e.currentTarget.id, 'captured', e.type)}
      onClick={e => eventHandler(e.currentTarget.id, 'bubbled', e.type)}
      onMouseEnter={e => eventHandler(e.currentTarget.id, e.type)}
      onMouseLeave={e => eventHandler(e.currentTarget.id, e.type)}
    />
    <div
      id={id + '__DIV_2'}
      onClickCapture={e => eventHandler(e.currentTarget.id, 'captured', e.type)}
      onClick={e => eventHandler(e.currentTarget.id, 'bubbled', e.type)}
      onMouseEnter={e => eventHandler(e.currentTarget.id, e.type)}
      onMouseLeave={e => eventHandler(e.currentTarget.id, e.type)}
    />
  </div>
);

const ParentComponent = ({eventHandler}) => (
  <div
    id="P"
    onClickCapture={e => eventHandler(e.currentTarget.id, 'captured', e.type)}
    onClick={e => eventHandler(e.currentTarget.id, 'bubbled', e.type)}
    onMouseEnter={e => eventHandler(e.currentTarget.id, e.type)}
    onMouseLeave={e => eventHandler(e.currentTarget.id, e.type)}>
    <div
      id="P_P1"
      onClickCapture={e => eventHandler(e.currentTarget.id, 'captured', e.type)}
      onClick={e => eventHandler(e.currentTarget.id, 'bubbled', e.type)}
      onMouseEnter={e => eventHandler(e.currentTarget.id, e.type)}
      onMouseLeave={e => eventHandler(e.currentTarget.id, e.type)}>
      <ChildComponent id="P_P1_C1" eventHandler={eventHandler} />
      <ChildComponent id="P_P1_C2" eventHandler={eventHandler} />
    </div>
    <div
      id="P_OneOff"
      onClickCapture={e => eventHandler(e.currentTarget.id, 'captured', e.type)}
      onClick={e => eventHandler(e.currentTarget.id, 'bubbled', e.type)}
      onMouseEnter={e => eventHandler(e.currentTarget.id, e.type)}
      onMouseLeave={e => eventHandler(e.currentTarget.id, e.type)}
    />
  </div>
);

describe('ReactTreeTraversal', () => {
  const mockFn = jest.fn();
  let container;
  let outerNode1;
  let outerNode2;

  beforeEach(async () => {
    React = require('react');
    ReactDOMClient = require('react-dom/client');
    act = require('internal-test-utils').act;

    mockFn.mockReset();

    container = document.createElement('div');
    outerNode1 = document.createElement('div');
    outerNode2 = document.createElement('div');
    document.body.appendChild(container);
    document.body.appendChild(outerNode1);
    document.body.appendChild(outerNode2);

    root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(<ParentComponent eventHandler={mockFn} />);
    });
  });

  afterEach(() => {
    document.body.removeChild(container);
    document.body.removeChild(outerNode1);
    document.body.removeChild(outerNode2);
    container = null;
    outerNode1 = null;
    outerNode2 = null;
  });

  describe('Two phase traversal', () => {
    it('should not traverse when target is outside component boundary', () => {
      outerNode1.dispatchEvent(
        new MouseEvent('click', {bubbles: true, cancelable: true}),
      );

      expect(mockFn).not.toHaveBeenCalled();
    });

    it('should traverse two phase across component boundary', () => {
      const expectedCalls = [
        ['P', 'captured', 'click'],
        ['P_P1', 'captured', 'click'],
        ['P_P1_C1__DIV', 'captured', 'click'],
        ['P_P1_C1__DIV_1', 'captured', 'click'],

        ['P_P1_C1__DIV_1', 'bubbled', 'click'],
        ['P_P1_C1__DIV', 'bubbled', 'click'],
        ['P_P1', 'bubbled', 'click'],
        ['P', 'bubbled', 'click'],
      ];

      const node = document.getElementById('P_P1_C1__DIV_1');
      node.dispatchEvent(
        new MouseEvent('click', {bubbles: true, cancelable: true}),
      );

      expect(mockFn.mock.calls).toEqual(expectedCalls);
    });

    it('should traverse two phase at shallowest node', () => {
      const node = document.getElementById('P');
      node.dispatchEvent(
        new MouseEvent('click', {bubbles: true, cancelable: true}),
      );

      const expectedCalls = [
        ['P', 'captured', 'click'],
        ['P', 'bubbled', 'click'],
      ];
      expect(mockFn.mock.calls).toEqual(expectedCalls);
    });
  });

  describe('Enter leave traversal', () => {
    it('should not traverse when enter/leaving outside DOM', () => {
      outerNode1.dispatchEvent(
        new MouseEvent('mouseout', {
          bubbles: true,
          cancelable: true,
          relatedTarget: outerNode2,
        }),
      );

      expect(mockFn).not.toHaveBeenCalled();
    });

    it('should not traverse if enter/leave the same node', () => {
      const leaveNode = document.getElementById('P_P1_C1__DIV_1');
      const enterNode = document.getElementById('P_P1_C1__DIV_1');

      leaveNode.dispatchEvent(
        new MouseEvent('mouseout', {
          bubbles: true,
          cancelable: true,
          relatedTarget: enterNode,
        }),
      );

      expect(mockFn).not.toHaveBeenCalled();
    });

    it('should traverse enter/leave to sibling - avoids parent', () => {
      const leaveNode = document.getElementById('P_P1_C1__DIV_1');
      const enterNode = document.getElementById('P_P1_C1__DIV_2');

      const expectedCalls = [
        ['P_P1_C1__DIV_1', 'mouseleave'],
        // enter/leave shouldn't fire anything on the parent
        ['P_P1_C1__DIV_2', 'mouseenter'],
      ];

      leaveNode.dispatchEvent(
        new MouseEvent('mouseout', {
          bubbles: true,
          cancelable: true,
          relatedTarget: enterNode,
        }),
      );

      expect(mockFn.mock.calls).toEqual(expectedCalls);
    });

    it('should traverse enter/leave to parent - avoids parent', () => {
      const leaveNode = document.getElementById('P_P1_C1__DIV_1');
      const enterNode = document.getElementById('P_P1_C1__DIV');

      const expectedCalls = [['P_P1_C1__DIV_1', 'mouseleave']];

      leaveNode.dispatchEvent(
        new MouseEvent('mouseout', {
          bubbles: true,
          cancelable: true,
          relatedTarget: enterNode,
        }),
      );

      expect(mockFn.mock.calls).toEqual(expectedCalls);
    });

    // The modern event system attaches event listeners to roots so the
    // event below is being triggered on a node that React does not listen
    // to any more. Instead we should fire mouseover.
    it('should enter from the window', () => {
      const enterNode = document.getElementById('P_P1_C1__DIV');

      const expectedCalls = [
        ['P', 'mouseenter'],
        ['P_P1', 'mouseenter'],
        ['P_P1_C1__DIV', 'mouseenter'],
      ];

      enterNode.dispatchEvent(
        new MouseEvent('mouseover', {
          bubbles: true,
          cancelable: true,
          relatedTarget: outerNode1,
        }),
      );

      expect(mockFn.mock.calls).toEqual(expectedCalls);
    });

    it('should enter from the window to the shallowest', () => {
      const enterNode = document.getElementById('P');

      const expectedCalls = [['P', 'mouseenter']];

      enterNode.dispatchEvent(
        new MouseEvent('mouseover', {
          bubbles: true,
          cancelable: true,
          relatedTarget: outerNode1,
        }),
      );

      expect(mockFn.mock.calls).toEqual(expectedCalls);
    });

    it('should leave to the window', () => {
      const leaveNode = document.getElementById('P_P1_C1__DIV');

      const expectedCalls = [
        ['P_P1_C1__DIV', 'mouseleave'],
        ['P_P1', 'mouseleave'],
        ['P', 'mouseleave'],
      ];

      leaveNode.dispatchEvent(
        new MouseEvent('mouseout', {
          bubbles: true,
          cancelable: true,
          relatedTarget: outerNode1,
        }),
      );

      expect(mockFn.mock.calls).toEqual(expectedCalls);
    });

    it('should leave to the window from the shallowest', () => {
      const leaveNode = document.getElementById('P');

      const expectedCalls = [['P', 'mouseleave']];

      leaveNode.dispatchEvent(
        new MouseEvent('mouseout', {
          bubbles: true,
          cancelable: true,
          relatedTarget: outerNode1,
        }),
      );

      expect(mockFn.mock.calls).toEqual(expectedCalls);
    });
  });
});
