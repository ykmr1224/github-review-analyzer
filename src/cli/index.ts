#!/usr/bin/env node

/**
 * CLI entry point for GitHub PR Metrics Analyzer
 * Simple implementation to test data collection functionality
 */

import { Command } from 'commander';
import { ConfigurationManager } from '../config';
import { GitHubClient } from '../github';
import { createDataCollector } from '../collectors';

const program = new Command();

program
  .name('github-pr-metrics')
  .description('Analyze GitHub Pull Request feedback effectiveness')
  .version('1.0.0');

program
  .command('analyze')
  .description('Collect and display PR data for testing')
  .option('-r, --repo <repo>', 'Repository in format owner/repo')
  .option('-u, --reviewer <username>', 'Reviewer username to analyze')
  .option('-d, --days <days>', 'Number of days to analyze', '30')
  .action(async (options) => {
    try {
      console.log('🚀 GitHub PR Metrics Analyzer');
      console.log('================================\n');

      // Load configuration
      console.log('📋 Loading configuration...');
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

      if (options.days) {
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

      console.log(`📊 Repository: ${config.repository.owner}/${config.repository.repo}`);
      console.log(`👤 Reviewer: ${config.analysis.reviewerUserName}`);
      console.log(`📅 Period: ${config.analysis.timePeriod.start.toISOString().split('T')[0]} to ${config.analysis.timePeriod.end.toISOString().split('T')[0]}\n`);

      // Initialize GitHub client
      console.log('🔐 Authenticating with GitHub...');
      const githubClient = new GitHubClient();
      await githubClient.authenticate(config.auth);
      console.log('✅ Authentication successful\n');

      // Create data collector
      const collector = createDataCollector(githubClient);

      // Collect pull requests
      console.log('📥 Collecting pull requests...');
      const prs = await collector.collectPullRequests(config.analysis, config.repository);
      console.log(`✅ Found ${prs.length} pull requests\n`);

      if (prs.length === 0) {
        console.log('ℹ️  No pull requests found in the specified time period.');
        return;
      }

      // Display PR summary
      console.log('📋 Pull Requests Summary:');
      console.log('========================');
      prs.forEach((pr, index) => {
        console.log(`${index + 1}. #${pr.number}: ${pr.title}`);
        console.log(`   State: ${pr.state} | Author: ${pr.author.login}`);
        console.log(`   Created: ${pr.createdAt.toISOString().split('T')[0]}`);
        console.log('');
      });

      // Collect comments
      console.log('💬 Collecting reviewer comments...');
      const comments = await collector.collectComments(prs, config.analysis.reviewerUserName, config.repository);
      console.log(`✅ Found ${comments.length} comments from ${config.analysis.reviewerUserName}\n`);

      if (comments.length === 0) {
        console.log(`ℹ️  No comments found from reviewer: ${config.analysis.reviewerUserName}`);
        return;
      }

      // Display comments summary
      console.log('💬 Comments Summary:');
      console.log('===================');
      comments.forEach((comment, index) => {
        console.log(`${index + 1}. Comment ID: ${comment.id}`);
        console.log(`   Author: ${comment.author.login} (${comment.author.type})`);
        console.log(`   Created: ${comment.createdAt.toISOString()}`);
        console.log(`   Resolved: ${comment.isResolved ? '✅' : '❌'}`);
        console.log(`   Reactions: ${comment.reactions.length}`);
        console.log(`   Replies: ${comment.replies.length}`);
        if (comment.reactions.length > 0) {
          const reactionSummary = comment.reactions.reduce((acc, reaction) => {
            acc[reaction.type] = (acc[reaction.type] || 0) + 1;
            return acc;
          }, {} as Record<string, number>);
          console.log(`   Reaction breakdown: ${JSON.stringify(reactionSummary)}`);
        }
        console.log(`   Body preview: ${comment.body.substring(0, 100)}${comment.body.length > 100 ? '...' : ''}`);
        console.log('');
      });

      // Basic statistics
      console.log('📊 Basic Statistics:');
      console.log('===================');
      console.log(`Total PRs: ${prs.length}`);
      console.log(`Total Comments: ${comments.length}`);
      console.log(`Average Comments per PR: ${(comments.length / prs.length).toFixed(2)}`);
      
      const resolvedComments = comments.filter(c => c.isResolved).length;
      console.log(`Resolved Comments: ${resolvedComments} (${((resolvedComments / comments.length) * 100).toFixed(1)}%)`);
      
      const totalReactions = comments.reduce((sum, c) => sum + c.reactions.length, 0);
      console.log(`Total Reactions: ${totalReactions}`);
      
      const totalReplies = comments.reduce((sum, c) => sum + c.replies.length, 0);
      console.log(`Total Replies: ${totalReplies}`);

      console.log('\n🎉 Analysis complete!');

    } catch (error) {
      console.error('❌ Error:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

program
  .command('config')
  .description('Show current configuration')
  .action(async () => {
    try {
      const configManager = new ConfigurationManager();
      const config = await configManager.loadConfig();
      
      console.log('📋 Current Configuration:');
      console.log('========================');
      console.log(`Repository: ${config.repository.owner}/${config.repository.repo}`);
      console.log(`Reviewer: ${config.analysis.reviewerUserName}`);
      console.log(`Auth Type: ${config.auth.type}`);
      console.log(`Time Period: ${config.analysis.timePeriod.start.toISOString().split('T')[0]} to ${config.analysis.timePeriod.end.toISOString().split('T')[0]}`);
      console.log(`Output Format: ${config.output?.format || 'json'}`);
      console.log(`Output Directory: ${config.output?.outputDir || './reports'}`);
    } catch (error) {
      console.error('❌ Configuration Error:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

// Parse command line arguments
program.parse();

// If no command provided, show help
if (!process.argv.slice(2).length) {
  program.outputHelp();
}