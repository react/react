/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {transformSync} from '@babel/core';
import {createRequire} from 'module';
import type {NodePath as BabelNodePath} from '@babel/traverse';
import BabelPluginReactCompiler from '..';
import type {Logger, LoggerEvent} from '..';
import {parseConfigPragmaForTests} from '../Utils/TestUtils';

const requireFromBabelCore = createRequire(require.resolve('@babel/core'));
const babelCoreTraverse: typeof import('@babel/traverse') =
  requireFromBabelCore('@babel/traverse');
const {NodePath} = babelCoreTraverse;

const source = `
export const Badge = ({variant = "primary", ...rest}) => {
  return <div {...rest} />;
};
`;

const sourceAssignment = `
export function Counter(props) {
  let value;
  ({value = 0} = props);
  const onClick = () => value;
  return <button onClick={onClick}>{value}</button>;
}
`;

describe('Babel 8 compatibility', () => {
  test('compiles object destructuring parameter default when Babel 8 rejects AssignmentPattern as LVal', () => {
    const events: Array<LoggerEvent> = [];
    const logger: Logger = {
      logEvent(_filename, event) {
        events.push(event);
      },
      debugLogIRs() {},
    };
    const originalIsLVal = NodePath.prototype.isLVal;
    NodePath.prototype.isLVal = function (this: BabelNodePath): boolean {
      if (this.isAssignmentPattern()) {
        return false;
      }
      return originalIsLVal.call(this);
    };

    try {
      expect(() => {
        transformSync(source, {
          filename: 'badge.jsx',
          plugins: [
            '@babel/plugin-syntax-jsx',
            [
              BabelPluginReactCompiler,
              {
                ...parseConfigPragmaForTests('', {compilationMode: 'all'}),
                logger,
                enableReanimatedCheck: false,
              },
            ],
          ],
          configFile: false,
          babelrc: false,
        });
      }).not.toThrow(
        'Expected object property value to be an LVal, got: AssignmentPattern',
      );
      const compileErrors = events.flatMap(event => {
        if (event.kind === 'CompileError') {
          return [event.detail.reason];
        }
        return [];
      });
      expect(compileErrors).toEqual([]);
      expect(events.some(event => event.kind === 'CompileSuccess')).toBe(true);
    } finally {
      NodePath.prototype.isLVal = originalIsLVal;
    }
  });

  test('compiles object destructuring assignment default when Babel 8 rejects AssignmentPattern as LVal', () => {
    const events: Array<LoggerEvent> = [];
    const logger: Logger = {
      logEvent(_filename, event) {
        events.push(event);
      },
      debugLogIRs() {},
    };
    const originalIsLVal = NodePath.prototype.isLVal;
    NodePath.prototype.isLVal = function (this: BabelNodePath): boolean {
      if (this.isAssignmentPattern()) {
        return false;
      }
      return originalIsLVal.call(this);
    };

    try {
      expect(() => {
        transformSync(sourceAssignment, {
          filename: 'counter.jsx',
          plugins: [
            '@babel/plugin-syntax-jsx',
            [
              BabelPluginReactCompiler,
              {
                ...parseConfigPragmaForTests('', {compilationMode: 'all'}),
                logger,
                enableReanimatedCheck: false,
              },
            ],
          ],
          configFile: false,
          babelrc: false,
        });
      }).not.toThrow(
        'Expected object property value to be an LVal, got: AssignmentPattern',
      );
      const compileErrors = events.flatMap(event => {
        if (event.kind === 'CompileError') {
          return [event.detail.reason];
        }
        return [];
      });
      expect(compileErrors).toEqual([]);
      expect(events.some(event => event.kind === 'CompileSuccess')).toBe(true);
    } finally {
      NodePath.prototype.isLVal = originalIsLVal;
    }
  });
});
