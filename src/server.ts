/**
 * MCP Server Configuration and Initialization
 *
 * Sets up the Model Context Protocol server with all tools registered.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type Tool,
} from '@modelcontextprotocol/sdk/types.js';

import { createLogger } from './utils/logger.js';
import { loadConfig } from './config/index.js';
import { setProvider, getProvider } from './providers/index.js';

// Import tool handlers
import { toolDefinitions, handleToolCall } from './tools/index.js';

const logger = createLogger('server');

const REDACTED_VALUE = '***REDACTED***';
const SENSITIVE_KEY_PATTERN = /(apiKey|apikey|token|secret|password)/i;

function redactSecrets(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => redactSecrets(item));
  }

  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>);
    return entries.reduce<Record<string, unknown>>((acc, [key, val]) => {
      if (SENSITIVE_KEY_PATTERN.test(key)) {
        acc[key] = REDACTED_VALUE;
      } else {
        acc[key] = redactSecrets(val);
      }
      return acc;
    }, {});
  }

  return value;
}

/**
 * Create and configure the MCP server
 */
export function createServer(): Server {
  const server = new Server(
    {
      name: 'value-investing-agent',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // Register tool listing handler
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    logger.debug('Listing tools');
    return {
      tools: toolDefinitions as Tool[],
    };
  });

  // Register tool call handler
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    logger.info(`Tool call: ${name}`, redactSecrets(args));

    try {
      const result = await handleToolCall(name, args || {});
      return {
        content: [
          {
            type: 'text',
            text: typeof result === 'string' ? result : JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Tool ${name} failed`, error);
      return {
        content: [
          {
            type: 'text',
            text: `Error: ${errorMessage}`,
          },
        ],
        isError: true,
      };
    }
  });

  return server;
}

/**
 * Initialize the server with configuration
 */
export async function initializeServer(): Promise<Server> {
  logger.info('Initializing Value Investing Agent...');

  // Load configuration
  const config = loadConfig();
  logger.debug('Configuration loaded', redactSecrets(config));

  // Initialize provider
  try {
    await setProvider(config.provider.name, {
      name: config.provider.name,
      apiKey: config.provider.apiKey || undefined,
    });
    logger.info(`Data provider initialized: ${config.provider.name}`);
  } catch (error) {
    logger.warn(`Failed to initialize provider ${config.provider.name}, using default`, error);
    // Default provider (yahoo-finance) will be used
  }

  // Create server
  const server = createServer();
  logger.info('Server created successfully');

  return server;
}

/**
 * Run the MCP server
 */
export async function runServer(): Promise<void> {
  const server = await initializeServer();
  const transport = new StdioServerTransport();

  logger.info('Starting MCP server on stdio...');

  await server.connect(transport);

  logger.info('Value Investing Agent is running');

  // Handle shutdown
  process.on('SIGINT', async () => {
    logger.info('Shutting down...');
    await server.close();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    logger.info('Shutting down...');
    await server.close();
    process.exit(0);
  });
}
