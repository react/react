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
