/**
 * Logging Utility
 *
 * Simple logging with consistent formatting.
 * Logs to stderr to keep stdout clean for MCP communication.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

// Current log level (can be set via environment)
let currentLevel: LogLevel = (process.env.LOG_LEVEL as LogLevel) || 'info';

/**
 * Set the current log level
 */
export function setLogLevel(level: LogLevel): void {
  currentLevel = level;
}

/**
 * Get the current log level
 */
export function getLogLevel(): LogLevel {
  return currentLevel;
}

/**
 * Format log message
 */
function formatMessage(level: LogLevel, component: string, message: string): string {
  const timestamp = new Date().toISOString();
  const levelUpper = level.toUpperCase().padEnd(5);
  return `[${timestamp}] ${levelUpper} [${component}] ${message}`;
}

/**
 * Check if level should be logged
 */
function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[currentLevel];
}

/**
 * Log to stderr
 */
function log(level: LogLevel, component: string, message: string, data?: unknown): void {
  if (!shouldLog(level)) return;

  const formatted = formatMessage(level, component, message);

  if (data !== undefined) {
    const dataStr = typeof data === 'object' ? JSON.stringify(data, null, 2) : String(data);
    console.error(`${formatted}\n${dataStr}`);
  } else {
    console.error(formatted);
  }
}

/**
 * Create a logger for a specific component
 */
export function createLogger(component: string) {
  return {
    debug: (message: string, data?: unknown) => log('debug', component, message, data),
    info: (message: string, data?: unknown) => log('info', component, message, data),
    warn: (message: string, data?: unknown) => log('warn', component, message, data),
    error: (message: string, data?: unknown) => log('error', component, message, data),
  };
}

/**
 * Default logger
 */
export const logger = createLogger('app');

/**
 * Log execution time of an async function
 */
export async function logExecutionTime<T>(
  name: string,
  fn: () => Promise<T>,
  componentLogger = logger
): Promise<T> {
  const start = Date.now();
  componentLogger.debug(`Starting ${name}`);

  try {
    const result = await fn();
    const duration = Date.now() - start;
    componentLogger.debug(`Completed ${name} in ${duration}ms`);
    return result;
  } catch (error) {
    const duration = Date.now() - start;
    componentLogger.error(`Failed ${name} after ${duration}ms`, error);
    throw error;
  }
}

/**
 * Create a timer for manual timing
 */
export function createTimer() {
  const start = Date.now();
  return {
    elapsed: () => Date.now() - start,
    log: (message: string, componentLogger = logger) => {
      const duration = Date.now() - start;
      componentLogger.debug(`${message} (${duration}ms)`);
    },
  };
}
