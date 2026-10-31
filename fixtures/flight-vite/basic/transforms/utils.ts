import type {Program} from 'estree';

// rollup ast's node span
declare module 'estree' {
  interface BaseNode {
    start: number;
    end: number;
  }
}

export function hasDirective(
  body: Program['body'],
  directive: string,
): boolean {
  return !!body.find(
    stmt =>
      stmt.type === 'ExpressionStatement' &&
      stmt.expression.type === 'Literal' &&
      typeof stmt.expression.value === 'string' &&
      stmt.expression.value === directive,
  );
}
