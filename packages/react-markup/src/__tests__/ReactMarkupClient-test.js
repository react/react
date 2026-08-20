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
let ReactMarkup;

function normalizeCodeLocInfo(str) {
  return (
    str &&
    String(str).replace(/\n +(?:at|in) ([\S]+)[^\n]*/g, function (m, name) {
      return '\n    in ' + name + ' (at **)';
    })
  );
}

if (!__EXPERIMENTAL__) {
  it('should not be built in stable', () => {
    try {
      require('react-markup');
    } catch (x) {
      return;
    }
    throw new Error('Expected react-markup not to exist in stable.');
  });
} else {
  describe('ReactMarkup', () => {
    beforeEach(() => {
      jest.resetModules();
      React = require('react');
      ReactMarkup = require('react-markup');
    });

    it('should be able to render a simple component', async () => {
      function Component() {
        return <div>hello world</div>;
      }

      const html = await ReactMarkup.experimental_renderToHTML(<Component />);
      expect(html).toBe('<div>hello world</div>');
    });

    it('should be able to render a large string', async () => {
      function Component() {
        return <div>{'hello '.repeat(200)}world</div>;
      }

      const html = await ReactMarkup.experimental_renderToHTML(
        React.createElement(Component),
      );
      expect(html).toBe('<div>' + ('hello '.repeat(200) + 'world') + '</div>');
    });

    it('should prefix html tags with a doctype', async () => {
      const html = await ReactMarkup.experimental_renderToHTML(
        <html>
          <body>hello</body>
        </html>,
      );
      expect(html).toBe(
        '<!DOCTYPE html><html><head></head><body>hello</body></html>',
      );
    });

    it('should error on useState', async () => {
      function Component() {
        const [state] = React.useState('hello');
        return <div>{state}</div>;
      }

      await expect(async () => {
        await ReactMarkup.experimental_renderToHTML(<Component />);
      }).rejects.toThrow(
        'Cannot use state or effect Hooks in renderToHTML because this component will never be hydrated.',
      );
    });

    it('should error on refs passed to host components', async () => {
      function Component() {
        const ref = React.createRef();
        return <div ref={ref} />;
      }

      await expect(async () => {
        await ReactMarkup.experimental_renderToHTML(<Component />);
      }).rejects.toThrow(
        'Cannot pass ref in renderToHTML because they will never be hydrated.',
      );
    });

    it('should error on callbacks passed to event handlers', async () => {
      function Component() {
        function onClick() {
          // This won't be able to be called.
        }
        return <div onClick={onClick} />;
      }

      await expect(async () => {
        await ReactMarkup.experimental_renderToHTML(<Component />);
      }).rejects.toThrow(
        'Cannot pass event handlers (onClick) in renderToHTML because the HTML will never be hydrated so they can never get called.',
      );
    });

    it('supports the useId Hook', async () => {
      function Component() {
        const firstNameId = React.useId();
        const lastNameId = React.useId();
        return React.createElement(
          'div',
          null,
          React.createElement(
            'h2',
            {
              id: firstNameId,
            },
            'First',
          ),
          React.createElement(
            'p',
            {
              'aria-labelledby': firstNameId,
            },
            'Sebastian',
          ),
          React.createElement(
            'h2',
            {
              id: lastNameId,
            },
            'Last',
          ),
          React.createElement(
            'p',
            {
              'aria-labelledby': lastNameId,
            },
            'Smith',
          ),
        );
      }

      const html = await ReactMarkup.experimental_renderToHTML(<Component />);
      const container = document.createElement('div');
      container.innerHTML = html;

      expect(container.getElementsByTagName('h2')[0].id).toBe(
        container.getElementsByTagName('p')[0].getAttribute('aria-labelledby'),
      );
      expect(container.getElementsByTagName('h2')[1].id).toBe(
        container.getElementsByTagName('p')[1].getAttribute('aria-labelledby'),
      );

      // It's not the same id between them.
      expect(container.getElementsByTagName('h2')[0].id).not.toBe(
        container.getElementsByTagName('p')[1].getAttribute('aria-labelledby'),
      );
    });

    // @gate disableClientCache
    it('does NOT support cache yet because it is a client component', async () => {
      let counter = 0;
      const getCount = React.cache(() => {
        return counter++;
      });
      function Component() {
        const a = getCount();
        const b = getCount();
        return (
          <div>
            {a}
            {b}
          </div>
        );
      }

      const html = await ReactMarkup.experimental_renderToHTML(<Component />);
      expect(html).toBe('<div>01</div>');
    });

    it('can get the component owner stacks for onError in dev', async () => {
      const thrownError = new Error('hi');
      const caughtErrors = [];

      function Foo() {
        return <Bar />;
      }
      function Bar() {
        return (
          <div>
            <Baz />
          </div>
        );
      }
      function Baz({unused}) {
        throw thrownError;
      }

      await expect(async () => {
        await ReactMarkup.experimental_renderToHTML(
          <div>
            <Foo />
          </div>,
          {
            onError(error, errorInfo) {
              caughtErrors.push({
                error: error,
                parentStack: errorInfo.componentStack,
                ownerStack: React.captureOwnerStack
                  ? React.captureOwnerStack()
                  : null,
              });
            },
          },
        );
      }).rejects.toThrow(thrownError);

      expect(caughtErrors.length).toBe(1);
      expect(caughtErrors[0].error).toBe(thrownError);
      expect(normalizeCodeLocInfo(caughtErrors[0].parentStack)).toBe(
        '\n    in Baz (at **)' +
          '\n    in div (at **)' +
          '\n    in Bar (at **)' +
          '\n    in Foo (at **)' +
          '\n    in div (at **)',
      );
      expect(normalizeCodeLocInfo(caughtErrors[0].ownerStack)).toBe(
        __DEV__ ? '\n    in Bar (at **)' + '\n    in Foo (at **)' : null,
      );
    });
  });
}
