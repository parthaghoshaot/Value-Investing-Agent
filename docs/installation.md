# Installation Guide

## Prerequisites

- **Node.js** version 18.0.0 or higher
- **npm** (comes with Node.js)
- **Claude Desktop** or **Claude Code** for using the MCP server

## Installation Options

### Option 1: npx (Recommended for Quick Start)

The easiest way to use Value Investing Agent - no installation required:

1. Open your Claude Desktop configuration file:
   - **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
   - **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

2. Add the server configuration:

```json
{
  "mcpServers": {
    "value-investing-agent": {
      "command": "npx",
      "args": ["-y", "value-investing-agent"]
    }
  }
}
```

3. Restart Claude Desktop

### Option 2: Global Installation

For faster startup and offline use:

```bash
npm install -g value-investing-agent
```

Configuration:

```json
{
  "mcpServers": {
    "value-investing-agent": {
      "command": "value-investing-agent"
    }
  }
}
```

### Option 3: From Source (For Development)

```bash
# Clone the repository
git clone https://github.com/yourname/value-investing-agent.git
cd value-investing-agent

# Install dependencies
npm install

# Build the project
npm run build

# Optional: Link globally for testing
npm link
```

Configuration:

```json
{
  "mcpServers": {
    "value-investing-agent": {
      "command": "node",
      "args": ["/absolute/path/to/value-investing-agent/dist/index.js"]
    }
  }
}
```

## Environment Variables

Create a `.env` file in the project root (copy from `.env.example`):

```bash
# Optional: Finnhub API Key for news
# Get free key at: https://finnhub.io/register
FINNHUB_API_KEY=your_key_here

# Optional: Alpha Vantage API Key
# Get free key at: https://www.alphavantage.co/support/#api-key
ALPHA_VANTAGE_API_KEY=your_key_here

# Optional: Custom data directory
DATA_DIR=./data

# Optional: Cache TTL in minutes
CACHE_TTL_MINUTES=60

# Optional: Default report language (en or zh)
DEFAULT_LANGUAGE=en
```

## Verifying Installation

After configuring Claude Desktop, restart and try:

```
"List available data providers"
```

You should see a list of providers including `yahoo-finance` as the default.

## Troubleshooting

### "Command not found"

Make sure Node.js is in your PATH:

```bash
node --version  # Should print v18.x.x or higher
```

### "Permission denied"

On macOS/Linux, you may need to fix permissions:

```bash
chmod +x /path/to/value-investing-agent/dist/index.js
```

### Server not responding

Check the Claude Desktop logs:
- **macOS:** `~/Library/Logs/Claude/`
- **Windows:** `%APPDATA%\Claude\logs\`

### Rate limiting from Yahoo Finance

The default Yahoo Finance provider may rate limit requests. Solutions:

1. Enable caching (default is on)
2. Reduce request frequency
3. Switch to Alpha Vantage provider with API key

## Updating

### npx

Always uses the latest version automatically.

### Global install

```bash
npm update -g value-investing-agent
```

### From source

```bash
git pull
npm install
npm run build
```

## Uninstalling

### Global install

```bash
npm uninstall -g value-investing-agent
```

### From source

Simply remove the cloned directory and update your Claude configuration.
