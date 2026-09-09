import type {Node, Program} from 'estree';
import MagicString from 'magic-string';
import {hasDirective} from './utils';

export function transformProxyExport(
  ast: Program,
  options: {
    directive: string;
    code: string;
    runtime: (name: string) => string;
  },
) {
  if (!hasDirective(ast.body, options.directive)) {
    return;
  }

  const output = new MagicString(options.code);
  const exportNames: string[] = [];

  function handleExport(node: Node, names: string[]) {
    exportNames.push(...names);
    const newCode = names
      .map(
        name =>
          (name === 'default' ? `export default` : `export const ${name} =`) +
          ` /* #__PURE__ */ ${options.runtime(name)};\n`,
      )
      .join('');
    output.update(node.start, node.end, newCode);
  }

  for (const node of ast.body) {
    if (node.type === 'ExportNamedDeclaration') {
      if (node.declaration) {
        if (
          node.declaration.type === 'FunctionDeclaration' ||
          node.declaration.type === 'ClassDeclaration'
        ) {
          /**
           * export function foo() {}
           */
          handleExport(node, [node.declaration.id.name]);
        } else if (node.declaration.type === 'VariableDeclaration') {
          /**
           * export const foo = 1, bar = 2
           */
          const decl = node.declaration.declarations[0];
          if (decl && decl.id.type === 'Identifier') {
            handleExport(node, [decl.id.name]);
          }
        } else {
          node.declaration satisfies never;
        }
        continue;
      }
    }

    /**
     * export default function foo() {}
     * export default class Foo {}
     * export default () => {}
     */
    if (node.type === 'ExportDefaultDeclaration') {
      handleExport(node, ['default']);
      continue;
    }

    // remove all other nodes
    output.remove(node.start, node.end);
  }

  return {exportNames, output};
}
