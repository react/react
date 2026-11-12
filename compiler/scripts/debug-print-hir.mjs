/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * Debug HIR printer for the Rust port testing infrastructure.
 *
 * Custom printer that walks the HIRFunction structure and prints every field
 * of every identifier, instruction, terminal, and block. Also includes
 * outlined functions (from FunctionExpression instruction values).
 *
 * This does NOT delegate to printFunctionWithOutlined() — it is a standalone
 * walker that produces a detailed, deterministic representation suitable for
 * cross-compiler comparison between the TS and Rust implementations.
 *
 * @param {Function} _printFunctionWithOutlined - Unused (kept for API compat)
 * @param {object} hirFunction - The HIRFunction to print
 * @returns {string} The debug representation
 */
export function debugPrintHIR(_printFunctionWithOutlined, hirFunction) {
  const outlined = [];
  const result = printHIRFunction(hirFunction, 0, outlined);
  const parts = [result];
  for (let i = 0; i < outlined.length; i++) {
    parts.push(printHIRFunction(outlined[i], i + 1, outlined));
  }
  return parts.join("\n\n");
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function indent(depth) {
  return "  ".repeat(depth);
}

function formatLoc(loc) {
  if (loc == null || typeof loc === "symbol") {
    return "generated";
  }
  return `${loc.start.line}:${loc.start.column}-${loc.end.line}:${loc.end.column}`;
}

function formatEffect(effect) {
  // Effect enum values in the TS compiler are lowercase strings like
  // "read", "mutate", "<unknown>", etc.
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
    `${indent(depth)}Place {`,
    `${indent(depth + 1)}identifier: $${id.id}`,
    `${indent(depth + 1)}effect: ${formatEffect(place.effect)}`,
    `${indent(depth + 1)}reactive: ${place.reactive}`,
    `${indent(depth + 1)}loc: ${formatLoc(place.loc)}`,
    `${indent(depth)}}`,
  ].join("\n");
}

// ---------------------------------------------------------------------------
// Identifier printing
// ---------------------------------------------------------------------------

function printIdentifierEntry(identifier, depth) {
  return [
    `${indent(depth)}$${identifier.id}: Identifier {`,
    `${indent(depth + 1)}id: ${identifier.id}`,
    `${indent(depth + 1)}declarationId: ${formatDeclarationId(identifier.declarationId)}`,
    `${indent(depth + 1)}name: ${formatIdentifierName(identifier.name)}`,
    `${indent(depth + 1)}mutableRange: ${formatMutableRange(identifier.mutableRange)}`,
    `${indent(depth + 1)}scope: ${formatScopeId(identifier.scope)}`,
    `${indent(depth + 1)}type: ${formatType(identifier.type)}`,
    `${indent(depth + 1)}loc: ${formatLoc(identifier.loc)}`,
    `${indent(depth)}}`,
  ].join("\n");
}

// ---------------------------------------------------------------------------
// InstructionValue printing
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

function printPlaceOrSpread(ps) {
  if (ps.kind === "Identifier") return `$${ps.identifier.id}`;
  if (ps.kind === "Spread") return `...$${ps.place.identifier.id}`;
  return "<hole>";
}

function printInstructionValueFields(value, depth) {
  const d = depth;
  const lines = [];
  const kind = value.kind;

  switch (kind) {
    case "LoadLocal":
      lines.push(`${indent(d)}LoadLocal {`);
      lines.push(`${indent(d + 1)}place: $${value.place.identifier.id}`);
      lines.push(`${indent(d)}}`);
      break;
    case "LoadContext":
      lines.push(`${indent(d)}LoadContext {`);
      lines.push(`${indent(d + 1)}place: $${value.place.identifier.id}`);
      lines.push(`${indent(d)}}`);
      break;
    case "DeclareLocal":
      lines.push(`${indent(d)}DeclareLocal {`);
      lines.push(`${indent(d + 1)}lvalue.kind: ${value.lvalue.kind}`);
      lines.push(
        `${indent(d + 1)}lvalue.place: $${value.lvalue.place.identifier.id}`
      );
      lines.push(`${indent(d)}}`);
      break;
    case "DeclareContext":
      lines.push(`${indent(d)}DeclareContext {`);
      lines.push(`${indent(d + 1)}lvalue.kind: ${value.lvalue.kind}`);
      lines.push(
        `${indent(d + 1)}lvalue.place: $${value.lvalue.place.identifier.id}`
      );
      lines.push(`${indent(d)}}`);
      break;
    case "StoreLocal":
      lines.push(`${indent(d)}StoreLocal {`);
      lines.push(`${indent(d + 1)}lvalue.kind: ${value.lvalue.kind}`);
      lines.push(
        `${indent(d + 1)}lvalue.place: $${value.lvalue.place.identifier.id}`
      );
      lines.push(`${indent(d + 1)}value: $${value.value.identifier.id}`);
      lines.push(`${indent(d)}}`);
      break;
    case "StoreContext":
      lines.push(`${indent(d)}StoreContext {`);
      lines.push(`${indent(d + 1)}lvalue.kind: ${value.lvalue.kind}`);
      lines.push(
        `${indent(d + 1)}lvalue.place: $${value.lvalue.place.identifier.id}`
      );
      lines.push(`${indent(d + 1)}value: $${value.value.identifier.id}`);
      lines.push(`${indent(d)}}`);
      break;
    case "Destructure":
      lines.push(`${indent(d)}Destructure {`);
      lines.push(`${indent(d + 1)}lvalue.kind: ${value.lvalue.kind}`);
      lines.push(
        `${indent(d + 1)}lvalue.pattern: ${printPattern(value.lvalue.pattern)}`
      );
      lines.push(`${indent(d + 1)}value: $${value.value.identifier.id}`);
      lines.push(`${indent(d)}}`);
      break;
    case "Primitive":
      lines.push(`${indent(d)}Primitive {`);
      lines.push(
        `${indent(d + 1)}value: ${value.value === undefined ? "undefined" : JSON.stringify(value.value)}`
      );
      lines.push(`${indent(d)}}`);
      break;
    case "JSXText":
      lines.push(`${indent(d)}JSXText {`);
      lines.push(`${indent(d + 1)}value: ${JSON.stringify(value.value)}`);
      lines.push(`${indent(d)}}`);
      break;
    case "BinaryExpression":
      lines.push(`${indent(d)}BinaryExpression {`);
      lines.push(`${indent(d + 1)}operator: ${value.operator}`);
      lines.push(`${indent(d + 1)}left: $${value.left.identifier.id}`);
      lines.push(`${indent(d + 1)}right: $${value.right.identifier.id}`);
      lines.push(`${indent(d)}}`);
      break;
    case "UnaryExpression":
      lines.push(`${indent(d)}UnaryExpression {`);
      lines.push(`${indent(d + 1)}operator: ${value.operator}`);
      lines.push(`${indent(d + 1)}value: $${value.value.identifier.id}`);
      lines.push(`${indent(d)}}`);
      break;
    case "CallExpression":
      lines.push(`${indent(d)}CallExpression {`);
      lines.push(`${indent(d + 1)}callee: $${value.callee.identifier.id}`);
      lines.push(
        `${indent(d + 1)}args: [${value.args.map(printPlaceOrSpread).join(", ")}]`
      );
      lines.push(`${indent(d)}}`);
      break;
    case "MethodCall":
      lines.push(`${indent(d)}MethodCall {`);
      lines.push(
        `${indent(d + 1)}receiver: $${value.receiver.identifier.id}`
      );
      lines.push(
        `${indent(d + 1)}property: $${value.property.identifier.id}`
      );
      lines.push(
        `${indent(d + 1)}args: [${value.args.map(printPlaceOrSpread).join(", ")}]`
      );
      lines.push(`${indent(d)}}`);
      break;
    case "NewExpression":
      lines.push(`${indent(d)}NewExpression {`);
      lines.push(`${indent(d + 1)}callee: $${value.callee.identifier.id}`);
      lines.push(
        `${indent(d + 1)}args: [${value.args.map(printPlaceOrSpread).join(", ")}]`
      );
      lines.push(`${indent(d)}}`);
      break;
    case "ObjectExpression":
      lines.push(`${indent(d)}ObjectExpression {`);
      if (value.properties != null) {
        lines.push(`${indent(d + 1)}properties:`);
        for (const prop of value.properties) {
          if (prop.kind === "ObjectProperty") {
            lines.push(
              `${indent(d + 2)}${printObjectPropertyKey(prop.key)}: $${prop.place.identifier.id}`
            );
          } else {
            lines.push(`${indent(d + 2)}...$${prop.place.identifier.id}`);
          }
        }
      } else {
        lines.push(`${indent(d + 1)}properties: null`);
      }
      lines.push(`${indent(d)}}`);
      break;
    case "ArrayExpression":
      lines.push(`${indent(d)}ArrayExpression {`);
      lines.push(
        `${indent(d + 1)}elements: [${value.elements.map((e) => (e.kind === "Hole" ? "<hole>" : e.kind === "Spread" ? `...$${e.place.identifier.id}` : `$${e.identifier.id}`)).join(", ")}]`
      );
      lines.push(`${indent(d)}}`);
      break;
    case "PropertyLoad":
      lines.push(`${indent(d)}PropertyLoad {`);
      lines.push(`${indent(d + 1)}object: $${value.object.identifier.id}`);
      lines.push(`${indent(d + 1)}property: ${value.property}`);
      lines.push(`${indent(d)}}`);
      break;
    case "PropertyStore":
      lines.push(`${indent(d)}PropertyStore {`);
      lines.push(`${indent(d + 1)}object: $${value.object.identifier.id}`);
      lines.push(`${indent(d + 1)}property: ${value.property}`);
      lines.push(`${indent(d + 1)}value: $${value.value.identifier.id}`);
      lines.push(`${indent(d)}}`);
      break;
    case "PropertyDelete":
      lines.push(`${indent(d)}PropertyDelete {`);
      lines.push(`${indent(d + 1)}object: $${value.object.identifier.id}`);
      lines.push(`${indent(d + 1)}property: ${value.property}`);
      lines.push(`${indent(d)}}`);
      break;
    case "ComputedLoad":
      lines.push(`${indent(d)}ComputedLoad {`);
      lines.push(`${indent(d + 1)}object: $${value.object.identifier.id}`);
      lines.push(
        `${indent(d + 1)}property: $${value.property.identifier.id}`
      );
      lines.push(`${indent(d)}}`);
      break;
    case "ComputedStore":
      lines.push(`${indent(d)}ComputedStore {`);
      lines.push(`${indent(d + 1)}object: $${value.object.identifier.id}`);
      lines.push(
        `${indent(d + 1)}property: $${value.property.identifier.id}`
      );
      lines.push(`${indent(d + 1)}value: $${value.value.identifier.id}`);
      lines.push(`${indent(d)}}`);
      break;
    case "ComputedDelete":
      lines.push(`${indent(d)}ComputedDelete {`);
      lines.push(`${indent(d + 1)}object: $${value.object.identifier.id}`);
      lines.push(
        `${indent(d + 1)}property: $${value.property.identifier.id}`
      );
      lines.push(`${indent(d)}}`);
      break;
    case "LoadGlobal": {
      lines.push(`${indent(d)}LoadGlobal {`);
      const b = value.binding;
      lines.push(`${indent(d + 1)}binding.kind: ${b.kind}`);
      lines.push(`${indent(d + 1)}binding.name: ${b.name}`);
      if (b.module != null) {
        lines.push(`${indent(d + 1)}binding.module: ${b.module}`);
      }
      if (b.imported != null) {
        lines.push(`${indent(d + 1)}binding.imported: ${b.imported}`);
      }
      lines.push(`${indent(d)}}`);
      break;
    }
    case "StoreGlobal":
      lines.push(`${indent(d)}StoreGlobal {`);
      lines.push(`${indent(d + 1)}name: ${value.name}`);
      lines.push(`${indent(d + 1)}value: $${value.value.identifier.id}`);
      lines.push(`${indent(d)}}`);
      break;
    case "TypeCastExpression":
      lines.push(`${indent(d)}TypeCastExpression {`);
      lines.push(`${indent(d + 1)}value: $${value.value.identifier.id}`);
      lines.push(`${indent(d + 1)}type: ${formatType(value.type)}`);
      lines.push(`${indent(d)}}`);
      break;
    case "JsxExpression": {
      lines.push(`${indent(d)}JsxExpression {`);
      if (value.tag.kind === "Identifier") {
        lines.push(`${indent(d + 1)}tag: $${value.tag.identifier.id}`);
      } else {
        lines.push(`${indent(d + 1)}tag: "${value.tag.name}"`);
      }
      lines.push(`${indent(d + 1)}props:`);
      for (const attr of value.props) {
        if (attr.kind === "JsxAttribute") {
          lines.push(
            `${indent(d + 2)}${attr.name}: $${attr.place.identifier.id}`
          );
        } else {
          lines.push(
            `${indent(d + 2)}...$${attr.argument.identifier.id}`
          );
        }
      }
      if (value.children != null) {
        lines.push(
          `${indent(d + 1)}children: [${value.children.map((c) => `$${c.identifier.id}`).join(", ")}]`
        );
      } else {
        lines.push(`${indent(d + 1)}children: null`);
      }
      lines.push(`${indent(d)}}`);
      break;
    }
    case "JsxFragment":
      lines.push(`${indent(d)}JsxFragment {`);
      lines.push(
        `${indent(d + 1)}children: [${value.children.map((c) => `$${c.identifier.id}`).join(", ")}]`
      );
      lines.push(`${indent(d)}}`);
      break;
    case "FunctionExpression":
    case "ObjectMethod": {
      const label =
        kind === "FunctionExpression" ? "FunctionExpression" : "ObjectMethod";
      lines.push(`${indent(d)}${label} {`);
      if (kind === "FunctionExpression") {
        lines.push(
          `${indent(d + 1)}name: ${value.name != null ? JSON.stringify(value.name) : "null"}`
        );
      }
      lines.push(
        `${indent(d + 1)}loweredFunc.id: ${value.loweredFunc.func.id ?? "null"}`
      );
      // context
      const ctx = value.loweredFunc.func.context;
      lines.push(
        `${indent(d + 1)}context: [${ctx.map((c) => `$${c.identifier.id}`).join(", ")}]`
      );
      // aliasing effects
      const ae = value.loweredFunc.func.aliasingEffects;
      lines.push(
        `${indent(d + 1)}aliasingEffects: ${ae != null ? `[${ae.length} effects]` : "null"}`
      );
      lines.push(`${indent(d)}}`);
      break;
    }
    case "TaggedTemplateExpression":
      lines.push(`${indent(d)}TaggedTemplateExpression {`);
      lines.push(`${indent(d + 1)}tag: $${value.tag.identifier.id}`);
      lines.push(`${indent(d + 1)}value.raw: ${JSON.stringify(value.value.raw)}`);
      lines.push(`${indent(d)}}`);
      break;
    case "TemplateLiteral":
      lines.push(`${indent(d)}TemplateLiteral {`);
      lines.push(
        `${indent(d + 1)}quasis: [${value.quasis.map((q) => JSON.stringify(q.raw)).join(", ")}]`
      );
      lines.push(
        `${indent(d + 1)}subexprs: [${value.subexprs.map((s) => `$${s.identifier.id}`).join(", ")}]`
      );
      lines.push(`${indent(d)}}`);
      break;
    case "RegExpLiteral":
      lines.push(`${indent(d)}RegExpLiteral {`);
      lines.push(`${indent(d + 1)}pattern: ${value.pattern}`);
      lines.push(`${indent(d + 1)}flags: ${value.flags}`);
      lines.push(`${indent(d)}}`);
      break;
    case "MetaProperty":
      lines.push(`${indent(d)}MetaProperty {`);
      lines.push(`${indent(d + 1)}meta: ${value.meta}`);
      lines.push(`${indent(d + 1)}property: ${value.property}`);
      lines.push(`${indent(d)}}`);
      break;
    case "Await":
      lines.push(`${indent(d)}Await {`);
      lines.push(`${indent(d + 1)}value: $${value.value.identifier.id}`);
      lines.push(`${indent(d)}}`);
      break;
    case "GetIterator":
      lines.push(`${indent(d)}GetIterator {`);
      lines.push(
        `${indent(d + 1)}collection: $${value.collection.identifier.id}`
      );
      lines.push(`${indent(d)}}`);
      break;
    case "IteratorNext":
      lines.push(`${indent(d)}IteratorNext {`);
      lines.push(
        `${indent(d + 1)}iterator: $${value.iterator.identifier.id}`
      );
      lines.push(
        `${indent(d + 1)}collection: $${value.collection.identifier.id}`
      );
      lines.push(`${indent(d)}}`);
      break;
    case "NextPropertyOf":
      lines.push(`${indent(d)}NextPropertyOf {`);
      lines.push(`${indent(d + 1)}value: $${value.value.identifier.id}`);
      lines.push(`${indent(d)}}`);
      break;
    case "PostfixUpdate":
      lines.push(`${indent(d)}PostfixUpdate {`);
      lines.push(`${indent(d + 1)}lvalue: $${value.lvalue.identifier.id}`);
      lines.push(`${indent(d + 1)}operation: ${value.operation}`);
      lines.push(`${indent(d + 1)}value: $${value.value.identifier.id}`);
      lines.push(`${indent(d)}}`);
      break;
    case "PrefixUpdate":
      lines.push(`${indent(d)}PrefixUpdate {`);
      lines.push(`${indent(d + 1)}lvalue: $${value.lvalue.identifier.id}`);
      lines.push(`${indent(d + 1)}operation: ${value.operation}`);
      lines.push(`${indent(d + 1)}value: $${value.value.identifier.id}`);
      lines.push(`${indent(d)}}`);
      break;
    case "Debugger":
      lines.push(`${indent(d)}Debugger {}`);
      break;
    case "StartMemoize":
      lines.push(`${indent(d)}StartMemoize {`);
      lines.push(`${indent(d + 1)}manualMemoId: ${value.manualMemoId}`);
      lines.push(`${indent(d + 1)}deps: ${value.deps != null ? `[${value.deps.length} deps]` : "null"}`);
      lines.push(`${indent(d)}}`);
      break;
    case "FinishMemoize":
      lines.push(`${indent(d)}FinishMemoize {`);
      lines.push(`${indent(d + 1)}manualMemoId: ${value.manualMemoId}`);
      lines.push(`${indent(d + 1)}decl: $${value.decl.identifier.id}`);
      lines.push(`${indent(d + 1)}pruned: ${value.pruned === true}`);
      lines.push(`${indent(d)}}`);
      break;
    case "UnsupportedNode":
      lines.push(`${indent(d)}UnsupportedNode {`);
      lines.push(
        `${indent(d + 1)}type: ${value.node != null ? value.node.type : "unknown"}`
      );
      lines.push(`${indent(d)}}`);
      break;
    // Reactive-only value types that may appear:
    case "LogicalExpression":
      lines.push(`${indent(d)}LogicalExpression {`);
      lines.push(`${indent(d + 1)}operator: ${value.operator}`);
      lines.push(`${indent(d)}}`);
      break;
    case "ConditionalExpression":
      lines.push(`${indent(d)}ConditionalExpression {}`);
      break;
    case "SequenceExpression":
      lines.push(`${indent(d)}SequenceExpression {}`);
      break;
    case "OptionalExpression":
      lines.push(`${indent(d)}OptionalExpression {`);
      lines.push(`${indent(d + 1)}optional: ${value.optional}`);
      lines.push(`${indent(d)}}`);
      break;
    default:
      lines.push(`${indent(d)}${kind} {}`);
      break;
  }
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Instruction printing
// ---------------------------------------------------------------------------

function printInstruction(instr, depth) {
  const lines = [];
  lines.push(`${indent(depth)}[${instr.id}] Instruction {`);
  const d = depth + 1;
  lines.push(`${indent(d)}id: ${instr.id}`);
  // lvalue
  lines.push(`${indent(d)}lvalue:`);
  lines.push(printPlaceInline(instr.lvalue, d + 1));
  // value
  lines.push(`${indent(d)}value:`);
  lines.push(printInstructionValueFields(instr.value, d + 1));
  // effects
  if (instr.effects != null) {
    lines.push(`${indent(d)}effects: [${instr.effects.length} effects]`);
  } else {
    lines.push(`${indent(d)}effects: null`);
  }
  lines.push(`${indent(d)}loc: ${formatLoc(instr.loc)}`);
  lines.push(`${indent(depth)}}`);
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Terminal printing
// ---------------------------------------------------------------------------

function printTerminal(terminal, depth) {
  const lines = [];
  const d = depth;
  const kind = terminal.kind;
  lines.push(`${indent(d)}${terminalName(kind)} {`);
  lines.push(`${indent(d + 1)}id: ${terminal.id}`);

  switch (kind) {
    case "if":
      lines.push(`${indent(d + 1)}test:`);
      lines.push(printPlaceInline(terminal.test, d + 2));
      lines.push(`${indent(d + 1)}consequent: bb${terminal.consequent}`);
      lines.push(`${indent(d + 1)}alternate: bb${terminal.alternate}`);
      lines.push(
        `${indent(d + 1)}fallthrough: ${terminal.fallthrough != null ? `bb${terminal.fallthrough}` : "null"}`
      );
      break;
    case "branch":
      lines.push(`${indent(d + 1)}test:`);
      lines.push(printPlaceInline(terminal.test, d + 2));
      lines.push(`${indent(d + 1)}consequent: bb${terminal.consequent}`);
      lines.push(`${indent(d + 1)}alternate: bb${terminal.alternate}`);
      lines.push(`${indent(d + 1)}fallthrough: bb${terminal.fallthrough}`);
      break;
    case "return":
      lines.push(`${indent(d + 1)}returnVariant: ${terminal.returnVariant}`);
      lines.push(`${indent(d + 1)}value:`);
      lines.push(printPlaceInline(terminal.value, d + 2));
      if (terminal.effects != null) {
        lines.push(
          `${indent(d + 1)}effects: [${terminal.effects.length} effects]`
        );
      } else {
        lines.push(`${indent(d + 1)}effects: null`);
      }
      break;
    case "throw":
      lines.push(`${indent(d + 1)}value:`);
      lines.push(printPlaceInline(terminal.value, d + 2));
      break;
    case "goto":
      lines.push(`${indent(d + 1)}block: bb${terminal.block}`);
      lines.push(`${indent(d + 1)}variant: ${terminal.variant}`);
      break;
    case "switch":
      lines.push(`${indent(d + 1)}test:`);
      lines.push(printPlaceInline(terminal.test, d + 2));
      lines.push(`${indent(d + 1)}cases:`);
      for (const c of terminal.cases) {
        if (c.test != null) {
          lines.push(`${indent(d + 2)}case $${c.test.identifier.id}: bb${c.block}`);
        } else {
          lines.push(`${indent(d + 2)}default: bb${c.block}`);
        }
      }
      lines.push(
        `${indent(d + 1)}fallthrough: ${terminal.fallthrough != null ? `bb${terminal.fallthrough}` : "null"}`
      );
      break;
    case "do-while":
      lines.push(`${indent(d + 1)}loop: bb${terminal.loop}`);
      lines.push(`${indent(d + 1)}test: bb${terminal.test}`);
      lines.push(`${indent(d + 1)}fallthrough: bb${terminal.fallthrough}`);
      break;
    case "while":
      lines.push(`${indent(d + 1)}test: bb${terminal.test}`);
      lines.push(
        `${indent(d + 1)}loop: ${terminal.loop != null ? `bb${terminal.loop}` : "null"}`
      );
      lines.push(
        `${indent(d + 1)}fallthrough: ${terminal.fallthrough != null ? `bb${terminal.fallthrough}` : "null"}`
      );
      break;
    case "for":
      lines.push(`${indent(d + 1)}init: bb${terminal.init}`);
      lines.push(`${indent(d + 1)}test: bb${terminal.test}`);
      lines.push(
        `${indent(d + 1)}update: ${terminal.update != null ? `bb${terminal.update}` : "null"}`
      );
      lines.push(`${indent(d + 1)}loop: bb${terminal.loop}`);
      lines.push(`${indent(d + 1)}fallthrough: bb${terminal.fallthrough}`);
      break;
    case "for-of":
      lines.push(`${indent(d + 1)}init: bb${terminal.init}`);
      lines.push(`${indent(d + 1)}test: bb${terminal.test}`);
      lines.push(`${indent(d + 1)}loop: bb${terminal.loop}`);
      lines.push(`${indent(d + 1)}fallthrough: bb${terminal.fallthrough}`);
      break;
    case "for-in":
      lines.push(`${indent(d + 1)}init: bb${terminal.init}`);
      lines.push(`${indent(d + 1)}loop: bb${terminal.loop}`);
      lines.push(`${indent(d + 1)}fallthrough: bb${terminal.fallthrough}`);
      break;
    case "logical":
      lines.push(`${indent(d + 1)}operator: ${terminal.operator}`);
      lines.push(`${indent(d + 1)}test: bb${terminal.test}`);
      lines.push(`${indent(d + 1)}fallthrough: bb${terminal.fallthrough}`);
      break;
    case "ternary":
      lines.push(`${indent(d + 1)}test: bb${terminal.test}`);
      lines.push(`${indent(d + 1)}fallthrough: bb${terminal.fallthrough}`);
      break;
    case "optional":
      lines.push(`${indent(d + 1)}optional: ${terminal.optional}`);
      lines.push(`${indent(d + 1)}test: bb${terminal.test}`);
      lines.push(`${indent(d + 1)}fallthrough: bb${terminal.fallthrough}`);
      break;
    case "label":
      lines.push(`${indent(d + 1)}block: bb${terminal.block}`);
      lines.push(
        `${indent(d + 1)}fallthrough: ${terminal.fallthrough != null ? `bb${terminal.fallthrough}` : "null"}`
      );
      break;
    case "sequence":
      lines.push(`${indent(d + 1)}block: bb${terminal.block}`);
      lines.push(`${indent(d + 1)}fallthrough: bb${terminal.fallthrough}`);
      break;
    case "maybe-throw":
      lines.push(`${indent(d + 1)}continuation: bb${terminal.continuation}`);
      lines.push(
        `${indent(d + 1)}handler: ${terminal.handler != null ? `bb${terminal.handler}` : "null"}`
      );
      if (terminal.effects != null) {
        lines.push(
          `${indent(d + 1)}effects: [${terminal.effects.length} effects]`
        );
      } else {
        lines.push(`${indent(d + 1)}effects: null`);
      }
      break;
    case "try":
      lines.push(`${indent(d + 1)}block: bb${terminal.block}`);
      if (terminal.handlerBinding != null) {
        lines.push(`${indent(d + 1)}handlerBinding:`);
        lines.push(printPlaceInline(terminal.handlerBinding, d + 2));
      } else {
        lines.push(`${indent(d + 1)}handlerBinding: null`);
      }
      lines.push(`${indent(d + 1)}handler: bb${terminal.handler}`);
      lines.push(
        `${indent(d + 1)}fallthrough: ${terminal.fallthrough != null ? `bb${terminal.fallthrough}` : "null"}`
      );
      break;
    case "scope":
      lines.push(`${indent(d + 1)}scope: @${terminal.scope.id}`);
      lines.push(`${indent(d + 1)}block: bb${terminal.block}`);
      lines.push(`${indent(d + 1)}fallthrough: bb${terminal.fallthrough}`);
      break;
    case "pruned-scope":
      lines.push(`${indent(d + 1)}scope: @${terminal.scope.id}`);
      lines.push(`${indent(d + 1)}block: bb${terminal.block}`);
      lines.push(`${indent(d + 1)}fallthrough: bb${terminal.fallthrough}`);
      break;
    case "unreachable":
      break;
    case "unsupported":
      break;
    default:
      break;
  }

  lines.push(`${indent(d + 1)}loc: ${formatLoc(terminal.loc)}`);
  lines.push(`${indent(d)}}`);
  return lines.join("\n");
}

function terminalName(kind) {
  const names = {
    if: "If",
    branch: "Branch",
    return: "Return",
    throw: "Throw",
    goto: "Goto",
    switch: "Switch",
    "do-while": "DoWhile",
    while: "While",
    for: "For",
    "for-of": "ForOf",
    "for-in": "ForIn",
    logical: "Logical",
    ternary: "Ternary",
    optional: "Optional",
    label: "Label",
    sequence: "Sequence",
    "maybe-throw": "MaybeThrow",
    try: "Try",
    scope: "Scope",
    "pruned-scope": "PrunedScope",
    unreachable: "Unreachable",
    unsupported: "Unsupported",
  };
  return names[kind] ?? kind;
}

// ---------------------------------------------------------------------------
// Phi printing
// ---------------------------------------------------------------------------

function printPhi(phi, depth) {
  const lines = [];
  lines.push(`${indent(depth)}Phi {`);
  lines.push(`${indent(depth + 1)}place: $${phi.place.identifier.id}`);
  lines.push(`${indent(depth + 1)}operands:`);
  // phi.operands is a Map<BlockId, Place>
  const sortedOperands = [...phi.operands].sort((a, b) => a[0] - b[0]);
  for (const [blockId, place] of sortedOperands) {
    lines.push(
      `${indent(depth + 2)}bb${blockId}: $${place.identifier.id}`
    );
  }
  lines.push(`${indent(depth)}}`);
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Main function printer
// ---------------------------------------------------------------------------

function printHIRFunction(fn, functionIndex, outlinedCollector) {
  const lines = [];
  const d0 = 0;
  const d1 = 1;
  const d2 = 2;

  lines.push(`${indent(d0)}Function #${functionIndex}:`);

  // id
  lines.push(
    `${indent(d1)}id: ${fn.id != null ? JSON.stringify(fn.id) : "null"}`
  );

  // params
  lines.push(`${indent(d1)}params:`);
  for (let i = 0; i < fn.params.length; i++) {
    const param = fn.params[i];
    if (param.kind === "Identifier") {
      lines.push(`${indent(d2)}[${i}]`);
      lines.push(printPlaceInline(param, d2 + 1));
    } else {
      // Spread
      lines.push(`${indent(d2)}[${i}] ...`);
      lines.push(printPlaceInline(param.place, d2 + 1));
    }
  }

  // returns
  lines.push(`${indent(d1)}returns:`);
  lines.push(printPlaceInline(fn.returns, d2));

  // returnTypeAnnotation
  if (fn.returnTypeAnnotation != null) {
    lines.push(`${indent(d1)}returnTypeAnnotation: ${JSON.stringify(fn.returnTypeAnnotation)}`);
  } else {
    lines.push(`${indent(d1)}returnTypeAnnotation: null`);
  }

  // context
  if (fn.context.length > 0) {
    lines.push(`${indent(d1)}context:`);
    for (const ctx of fn.context) {
      lines.push(printPlaceInline(ctx, d2));
    }
  } else {
    lines.push(`${indent(d1)}context: []`);
  }

  // directives
  if (fn.directives.length > 0) {
    lines.push(
      `${indent(d1)}directives: [${fn.directives.map((d) => JSON.stringify(d)).join(", ")}]`
    );
  } else {
    lines.push(`${indent(d1)}directives: []`);
  }

  // generator / async
  lines.push(`${indent(d1)}generator: ${fn.generator}`);
  lines.push(`${indent(d1)}async: ${fn.async}`);

  // aliasingEffects
  if (fn.aliasingEffects != null) {
    lines.push(
      `${indent(d1)}aliasingEffects: [${fn.aliasingEffects.length} effects]`
    );
  } else {
    lines.push(`${indent(d1)}aliasingEffects: null`);
  }

  // Collect all identifiers from the function
  const identifiers = new Map();
  collectIdentifiers(fn, identifiers);

  lines.push("");
  lines.push(`${indent(d1)}Identifiers:`);
  const sortedIds = [...identifiers.entries()].sort((a, b) => a[0] - b[0]);
  for (const [, identifier] of sortedIds) {
    lines.push(printIdentifierEntry(identifier, d2));
  }

  // Blocks (in order from body.blocks, which is RPO)
  lines.push("");
  lines.push(`${indent(d1)}Blocks:`);
  for (const [blockId, block] of fn.body.blocks) {
    lines.push(`${indent(d2)}bb${blockId} (${block.kind}):`);
    const d3 = d2 + 1;

    // preds
    const preds = [...block.preds].sort((a, b) => a - b);
    lines.push(`${indent(d3)}preds: [${preds.map((p) => `bb${p}`).join(", ")}]`);

    // phis
    if (block.phis.size > 0) {
      lines.push(`${indent(d3)}phis:`);
      for (const phi of block.phis) {
        lines.push(printPhi(phi, d3 + 1));
      }
    } else {
      lines.push(`${indent(d3)}phis: []`);
    }

    // instructions
    lines.push(`${indent(d3)}instructions:`);
    for (const instr of block.instructions) {
      lines.push(printInstruction(instr, d3 + 1));
      // Collect outlined functions
      if (
        instr.value.kind === "FunctionExpression" ||
        instr.value.kind === "ObjectMethod"
      ) {
        outlinedCollector.push(instr.value.loweredFunc.func);
      }
    }

    // terminal
    lines.push(`${indent(d3)}terminal:`);
    lines.push(printTerminal(block.terminal, d3 + 1));
  }

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Identifier collection
// ---------------------------------------------------------------------------

function collectIdentifiers(fn, map) {
  // From params
  for (const param of fn.params) {
    if (param.kind === "Identifier") {
      addIdentifier(map, param.identifier);
    } else {
      addIdentifier(map, param.place.identifier);
    }
  }

  // returns
  addIdentifier(map, fn.returns.identifier);

  // context
  for (const ctx of fn.context) {
    addIdentifier(map, ctx.identifier);
  }

  // From blocks
  for (const [, block] of fn.body.blocks) {
    // phis
    for (const phi of block.phis) {
      addIdentifier(map, phi.place.identifier);
      for (const [, place] of phi.operands) {
        addIdentifier(map, place.identifier);
      }
    }

    // instructions
    for (const instr of block.instructions) {
      addIdentifier(map, instr.lvalue.identifier);
      collectIdentifiersFromValue(instr.value, map);
    }

    // terminal
    collectIdentifiersFromTerminal(block.terminal, map);
  }
}

function addIdentifier(map, identifier) {
  if (!map.has(identifier.id)) {
    map.set(identifier.id, identifier);
  }
}

function collectIdentifiersFromPlace(place, map) {
  if (place != null) {
    addIdentifier(map, place.identifier);
  }
}

function collectIdentifiersFromValue(value, map) {
  if (value == null) return;
  switch (value.kind) {
    case "LoadLocal":
    case "LoadContext":
      collectIdentifiersFromPlace(value.place, map);
      break;
    case "DeclareLocal":
    case "DeclareContext":
      collectIdentifiersFromPlace(value.lvalue.place, map);
      break;
    case "StoreLocal":
    case "StoreContext":
      collectIdentifiersFromPlace(value.lvalue.place, map);
      collectIdentifiersFromPlace(value.value, map);
      break;
    case "Destructure":
      collectIdentifiersFromPattern(value.lvalue.pattern, map);
      collectIdentifiersFromPlace(value.value, map);
      break;
    case "BinaryExpression":
      collectIdentifiersFromPlace(value.left, map);
      collectIdentifiersFromPlace(value.right, map);
      break;
    case "UnaryExpression":
      collectIdentifiersFromPlace(value.value, map);
      break;
    case "CallExpression":
    case "NewExpression":
      collectIdentifiersFromPlace(value.callee, map);
      for (const arg of value.args) {
        if (arg.kind === "Identifier") collectIdentifiersFromPlace(arg, map);
        else if (arg.kind === "Spread")
          collectIdentifiersFromPlace(arg.place, map);
      }
      break;
    case "MethodCall":
      collectIdentifiersFromPlace(value.receiver, map);
      collectIdentifiersFromPlace(value.property, map);
      for (const arg of value.args) {
        if (arg.kind === "Identifier") collectIdentifiersFromPlace(arg, map);
        else if (arg.kind === "Spread")
          collectIdentifiersFromPlace(arg.place, map);
      }
      break;
    case "ObjectExpression":
      if (value.properties != null) {
        for (const prop of value.properties) {
          if (prop.kind === "ObjectProperty") {
            collectIdentifiersFromPlace(prop.place, map);
            if (prop.key.kind === "computed")
              collectIdentifiersFromPlace(prop.key.name, map);
          } else {
            collectIdentifiersFromPlace(prop.place, map);
          }
        }
      }
      break;
    case "ArrayExpression":
      for (const el of value.elements) {
        if (el.kind === "Identifier") collectIdentifiersFromPlace(el, map);
        else if (el.kind === "Spread")
          collectIdentifiersFromPlace(el.place, map);
      }
      break;
    case "PropertyLoad":
    case "PropertyDelete":
      collectIdentifiersFromPlace(value.object, map);
      break;
    case "PropertyStore":
      collectIdentifiersFromPlace(value.object, map);
      collectIdentifiersFromPlace(value.value, map);
      break;
    case "ComputedLoad":
    case "ComputedDelete":
      collectIdentifiersFromPlace(value.object, map);
      collectIdentifiersFromPlace(value.property, map);
      break;
    case "ComputedStore":
      collectIdentifiersFromPlace(value.object, map);
      collectIdentifiersFromPlace(value.property, map);
      collectIdentifiersFromPlace(value.value, map);
      break;
    case "StoreGlobal":
      collectIdentifiersFromPlace(value.value, map);
      break;
    case "TypeCastExpression":
      collectIdentifiersFromPlace(value.value, map);
      break;
    case "JsxExpression":
      if (value.tag.kind === "Identifier")
        collectIdentifiersFromPlace(value.tag, map);
      for (const attr of value.props) {
        if (attr.kind === "JsxAttribute")
          collectIdentifiersFromPlace(attr.place, map);
        else collectIdentifiersFromPlace(attr.argument, map);
      }
      if (value.children != null) {
        for (const child of value.children)
          collectIdentifiersFromPlace(child, map);
      }
      break;
    case "JsxFragment":
      for (const child of value.children)
        collectIdentifiersFromPlace(child, map);
      break;
    case "FunctionExpression":
    case "ObjectMethod":
      // context of lowered func
      for (const ctx of value.loweredFunc.func.context) {
        collectIdentifiersFromPlace(ctx, map);
      }
      break;
    case "TaggedTemplateExpression":
      collectIdentifiersFromPlace(value.tag, map);
      break;
    case "TemplateLiteral":
      for (const s of value.subexprs) collectIdentifiersFromPlace(s, map);
      break;
    case "Await":
      collectIdentifiersFromPlace(value.value, map);
      break;
    case "GetIterator":
      collectIdentifiersFromPlace(value.collection, map);
      break;
    case "IteratorNext":
      collectIdentifiersFromPlace(value.iterator, map);
      collectIdentifiersFromPlace(value.collection, map);
      break;
    case "NextPropertyOf":
      collectIdentifiersFromPlace(value.value, map);
      break;
    case "PostfixUpdate":
    case "PrefixUpdate":
      collectIdentifiersFromPlace(value.lvalue, map);
      collectIdentifiersFromPlace(value.value, map);
      break;
    case "FinishMemoize":
      collectIdentifiersFromPlace(value.decl, map);
      break;
    case "StartMemoize":
      if (value.deps != null) {
        for (const dep of value.deps) {
          if (dep.root.kind === "NamedLocal") {
            collectIdentifiersFromPlace(dep.root.value, map);
          }
        }
      }
      break;
    default:
      break;
  }
}

function collectIdentifiersFromPattern(pattern, map) {
  switch (pattern.kind) {
    case "ArrayPattern":
      for (const item of pattern.items) {
        if (item.kind === "Identifier") collectIdentifiersFromPlace(item, map);
        else if (item.kind === "Spread")
          collectIdentifiersFromPlace(item.place, map);
      }
      break;
    case "ObjectPattern":
      for (const prop of pattern.properties) {
        if (prop.kind === "ObjectProperty") {
          collectIdentifiersFromPlace(prop.place, map);
          if (prop.key.kind === "computed")
            collectIdentifiersFromPlace(prop.key.name, map);
        } else {
          collectIdentifiersFromPlace(prop.place, map);
        }
      }
      break;
  }
}

function collectIdentifiersFromTerminal(terminal, map) {
  switch (terminal.kind) {
    case "if":
    case "branch":
      collectIdentifiersFromPlace(terminal.test, map);
      break;
    case "return":
      collectIdentifiersFromPlace(terminal.value, map);
      break;
    case "throw":
      collectIdentifiersFromPlace(terminal.value, map);
      break;
    case "switch":
      collectIdentifiersFromPlace(terminal.test, map);
      for (const c of terminal.cases) {
        if (c.test != null) collectIdentifiersFromPlace(c.test, map);
      }
      break;
    case "try":
      if (terminal.handlerBinding != null)
        collectIdentifiersFromPlace(terminal.handlerBinding, map);
      break;
    default:
      break;
  }
}
