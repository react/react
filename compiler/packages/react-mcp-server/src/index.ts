/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {StdioServerTransport} from '@modelcontextprotocol/sdk/server/stdio.js';
import {z} from 'zod/v4';
import {compile, type PrintedCompilerPipelineValue} from './compiler';
import {
  CompilerPipelineValue,
  printReactiveFunctionWithOutlined,
  printFunctionWithOutlined,
  PluginOptions,
  SourceLocation,
} from 'babel-plugin-react-compiler/src';
import * as cheerio from 'cheerio';
import {queryAlgolia} from './utils/algolia';
import assertExhaustive from './utils/assertExhaustive';
import {convert} from 'html-to-text';
import {measurePerformance} from './tools/runtimePerf';
import {parseReactComponentTree} from './tools/componentTree';

function calculateMean(values: number[]): string {
  return values.length > 0
    ? values.reduce((acc, curr) => acc + curr, 0) / values.length + 'ms'
    : 'could not collect';
}

const server = new McpServer({
  name: 'React',
  version: '0.0.0',
});

server.tool(
  'query-react-dev-docs',
  'This tool lets you search for official docs from react.dev. This always has the most up to date information on React. You can look for documentation on APIs such as <ViewTransition>, <Activity>, and hooks like useOptimistic, useSyncExternalStore, useTransition, and more. Whenever you think hard about React, use this tool to get more information before proceeding.',
  {
    query: z.string(),
  },
  async ({query}) => {
    try {
      const pages = await queryAlgolia(query);
      if (pages.length === 0) {
        return {
          content: [{type: 'text' as const, text: `No results`}],
        };
      }
      const content = pages.map(html => {
        const $ = cheerio.load(html);
        // react.dev should always have at least one <article> with the main content
        const article = $('article').html();
        if (article != null) {
          return {
            type: 'text' as const,
            text: convert(article),
          };
        } else {
          return {
            type: 'text' as const,
            // Fallback to converting the whole page to text.
            text: convert($.html()),
          };
        }
      });
      return {
        content,
      };
    } catch (err) {
      return {
        isError: true,
        content: [{type: 'text' as const, text: `Error: ${err.stack}`}],
      };
    }
  },
);

server.tool(
  'compile',
  `Compile code with React Compiler. This tool will return the compiled output, which is automatically memoized React components and hooks, written in JavaScript or TypeScript. You can run this tool whenever you want to check if some React code will compile successfully. You can also run this tool every time you make a suggestion to code, to see how it affects the compiled output. If the compiler returns a diagnostic message, you should read the diagnostic message and try to fix the code and run the compiler again to verify. After compiling code successfully, you should run it through the review-react-runtime to verify the compiled code is faster than the original.

  <bailouts>
  When you encounter a bailout or diagnostic message, first think and try to understand where the error is coming from. You can use tools such as puppeteer if available to browse the documentation links provided in the diagnostic, and then read that information to understand the error in more detail. You can propose fixes after doing so.

  This is a non-exhaustive list of bailouts where you should take specific actions:
  - React Compiler has skipped optimizing this component because the existing manual memoization could not be preserved: fix this by first removing the manual memo (useMemo/useCallback) and then try compiling again. use the review-react-runtime tool to verify that the compiled code can run without crashing. if it crashes, the original code likely breaks the Rules of React and so cannot be safely compiled.
  </bailouts>
  `,
  {
    text: z.string(),
    passName: z.enum(['HIR', 'ReactiveFunction', 'All', '@DEBUG']).optional(),
  },
  async ({text, passName}) => {
    const pipelinePasses = new Map<
      string,
      Array<PrintedCompilerPipelineValue>
    >();
    const recordPass: (
      result: PrintedCompilerPipelineValue,
    ) => void = result => {
      const entry = pipelinePasses.get(result.name);
      if (Array.isArray(entry)) {
        entry.push(result);
      } else {
        pipelinePasses.set(result.name, [result]);
      }
    };
    const logIR = (result: CompilerPipelineValue): void => {
      switch (result.kind) {
        case 'ast': {
          break;
        }
        case 'hir': {
          recordPass({
            kind: 'hir',
            fnName: result.value.id,
            name: result.name,
            value: printFunctionWithOutlined(result.value),
          });
          break;
        }
        case 'reactive': {
          recordPass({
            kind: 'reactive',
            fnName: result.value.id,
            name: result.name,
            value: printReactiveFunctionWithOutlined(result.value),
          });
          break;
        }
        case 'debug': {
          recordPass({
            kind: 'debug',
            fnName: null,
            name: result.name,
            value: result.value,
          });
          break;
        }
        default: {
          assertExhaustive(result, `Unhandled result ${result}`);
        }
      }
    };
    const errors: Array<{message: string; loc: SourceLocation | null}> = [];
    const compilerOptions: PluginOptions = {
      panicThreshold: 'none',
      logger: {
        debugLogIRs: logIR,
        logEvent: (_filename, event): void => {
          if (event.kind === 'CompileError') {
            const detail = event.detail;
            const loc =
              detail.loc == null || typeof detail.loc == 'symbol'
                ? event.fnLoc
                : detail.loc;
            errors.push({
              message: detail.reason,
              loc,
            });
          }
        },
      },
    };
    try {
      const result = await compile({
        text,
        file: 'anonymous.tsx',
        options: compilerOptions,
      });
      if (result.code == null) {
        return {
          isError: true,
          content: [{type: 'text' as const, text: 'Error: Could not compile'}],
        };
      }
      const requestedPasses: Array<{type: 'text'; text: string}> = [];
      if (passName != null) {
        switch (passName) {
          case 'All': {
            const hir = pipelinePasses.get('PropagateScopeDependenciesHIR');
            if (hir !== undefined) {
              for (const pipelineValue of hir) {
                requestedPasses.push({
                  type: 'text' as const,
                  text: pipelineValue.value,
                });
              }
            }
            const reactiveFunc = pipelinePasses.get('PruneHoistedContexts');
            if (reactiveFunc !== undefined) {
              for (const pipelineValue of reactiveFunc) {
                requestedPasses.push({
                  type: 'text' as const,
                  text: pipelineValue.value,
                });
              }
            }
            break;
          }
          case 'HIR': {
            // Last pass before HIR -> ReactiveFunction
            const requestedPass = pipelinePasses.get(
              'PropagateScopeDependenciesHIR',
            );
            if (requestedPass !== undefined) {
              for (const pipelineValue of requestedPass) {
                requestedPasses.push({
                  type: 'text' as const,
                  text: pipelineValue.value,
                });
              }
            } else {
              console.error(`Could not find requested pass ${passName}`);
            }
            break;
          }
          case 'ReactiveFunction': {
            // Last pass
            const requestedPass = pipelinePasses.get('PruneHoistedContexts');
            if (requestedPass !== undefined) {
              for (const pipelineValue of requestedPass) {
                requestedPasses.push({
                  type: 'text' as const,
                  text: pipelineValue.value,
                });
              }
            } else {
              console.error(`Could not find requested pass ${passName}`);
            }
            break;
          }
          case '@DEBUG': {
            for (const [, pipelinePass] of pipelinePasses) {
              for (const pass of pipelinePass) {
                requestedPasses.push({
                  type: 'text' as const,
                  text: `${pass.name}\n\n${pass.value}`,
                });
              }
            }
            break;
          }
          default: {
            assertExhaustive(
              passName,
              `Unhandled passName option: ${passName}`,
            );
          }
        }
        const requestedPass = pipelinePasses.get(passName);
        if (requestedPass !== undefined) {
          for (const pipelineValue of requestedPass) {
            if (pipelineValue.name === passName) {
              requestedPasses.push({
                type: 'text' as const,
                text: pipelineValue.value,
              });
            }
          }
        }
      }
      if (errors.length > 0) {
        return {
          content: errors.map(err => {
            return {
              type: 'text' as const,
              text:
                err.loc === null || typeof err.loc === 'symbol'
                  ? `React Compiler bailed out:\n\n${err.message}`
                  : `React Compiler bailed out:\n\n${err.message}@${err.loc.start.line}:${err.loc.end.line}`,
            };
          }),
        };
      }
      return {
        content: [
          {type: 'text' as const, text: result.code},
          ...requestedPasses,
        ],
      };
    } catch (err) {
      return {
        isError: true,
        content: [{type: 'text' as const, text: `Error: ${err.stack}`}],
      };
    }
  },
);

server.tool(
  'review-react-runtime',
  `Run this tool every time you propose a performance related change to verify if your suggestion actually improves performance.

  <requirements>
  This tool has some requirements on the code input:
  - The react code that is passed into this tool MUST contain an App functional component without arrow function.
  - DO NOT export anything since we can't parse export syntax with this tool.
  - Only import React from 'react' and use all hooks and imports using the React. prefix like React.useState and React.useEffect
  </requirements>

  <goals>
  - LCP - loading speed: good ≤ 2.5 s, needs-improvement 2.5-4 s, poor > 4 s
  - INP - input responsiveness: good ≤ 200 ms, needs-improvement 200-500 ms, poor > 500 ms
  - CLS - visual stability: good ≤ 0.10, needs-improvement 0.10-0.25, poor > 0.25
  - (Optional: FCP ≤ 1.8 s, TTFB ≤ 0.8 s)
  </goals>

  <evaluation>
  Classify each metric with the thresholds above. Identify the worst category in the order poor > needs-improvement > good.
  </evaluation>

  <iterate>
  (repeat until every metric is good or two consecutive cycles show no gain)
  - Always run the tool once on the original code before any modification
  - Run the tool again after making the modification, and apply one focused change based on the failing metric plus React-specific guidance:
    - LCP: lazy-load off-screen images, inline critical CSS, preconnect, use React.lazy + Suspense for below-the-fold modules. if the user requests for it, use React Server Components for static content (Server Components).
    - INP: wrap non-critical updates in useTransition, avoid calling setState inside useEffect.
    - CLS: reserve space via explicit width/height or aspect-ratio, keep stable list keys, use fixed-size skeleton loaders, animate only transform/opacity, avoid inserting ads or banners without placeholders.
  - Compare the results of your modified code compared to the original to verify that your changes have improved performance.
  </iterate>
  `,
  {
    text: z.string(),
    iterations: z.number().optional().default(2),
  },
  async ({text, iterations}) => {
    try {
      const results = await measurePerformance(text, iterations);
      const formattedResults = `
# React Component Performance Results

## Mean Render Time
${calculateMean(results.renderTime)}

## Mean Web Vitals
- Cumulative Layout Shift (CLS): ${calculateMean(results.webVitals.cls)}
- Largest Contentful Paint (LCP): ${calculateMean(results.webVitals.lcp)}
- Interaction to Next Paint (INP): ${calculateMean(results.webVitals.inp)}

## Mean React Profiler
- Actual Duration: ${calculateMean(results.reactProfiler.actualDuration)}
- Base Duration: ${calculateMean(results.reactProfiler.baseDuration)}
`;

      return {
        content: [
          {
            type: 'text' as const,
            text: formattedResults,
          },
        ],
      };
    } catch (error) {
      return {
        isError: true,
        content: [
          {
            type: 'text' as const,
            text: `Error measuring performance: ${error.message}\n\n${error.stack}`,
          },
        ],
      };
    }
  },
);

server.tool(
  'parse-react-component-tree',
  `
  This tool gets the component tree of a React App.
  passing in a url will attempt to connect to the browser and get the current state of the component tree. If no url is passed in,
  the default url will be used (http://localhost:3000).

  <requirements>
  - The url should be a full url with the protocol (http:// or https://) and the domain name (e.g. localhost:3000).
  - Also the user should be running a Chrome browser running on debug mode on port 9222. If you receive an error message, advise the user to run
  the following comand in the terminal:
  MacOS: "/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-debugging-port=9222 --user-data-dir=/tmp/chrome"
  Windows: "chrome.exe --remote-debugging-port=9222 --user-data-dir=C:\temp\chrome"
  </requirements>
  `,
  {
    url: z.string().optional().default('http://localhost:3000'),
  },
  async ({url}) => {
    try {
      const componentTree = await parseReactComponentTree(url);

      return {
        content: [
          {
            type: 'text' as const,
            text: componentTree,
          },
        ],
      };
    } catch (err) {
      return {
        isError: true,
        content: [{type: 'text' as const, text: `Error: ${err.stack}`}],
      };
    }
  },
);

server.prompt('review-react-code', () => ({
  messages: [
    {
      role: 'assistant',
      content: {
        type: 'text',
        text: `
## Role
You are a React assistant that helps users write more efficient and optimizable React code. You specialize in identifying patterns that enable React Compiler to automatically apply optimizations, reducing unnecessary re-renders and improving application performance.

## Follow these guidelines in all code you produce and suggest
Use functional components with Hooks: Do not generate class components or use old lifecycle methods. Manage state with useState or useReducer, and side effects with useEffect (or related Hooks). Always prefer functions and Hooks for any new component logic.

Keep components pure and side-effect-free during rendering: Do not produce code that performs side effects (like subscriptions, network requests, or modifying external variables) directly inside the component's function body. Such actions should be wrapped in useEffect or performed in event handlers. Ensure your render logic is a pure function of props and state.

Respect one-way data flow: Pass data down through props and avoid any global mutations. If two components need to share data, lift that state up to a common parent or use React Context, rather than trying to sync local state or use external variables.

Never mutate state directly: Always generate code that updates state immutably. For example, use spread syntax or other methods to create new objects/arrays when updating state. Do not use assignments like state.someValue = ... or array mutations like array.push() on state variables. Use the state setter (setState from useState, etc.) to update state.

Accurately use useEffect and other effect Hooks: whenever you think you could useEffect, think and reason harder to avoid it. useEffect is primarily only used for synchronization, for example synchronizing React with some external state. IMPORTANT - Don't setState (the 2nd value returned by useState) within a useEffect as that will degrade performance. When writing effects, include all necessary dependencies in the dependency array. Do not suppress ESLint rules or omit dependencies that the effect's code uses. Structure the effect callbacks to handle changing values properly (e.g., update subscriptions on prop changes, clean up on unmount or dependency change). If a piece of logic should only run in response to a user action (like a form submission or button click), put that logic in an event handler, not in a useEffect. Where possible, useEffects should return a cleanup function.

Follow the Rules of Hooks: Ensure that any Hooks (useState, useEffect, useContext, custom Hooks, etc.) are called unconditionally at the top level of React function components or other Hooks. Do not generate code that calls Hooks inside loops, conditional statements, or nested helper functions. Do not call Hooks in non-component functions or outside the React component rendering context.

Use refs only when necessary: Avoid using useRef unless the task genuinely requires it (such as focusing a control, managing an animation, or integrating with a non-React library). Do not use refs to store application state that should be reactive. If you do use refs, never write to or read from ref.current during the rendering of a component (except for initial setup like lazy initialization). Any ref usage should not affect the rendered output directly.

Prefer composition and small components: Break down UI into small, reusable components rather than writing large monolithic components. The code you generate should promote clarity and reusability by composing components together. Similarly, abstract repetitive logic into custom Hooks when appropriate to avoid duplicating code.

Optimize for concurrency: Assume React may render your components multiple times for scheduling purposes (especially in development with Strict Mode). Write code that remains correct even if the component function runs more than once. For instance, avoid side effects in the component body and use functional state updates (e.g., setCount(c => c + 1)) when updating state based on previous state to prevent race conditions. Always include cleanup functions in effects that subscribe to external resources. Don't write useEffects for "do this when this changes" side-effects. This ensures your generated code will work with React's concurrent rendering features without issues.

Optimize to reduce network waterfalls - Use parallel data fetching wherever possible (e.g., start multiple requests at once rather than one after another). Leverage Suspense for data loading and keep requests co-located with the component that needs the data. In a server-centric approach, fetch related data together in a single request on the server side (using Server Components, for example) to reduce round trips. Also, consider using caching layers or global fetch management to avoid repeating identical requests.

Rely on React Compiler - useMemo, useCallback, and React.memo can be omitted if React Compiler is enabled. Avoid premature optimization with manual memoization. Instead, focus on writing clear, simple components with direct data flow and side-effect-free render functions. Let the React Compiler handle tree-shaking, inlining, and other performance enhancements to keep your code base simpler and more maintainable.

Design for a good user experience - Provide clear, minimal, and non-blocking UI states. When data is loading, show lightweight placeholders (e.g., skeleton screens) rather than intrusive spinners everywhere. Handle errors gracefully with a dedicated error boundary or a friendly inline message. Where possible, render partial data as it becomes available rather than making the user wait for everything. Suspense allows you to declare the loading states in your component tree in a natural way, preventing “flash” states and improving perceived performance.

Server Components - Shift data-heavy logic to the server whenever possible. Break up the more static parts of the app into server components. Break up data fetching into server components. Only client components (denoted by the 'use client' top level directive) need interactivity. By rendering parts of your UI on the server, you reduce the client-side JavaScript needed and avoid sending unnecessary data over the wire. Use Server Components to prefetch and pre-render data, allowing faster initial loads and smaller bundle sizes. This also helps manage or eliminate certain waterfalls by resolving data on the server before streaming the HTML (and partial React tree) to the client.

## Available Tools
- 'docs': Look up documentation from react.dev. Returns text as a string.
- 'compile': Run the user's code through React Compiler. Returns optimized JS/TS code with potential diagnostics.

## Process
1. Analyze the user's code for optimization opportunities:
   - Check for React anti-patterns that prevent compiler optimization
   - Identify unnecessary manual optimizations (useMemo, useCallback, React.memo) that the compiler can handle
   - Look for component structure issues that limit compiler effectiveness
   - Think about each suggestion you are making and consult React docs using the docs://{query} resource for best practices

2. Use React Compiler to verify optimization potential:
   - Run the code through the compiler and analyze the output
   - You can run the compiler multiple times to verify your work
   - Check for successful optimization by looking for const $ = _c(n) cache entries, where n is an integer
   - Identify bailout messages that indicate where code could be improved
   - Compare before/after optimization potential

3. Provide actionable guidance:
   - Explain specific code changes with clear reasoning
   - Show before/after examples when suggesting changes
   - Include compiler results to demonstrate the impact of optimizations
   - Only suggest changes that meaningfully improve optimization potential

## Optimization Guidelines
- Avoid mutation of values that are memoized by the compiler
- State updates should be structured to enable granular updates
- Side effects should be isolated and dependencies clearly defined
- The compiler automatically inserts memoization, so manually added useMemo/useCallback/React.memo can often be removed

## Understanding Compiler Output
- Successful optimization adds import { c as _c } from "react/compiler-runtime";
- Successful optimization initializes a constant sized cache with const $ = _c(n), where n is the size of the cache as an integer
- When suggesting changes, try to increase or decrease the number of cached expressions (visible in const $ = _c(n))
  - Increase: more memoization coverage
  - Decrease: if there are unnecessary dependencies, less dependencies mean less re-rendering
`,
      },
    },
  ],
}));

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('React Compiler MCP Server running on stdio');
}

main().catch(error => {
  console.error('Fatal error in main():', error);
  process.exit(1);
});
