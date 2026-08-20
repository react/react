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

describe('BeforeInputEventPlugin', () => {
  let container;

  function loadReactDOMClientAndAct(envSimulator) {
    jest.resetModules();
    if (envSimulator) {
      envSimulator();
    }
    return {
      ReactDOMClient: require('react-dom/client'),
      act: require('internal-test-utils').act,
    };
  }

  function simulateIE11() {
    document.documentMode = 11;
    window.CompositionEvent = {};
  }

  function simulateWebkit() {
    window.CompositionEvent = {};
    window.TextEvent = {};
  }

  function simulateComposition() {
    window.CompositionEvent = {};
  }

  function simulateNoComposition() {
    // no composition event in Window - will use fallback
  }

  function simulateEvent(elem, type, data) {
    const event = new Event(type, {bubbles: true});
    Object.assign(event, data);
    elem.dispatchEvent(event);
  }

  function simulateKeyboardEvent(elem, type, data) {
    const {char, value, ...rest} = data;
    const event = new KeyboardEvent(type, {
      bubbles: true,
      ...rest,
    });
    if (char) {
      event.char = char;
    }
    if (value) {
      elem.value = value;
    }
    elem.dispatchEvent(event);
  }

  function simulatePaste(elem) {
    const pasteEvent = new Event('paste', {
      bubbles: true,
    });
    pasteEvent.clipboardData = {
      dropEffect: null,
      effectAllowed: null,
      files: null,
      items: null,
      types: null,
    };
    elem.dispatchEvent(pasteEvent);
  }

  beforeEach(() => {
    React = require('react');
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    delete document.documentMode;
    delete window.CompositionEvent;
    delete window.TextEvent;
    delete window.opera;
    document.body.removeChild(container);
    container = null;
  });

  function keyCode(char) {
    return char.charCodeAt(0);
  }

  const scenarios = [
    {
      eventSimulator: simulateEvent,
      eventSimulatorArgs: [
        'compositionstart',
        {detail: {data: 'test'}, data: 'test'},
      ],
    },
    {
      eventSimulator: simulateEvent,
      eventSimulatorArgs: [
        'compositionupdate',
        {detail: {data: 'test string'}, data: 'test string'},
      ],
    },
    {
      eventSimulator: simulateEvent,
      eventSimulatorArgs: [
        'compositionend',
        {detail: {data: 'test string 3'}, data: 'test string 3'},
      ],
    },
    {
      eventSimulator: simulateEvent,
      eventSimulatorArgs: ['textInput', {data: 'abcß'}],
    },
    {
      eventSimulator: simulateKeyboardEvent,
      eventSimulatorArgs: ['keypress', {which: keyCode('a')}],
    },
    {
      eventSimulator: simulateKeyboardEvent,
      eventSimulatorArgs: ['keypress', {which: keyCode(' ')}, ' '],
    },
    {
      eventSimulator: simulateEvent,
      eventSimulatorArgs: ['textInput', {data: ' '}],
    },
    {
      eventSimulator: simulateKeyboardEvent,
      eventSimulatorArgs: ['keypress', {which: keyCode('a'), ctrlKey: true}],
    },
    {
      eventSimulator: simulateKeyboardEvent,
      eventSimulatorArgs: ['keypress', {which: keyCode('b'), altKey: true}],
    },
    {
      eventSimulator: simulateKeyboardEvent,
      eventSimulatorArgs: [
        'keypress',
        {which: keyCode('c'), altKey: true, ctrlKey: true},
      ],
    },
    {
      eventSimulator: simulateKeyboardEvent,
      eventSimulatorArgs: [
        'keypress',
        {which: keyCode('X'), char: '\uD83D\uDE0A'},
      ],
    },
    {
      eventSimulator: simulateEvent,
      eventSimulatorArgs: ['textInput', {data: '\uD83D\uDE0A'}],
    },
    {
      eventSimulator: simulateKeyboardEvent,
      eventSimulatorArgs: ['keydown', {keyCode: 229, value: 'foo'}],
    },
    {
      eventSimulator: simulateKeyboardEvent,
      eventSimulatorArgs: ['keydown', {keyCode: 9, value: 'foobar'}],
    },
    {
      eventSimulator: simulateKeyboardEvent,
      eventSimulatorArgs: ['keydown', {keyCode: 229, value: 'foofoo'}],
    },
    {
      eventSimulator: simulateKeyboardEvent,
      eventSimulatorArgs: ['keyup', {keyCode: 9, value: 'fooBARfoo'}],
    },
    {
      eventSimulator: simulateKeyboardEvent,
      eventSimulatorArgs: ['keydown', {keyCode: 229, value: 'foofoo'}],
    },
    {
      eventSimulator: simulateKeyboardEvent,
      eventSimulatorArgs: ['keypress', {keyCode: 60, value: 'Barfoofoo'}],
    },
    {
      eventSimulator: simulatePaste,
      eventSimulatorArgs: [],
    },
  ];

  const environments = [
    {
      emulator: simulateWebkit,
      assertions: [
        {
          run: ({
            beforeInputEvent,
            compositionStartEvent,
            spyOnBeforeInput,
            spyOnCompositionStart,
          }) => {
            expect(spyOnBeforeInput).toHaveBeenCalledTimes(0);
            expect(beforeInputEvent).toBeNull();
            expect(spyOnCompositionStart).toHaveBeenCalledTimes(1);
            expect(compositionStartEvent.type).toBe('compositionstart');
            expect(compositionStartEvent.data).toBe('test');
          },
        },
        {
          run: ({
            beforeInputEvent,
            compositionUpdateEvent,
            spyOnBeforeInput,
            spyOnCompositionUpdate,
          }) => {
            expect(spyOnBeforeInput).toHaveBeenCalledTimes(0);
            expect(beforeInputEvent).toBeNull();
            expect(spyOnCompositionUpdate).toHaveBeenCalledTimes(1);
            expect(compositionUpdateEvent.type).toBe('compositionupdate');
            expect(compositionUpdateEvent.data).toBe('test string');
          },
        },
        {
          run: ({beforeInputEvent, spyOnBeforeInput}) => {
            expect(spyOnBeforeInput).toHaveBeenCalledTimes(1);
            expect(beforeInputEvent.nativeEvent.type).toBe('compositionend');
            expect(beforeInputEvent.type).toBe('beforeinput');
            expect(beforeInputEvent.data).toBe('test string 3');
          },
        },
        {
          run: ({beforeInputEvent, spyOnBeforeInput}) => {
            expect(spyOnBeforeInput).toHaveBeenCalledTimes(1);
            expect(beforeInputEvent.nativeEvent.type).toBe('textInput');
            expect(beforeInputEvent.type).toBe('beforeinput');
            expect(beforeInputEvent.data).toBe('abcß');
          },
        },
        {
          run: ({beforeInputEvent, spyOnBeforeInput}) => {
            expect(spyOnBeforeInput).toHaveBeenCalledTimes(0);
            expect(beforeInputEvent).toBeNull();
          },
        },
        {
          run: ({beforeInputEvent, spyOnBeforeInput}) => {
            expect(spyOnBeforeInput).toHaveBeenCalledTimes(1);
            expect(beforeInputEvent.nativeEvent.type).toBe('keypress');
            expect(beforeInputEvent.type).toBe('beforeinput');
            expect(beforeInputEvent.data).toBe(' ');
          },
        },
        {
          run: ({beforeInputEvent, spyOnBeforeInput}) => {
            expect(spyOnBeforeInput).toHaveBeenCalledTimes(0);
            expect(beforeInputEvent).toBeNull();
          },
        },
        {
          run: ({beforeInputEvent, spyOnBeforeInput}) => {
            expect(spyOnBeforeInput).toHaveBeenCalledTimes(0);
            expect(beforeInputEvent).toBeNull();
          },
        },
        {
          run: ({beforeInputEvent, spyOnBeforeInput}) => {
            expect(spyOnBeforeInput).toHaveBeenCalledTimes(0);
            expect(beforeInputEvent).toBeNull();
          },
        },
        {
          run: ({beforeInputEvent, spyOnBeforeInput}) => {
            expect(spyOnBeforeInput).toHaveBeenCalledTimes(0);
            expect(beforeInputEvent).toBeNull();
          },
        },
        {
          run: ({beforeInputEvent, spyOnBeforeInput}) => {
            expect(spyOnBeforeInput).toHaveBeenCalledTimes(0);
            expect(beforeInputEvent).toBeNull();
          },
        },
        {
          run: ({beforeInputEvent, spyOnBeforeInput}) => {
            expect(spyOnBeforeInput).toHaveBeenCalledTimes(1);
            expect(beforeInputEvent.nativeEvent.type).toBe('textInput');
            expect(beforeInputEvent.type).toBe('beforeinput');
            expect(beforeInputEvent.data).toBe('\uD83D\uDE0A');
          },
        },
        {
          run: ({beforeInputEvent, spyOnBeforeInput}) => {
            expect(spyOnBeforeInput).toHaveBeenCalledTimes(0);
            expect(beforeInputEvent).toBeNull();
          },
        },
        {
          run: ({beforeInputEvent, spyOnBeforeInput}) => {
            expect(spyOnBeforeInput).toHaveBeenCalledTimes(0);
            expect(beforeInputEvent).toBeNull();
          },
        },
        {
          run: ({beforeInputEvent, spyOnBeforeInput}) => {
            expect(spyOnBeforeInput).toHaveBeenCalledTimes(0);
            expect(beforeInputEvent).toBeNull();
          },
        },
        {
          run: ({beforeInputEvent, spyOnBeforeInput}) => {
            expect(spyOnBeforeInput).toHaveBeenCalledTimes(0);
            expect(beforeInputEvent).toBeNull();
          },
        },
        {
          run: ({beforeInputEvent, spyOnBeforeInput}) => {
            expect(spyOnBeforeInput).toHaveBeenCalledTimes(0);
            expect(beforeInputEvent).toBeNull();
          },
        },
        {
          run: ({beforeInputEvent, spyOnBeforeInput}) => {
            expect(spyOnBeforeInput).toHaveBeenCalledTimes(0);
            expect(beforeInputEvent).toBeNull();
          },
        },
        {
          run: ({beforeInputEvent, spyOnBeforeInput}) => {
            expect(spyOnBeforeInput).toHaveBeenCalledTimes(0);
            expect(beforeInputEvent).toBeNull();
          },
        },
      ],
    },
    {
      emulator: simulateIE11,
      assertions: [
        {
          run: ({beforeInputEvent, spyOnBeforeInput}) => {
            expect(spyOnBeforeInput).toHaveBeenCalledTimes(0);
            expect(beforeInputEvent).toBeNull();
          },
        },
        {
          run: ({beforeInputEvent, spyOnBeforeInput}) => {
            expect(spyOnBeforeInput).toHaveBeenCalledTimes(0);
            expect(beforeInputEvent).toBeNull();
          },
        },
        {
          run: ({beforeInputEvent, spyOnBeforeInput}) => {
            expect(spyOnBeforeInput).toHaveBeenCalledTimes(0);
            expect(beforeInputEvent).toBeNull();
          },
        },
        {
          run: ({beforeInputEvent, spyOnBeforeInput}) => {
            expect(spyOnBeforeInput).toHaveBeenCalledTimes(0);
            expect(beforeInputEvent).toBeNull();
          },
        },
        {
          run: ({beforeInputEvent, spyOnBeforeInput}) => {
            expect(spyOnBeforeInput).toHaveBeenCalledTimes(1);
            expect(beforeInputEvent.nativeEvent.type).toBe('keypress');
            expect(beforeInputEvent.type).toBe('beforeinput');
            expect(beforeInputEvent.data).toBe('a');
          },
        },
        {
          run: ({beforeInputEvent, spyOnBeforeInput}) => {
            expect(spyOnBeforeInput).toHaveBeenCalledTimes(1);
            expect(beforeInputEvent.nativeEvent.type).toBe('keypress');
            expect(beforeInputEvent.type).toBe('beforeinput');
            expect(beforeInputEvent.data).toBe(' ');
          },
        },
        {
          run: ({beforeInputEvent, spyOnBeforeInput}) => {
            expect(spyOnBeforeInput).toHaveBeenCalledTimes(0);
            expect(beforeInputEvent).toBeNull();
          },
        },
        {
          run: ({beforeInputEvent, spyOnBeforeInput}) => {
            expect(spyOnBeforeInput).toHaveBeenCalledTimes(0);
            expect(beforeInputEvent).toBeNull();
          },
        },
        {
          run: ({beforeInputEvent, spyOnBeforeInput}) => {
            expect(spyOnBeforeInput).toHaveBeenCalledTimes(0);
            expect(beforeInputEvent).toBeNull();
          },
        },
        {
          run: ({beforeInputEvent, spyOnBeforeInput}) => {
            expect(spyOnBeforeInput).toHaveBeenCalledTimes(1);
            expect(beforeInputEvent.nativeEvent.type).toBe('keypress');
            expect(beforeInputEvent.type).toBe('beforeinput');
            expect(beforeInputEvent.data).toBe('c');
          },
        },
        {
          run: ({beforeInputEvent, spyOnBeforeInput}) => {
            expect(spyOnBeforeInput).toHaveBeenCalledTimes(1);
            expect(beforeInputEvent.nativeEvent.type).toBe('keypress');
            expect(beforeInputEvent.type).toBe('beforeinput');
            expect(beforeInputEvent.data).toBe('\uD83D\uDE0A');
          },
        },
        {
          run: ({beforeInputEvent, spyOnBeforeInput}) => {
            expect(spyOnBeforeInput).toHaveBeenCalledTimes(0);
            expect(beforeInputEvent).toBeNull();
          },
        },
        {
          run: ({beforeInputEvent, spyOnBeforeInput}) => {
            expect(spyOnBeforeInput).toHaveBeenCalledTimes(0);
            expect(beforeInputEvent).toBeNull();
          },
        },
        {
          run: ({beforeInputEvent, spyOnBeforeInput}) => {
            expect(spyOnBeforeInput).toHaveBeenCalledTimes(0);
            expect(beforeInputEvent).toBeNull();
          },
        },
        {
          run: ({beforeInputEvent, spyOnBeforeInput}) => {
            expect(spyOnBeforeInput).toHaveBeenCalledTimes(0);
            expect(beforeInputEvent).toBeNull();
          },
        },
        {
          run: ({beforeInputEvent, spyOnBeforeInput}) => {
            expect(spyOnBeforeInput).toHaveBeenCalledTimes(0);
            expect(beforeInputEvent).toBeNull();
          },
        },
        {
          run: ({beforeInputEvent, spyOnBeforeInput}) => {
            expect(spyOnBeforeInput).toHaveBeenCalledTimes(0);
            expect(beforeInputEvent).toBeNull();
          },
        },
        {
          run: ({beforeInputEvent, spyOnBeforeInput}) => {
            expect(spyOnBeforeInput).toHaveBeenCalledTimes(0);
            expect(beforeInputEvent).toBeNull();
          },
        },
        {
          run: ({beforeInputEvent, spyOnBeforeInput}) => {
            expect(spyOnBeforeInput).toHaveBeenCalledTimes(0);
            expect(beforeInputEvent).toBeNull();
          },
        },
      ],
    },
    {
      emulator: simulateNoComposition,
      assertions: [
        {
          run: ({beforeInputEvent, spyOnBeforeInput}) => {
            expect(spyOnBeforeInput).toHaveBeenCalledTimes(0);
            expect(beforeInputEvent).toBeNull();
          },
        },
        {
          run: ({beforeInputEvent, spyOnBeforeInput}) => {
            expect(spyOnBeforeInput).toHaveBeenCalledTimes(0);
            expect(beforeInputEvent).toBeNull();
          },
        },
        {
          run: ({beforeInputEvent, spyOnBeforeInput}) => {
            expect(spyOnBeforeInput).toHaveBeenCalledTimes(0);
            expect(beforeInputEvent).toBeNull();
          },
        },
        {
          run: ({beforeInputEvent, spyOnBeforeInput}) => {
            expect(spyOnBeforeInput).toHaveBeenCalledTimes(0);
            expect(beforeInputEvent).toBeNull();
          },
        },
        {
          run: ({beforeInputEvent, spyOnBeforeInput}) => {
            expect(spyOnBeforeInput).toHaveBeenCalledTimes(1);
            expect(beforeInputEvent.nativeEvent.type).toBe('keypress');
            expect(beforeInputEvent.type).toBe('beforeinput');
            expect(beforeInputEvent.data).toBe('a');
          },
        },
        {
          run: ({beforeInputEvent, spyOnBeforeInput}) => {
            expect(spyOnBeforeInput).toHaveBeenCalledTimes(1);
            expect(beforeInputEvent.nativeEvent.type).toBe('keypress');
            expect(beforeInputEvent.type).toBe('beforeinput');
            expect(beforeInputEvent.data).toBe(' ');
          },
        },
        {
          run: ({beforeInputEvent, spyOnBeforeInput}) => {
            expect(spyOnBeforeInput).toHaveBeenCalledTimes(0);
            expect(beforeInputEvent).toBeNull();
          },
        },
        {
          run: ({beforeInputEvent, spyOnBeforeInput}) => {
            expect(spyOnBeforeInput).toHaveBeenCalledTimes(0);
            expect(beforeInputEvent).toBeNull();
          },
        },
        {
          run: ({beforeInputEvent, spyOnBeforeInput}) => {
            expect(spyOnBeforeInput).toHaveBeenCalledTimes(0);
            expect(beforeInputEvent).toBeNull();
          },
        },
        {
          run: ({beforeInputEvent, spyOnBeforeInput}) => {
            expect(spyOnBeforeInput).toHaveBeenCalledTimes(1);
            expect(beforeInputEvent.nativeEvent.type).toBe('keypress');
            expect(beforeInputEvent.type).toBe('beforeinput');
            expect(beforeInputEvent.data).toBe('c');
          },
        },
        {
          run: ({beforeInputEvent, spyOnBeforeInput}) => {
            expect(spyOnBeforeInput).toHaveBeenCalledTimes(1);
            expect(beforeInputEvent.nativeEvent.type).toBe('keypress');
            expect(beforeInputEvent.type).toBe('beforeinput');
            expect(beforeInputEvent.data).toBe('\uD83D\uDE0A');
          },
        },
        {
          run: ({beforeInputEvent, spyOnBeforeInput}) => {
            expect(spyOnBeforeInput).toHaveBeenCalledTimes(0);
            expect(beforeInputEvent).toBeNull();
          },
        },
        {
          run: ({beforeInputEvent, spyOnBeforeInput}) => {
            expect(spyOnBeforeInput).toHaveBeenCalledTimes(0);
            expect(beforeInputEvent).toBeNull();
          },
        },
        {
          run: ({beforeInputEvent, spyOnBeforeInput}) => {
            expect(spyOnBeforeInput).toHaveBeenCalledTimes(1);
            expect(beforeInputEvent.nativeEvent.type).toBe('keydown');
            expect(beforeInputEvent.type).toBe('beforeinput');
            expect(beforeInputEvent.data).toBe('bar');
          },
        },
        {
          run: ({beforeInputEvent, spyOnBeforeInput}) => {
            expect(spyOnBeforeInput).toHaveBeenCalledTimes(0);
            expect(beforeInputEvent).toBeNull();
          },
        },
        {
          run: ({beforeInputEvent, spyOnBeforeInput}) => {
            expect(spyOnBeforeInput).toHaveBeenCalledTimes(1);
            expect(beforeInputEvent.nativeEvent.type).toBe('keyup');
            expect(beforeInputEvent.type).toBe('beforeinput');
            expect(beforeInputEvent.data).toBe('BAR');
          },
        },
        {
          run: ({beforeInputEvent, spyOnBeforeInput}) => {
            expect(spyOnBeforeInput).toHaveBeenCalledTimes(0);
            expect(beforeInputEvent).toBeNull();
          },
        },
        {
          run: ({beforeInputEvent, spyOnBeforeInput}) => {
            expect(spyOnBeforeInput).toHaveBeenCalledTimes(1);
            expect(beforeInputEvent.nativeEvent.type).toBe('keypress');
            expect(beforeInputEvent.type).toBe('beforeinput');
            expect(beforeInputEvent.data).toBe('Bar');
          },
        },
        {
          run: ({beforeInputEvent, spyOnBeforeInput}) => {
            expect(spyOnBeforeInput).toHaveBeenCalledTimes(0);
            expect(beforeInputEvent).toBeNull();
          },
        },
      ],
    },
    {
      emulator: simulateComposition,
      assertions: [
        {
          run: ({beforeInputEvent, spyOnBeforeInput}) => {
            expect(spyOnBeforeInput).toHaveBeenCalledTimes(0);
            expect(beforeInputEvent).toBeNull();
          },
        },
        {
          run: ({beforeInputEvent, spyOnBeforeInput}) => {
            expect(spyOnBeforeInput).toHaveBeenCalledTimes(0);
            expect(beforeInputEvent).toBeNull();
          },
        },
        {
          run: ({beforeInputEvent, spyOnBeforeInput}) => {
            expect(spyOnBeforeInput).toHaveBeenCalledTimes(1);
            expect(beforeInputEvent.nativeEvent.type).toBe('compositionend');
            expect(beforeInputEvent.type).toBe('beforeinput');
            expect(beforeInputEvent.data).toBe('test string 3');
          },
        },
        {
          run: ({beforeInputEvent, spyOnBeforeInput}) => {
            expect(spyOnBeforeInput).toHaveBeenCalledTimes(0);
            expect(beforeInputEvent).toBeNull();
          },
        },
        {
          run: ({beforeInputEvent, spyOnBeforeInput}) => {
            expect(spyOnBeforeInput).toHaveBeenCalledTimes(1);
            expect(beforeInputEvent.nativeEvent.type).toBe('keypress');
            expect(beforeInputEvent.type).toBe('beforeinput');
            expect(beforeInputEvent.data).toBe('a');
          },
        },
        {
          run: ({beforeInputEvent, spyOnBeforeInput}) => {
            expect(spyOnBeforeInput).toHaveBeenCalledTimes(1);
            expect(beforeInputEvent.nativeEvent.type).toBe('keypress');
            expect(beforeInputEvent.type).toBe('beforeinput');
            expect(beforeInputEvent.data).toBe(' ');
          },
        },
        {
          run: ({beforeInputEvent, spyOnBeforeInput}) => {
            expect(spyOnBeforeInput).toHaveBeenCalledTimes(0);
            expect(beforeInputEvent).toBeNull();
          },
        },
        {
          run: ({beforeInputEvent, spyOnBeforeInput}) => {
            expect(spyOnBeforeInput).toHaveBeenCalledTimes(0);
            expect(beforeInputEvent).toBeNull();
          },
        },
        {
          run: ({beforeInputEvent, spyOnBeforeInput}) => {
            expect(spyOnBeforeInput).toHaveBeenCalledTimes(0);
            expect(beforeInputEvent).toBeNull();
          },
        },
        {
          run: ({beforeInputEvent, spyOnBeforeInput}) => {
            expect(spyOnBeforeInput).toHaveBeenCalledTimes(1);
            expect(beforeInputEvent.nativeEvent.type).toBe('keypress');
            expect(beforeInputEvent.type).toBe('beforeinput');
            expect(beforeInputEvent.data).toBe('c');
          },
        },
        {
          run: ({beforeInputEvent, spyOnBeforeInput}) => {
            expect(spyOnBeforeInput).toHaveBeenCalledTimes(1);
            expect(beforeInputEvent.nativeEvent.type).toBe('keypress');
            expect(beforeInputEvent.type).toBe('beforeinput');
            expect(beforeInputEvent.data).toBe('\uD83D\uDE0A');
          },
        },
        {
          run: ({beforeInputEvent, spyOnBeforeInput}) => {
            expect(spyOnBeforeInput).toHaveBeenCalledTimes(0);
            expect(beforeInputEvent).toBeNull();
          },
        },
        {
          run: ({beforeInputEvent, spyOnBeforeInput}) => {
            expect(spyOnBeforeInput).toHaveBeenCalledTimes(0);
            expect(beforeInputEvent).toBeNull();
          },
        },
        {
          run: ({beforeInputEvent, spyOnBeforeInput}) => {
            expect(spyOnBeforeInput).toHaveBeenCalledTimes(0);
            expect(beforeInputEvent).toBeNull();
          },
        },
        {
          run: ({beforeInputEvent, spyOnBeforeInput}) => {
            expect(spyOnBeforeInput).toHaveBeenCalledTimes(0);
            expect(beforeInputEvent).toBeNull();
          },
        },
        {
          run: ({beforeInputEvent, spyOnBeforeInput}) => {
            expect(spyOnBeforeInput).toHaveBeenCalledTimes(0);
            expect(beforeInputEvent).toBeNull();
          },
        },
        {
          run: ({beforeInputEvent, spyOnBeforeInput}) => {
            expect(spyOnBeforeInput).toHaveBeenCalledTimes(0);
            expect(beforeInputEvent).toBeNull();
          },
        },
        {
          run: ({beforeInputEvent, spyOnBeforeInput}) => {
            expect(spyOnBeforeInput).toHaveBeenCalledTimes(0);
            expect(beforeInputEvent).toBeNull();
          },
        },
        {
          run: ({beforeInputEvent, spyOnBeforeInput}) => {
            expect(spyOnBeforeInput).toHaveBeenCalledTimes(0);
            expect(beforeInputEvent).toBeNull();
          },
        },
      ],
    },
  ];

  const testInputComponent = async (env, scenes) => {
    let beforeInputEvent;
    let compositionStartEvent;
    let compositionUpdateEvent;
    let spyOnBeforeInput;
    let spyOnCompositionStart;
    let spyOnCompositionUpdate;
    ({ReactDOMClient, act} = loadReactDOMClientAndAct(env.emulator));
    const root = ReactDOMClient.createRoot(container);
    await act(() => {
      root.render(
        <input
          type="text"
          onBeforeInput={e => {
            spyOnBeforeInput();
            beforeInputEvent = e;
          }}
          onCompositionStart={e => {
            spyOnCompositionStart();
            compositionStartEvent = e;
          }}
          onCompositionUpdate={e => {
            spyOnCompositionUpdate();
            compositionUpdateEvent = e;
          }}
        />,
      );
    });

    const node = container.firstChild;

    scenes.forEach((s, id) => {
      beforeInputEvent = null;
      compositionStartEvent = null;
      compositionUpdateEvent = null;
      spyOnBeforeInput = jest.fn();
      spyOnCompositionStart = jest.fn();
      spyOnCompositionUpdate = jest.fn();
      s.eventSimulator.apply(null, [node, ...s.eventSimulatorArgs]);
      env.assertions[id].run({
        beforeInputEvent,
        compositionStartEvent,
        compositionUpdateEvent,
        spyOnBeforeInput,
        spyOnCompositionStart,
        spyOnCompositionUpdate,
      });
    });
  };

  const testContentEditableComponent = async (env, scenes) => {
    let beforeInputEvent;
    let compositionStartEvent;
    let compositionUpdateEvent;
    let spyOnBeforeInput;
    let spyOnCompositionStart;
    let spyOnCompositionUpdate;
    ({ReactDOMClient, act} = loadReactDOMClientAndAct(env.emulator));
    const root = ReactDOMClient.createRoot(container);

    await act(() => {
      root.render(
        <div
          contentEditable={true}
          onBeforeInput={e => {
            spyOnBeforeInput();
            beforeInputEvent = e;
          }}
          onCompositionStart={e => {
            spyOnCompositionStart();
            compositionStartEvent = e;
          }}
          onCompositionUpdate={e => {
            spyOnCompositionUpdate();
            compositionUpdateEvent = e;
          }}
        />,
      );
    });

    const node = container.firstChild;

    scenes.forEach((s, id) => {
      beforeInputEvent = null;
      compositionStartEvent = null;
      compositionUpdateEvent = null;
      spyOnBeforeInput = jest.fn();
      spyOnCompositionStart = jest.fn();
      spyOnCompositionUpdate = jest.fn();
      s.eventSimulator.apply(null, [node, ...s.eventSimulatorArgs]);
      env.assertions[id].run({
        beforeInputEvent,
        compositionStartEvent,
        compositionUpdateEvent,
        spyOnBeforeInput,
        spyOnCompositionStart,
        spyOnCompositionUpdate,
      });
    });
  };

  it('should extract onBeforeInput when simulating in Webkit on input[type=text]', async () => {
    await testInputComponent(environments[0], scenarios);
  });
  it('should extract onBeforeInput when simulating in Webkit on contenteditable', async () => {
    await testContentEditableComponent(environments[0], scenarios);
  });

  it('should extract onBeforeInput when simulating in IE11 on input[type=text]', async () => {
    await testInputComponent(environments[1], scenarios);
  });
  it('should extract onBeforeInput when simulating in IE11 on contenteditable', async () => {
    await testContentEditableComponent(environments[1], scenarios);
  });

  it('should extract onBeforeInput when simulating in env with no CompositionEvent on input[type=text]', async () => {
    await testInputComponent(environments[2], scenarios);
  });

  // in an environment using composition fallback onBeforeInput will not work
  // as expected on a contenteditable as keydown and keyup events are translated
  // to keypress events

  it('should extract onBeforeInput when simulating in env with only CompositionEvent on input[type=text]', async () => {
    await testInputComponent(environments[3], scenarios);
  });

  it('should extract onBeforeInput when simulating in env with only CompositionEvent on contenteditable', async () => {
    await testContentEditableComponent(environments[3], scenarios);
  });
});
