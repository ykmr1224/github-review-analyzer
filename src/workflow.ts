/**
 * Shared workflow for complete PR metrics analysis
 */

import { ConfigurationManager } from './config';
import { GitHubClient } from './github';
import { createDataCollector } from './collectors';
import { createDataProcessor } from './processors';
import { createMetricsCalculator } from './metrics';
import { createReportGenerator, createMetricsReport, OutputFormat } from './reporters';
import { MetricsReport } from './types/core';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface WorkflowOptions {
  repository: string;
  reviewerUsername: string;
  startDate: string;
  endDate: string;
  outputDir: string;
  githubToken?: string;
}

export interface WorkflowResult {
  summary: {
    totalPRs: number;
    totalComments: number;
    averageCommentsPerPR: number;
    positiveReactions: number;
    negativeReactions: number;
    resolvedComments: number;
    repliedComments: number;
  };
  artifacts: string[];
  executionTime: number;
}

/**
 * Generate and save a report in the specified format to a custom file path
 * Single responsibility: report generation and file writing
 */
export async function generateAndSaveReportToPath(
  report: MetricsReport,
  format: OutputFormat,
  filePath: string,
  logger: { info: (message: string) => void }
): Promise<string> {
  const generator = createReportGenerator();
  
  logger.info(`📄 Generating ${format.toUpperCase()} report...`);
  const content = await generator.generateReport(report, { format });
  
  await fs.writeFile(filePath, content, 'utf8');
  
  return filePath;
}

export async function runCompleteWorkflow(
  options: WorkflowOptions,
  logger: {
    info: (message: string) => void;
    warning: (message: string) => void;
    error: (message: string) => void;
  } = {
    info: (message: string) => console.log(message),
    warning: (message: string) => console.warn(message),
    error: (message: string) => console.error(message)
  }
): Promise<WorkflowResult> {
  const startTime = Date.now();
  
  // Parse repository
  const [owner, repo] = options.repository.split('/');
  if (!owner || !repo) {
    throw new Error('Repository must be in format owner/repo');
  }
  
  // Parse dates
  const start = new Date(options.startDate);
  const end = new Date(options.endDate);
  
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    throw new Error('Invalid date format. Use YYYY-MM-DD');
  }
  
  if (start >= end) {
    throw new Error('Start date must be before end date');
  }
  
  logger.info(`📊 Repository: ${options.repository}`);
  logger.info(`👤 Reviewer: ${options.reviewerUsername}`);
  logger.info(`📅 Period: ${options.startDate} to ${options.endDate}`);
  
  // Create output directory
  await fs.mkdir(options.outputDir, { recursive: true });
  
  // Set environment variables for configuration loading
  process.env.GITHUB_REPOSITORY = options.repository;
  process.env.REVIEWER_USERNAME = options.reviewerUsername;
  if (options.githubToken) {
    process.env.GITHUB_TOKEN = options.githubToken;
  }
  
  // Load configuration
  const configManager = new ConfigurationManager();
  const config = await configManager.loadConfig();
  
  // Override configuration with options (double-check)
  config.repository.owner = owner;
  config.repository.repo = repo;
  config.analysis.reviewerUserName = options.reviewerUsername;
  config.analysis.timePeriod = { start, end };
  
  if (options.githubToken) {
    config.auth.token = options.githubToken;
  }
  
  // Initialize GitHub client
  logger.info('🔐 Authenticating with GitHub...');
  const githubClient = new GitHubClient();
  await githubClient.authenticate(config.auth);
  
  // Collect data
  logger.info('📥 Collecting PR data...');
  const collector = createDataCollector(githubClient);
  
  const prs = await collector.collectPullRequests(config.analysis, config.repository);
  logger.info(`📋 Found ${prs.length} pull requests`);
  
  if (prs.length === 0) {
    logger.warning('No pull requests found in the specified time period');
    
    return {
      summary: {
        totalPRs: 0,
        totalComments: 0,
        averageCommentsPerPR: 0,
        positiveReactions: 0,
        negativeReactions: 0,
        resolvedComments: 0,
        repliedComments: 0
      },
      artifacts: [],
      executionTime: Date.now() - startTime
    };
  }
  
  const comments = await collector.collectComments(prs, options.reviewerUsername, config.repository);
  logger.info(`💬 Found ${comments.length} comments from ${options.reviewerUsername}`);
  
  // Process data and calculate metrics
  logger.info('🔄 Processing metrics...');
  const processor = createDataProcessor();
  const processedComments = processor.classifyReactions(
    processor.detectReplies(
      processor.detectResolution(comments)
    )
  );
  
  const calculator = createMetricsCalculator();
  const summary = calculator.calculateSummary(prs, processedComments);
  const detailed = calculator.calculateDetailed(prs, processedComments, options.repository);
  
  // Generate reports using the core utility function
  const report = createMetricsReport(
    options.repository,
    { start, end },
    options.reviewerUsername,
    summary,
    detailed
  );
  
  const artifacts: string[] = [];
  
  const filename = 'pr-metrics-report'
  const jsonPath = path.join(options.outputDir, `${filename}.json`);
  artifacts.push(await generateAndSaveReportToPath(report, 'json', jsonPath, logger));
  
  const markdownPath = path.join(options.outputDir, `${filename}.md`);
  artifacts.push(await generateAndSaveReportToPath(report, 'markdown', markdownPath, logger));
  
  const executionTime = Date.now() - startTime;
  
  logger.info('✅ Analysis complete!');
  logger.info(`📊 Results: ${summary.totalPRs} PRs, ${summary.totalComments} comments`);
  logger.info(`📁 Reports saved to: ${options.outputDir}`);
  
  artifacts.forEach(artifact => {
    logger.info(`   - ${path.basename(artifact)}`);
  });
  
  return {
    summary,
    artifacts,
    executionTime
  };
}