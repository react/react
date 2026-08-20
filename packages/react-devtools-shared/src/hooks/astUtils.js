/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import {withSyncPerfMeasurements} from 'react-devtools-shared/src/PerformanceLoggingUtils';
import traverse from '@babel/traverse';

import type {HooksNode} from 'react-debug-tools/src/ReactDebugHooks';

// Missing types in @babel/traverse
type NodePath = any;
type Node = any;
// Missing types in @babel/types
type File = any;

export type Position = {
  line: number,
  column: number,
};

export type SourceFileASTWithHookDetails = {
  sourceFileAST: File,
  line: number,
  source: string,
};

export const NO_HOOK_NAME = '<no-hook>';

const AST_NODE_TYPES = Object.freeze({
  PROGRAM: 'Program',
  CALL_EXPRESSION: 'CallExpression',
  MEMBER_EXPRESSION: 'MemberExpression',
  ARRAY_PATTERN: 'ArrayPattern',
  IDENTIFIER: 'Identifier',
  NUMERIC_LITERAL: 'NumericLiteral',
  VARIABLE_DECLARATOR: 'VariableDeclarator',
});

// Check if line number obtained from source map and the line number in hook node match
function checkNodeLocation(
  path: NodePath,
  line: number,
  column?: number | null = null,
): boolean {
  const {start, end} = path.node.loc;

  if (line !== start.line) {
    return false;
  }

  if (column !== null) {
    // Column numbers are represented differently between tools/engines.
    // Error.prototype.stack columns are 1-based (like most IDEs) but ASTs are 0-based.
    //
    // In practice this will probably never matter,
    // because this code matches the 1-based Error stack location for the hook Identifier (e.g. useState)
    // with the larger 0-based VariableDeclarator (e.g. [foo, setFoo] = useState())
    // so the ranges should always overlap.
    //
    // For more info see https://github.com/facebook/react/pull/21833#discussion_r666831276
    column -= 1;
    if (
      (line === start.line && column < start.column) ||
      (line === end.line && column > end.column)
    ) {
      return false;
    }
  }

  return true;
}

// Checks whether hookNode is a member of targetHookNode
function filterMemberNodesOfTargetHook(
  targetHookNode: NodePath,
  hookNode: NodePath,
): boolean {
  const targetHookName = targetHookNode.node.id.name;
  return (
    targetHookName != null &&
    (targetHookName ===
      (hookNode.node.init.object && hookNode.node.init.object.name) ||
      targetHookName === hookNode.node.init.name)
  );
}

// Checks whether hook is the first member node of a state variable declaration node
function filterMemberWithHookVariableName(hook: NodePath): boolean {
  return (
    hook.node.init.property.type === AST_NODE_TYPES.NUMERIC_LITERAL &&
    hook.node.init.property.value === 0
  );
}

// Returns all AST Nodes associated with 'potentialReactHookASTNode'
function getFilteredHookASTNodes(
  potentialReactHookASTNode: NodePath,
  potentialHooksFound: Array<NodePath>,
  source: string,
): Array<NodePath> {
  let nodesAssociatedWithReactHookASTNode: NodePath[] = [];
  if (nodeContainsHookVariableName(potentialReactHookASTNode)) {
    // made custom hooks to enter this, always
    // Case 1.
    // Directly usable Node -> const ref = useRef(null);
    //                      -> const [tick, setTick] = useState(1);
    // Case 2.
    // Custom Hooks -> const someVariable = useSomeCustomHook();
    //              -> const [someVariable, someFunction] = useAnotherCustomHook();
    nodesAssociatedWithReactHookASTNode.unshift(potentialReactHookASTNode);
  } else {
    // Case 3.
    // Indirectly usable Node -> const tickState = useState(1);
    //                           [tick, setTick] = tickState;
    //                        -> const tickState = useState(1);
    //                           const tick = tickState[0];
    //                           const setTick = tickState[1];
    nodesAssociatedWithReactHookASTNode = potentialHooksFound.filter(hookNode =>
      filterMemberNodesOfTargetHook(potentialReactHookASTNode, hookNode),
    );
  }
  return nodesAssociatedWithReactHookASTNode;
}

// Returns Hook name
export function getHookName(
  hook: HooksNode,
  originalSourceAST: mixed,
  originalSourceCode: string,
  originalSourceLineNumber: number,
  originalSourceColumnNumber: number,
): string | null {
  const hooksFromAST = withSyncPerfMeasurements(
    'getPotentialHookDeclarationsFromAST(originalSourceAST)',
    () => getPotentialHookDeclarationsFromAST(originalSourceAST),
  );

  let potentialReactHookASTNode = null;
  if (originalSourceColumnNumber === 0) {
    // This most likely indicates a source map type like 'cheap-module-source-map'
    // that intentionally drops column numbers for compilation speed in DEV builds.
    // In this case, we can assume there's probably only one hook per line (true in most cases)
    // and just fail if we find more than one match.
    const matchingNodes = hooksFromAST.filter(node => {
      const nodeLocationCheck = checkNodeLocation(
        node,
        originalSourceLineNumber,
      );

      const hookDeclarationCheck = isConfirmedHookDeclaration(node);
      return nodeLocationCheck && hookDeclarationCheck;
    });

    if (matchingNodes.length === 1) {
      potentialReactHookASTNode = matchingNodes[0];
    }
  } else {
    potentialReactHookASTNode = hooksFromAST.find(node => {
      const nodeLocationCheck = checkNodeLocation(
        node,
        originalSourceLineNumber,
        originalSourceColumnNumber,
      );

      const hookDeclarationCheck = isConfirmedHookDeclaration(node);
      return nodeLocationCheck && hookDeclarationCheck;
    });
  }

  if (!potentialReactHookASTNode) {
    return null;
  }

  // nodesAssociatedWithReactHookASTNode could directly be used to obtain the hook variable name
  // depending on the type of potentialReactHookASTNode
  try {
    const nodesAssociatedWithReactHookASTNode = withSyncPerfMeasurements(
      'getFilteredHookASTNodes()',
      () =>
        getFilteredHookASTNodes(
          potentialReactHookASTNode,
          hooksFromAST,
          originalSourceCode,
        ),
    );

    const name = withSyncPerfMeasurements('getHookNameFromNode()', () =>
      getHookNameFromNode(
        hook,
        nodesAssociatedWithReactHookASTNode,
        potentialReactHookASTNode,
      ),
    );

    return name;
  } catch (error) {
    console.error(error);
    return null;
  }
}

function getHookNameFromNode(
  originalHook: HooksNode,
  nodesAssociatedWithReactHookASTNode: NodePath[],
  potentialReactHookASTNode: NodePath,
): string | null {
  let hookVariableName: string | null;
  const isCustomHook = originalHook.id === null;

  switch (nodesAssociatedWithReactHookASTNode.length) {
    case 1:
      // CASE 1A (nodesAssociatedWithReactHookASTNode[0] !== potentialReactHookASTNode):
      // const flagState = useState(true); -> later referenced as
      // const [flag, setFlag] = flagState;
      //
      // CASE 1B (nodesAssociatedWithReactHookASTNode[0] === potentialReactHookASTNode):
      // const [flag, setFlag] = useState(true); -> we have access to the hook variable straight away
      //
      // CASE 1C (isCustomHook && nodesAssociatedWithReactHookASTNode[0] === potentialReactHookASTNode):
      // const someVariable = useSomeCustomHook(); -> we have access to hook variable straight away
      // const [someVariable, someFunction] = useAnotherCustomHook(); -> we ignore variable names in this case
      //                                                                 as it is unclear what variable name to show
      if (
        isCustomHook &&
        nodesAssociatedWithReactHookASTNode[0] === potentialReactHookASTNode
      ) {
        hookVariableName = getHookVariableName(
          potentialReactHookASTNode,
          isCustomHook,
        );
        break;
      }
      hookVariableName = getHookVariableName(
        nodesAssociatedWithReactHookASTNode[0],
      );
      break;

    case 2:
      // const flagState = useState(true); -> later referenced as
      // const flag = flagState[0];
      // const setFlag = flagState[1];
      nodesAssociatedWithReactHookASTNode =
        nodesAssociatedWithReactHookASTNode.filter(hookPath =>
          filterMemberWithHookVariableName(hookPath),
        );

      if (nodesAssociatedWithReactHookASTNode.length !== 1) {
        // Something went wrong, only a single desirable hook should remain here
        throw new Error("Couldn't isolate AST Node containing hook variable.");
      }
      hookVariableName = getHookVariableName(
        nodesAssociatedWithReactHookASTNode[0],
      );
      break;

    default:
      // Case 0:
      // const flagState = useState(true); -> which is not accessed anywhere
      //
      // Case > 2 (fallback):
      // const someState = React.useState(() => 0)
      //
      // const stateVariable = someState[0]
      // const setStateVariable = someState[1]
      //
      // const [number2, setNumber2] = someState
      //
      // We assign the state variable for 'someState' to multiple variables,
      // and hence cannot isolate a unique variable name. In such cases,
      // default to showing 'someState'

      hookVariableName = getHookVariableName(potentialReactHookASTNode);
      break;
  }

  return hookVariableName;
}

// Extracts the variable name from hook node path
function getHookVariableName(
  hook: NodePath,
  isCustomHook: boolean = false,
): string | null {
  const nodeType = hook.node.id.type;
  switch (nodeType) {
    case AST_NODE_TYPES.ARRAY_PATTERN:
      return !isCustomHook ? (hook.node.id.elements[0]?.name ?? null) : null;

    case AST_NODE_TYPES.IDENTIFIER:
      return hook.node.id.name;

    default:
      return null;
  }
}

function getPotentialHookDeclarationsFromAST(sourceAST: File): NodePath[] {
  const potentialHooksFound: NodePath[] = [];
  withSyncPerfMeasurements('traverse(sourceAST)', () =>
    traverse(sourceAST, {
      enter(path) {
        if (path.isVariableDeclarator() && isPotentialHookDeclaration(path)) {
          potentialHooksFound.push(path);
        }
      },
    }),
  );
  return potentialHooksFound;
}

/**
 * This function traverses the sourceAST and returns a mapping
 * that maps locations in the source code to their corresponding
 * Hook name, if there is a relevant Hook name for that location.
 *
 * A location in the source code is represented by line and column
 * numbers as a Position object: { line, column }.
 *   - line is 1-indexed.
 *   - column is 0-indexed.
 *
 * A Hook name will be assigned to a Hook CallExpression if the
 * CallExpression is for a variable declaration (i.e. it returns
 * a value that is assigned to a variable), and if we can reliably
 * infer the correct name to use (see comments in the function body
 * for more details).
 *
 * The returned mapping is an array of locations and their assigned
 * names, sorted by location. Specifically, each entry in the array
 * contains a `name` and a `start` Position. The `name` of a given
 * entry is the "assigned" name in the source code until the `start`
 * of the **next** entry. This means that given the mapping, in order
 * to determine the Hook name assigned for a given source location, we
 * need to find the adjacent entries that most closely contain the given
 * location.
 *
 * E.g. for the following code:
 *
 * 1|  function Component() {
 * 2|    const [state, setState] = useState(0);
 * 3|                              ^---------^ -> Cols 28 - 38: Hook CallExpression
 * 4|
 * 5|    useEffect(() => {...}); -> call ignored since not declaring a variable
 * 6|
 * 7|    return (...);
 * 8|  }
 *
 * The returned "mapping" would be something like:
 *   [
 *     {name: '<no-hook>', start: {line: 1, column: 0}},
 *     {name: 'state', start: {line: 2, column: 28}},
 *     {name: '<no-hook>', start: {line: 2, column: 38}},
 *   ]
 *
 * Where the Hook name `state` (corresponding to the `state` variable)
 * is assigned to the location in the code for the CallExpression
 * representing the call to `useState(0)` (line 2, col 28-38).
 */
export function getHookNamesMappingFromAST(
  sourceAST: File,
): $ReadOnlyArray<{name: string, start: Position}> {
  const hookStack: Array<{name: string, start: $FlowFixMe}> = [];
  const hookNames = [];
  const pushFrame = (name: string, node: Node) => {
    const nameInfo = {name, start: {...node.loc.start}};
    hookStack.unshift(nameInfo);
    hookNames.push(nameInfo);
  };
  const popFrame = (node: Node) => {
    hookStack.shift();
    const top = hookStack[0];
    if (top != null) {
      hookNames.push({name: top.name, start: {...node.loc.end}});
    }
  };

  traverse(sourceAST, {
    [AST_NODE_TYPES.PROGRAM]: {
      enter(path) {
        pushFrame(NO_HOOK_NAME, path.node);
      },
      exit(path) {
        popFrame(path.node);
      },
    },
    [AST_NODE_TYPES.VARIABLE_DECLARATOR]: {
      enter(path) {
        // Check if this variable declaration corresponds to a variable
        // declared by calling a Hook.
        if (isConfirmedHookDeclaration(path)) {
          const hookDeclaredVariableName = getHookVariableName(path);
          if (!hookDeclaredVariableName) {
            return;
          }
          const callExpressionNode = assertCallExpression(path.node.init);

          // Check if this variable declaration corresponds to a call to a
          // built-in Hook that returns a tuple (useState, useReducer,
          // useTransition).
          // If it doesn't, we immediately use the declared variable name
          // as the Hook name. We do this because for any other Hooks that
          // aren't the built-in Hooks that return a tuple, we can't reliably
          // extract a Hook name from other variable declarations derived from
          // this one, since we don't know which of the declared variables
          // are the relevant ones to track and show in dev tools.
          if (!isBuiltInHookThatReturnsTuple(path)) {
            pushFrame(hookDeclaredVariableName, callExpressionNode);
            return;
          }

          // Check if the variable declared by the Hook call is referenced
          // anywhere else in the code. If not, we immediately use the
          // declared variable name as the Hook name.
          const referencePaths =
            hookDeclaredVariableName != null
              ? path.scope.bindings[hookDeclaredVariableName]?.referencePaths
              : null;
          if (referencePaths == null) {
            pushFrame(hookDeclaredVariableName, callExpressionNode);
            return;
          }

          // Check each reference to the variable declared by the Hook call,
          // and for each, we do the following:
          let declaredVariableName = null;
          for (let i = 0; i <= referencePaths.length; i++) {
            const referencePath = referencePaths[i];
            if (declaredVariableName != null) {
              break;
            }

            // 1. Check if the reference is contained within a VariableDeclarator
            // Node. This will allow us to determine if the variable declared by
            // the Hook call is being used to declare other variables.
            let variableDeclaratorPath = referencePath;
            while (
              variableDeclaratorPath != null &&
              variableDeclaratorPath.node.type !==
                AST_NODE_TYPES.VARIABLE_DECLARATOR
            ) {
              variableDeclaratorPath = variableDeclaratorPath.parentPath;
            }

            // 2. If we find a VariableDeclarator containing the
            // referenced variable, we extract the Hook name from the new
            // variable declaration.
            // E.g., a case like the following:
            //    const countState = useState(0);
            //    const count = countState[0];
            //    const setCount = countState[1]
            // Where the reference to `countState` is later referenced
            // within a VariableDeclarator, so we can extract `count` as
            // the Hook name.
            const varDeclInit = variableDeclaratorPath?.node.init;
            if (varDeclInit != null) {
              switch (varDeclInit.type) {
                case AST_NODE_TYPES.MEMBER_EXPRESSION: {
                  // When encountering a MemberExpression inside the new
                  // variable declaration, we only want to extract the variable
                  // name if we're assigning the value of the first member,
                  // which is handled by `filterMemberWithHookVariableName`.
                  // E.g.
                  //    const countState = useState(0);
                  //    const count = countState[0];    -> extract the name from this reference
                  //    const setCount = countState[1]; -> ignore this reference
                  if (
                    filterMemberWithHookVariableName(variableDeclaratorPath)
                  ) {
                    declaredVariableName = getHookVariableName(
                      variableDeclaratorPath,
                    );
                  }
                  break;
                }
                case AST_NODE_TYPES.IDENTIFIER: {
                  declaredVariableName = getHookVariableName(
                    variableDeclaratorPath,
                  );
                  break;
                }
                default:
                  break;
              }
            }
          }

          // If we were able to extract a name from the new variable
          // declaration, use it as the Hook name. Otherwise, use the
          // original declared variable as the variable name.
          if (declaredVariableName != null) {
            pushFrame(declaredVariableName, callExpressionNode);
          } else {
            pushFrame(hookDeclaredVariableName, callExpressionNode);
          }
        }
      },
      exit(path) {
        if (isConfirmedHookDeclaration(path)) {
          const callExpressionNode = assertCallExpression(path.node.init);
          popFrame(callExpressionNode);
        }
      },
    },
  });
  return hookNames;
}

// Check if 'path' contains declaration of the form const X = useState(0);
function isConfirmedHookDeclaration(path: NodePath): boolean {
  const nodeInit = path.node.init;
  if (nodeInit == null || nodeInit.type !== AST_NODE_TYPES.CALL_EXPRESSION) {
    return false;
  }
  const callee = nodeInit.callee;
  return isHook(callee);
}

// We consider hooks to be a hook name identifier or a member expression containing a hook name.
function isHook(node: Node): boolean {
  if (node.type === AST_NODE_TYPES.IDENTIFIER) {
    return isHookName(node.name);
  } else if (
    node.type === AST_NODE_TYPES.MEMBER_EXPRESSION &&
    !node.computed &&
    isHook(node.property)
  ) {
    const obj = node.object;
    const isPascalCaseNameSpace = /^[A-Z].*/;
    return (
      obj.type === AST_NODE_TYPES.IDENTIFIER &&
      isPascalCaseNameSpace.test(obj.name)
    );
  } else {
    // TODO Possibly handle inline require statements e.g. require("useStable")(...)
    // This does not seem like a high priority, since inline requires are probably
    // not common and are also typically in compiled code rather than source code.

    return false;
  }
}

// Catch all identifiers that begin with "use"
// followed by an uppercase Latin character to exclude identifiers like "user".
// Copied from packages/eslint-plugin-react-hooks/src/RulesOfHooks
function isHookName(name: string): boolean {
  return /^use[A-Z0-9].*$/.test(name);
}

// Check if the AST Node COULD be a React Hook
function isPotentialHookDeclaration(path: NodePath): boolean {
  // The array potentialHooksFound will contain all potential hook declaration cases we support
  const nodePathInit = path.node.init;
  if (nodePathInit != null) {
    if (nodePathInit.type === AST_NODE_TYPES.CALL_EXPRESSION) {
      // CASE: CallExpression
      // 1. const [count, setCount] = useState(0); -> destructured pattern
      // 2. const [A, setA] = useState(0), const [B, setB] = useState(0); -> multiple inline declarations
      // 3. const [
      //      count,
      //      setCount
      //    ] = useState(0); -> multiline hook declaration
      // 4. const ref = useRef(null); -> generic hooks
      const callee = nodePathInit.callee;
      return isHook(callee);
    } else if (
      nodePathInit.type === AST_NODE_TYPES.MEMBER_EXPRESSION ||
      nodePathInit.type === AST_NODE_TYPES.IDENTIFIER
    ) {
      // CASE: MemberExpression
      //    const countState = React.useState(0);
      //    const count = countState[0];
      //    const setCount = countState[1]; -> Accessing members following hook declaration

      // CASE: Identifier
      //    const countState = React.useState(0);
      //    const [count, setCount] = countState; ->  destructuring syntax following hook declaration
      return true;
    }
  }
  return false;
}

/// Check whether 'node' is hook declaration of form useState(0); OR React.useState(0);
function isReactFunction(node: Node, functionName: string): boolean {
  return (
    node.name === functionName ||
    (node.type === 'MemberExpression' &&
      node.object.name === 'React' &&
      node.property.name === functionName)
  );
}

// Check if 'path' is either State or Reducer hook
function isBuiltInHookThatReturnsTuple(path: NodePath): boolean {
  const callee = path.node.init.callee;
  return (
    isReactFunction(callee, 'useState') ||
    isReactFunction(callee, 'useReducer') ||
    isReactFunction(callee, 'useTransition')
  );
}

// Check whether hookNode of a declaration contains obvious variable name
function nodeContainsHookVariableName(hookNode: NodePath): boolean {
  // We determine cases where variable names are obvious in declarations. Examples:
  // const [tick, setTick] = useState(1); OR const ref = useRef(null);
  // Here tick/ref are obvious hook variables in the hook declaration node itself
  // 1. True for satisfying above cases
  // 2. False for everything else. Examples:
  //    const countState = React.useState(0);
  //    const count = countState[0];
  //    const setCount = countState[1]; -> not obvious, hook variable can't be determined
  //                                       from the hook declaration node alone
  // 3. For custom hooks we force pass true since we are only concerned with the AST node
  //    regardless of how it is accessed in source code. (See: getHookVariableName)

  const node = hookNode.node.id;
  if (
    node.type === AST_NODE_TYPES.ARRAY_PATTERN ||
    (node.type === AST_NODE_TYPES.IDENTIFIER &&
      !isBuiltInHookThatReturnsTuple(hookNode))
  ) {
    return true;
  }
  return false;
}

function assertCallExpression(node: Node): Node {
  if (node.type !== AST_NODE_TYPES.CALL_EXPRESSION) {
    throw new Error('Expected a CallExpression node for a Hook declaration.');
  }
  return node;
}
