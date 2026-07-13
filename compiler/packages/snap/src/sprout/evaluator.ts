/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {render} from '@testing-library/react';
import {JSDOM} from 'jsdom';
import React, {MutableRefObject} from 'react';
import util from 'util';
import {z} from 'zod/v4';
import {fromZodError} from 'zod-validation-error/v4';
import {initFbt, toJSON} from './shared-runtime';

/**
 * Set up the global environment for JSDOM tests.
 * This is a hack to let us share code and setup between the test
 * and runner environments. As an alternative, we could evaluate all setup
 * in the jsdom test environment (which provides more isolation), but that
 * may be slower.
 */
const {window: testWindow} = new JSDOM(undefined);
(globalThis as any).document = testWindow.document;
(globalThis as any).window = testWindow.window;
(globalThis as any).React = React;
(globalThis as any).render = render;
initFbt();

(globalThis as any).placeholderFn = function (..._args: Array<any>) {
  throw new Error('Fixture not implemented!');
};
export type EvaluatorResult = {
  kind: 'ok' | 'exception' | 'UnexpectedError';
  value: string;
  logs: Array<string>;
};

/**
 * Define types and schemas for fixture entrypoint
 */
const EntrypointSchema = z.strictObject({
  fn: z.union([z.function(), z.object({})]),
  params: z.array(z.any()),

  // DEPRECATED, unused
  isComponent: z.optional(z.boolean()),

  // if enabled, the `fn` is assumed to be a component and this is assumed
  // to be an array of props. the component is mounted once and rendered
  // once per set of props in this array.
  sequentialRenders: z.optional(z.nullable(z.array(z.any()))).default(null),
});
const ExportSchema = z.object({
  FIXTURE_ENTRYPOINT: EntrypointSchema,
});

const NO_ERROR_SENTINEL = Symbol();
/**
 * Wraps WrapperTestComponent in an error boundary to simplify re-rendering
 * when an exception is thrown.
 * A simpler alternative may be to re-mount test components manually.
 */
class WrapperTestComponentWithErrorBoundary extends React.Component<
  {fn: any; params: Array<any>},
  {errorFromLastRender: any}
> {
  /**
   * Limit retries of the child component by caching seen errors.
   */
  propsErrorMap: Map<any, any>;
  lastProps: any | null;
  // lastProps: object | null;
  constructor(props: any) {
    super(props);
    this.lastProps = null;
    this.propsErrorMap = new Map<any, any>();
    this.state = {
      errorFromLastRender: NO_ERROR_SENTINEL,
    };
  }
  static getDerivedStateFromError(error: any) {
    // Reschedule a second render that immediately returns the cached error
    return {errorFromLastRender: error};
  }
  override componentDidUpdate() {
    if (this.state.errorFromLastRender !== NO_ERROR_SENTINEL) {
      // Reschedule a third render that immediately returns the cached error
      this.setState({errorFromLastRender: NO_ERROR_SENTINEL});
    }
  }
  override render() {
    if (
      this.state.errorFromLastRender !== NO_ERROR_SENTINEL &&
      this.props === this.lastProps
    ) {
      /**
       * The last render errored, cache the error message to avoid running the
       * test fixture more than once
       */
      const errorMsg = `[[ (exception in render) ${this.state.errorFromLastRender?.toString()} ]]`;
      this.propsErrorMap.set(this.lastProps, errorMsg);
      return errorMsg;
    }
    this.lastProps = this.props;
    const cachedError = this.propsErrorMap.get(this.props);
    if (cachedError != null) {
      return cachedError;
    }
    return React.createElement(WrapperTestComponent, this.props);
  }
}

function WrapperTestComponent(props: {fn: any; params: Array<any>}) {
  const result = props.fn(...props.params);
  // Hacky solution to determine whether the fixture returned jsx (which
  // needs to passed through to React's runtime as-is) or a non-jsx value
  // (which should be converted to a string).
  if (typeof result === 'object' && result != null && '$$typeof' in result) {
    return result;
  } else {
    return toJSON(result);
  }
}

function renderComponentSequentiallyForEachProps(
  fn: any,
  sequentialRenders: Array<any>,
): string {
  if (sequentialRenders.length === 0) {
    throw new Error(
      'Expected at least one set of props when using `sequentialRenders`',
    );
  }
  const initialProps = sequentialRenders[0]!;
  const results = [];
  const {rerender, container} = render(
    React.createElement(WrapperTestComponentWithErrorBoundary, {
      fn,
      params: [initialProps],
    }),
  );
  results.push(container.innerHTML);

  for (let i = 1; i < sequentialRenders.length; i++) {
    rerender(
      React.createElement(WrapperTestComponentWithErrorBoundary, {
        fn,
        params: [sequentialRenders[i]],
      }),
    );
    results.push(container.innerHTML);
  }
  return results.join('\n');
}

type FixtureEvaluatorResult = Omit<EvaluatorResult, 'logs'>;
(globalThis as any).evaluateFixtureExport = function (
  exports: unknown,
): FixtureEvaluatorResult {
  const parsedExportResult = ExportSchema.safeParse(exports);
  if (!parsedExportResult.success) {
    const exportDetail =
      typeof exports === 'object' && exports != null
        ? `object ${util.inspect(exports)}`
        : `${exports}`;
    return {
      kind: 'UnexpectedError',
      value: `${fromZodError(parsedExportResult.error)}\nFound ` + exportDetail,
    };
  }
  const entrypoint = parsedExportResult.data.FIXTURE_ENTRYPOINT;
  if (entrypoint.sequentialRenders !== null) {
    const result = renderComponentSequentiallyForEachProps(
      entrypoint.fn,
      entrypoint.sequentialRenders,
    );

    return {
      kind: 'ok',
      value: result ?? 'null',
    };
  } else if (typeof entrypoint.fn === 'object') {
    // Try to run fixture as a react component. This is necessary because not
    // all components are functions (some are ForwardRef or Memo objects).
    const result = render(
      React.createElement(entrypoint.fn as any, entrypoint.params[0]),
    ).container.innerHTML;

    return {
      kind: 'ok',
      value: result ?? 'null',
    };
  } else {
    const result = render(React.createElement(WrapperTestComponent, entrypoint))
      .container.innerHTML;

    return {
      kind: 'ok',
      value: result ?? 'null',
    };
  }
};

export function doEval(source: string): EvaluatorResult {
  'use strict';

  const originalConsole = globalThis.console;
  const logs: Array<string> = [];
  const mockedLog = (...args: Array<any>) => {
    logs.push(
      `${args.map(arg => {
        if (arg instanceof Error) {
          return arg.toString();
        } else {
          return util.inspect(arg);
        }
      })}`,
    );
  };

  (globalThis.console as any) = {
    info: mockedLog,
    log: mockedLog,
    warn: mockedLog,
    error: (...args: Array<any>) => {
      if (
        typeof args[0] === 'string' &&
        args[0].includes('ReactDOMTestUtils.act` is deprecated')
      ) {
        // remove this once @testing-library/react is upgraded to React 19.
        return;
      }

      const stack = new Error().stack?.split('\n', 5) ?? [];
      for (const stackFrame of stack) {
        // React warns on exceptions thrown during render, we avoid printing
        // here to reduce noise in test fixture outputs.
        if (
          (stackFrame.includes('at logCaughtError') &&
            stackFrame.includes('react-dom-client.development.js')) ||
          (stackFrame.includes('at defaultOnRecoverableError') &&
            stackFrame.includes('react-dom-client.development.js'))
        ) {
          return;
        }
      }
      mockedLog(...args);
    },
    table: mockedLog,
    trace: () => {},
  };
  try {
    // source needs to be evaluated in the same scope as invoke
    const evalResult: any = eval(`
    (() => {
      // Exports should be overwritten by source
      let exports = {
        FIXTURE_ENTRYPOINT: {
          fn: globalThis.placeholderFn,
          params: [],
        },
      };
      let reachedInvoke = false;
      try {
        // run in an iife to avoid naming collisions
        (() => {${source}})();
        reachedInvoke = true;
        if (exports.FIXTURE_ENTRYPOINT?.fn === globalThis.placeholderFn) {
          return {
            kind: "exception",
            value: "Fixture not implemented",
          };
        }
        return evaluateFixtureExport(exports);
      } catch (e) {
        if (!reachedInvoke) {
          return {
            kind: "UnexpectedError",
            value: e.message,
          };
        } else {
          return {
            kind: "exception",
            value: e.message,
          };
        }
      }
    })()`);

    const result = {
      ...evalResult,
      logs,
    };
    return result;
  } catch (e) {
    // syntax errors will cause the eval to throw and bubble up here
    return {
      kind: 'UnexpectedError',
      value:
        'Unexpected error during eval, possible syntax error?\n' +
        e.message +
        '\n\nsource:\n' +
        source,
      logs,
    };
  } finally {
    globalThis.console = originalConsole;
  }
}
