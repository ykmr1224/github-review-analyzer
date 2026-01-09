/**
 * Data collection command for GitHub PR Metrics CLI
 */

import { Command } from 'commander';
import { ConfigurationManager } from '../config';
import { GitHubClient } from '../github';
import { createDataCollector } from '../collectors';
import { DataStorage } from '../storage';

export const collectCommand = new Command('collect')
  .description('Collect PR data from GitHub and save to JSON file')
  .option('-r, --repo <repo>', 'Repository in format owner/repo')
  .option('-u, --reviewer <username>', 'Reviewer username to analyze')
  .option('-d, --days <days>', 'Number of days to analyze', '7')
  .option('-s, --start <date>', 'Start date in YYYY-MM-DD format')
  .option('-e, --end <date>', 'End date in YYYY-MM-DD format')
  .option('-o, --output <file>', 'Output JSON file path', './temp/pr-data.json')
  .action(async (options) => {
    try {
      console.log('🚀 Collecting PR data...');

      // Load configuration
      const configManager = new ConfigurationManager();
      const config = await configManager.loadConfig();

      // Override with CLI options if provided
      if (options.repo) {
        const [owner, repo] = options.repo.split('/');
        if (!owner || !repo) {
          console.error('❌ Repository must be in format owner/repo');
          process.exit(1);
        }
        config.repository.owner = owner;
        config.repository.repo = repo;
      }

      if (options.reviewer) {
        config.analysis.reviewerUserName = options.reviewer;
      }

      // Handle date range options
      if (options.start && options.end) {
        const startDate = new Date(options.start);
        const endDate = new Date(options.end);
        
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
          console.error('❌ Invalid date format. Use YYYY-MM-DD');
          process.exit(1);
        }
        
        if (startDate >= endDate) {
          console.error('❌ Start date must be before end date');
          process.exit(1);
        }
        
        config.analysis.timePeriod = { start: startDate, end: endDate };
      } else if (options.days) {
        const days = parseInt(options.days);
        if (isNaN(days) || days <= 0) {
          console.error('❌ Days must be a positive number');
          process.exit(1);
        }
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - days);
        config.analysis.timePeriod = { start: startDate, end: endDate };
      }

      console.log(`📊 ${config.repository.owner}/${config.repository.repo} | ${config.analysis.reviewerUserName} | ${config.analysis.timePeriod.start.toISOString().split('T')[0]} to ${config.analysis.timePeriod.end.toISOString().split('T')[0]}`);

      // Initialize GitHub client
      const githubClient = new GitHubClient();
      await githubClient.authenticate(config.auth);

      // Create data collector
      const collector = createDataCollector(githubClient);

      // Collect pull requests
      const prs = await collector.collectPullRequests(config.analysis, config.repository);
      console.log(`📥 Found ${prs.length} pull requests`);

      if (prs.length === 0) {
        console.log('ℹ️  No pull requests found in the specified time period.');
        return;
      }

      // Collect comments
      const comments = await collector.collectComments(prs, config.analysis.reviewerUserName, config.repository);
      console.log(`💬 Found ${comments.length} comments from ${config.analysis.reviewerUserName}`);

      // Save to JSON file using DataStorage
      const outputPath = options.output;
      
      await DataStorage.saveCollectedData(
        outputPath,
        prs,
        comments,
        {
          repository: `${config.repository.owner}/${config.repository.repo}`,
          reviewer: config.analysis.reviewerUserName,
          period: config.analysis.timePeriod
        }
      );
      
      console.log(`✅ Data saved to: ${outputPath}`);

    } catch (error) {
      console.error('❌ Error:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });