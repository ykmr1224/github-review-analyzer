/**
 * Minimal configuration management system for GitHub PR metrics analyzer
 */

import { DateRange } from '../types/core';

/**
 * Main configuration interface - minimal viable configuration
 */
export interface AppConfig {
  /** GitHub repository to analyze */
  repository: RepositoryConfig;
  /** GitHub authentication */
  auth: AuthConfig;
  /** Analysis parameters */
  analysis: AnalysisConfig;
  /** Output settings */
  output?: OutputConfig;
}

/**
 * Repository configuration
 */
export interface RepositoryConfig {
  /** Repository owner (username or organization) */
  owner: string;
  /** Repository name */
  repo: string;
}

/**
 * Authentication configuration - supports both PAT and GitHub App
 */
export interface AuthConfig {
  /** Authentication type */
  type: 'token' | 'app';
  /** GitHub Personal Access Token (for type: 'token') */
  token?: string;
  /** GitHub App configuration (for type: 'app') */
  app?: {
    /** GitHub App ID */
    appId: string;
    /** GitHub App private key (PEM format) */
    privateKey: string;
    /** Installation ID for the repository */
    installationId: string;
  };
}

/**
 * Analysis configuration - minimal required fields
 */
export interface AnalysisConfig {
  /** Username to identify reviewer comments (e.g., 'coderabbitai') */
  reviewerUserName: string;
  /** Time period for analysis */
  timePeriod: DateRange;
}

/**
 * Output configuration - optional with sensible defaults
 */
export interface OutputConfig {
  /** Output format (defaults to 'json') */
  format?: 'json' | 'markdown';
  /** Output directory (defaults to './reports') */
  outputDir?: string;
}

/**
 * Simple validation error interface
 */
export interface ValidationError {
  field: string;
  message: string;
}

/**
 * Default configuration values
 */
export const DEFAULT_CONFIG: Partial<AppConfig> = {
  analysis: {
    reviewerUserName: 'coderabbitai[bot]',
    timePeriod: {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      end: new Date(), // now
    },
  },
  output: {
    format: 'json',
    outputDir: './reports',
  },
};

/**
 * Simple configuration manager implementation
 */
import { config as loadEnv } from 'dotenv';

export class ConfigurationManager implements IConfigurationProvider {
  private config: AppConfig | null = null;

  constructor() {
    // Load environment variables from .env file
    loadEnv();
  }

  /**
   * Load configuration from environment variables and defaults
   */
  async loadConfig(): Promise<AppConfig> {
    // Start with defaults
    const config: AppConfig = {
      repository: {
        owner: process.env.GITHUB_REPOSITORY_OWNER || '',
        repo: process.env.GITHUB_REPOSITORY_NAME || '',
      },
      auth: this.buildAuthConfig(),
      analysis: {
        reviewerUserName: process.env.REVIEWER_USERNAME || DEFAULT_CONFIG.analysis?.reviewerUserName || 'DEFAULT_REVIEWER_NAME',
        timePeriod: {
          start: process.env.ANALYSIS_START_DATE ? new Date(process.env.ANALYSIS_START_DATE) : DEFAULT_CONFIG.analysis?.timePeriod?.start || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          end: process.env.ANALYSIS_END_DATE ? new Date(process.env.ANALYSIS_END_DATE) : DEFAULT_CONFIG.analysis?.timePeriod?.end || new Date(),
        },
      },
      output: {
        format: (process.env.OUTPUT_FORMAT as 'json' | 'markdown') || DEFAULT_CONFIG.output?.format || 'json',
        outputDir: process.env.OUTPUT_DIR || DEFAULT_CONFIG.output?.outputDir || './reports',
      },
    };

    // Basic validation
    const errors = this.validateConfig(config);
    if (errors.length > 0) {
      throw new ConfigurationError('Configuration validation failed', errors);
    }

    this.config = config;
    return config;
  }

  /**
   * Build authentication configuration based on environment variables
   */
  private buildAuthConfig(): AuthConfig {
    const authType = (process.env.GITHUB_AUTH_TYPE as 'token' | 'app') || 'token';
    
    if (authType === 'app' && process.env.GITHUB_APP_ID) {
      return {
        type: 'app',
        app: {
          appId: process.env.GITHUB_APP_ID,
          privateKey: process.env.GITHUB_APP_PRIVATE_KEY || '',
          installationId: process.env.GITHUB_APP_INSTALLATION_ID || '',
        }
      };
    } else {
      return {
        type: 'token',
        token: process.env.GITHUB_TOKEN || '',
      };
    }
  }

  /**
   * Simple validation
   */
  validateConfig(config: AppConfig): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!config.repository.owner) {
      errors.push({ field: 'repository.owner', message: 'Repository owner is required' });
    }
    if (!config.repository.repo) {
      errors.push({ field: 'repository.repo', message: 'Repository name is required' });
    }
    // Validate authentication configuration
    if (config.auth.type === 'token') {
      if (!config.auth.token) {
        errors.push({ field: 'auth.token', message: 'GitHub token is required when using token authentication' });
      }
    } else if (config.auth.type === 'app') {
      if (!config.auth.app) {
        errors.push({ field: 'auth.app', message: 'GitHub App configuration is required when using app authentication' });
      } else {
        if (!config.auth.app.appId) {
          errors.push({ field: 'auth.app.appId', message: 'GitHub App ID is required' });
        }
        if (!config.auth.app.privateKey) {
          errors.push({ field: 'auth.app.privateKey', message: 'GitHub App private key is required' });
        }
        if (!config.auth.app.installationId) {
          errors.push({ field: 'auth.app.installationId', message: 'GitHub App installation ID is required' });
        }
      }
    } else {
      errors.push({ field: 'auth.type', message: 'Authentication type must be either "token" or "app"' });
    }
    if (!config.analysis.reviewerUserName) {
      errors.push({ field: 'analysis.reviewerUserName', message: 'Reviewer username is required' });
    }
    if (config.analysis.timePeriod.start >= config.analysis.timePeriod.end) {
      errors.push({ field: 'analysis.timePeriod', message: 'Start date must be before end date' });
    }

    return errors;
  }

  /**
   * Get current configuration
   */
  getConfig(): AppConfig {
    if (!this.config) {
      throw new ConfigurationError('Configuration not loaded. Call loadConfig() first.');
    }
    return this.config;
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<AppConfig>): void {
    if (!this.config) {
      throw new ConfigurationError('Configuration not loaded. Call loadConfig() first.');
    }
    this.config = { ...this.config, ...updates };
  }

  /**
   * Save configuration (simplified - just returns the config as JSON)
   */
  async saveConfig(): Promise<void> {
    // For MVP, we don't need file saving
    return Promise.resolve();
  }
}

/**
 * Configuration error class
 */
export class ConfigurationError extends Error {
  constructor(message: string, public errors: ValidationError[] = []) {
    super(message);
    this.name = 'ConfigurationError';
  }
}

// Import the interface to ensure compatibility
import { IConfigurationProvider } from '../types/interfaces';