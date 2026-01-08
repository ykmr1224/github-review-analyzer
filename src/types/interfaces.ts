/**
 * Core interfaces for system components
 */

import { PullRequest, Comment, MetricsReport, DateRange, MetricsSummary } from './core';

/**
 * Configuration management interface
 */
export interface IConfigurationProvider {
  loadConfig(): Promise<AppConfig>;
  validateConfig(config: AppConfig): ValidationError[];
  getConfig(): AppConfig;
  updateConfig(updates: Partial<AppConfig>): void;
  saveConfig(): Promise<void>;
}

// Import configuration types from config module
import { 
  AppConfig, 
  RepositoryConfig,
  AuthConfig,
  AnalysisConfig,
  ValidationError 
} from '../config';

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
  collectPullRequests(config: AnalysisConfig, repoConfig: RepositoryConfig): Promise<PullRequest[]>;
  collectComments(prs: PullRequest[], reviewerUserName: string, repoConfig: RepositoryConfig): Promise<Comment[]>;
}

/**
 * Data processing interface
 */
export interface IDataProcessor {
  filterByTimeRange(prs: PullRequest[], period: DateRange): PullRequest[];
  filterByReviewer(comments: Comment[], userName: string): Comment[];
  detectResolution(comments: Comment[]): Comment[];
  classifyReactions(comments: Comment[]): Comment[];
  detectReplies(comments: Comment[]): Comment[];
}

/**
 * Metrics calculation interface
 */
export interface IMetricsCalculator {
  calculateSummary(prs: PullRequest[], comments: Comment[]): MetricsSummary;
  calculateDetailed(prs: PullRequest[], comments: Comment[], repository?: string): any;
  calculateAverages(data: number[]): number;
  calculatePercentages(numerator: number, denominator: number): number;
  handleEdgeCases(value: number): number;
}

/**
 * Report generation interface
 */
export interface IReportGenerator {
  generateReport(data: MetricsReport, config?: any): Promise<string>;
  generateJSON(data: MetricsReport): string;
  generateMarkdown(data: MetricsReport): Promise<string>;
}



/**
 * Template system interface
 */
export interface ITemplateEngine {
  loadTemplate(path: string): Promise<string>;
  renderTemplate(template: string, data: any): string;
  validateTemplate(template: string): boolean;
}