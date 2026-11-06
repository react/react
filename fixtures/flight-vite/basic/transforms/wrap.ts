import type {Program} from 'estree';
import MagicString from 'magic-string';
import {hasDirective} from './utils';

export function transformWrapExport(
  ast: Program,
  options: {
    directive: string;
    code: string;
    runtime: (value: string, name: string) => string;
  },
) {
  if (!hasDirective(ast.body, options.directive)) {
    return;
  }

  const output = new MagicString(options.code);
  const exportNames: string[] = [];

  function handleExport(start: number, end: number, names: string[]) {
    // move and update code in a way that
    // `registerServerReference` position maps to original action position e.g.
    //
    // [input]
    //   export async function f() { ... }
    //   ^^^^^^
    //
    // [output]
    //   async function f() { ... }
    //   f = registerServerReference(f, ...)   << maps to original "export" token
    //   export { f }                          <<
    //
    const newCode = names
      .map(
        name =>
          `${name} = /* #__PURE__ */ ${options.runtime(name, name)};\n` +
          `export { ${name} };\n`,
      )
      .join('');
    output.update(start, end, newCode);
    output.move(start, end, options.code.length);
  }

  for (const node of ast.body) {
    // named exports
    if (node.type === 'ExportNamedDeclaration') {
      if (node.declaration) {
        if (
          node.declaration.type === 'FunctionDeclaration' ||
          node.declaration.type === 'ClassDeclaration'
        ) {
          /**
           * export function foo() {}
           */
          handleExport(node.start, node.declaration.start, [
            node.declaration.id.name,
          ]);
        } else if (node.declaration.type === 'VariableDeclaration') {
          /**
           * export const foo = 1, bar = 2
           */
          if (node.declaration.kind === 'const') {
            // replace `const` with `let` to override variable
            output.update(
              node.declaration.start,
              node.declaration.start + 5,
              'let',
            );
          }
          const decl = node.declaration.declarations[0];
          if (decl && decl.id.type === 'Identifier') {
            handleExport(node.start, node.declaration.start, [decl.id.name]);
          }
        }
      }
    }
  }

  return {exportNames, output};
}
