# React Compiler — Goals, Design Principles, and Architecture

This document describes the goals, design principles, and high-level architecture of React Compiler. See the code for specifics of the data structures and compiler passes.

## Goals

The idea of React Compiler is to allow developers to use React's familiar declarative, component-based programming model, while ensuring that apps are fast by default. Concretely we seek to achieve the following goals:

* Bound the amount of re-rendering that happens on updates to ensure that apps have predictably fast performance by default.
* Keep startup time neutral with pre-React Compiler performance. Notably, this means holding code size increases and memoization overhead low enough to not impact startup.
* Retain React's familiar declarative, component-oriented programming model. i.e, the solution should not fundamentally change how developers think about writing React, and should generally _remove_ concepts (the need to use React.memo(), useMemo(), and useCallback()) rather than introduce new concepts.
* "Just work" on idiomatic React code that follows React's rules (pure render functions, the rules of hooks, etc).
* Support typical debugging and profiling tools and workflows.
* Be predictable and understandable enough by React developers — i.e. developers should be able to quickly develop a rough intuition of how React Compiler works.
* Not require explicit annotations (types or otherwise) for typical product code. We may provide features that allow developers to opt-in to using type information to enable additional optimizations, but the compiler should work well without type information or other annotations.

## Non-Goals

The following are explicitly *not* goals for React Compiler:

* Provide perfectly optimal re-rendering with zero unnecessary recomputation. This is a non-goal for several reasons:
  * The runtime overhead of the extra tracking involved can outweigh the cost of recomputation in many cases.
  * In cases with conditional dependencies it may not be possible to avoid recomputing some/all instructions.
  * The amount of code may regress startup times, which would conflict with our goal of neutral startup performance.
* Support code that violates React's rules. React's rules exist to help developers build robust, scalable applications and form a contract that allows us to continue improving React without breaking applications. React Compiler depends on these rules to safely transform code, and violations of rules will therefore break React Compiler's optimizations.
* Support legacy React features. Notably we will not support class components due to their inherent mutable state being shared across multiple methods with complex lifetimes and data flow.
* Support 100% of the JavaScript language. In particular, we will not support rarely used features and/or features which are known to be unsafe or which cannot be modeled soundly. For example, nested classes that capture values from their closure are difficult to model accurately because of mutability, and `eval()` is unsafe. We aim to support the vast majority of JavaScript code (and the TypeScript and Flow dialects)

## Design Principles

Many aspects of the design follow naturally from the above goals:

* The compiler output must be high-level code that retains not just the semantics of the input but also is expressed using similar constructs to the input. For example, rather than convert logical expressions (`a ?? b`) into an `if` statement, we retain the high-level form of the logical expression. Rather than convert all looping constructs to a single form, we retain the original form of the loop. This follows from our goals:
  * High-level code is more compact, and helps reduce the impact of compilation on application size.
  * High-level constructs that match what the developer wrote are easier to debug.
* From the above, it then follows that the compiler's internal representation must also be high-level enough to be able to output the original high-level constructs. The internal representation is what we call a High-level Intermediate Representation (HIR) — a name borrowed from Rust Compiler. However, React Compiler's HIR is perhaps even more suited to this name, as it retains high-level information (distinguishing if vs logical vs ternary, or for vs while vs for..of) but also represents code as a control-flow graph with no nesting.

## Architecture

React Compiler has two primary public interfaces: a Babel plugin for transforming code, and an ESLint plugin for reporting violations of the Rules of React. Internally, both use the same core compiler logic.

The core of the compiler is largely decoupled from Babel, using its own intermediate representations. The high-level flow is as follows:

- **Babel Plugin**: Determines which functions in a file should be compiled, based on the plugin options and any local opt-in/opt-out directives. For each component or hook to be compiled, the plugin calls the compiler, passing in the original function and getting back a new AST node which will replace the original.
- **Lowering** (BuildHIR): The first step of the compiler is to convert the Babel AST into React Compiler's primary intermediate representation, HIR (High-level Intermediate Representation). This phase is primarily based on the AST itself, but currently leans on Babel to resolve identifiers. The HIR preserves the precise order-of-evaluation semantics of JavaScript, resolves break/continue to their jump points, etc. The resulting HIR forms a control-flow graph of basic blocks, each of which contains zero or more consecutive instructions followed by a terminal. The basic blocks are stored in reverse postorder, such that forward iteration of the blocks allows predecessors to be visited before successors _unless_ there is a "back edge" (i.e. a loop).
- **SSA Conversion** (EnterSSA): The HIR is converted to HIR form, such that all Identifiers in the HIR are updated to an SSA-based identifier.
- Validation: We run various validation passes to check that the input is valid React, i.e. that it does not break the rules. This includes looking for conditional hook calls, unconditional setState calls, etc.
- **Optimization**: Various passes such as dead code elimination and constant propagation can generally improve performance and reduce the amount of instructions to be optimized later.
- **Type Inference** (InferTypes): We run a conservative type inference pass to identify certain key types of data that may appear in the program that are relevant for further analysis, such as which values are hooks, primitives, etc. 
- **Inferring Reactive Scopes**: Several passes are involved in determining groups of values that are created/mutated together and the set of instructions involved in creating/mutating those values. We call these groups "reactive scopes", and each can have one or more declarations (or occasionally a reassignment).
- **Constructing/Optimizing Reactive Scopes**: Once the compiler determines the set of reactive scopes, it then transforms the program to make these scopes explicit in the HIR. The code is later converted to a ReactiveFunction, which is a hybrid of the HIR and an AST. Scopes are further pruned and transformed. For example, the compiler cannot make hook calls conditional, so any reactive scopes that contain a hook call must be pruned. If two consecutive scopes will always invalidate together, we attempt to merge them to reduce overhead, etc.
- **Codegen**: Finally, the ReactiveFunction hybrid HIR/AST is converted back to a raw Babel AST node, and returned to the Babel plugin.
- **Babel Plugin**: The Babel plugin replaces the original node with the new version.

The ESLint plugin works similarly. For now, it effectively invokes the Babel plugin on the code and reports back a subset of the errors. The compiler can report a variety of errors, including that the code is simply invalid JavaScript, but the ESLint plugin filters to only show the React-specific errors.
