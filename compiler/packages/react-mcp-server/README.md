# React MCP Server (experimental)

An experimental MCP Server for React.

## Development

First, add this file if you're using Claude Desktop: `code ~/Library/Application\ Support/Claude/claude_desktop_config.json`. Copy the absolute path from `which node` and from `react/compiler/react-mcp-server/dist/index.js` and paste, for example:

```json
{
  "mcpServers": {
    "react": {
      "command": "/Users/<username>/.asdf/shims/node",
      "args": [
        "/Users/<username>/code/react/compiler/packages/react-mcp-server/dist/index.js"
      ]
    }
  }
}
```

Next, run `yarn workspace react-mcp-server watch` from the `react/compiler` directory and make changes as needed. You will need to restart Claude everytime you want to try your changes.

## Testing

Run `yarn workspace react-mcp-server test` to execute the Jest unit tests in `src/**/__tests__/`. The package uses `ts-jest` and `jest.config.js` to transpile TypeScript on the fly.

## Tools

The server exposes the following tools to MCP clients:

- **`query-react-dev-docs`** — Search react.dev docs via Algolia. Use to look up APIs (`useTransition`, `<ViewTransition>`, etc.) before making recommendations.
- **`compile`** — Compile a snippet with React Compiler. Returns the compiled output and, on failure, diagnostic messages. Use to verify a change before suggesting it.
- **`explain-compiler-diagnostic`** — Explain a diagnostic message returned by `compile` in plain English. Returns a structured object with `title`, `summary`, `why_it_happens`, `how_to_fix`, an optional `code_example`, `severity`, and `related_links`. Falls back to a generic guidance string when no curated explanation matches.
- **`review-react-runtime`** — Measure render time, Web Vitals (LCP/INP/CLS), and React Profiler metrics for a snippet. Use to verify a performance change actually helps.
- **`parse-react-component-tree`** — Connect to a running Chrome instance (debug port 9222) and return the React component tree at a given URL.

It also exposes a single prompt, **`review-react-code`**, which embeds the React + React Compiler guidelines a model should follow when reviewing a snippet.
