import {Expression, Identifier, Node} from 'estree-jsx';

/**
 * This file augments the `estree` types to include types that are not built-in to `estree` or `estree-jsx`.
 * This is necessary because the `estree` types are used by ESLint, and ESLint does not natively support
 * TypeScript or Flow types.  Since we're not using a ton of them, we can just add them here, rather than
 * installing typescript estree or flow estree types.
 *
 * This also adds support for the AST mutation that the Exhaustive deps rule does to add parent nodes.
 */
declare module 'estree' {
  // The Exhaustive deps rule mutates the AST to add parent nodes for efficient traversal.
  // We need to augment the `estree` types to support that.
  interface BaseNode {
    parent?: Node;
  }

  // Adding types that aren't built-in to estree or estree-jsx.
  // Namely, the specific TS and Flow types that we're using.
  interface AsExpression extends BaseExpression {
    type: 'AsExpression';
    expression: Expression | Identifier;
  }

  interface OptionalCallExpression extends BaseCallExpression {
    type: 'OptionalCallExpression';
  }

  interface OptionalMemberExpression extends MemberExpression {
    type: 'OptionalMemberExpression';
  }

  interface TSAsExpression extends BaseExpression {
    type: 'TSAsExpression';
    expression: Expression | Identifier;
  }

  interface TSTypeQuery extends BaseNode {
    type: 'TSTypeQuery';
    exprName: Identifier;
  }

  interface TSTypeReference extends BaseNode {
    type: 'TSTypeReference';
    typeName: Identifier;
  }

  interface TypeCastExpression extends BaseExpression {
    type: 'TypeCastExpression';
    expression: Expression | Identifier;
  }

  // Extend the set of known Expression types
  interface ExpressionMap {
    AsExpression: AsExpression;
    OptionalCallExpression: OptionalCallExpression;
    OptionalMemberExpression: OptionalMemberExpression;
    TSAsExpression: TSAsExpression;
    TypeCastExpression: TypeCastExpression;
  }

  // Extend the set of known Node types
  interface NodeMap {
    AsExpression: AsExpression;
    OptionalCallExpression: OptionalCallExpression;
    OptionalMemberExpression: OptionalMemberExpression;
    TSAsExpression: TSAsExpression;
    TSTypeQuery: TSTypeQuery;
    TSTypeReference: TSTypeReference;
    TypeCastExpression: TypeCastExpression;
  }
}
