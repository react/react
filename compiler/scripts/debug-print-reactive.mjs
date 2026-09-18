/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * Debug ReactiveFunction printer for the Rust port testing infrastructure.
 *
 * Custom printer that walks the ReactiveFunction tree structure and prints
 * every field of every scope, instruction, terminal, and reactive value node.
 *
 * This does NOT delegate to printReactiveFunctionWithOutlined() — it is a
 * standalone walker that produces a detailed, deterministic representation
 * suitable for cross-compiler comparison between the TS and Rust implementations.
 *
 * @param {Function} _printReactiveFunctionWithOutlined - Unused (kept for API compat)
 * @param {object} reactiveFunction - The ReactiveFunction to print
 * @returns {string} The debug representation
 */
export function debugPrintReactive(
  _printReactiveFunctionWithOutlined,
  reactiveFunction
) {
  const outlined = [];
  const result = printReactiveFunction(reactiveFunction, 0, outlined);
  const parts = [result];
  for (let i = 0; i < outlined.length; i++) {
    parts.push(printReactiveFunction(outlined[i], i + 1, outlined));
  }
  return parts.join("\n\n");
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function ind(depth) {
  return "  ".repeat(depth);
}

function formatLoc(loc) {
  if (loc == null || typeof loc === "symbol") {
    return "generated";
  }
  return `${loc.start.line}:${loc.start.column}-${loc.end.line}:${loc.end.column}`;
}

function formatEffect(effect) {
  return String(effect);
}

function formatType(type) {
  if (type == null) return "Type";
  switch (type.kind) {
    case "Type":
      return "Type";
    case "Primitive":
      return "Primitive";
    case "Object":
      return type.shapeId != null ? `Object<${type.shapeId}>` : "Object";
    case "Function": {
      const ret = formatType(type.return);
      const base =
        type.shapeId != null ? `Function<${type.shapeId}>` : "Function";
      return ret !== "Type" ? `${base}():${ret}` : base;
    }
    case "Poly":
      return "Poly";
    case "Phi": {
      const ops = type.operands.map(formatType).join(", ");
      return `Phi(${ops})`;
    }
    case "Property": {
      const objType = formatType(type.objectType);
      return `Property(${objType}.${type.objectName})`;
    }
    case "ObjectMethod":
      return "ObjectMethod";
    default:
      return "Type";
  }
}

function formatIdentifierName(name) {
  if (name == null) return "null";
  if (typeof name === "object" && name.value != null) {
    return JSON.stringify(name.value);
  }
  return JSON.stringify(String(name));
}

function formatMutableRange(range) {
  if (range == null) return "[0:0]";
  return `[${range.start}:${range.end}]`;
}

function formatScopeId(scope) {
  if (scope == null) return "null";
  return `@${scope.id}`;
}

function formatDeclarationId(id) {
  if (id == null) return "null";
  return String(id);
}

// ---------------------------------------------------------------------------
// Place printing
// ---------------------------------------------------------------------------

function printPlaceInline(place, depth) {
  const id = place.identifier;
  return [
    `${ind(depth)}Place {`,
    `${ind(depth + 1)}identifier: $${id.id}`,
    `${ind(depth + 1)}effect: ${formatEffect(place.effect)}`,
    `${ind(depth + 1)}reactive: ${place.reactive}`,
    `${ind(depth + 1)}loc: ${formatLoc(place.loc)}`,
    `${ind(depth)}}`,
  ].join("\n");
}

// ---------------------------------------------------------------------------
// Object property key
// ---------------------------------------------------------------------------

function printObjectPropertyKey(key) {
  switch (key.kind) {
    case "identifier":
      return key.name;
    case "string":
      return `"${key.name}"`;
    case "computed":
      return `[$${key.name.identifier.id}]`;
    case "number":
      return String(key.name);
    default:
      return String(key.name ?? key.kind);
  }
}

function printPlaceOrSpread(ps) {
  if (ps.kind === "Identifier") return `$${ps.identifier.id}`;
  if (ps.kind === "Spread") return `...$${ps.place.identifier.id}`;
  return "<hole>";
}

function printPattern(pattern) {
  switch (pattern.kind) {
    case "ArrayPattern":
      return `[${pattern.items.map((item) => (item.kind === "Hole" ? "<hole>" : item.kind === "Spread" ? `...$${item.place.identifier.id}` : `$${item.identifier.id}`)).join(", ")}]`;
    case "ObjectPattern":
      return `{${pattern.properties.map((p) => p.kind === "Spread" ? `...$${p.place.identifier.id}` : `${printObjectPropertyKey(p.key)}: $${p.place.identifier.id}`).join(", ")}}`;
    default:
      return String(pattern);
  }
}

// ---------------------------------------------------------------------------
// InstructionValue printing (shared with HIR printer)
// ---------------------------------------------------------------------------

function printInstructionValueFields(value, depth) {
  const d = depth;
  const lines = [];
  const kind = value.kind;

  switch (kind) {
    case "LoadLocal":
      lines.push(`${ind(d)}LoadLocal {`);
      lines.push(`${ind(d + 1)}place: $${value.place.identifier.id}`);
      lines.push(`${ind(d)}}`);
      break;
    case "LoadContext":
      lines.push(`${ind(d)}LoadContext {`);
      lines.push(`${ind(d + 1)}place: $${value.place.identifier.id}`);
      lines.push(`${ind(d)}}`);
      break;
    case "DeclareLocal":
      lines.push(`${ind(d)}DeclareLocal {`);
      lines.push(`${ind(d + 1)}lvalue.kind: ${value.lvalue.kind}`);
      lines.push(
        `${ind(d + 1)}lvalue.place: $${value.lvalue.place.identifier.id}`
      );
      lines.push(`${ind(d)}}`);
      break;
    case "DeclareContext":
      lines.push(`${ind(d)}DeclareContext {`);
      lines.push(`${ind(d + 1)}lvalue.kind: ${value.lvalue.kind}`);
      lines.push(
        `${ind(d + 1)}lvalue.place: $${value.lvalue.place.identifier.id}`
      );
      lines.push(`${ind(d)}}`);
      break;
    case "StoreLocal":
      lines.push(`${ind(d)}StoreLocal {`);
      lines.push(`${ind(d + 1)}lvalue.kind: ${value.lvalue.kind}`);
      lines.push(
        `${ind(d + 1)}lvalue.place: $${value.lvalue.place.identifier.id}`
      );
      lines.push(`${ind(d + 1)}value: $${value.value.identifier.id}`);
      lines.push(`${ind(d)}}`);
      break;
    case "StoreContext":
      lines.push(`${ind(d)}StoreContext {`);
      lines.push(`${ind(d + 1)}lvalue.kind: ${value.lvalue.kind}`);
      lines.push(
        `${ind(d + 1)}lvalue.place: $${value.lvalue.place.identifier.id}`
      );
      lines.push(`${ind(d + 1)}value: $${value.value.identifier.id}`);
      lines.push(`${ind(d)}}`);
      break;
    case "Destructure":
      lines.push(`${ind(d)}Destructure {`);
      lines.push(`${ind(d + 1)}lvalue.kind: ${value.lvalue.kind}`);
      lines.push(
        `${ind(d + 1)}lvalue.pattern: ${printPattern(value.lvalue.pattern)}`
      );
      lines.push(`${ind(d + 1)}value: $${value.value.identifier.id}`);
      lines.push(`${ind(d)}}`);
      break;
    case "Primitive":
      lines.push(`${ind(d)}Primitive {`);
      lines.push(
        `${ind(d + 1)}value: ${value.value === undefined ? "undefined" : JSON.stringify(value.value)}`
      );
      lines.push(`${ind(d)}}`);
      break;
    case "JSXText":
      lines.push(`${ind(d)}JSXText {`);
      lines.push(`${ind(d + 1)}value: ${JSON.stringify(value.value)}`);
      lines.push(`${ind(d)}}`);
      break;
    case "BinaryExpression":
      lines.push(`${ind(d)}BinaryExpression {`);
      lines.push(`${ind(d + 1)}operator: ${value.operator}`);
      lines.push(`${ind(d + 1)}left: $${value.left.identifier.id}`);
      lines.push(`${ind(d + 1)}right: $${value.right.identifier.id}`);
      lines.push(`${ind(d)}}`);
      break;
    case "UnaryExpression":
      lines.push(`${ind(d)}UnaryExpression {`);
      lines.push(`${ind(d + 1)}operator: ${value.operator}`);
      lines.push(`${ind(d + 1)}value: $${value.value.identifier.id}`);
      lines.push(`${ind(d)}}`);
      break;
    case "CallExpression":
      lines.push(`${ind(d)}CallExpression {`);
      lines.push(`${ind(d + 1)}callee: $${value.callee.identifier.id}`);
      lines.push(
        `${ind(d + 1)}args: [${value.args.map(printPlaceOrSpread).join(", ")}]`
      );
      lines.push(`${ind(d)}}`);
      break;
    case "MethodCall":
      lines.push(`${ind(d)}MethodCall {`);
      lines.push(`${ind(d + 1)}receiver: $${value.receiver.identifier.id}`);
      lines.push(`${ind(d + 1)}property: $${value.property.identifier.id}`);
      lines.push(
        `${ind(d + 1)}args: [${value.args.map(printPlaceOrSpread).join(", ")}]`
      );
      lines.push(`${ind(d)}}`);
      break;
    case "NewExpression":
      lines.push(`${ind(d)}NewExpression {`);
      lines.push(`${ind(d + 1)}callee: $${value.callee.identifier.id}`);
      lines.push(
        `${ind(d + 1)}args: [${value.args.map(printPlaceOrSpread).join(", ")}]`
      );
      lines.push(`${ind(d)}}`);
      break;
    case "ObjectExpression":
      lines.push(`${ind(d)}ObjectExpression {`);
      if (value.properties != null) {
        lines.push(`${ind(d + 1)}properties:`);
        for (const prop of value.properties) {
          if (prop.kind === "ObjectProperty") {
            lines.push(
              `${ind(d + 2)}${printObjectPropertyKey(prop.key)}: $${prop.place.identifier.id}`
            );
          } else {
            lines.push(`${ind(d + 2)}...$${prop.place.identifier.id}`);
          }
        }
      } else {
        lines.push(`${ind(d + 1)}properties: null`);
      }
      lines.push(`${ind(d)}}`);
      break;
    case "ArrayExpression":
      lines.push(`${ind(d)}ArrayExpression {`);
      lines.push(
        `${ind(d + 1)}elements: [${value.elements.map((e) => (e.kind === "Hole" ? "<hole>" : e.kind === "Spread" ? `...$${e.place.identifier.id}` : `$${e.identifier.id}`)).join(", ")}]`
      );
      lines.push(`${ind(d)}}`);
      break;
    case "PropertyLoad":
      lines.push(`${ind(d)}PropertyLoad {`);
      lines.push(`${ind(d + 1)}object: $${value.object.identifier.id}`);
      lines.push(`${ind(d + 1)}property: ${value.property}`);
      lines.push(`${ind(d)}}`);
      break;
    case "PropertyStore":
      lines.push(`${ind(d)}PropertyStore {`);
      lines.push(`${ind(d + 1)}object: $${value.object.identifier.id}`);
      lines.push(`${ind(d + 1)}property: ${value.property}`);
      lines.push(`${ind(d + 1)}value: $${value.value.identifier.id}`);
      lines.push(`${ind(d)}}`);
      break;
    case "PropertyDelete":
      lines.push(`${ind(d)}PropertyDelete {`);
      lines.push(`${ind(d + 1)}object: $${value.object.identifier.id}`);
      lines.push(`${ind(d + 1)}property: ${value.property}`);
      lines.push(`${ind(d)}}`);
      break;
    case "ComputedLoad":
      lines.push(`${ind(d)}ComputedLoad {`);
      lines.push(`${ind(d + 1)}object: $${value.object.identifier.id}`);
      lines.push(`${ind(d + 1)}property: $${value.property.identifier.id}`);
      lines.push(`${ind(d)}}`);
      break;
    case "ComputedStore":
      lines.push(`${ind(d)}ComputedStore {`);
      lines.push(`${ind(d + 1)}object: $${value.object.identifier.id}`);
      lines.push(`${ind(d + 1)}property: $${value.property.identifier.id}`);
      lines.push(`${ind(d + 1)}value: $${value.value.identifier.id}`);
      lines.push(`${ind(d)}}`);
      break;
    case "ComputedDelete":
      lines.push(`${ind(d)}ComputedDelete {`);
      lines.push(`${ind(d + 1)}object: $${value.object.identifier.id}`);
      lines.push(`${ind(d + 1)}property: $${value.property.identifier.id}`);
      lines.push(`${ind(d)}}`);
      break;
    case "LoadGlobal": {
      lines.push(`${ind(d)}LoadGlobal {`);
      const b = value.binding;
      lines.push(`${ind(d + 1)}binding.kind: ${b.kind}`);
      lines.push(`${ind(d + 1)}binding.name: ${b.name}`);
      if (b.module != null) {
        lines.push(`${ind(d + 1)}binding.module: ${b.module}`);
      }
      if (b.imported != null) {
        lines.push(`${ind(d + 1)}binding.imported: ${b.imported}`);
      }
      lines.push(`${ind(d)}}`);
      break;
    }
    case "StoreGlobal":
      lines.push(`${ind(d)}StoreGlobal {`);
      lines.push(`${ind(d + 1)}name: ${value.name}`);
      lines.push(`${ind(d + 1)}value: $${value.value.identifier.id}`);
      lines.push(`${ind(d)}}`);
      break;
    case "TypeCastExpression":
      lines.push(`${ind(d)}TypeCastExpression {`);
      lines.push(`${ind(d + 1)}value: $${value.value.identifier.id}`);
      lines.push(`${ind(d + 1)}type: ${formatType(value.type)}`);
      lines.push(`${ind(d)}}`);
      break;
    case "JsxExpression": {
      lines.push(`${ind(d)}JsxExpression {`);
      if (value.tag.kind === "Identifier") {
        lines.push(`${ind(d + 1)}tag: $${value.tag.identifier.id}`);
      } else {
        lines.push(`${ind(d + 1)}tag: "${value.tag.name}"`);
      }
      lines.push(`${ind(d + 1)}props:`);
      for (const attr of value.props) {
        if (attr.kind === "JsxAttribute") {
          lines.push(
            `${ind(d + 2)}${attr.name}: $${attr.place.identifier.id}`
          );
        } else {
          lines.push(`${ind(d + 2)}...$${attr.argument.identifier.id}`);
        }
      }
      if (value.children != null) {
        lines.push(
          `${ind(d + 1)}children: [${value.children.map((c) => `$${c.identifier.id}`).join(", ")}]`
        );
      } else {
        lines.push(`${ind(d + 1)}children: null`);
      }
      lines.push(`${ind(d)}}`);
      break;
    }
    case "JsxFragment":
      lines.push(`${ind(d)}JsxFragment {`);
      lines.push(
        `${ind(d + 1)}children: [${value.children.map((c) => `$${c.identifier.id}`).join(", ")}]`
      );
      lines.push(`${ind(d)}}`);
      break;
    case "FunctionExpression":
    case "ObjectMethod": {
      const label =
        kind === "FunctionExpression" ? "FunctionExpression" : "ObjectMethod";
      lines.push(`${ind(d)}${label} {`);
      if (kind === "FunctionExpression") {
        lines.push(
          `${ind(d + 1)}name: ${value.name != null ? JSON.stringify(value.name) : "null"}`
        );
      }
      lines.push(
        `${ind(d + 1)}loweredFunc.id: ${value.loweredFunc.func.id ?? "null"}`
      );
      const ctx = value.loweredFunc.func.context;
      lines.push(
        `${ind(d + 1)}context: [${ctx.map((c) => `$${c.identifier.id}`).join(", ")}]`
      );
      const ae = value.loweredFunc.func.aliasingEffects;
      lines.push(
        `${ind(d + 1)}aliasingEffects: ${ae != null ? `[${ae.length} effects]` : "null"}`
      );
      lines.push(`${ind(d)}}`);
      break;
    }
    case "TaggedTemplateExpression":
      lines.push(`${ind(d)}TaggedTemplateExpression {`);
      lines.push(`${ind(d + 1)}tag: $${value.tag.identifier.id}`);
      lines.push(
        `${ind(d + 1)}value.raw: ${JSON.stringify(value.value.raw)}`
      );
      lines.push(`${ind(d)}}`);
      break;
    case "TemplateLiteral":
      lines.push(`${ind(d)}TemplateLiteral {`);
      lines.push(
        `${ind(d + 1)}quasis: [${value.quasis.map((q) => JSON.stringify(q.raw)).join(", ")}]`
      );
      lines.push(
        `${ind(d + 1)}subexprs: [${value.subexprs.map((s) => `$${s.identifier.id}`).join(", ")}]`
      );
      lines.push(`${ind(d)}}`);
      break;
    case "RegExpLiteral":
      lines.push(`${ind(d)}RegExpLiteral {`);
      lines.push(`${ind(d + 1)}pattern: ${value.pattern}`);
      lines.push(`${ind(d + 1)}flags: ${value.flags}`);
      lines.push(`${ind(d)}}`);
      break;
    case "MetaProperty":
      lines.push(`${ind(d)}MetaProperty {`);
      lines.push(`${ind(d + 1)}meta: ${value.meta}`);
      lines.push(`${ind(d + 1)}property: ${value.property}`);
      lines.push(`${ind(d)}}`);
      break;
    case "Await":
      lines.push(`${ind(d)}Await {`);
      lines.push(`${ind(d + 1)}value: $${value.value.identifier.id}`);
      lines.push(`${ind(d)}}`);
      break;
    case "GetIterator":
      lines.push(`${ind(d)}GetIterator {`);
      lines.push(
        `${ind(d + 1)}collection: $${value.collection.identifier.id}`
      );
      lines.push(`${ind(d)}}`);
      break;
    case "IteratorNext":
      lines.push(`${ind(d)}IteratorNext {`);
      lines.push(`${ind(d + 1)}iterator: $${value.iterator.identifier.id}`);
      lines.push(
        `${ind(d + 1)}collection: $${value.collection.identifier.id}`
      );
      lines.push(`${ind(d)}}`);
      break;
    case "NextPropertyOf":
      lines.push(`${ind(d)}NextPropertyOf {`);
      lines.push(`${ind(d + 1)}value: $${value.value.identifier.id}`);
      lines.push(`${ind(d)}}`);
      break;
    case "PostfixUpdate":
      lines.push(`${ind(d)}PostfixUpdate {`);
      lines.push(`${ind(d + 1)}lvalue: $${value.lvalue.identifier.id}`);
      lines.push(`${ind(d + 1)}operation: ${value.operation}`);
      lines.push(`${ind(d + 1)}value: $${value.value.identifier.id}`);
      lines.push(`${ind(d)}}`);
      break;
    case "PrefixUpdate":
      lines.push(`${ind(d)}PrefixUpdate {`);
      lines.push(`${ind(d + 1)}lvalue: $${value.lvalue.identifier.id}`);
      lines.push(`${ind(d + 1)}operation: ${value.operation}`);
      lines.push(`${ind(d + 1)}value: $${value.value.identifier.id}`);
      lines.push(`${ind(d)}}`);
      break;
    case "Debugger":
      lines.push(`${ind(d)}Debugger {}`);
      break;
    case "StartMemoize":
      lines.push(`${ind(d)}StartMemoize {`);
      lines.push(`${ind(d + 1)}manualMemoId: ${value.manualMemoId}`);
      lines.push(
        `${ind(d + 1)}deps: ${value.deps != null ? `[${value.deps.length} deps]` : "null"}`
      );
      lines.push(`${ind(d)}}`);
      break;
    case "FinishMemoize":
      lines.push(`${ind(d)}FinishMemoize {`);
      lines.push(`${ind(d + 1)}manualMemoId: ${value.manualMemoId}`);
      lines.push(`${ind(d + 1)}decl: $${value.decl.identifier.id}`);
      lines.push(`${ind(d + 1)}pruned: ${value.pruned === true}`);
      lines.push(`${ind(d)}}`);
      break;
    case "UnsupportedNode":
      lines.push(`${ind(d)}UnsupportedNode {`);
      lines.push(
        `${ind(d + 1)}type: ${value.node != null ? value.node.type : "unknown"}`
      );
      lines.push(`${ind(d)}}`);
      break;
    default:
      lines.push(`${ind(d)}${kind} {}`);
      break;
  }
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Reactive value printing (tree-structured values)
// ---------------------------------------------------------------------------

function printReactiveValue(value, depth, outlinedCollector) {
  const d = depth;
  const lines = [];

  switch (value.kind) {
    case "LogicalExpression":
      lines.push(`${ind(d)}LogicalExpression {`);
      lines.push(`${ind(d + 1)}operator: ${value.operator}`);
      lines.push(`${ind(d + 1)}left:`);
      lines.push(printReactiveValue(value.left, d + 2, outlinedCollector));
      lines.push(`${ind(d + 1)}right:`);
      lines.push(printReactiveValue(value.right, d + 2, outlinedCollector));
      lines.push(`${ind(d + 1)}loc: ${formatLoc(value.loc)}`);
      lines.push(`${ind(d)}}`);
      break;
    case "ConditionalExpression":
      lines.push(`${ind(d)}ConditionalExpression {`);
      lines.push(`${ind(d + 1)}test:`);
      lines.push(printReactiveValue(value.test, d + 2, outlinedCollector));
      lines.push(`${ind(d + 1)}consequent:`);
      lines.push(
        printReactiveValue(value.consequent, d + 2, outlinedCollector)
      );
      lines.push(`${ind(d + 1)}alternate:`);
      lines.push(
        printReactiveValue(value.alternate, d + 2, outlinedCollector)
      );
      lines.push(`${ind(d + 1)}loc: ${formatLoc(value.loc)}`);
      lines.push(`${ind(d)}}`);
      break;
    case "SequenceExpression":
      lines.push(`${ind(d)}SequenceExpression {`);
      lines.push(`${ind(d + 1)}id: ${value.id}`);
      lines.push(`${ind(d + 1)}instructions:`);
      for (const instr of value.instructions) {
        lines.push(printReactiveInstruction(instr, d + 2, outlinedCollector));
      }
      lines.push(`${ind(d + 1)}value:`);
      lines.push(printReactiveValue(value.value, d + 2, outlinedCollector));
      lines.push(`${ind(d + 1)}loc: ${formatLoc(value.loc)}`);
      lines.push(`${ind(d)}}`);
      break;
    case "OptionalExpression":
      lines.push(`${ind(d)}OptionalExpression {`);
      lines.push(`${ind(d + 1)}id: ${value.id}`);
      lines.push(`${ind(d + 1)}optional: ${value.optional}`);
      lines.push(`${ind(d + 1)}value:`);
      lines.push(printReactiveValue(value.value, d + 2, outlinedCollector));
      lines.push(`${ind(d + 1)}loc: ${formatLoc(value.loc)}`);
      lines.push(`${ind(d)}}`);
      break;
    default:
      // Plain InstructionValue
      lines.push(printInstructionValueFields(value, d));
      break;
  }
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Reactive instruction printing
// ---------------------------------------------------------------------------

function printReactiveInstruction(instr, depth, outlinedCollector) {
  const lines = [];
  lines.push(`${ind(depth)}[${instr.id}] ReactiveInstruction {`);
  const d = depth + 1;
  lines.push(`${ind(d)}id: ${instr.id}`);
  // lvalue
  if (instr.lvalue != null) {
    lines.push(`${ind(d)}lvalue:`);
    lines.push(printPlaceInline(instr.lvalue, d + 1));
  } else {
    lines.push(`${ind(d)}lvalue: null`);
  }
  // value
  lines.push(`${ind(d)}value:`);
  lines.push(printReactiveValue(instr.value, d + 1, outlinedCollector));
  // Collect outlined functions
  collectOutlinedFromValue(instr.value, outlinedCollector);
  // effects
  if (instr.effects != null) {
    lines.push(`${ind(d)}effects: [${instr.effects.length} effects]`);
  } else {
    lines.push(`${ind(d)}effects: null`);
  }
  lines.push(`${ind(d)}loc: ${formatLoc(instr.loc)}`);
  lines.push(`${ind(depth)}}`);
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Reactive scope printing
// ---------------------------------------------------------------------------

function printReactiveScopeDetails(scope, depth) {
  const lines = [];
  const d = depth;
  lines.push(`${ind(d)}scope @${scope.id} {`);
  lines.push(`${ind(d + 1)}id: ${scope.id}`);
  lines.push(
    `${ind(d + 1)}range: ${formatMutableRange(scope.range)}`
  );
  // dependencies
  const deps = [...scope.dependencies];
  lines.push(`${ind(d + 1)}dependencies: [${deps.length}]`);
  for (const dep of deps) {
    const path = dep.path
      .map((p) => `${p.optional ? "?." : "."}${p.property}`)
      .join("");
    lines.push(
      `${ind(d + 2)}$${dep.identifier.id}${path} (reactive=${dep.reactive})`
    );
  }
  // declarations
  const decls = [...scope.declarations].sort((a, b) => a[0] - b[0]);
  lines.push(`${ind(d + 1)}declarations: [${decls.length}]`);
  for (const [id, decl] of decls) {
    lines.push(`${ind(d + 2)}$${id}: $${decl.identifier.id}`);
  }
  // reassignments
  const reassigns = [...scope.reassignments];
  lines.push(`${ind(d + 1)}reassignments: [${reassigns.length}]`);
  for (const ident of reassigns) {
    lines.push(`${ind(d + 2)}$${ident.id}`);
  }
  // earlyReturnValue
  if (scope.earlyReturnValue != null) {
    lines.push(`${ind(d + 1)}earlyReturnValue:`);
    lines.push(
      `${ind(d + 2)}value: $${scope.earlyReturnValue.value.id}`
    );
    lines.push(
      `${ind(d + 2)}label: bb${scope.earlyReturnValue.label}`
    );
  } else {
    lines.push(`${ind(d + 1)}earlyReturnValue: null`);
  }
  // merged
  const merged = [...scope.merged];
  if (merged.length > 0) {
    lines.push(
      `${ind(d + 1)}merged: [${merged.map((m) => `@${m}`).join(", ")}]`
    );
  } else {
    lines.push(`${ind(d + 1)}merged: []`);
  }
  lines.push(`${ind(d + 1)}loc: ${formatLoc(scope.loc)}`);
  lines.push(`${ind(d)}}`);
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Reactive terminal printing
// ---------------------------------------------------------------------------

function printReactiveTerminal(terminal, depth, outlinedCollector) {
  const lines = [];
  const d = depth;
  const kind = terminal.kind;

  lines.push(`${ind(d)}${reactiveTerminalName(kind)} {`);
  lines.push(`${ind(d + 1)}id: ${terminal.id}`);

  switch (kind) {
    case "break":
      lines.push(`${ind(d + 1)}target: bb${terminal.target}`);
      lines.push(`${ind(d + 1)}targetKind: ${terminal.targetKind}`);
      break;
    case "continue":
      lines.push(`${ind(d + 1)}target: bb${terminal.target}`);
      lines.push(`${ind(d + 1)}targetKind: ${terminal.targetKind}`);
      break;
    case "return":
      lines.push(`${ind(d + 1)}value:`);
      lines.push(printPlaceInline(terminal.value, d + 2));
      break;
    case "throw":
      lines.push(`${ind(d + 1)}value:`);
      lines.push(printPlaceInline(terminal.value, d + 2));
      break;
    case "if":
      lines.push(`${ind(d + 1)}test:`);
      lines.push(printPlaceInline(terminal.test, d + 2));
      lines.push(`${ind(d + 1)}consequent:`);
      lines.push(
        printReactiveBlock(terminal.consequent, d + 2, outlinedCollector)
      );
      if (terminal.alternate != null) {
        lines.push(`${ind(d + 1)}alternate:`);
        lines.push(
          printReactiveBlock(terminal.alternate, d + 2, outlinedCollector)
        );
      } else {
        lines.push(`${ind(d + 1)}alternate: null`);
      }
      break;
    case "switch":
      lines.push(`${ind(d + 1)}test:`);
      lines.push(printPlaceInline(terminal.test, d + 2));
      lines.push(`${ind(d + 1)}cases:`);
      for (const c of terminal.cases) {
        if (c.test != null) {
          lines.push(`${ind(d + 2)}case $${c.test.identifier.id}:`);
        } else {
          lines.push(`${ind(d + 2)}default:`);
        }
        if (c.block != null) {
          lines.push(printReactiveBlock(c.block, d + 3, outlinedCollector));
        } else {
          lines.push(`${ind(d + 3)}(empty)`);
        }
      }
      break;
    case "do-while":
      lines.push(`${ind(d + 1)}loop:`);
      lines.push(
        printReactiveBlock(terminal.loop, d + 2, outlinedCollector)
      );
      lines.push(`${ind(d + 1)}test:`);
      lines.push(
        printReactiveValue(terminal.test, d + 2, outlinedCollector)
      );
      break;
    case "while":
      lines.push(`${ind(d + 1)}test:`);
      lines.push(
        printReactiveValue(terminal.test, d + 2, outlinedCollector)
      );
      lines.push(`${ind(d + 1)}loop:`);
      lines.push(
        printReactiveBlock(terminal.loop, d + 2, outlinedCollector)
      );
      break;
    case "for":
      lines.push(`${ind(d + 1)}init:`);
      lines.push(
        printReactiveValue(terminal.init, d + 2, outlinedCollector)
      );
      lines.push(`${ind(d + 1)}test:`);
      lines.push(
        printReactiveValue(terminal.test, d + 2, outlinedCollector)
      );
      if (terminal.update != null) {
        lines.push(`${ind(d + 1)}update:`);
        lines.push(
          printReactiveValue(terminal.update, d + 2, outlinedCollector)
        );
      } else {
        lines.push(`${ind(d + 1)}update: null`);
      }
      lines.push(`${ind(d + 1)}loop:`);
      lines.push(
        printReactiveBlock(terminal.loop, d + 2, outlinedCollector)
      );
      break;
    case "for-of":
      lines.push(`${ind(d + 1)}init:`);
      lines.push(
        printReactiveValue(terminal.init, d + 2, outlinedCollector)
      );
      lines.push(`${ind(d + 1)}test:`);
      lines.push(
        printReactiveValue(terminal.test, d + 2, outlinedCollector)
      );
      lines.push(`${ind(d + 1)}loop:`);
      lines.push(
        printReactiveBlock(terminal.loop, d + 2, outlinedCollector)
      );
      break;
    case "for-in":
      lines.push(`${ind(d + 1)}init:`);
      lines.push(
        printReactiveValue(terminal.init, d + 2, outlinedCollector)
      );
      lines.push(`${ind(d + 1)}loop:`);
      lines.push(
        printReactiveBlock(terminal.loop, d + 2, outlinedCollector)
      );
      break;
    case "label":
      lines.push(`${ind(d + 1)}block:`);
      lines.push(
        printReactiveBlock(terminal.block, d + 2, outlinedCollector)
      );
      break;
    case "try":
      lines.push(`${ind(d + 1)}block:`);
      lines.push(
        printReactiveBlock(terminal.block, d + 2, outlinedCollector)
      );
      if (terminal.handlerBinding != null) {
        lines.push(`${ind(d + 1)}handlerBinding:`);
        lines.push(printPlaceInline(terminal.handlerBinding, d + 2));
      } else {
        lines.push(`${ind(d + 1)}handlerBinding: null`);
      }
      lines.push(`${ind(d + 1)}handler:`);
      lines.push(
        printReactiveBlock(terminal.handler, d + 2, outlinedCollector)
      );
      break;
    default:
      break;
  }

  lines.push(`${ind(d + 1)}loc: ${formatLoc(terminal.loc)}`);
  lines.push(`${ind(d)}}`);
  return lines.join("\n");
}

function reactiveTerminalName(kind) {
  const names = {
    break: "Break",
    continue: "Continue",
    return: "Return",
    throw: "Throw",
    if: "If",
    switch: "Switch",
    "do-while": "DoWhile",
    while: "While",
    for: "For",
    "for-of": "ForOf",
    "for-in": "ForIn",
    label: "Label",
    try: "Try",
  };
  return names[kind] ?? kind;
}

// ---------------------------------------------------------------------------
// Reactive block printing (array of ReactiveStatements)
// ---------------------------------------------------------------------------

function printReactiveBlock(block, depth, outlinedCollector) {
  if (block == null || block.length === 0) {
    return `${ind(depth)}(empty block)`;
  }
  const lines = [];
  for (const stmt of block) {
    lines.push(printReactiveStatement(stmt, depth, outlinedCollector));
  }
  return lines.join("\n");
}

function printReactiveStatement(stmt, depth, outlinedCollector) {
  const lines = [];
  const d = depth;

  switch (stmt.kind) {
    case "instruction":
      lines.push(
        printReactiveInstruction(stmt.instruction, d, outlinedCollector)
      );
      break;
    case "scope":
      lines.push(`${ind(d)}ReactiveScopeBlock {`);
      lines.push(printReactiveScopeDetails(stmt.scope, d + 1));
      lines.push(`${ind(d + 1)}instructions:`);
      lines.push(
        printReactiveBlock(stmt.instructions, d + 2, outlinedCollector)
      );
      lines.push(`${ind(d)}}`);
      break;
    case "pruned-scope":
      lines.push(`${ind(d)}PrunedReactiveScopeBlock {`);
      lines.push(printReactiveScopeDetails(stmt.scope, d + 1));
      lines.push(`${ind(d + 1)}instructions:`);
      lines.push(
        printReactiveBlock(stmt.instructions, d + 2, outlinedCollector)
      );
      lines.push(`${ind(d)}}`);
      break;
    case "terminal":
      if (stmt.label != null) {
        lines.push(
          `${ind(d)}label bb${stmt.label.id} (implicit=${stmt.label.implicit}):`
        );
      }
      lines.push(
        printReactiveTerminal(stmt.terminal, d, outlinedCollector)
      );
      break;
    default:
      lines.push(`${ind(d)}Unknown statement kind: ${stmt.kind}`);
      break;
  }

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Collect outlined functions from reactive values
// ---------------------------------------------------------------------------

function collectOutlinedFromValue(value, collector) {
  if (value == null) return;
  if (
    value.kind === "FunctionExpression" ||
    value.kind === "ObjectMethod"
  ) {
    // The loweredFunc in reactive context points to an HIRFunction
    // which in turn has a reactive body after BuildReactiveFunction.
    // But outlined functions are collected from env, so we just track
    // them for the main function printer.
  }
  // For reactive compound values, recurse
  if (value.kind === "SequenceExpression") {
    for (const instr of value.instructions) {
      collectOutlinedFromValue(instr.value, collector);
    }
    collectOutlinedFromValue(value.value, collector);
  } else if (value.kind === "LogicalExpression") {
    collectOutlinedFromValue(value.left, collector);
    collectOutlinedFromValue(value.right, collector);
  } else if (value.kind === "ConditionalExpression") {
    collectOutlinedFromValue(value.test, collector);
    collectOutlinedFromValue(value.consequent, collector);
    collectOutlinedFromValue(value.alternate, collector);
  } else if (value.kind === "OptionalExpression") {
    collectOutlinedFromValue(value.value, collector);
  }
}

// ---------------------------------------------------------------------------
// Main function printer
// ---------------------------------------------------------------------------

function printReactiveFunction(fn, functionIndex, outlinedCollector) {
  const lines = [];
  const d0 = 0;
  const d1 = 1;
  const d2 = 2;

  lines.push(`${ind(d0)}ReactiveFunction #${functionIndex}:`);

  // id
  lines.push(
    `${ind(d1)}id: ${fn.id != null ? JSON.stringify(fn.id) : "null"}`
  );

  // nameHint
  lines.push(
    `${ind(d1)}nameHint: ${fn.nameHint != null ? JSON.stringify(fn.nameHint) : "null"}`
  );

  // params
  lines.push(`${ind(d1)}params:`);
  for (let i = 0; i < fn.params.length; i++) {
    const param = fn.params[i];
    if (param.kind === "Identifier") {
      lines.push(`${ind(d2)}[${i}]`);
      lines.push(printPlaceInline(param, d2 + 1));
    } else {
      lines.push(`${ind(d2)}[${i}] ...`);
      lines.push(printPlaceInline(param.place, d2 + 1));
    }
  }

  // generator / async
  lines.push(`${ind(d1)}generator: ${fn.generator}`);
  lines.push(`${ind(d1)}async: ${fn.async}`);

  // directives
  if (fn.directives.length > 0) {
    lines.push(
      `${ind(d1)}directives: [${fn.directives.map((d) => JSON.stringify(d)).join(", ")}]`
    );
  } else {
    lines.push(`${ind(d1)}directives: []`);
  }

  // loc
  lines.push(`${ind(d1)}loc: ${formatLoc(fn.loc)}`);

  // body
  lines.push("");
  lines.push(`${ind(d1)}body:`);
  lines.push(printReactiveBlock(fn.body, d2, outlinedCollector));

  // Outlined functions from env
  if (fn.env != null && typeof fn.env.getOutlinedFunctions === "function") {
    const outlinedFns = fn.env.getOutlinedFunctions();
    for (const outlined of outlinedFns) {
      outlinedCollector.push(outlined.fn);
    }
  }

  return lines.join("\n");
}
