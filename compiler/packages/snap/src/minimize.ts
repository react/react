/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type {PluginObj} from '@babel/core';
import {transformFromAstSync} from '@babel/core';
import generate from '@babel/generator';
import traverse from '@babel/traverse';
import * as t from '@babel/types';
import type {parseConfigPragmaForTests as ParseConfigPragma} from 'babel-plugin-react-compiler/src/Utils/TestUtils';
import {parseInput} from './compiler.js';
import {
  PARSE_CONFIG_PRAGMA_IMPORT,
  BABEL_PLUGIN_SRC,
  BABEL_PLUGIN_RUST_SRC,
} from './constants.js';

type CompileSuccess = {kind: 'success'};
type CompileParseError = {kind: 'parse_error'; message: string};
type CompileErrors = {
  kind: 'errors';
  errors: Array<{category: string; reason: string; description: string | null}>;
};
type CompileResult = CompileSuccess | CompileParseError | CompileErrors;

/**
 * Compile code and extract error information
 */
function compileAndGetError(
  code: string,
  filename: string,
  language: 'flow' | 'typescript',
  sourceType: 'module' | 'script',
  plugin: PluginObj,
  parseConfigPragmaFn: typeof ParseConfigPragma,
): CompileResult {
  let ast: t.File;
  try {
    ast = parseInput(code, filename, language, sourceType);
  } catch (e: unknown) {
    return {kind: 'parse_error', message: (e as Error).message};
  }

  const firstLine = code.substring(0, code.indexOf('\n'));
  const config = parseConfigPragmaFn(firstLine, {compilationMode: 'all'});
  const options = {
    ...config,
    environment: {
      ...config.environment,
    },
    logger: {
      logEvent: () => {},
      debugLogIRs: () => {},
    },
    enableReanimatedCheck: false,
  };

  try {
    transformFromAstSync(ast, code, {
      filename: '/' + filename,
      highlightCode: false,
      retainLines: true,
      compact: true,
      plugins: [[plugin, options]],
      sourceType: 'module',
      ast: false,
      cloneInputAst: true,
      configFile: false,
      babelrc: false,
    });
    return {kind: 'success'};
  } catch (e: unknown) {
    const error = e as Error & {
      details?: Array<{
        category: string;
        reason: string;
        description: string | null;
      }>;
    };
    // Check if this is a CompilerError with details
    if (error.details && error.details.length > 0) {
      return {
        kind: 'errors',
        errors: error.details.map(detail => ({
          category: detail.category,
          reason: detail.reason,
          description: detail.description,
        })),
      };
    }
    // Fallback for other errors - use error name/message
    return {
      kind: 'errors',
      errors: [
        {
          category: error.name ?? 'Error',
          reason: error.message,
          description: null,
        },
      ],
    };
  }
}

/**
 * Check if two compile errors match
 */
function errorsMatch(a: CompileErrors, b: CompileResult): boolean {
  if (b.kind !== 'errors') {
    return false;
  }
  if (a.errors.length !== b.errors.length) {
    return false;
  }
  for (let i = 0; i < a.errors.length; i++) {
    if (
      a.errors[i].category !== b.errors[i].category ||
      a.errors[i].reason !== b.errors[i].reason ||
      a.errors[i].description !== b.errors[i].description
    ) {
      return false;
    }
  }
  return true;
}

/**
 * Convert AST to code string
 */
function astToCode(ast: t.File): string {
  return generate(ast).code;
}

/**
 * Clone an AST node deeply
 */
function cloneAst(ast: t.File): t.File {
  return t.cloneNode(ast, true);
}

/**
 * Generator that yields ASTs with statements removed one at a time
 */
function* removeStatements(ast: t.File): Generator<t.File> {
  // Collect all statement locations: which container (by index) and which statement index
  const statementLocations: Array<{containerIndex: number; stmtIndex: number}> =
    [];
  let containerIndex = 0;

  t.traverseFast(ast, node => {
    if (t.isBlockStatement(node) || t.isProgram(node)) {
      const body = node.body as t.Statement[];
      // Iterate in reverse order so removing later statements first
      for (let i = body.length - 1; i >= 0; i--) {
        statementLocations.push({containerIndex, stmtIndex: i});
      }
      containerIndex++;
    }
  });

  for (const {
    containerIndex: targetContainerIdx,
    stmtIndex,
  } of statementLocations) {
    const cloned = cloneAst(ast);
    let idx = 0;
    let modified = false;

    t.traverseFast(cloned, node => {
      if (modified) return;
      if (t.isBlockStatement(node) || t.isProgram(node)) {
        if (idx === targetContainerIdx) {
          const body = node.body as t.Statement[];
          if (stmtIndex < body.length) {
            body.splice(stmtIndex, 1);
            modified = true;
          }
        }
        idx++;
      }
    });

    if (modified) {
      yield cloned;
    }
  }
}

/**
 * Generator that yields ASTs with call arguments removed one at a time
 */
function* removeCallArguments(ast: t.File): Generator<t.File> {
  // Collect all call expressions with their argument counts
  const callSites: Array<{callIndex: number; argCount: number}> = [];
  let callIndex = 0;
  t.traverseFast(ast, node => {
    if (t.isCallExpression(node) && node.arguments.length > 0) {
      callSites.push({callIndex, argCount: node.arguments.length});
      callIndex++;
    }
  });

  // For each call site, try removing each argument one at a time (from end to start)
  for (const {callIndex: targetCallIdx, argCount} of callSites) {
    for (let argIdx = argCount - 1; argIdx >= 0; argIdx--) {
      const cloned = cloneAst(ast);
      let idx = 0;
      let modified = false;

      t.traverseFast(cloned, node => {
        if (modified) return;
        if (t.isCallExpression(node) && node.arguments.length > 0) {
          if (idx === targetCallIdx && argIdx < node.arguments.length) {
            node.arguments.splice(argIdx, 1);
            modified = true;
          }
          idx++;
        }
      });

      if (modified) {
        yield cloned;
      }
    }
  }
}

/**
 * Generator that yields ASTs with function parameters removed one at a time
 */
function* removeFunctionParameters(ast: t.File): Generator<t.File> {
  // Collect all functions with parameters
  const funcSites: Array<{funcIndex: number; paramCount: number}> = [];
  let funcIndex = 0;
  t.traverseFast(ast, node => {
    if (t.isFunction(node) && node.params.length > 0) {
      funcSites.push({funcIndex, paramCount: node.params.length});
      funcIndex++;
    }
  });

  // For each function, try removing each parameter (from end to start)
  for (const {funcIndex: targetFuncIdx, paramCount} of funcSites) {
    for (let paramIdx = paramCount - 1; paramIdx >= 0; paramIdx--) {
      const cloned = cloneAst(ast);
      let idx = 0;
      let modified = false;

      t.traverseFast(cloned, node => {
        if (modified) return;
        if (t.isFunction(node) && node.params.length > 0) {
          if (idx === targetFuncIdx && paramIdx < node.params.length) {
            node.params.splice(paramIdx, 1);
            modified = true;
          }
          idx++;
        }
      });

      if (modified) {
        yield cloned;
      }
    }
  }
}

/**
 * Generator that simplifies call expressions by replacing them with their arguments.
 * For single argument: foo(x) -> x
 * For multiple arguments: foo(x, y) -> [x, y]
 */
function* simplifyCallExpressions(ast: t.File): Generator<t.File> {
  // Count call expressions with arguments
  let callCount = 0;
  t.traverseFast(ast, node => {
    if (t.isCallExpression(node) && node.arguments.length > 0) {
      callCount++;
    }
  });

  // For each call, try replacing with arguments
  for (let targetIdx = 0; targetIdx < callCount; targetIdx++) {
    const cloned = cloneAst(ast);
    let idx = 0;
    let modified = false;

    traverse(cloned, {
      CallExpression(path) {
        if (modified) return;
        if (path.node.arguments.length > 0 && idx === targetIdx) {
          const args = path.node.arguments;
          // Filter to only Expression arguments (not SpreadElement)
          const exprArgs = args.filter((arg): arg is t.Expression =>
            t.isExpression(arg),
          );
          if (exprArgs.length === 0) {
            idx++;
            return;
          }
          if (exprArgs.length === 1) {
            // Single argument: replace call with the argument
            path.replaceWith(exprArgs[0]);
          } else {
            // Multiple arguments: replace call with array of arguments
            path.replaceWith(t.arrayExpression(exprArgs));
          }
          modified = true;
        }
        idx++;
      },
    });

    if (modified) {
      yield cloned;
    }
  }

  // Also try replacing with each individual argument for multi-arg calls
  for (let targetIdx = 0; targetIdx < callCount; targetIdx++) {
    // First, find the arg count for this call
    let argCount = 0;
    let currentIdx = 0;
    t.traverseFast(ast, node => {
      if (t.isCallExpression(node) && node.arguments.length > 0) {
        if (currentIdx === targetIdx) {
          argCount = node.arguments.length;
        }
        currentIdx++;
      }
    });

    // Try replacing with each argument individually
    for (let argIdx = 0; argIdx < argCount; argIdx++) {
      const cloned = cloneAst(ast);
      let idx = 0;
      let modified = false;

      traverse(cloned, {
        CallExpression(path) {
          if (modified) return;
          if (path.node.arguments.length > 0 && idx === targetIdx) {
            const arg = path.node.arguments[argIdx];
            if (t.isExpression(arg)) {
              path.replaceWith(arg);
              modified = true;
            }
          }
          idx++;
        },
      });

      if (modified) {
        yield cloned;
      }
    }
  }
}

/**
 * Generator that simplifies conditional expressions (a ? b : c) -> a, b, or c
 */
function* simplifyConditionals(ast: t.File): Generator<t.File> {
  // Count conditionals
  let condCount = 0;
  t.traverseFast(ast, node => {
    if (t.isConditionalExpression(node)) {
      condCount++;
    }
  });

  // Try replacing with test condition
  for (let targetIdx = 0; targetIdx < condCount; targetIdx++) {
    const cloned = cloneAst(ast);
    let modified = false;
    let idx = 0;

    traverse(cloned, {
      ConditionalExpression(path) {
        if (modified) return;
        if (idx === targetIdx) {
          path.replaceWith(path.node.test);
          modified = true;
        }
        idx++;
      },
    });

    if (modified) {
      yield cloned;
    }
  }

  // Try replacing with consequent
  for (let targetIdx = 0; targetIdx < condCount; targetIdx++) {
    const cloned = cloneAst(ast);
    let modified = false;
    let idx = 0;

    traverse(cloned, {
      ConditionalExpression(path) {
        if (modified) return;
        if (idx === targetIdx) {
          path.replaceWith(path.node.consequent);
          modified = true;
        }
        idx++;
      },
    });

    if (modified) {
      yield cloned;
    }
  }

  // Also try replacing with alternate
  for (let targetIdx = 0; targetIdx < condCount; targetIdx++) {
    const cloned = cloneAst(ast);
    let modified = false;
    let idx = 0;

    traverse(cloned, {
      ConditionalExpression(path) {
        if (modified) return;
        if (idx === targetIdx) {
          path.replaceWith(path.node.alternate);
          modified = true;
        }
        idx++;
      },
    });

    if (modified) {
      yield cloned;
    }
  }
}

/**
 * Generator that simplifies logical expressions (a && b) -> a or b
 */
function* simplifyLogicalExpressions(ast: t.File): Generator<t.File> {
  // Count logical expressions
  let logicalCount = 0;
  t.traverseFast(ast, node => {
    if (t.isLogicalExpression(node)) {
      logicalCount++;
    }
  });

  // Try replacing with left side
  for (let targetIdx = 0; targetIdx < logicalCount; targetIdx++) {
    const cloned = cloneAst(ast);
    let idx = 0;
    let modified = false;

    traverse(cloned, {
      LogicalExpression(path) {
        if (modified) return;
        if (idx === targetIdx) {
          path.replaceWith(path.node.left);
          modified = true;
        }
        idx++;
      },
    });

    if (modified) {
      yield cloned;
    }
  }

  // Try replacing with right side
  for (let targetIdx = 0; targetIdx < logicalCount; targetIdx++) {
    const cloned = cloneAst(ast);
    let idx = 0;
    let modified = false;

    traverse(cloned, {
      LogicalExpression(path) {
        if (modified) return;
        if (idx === targetIdx) {
          path.replaceWith(path.node.right);
          modified = true;
        }
        idx++;
      },
    });

    if (modified) {
      yield cloned;
    }
  }
}

/**
 * Generator that simplifies optional chains (a?.b) -> a.b
 */
function* simplifyOptionalChains(ast: t.File): Generator<t.File> {
  // Count optional expressions
  let optionalCount = 0;
  t.traverseFast(ast, node => {
    if (
      t.isOptionalMemberExpression(node) ||
      t.isOptionalCallExpression(node)
    ) {
      optionalCount++;
    }
  });

  for (let targetIdx = 0; targetIdx < optionalCount; targetIdx++) {
    const cloned = cloneAst(ast);
    let idx = 0;
    let modified = false;

    traverse(cloned, {
      OptionalMemberExpression(path) {
        if (modified) return;
        if (idx === targetIdx) {
          const {object, property, computed} = path.node;
          path.replaceWith(t.memberExpression(object, property, computed));
          modified = true;
        }
        idx++;
      },
      OptionalCallExpression(path) {
        if (modified) return;
        if (idx === targetIdx) {
          const {callee, arguments: args} = path.node;
          if (t.isExpression(callee)) {
            path.replaceWith(t.callExpression(callee, args));
            modified = true;
          }
        }
        idx++;
      },
    });

    if (modified) {
      yield cloned;
    }
  }
}

/**
 * Generator that simplifies await expressions: await expr -> expr
 */
function* simplifyAwaitExpressions(ast: t.File): Generator<t.File> {
  // Count await expressions
  let awaitCount = 0;
  t.traverseFast(ast, node => {
    if (t.isAwaitExpression(node)) {
      awaitCount++;
    }
  });

  for (let targetIdx = 0; targetIdx < awaitCount; targetIdx++) {
    const cloned = cloneAst(ast);
    let idx = 0;
    let modified = false;

    traverse(cloned, {
      AwaitExpression(path) {
        if (modified) return;
        if (idx === targetIdx) {
          path.replaceWith(path.node.argument);
          modified = true;
        }
        idx++;
      },
    });

    if (modified) {
      yield cloned;
    }
  }
}

/**
 * Generator that simplifies if statements:
 * - Replace with test expression (as expression statement)
 * - Replace with consequent block
 * - Replace with alternate block (if present)
 */
function* simplifyIfStatements(ast: t.File): Generator<t.File> {
  // Count if statements
  let ifCount = 0;
  t.traverseFast(ast, node => {
    if (t.isIfStatement(node)) {
      ifCount++;
    }
  });

  // Try replacing with test expression
  for (let targetIdx = 0; targetIdx < ifCount; targetIdx++) {
    const cloned = cloneAst(ast);
    let idx = 0;
    let modified = false;

    traverse(cloned, {
      IfStatement(path) {
        if (modified) return;
        if (idx === targetIdx) {
          path.replaceWith(t.expressionStatement(path.node.test));
          modified = true;
        }
        idx++;
      },
    });

    if (modified) {
      yield cloned;
    }
  }

  // Try replacing with consequent
  for (let targetIdx = 0; targetIdx < ifCount; targetIdx++) {
    const cloned = cloneAst(ast);
    let idx = 0;
    let modified = false;

    traverse(cloned, {
      IfStatement(path) {
        if (modified) return;
        if (idx === targetIdx) {
          path.replaceWith(path.node.consequent);
          modified = true;
        }
        idx++;
      },
    });

    if (modified) {
      yield cloned;
    }
  }

  // Try replacing with alternate (if present)
  for (let targetIdx = 0; targetIdx < ifCount; targetIdx++) {
    const cloned = cloneAst(ast);
    let idx = 0;
    let modified = false;

    traverse(cloned, {
      IfStatement(path) {
        if (modified) return;
        if (idx === targetIdx && path.node.alternate) {
          path.replaceWith(path.node.alternate);
          modified = true;
        }
        idx++;
      },
    });

    if (modified) {
      yield cloned;
    }
  }
}

/**
 * Generator that simplifies switch statements:
 * - Replace with discriminant expression
 * - Replace with each case's consequent statements
 */
function* simplifySwitchStatements(ast: t.File): Generator<t.File> {
  // Count switch statements
  let switchCount = 0;
  t.traverseFast(ast, node => {
    if (t.isSwitchStatement(node)) {
      switchCount++;
    }
  });

  // Try replacing with discriminant
  for (let targetIdx = 0; targetIdx < switchCount; targetIdx++) {
    const cloned = cloneAst(ast);
    let idx = 0;
    let modified = false;

    traverse(cloned, {
      SwitchStatement(path) {
        if (modified) return;
        if (idx === targetIdx) {
          path.replaceWith(t.expressionStatement(path.node.discriminant));
          modified = true;
        }
        idx++;
      },
    });

    if (modified) {
      yield cloned;
    }
  }

  // For each switch, try replacing with each case's body
  for (let targetIdx = 0; targetIdx < switchCount; targetIdx++) {
    // Find case count for this switch
    let caseCount = 0;
    let currentIdx = 0;
    t.traverseFast(ast, node => {
      if (t.isSwitchStatement(node)) {
        if (currentIdx === targetIdx) {
          caseCount = node.cases.length;
        }
        currentIdx++;
      }
    });

    for (let caseIdx = 0; caseIdx < caseCount; caseIdx++) {
      const cloned = cloneAst(ast);
      let idx = 0;
      let modified = false;

      traverse(cloned, {
        SwitchStatement(path) {
          if (modified) return;
          if (idx === targetIdx) {
            const switchCase = path.node.cases[caseIdx];
            if (switchCase && switchCase.consequent.length > 0) {
              path.replaceWithMultiple(switchCase.consequent);
              modified = true;
            }
          }
          idx++;
        },
      });

      if (modified) {
        yield cloned;
      }
    }
  }
}

/**
 * Generator that simplifies while statements:
 * - Replace with test expression
 * - Replace with body
 */
function* simplifyWhileStatements(ast: t.File): Generator<t.File> {
  // Count while statements
  let whileCount = 0;
  t.traverseFast(ast, node => {
    if (t.isWhileStatement(node)) {
      whileCount++;
    }
  });

  // Try replacing with test
  for (let targetIdx = 0; targetIdx < whileCount; targetIdx++) {
    const cloned = cloneAst(ast);
    let idx = 0;
    let modified = false;

    traverse(cloned, {
      WhileStatement(path) {
        if (modified) return;
        if (idx === targetIdx) {
          path.replaceWith(t.expressionStatement(path.node.test));
          modified = true;
        }
        idx++;
      },
    });

    if (modified) {
      yield cloned;
    }
  }

  // Try replacing with body
  for (let targetIdx = 0; targetIdx < whileCount; targetIdx++) {
    const cloned = cloneAst(ast);
    let idx = 0;
    let modified = false;

    traverse(cloned, {
      WhileStatement(path) {
        if (modified) return;
        if (idx === targetIdx) {
          path.replaceWith(path.node.body);
          modified = true;
        }
        idx++;
      },
    });

    if (modified) {
      yield cloned;
    }
  }
}

/**
 * Generator that simplifies do-while statements:
 * - Replace with test expression
 * - Replace with body
 */
function* simplifyDoWhileStatements(ast: t.File): Generator<t.File> {
  // Count do-while statements
  let doWhileCount = 0;
  t.traverseFast(ast, node => {
    if (t.isDoWhileStatement(node)) {
      doWhileCount++;
    }
  });

  // Try replacing with test
  for (let targetIdx = 0; targetIdx < doWhileCount; targetIdx++) {
    const cloned = cloneAst(ast);
    let idx = 0;
    let modified = false;

    traverse(cloned, {
      DoWhileStatement(path) {
        if (modified) return;
        if (idx === targetIdx) {
          path.replaceWith(t.expressionStatement(path.node.test));
          modified = true;
        }
        idx++;
      },
    });

    if (modified) {
      yield cloned;
    }
  }

  // Try replacing with body
  for (let targetIdx = 0; targetIdx < doWhileCount; targetIdx++) {
    const cloned = cloneAst(ast);
    let idx = 0;
    let modified = false;

    traverse(cloned, {
      DoWhileStatement(path) {
        if (modified) return;
        if (idx === targetIdx) {
          path.replaceWith(path.node.body);
          modified = true;
        }
        idx++;
      },
    });

    if (modified) {
      yield cloned;
    }
  }
}

/**
 * Generator that simplifies for statements:
 * - Replace with init (if expression)
 * - Replace with test expression
 * - Replace with update expression
 * - Replace with body
 */
function* simplifyForStatements(ast: t.File): Generator<t.File> {
  // Count for statements
  let forCount = 0;
  t.traverseFast(ast, node => {
    if (t.isForStatement(node)) {
      forCount++;
    }
  });

  // Try replacing with init (if it's an expression)
  for (let targetIdx = 0; targetIdx < forCount; targetIdx++) {
    const cloned = cloneAst(ast);
    let idx = 0;
    let modified = false;

    traverse(cloned, {
      ForStatement(path) {
        if (modified) return;
        if (idx === targetIdx && path.node.init) {
          if (t.isExpression(path.node.init)) {
            path.replaceWith(t.expressionStatement(path.node.init));
          } else {
            // It's a VariableDeclaration
            path.replaceWith(path.node.init);
          }
          modified = true;
        }
        idx++;
      },
    });

    if (modified) {
      yield cloned;
    }
  }

  // Try replacing with test
  for (let targetIdx = 0; targetIdx < forCount; targetIdx++) {
    const cloned = cloneAst(ast);
    let idx = 0;
    let modified = false;

    traverse(cloned, {
      ForStatement(path) {
        if (modified) return;
        if (idx === targetIdx && path.node.test) {
          path.replaceWith(t.expressionStatement(path.node.test));
          modified = true;
        }
        idx++;
      },
    });

    if (modified) {
      yield cloned;
    }
  }

  // Try replacing with update
  for (let targetIdx = 0; targetIdx < forCount; targetIdx++) {
    const cloned = cloneAst(ast);
    let idx = 0;
    let modified = false;

    traverse(cloned, {
      ForStatement(path) {
        if (modified) return;
        if (idx === targetIdx && path.node.update) {
          path.replaceWith(t.expressionStatement(path.node.update));
          modified = true;
        }
        idx++;
      },
    });

    if (modified) {
      yield cloned;
    }
  }

  // Try replacing with body
  for (let targetIdx = 0; targetIdx < forCount; targetIdx++) {
    const cloned = cloneAst(ast);
    let idx = 0;
    let modified = false;

    traverse(cloned, {
      ForStatement(path) {
        if (modified) return;
        if (idx === targetIdx) {
          path.replaceWith(path.node.body);
          modified = true;
        }
        idx++;
      },
    });

    if (modified) {
      yield cloned;
    }
  }
}

/**
 * Generator that simplifies for-in statements:
 * - Replace with left (variable declaration or expression)
 * - Replace with right expression
 * - Replace with body
 */
function* simplifyForInStatements(ast: t.File): Generator<t.File> {
  // Count for-in statements
  let forInCount = 0;
  t.traverseFast(ast, node => {
    if (t.isForInStatement(node)) {
      forInCount++;
    }
  });

  // Try replacing with left
  for (let targetIdx = 0; targetIdx < forInCount; targetIdx++) {
    const cloned = cloneAst(ast);
    let idx = 0;
    let modified = false;

    traverse(cloned, {
      ForInStatement(path) {
        if (modified) return;
        if (idx === targetIdx) {
          const left = path.node.left;
          if (t.isExpression(left)) {
            path.replaceWith(t.expressionStatement(left));
          } else {
            path.replaceWith(left);
          }
          modified = true;
        }
        idx++;
      },
    });

    if (modified) {
      yield cloned;
    }
  }

  // Try replacing with right
  for (let targetIdx = 0; targetIdx < forInCount; targetIdx++) {
    const cloned = cloneAst(ast);
    let idx = 0;
    let modified = false;

    traverse(cloned, {
      ForInStatement(path) {
        if (modified) return;
        if (idx === targetIdx) {
          path.replaceWith(t.expressionStatement(path.node.right));
          modified = true;
        }
        idx++;
      },
    });

    if (modified) {
      yield cloned;
    }
  }

  // Try replacing with body
  for (let targetIdx = 0; targetIdx < forInCount; targetIdx++) {
    const cloned = cloneAst(ast);
    let idx = 0;
    let modified = false;

    traverse(cloned, {
      ForInStatement(path) {
        if (modified) return;
        if (idx === targetIdx) {
          path.replaceWith(path.node.body);
          modified = true;
        }
        idx++;
      },
    });

    if (modified) {
      yield cloned;
    }
  }
}

/**
 * Generator that simplifies for-of statements:
 * - Replace with left (variable declaration or expression)
 * - Replace with right expression
 * - Replace with body
 */
function* simplifyForOfStatements(ast: t.File): Generator<t.File> {
  // Count for-of statements
  let forOfCount = 0;
  t.traverseFast(ast, node => {
    if (t.isForOfStatement(node)) {
      forOfCount++;
    }
  });

  // Try replacing with left
  for (let targetIdx = 0; targetIdx < forOfCount; targetIdx++) {
    const cloned = cloneAst(ast);
    let idx = 0;
    let modified = false;

    traverse(cloned, {
      ForOfStatement(path) {
        if (modified) return;
        if (idx === targetIdx) {
          const left = path.node.left;
          if (t.isExpression(left)) {
            path.replaceWith(t.expressionStatement(left));
          } else {
            path.replaceWith(left);
          }
          modified = true;
        }
        idx++;
      },
    });

    if (modified) {
      yield cloned;
    }
  }

  // Try replacing with right
  for (let targetIdx = 0; targetIdx < forOfCount; targetIdx++) {
    const cloned = cloneAst(ast);
    let idx = 0;
    let modified = false;

    traverse(cloned, {
      ForOfStatement(path) {
        if (modified) return;
        if (idx === targetIdx) {
          path.replaceWith(t.expressionStatement(path.node.right));
          modified = true;
        }
        idx++;
      },
    });

    if (modified) {
      yield cloned;
    }
  }

  // Try replacing with body
  for (let targetIdx = 0; targetIdx < forOfCount; targetIdx++) {
    const cloned = cloneAst(ast);
    let idx = 0;
    let modified = false;

    traverse(cloned, {
      ForOfStatement(path) {
        if (modified) return;
        if (idx === targetIdx) {
          path.replaceWith(path.node.body);
          modified = true;
        }
        idx++;
      },
    });

    if (modified) {
      yield cloned;
    }
  }
}

/**
 * Generator that simplifies variable declarations by removing init expressions.
 * let x = expr; -> let x;
 * var x = expr; -> var x;
 * Note: const without init is invalid, so we skip const declarations.
 */
function* simplifyVariableDeclarations(ast: t.File): Generator<t.File> {
  // Collect all variable declarators with init expressions (excluding const)
  const declaratorSites: Array<{declIndex: number}> = [];
  let declIndex = 0;
  t.traverseFast(ast, node => {
    if (t.isVariableDeclaration(node) && node.kind !== 'const') {
      for (const declarator of node.declarations) {
        if (declarator.init) {
          declaratorSites.push({declIndex});
          declIndex++;
        }
      }
    }
  });

  // Try removing init from each declarator
  for (const {declIndex: targetDeclIdx} of declaratorSites) {
    const cloned = cloneAst(ast);
    let idx = 0;
    let modified = false;

    t.traverseFast(cloned, node => {
      if (modified) return;
      if (t.isVariableDeclaration(node) && node.kind !== 'const') {
        for (const declarator of node.declarations) {
          if (declarator.init) {
            if (idx === targetDeclIdx) {
              declarator.init = null;
              modified = true;
              return;
            }
            idx++;
          }
        }
      }
    });

    if (modified) {
      yield cloned;
    }
  }
}

/**
 * Generator that simplifies try/catch/finally statements:
 * - Replace with try block contents
 * - Replace with catch block contents (if present)
 * - Replace with finally block contents (if present)
 */
function* simplifyTryStatements(ast: t.File): Generator<t.File> {
  // Count try statements
  let tryCount = 0;
  t.traverseFast(ast, node => {
    if (t.isTryStatement(node)) {
      tryCount++;
    }
  });

  // Try replacing with try block contents
  for (let targetIdx = 0; targetIdx < tryCount; targetIdx++) {
    const cloned = cloneAst(ast);
    let idx = 0;
    let modified = false;

    traverse(cloned, {
      TryStatement(path) {
        if (modified) return;
        if (idx === targetIdx) {
          path.replaceWith(path.node.block);
          modified = true;
        }
        idx++;
      },
    });

    if (modified) {
      yield cloned;
    }
  }

  // Try replacing with catch block contents (if present)
  for (let targetIdx = 0; targetIdx < tryCount; targetIdx++) {
    const cloned = cloneAst(ast);
    let idx = 0;
    let modified = false;

    traverse(cloned, {
      TryStatement(path) {
        if (modified) return;
        if (idx === targetIdx && path.node.handler) {
          path.replaceWith(path.node.handler.body);
          modified = true;
        }
        idx++;
      },
    });

    if (modified) {
      yield cloned;
    }
  }

  // Try replacing with finally block contents (if present)
  for (let targetIdx = 0; targetIdx < tryCount; targetIdx++) {
    const cloned = cloneAst(ast);
    let idx = 0;
    let modified = false;

    traverse(cloned, {
      TryStatement(path) {
        if (modified) return;
        if (idx === targetIdx && path.node.finalizer) {
          path.replaceWith(path.node.finalizer);
          modified = true;
        }
        idx++;
      },
    });

    if (modified) {
      yield cloned;
    }
  }
}

/**
 * Generator that simplifies single-statement block statements:
 * { statement } -> statement
 */
function* simplifySingleStatementBlocks(ast: t.File): Generator<t.File> {
  // Count block statements with exactly one statement
  let blockCount = 0;
  t.traverseFast(ast, node => {
    if (t.isBlockStatement(node) && node.body.length === 1) {
      blockCount++;
    }
  });

  for (let targetIdx = 0; targetIdx < blockCount; targetIdx++) {
    const cloned = cloneAst(ast);
    let idx = 0;
    let modified = false;

    traverse(cloned, {
      BlockStatement(path) {
        if (modified) return;
        if (path.node.body.length === 1 && idx === targetIdx) {
          // Don't unwrap blocks that require BlockStatement syntax
          if (
            t.isFunction(path.parent) ||
            t.isCatchClause(path.parent) ||
            t.isClassMethod(path.parent) ||
            t.isObjectMethod(path.parent) ||
            t.isTryStatement(path.parent)
          ) {
            idx++;
            return;
          }
          path.replaceWith(path.node.body[0]);
          modified = true;
        }
        idx++;
      },
    });

    if (modified) {
      yield cloned;
    }
  }
}

/**
 * Generator that removes array elements one at a time
 */
function* removeArrayElements(ast: t.File): Generator<t.File> {
  // Collect all array expressions with their element counts
  const arraySites: Array<{arrayIndex: number; elementCount: number}> = [];
  let arrayIndex = 0;
  t.traverseFast(ast, node => {
    if (t.isArrayExpression(node) && node.elements.length > 0) {
      arraySites.push({arrayIndex, elementCount: node.elements.length});
      arrayIndex++;
    }
  });

  // For each array, try removing each element one at a time (from end to start)
  for (const {arrayIndex: targetArrayIdx, elementCount} of arraySites) {
    for (let elemIdx = elementCount - 1; elemIdx >= 0; elemIdx--) {
      const cloned = cloneAst(ast);
      let idx = 0;
      let modified = false;

      t.traverseFast(cloned, node => {
        if (modified) return;
        if (t.isArrayExpression(node) && node.elements.length > 0) {
          if (idx === targetArrayIdx && elemIdx < node.elements.length) {
            node.elements.splice(elemIdx, 1);
            modified = true;
          }
          idx++;
        }
      });

      if (modified) {
        yield cloned;
      }
    }
  }
}

/**
 * Generator that removes JSX element attributes (props) one at a time
 */
function* removeJSXAttributes(ast: t.File): Generator<t.File> {
  // Collect all JSX elements with their attribute counts
  const jsxSites: Array<{jsxIndex: number; attrCount: number}> = [];
  let jsxIndex = 0;
  t.traverseFast(ast, node => {
    if (t.isJSXOpeningElement(node) && node.attributes.length > 0) {
      jsxSites.push({jsxIndex, attrCount: node.attributes.length});
      jsxIndex++;
    }
  });

  // For each JSX element, try removing each attribute one at a time (from end to start)
  for (const {jsxIndex: targetJsxIdx, attrCount} of jsxSites) {
    for (let attrIdx = attrCount - 1; attrIdx >= 0; attrIdx--) {
      const cloned = cloneAst(ast);
      let idx = 0;
      let modified = false;

      t.traverseFast(cloned, node => {
        if (modified) return;
        if (t.isJSXOpeningElement(node) && node.attributes.length > 0) {
          if (idx === targetJsxIdx && attrIdx < node.attributes.length) {
            node.attributes.splice(attrIdx, 1);
            modified = true;
          }
          idx++;
        }
      });

      if (modified) {
        yield cloned;
      }
    }
  }
}

/**
 * Generator that removes JSX element children one at a time
 */
function* removeJSXChildren(ast: t.File): Generator<t.File> {
  // Collect all JSX elements with children
  const jsxSites: Array<{jsxIndex: number; childCount: number}> = [];
  let jsxIndex = 0;
  t.traverseFast(ast, node => {
    if (t.isJSXElement(node) && node.children.length > 0) {
      jsxSites.push({jsxIndex, childCount: node.children.length});
      jsxIndex++;
    }
  });

  // For each JSX element, try removing each child one at a time (from end to start)
  for (const {jsxIndex: targetJsxIdx, childCount} of jsxSites) {
    for (let childIdx = childCount - 1; childIdx >= 0; childIdx--) {
      const cloned = cloneAst(ast);
      let idx = 0;
      let modified = false;

      t.traverseFast(cloned, node => {
        if (modified) return;
        if (t.isJSXElement(node) && node.children.length > 0) {
          if (idx === targetJsxIdx && childIdx < node.children.length) {
            node.children.splice(childIdx, 1);
            modified = true;
          }
          idx++;
        }
      });

      if (modified) {
        yield cloned;
      }
    }
  }
}

/**
 * Generator that removes JSX fragment children one at a time
 */
function* removeJSXFragmentChildren(ast: t.File): Generator<t.File> {
  // Collect all JSX fragments with children
  const fragmentSites: Array<{fragIndex: number; childCount: number}> = [];
  let fragIndex = 0;
  t.traverseFast(ast, node => {
    if (t.isJSXFragment(node) && node.children.length > 0) {
      fragmentSites.push({fragIndex, childCount: node.children.length});
      fragIndex++;
    }
  });

  // For each fragment, try removing each child one at a time (from end to start)
  for (const {fragIndex: targetFragIdx, childCount} of fragmentSites) {
    for (let childIdx = childCount - 1; childIdx >= 0; childIdx--) {
      const cloned = cloneAst(ast);
      let idx = 0;
      let modified = false;

      t.traverseFast(cloned, node => {
        if (modified) return;
        if (t.isJSXFragment(node) && node.children.length > 0) {
          if (idx === targetFragIdx && childIdx < node.children.length) {
            node.children.splice(childIdx, 1);
            modified = true;
          }
          idx++;
        }
      });

      if (modified) {
        yield cloned;
      }
    }
  }
}

/**
 * Generator that replaces single-element arrays with the element itself
 */
function* simplifySingleElementArrays(ast: t.File): Generator<t.File> {
  // Count single-element arrays
  let arrayCount = 0;
  t.traverseFast(ast, node => {
    if (t.isArrayExpression(node) && node.elements.length === 1) {
      arrayCount++;
    }
  });

  for (let targetIdx = 0; targetIdx < arrayCount; targetIdx++) {
    const cloned = cloneAst(ast);
    let idx = 0;
    let modified = false;

    traverse(cloned, {
      ArrayExpression(path) {
        if (modified) return;
        if (path.node.elements.length === 1 && idx === targetIdx) {
          const elem = path.node.elements[0];
          if (t.isExpression(elem)) {
            path.replaceWith(elem);
            modified = true;
          }
        }
        idx++;
      },
    });

    if (modified) {
      yield cloned;
    }
  }
}

/**
 * Generator that replaces single-property objects with the property value.
 * For regular properties: {key: value} -> value
 * For computed properties: {[key]: value} -> key (also try value)
 */
function* simplifySinglePropertyObjects(ast: t.File): Generator<t.File> {
  // Count single-property objects
  let objectCount = 0;
  t.traverseFast(ast, node => {
    if (t.isObjectExpression(node) && node.properties.length === 1) {
      objectCount++;
    }
  });

  // Try replacing with value
  for (let targetIdx = 0; targetIdx < objectCount; targetIdx++) {
    const cloned = cloneAst(ast);
    let idx = 0;
    let modified = false;

    traverse(cloned, {
      ObjectExpression(path) {
        if (modified) return;
        if (path.node.properties.length === 1 && idx === targetIdx) {
          const prop = path.node.properties[0];
          if (t.isObjectProperty(prop) && t.isExpression(prop.value)) {
            path.replaceWith(prop.value);
            modified = true;
          }
        }
        idx++;
      },
    });

    if (modified) {
      yield cloned;
    }
  }

  // For computed properties, also try replacing with key
  for (let targetIdx = 0; targetIdx < objectCount; targetIdx++) {
    const cloned = cloneAst(ast);
    let idx = 0;
    let modified = false;

    traverse(cloned, {
      ObjectExpression(path) {
        if (modified) return;
        if (path.node.properties.length === 1 && idx === targetIdx) {
          const prop = path.node.properties[0];
          if (
            t.isObjectProperty(prop) &&
            prop.computed &&
            t.isExpression(prop.key)
          ) {
            path.replaceWith(prop.key);
            modified = true;
          }
        }
        idx++;
      },
    });

    if (modified) {
      yield cloned;
    }
  }
}

/**
 * Generator that removes object properties one at a time
 */
function* removeObjectProperties(ast: t.File): Generator<t.File> {
  // Collect all object expressions with their property counts
  const objectSites: Array<{objectIndex: number; propCount: number}> = [];
  let objectIndex = 0;
  t.traverseFast(ast, node => {
    if (t.isObjectExpression(node) && node.properties.length > 0) {
      objectSites.push({objectIndex, propCount: node.properties.length});
      objectIndex++;
    }
  });

  // For each object, try removing each property one at a time (from end to start)
  for (const {objectIndex: targetObjIdx, propCount} of objectSites) {
    for (let propIdx = propCount - 1; propIdx >= 0; propIdx--) {
      const cloned = cloneAst(ast);
      let idx = 0;
      let modified = false;

      t.traverseFast(cloned, node => {
        if (modified) return;
        if (t.isObjectExpression(node) && node.properties.length > 0) {
          if (idx === targetObjIdx && propIdx < node.properties.length) {
            node.properties.splice(propIdx, 1);
            modified = true;
          }
          idx++;
        }
      });

      if (modified) {
        yield cloned;
      }
    }
  }
}

/**
 * Generator that removes elements from array destructuring patterns one at a time
 */
function* removeArrayPatternElements(ast: t.File): Generator<t.File> {
  // Collect all array patterns with elements
  const patternSites: Array<{patternIndex: number; elementCount: number}> = [];
  let patternIndex = 0;
  t.traverseFast(ast, node => {
    if (t.isArrayPattern(node) && node.elements.length > 0) {
      patternSites.push({patternIndex, elementCount: node.elements.length});
      patternIndex++;
    }
  });

  // For each pattern, try removing each element (from end to start)
  for (const {patternIndex: targetPatternIdx, elementCount} of patternSites) {
    for (let elemIdx = elementCount - 1; elemIdx >= 0; elemIdx--) {
      const cloned = cloneAst(ast);
      let idx = 0;
      let modified = false;

      t.traverseFast(cloned, node => {
        if (modified) return;
        if (t.isArrayPattern(node) && node.elements.length > 0) {
          if (idx === targetPatternIdx && elemIdx < node.elements.length) {
            node.elements.splice(elemIdx, 1);
            modified = true;
          }
          idx++;
        }
      });

      if (modified) {
        yield cloned;
      }
    }
  }
}

/**
 * Generator that removes properties from object destructuring patterns one at a time
 */
function* removeObjectPatternProperties(ast: t.File): Generator<t.File> {
  // Collect all object patterns with properties
  const patternSites: Array<{patternIndex: number; propCount: number}> = [];
  let patternIndex = 0;
  t.traverseFast(ast, node => {
    if (t.isObjectPattern(node) && node.properties.length > 0) {
      patternSites.push({patternIndex, propCount: node.properties.length});
      patternIndex++;
    }
  });

  // For each pattern, try removing each property (from end to start)
  for (const {patternIndex: targetPatternIdx, propCount} of patternSites) {
    for (let propIdx = propCount - 1; propIdx >= 0; propIdx--) {
      const cloned = cloneAst(ast);
      let idx = 0;
      let modified = false;

      t.traverseFast(cloned, node => {
        if (modified) return;
        if (t.isObjectPattern(node) && node.properties.length > 0) {
          if (idx === targetPatternIdx && propIdx < node.properties.length) {
            node.properties.splice(propIdx, 1);
            modified = true;
          }
          idx++;
        }
      });

      if (modified) {
        yield cloned;
      }
    }
  }
}

/**
 * Generator that simplifies assignment expressions (a = b) -> a or b
 */
function* simplifyAssignmentExpressions(ast: t.File): Generator<t.File> {
  // Count assignment expressions
  let assignmentCount = 0;
  t.traverseFast(ast, node => {
    if (t.isAssignmentExpression(node)) {
      assignmentCount++;
    }
  });

  // Try replacing with left side (assignment target)
  for (let targetIdx = 0; targetIdx < assignmentCount; targetIdx++) {
    const cloned = cloneAst(ast);
    let idx = 0;
    let modified = false;

    traverse(cloned, {
      AssignmentExpression(path) {
        if (modified) return;
        if (idx === targetIdx) {
          const left = path.node.left;
          if (t.isExpression(left)) {
            path.replaceWith(left);
            modified = true;
          }
        }
        idx++;
      },
    });

    if (modified) {
      yield cloned;
    }
  }

  // Try replacing with right side (assignment value)
  for (let targetIdx = 0; targetIdx < assignmentCount; targetIdx++) {
    const cloned = cloneAst(ast);
    let idx = 0;
    let modified = false;

    traverse(cloned, {
      AssignmentExpression(path) {
        if (modified) return;
        if (idx === targetIdx) {
          path.replaceWith(path.node.right);
          modified = true;
        }
        idx++;
      },
    });

    if (modified) {
      yield cloned;
    }
  }
}

/**
 * Generator that simplifies binary expressions (a + b) -> a or b
 */
function* simplifyBinaryExpressions(ast: t.File): Generator<t.File> {
  // Count binary expressions
  let binaryCount = 0;
  t.traverseFast(ast, node => {
    if (t.isBinaryExpression(node)) {
      binaryCount++;
    }
  });

  // Try replacing with left side
  for (let targetIdx = 0; targetIdx < binaryCount; targetIdx++) {
    const cloned = cloneAst(ast);
    let idx = 0;
    let modified = false;

    traverse(cloned, {
      BinaryExpression(path) {
        if (modified) return;
        if (idx === targetIdx) {
          path.replaceWith(path.node.left);
          modified = true;
        }
        idx++;
      },
    });

    if (modified) {
      yield cloned;
    }
  }

  // Try replacing with right side
  for (let targetIdx = 0; targetIdx < binaryCount; targetIdx++) {
    const cloned = cloneAst(ast);
    let idx = 0;
    let modified = false;

    traverse(cloned, {
      BinaryExpression(path) {
        if (modified) return;
        if (idx === targetIdx) {
          path.replaceWith(path.node.right);
          modified = true;
        }
        idx++;
      },
    });

    if (modified) {
      yield cloned;
    }
  }
}

/**
 * Generator that simplifies member expressions (obj.value) -> obj
 * For computed expressions: obj[key] -> obj or key
 */
function* simplifyMemberExpressions(ast: t.File): Generator<t.File> {
  // Count member expressions
  let memberCount = 0;
  t.traverseFast(ast, node => {
    if (t.isMemberExpression(node)) {
      memberCount++;
    }
  });

  // Try replacing with object
  for (let targetIdx = 0; targetIdx < memberCount; targetIdx++) {
    const cloned = cloneAst(ast);
    let idx = 0;
    let modified = false;

    traverse(cloned, {
      MemberExpression(path) {
        if (modified) return;
        if (idx === targetIdx) {
          path.replaceWith(path.node.object);
          modified = true;
        }
        idx++;
      },
    });

    if (modified) {
      yield cloned;
    }
  }

  // For computed expressions, also try replacing with key
  for (let targetIdx = 0; targetIdx < memberCount; targetIdx++) {
    const cloned = cloneAst(ast);
    let idx = 0;
    let modified = false;

    traverse(cloned, {
      MemberExpression(path) {
        if (modified) return;
        if (idx === targetIdx && path.node.computed) {
          const property = path.node.property;
          if (t.isExpression(property)) {
            path.replaceWith(property);
            modified = true;
          }
        }
        idx++;
      },
    });

    if (modified) {
      yield cloned;
    }
  }
}

/**
 * Helper to collect all unique identifier names in the AST
 */
function collectUniqueIdentifierNames(ast: t.File): Set<string> {
  const names = new Set<string>();
  t.traverseFast(ast, node => {
    if (t.isIdentifier(node)) {
      names.add(node.name);
    }
  });
  return names;
}

/**
 * Helper to rename all occurrences of an identifier throughout the AST
 */
function renameAllIdentifiers(
  ast: t.File,
  oldName: string,
  newName: string,
): boolean {
  let modified = false;
  t.traverseFast(ast, node => {
    if (t.isIdentifier(node) && node.name === oldName) {
      node.name = newName;
      modified = true;
    }
  });
  return modified;
}

/**
 * Generator that simplifies identifiers by removing "on" prefix.
 * onClick -> Click
 */
function* simplifyIdentifiersRemoveOnPrefix(ast: t.File): Generator<t.File> {
  const names = collectUniqueIdentifierNames(ast);

  for (const name of names) {
    // Check if name starts with "on" followed by uppercase letter
    if (
      name.length > 2 &&
      name.startsWith('on') &&
      name[2] === name[2].toUpperCase()
    ) {
      const newName = name.slice(2);
      // Skip if the new name would conflict with an existing identifier
      if (names.has(newName)) {
        continue;
      }
      const cloned = cloneAst(ast);
      if (renameAllIdentifiers(cloned, name, newName)) {
        yield cloned;
      }
    }
  }
}

/**
 * Generator that simplifies identifiers by removing "Ref" suffix.
 * inputRef -> input
 */
function* simplifyIdentifiersRemoveRefSuffix(ast: t.File): Generator<t.File> {
  const names = collectUniqueIdentifierNames(ast);

  for (const name of names) {
    // Check if name ends with "Ref" and has more characters before it
    if (name.length > 3 && name.endsWith('Ref')) {
      const newName = name.slice(0, -3);
      // Skip if the new name would conflict with an existing identifier
      if (names.has(newName)) {
        continue;
      }
      // Skip if new name would be empty or just whitespace
      if (newName.length === 0) {
        continue;
      }
      const cloned = cloneAst(ast);
      if (renameAllIdentifiers(cloned, name, newName)) {
        yield cloned;
      }
    }
  }
}

/**
 * Generator that rewrites "ref" identifier to "ref_" to avoid conflicts.
 */
function* simplifyIdentifiersRenameRef(ast: t.File): Generator<t.File> {
  const names = collectUniqueIdentifierNames(ast);

  if (names.has('ref')) {
    // Only rename if ref_ doesn't already exist
    if (!names.has('ref_')) {
      const cloned = cloneAst(ast);
      if (renameAllIdentifiers(cloned, 'ref', 'ref_')) {
        yield cloned;
      }
    }
  }
}

/**
 * All simplification strategies in order of priority (coarse to fine)
 */
const simplificationStrategies = [
  {name: 'removeStatements', generator: removeStatements},
  {name: 'removeCallArguments', generator: removeCallArguments},
  {name: 'removeFunctionParameters', generator: removeFunctionParameters},
  {name: 'removeArrayElements', generator: removeArrayElements},
  {name: 'removeObjectProperties', generator: removeObjectProperties},
  {name: 'removeArrayPatternElements', generator: removeArrayPatternElements},
  {
    name: 'removeObjectPatternProperties',
    generator: removeObjectPatternProperties,
  },
  {name: 'removeJSXAttributes', generator: removeJSXAttributes},
  {name: 'removeJSXChildren', generator: removeJSXChildren},
  {name: 'removeJSXFragmentChildren', generator: removeJSXFragmentChildren},
  {name: 'simplifyCallExpressions', generator: simplifyCallExpressions},
  {name: 'simplifyConditionals', generator: simplifyConditionals},
  {name: 'simplifyLogicalExpressions', generator: simplifyLogicalExpressions},
  {name: 'simplifyBinaryExpressions', generator: simplifyBinaryExpressions},
  {
    name: 'simplifyAssignmentExpressions',
    generator: simplifyAssignmentExpressions,
  },
  {name: 'simplifySingleElementArrays', generator: simplifySingleElementArrays},
  {
    name: 'simplifySinglePropertyObjects',
    generator: simplifySinglePropertyObjects,
  },
  {name: 'simplifyMemberExpressions', generator: simplifyMemberExpressions},
  {name: 'simplifyOptionalChains', generator: simplifyOptionalChains},
  {name: 'simplifyAwaitExpressions', generator: simplifyAwaitExpressions},
  {name: 'simplifyIfStatements', generator: simplifyIfStatements},
  {name: 'simplifySwitchStatements', generator: simplifySwitchStatements},
  {name: 'simplifyWhileStatements', generator: simplifyWhileStatements},
  {name: 'simplifyDoWhileStatements', generator: simplifyDoWhileStatements},
  {name: 'simplifyForStatements', generator: simplifyForStatements},
  {name: 'simplifyForInStatements', generator: simplifyForInStatements},
  {name: 'simplifyForOfStatements', generator: simplifyForOfStatements},
  {
    name: 'simplifyVariableDeclarations',
    generator: simplifyVariableDeclarations,
  },
  {name: 'simplifyTryStatements', generator: simplifyTryStatements},
  {
    name: 'simplifySingleStatementBlocks',
    generator: simplifySingleStatementBlocks,
  },
  {
    name: 'simplifyIdentifiersRemoveOnPrefix',
    generator: simplifyIdentifiersRemoveOnPrefix,
  },
  {
    name: 'simplifyIdentifiersRemoveRefSuffix',
    generator: simplifyIdentifiersRemoveRefSuffix,
  },
  {
    name: 'simplifyIdentifiersRenameRef',
    generator: simplifyIdentifiersRenameRef,
  },
];

type MinimizeResult =
  | {kind: 'success'}
  | {kind: 'minimal'}
  | {kind: 'minimized'; source: string};

/**
 * Core minimization loop that attempts to reduce the input source code
 * while preserving the compiler error.
 */
export function minimize(
  input: string,
  filename: string,
  language: 'flow' | 'typescript',
  sourceType: 'module' | 'script',
  useRust: boolean = false,
): MinimizeResult {
  // Load the compiler plugin
  const pluginSrc = useRust ? BABEL_PLUGIN_RUST_SRC : BABEL_PLUGIN_SRC;
  const importedCompilerPlugin = require(pluginSrc) as Record<string, unknown>;
  const BabelPluginReactCompiler = importedCompilerPlugin[
    'default'
  ] as PluginObj;
  const parseConfigPragmaForTests = importedCompilerPlugin[
    PARSE_CONFIG_PRAGMA_IMPORT
  ] as typeof ParseConfigPragma;

  // Get the initial error
  const initialResult = compileAndGetError(
    input,
    filename,
    language,
    sourceType,
    BabelPluginReactCompiler,
    parseConfigPragmaForTests,
  );

  if (initialResult.kind === 'success') {
    return {kind: 'success'};
  }

  if (initialResult.kind === 'parse_error') {
    return {kind: 'success'};
  }

  const targetError = initialResult;

  // Parse the initial AST
  let currentAst = parseInput(input, filename, language, sourceType);
  let currentCode = input;
  let changed = true;
  let iterations = 0;
  const maxIterations = 1000; // Safety limit

  process.stdout.write('\nMinimizing');

  while (changed && iterations < maxIterations) {
    changed = false;
    iterations++;

    // Try each simplification strategy
    for (const strategy of simplificationStrategies) {
      const generator = strategy.generator(currentAst);

      for (const candidateAst of generator) {
        let candidateCode: string;
        try {
          candidateCode = astToCode(candidateAst);
        } catch {
          // If code generation fails, skip this candidate
          continue;
        }

        const result = compileAndGetError(
          candidateCode,
          filename,
          language,
          sourceType,
          BabelPluginReactCompiler,
          parseConfigPragmaForTests,
        );

        if (errorsMatch(targetError, result)) {
          // This simplification preserves the error, keep it
          currentAst = candidateAst;
          currentCode = candidateCode;
          changed = true;
          process.stdout.write('.');
          break; // Restart from the beginning with the new AST
        }
      }

      if (changed) {
        break; // Restart the outer loop
      }
    }
  }

  console.log('\n');

  // Check if any minimization was achieved
  if (currentCode === input) {
    return {kind: 'minimal'};
  }

  return {kind: 'minimized', source: currentCode};
}

/**
 * Compile code with a given plugin and return the output code (or error string).
 */
function compileAndGetOutput(
  code: string,
  filename: string,
  language: 'flow' | 'typescript',
  sourceType: 'module' | 'script',
  plugin: PluginObj,
  parseConfigPragmaFn: typeof ParseConfigPragma,
): string | null {
  let ast: t.File;
  try {
    ast = parseInput(code, filename, language, sourceType);
  } catch {
    return null;
  }

  const firstLine = code.substring(0, code.indexOf('\n'));
  const config = parseConfigPragmaFn(firstLine, {compilationMode: 'all'});
  const options = {
    ...config,
    environment: {
      ...config.environment,
    },
    logger: {
      logEvent: () => {},
      debugLogIRs: () => {},
    },
    enableReanimatedCheck: false,
  };

  try {
    const result = transformFromAstSync(ast, code, {
      filename: '/' + filename,
      highlightCode: false,
      retainLines: true,
      compact: true,
      plugins: [[plugin, options]],
      sourceType: 'module',
      ast: false,
      cloneInputAst: true,
      configFile: false,
      babelrc: false,
    });
    return result?.code ?? null;
  } catch (e: unknown) {
    return `ERROR: ${(e as Error).message}`;
  }
}

type MinimizeRustDeltaResult =
  | {kind: 'no_delta'}
  | {kind: 'minimal'}
  | {kind: 'minimized'; source: string};

/**
 * Core minimization loop that attempts to reduce the input source code
 * while preserving a delta (difference in output) between the TS and Rust compilers.
 */
export function minimizeRustDelta(
  input: string,
  filename: string,
  language: 'flow' | 'typescript',
  sourceType: 'module' | 'script',
): MinimizeRustDeltaResult {
  // Load both compiler plugins
  const importedTsPlugin = require(BABEL_PLUGIN_SRC) as Record<string, unknown>;
  const importedRustPlugin = require(BABEL_PLUGIN_RUST_SRC) as Record<
    string,
    unknown
  >;
  const tsPlugin = importedTsPlugin['default'] as PluginObj;
  const rustPlugin = importedRustPlugin['default'] as PluginObj;
  const parseConfigPragmaForTests = importedTsPlugin[
    PARSE_CONFIG_PRAGMA_IMPORT
  ] as typeof ParseConfigPragma;

  // Helper: check if TS and Rust outputs differ for given code
  function hasDelta(code: string): boolean {
    const tsOutput = compileAndGetOutput(
      code,
      filename,
      language,
      sourceType,
      tsPlugin,
      parseConfigPragmaForTests,
    );
    const rustOutput = compileAndGetOutput(
      code,
      filename,
      language,
      sourceType,
      rustPlugin,
      parseConfigPragmaForTests,
    );
    // Both null (e.g. parse error) means no delta
    if (tsOutput == null && rustOutput == null) return false;
    return tsOutput !== rustOutput;
  }

  // Verify the initial input has a delta
  if (!hasDelta(input)) {
    return {kind: 'no_delta'};
  }

  // Parse the initial AST
  let currentAst = parseInput(input, filename, language, sourceType);
  let currentCode = input;
  let changed = true;
  let iterations = 0;
  const maxIterations = 1000;

  process.stdout.write('\nMinimizing');

  while (changed && iterations < maxIterations) {
    changed = false;
    iterations++;

    for (const strategy of simplificationStrategies) {
      const generator = strategy.generator(currentAst);

      for (const candidateAst of generator) {
        let candidateCode: string;
        try {
          candidateCode = astToCode(candidateAst);
        } catch {
          continue;
        }

        if (hasDelta(candidateCode)) {
          currentAst = candidateAst;
          currentCode = candidateCode;
          changed = true;
          process.stdout.write('.');
          break;
        }
      }

      if (changed) {
        break;
      }
    }
  }

  console.log('\n');

  if (currentCode === input) {
    return {kind: 'minimal'};
  }

  return {kind: 'minimized', source: currentCode};
}
