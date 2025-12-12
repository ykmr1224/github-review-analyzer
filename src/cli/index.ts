#!/usr/bin/env node

/**
 * CLI entry point for GitHub PR Metrics Analyzer
 * Simple implementation to test data collection functionality
 */

import { Command } from 'commander';
import { ConfigurationManager } from '../config';
import { GitHubClient } from '../github';
import { createDataCollector } from '../collectors';
import { createMetricsCalculator } from '../metrics';
import { createDataProcessor, ReactionClassifier } from '../processors';
import { DataStorage } from '../storage';

const program = new Command();

program
  .name('github-pr-metrics')
  .description('Analyze GitHub Pull Request feedback effectiveness')
  .version('1.0.0');

program
  .command('collect')
  .description('Collect PR data from GitHub and save to JSON file')
  .option('-r, --repo <repo>', 'Repository in format owner/repo')
  .option('-u, --reviewer <username>', 'Reviewer username to analyze')
  .option('-d, --days <days>', 'Number of days to analyze', '30')
  .option('-o, --output <file>', 'Output JSON file path', './temp/pr-data.json')
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

      // Save to JSON file using DataStorage
      console.log('💾 Saving data to JSON file...');
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
      
      console.log('\n📊 Collection Summary:');
      console.log(`   Repository: ${config.repository.owner}/${config.repository.repo}`);
      console.log(`   Reviewer: ${config.analysis.reviewerUserName}`);
      console.log(`   Period: ${config.analysis.timePeriod.start.toISOString().split('T')[0]} to ${config.analysis.timePeriod.end.toISOString().split('T')[0]}`);
      console.log(`   Total PRs: ${prs.length}`);
      console.log(`   Total Comments: ${comments.length}`);

      console.log('\n🎉 Data collection complete!');

    } catch (error) {
      console.error('❌ Error:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

program
  .command('analyze')
  .description('Analyze collected PR data from JSON file')
  .option('-i, --input <file>', 'Input JSON file path', './temp/pr-data.json')
  .option('--detailed', 'Show detailed comment analysis')
  .action(async (options) => {
    try {
      console.log('🚀 GitHub PR Metrics Analyzer - Analysis Mode');
      console.log('=============================================\n');

      // Validate and read data from JSON file
      console.log('📖 Reading data from JSON file...');
      
      if (!DataStorage.fileExists(options.input)) {
        console.error(`❌ Input file not found: ${options.input}`);
        console.log('💡 Run "collect" command first to gather data');
        process.exit(1);
      }

      // Validate file structure
      const validation = DataStorage.validateDataFile(options.input);
      if (!validation.isValid) {
        console.error('❌ Invalid data file format:');
        validation.errors.forEach(error => console.error(`   - ${error}`));
        process.exit(1);
      }
      
      const { prs, comments, metadata } = await DataStorage.loadCollectedData(options.input);
      console.log('✅ Data loaded successfully\n');

      // Display metadata
      console.log('📋 Analysis Metadata:');
      console.log(`   Repository: ${metadata.repository}`);
      console.log(`   Reviewer: ${metadata.reviewer}`);
      console.log(`   Period: ${metadata.period.start.split('T')[0]} to ${metadata.period.end.split('T')[0]}`);
      console.log(`   Data collected: ${new Date(metadata.collectedAt).toLocaleString()}`);
      console.log(`   Total PRs: ${metadata.totalPRs}`);
      console.log(`   Total Comments: ${metadata.totalComments}\n`);

      if (comments.length === 0) {
        console.log(`ℹ️  No comments found from reviewer: ${metadata.reviewer}`);
        return;
      }

      // Process data for enhanced analysis
      console.log('🔄 Processing data and calculating metrics...');
      const processor = createDataProcessor();
      const processedComments = processor.classifyReactions(
        processor.detectReplies(
          processor.detectResolution(comments)
        )
      );

      // Calculate comprehensive metrics
      const calculator = createMetricsCalculator();
      const summary = calculator.calculateSummary(prs, processedComments);
      const detailed = calculator.calculateDetailed(prs, processedComments);
      console.log('✅ Metrics calculation complete\n');

      // Show detailed comment analysis if requested
      if (options.detailed) {
        console.log('💬 Detailed Comments Analysis:');
        console.log('=============================');
        processedComments.forEach((comment, index) => {
          const positiveReactions = ReactionClassifier.getPositiveReactions(comment);
          const negativeReactions = ReactionClassifier.getNegativeReactions(comment);
          const sentimentScore = ReactionClassifier.calculateSentimentScore(comment);
          
          console.log(`${index + 1}. Comment ID: ${comment.id}`);
          console.log(`   Author: ${comment.author.login} (${comment.author.type})`);
          console.log(`   Created: ${comment.createdAt.toISOString()}`);
          console.log(`   Resolved: ${comment.isResolved ? '✅' : '❌'}`);
          console.log(`   Total Reactions: ${comment.reactions.length} | Positive: ${positiveReactions.length} | Negative: ${negativeReactions.length}`);
          console.log(`   Sentiment Score: ${sentimentScore.toFixed(2)} ${sentimentScore > 0 ? '😊' : sentimentScore < 0 ? '😞' : '😐'}`);
          console.log(`   Human Replies: ${comment.replies.length}`);
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
      }

      // Comprehensive metrics analysis
      console.log('📊 Comprehensive Metrics Analysis:');
      console.log('==================================');
      
      // Summary metrics
      console.log('\n📋 Summary Metrics:');
      console.log(`   Total PRs: ${summary.totalPRs}`);
      console.log(`   Total Comments: ${summary.totalComments}`);
      console.log(`   Average Comments per PR: ${summary.averageCommentsPerPR}`);
      console.log(`   Resolved Comments: ${summary.resolvedComments} (${calculator.calculatePercentages(summary.resolvedComments, summary.totalComments).toFixed(1)}%)`);
      console.log(`   Comments with Replies: ${summary.repliedComments} (${calculator.calculatePercentages(summary.repliedComments, summary.totalComments).toFixed(1)}%)`);
      
      // Reaction analysis
      console.log('\n👍 Reaction Analysis:');
      console.log(`   Positive Reactions: ${summary.positiveReactions}`);
      console.log(`   Negative Reactions: ${summary.negativeReactions}`);
      const totalReactions = summary.positiveReactions + summary.negativeReactions;
      if (totalReactions > 0) {
        console.log(`   Positive Ratio: ${calculator.calculatePercentages(summary.positiveReactions, totalReactions).toFixed(1)}%`);
        console.log(`   Overall Sentiment: ${summary.positiveReactions > summary.negativeReactions ? '😊 Positive' : summary.positiveReactions < summary.negativeReactions ? '😞 Negative' : '😐 Neutral'}`);
      }
      
      // Detailed breakdowns
      console.log('\n📈 Detailed Breakdowns:');
      console.log('   PR States:', JSON.stringify(detailed.prBreakdown.byState, null, 2));
      console.log('   Comment Types:', JSON.stringify(detailed.commentBreakdown.byType, null, 2));
      console.log('   Reaction Types:', JSON.stringify(detailed.reactionBreakdown.byType, null, 2));
      
      // Effectiveness indicators
      console.log('\n🎯 Effectiveness Indicators:');
      const resolutionRate = calculator.calculatePercentages(summary.resolvedComments, summary.totalComments);
      const engagementRate = calculator.calculatePercentages(summary.repliedComments, summary.totalComments);
      const positivityRate = totalReactions > 0 ? calculator.calculatePercentages(summary.positiveReactions, totalReactions) : 0;
      
      console.log(`   Resolution Rate: ${resolutionRate.toFixed(1)}% ${resolutionRate >= 70 ? '🟢' : resolutionRate >= 40 ? '🟡' : '🔴'}`);
      console.log(`   Engagement Rate: ${engagementRate.toFixed(1)}% ${engagementRate >= 50 ? '🟢' : engagementRate >= 25 ? '🟡' : '🔴'}`);
      console.log(`   Positivity Rate: ${positivityRate.toFixed(1)}% ${positivityRate >= 70 ? '🟢' : positivityRate >= 50 ? '🟡' : '🔴'}`);
      
      // Overall assessment
      const overallScore = (resolutionRate + engagementRate + positivityRate) / 3;
      console.log(`\n🏆 Overall AI Reviewer Effectiveness: ${overallScore.toFixed(1)}% ${overallScore >= 70 ? '🟢 Excellent' : overallScore >= 50 ? '🟡 Good' : '🔴 Needs Improvement'}`);

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
      
      
    } catch (error) {
      
      process.exit(1);
    }
  });

// Parse command line arguments
program.parse();

// If no command provided, show help
if (!process.argv.slice(2).length) {
  program.outputHelp();
}