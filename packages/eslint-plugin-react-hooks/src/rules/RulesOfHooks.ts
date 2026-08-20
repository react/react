/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
/* eslint-disable no-for-of-loops/no-for-of-loops */

import type {Rule, Scope} from 'eslint';
import type {
  CallExpression,
  CatchClause,
  DoWhileStatement,
  Expression,
  Identifier,
  Node,
  Super,
  TryStatement,
} from 'estree';

// @ts-expect-error untyped module
import CodePathAnalyzer from '../code-path-analysis/code-path-analyzer';
import {getAdditionalEffectHooksFromSettings} from '../shared/Utils';

/**
 * Catch all identifiers that begin with "use" followed by an uppercase Latin
 * character to exclude identifiers like "user".
 */
function isHookName(s: string): boolean {
  return s === 'use' || /^use[A-Z0-9]/.test(s);
}

/**
 * We consider hooks to be a hook name identifier or a member expression
 * containing a hook name.
 */
function isHook(node: Node): boolean {
  if (node.type === 'Identifier') {
    return isHookName(node.name);
  } else if (
    node.type === 'MemberExpression' &&
    !node.computed &&
    isHook(node.property)
  ) {
    const obj = node.object;
    const isPascalCaseNameSpace = /^[A-Z].*/;
    return obj.type === 'Identifier' && isPascalCaseNameSpace.test(obj.name);
  } else {
    return false;
  }
}

/**
 * Checks if the node is a React component name. React component names must
 * always start with an uppercase letter.
 */
function isComponentName(node: Node): boolean {
  return node.type === 'Identifier' && /^[A-Z]/.test(node.name);
}

function isReactFunction(node: Node, functionName: string): boolean {
  return (
    ('name' in node && node.name === functionName) ||
    (node.type === 'MemberExpression' &&
      'name' in node.object &&
      node.object.name === 'React' &&
      'name' in node.property &&
      node.property.name === functionName)
  );
}

/**
 * Checks if the node is a callback argument of forwardRef. This render function
 * should follow the rules of hooks.
 */
function isForwardRefCallback(node: Node): boolean {
  return !!(
    node.parent &&
    'callee' in node.parent &&
    node.parent.callee &&
    isReactFunction(node.parent.callee, 'forwardRef')
  );
}

/**
 * Checks if the node is a callback argument of React.memo. This anonymous
 * functional component should follow the rules of hooks.
 */
function isMemoCallback(node: Node): boolean {
  return !!(
    node.parent &&
    'callee' in node.parent &&
    node.parent.callee &&
    isReactFunction(node.parent.callee, 'memo')
  );
}

function isInsideComponentOrHook(node: Node | undefined): boolean {
  while (node) {
    const functionName = getFunctionName(node);
    if (functionName) {
      if (isComponentName(functionName) || isHook(functionName)) {
        return true;
      }
    }
    if (isForwardRefCallback(node) || isMemoCallback(node)) {
      return true;
    }
    node = node.parent;
  }
  return false;
}

function isInsideDoWhileLoop(node: Node | undefined): node is DoWhileStatement {
  while (node) {
    if (node.type === 'DoWhileStatement') {
      return true;
    }
    node = node.parent;
  }
  return false;
}

function isInsideTryCatch(
  node: Node | undefined,
): node is TryStatement | CatchClause {
  while (node) {
    if (node.type === 'TryStatement' || node.type === 'CatchClause') {
      return true;
    }
    node = node.parent;
  }
  return false;
}

function getNodeWithoutReactNamespace(
  node: Expression | Super,
): Expression | Identifier | Super {
  if (
    node.type === 'MemberExpression' &&
    node.object.type === 'Identifier' &&
    node.object.name === 'React' &&
    node.property.type === 'Identifier' &&
    !node.computed
  ) {
    return node.property;
  }
  return node;
}

function isEffectIdentifier(node: Node, additionalHooks?: RegExp): boolean {
  const isBuiltInEffect =
    node.type === 'Identifier' &&
    (node.name === 'useEffect' ||
      node.name === 'useLayoutEffect' ||
      node.name === 'useInsertionEffect');

  if (isBuiltInEffect) {
    return true;
  }

  // Check if this matches additional hooks configured by the user
  if (additionalHooks && node.type === 'Identifier') {
    return additionalHooks.test(node.name);
  }

  return false;
}

function isUseEffectEventIdentifier(node: Node): boolean {
  return node.type === 'Identifier' && node.name === 'useEffectEvent';
}

function useEffectEventError(fn: string | null, called: boolean): string {
  // no function identifier, i.e. it is not assigned to a variable
  if (fn === null) {
    return (
      `React Hook "useEffectEvent" can only be called at the top level of your component.` +
      ` It cannot be passed down.`
    );
  }

  return (
    `\`${fn}\` is a function created with React Hook "useEffectEvent", and can only be called from ` +
    'Effects and Effect Events in the same component.' +
    (called ? '' : ' It cannot be assigned to a variable or passed down.')
  );
}

function isUseIdentifier(node: Node): boolean {
  return isReactFunction(node, 'use');
}

const rule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'enforces the Rules of Hooks',
      recommended: true,
      url: 'https://react.dev/reference/rules/rules-of-hooks',
    },
    schema: [
      {
        type: 'object',
        additionalProperties: false,
        properties: {
          additionalHooks: {
            type: 'string',
          },
        },
      },
    ],
  },
  create(context: Rule.RuleContext) {
    const settings = context.settings || {};

    const additionalEffectHooks =
      getAdditionalEffectHooksFromSettings(settings);

    let lastEffect: CallExpression | null = null;
    const codePathReactHooksMapStack: Array<
      Map<Rule.CodePathSegment, Array<Node>>
    > = [];
    const codePathSegmentStack: Array<Rule.CodePathSegment> = [];
    const useEffectEventFunctions = new WeakSet();

    // For a given scope, iterate through the references and add all useEffectEvent definitions. We can
    // do this in non-Program nodes because we can rely on the assumption that useEffectEvent functions
    // can only be declared within a component or hook at its top level.
    function recordAllUseEffectEventFunctions(scope: Scope.Scope): void {
      for (const reference of scope.references) {
        const parent = reference.identifier.parent;
        if (
          parent?.type === 'VariableDeclarator' &&
          parent.init &&
          parent.init.type === 'CallExpression' &&
          parent.init.callee &&
          isUseEffectEventIdentifier(parent.init.callee)
        ) {
          if (reference.resolved === null) {
            throw new Error('Unexpected null reference.resolved');
          }
          for (const ref of reference.resolved.references) {
            if (ref !== reference) {
              useEffectEventFunctions.add(ref.identifier);
            }
          }
        }
      }
    }

    /**
     * SourceCode that also works down to ESLint 3.0.0
     */
    const getSourceCode =
      typeof context.getSourceCode === 'function'
        ? () => {
            return context.getSourceCode();
          }
        : () => {
            return context.sourceCode;
          };
    /**
     * SourceCode#getScope that also works down to ESLint 3.0.0
     */
    const getScope =
      typeof context.getScope === 'function'
        ? (): Scope.Scope => {
            return context.getScope();
          }
        : (node: Node): Scope.Scope => {
            return getSourceCode().getScope(node);
          };

    function hasFlowSuppression(node: Node, suppression: string) {
      const sourceCode = getSourceCode();
      const comments = sourceCode.getAllComments();
      const flowSuppressionRegex = new RegExp(
        '\\$FlowFixMe\\[' + suppression + '\\]',
      );
      return comments.some(
        commentNode =>
          flowSuppressionRegex.test(commentNode.value) &&
          commentNode.loc != null &&
          node.loc != null &&
          commentNode.loc.end.line === node.loc.start.line - 1,
      );
    }

    const analyzer = new CodePathAnalyzer({
      // Maintain code segment path stack as we traverse.
      onCodePathSegmentStart: (segment: Rule.CodePathSegment) =>
        codePathSegmentStack.push(segment),
      onCodePathSegmentEnd: () => codePathSegmentStack.pop(),

      // Maintain code path stack as we traverse.
      onCodePathStart: () =>
        codePathReactHooksMapStack.push(
          new Map<Rule.CodePathSegment, Array<Node>>(),
        ),

      // Process our code path.
      //
      // Everything is ok if all React Hooks are both reachable from the initial
      // segment and reachable from every final segment.
      onCodePathEnd(codePath: any, codePathNode: Node) {
        const reactHooksMap = codePathReactHooksMapStack.pop();
        if (reactHooksMap?.size === 0) {
          return;
        } else if (typeof reactHooksMap === 'undefined') {
          throw new Error('Unexpected undefined reactHooksMap');
        }

        // All of the segments which are cyclic are recorded in this set.
        const cyclic = new Set();

        /**
         * Count the number of code paths from the start of the function to this
         * segment. For example:
         *
         * ```js
         * function MyComponent() {
         *   if (condition) {
         *     // Segment 1
         *   } else {
         *     // Segment 2
         *   }
         *   // Segment 3
         * }
         * ```
         *
         * Segments 1 and 2 have one path to the beginning of `MyComponent` and
         * segment 3 has two paths to the beginning of `MyComponent` since we
         * could have either taken the path of segment 1 or segment 2.
         *
         * Populates `cyclic` with cyclic segments.
         */
        function countPathsFromStart(
          segment: Rule.CodePathSegment,
          pathHistory?: Set<string>,
        ): bigint {
          const {cache} = countPathsFromStart;
          let paths = cache.get(segment.id);
          const pathList = new Set<string>(pathHistory);

          // If `pathList` includes the current segment then we've found a cycle!
          // We need to fill `cyclic` with all segments inside cycle
          if (pathList.has(segment.id)) {
            const pathArray = [...pathList];
            const cyclicSegments = pathArray.slice(
              pathArray.indexOf(segment.id) + 1,
            );
            for (const cyclicSegment of cyclicSegments) {
              cyclic.add(cyclicSegment);
            }

            return BigInt('0');
          }

          // add the current segment to pathList
          pathList.add(segment.id);

          // We have a cached `paths`. Return it.
          if (paths !== undefined) {
            return paths;
          }

          if (codePath.thrownSegments.includes(segment)) {
            paths = BigInt('0');
          } else if (segment.prevSegments.length === 0) {
            paths = BigInt('1');
          } else {
            paths = BigInt('0');
            for (const prevSegment of segment.prevSegments) {
              paths += countPathsFromStart(prevSegment, pathList);
            }
          }

          // If our segment is reachable then there should be at least one path
          // to it from the start of our code path.
          if (segment.reachable && paths === BigInt('0')) {
            cache.delete(segment.id);
          } else {
            cache.set(segment.id, paths);
          }

          return paths;
        }

        /**
         * Count the number of code paths from this segment to the end of the
         * function. For example:
         *
         * ```js
         * function MyComponent() {
         *   // Segment 1
         *   if (condition) {
         *     // Segment 2
         *   } else {
         *     // Segment 3
         *   }
         * }
         * ```
         *
         * Segments 2 and 3 have one path to the end of `MyComponent` and
         * segment 1 has two paths to the end of `MyComponent` since we could
         * either take the path of segment 1 or segment 2.
         *
         * Populates `cyclic` with cyclic segments.
         */

        function countPathsToEnd(
          segment: Rule.CodePathSegment,
          pathHistory?: Set<string>,
        ): bigint {
          const {cache} = countPathsToEnd;
          let paths = cache.get(segment.id);
          const pathList = new Set(pathHistory);

          // If `pathList` includes the current segment then we've found a cycle!
          // We need to fill `cyclic` with all segments inside cycle
          if (pathList.has(segment.id)) {
            const pathArray = Array.from(pathList);
            const cyclicSegments = pathArray.slice(
              pathArray.indexOf(segment.id) + 1,
            );
            for (const cyclicSegment of cyclicSegments) {
              cyclic.add(cyclicSegment);
            }

            return BigInt('0');
          }

          // add the current segment to pathList
          pathList.add(segment.id);

          // We have a cached `paths`. Return it.
          if (paths !== undefined) {
            return paths;
          }

          if (codePath.thrownSegments.includes(segment)) {
            paths = BigInt('0');
          } else if (segment.nextSegments.length === 0) {
            paths = BigInt('1');
          } else {
            paths = BigInt('0');
            for (const nextSegment of segment.nextSegments) {
              paths += countPathsToEnd(nextSegment, pathList);
            }
          }

          cache.set(segment.id, paths);
          return paths;
        }

        /**
         * Gets the shortest path length to the start of a code path.
         * For example:
         *
         * ```js
         * function MyComponent() {
         *   if (condition) {
         *     // Segment 1
         *   }
         *   // Segment 2
         * }
         * ```
         *
         * There is only one path from segment 1 to the code path start. Its
         * length is one so that is the shortest path.
         *
         * There are two paths from segment 2 to the code path start. One
         * through segment 1 with a length of two and another directly to the
         * start with a length of one. The shortest path has a length of one
         * so we would return that.
         */

        function shortestPathLengthToStart(
          segment: Rule.CodePathSegment,
        ): number {
          const {cache} = shortestPathLengthToStart;
          let length = cache.get(segment.id);

          // If `length` is null then we found a cycle! Return infinity since
          // the shortest path is definitely not the one where we looped.
          if (length === null) {
            return Infinity;
          }

          // We have a cached `length`. Return it.
          if (length !== undefined) {
            return length;
          }

          // Compute `length` and cache it. Guarding against cycles.
          cache.set(segment.id, null);
          if (segment.prevSegments.length === 0) {
            length = 1;
          } else {
            length = Infinity;
            for (const prevSegment of segment.prevSegments) {
              const prevLength = shortestPathLengthToStart(prevSegment);
              if (prevLength < length) {
                length = prevLength;
              }
            }
            length += 1;
          }
          cache.set(segment.id, length);
          return length;
        }

        countPathsFromStart.cache = new Map<string, bigint>();
        countPathsToEnd.cache = new Map<string, bigint>();
        shortestPathLengthToStart.cache = new Map<string, number | null>();

        // Count all code paths to the end of our component/hook. Also primes
        // the `countPathsToEnd` cache.
        const allPathsFromStartToEnd = countPathsToEnd(codePath.initialSegment);

        // Gets the function name for our code path. If the function name is
        // `undefined` then we know either that we have an anonymous function
        // expression or our code path is not in a function. In both cases we
        // will want to error since neither are React function components or
        // hook functions - unless it is an anonymous function argument to
        // forwardRef or memo.
        const codePathFunctionName = getFunctionName(codePathNode);

        // This is a valid code path for React hooks if we are directly in a React
        // function component or we are in a hook function.
        const isSomewhereInsideComponentOrHook =
          isInsideComponentOrHook(codePathNode);
        const isDirectlyInsideComponentOrHook = codePathFunctionName
          ? isComponentName(codePathFunctionName) ||
            isHook(codePathFunctionName)
          : isForwardRefCallback(codePathNode) || isMemoCallback(codePathNode);

        // Compute the earliest finalizer level using information from the
        // cache. We expect all reachable final segments to have a cache entry
        // after calling `visitSegment()`.
        let shortestFinalPathLength = Infinity;
        for (const finalSegment of codePath.finalSegments) {
          if (!finalSegment.reachable) {
            continue;
          }
          const length = shortestPathLengthToStart(finalSegment);
          if (length < shortestFinalPathLength) {
            shortestFinalPathLength = length;
          }
        }

        // Make sure all React Hooks pass our lint invariants. Log warnings
        // if not.
        for (const [segment, reactHooks] of reactHooksMap) {
          // NOTE: We could report here that the hook is not reachable, but
          // that would be redundant with more general "no unreachable"
          // lint rules.
          if (!segment.reachable) {
            continue;
          }

          // If there are any final segments with a shorter path to start then
          // we possibly have an early return.
          //
          // If our segment is a final segment itself then siblings could
          // possibly be early returns.
          const possiblyHasEarlyReturn =
            segment.nextSegments.length === 0
              ? shortestFinalPathLength <= shortestPathLengthToStart(segment)
              : shortestFinalPathLength < shortestPathLengthToStart(segment);

          // Count all the paths from the start of our code path to the end of
          // our code path that go _through_ this segment. The critical piece
          // of this is _through_. If we just call `countPathsToEnd(segment)`
          // then we neglect that we may have gone through multiple paths to get
          // to this point! Consider:
          //
          // ```js
          // function MyComponent() {
          //   if (a) {
          //     // Segment 1
          //   } else {
          //     // Segment 2
          //   }
          //   // Segment 3
          //   if (b) {
          //     // Segment 4
          //   } else {
          //     // Segment 5
          //   }
          // }
          // ```
          //
          // In this component we have four code paths:
          //
          // 1. `a = true; b = true`
          // 2. `a = true; b = false`
          // 3. `a = false; b = true`
          // 4. `a = false; b = false`
          //
          // From segment 3 there are two code paths to the end through segment
          // 4 and segment 5. However, we took two paths to get here through
          // segment 1 and segment 2.
          //
          // If we multiply the paths from start (two) by the paths to end (two)
          // for segment 3 we get four. Which is our desired count.
          const pathsFromStartToEnd =
            countPathsFromStart(segment) * countPathsToEnd(segment);

          // Is this hook a part of a cyclic segment?
          const cycled = cyclic.has(segment.id);

          for (const hook of reactHooks) {
            // Skip reporting if this hook already has a relevant flow suppression.
            if (hasFlowSuppression(hook, 'react-rule-hook')) {
              continue;
            }

            // Report an error if use() is called inside try/catch.
            if (isUseIdentifier(hook) && isInsideTryCatch(hook)) {
              context.report({
                node: hook,
                message: `React Hook "${getSourceCode().getText(
                  hook,
                )}" cannot be called in a try/catch block.`,
              });
            }

            // Report an error if a hook may be called more then once.
            // `use(...)` can be called in loops.
            if (
              (cycled || isInsideDoWhileLoop(hook)) &&
              !isUseIdentifier(hook)
            ) {
              context.report({
                node: hook,
                message:
                  `React Hook "${getSourceCode().getText(
                    hook,
                  )}" may be executed ` +
                  'more than once. Possibly because it is called in a loop. ' +
                  'React Hooks must be called in the exact same order in ' +
                  'every component render.',
              });
            }

            // If this is not a valid code path for React hooks then we need to
            // log a warning for every hook in this code path.
            //
            // Pick a special message depending on the scope this hook was
            // called in.
            if (isDirectlyInsideComponentOrHook) {
              // Report an error if the hook is called inside an async function.
              // @ts-expect-error the above check hasn't properly type-narrowed `codePathNode` (async doesn't exist on Node)
              const isAsyncFunction = codePathNode.async;
              if (isAsyncFunction) {
                context.report({
                  node: hook,
                  message:
                    `React Hook "${getSourceCode().getText(hook)}" cannot be ` +
                    'called in an async function.',
                });
              }

              // Report an error if a hook does not reach all finalizing code
              // path segments.
              //
              // Special case when we think there might be an early return.
              if (
                !cycled &&
                pathsFromStartToEnd !== allPathsFromStartToEnd &&
                !isUseIdentifier(hook) && // `use(...)` can be called conditionally.
                !isInsideDoWhileLoop(hook) // wrapping do/while loops are checked separately.
              ) {
                const message =
                  `React Hook "${getSourceCode().getText(hook)}" is called ` +
                  'conditionally. React Hooks must be called in the exact ' +
                  'same order in every component render.' +
                  (possiblyHasEarlyReturn
                    ? ' Did you accidentally call a React Hook after an' +
                      ' early return?'
                    : '');
                context.report({node: hook, message});
              }
            } else if (
              codePathNode.parent != null &&
              (codePathNode.parent.type === 'MethodDefinition' ||
                // @ts-expect-error `ClassProperty` was removed from typescript-estree in https://github.com/typescript-eslint/typescript-eslint/pull/3806
                codePathNode.parent.type === 'ClassProperty' ||
                codePathNode.parent.type === 'PropertyDefinition') &&
              codePathNode.parent.value === codePathNode
            ) {
              // Custom message for hooks inside a class
              const message =
                `React Hook "${getSourceCode().getText(
                  hook,
                )}" cannot be called ` +
                'in a class component. React Hooks must be called in a ' +
                'React function component or a custom React Hook function.';
              context.report({node: hook, message});
            } else if (codePathFunctionName) {
              // Custom message if we found an invalid function name.
              const message =
                `React Hook "${getSourceCode().getText(hook)}" is called in ` +
                `function "${getSourceCode().getText(codePathFunctionName)}" ` +
                'that is neither a React function component nor a custom ' +
                'React Hook function.' +
                ' React component names must start with an uppercase letter.' +
                ' React Hook names must start with the word "use".';
              context.report({node: hook, message});
            } else if (codePathNode.type === 'Program') {
              // These are dangerous if you have inline requires enabled.
              const message =
                `React Hook "${getSourceCode().getText(
                  hook,
                )}" cannot be called ` +
                'at the top level. React Hooks must be called in a ' +
                'React function component or a custom React Hook function.';
              context.report({node: hook, message});
            } else {
              // Assume in all other cases the user called a hook in some
              // random function callback. This should usually be true for
              // anonymous function expressions. Hopefully this is clarifying
              // enough in the common case that the incorrect message in
              // uncommon cases doesn't matter.
              // `use(...)` can be called in callbacks.
              if (isSomewhereInsideComponentOrHook && !isUseIdentifier(hook)) {
                const message =
                  `React Hook "${getSourceCode().getText(
                    hook,
                  )}" cannot be called ` +
                  'inside a callback. React Hooks must be called in a ' +
                  'React function component or a custom React Hook function.';
                context.report({node: hook, message});
              }
            }
          }
        }
      },
    });

    return {
      '*'(node: any) {
        analyzer.enterNode(node);
      },

      '*:exit'(node: any) {
        analyzer.leaveNode(node);
      },

      // Missed opportunity...We could visit all `Identifier`s instead of all
      // `CallExpression`s and check that _every use_ of a hook name is valid.
      // But that gets complicated and enters type-system territory, so we're
      // only being strict about hook calls for now.
      CallExpression(node) {
        if (isHook(node.callee)) {
          // Add the hook node to a map keyed by the code path segment. We will
          // do full code path analysis at the end of our code path.
          const reactHooksMap = last(codePathReactHooksMapStack);
          const codePathSegment = last(codePathSegmentStack);
          let reactHooks = reactHooksMap.get(codePathSegment);
          if (!reactHooks) {
            reactHooks = [];
            reactHooksMap.set(codePathSegment, reactHooks);
          }
          reactHooks.push(node.callee);
        }

        // useEffectEvent: useEffectEvent functions can be passed by reference within useEffect as well as in
        // another useEffectEvent
        // Check all `useEffect` and `React.useEffect`, `useEffectEvent`, and `React.useEffectEvent`
        const nodeWithoutNamespace = getNodeWithoutReactNamespace(node.callee);
        if (
          (isEffectIdentifier(nodeWithoutNamespace, additionalEffectHooks) ||
            isUseEffectEventIdentifier(nodeWithoutNamespace)) &&
          node.arguments.length > 0
        ) {
          // Denote that we have traversed into a useEffect call, and stash the CallExpr for
          // comparison later when we exit
          lastEffect = node;
        }

        // Specifically disallow <Child onClick={useEffectEvent(...)} /> because this
        // case can't be caught by `recordAllUseEffectEventFunctions` as it isn't assigned to a variable
        if (
          isUseEffectEventIdentifier(nodeWithoutNamespace) &&
          node.parent?.type !== 'VariableDeclarator' &&
          // like in other hooks, calling useEffectEvent at component's top level without assignment is valid
          node.parent?.type !== 'ExpressionStatement'
        ) {
          const message = useEffectEventError(null, false);

          context.report({
            node,
            message,
          });
        }
      },

      Identifier(node) {
        // This identifier resolves to a useEffectEvent function, but isn't being referenced in an
        // effect or another event function. It isn't being called either.
        if (lastEffect == null && useEffectEventFunctions.has(node)) {
          const message = useEffectEventError(
            getSourceCode().getText(node),
            node.parent.type === 'CallExpression',
          );

          context.report({
            node,
            message,
          });
        }
      },

      'CallExpression:exit'(node) {
        if (node === lastEffect) {
          lastEffect = null;
        }
      },

      FunctionDeclaration(node) {
        // function MyComponent() { const onClick = useEffectEvent(...) }
        if (isInsideComponentOrHook(node)) {
          recordAllUseEffectEventFunctions(getScope(node));
        }
      },

      ArrowFunctionExpression(node) {
        // const MyComponent = () => { const onClick = useEffectEvent(...) }
        if (isInsideComponentOrHook(node)) {
          recordAllUseEffectEventFunctions(getScope(node));
        }
      },

      // @ts-expect-error parser-hermes produces these node types
      ComponentDeclaration(node) {
        // component MyComponent() { const onClick = useEffectEvent(...) }
        recordAllUseEffectEventFunctions(getScope(node));
      },

      // @ts-expect-error parser-hermes produces these node types
      HookDeclaration(node) {
        // hook useMyHook() { const onClick = useEffectEvent(...) }
        recordAllUseEffectEventFunctions(getScope(node));
      },
    };
  },
} satisfies Rule.RuleModule;

/**
 * Gets the static name of a function AST node. For function declarations it is
 * easy. For anonymous function expressions it is much harder. If you search for
 * `IsAnonymousFunctionDefinition()` in the ECMAScript spec you'll find places
 * where JS gives anonymous function expressions names. We roughly detect the
 * same AST nodes with some exceptions to better fit our use case.
 */

function getFunctionName(node: Node) {
  if (
    // @ts-expect-error parser-hermes produces these node types
    node.type === 'ComponentDeclaration' ||
    // @ts-expect-error parser-hermes produces these node types
    node.type === 'HookDeclaration' ||
    node.type === 'FunctionDeclaration' ||
    (node.type === 'FunctionExpression' && node.id)
  ) {
    // function useHook() {}
    // const whatever = function useHook() {};
    //
    // Function declaration or function expression names win over any
    // assignment statements or other renames.
    return node.id;
  } else if (
    node.type === 'FunctionExpression' ||
    node.type === 'ArrowFunctionExpression'
  ) {
    if (
      node.parent?.type === 'VariableDeclarator' &&
      node.parent.init === node
    ) {
      // const useHook = () => {};
      return node.parent.id;
    } else if (
      node.parent?.type === 'AssignmentExpression' &&
      node.parent.right === node &&
      node.parent.operator === '='
    ) {
      // useHook = () => {};
      return node.parent.left;
    } else if (
      node.parent?.type === 'Property' &&
      node.parent.value === node &&
      !node.parent.computed
    ) {
      // {useHook: () => {}}
      // {useHook() {}}
      return node.parent.key;

      // NOTE: We could also support `ClassProperty` and `MethodDefinition`
      // here to be pedantic. However, hooks in a class are an anti-pattern. So
      // we don't allow it to error early.
      //
      // class {useHook = () => {}}
      // class {useHook() {}}
    } else if (
      node.parent?.type === 'AssignmentPattern' &&
      node.parent.right === node &&
      // @ts-expect-error Property computed does not exist on type `AssignmentPattern`.
      !node.parent.computed
    ) {
      // const {useHook = () => {}} = {};
      // ({useHook = () => {}} = {});
      //
      // Kinda clowny, but we'd said we'd follow spec convention for
      // `IsAnonymousFunctionDefinition()` usage.
      return node.parent.left;
    } else {
      return undefined;
    }
  } else {
    return undefined;
  }
}

/**
 * Convenience function for peeking the last item in a stack.
 */
function last<T>(array: Array<T>): T {
  return array[array.length - 1] as T;
}

export default rule;
