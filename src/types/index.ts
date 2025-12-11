/**
 * Type definitions export barrel
 */

// Core data models
export * from './core';

// System interfaces
export * from './interfaces';

// Utility types
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

// Error types
export class GitHubAPIError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public response?: any
  ) {
    super(message);
    this.name = 'GitHubAPIError';
  }
}

export class ConfigurationError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = 'ConfigurationError';
  }
}

export class DataProcessingError extends Error {
  constructor(message: string, public data?: any) {
    super(message);
    this.name = 'DataProcessingError';
  }
}

export class PluginError extends Error {
  constructor(message: string, public pluginName?: string) {
    super(message);
    this.name = 'PluginError';
  }
}