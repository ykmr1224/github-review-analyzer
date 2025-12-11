/**
 * Core interfaces for system components
 */

import { PullRequest, Comment, MetricsReport, DateRange, MetricsSummary } from './core';

/**
 * Configuration management interface
 */
export interface IConfigurationProvider {
  getRepositoryConfig(): RepositoryConfig;
  getAuthConfig(): AuthConfig;
  getAnalysisConfig(): AnalysisConfig;
  getOutputConfig(): OutputConfig;
  validate(): boolean;
}

export interface RepositoryConfig {
  owner: string;
  repo: string;
  branch?: string;
}

export interface AuthConfig {
  token?: string;
  appId?: string;
  privateKey?: string;
  installationId?: string;
}

export interface AnalysisConfig {
  aiReviewerUsername: string;
  timePeriod: DateRange;
  includePatterns?: string[];
  excludePatterns?: string[];
}

export interface OutputConfig {
  format: 'json' | 'markdown' | 'html' | 'all';
  outputPath: string;
  templatePath?: string;
}

/**
 * GitHub API client interface
 */
export interface IGitHubClient {
  authenticate(config: AuthConfig): Promise<void>;
  getPullRequests(repo: RepositoryConfig, period: DateRange): Promise<PullRequest[]>;
  getComments(repo: RepositoryConfig, prNumber: number): Promise<Comment[]>;
  getRateLimit(): Promise<RateLimitInfo>;
  isAuthenticated(): boolean;
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  resetTime: Date;
}

/**
 * Data collection interface
 */
export interface IDataCollector {
  collectPullRequests(config: AnalysisConfig): Promise<PullRequest[]>;
  collectComments(prs: PullRequest[], aiReviewerUsername: string): Promise<Comment[]>;
  collectReactions(comments: Comment[]): Promise<void>;
  validateData(data: any): boolean;
}

/**
 * Data processing interface
 */
export interface IDataProcessor {
  filterByTimeRange(prs: PullRequest[], period: DateRange): PullRequest[];
  filterByAIReviewer(comments: Comment[], username: string): Comment[];
  detectResolution(comments: Comment[]): Comment[];
  classifyReactions(comments: Comment[]): Comment[];
  detectReplies(comments: Comment[]): Comment[];
}

/**
 * Metrics calculation interface
 */
export interface IMetricsCalculator {
  calculateSummary(prs: PullRequest[], comments: Comment[]): MetricsSummary;
  calculateDetailed(prs: PullRequest[], comments: Comment[]): any;
  calculateAverages(data: number[]): number;
  calculatePercentages(numerator: number, denominator: number): number;
  handleEdgeCases(value: number): number;
}

/**
 * Report generation interface
 */
export interface IReportGenerator {
  generateReport(data: MetricsReport): Promise<string>;
  generateJSON(data: MetricsReport): string;
  generateMarkdown(data: MetricsReport): string;
  generateHTML(data: MetricsReport): string;
  validateOutput(output: string, format: string): boolean;
}

/**
 * Plugin system interfaces
 */
export interface IPluginRegistry {
  loadPlugin(name: string): Promise<IMetricPlugin>;
  registerPlugin(plugin: IMetricPlugin): void;
  listPlugins(): string[];
  validatePlugin(plugin: IMetricPlugin): boolean;
}

export interface IMetricPlugin {
  name: string;
  version: string;
  description: string;
  calculate(data: any): any;
  validate(input: any): boolean;
}

/**
 * Template system interface
 */
export interface ITemplateEngine {
  loadTemplate(path: string): Promise<string>;
  renderTemplate(template: string, data: any): string;
  validateTemplate(template: string): boolean;
}