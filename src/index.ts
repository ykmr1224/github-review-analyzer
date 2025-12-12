/**
 * Main entry point for the GitHub PR Metrics Analyzer
 */

// Export all public interfaces and types
export * from './types';

// Export main components (specific exports to avoid conflicts)
export { ConfigurationManager, DEFAULT_CONFIG } from './config';
export { GitHubClient } from './github';
export { DataCollector, createDataCollector } from './collectors';

// Version information
export const VERSION = '1.0.0';