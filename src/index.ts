#!/usr/bin/env node
/**
 * Value Investing Agent
 *
 * An AI-powered MCP server for value investors.
 * Analyze stocks using principles from Benjamin Graham and Warren Buffett.
 *
 * @see https://github.com/yourname/value-investing-agent
 */

import { runServer } from './server.js';

// Run the server
runServer().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
