//! Shared formatting utilities for HIR debug printing.
//!
//! This module provides `PrintFormatter` — a stateful formatter that both
//! `react_compiler::debug_print` (HIR printer) and
//! `react_compiler_reactive_scopes::print_reactive_function` (reactive printer)
//! delegate to for shared formatting logic.
//!
//! It also exports standalone formatting functions (format_loc, format_primitive, etc.)
//! that require no state.

use rustc_hash::FxHashSet;

use react_compiler_diagnostics::CompilerError;
use react_compiler_diagnostics::CompilerErrorOrDiagnostic;
use react_compiler_diagnostics::SourceLocation;

use crate::AliasingEffect;
use crate::HirFunction;
use crate::IdentifierId;
use crate::IdentifierName;
use crate::InstructionValue;
use crate::LValue;
use crate::MutationReason;
use crate::Pattern;
use crate::Place;
use crate::PlaceOrSpreadOrHole;
use crate::ScopeId;
use crate::Type;
use crate::environment::Environment;
use crate::type_config::ValueKind;
use crate::type_config::ValueReason;

// =============================================================================
// Standalone formatting functions (no state needed)
// =============================================================================

pub fn format_loc(loc: &Option<SourceLocation>) -> String {
    match loc {
        Some(l) => format_loc_value(l),
        None => "generated".to_string(),
    }
}

pub fn format_loc_value(loc: &SourceLocation) -> String {
    format!(
        "{}:{}-{}:{}",
        loc.start.line, loc.start.column, loc.end.line, loc.end.column
    )
}

/// Format a string like JS `JSON.stringify`: escape control chars and quotes
/// but preserve non-ASCII unicode (e.g. U+00A0 nbsp) as literal characters.
pub fn format_js_string(s: &str) -> String {
    let mut result = String::with_capacity(s.len() + 2);
    result.push('"');
    for c in s.chars() {
        match c {
            '"' => result.push_str("\\\""),
            '\\' => result.push_str("\\\\"),
            '\n' => result.push_str("\\n"),
            '\r' => result.push_str("\\r"),
            '\t' => result.push_str("\\t"),
            '\u{0008}' => result.push_str("\\b"),
            '\u{000c}' => result.push_str("\\f"),
            // Only escape C0 control chars (U+0000–U+001F), matching JS JSON.stringify.
            // Do NOT escape C1 controls (U+0080–U+009F) — JS outputs those as literal chars.
            c if (c as u32) <= 0x1F => {
                result.push_str(&format!("\\u{:04x}", c as u32));
            }
            c => result.push(c),
        }
    }
    result.push('"');
    result
}

pub fn format_primitive(prim: &crate::PrimitiveValue) -> String {
    match prim {
        crate::PrimitiveValue::Null => "null".to_string(),
        crate::PrimitiveValue::Undefined => "undefined".to_string(),
        crate::PrimitiveValue::Boolean(b) => format!("{}", b),
        crate::PrimitiveValue::Number(n) => crate::format_js_number(n.value()),
        crate::PrimitiveValue::String(s) => match s.as_str() {
            Some(utf8) => format_js_string(utf8),
            // Ill-formed strings: escape the well-formed segments exactly like
            // format_js_string and render each unpaired surrogate as \uXXXX,
            // matching what TS's JSON.stringify-based printer emits.
            None => {
                let mut result = String::new();
                result.push('"');
                let mut units = s.code_units().into_iter().peekable();
                while let Some(unit) = units.next() {
                    let is_lead = (0xD800..=0xDBFF).contains(&unit);
                    let is_trail = (0xDC00..=0xDFFF).contains(&unit);
                    if is_lead {
                        if let Some(&next) = units.peek() {
                            if (0xDC00..=0xDFFF).contains(&next) {
                                units.next();
                                let cp = 0x10000
                                    + ((unit as u32 - 0xD800) << 10)
                                    + (next as u32 - 0xDC00);
                                result.push(char::from_u32(cp).expect("valid supplementary"));
                                continue;
                            }
                        }
                    }
                    if is_lead || is_trail {
                        result.push_str(&format!("\\u{unit:04x}"));
                        continue;
                    }
                    let c = char::from_u32(unit as u32).expect("BMP non-surrogate is a char");
                    match c {
                        '"' => result.push_str("\\\""),
                        '\\' => result.push_str("\\\\"),
                        '\n' => result.push_str("\\n"),
                        '\r' => result.push_str("\\r"),
                        '\t' => result.push_str("\\t"),
                        '\u{0008}' => result.push_str("\\b"),
                        '\u{000c}' => result.push_str("\\f"),
                        c if (c as u32) <= 0x1F => {
                            result.push_str(&format!("\\u{:04x}", c as u32));
                        }
                        c => result.push(c),
                    }
                }
                result.push('"');
                result
            }
        },
    }
}

pub fn format_property_literal(prop: &crate::PropertyLiteral) -> String {
    match prop {
        crate::PropertyLiteral::String(s) => s.clone(),
        crate::PropertyLiteral::Number(n) => crate::format_js_number(n.value()),
    }
}

pub fn format_object_property_key(key: &crate::ObjectPropertyKey) -> String {
    match key {
        crate::ObjectPropertyKey::String { name } => format!("String(\"{}\")", name),
        crate::ObjectPropertyKey::Identifier { name } => {
            format!("Identifier(\"{}\")", name)
        }
        crate::ObjectPropertyKey::Computed { name } => {
            format!("Computed({})", name.identifier.0)
        }
        crate::ObjectPropertyKey::Number { name } => {
            format!("Number({})", crate::format_js_number(name.value()))
        }
    }
}

pub fn format_non_local_binding(binding: &crate::NonLocalBinding) -> String {
    match binding {
        crate::NonLocalBinding::Global { name } => {
            format!("Global {{ name: \"{}\" }}", name)
        }
        crate::NonLocalBinding::ModuleLocal { name } => {
            format!("ModuleLocal {{ name: \"{}\" }}", name)
        }
        crate::NonLocalBinding::ImportDefault { name, module } => {
            format!(
                "ImportDefault {{ name: \"{}\", module: \"{}\" }}",
                name, module
            )
        }
        crate::NonLocalBinding::ImportNamespace { name, module } => {
            format!(
                "ImportNamespace {{ name: \"{}\", module: \"{}\" }}",
                name, module
            )
        }
        crate::NonLocalBinding::ImportSpecifier {
            name,
            module,
            imported,
        } => {
            format!(
                "ImportSpecifier {{ name: \"{}\", module: \"{}\", imported: \"{}\" }}",
                name, module, imported
            )
        }
    }
}

pub fn format_value_kind(kind: ValueKind) -> &'static str {
    match kind {
        ValueKind::Mutable => "mutable",
        ValueKind::Frozen => "frozen",
        ValueKind::Primitive => "primitive",
        ValueKind::MaybeFrozen => "maybe-frozen",
        ValueKind::Global => "global",
        ValueKind::Context => "context",
    }
}

pub fn format_value_reason(reason: ValueReason) -> &'static str {
    match reason {
        ValueReason::KnownReturnSignature => "known-return-signature",
        ValueReason::State => "state",
        ValueReason::ReducerState => "reducer-state",
        ValueReason::Context => "context",
        ValueReason::Effect => "effect",
        ValueReason::HookCaptured => "hook-captured",
        ValueReason::HookReturn => "hook-return",
        ValueReason::Global => "global",
        ValueReason::JsxCaptured => "jsx-captured",
        ValueReason::StoreLocal => "store-local",
        ValueReason::ReactiveFunctionArgument => "reactive-function-argument",
        ValueReason::Other => "other",
    }
}

// =============================================================================
// PrintFormatter — shared stateful formatter
// =============================================================================

/// Shared formatter state used by both HIR and reactive printers.
///
/// Both `DebugPrinter` structs delegate to this for formatting shared constructs
/// like Places, Identifiers, Scopes, Types, InstructionValues, etc.
pub struct PrintFormatter<'a> {
    pub env: &'a Environment,
    pub seen_identifiers: FxHashSet<IdentifierId>,
    pub seen_scopes: FxHashSet<ScopeId>,
    pub output: Vec<String>,
    pub indent_level: usize,
}

impl<'a> PrintFormatter<'a> {
    pub fn new(env: &'a Environment) -> Self {
        Self {
            env,
            seen_identifiers: FxHashSet::default(),
            seen_scopes: FxHashSet::default(),
            output: Vec::new(),
            indent_level: 0,
        }
    }

    pub fn line(&mut self, text: &str) {
        let indent = "  ".repeat(self.indent_level);
        self.output.push(format!("{}{}", indent, text));
    }

    /// Write a line without adding indentation (used when copying pre-formatted output)
    pub fn line_raw(&mut self, text: &str) {
        self.output.push(text.to_string());
    }

    pub fn indent(&mut self) {
        self.indent_level += 1;
    }

    pub fn dedent(&mut self) {
        self.indent_level -= 1;
    }

    pub fn to_string_output(&self) -> String {
        self.output.join("\n")
    }

    // =========================================================================
    // AliasingEffect
    // =========================================================================

    pub fn format_effect(&self, effect: &AliasingEffect) -> String {
        match effect {
            AliasingEffect::Freeze { value, reason } => {
                format!(
                    "Freeze {{ value: {}, reason: {} }}",
                    value.identifier.0,
                    format_value_reason(*reason)
                )
            }
            AliasingEffect::Mutate { value, reason } => match reason {
                Some(MutationReason::AssignCurrentProperty) => {
                    format!(
                        "Mutate {{ value: {}, reason: AssignCurrentProperty }}",
                        value.identifier.0
                    )
                }
                None => format!("Mutate {{ value: {} }}", value.identifier.0),
            },
            AliasingEffect::MutateConditionally { value } => {
                format!("MutateConditionally {{ value: {} }}", value.identifier.0)
            }
            AliasingEffect::MutateTransitive { value } => {
                format!("MutateTransitive {{ value: {} }}", value.identifier.0)
            }
            AliasingEffect::MutateTransitiveConditionally { value } => {
                format!(
                    "MutateTransitiveConditionally {{ value: {} }}",
                    value.identifier.0
                )
            }
            AliasingEffect::Capture { from, into } => {
                format!(
                    "Capture {{ into: {}, from: {} }}",
                    into.identifier.0, from.identifier.0
                )
            }
            AliasingEffect::Alias { from, into } => {
                format!(
                    "Alias {{ into: {}, from: {} }}",
                    into.identifier.0, from.identifier.0
                )
            }
            AliasingEffect::MaybeAlias { from, into } => {
                format!(
                    "MaybeAlias {{ into: {}, from: {} }}",
                    into.identifier.0, from.identifier.0
                )
            }
            AliasingEffect::Assign { from, into } => {
                format!(
                    "Assign {{ into: {}, from: {} }}",
                    into.identifier.0, from.identifier.0
                )
            }
            AliasingEffect::Create {
                into,
                value,
                reason,
            } => {
                format!(
                    "Create {{ into: {}, value: {}, reason: {} }}",
                    into.identifier.0,
                    format_value_kind(*value),
                    format_value_reason(*reason)
                )
            }
            AliasingEffect::CreateFrom { from, into } => {
                format!(
                    "CreateFrom {{ into: {}, from: {} }}",
                    into.identifier.0, from.identifier.0
                )
            }
            AliasingEffect::ImmutableCapture { from, into } => {
                format!(
                    "ImmutableCapture {{ into: {}, from: {} }}",
                    into.identifier.0, from.identifier.0
                )
            }
            AliasingEffect::Apply {
                receiver,
                function,
                mutates_function,
                args,
                into,
                ..
            } => {
                let args_str: Vec<String> = args
                    .iter()
                    .map(|a| match a {
                        PlaceOrSpreadOrHole::Hole => "hole".to_string(),
                        PlaceOrSpreadOrHole::Place(p) => p.identifier.0.to_string(),
                        PlaceOrSpreadOrHole::Spread(s) => format!("...{}", s.place.identifier.0),
                    })
                    .collect();
                format!(
                    "Apply {{ into: {}, receiver: {}, function: {}, mutatesFunction: {}, args: [{}] }}",
                    into.identifier.0,
                    receiver.identifier.0,
                    function.identifier.0,
                    mutates_function,
                    args_str.join(", ")
                )
            }
            AliasingEffect::CreateFunction {
                captures,
                function_id: _,
                into,
            } => {
                let cap_str: Vec<String> = captures
                    .iter()
                    .map(|p| p.identifier.0.to_string())
                    .collect();
                format!(
                    "CreateFunction {{ into: {}, captures: [{}] }}",
                    into.identifier.0,
                    cap_str.join(", ")
                )
            }
            AliasingEffect::MutateFrozen { place, error } => {
                format!(
                    "MutateFrozen {{ place: {}, reason: {:?} }}",
                    place.identifier.0, error.reason
                )
            }
            AliasingEffect::MutateGlobal { place, error } => {
                format!(
                    "MutateGlobal {{ place: {}, reason: {:?} }}",
                    place.identifier.0, error.reason
                )
            }
            AliasingEffect::Impure { place, error } => {
                format!(
                    "Impure {{ place: {}, reason: {:?} }}",
                    place.identifier.0, error.reason
                )
            }
            AliasingEffect::Render { place } => {
                format!("Render {{ place: {} }}", place.identifier.0)
            }
        }
    }

    // =========================================================================
    // Place (with identifier deduplication)
    // =========================================================================

    pub fn format_place_field(&mut self, field_name: &str, place: &Place) {
        let is_seen = self.seen_identifiers.contains(&place.identifier);
        if is_seen {
            self.line(&format!(
                "{}: Place {{ identifier: Identifier({}), effect: {}, reactive: {}, loc: {} }}",
                field_name,
                place.identifier.0,
                place.effect,
                place.reactive,
                format_loc(&place.loc)
            ));
        } else {
            self.line(&format!("{}: Place {{", field_name));
            self.indent();
            self.line("identifier:");
            self.indent();
            self.format_identifier(place.identifier);
            self.dedent();
            self.line(&format!("effect: {}", place.effect));
            self.line(&format!("reactive: {}", place.reactive));
            self.line(&format!("loc: {}", format_loc(&place.loc)));
            self.dedent();
            self.line("}");
        }
    }

    // =========================================================================
    // Identifier (first-seen expansion)
    // =========================================================================

    pub fn format_identifier(&mut self, id: IdentifierId) {
        self.seen_identifiers.insert(id);
        let ident = &self.env.identifiers[id.0 as usize];
        self.line("Identifier {");
        self.indent();
        self.line(&format!("id: {}", ident.id.0));
        self.line(&format!("declarationId: {}", ident.declaration_id.0));
        match &ident.name {
            Some(name) => {
                let (kind, value) = match name {
                    IdentifierName::Named(n) => ("named", n.as_str()),
                    IdentifierName::Promoted(n) => ("promoted", n.as_str()),
                };
                self.line(&format!(
                    "name: {{ kind: \"{}\", value: \"{}\" }}",
                    kind, value
                ));
            }
            None => self.line("name: null"),
        }
        // Print the identifier's mutable_range directly, matching the TS
        // DebugPrintHIR which prints `identifier.mutableRange`. In TS,
        // InferReactiveScopeVariables sets identifier.mutableRange = scope.range
        // (shared reference), and AlignReactiveScopesToBlockScopesHIR syncs them.
        // After MergeOverlappingReactiveScopesHIR repoints scopes, the TS
        // identifier.mutableRange still references the OLD scope's range (stale),
        // so we match by using ident.mutable_range directly (which is synced
        // at the AlignReactiveScopesToBlockScopesHIR step but not re-synced
        // after scope repointing in merge passes).
        self.line(&format!(
            "mutableRange: [{}:{}]",
            ident.mutable_range.start.0, ident.mutable_range.end.0
        ));
        match ident.scope {
            Some(scope_id) => self.format_scope_field("scope", scope_id),
            None => self.line("scope: null"),
        }
        self.line(&format!("type: {}", self.format_type(ident.type_)));
        self.line(&format!("loc: {}", format_loc(&ident.loc)));
        self.dedent();
        self.line("}");
    }

    // =========================================================================
    // Scope (with deduplication)
    // =========================================================================

    pub fn format_scope_field(&mut self, field_name: &str, scope_id: ScopeId) {
        let is_seen = self.seen_scopes.contains(&scope_id);
        if is_seen {
            self.line(&format!("{}: Scope({})", field_name, scope_id.0));
        } else {
            self.seen_scopes.insert(scope_id);
            if let Some(scope) = self.env.scopes.iter().find(|s| s.id == scope_id) {
                let range_start = scope.range.start.0;
                let range_end = scope.range.end.0;
                let dependencies = scope.dependencies.clone();
                let declarations = scope.declarations.clone();
                let reassignments = scope.reassignments.clone();
                let early_return_value = scope.early_return_value.clone();
                let merged = scope.merged.clone();
                let loc = scope.loc;

                self.line(&format!("{}: Scope {{", field_name));
                self.indent();
                self.line(&format!("id: {}", scope_id.0));
                self.line(&format!("range: [{}:{}]", range_start, range_end));

                // dependencies
                self.line("dependencies:");
                self.indent();
                for (i, dep) in dependencies.iter().enumerate() {
                    let path_str: String = dep
                        .path
                        .iter()
                        .map(|p| {
                            let prop = match &p.property {
                                crate::PropertyLiteral::String(s) => s.clone(),
                                crate::PropertyLiteral::Number(n) => {
                                    crate::format_js_number(n.value())
                                }
                            };
                            format!("{}{}", if p.optional { "?." } else { "." }, prop)
                        })
                        .collect();
                    self.line(&format!(
                        "[{}] {{ identifier: {}, reactive: {}, path: \"{}\" }}",
                        i, dep.identifier.0, dep.reactive, path_str
                    ));
                }
                self.dedent();

                // declarations
                self.line("declarations:");
                self.indent();
                for (ident_id, decl) in &declarations {
                    self.line(&format!(
                        "{}: {{ identifier: {}, scope: {} }}",
                        ident_id.0, decl.identifier.0, decl.scope.0
                    ));
                }
                self.dedent();

                // reassignments
                self.line("reassignments:");
                self.indent();
                for ident_id in &reassignments {
                    self.line(&format!("{}", ident_id.0));
                }
                self.dedent();

                // earlyReturnValue
                if let Some(early_return) = &early_return_value {
                    self.line("earlyReturnValue:");
                    self.indent();
                    self.line(&format!("value: {}", early_return.value.0));
                    self.line(&format!("loc: {}", format_loc(&early_return.loc)));
                    self.line(&format!("label: bb{}", early_return.label.0));
                    self.dedent();
                } else {
                    self.line("earlyReturnValue: null");
                }

                // merged
                let merged_str: Vec<String> = merged.iter().map(|s| s.0.to_string()).collect();
                self.line(&format!("merged: [{}]", merged_str.join(", ")));

                // loc
                self.line(&format!("loc: {}", format_loc(&loc)));

                self.dedent();
                self.line("}");
            } else {
                self.line(&format!("{}: Scope({})", field_name, scope_id.0));
            }
        }
    }

    // =========================================================================
    // Type
    // =========================================================================

    pub fn format_type(&self, type_id: crate::TypeId) -> String {
        if let Some(ty) = self.env.types.get(type_id.0 as usize) {
            self.format_type_value(ty)
        } else {
            format!("Type({})", type_id.0)
        }
    }

    pub fn format_type_value(&self, ty: &Type) -> String {
        match ty {
            Type::Primitive => "Primitive".to_string(),
            Type::Function {
                shape_id,
                return_type,
                is_constructor,
            } => {
                format!(
                    "Function {{ shapeId: {}, return: {}, isConstructor: {} }}",
                    match shape_id {
                        Some(s) => format!("\"{}\"", s),
                        None => "null".to_string(),
                    },
                    self.format_type_value(return_type),
                    is_constructor
                )
            }
            Type::Object { shape_id } => {
                format!(
                    "Object {{ shapeId: {} }}",
                    match shape_id {
                        Some(s) => format!("\"{}\"", s),
                        None => "null".to_string(),
                    }
                )
            }
            Type::TypeVar { id } => format!("Type({})", id.0),
            Type::Poly => "Poly".to_string(),
            Type::Phi { operands } => {
                let ops: Vec<String> = operands
                    .iter()
                    .map(|op| self.format_type_value(op))
                    .collect();
                format!("Phi {{ operands: [{}] }}", ops.join(", "))
            }
            Type::Property {
                object_type,
                object_name,
                property_name,
            } => {
                let prop_str = match property_name {
                    crate::PropertyNameKind::Literal { value } => {
                        format!("\"{}\"", format_property_literal(value))
                    }
                    crate::PropertyNameKind::Computed { value } => {
                        format!("computed({})", self.format_type_value(value))
                    }
                };
                format!(
                    "Property {{ objectType: {}, objectName: \"{}\", propertyName: {} }}",
                    self.format_type_value(object_type),
                    object_name,
                    prop_str
                )
            }
            Type::ObjectMethod => "ObjectMethod".to_string(),
        }
    }

    // =========================================================================
    // LValue
    // =========================================================================

    pub fn format_lvalue(&mut self, field_name: &str, lv: &LValue) {
        self.line(&format!("{}:", field_name));
        self.indent();
        self.line(&format!("kind: {:?}", lv.kind));
        self.format_place_field("place", &lv.place);
        self.dedent();
    }

    // =========================================================================
    // Pattern
    // =========================================================================

    pub fn format_pattern(&mut self, pattern: &Pattern) {
        match pattern {
            Pattern::Array(arr) => {
                self.line("pattern: ArrayPattern {");
                self.indent();
                self.line("items:");
                self.indent();
                for (i, item) in arr.items.iter().enumerate() {
                    match item {
                        crate::ArrayPatternElement::Hole => {
                            self.line(&format!("[{}] Hole", i));
                        }
                        crate::ArrayPatternElement::Place(p) => {
                            self.format_place_field(&format!("[{}]", i), p);
                        }
                        crate::ArrayPatternElement::Spread(s) => {
                            self.line(&format!("[{}] Spread:", i));
                            self.indent();
                            self.format_place_field("place", &s.place);
                            self.dedent();
                        }
                    }
                }
                self.dedent();
                self.line(&format!("loc: {}", format_loc(&arr.loc)));
                self.dedent();
                self.line("}");
            }
            Pattern::Object(obj) => {
                self.line("pattern: ObjectPattern {");
                self.indent();
                self.line("properties:");
                self.indent();
                for (i, prop) in obj.properties.iter().enumerate() {
                    match prop {
                        crate::ObjectPropertyOrSpread::Property(p) => {
                            self.line(&format!("[{}] ObjectProperty {{", i));
                            self.indent();
                            self.line(&format!("key: {}", format_object_property_key(&p.key)));
                            self.line(&format!("type: \"{}\"", p.property_type));
                            self.format_place_field("place", &p.place);
                            self.dedent();
                            self.line("}");
                        }
                        crate::ObjectPropertyOrSpread::Spread(s) => {
                            self.line(&format!("[{}] Spread:", i));
                            self.indent();
                            self.format_place_field("place", &s.place);
                            self.dedent();
                        }
                    }
                }
                self.dedent();
                self.line(&format!("loc: {}", format_loc(&obj.loc)));
                self.dedent();
                self.line("}");
            }
        }
    }

    // =========================================================================
    // Arguments
    // =========================================================================

    pub fn format_argument(&mut self, arg: &crate::PlaceOrSpread, index: usize) {
        match arg {
            crate::PlaceOrSpread::Place(p) => {
                self.format_place_field(&format!("[{}]", index), p);
            }
            crate::PlaceOrSpread::Spread(s) => {
                self.line(&format!("[{}] Spread:", index));
                self.indent();
                self.format_place_field("place", &s.place);
                self.dedent();
            }
        }
    }

    // =========================================================================
    // InstructionValue
    // =========================================================================

    /// Format an InstructionValue. The `inner_func_formatter` callback is invoked
    /// for FunctionExpression/ObjectMethod to format the inner HirFunction. If None,
    /// a placeholder is printed instead.
    pub fn format_instruction_value(
        &mut self,
        value: &InstructionValue,
        inner_func_formatter: Option<&dyn Fn(&mut PrintFormatter, &HirFunction)>,
    ) {
        match value {
            InstructionValue::ArrayExpression { elements, loc } => {
                self.line("ArrayExpression {");
                self.indent();
                self.line("elements:");
                self.indent();
                for (i, elem) in elements.iter().enumerate() {
                    match elem {
                        crate::ArrayElement::Place(p) => {
                            self.format_place_field(&format!("[{}]", i), p);
                        }
                        crate::ArrayElement::Hole => {
                            self.line(&format!("[{}] Hole", i));
                        }
                        crate::ArrayElement::Spread(s) => {
                            self.line(&format!("[{}] Spread:", i));
                            self.indent();
                            self.format_place_field("place", &s.place);
                            self.dedent();
                        }
                    }
                }
                self.dedent();
                self.line(&format!("loc: {}", format_loc(loc)));
                self.dedent();
                self.line("}");
            }
            InstructionValue::ObjectExpression { properties, loc } => {
                self.line("ObjectExpression {");
                self.indent();
                self.line("properties:");
                self.indent();
                for (i, prop) in properties.iter().enumerate() {
                    match prop {
                        crate::ObjectPropertyOrSpread::Property(p) => {
                            self.line(&format!("[{}] ObjectProperty {{", i));
                            self.indent();
                            self.line(&format!("key: {}", format_object_property_key(&p.key)));
                            self.line(&format!("type: \"{}\"", p.property_type));
                            self.format_place_field("place", &p.place);
                            self.dedent();
                            self.line("}");
                        }
                        crate::ObjectPropertyOrSpread::Spread(s) => {
                            self.line(&format!("[{}] Spread:", i));
                            self.indent();
                            self.format_place_field("place", &s.place);
                            self.dedent();
                        }
                    }
                }
                self.dedent();
                self.line(&format!("loc: {}", format_loc(loc)));
                self.dedent();
                self.line("}");
            }
            InstructionValue::UnaryExpression {
                operator,
                value: val,
                loc,
            } => {
                self.line("UnaryExpression {");
                self.indent();
                self.line(&format!("operator: \"{}\"", operator));
                self.format_place_field("value", val);
                self.line(&format!("loc: {}", format_loc(loc)));
                self.dedent();
                self.line("}");
            }
            InstructionValue::BinaryExpression {
                operator,
                left,
                right,
                loc,
            } => {
                self.line("BinaryExpression {");
                self.indent();
                self.line(&format!("operator: \"{}\"", operator));
                self.format_place_field("left", left);
                self.format_place_field("right", right);
                self.line(&format!("loc: {}", format_loc(loc)));
                self.dedent();
                self.line("}");
            }
            InstructionValue::NewExpression { callee, args, loc } => {
                self.line("NewExpression {");
                self.indent();
                self.format_place_field("callee", callee);
                self.line("args:");
                self.indent();
                for (i, arg) in args.iter().enumerate() {
                    self.format_argument(arg, i);
                }
                self.dedent();
                self.line(&format!("loc: {}", format_loc(loc)));
                self.dedent();
                self.line("}");
            }
            InstructionValue::CallExpression { callee, args, loc } => {
                self.line("CallExpression {");
                self.indent();
                self.format_place_field("callee", callee);
                self.line("args:");
                self.indent();
                for (i, arg) in args.iter().enumerate() {
                    self.format_argument(arg, i);
                }
                self.dedent();
                self.line(&format!("loc: {}", format_loc(loc)));
                self.dedent();
                self.line("}");
            }
            InstructionValue::MethodCall {
                receiver,
                property,
                args,
                loc,
            } => {
                self.line("MethodCall {");
                self.indent();
                self.format_place_field("receiver", receiver);
                self.format_place_field("property", property);
                self.line("args:");
                self.indent();
                for (i, arg) in args.iter().enumerate() {
                    self.format_argument(arg, i);
                }
                self.dedent();
                self.line(&format!("loc: {}", format_loc(loc)));
                self.dedent();
                self.line("}");
            }
            InstructionValue::JSXText { value: val, loc } => {
                self.line(&format!(
                    "JSXText {{ value: {}, loc: {} }}",
                    format_js_string(val),
                    format_loc(loc)
                ));
            }
            InstructionValue::Primitive { value: prim, loc } => {
                self.line(&format!(
                    "Primitive {{ value: {}, loc: {} }}",
                    format_primitive(prim),
                    format_loc(loc)
                ));
            }
            InstructionValue::TypeCastExpression {
                value: val,
                type_,
                type_annotation_name,
                type_annotation_kind,
                type_annotation: _,
                loc,
            } => {
                self.line("TypeCastExpression {");
                self.indent();
                self.format_place_field("value", val);
                self.line(&format!("type: {}", self.format_type_value(type_)));
                if let Some(annotation_name) = type_annotation_name {
                    self.line(&format!("typeAnnotation: {}", annotation_name));
                }
                if let Some(annotation_kind) = type_annotation_kind {
                    self.line(&format!("typeAnnotationKind: \"{}\"", annotation_kind));
                }
                self.line(&format!("loc: {}", format_loc(loc)));
                self.dedent();
                self.line("}");
            }
            InstructionValue::JsxExpression {
                tag,
                props,
                children,
                loc,
                opening_loc,
                closing_loc,
            } => {
                self.line("JsxExpression {");
                self.indent();
                match tag {
                    crate::JsxTag::Place(p) => {
                        self.format_place_field("tag", p);
                    }
                    crate::JsxTag::Builtin(b) => {
                        self.line(&format!("tag: BuiltinTag(\"{}\")", b.name));
                    }
                }
                self.line("props:");
                self.indent();
                for (i, prop) in props.iter().enumerate() {
                    match prop {
                        crate::JsxAttribute::Attribute { name, place } => {
                            self.line(&format!("[{}] JsxAttribute {{", i));
                            self.indent();
                            self.line(&format!("name: \"{}\"", name));
                            self.format_place_field("place", place);
                            self.dedent();
                            self.line("}");
                        }
                        crate::JsxAttribute::SpreadAttribute { argument } => {
                            self.line(&format!("[{}] JsxSpreadAttribute:", i));
                            self.indent();
                            self.format_place_field("argument", argument);
                            self.dedent();
                        }
                    }
                }
                self.dedent();
                match children {
                    Some(c) => {
                        self.line("children:");
                        self.indent();
                        for (i, child) in c.iter().enumerate() {
                            self.format_place_field(&format!("[{}]", i), child);
                        }
                        self.dedent();
                    }
                    None => self.line("children: null"),
                }
                self.line(&format!("openingLoc: {}", format_loc(opening_loc)));
                self.line(&format!("closingLoc: {}", format_loc(closing_loc)));
                self.line(&format!("loc: {}", format_loc(loc)));
                self.dedent();
                self.line("}");
            }
            InstructionValue::JsxFragment { children, loc } => {
                self.line("JsxFragment {");
                self.indent();
                self.line("children:");
                self.indent();
                for (i, child) in children.iter().enumerate() {
                    self.format_place_field(&format!("[{}]", i), child);
                }
                self.dedent();
                self.line(&format!("loc: {}", format_loc(loc)));
                self.dedent();
                self.line("}");
            }
            InstructionValue::UnsupportedNode { node_type, loc, .. } => match node_type {
                Some(t) => self.line(&format!(
                    "UnsupportedNode {{ type: {:?}, loc: {} }}",
                    t,
                    format_loc(loc)
                )),
                None => self.line(&format!("UnsupportedNode {{ loc: {} }}", format_loc(loc))),
            },
            InstructionValue::LoadLocal { place, loc } => {
                self.line("LoadLocal {");
                self.indent();
                self.format_place_field("place", place);
                self.line(&format!("loc: {}", format_loc(loc)));
                self.dedent();
                self.line("}");
            }
            InstructionValue::DeclareLocal {
                lvalue,
                type_annotation,
                loc,
            } => {
                self.line("DeclareLocal {");
                self.indent();
                self.format_lvalue("lvalue", lvalue);
                self.line(&format!(
                    "type: {}",
                    match type_annotation {
                        Some(t) => t.clone(),
                        None => "null".to_string(),
                    }
                ));
                self.line(&format!("loc: {}", format_loc(loc)));
                self.dedent();
                self.line("}");
            }
            InstructionValue::DeclareContext { lvalue, loc } => {
                self.line("DeclareContext {");
                self.indent();
                self.line("lvalue:");
                self.indent();
                self.line(&format!("kind: {:?}", lvalue.kind));
                self.format_place_field("place", &lvalue.place);
                self.dedent();
                self.line(&format!("loc: {}", format_loc(loc)));
                self.dedent();
                self.line("}");
            }
            InstructionValue::StoreLocal {
                lvalue,
                value: val,
                type_annotation,
                loc,
            } => {
                self.line("StoreLocal {");
                self.indent();
                self.format_lvalue("lvalue", lvalue);
                self.format_place_field("value", val);
                self.line(&format!(
                    "type: {}",
                    match type_annotation {
                        Some(t) => t.clone(),
                        None => "null".to_string(),
                    }
                ));
                self.line(&format!("loc: {}", format_loc(loc)));
                self.dedent();
                self.line("}");
            }
            InstructionValue::LoadContext { place, loc } => {
                self.line("LoadContext {");
                self.indent();
                self.format_place_field("place", place);
                self.line(&format!("loc: {}", format_loc(loc)));
                self.dedent();
                self.line("}");
            }
            InstructionValue::StoreContext {
                lvalue,
                value: val,
                loc,
            } => {
                self.line("StoreContext {");
                self.indent();
                self.line("lvalue:");
                self.indent();
                self.line(&format!("kind: {:?}", lvalue.kind));
                self.format_place_field("place", &lvalue.place);
                self.dedent();
                self.format_place_field("value", val);
                self.line(&format!("loc: {}", format_loc(loc)));
                self.dedent();
                self.line("}");
            }
            InstructionValue::Destructure {
                lvalue,
                value: val,
                loc,
            } => {
                self.line("Destructure {");
                self.indent();
                self.line("lvalue:");
                self.indent();
                self.line(&format!("kind: {:?}", lvalue.kind));
                self.format_pattern(&lvalue.pattern);
                self.dedent();
                self.format_place_field("value", val);
                self.line(&format!("loc: {}", format_loc(loc)));
                self.dedent();
                self.line("}");
            }
            InstructionValue::PropertyLoad {
                object,
                property,
                loc,
            } => {
                self.line("PropertyLoad {");
                self.indent();
                self.format_place_field("object", object);
                self.line(&format!(
                    "property: \"{}\"",
                    format_property_literal(property)
                ));
                self.line(&format!("loc: {}", format_loc(loc)));
                self.dedent();
                self.line("}");
            }
            InstructionValue::PropertyStore {
                object,
                property,
                value: val,
                loc,
            } => {
                self.line("PropertyStore {");
                self.indent();
                self.format_place_field("object", object);
                self.line(&format!(
                    "property: \"{}\"",
                    format_property_literal(property)
                ));
                self.format_place_field("value", val);
                self.line(&format!("loc: {}", format_loc(loc)));
                self.dedent();
                self.line("}");
            }
            InstructionValue::PropertyDelete {
                object,
                property,
                loc,
            } => {
                self.line("PropertyDelete {");
                self.indent();
                self.format_place_field("object", object);
                self.line(&format!(
                    "property: \"{}\"",
                    format_property_literal(property)
                ));
                self.line(&format!("loc: {}", format_loc(loc)));
                self.dedent();
                self.line("}");
            }
            InstructionValue::ComputedLoad {
                object,
                property,
                loc,
            } => {
                self.line("ComputedLoad {");
                self.indent();
                self.format_place_field("object", object);
                self.format_place_field("property", property);
                self.line(&format!("loc: {}", format_loc(loc)));
                self.dedent();
                self.line("}");
            }
            InstructionValue::ComputedStore {
                object,
                property,
                value: val,
                loc,
            } => {
                self.line("ComputedStore {");
                self.indent();
                self.format_place_field("object", object);
                self.format_place_field("property", property);
                self.format_place_field("value", val);
                self.line(&format!("loc: {}", format_loc(loc)));
                self.dedent();
                self.line("}");
            }
            InstructionValue::ComputedDelete {
                object,
                property,
                loc,
            } => {
                self.line("ComputedDelete {");
                self.indent();
                self.format_place_field("object", object);
                self.format_place_field("property", property);
                self.line(&format!("loc: {}", format_loc(loc)));
                self.dedent();
                self.line("}");
            }
            InstructionValue::LoadGlobal { binding, loc } => {
                self.line("LoadGlobal {");
                self.indent();
                self.line(&format!("binding: {}", format_non_local_binding(binding)));
                self.line(&format!("loc: {}", format_loc(loc)));
                self.dedent();
                self.line("}");
            }
            InstructionValue::StoreGlobal {
                name,
                value: val,
                loc,
            } => {
                self.line("StoreGlobal {");
                self.indent();
                self.line(&format!("name: \"{}\"", name));
                self.format_place_field("value", val);
                self.line(&format!("loc: {}", format_loc(loc)));
                self.dedent();
                self.line("}");
            }
            InstructionValue::FunctionExpression {
                name,
                name_hint,
                lowered_func,
                expr_type,
                loc,
            } => {
                self.line("FunctionExpression {");
                self.indent();
                self.line(&format!(
                    "name: {}",
                    match name {
                        Some(n) => format!("\"{}\"", n),
                        None => "null".to_string(),
                    }
                ));
                self.line(&format!(
                    "nameHint: {}",
                    match name_hint {
                        Some(h) => format!("\"{}\"", h),
                        None => "null".to_string(),
                    }
                ));
                self.line(&format!("type: \"{:?}\"", expr_type));
                self.line("loweredFunc:");
                let inner_func = &self.env.functions[lowered_func.func.0 as usize];
                if let Some(formatter) = inner_func_formatter {
                    formatter(self, inner_func);
                } else {
                    self.line(&format!("  <function {}>", lowered_func.func.0));
                }
                self.line(&format!("loc: {}", format_loc(loc)));
                self.dedent();
                self.line("}");
            }
            InstructionValue::ObjectMethod { loc, lowered_func } => {
                self.line("ObjectMethod {");
                self.indent();
                self.line("loweredFunc:");
                let inner_func = &self.env.functions[lowered_func.func.0 as usize];
                if let Some(formatter) = inner_func_formatter {
                    formatter(self, inner_func);
                } else {
                    self.line(&format!("  <function {}>", lowered_func.func.0));
                }
                self.line(&format!("loc: {}", format_loc(loc)));
                self.dedent();
                self.line("}");
            }
            InstructionValue::TaggedTemplateExpression {
                tag,
                value: val,
                loc,
            } => {
                self.line("TaggedTemplateExpression {");
                self.indent();
                self.format_place_field("tag", tag);
                self.line(&format!("raw: {}", format_js_string(&val.raw)));
                self.line(&format!(
                    "cooked: {}",
                    match &val.cooked {
                        Some(c) => format_js_string(c),
                        None => "undefined".to_string(),
                    }
                ));
                self.line(&format!("loc: {}", format_loc(loc)));
                self.dedent();
                self.line("}");
            }
            InstructionValue::TemplateLiteral {
                subexprs,
                quasis,
                loc,
            } => {
                self.line("TemplateLiteral {");
                self.indent();
                self.line("subexprs:");
                self.indent();
                for (i, sub) in subexprs.iter().enumerate() {
                    self.format_place_field(&format!("[{}]", i), sub);
                }
                self.dedent();
                self.line("quasis:");
                self.indent();
                for (i, q) in quasis.iter().enumerate() {
                    self.line(&format!(
                        "[{}] {{ raw: {}, cooked: {} }}",
                        i,
                        format_js_string(&q.raw),
                        match &q.cooked {
                            Some(c) => format_js_string(c),
                            None => "undefined".to_string(),
                        }
                    ));
                }
                self.dedent();
                self.line(&format!("loc: {}", format_loc(loc)));
                self.dedent();
                self.line("}");
            }
            InstructionValue::RegExpLiteral {
                pattern,
                flags,
                loc,
            } => {
                self.line(&format!(
                    "RegExpLiteral {{ pattern: \"{}\", flags: \"{}\", loc: {} }}",
                    pattern,
                    flags,
                    format_loc(loc)
                ));
            }
            InstructionValue::MetaProperty {
                meta,
                property,
                loc,
            } => {
                self.line(&format!(
                    "MetaProperty {{ meta: \"{}\", property: \"{}\", loc: {} }}",
                    meta,
                    property,
                    format_loc(loc)
                ));
            }
            InstructionValue::Await { value: val, loc } => {
                self.line("Await {");
                self.indent();
                self.format_place_field("value", val);
                self.line(&format!("loc: {}", format_loc(loc)));
                self.dedent();
                self.line("}");
            }
            InstructionValue::GetIterator { collection, loc } => {
                self.line("GetIterator {");
                self.indent();
                self.format_place_field("collection", collection);
                self.line(&format!("loc: {}", format_loc(loc)));
                self.dedent();
                self.line("}");
            }
            InstructionValue::IteratorNext {
                iterator,
                collection,
                loc,
            } => {
                self.line("IteratorNext {");
                self.indent();
                self.format_place_field("iterator", iterator);
                self.format_place_field("collection", collection);
                self.line(&format!("loc: {}", format_loc(loc)));
                self.dedent();
                self.line("}");
            }
            InstructionValue::NextPropertyOf { value: val, loc } => {
                self.line("NextPropertyOf {");
                self.indent();
                self.format_place_field("value", val);
                self.line(&format!("loc: {}", format_loc(loc)));
                self.dedent();
                self.line("}");
            }
            InstructionValue::Debugger { loc } => {
                self.line(&format!("Debugger {{ loc: {} }}", format_loc(loc)));
            }
            InstructionValue::PostfixUpdate {
                lvalue,
                operation,
                value: val,
                loc,
            } => {
                self.line("PostfixUpdate {");
                self.indent();
                self.format_place_field("lvalue", lvalue);
                self.line(&format!("operation: \"{}\"", operation));
                self.format_place_field("value", val);
                self.line(&format!("loc: {}", format_loc(loc)));
                self.dedent();
                self.line("}");
            }
            InstructionValue::PrefixUpdate {
                lvalue,
                operation,
                value: val,
                loc,
            } => {
                self.line("PrefixUpdate {");
                self.indent();
                self.format_place_field("lvalue", lvalue);
                self.line(&format!("operation: \"{}\"", operation));
                self.format_place_field("value", val);
                self.line(&format!("loc: {}", format_loc(loc)));
                self.dedent();
                self.line("}");
            }
            InstructionValue::StartMemoize {
                manual_memo_id,
                deps,
                deps_loc: _,
                has_invalid_deps: _,
                loc,
            } => {
                self.line("StartMemoize {");
                self.indent();
                self.line(&format!("manualMemoId: {}", manual_memo_id));
                match deps {
                    Some(d) => {
                        self.line("deps:");
                        self.indent();
                        for (i, dep) in d.iter().enumerate() {
                            let root_str = match &dep.root {
                                crate::ManualMemoDependencyRoot::Global { identifier_name } => {
                                    format!("Global(\"{}\")", identifier_name)
                                }
                                crate::ManualMemoDependencyRoot::NamedLocal {
                                    value: val,
                                    constant,
                                } => {
                                    format!(
                                        "NamedLocal({}, constant={})",
                                        val.identifier.0, constant
                                    )
                                }
                            };
                            let path_str: String = dep
                                .path
                                .iter()
                                .map(|p| {
                                    format!(
                                        "{}.{}",
                                        if p.optional { "?" } else { "" },
                                        format_property_literal(&p.property)
                                    )
                                })
                                .collect();
                            self.line(&format!("[{}] {}{}", i, root_str, path_str));
                        }
                        self.dedent();
                    }
                    None => self.line("deps: null"),
                }
                self.line(&format!("loc: {}", format_loc(loc)));
                self.dedent();
                self.line("}");
            }
            InstructionValue::FinishMemoize {
                manual_memo_id,
                decl,
                pruned,
                loc,
            } => {
                self.line("FinishMemoize {");
                self.indent();
                self.line(&format!("manualMemoId: {}", manual_memo_id));
                self.format_place_field("decl", decl);
                self.line(&format!("pruned: {}", pruned));
                self.line(&format!("loc: {}", format_loc(loc)));
                self.dedent();
                self.line("}");
            }
        }
    }

    // =========================================================================
    // Errors
    // =========================================================================

    pub fn format_errors(&mut self, error: &CompilerError) {
        if error.details.is_empty() {
            self.line("Errors: []");
            return;
        }
        self.line("Errors:");
        self.indent();
        for (i, detail) in error.details.iter().enumerate() {
            self.line(&format!("[{}] {{", i));
            self.indent();
            match detail {
                CompilerErrorOrDiagnostic::Diagnostic(d) => {
                    self.line(&format!("severity: {:?}", d.severity()));
                    self.line(&format!("reason: {:?}", d.reason));
                    self.line(&format!(
                        "description: {}",
                        match &d.description {
                            Some(desc) => format!("{:?}", desc),
                            None => "null".to_string(),
                        }
                    ));
                    self.line(&format!("category: {:?}", d.category));
                    let loc = d.primary_location();
                    self.line(&format!(
                        "loc: {}",
                        match loc {
                            Some(l) => format_loc_value(l),
                            None => "null".to_string(),
                        }
                    ));
                }
                CompilerErrorOrDiagnostic::ErrorDetail(d) => {
                    self.line(&format!("severity: {:?}", d.severity()));
                    self.line(&format!("reason: {:?}", d.reason));
                    self.line(&format!(
                        "description: {}",
                        match &d.description {
                            Some(desc) => format!("{:?}", desc),
                            None => "null".to_string(),
                        }
                    ));
                    self.line(&format!("category: {:?}", d.category));
                    self.line(&format!(
                        "loc: {}",
                        match &d.loc {
                            Some(l) => format_loc_value(l),
                            None => "null".to_string(),
                        }
                    ));
                }
            }
            self.dedent();
            self.line("}");
        }
        self.dedent();
    }
}
