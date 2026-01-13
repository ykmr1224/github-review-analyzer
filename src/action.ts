#!/usr/bin/env node

/**
 * GitHub Action entry point for PR Metrics Analyzer
 */

import * as core from '@actions/core';
import * as github from '@actions/github';
import { runCompleteWorkflow } from './workflow';

/**
 * Masks sensitive values in GitHub Actions logs
 */
function maskSecret(secret: string): void {
  core.setSecret(secret);
}

async function run(): Promise<void> {
  try {
    // Get inputs
    const githubToken = core.getInput('github-token', { required: true });
    const repository = core.getInput('repository') || github.context.repo.owner + '/' + github.context.repo.repo;
    const reviewerUsername = core.getInput('reviewer-username', { required: true });
    const startDateInput = core.getInput('start-date');
    const endDateInput = core.getInput('end-date');
    const daysInput = core.getInput('days');
    const outputPath = core.getInput('output-path') || './pr-metrics-reports';
    
    // Calculate date range
    let startDate: string;
    let endDate: string;
    
    if (daysInput || (!startDateInput && !endDateInput)) {
      // Use days option (explicit or default)
      const days = daysInput ? parseInt(daysInput, 10) : 7; // Default to 7 days
      if (isNaN(days) || days <= 0) {
        throw new Error('Days must be a positive number');
      }
      
      const today = new Date();
      const start = new Date(today);
      start.setDate(today.getDate() - days);
      
      startDate = start.toISOString().split('T')[0];
      endDate = today.toISOString().split('T')[0];
      
      core.info(`📅 Analyzing last ${days} days: ${startDate} to ${endDate}`);
    } else if (startDateInput && endDateInput) {
      // Use explicit date range
      startDate = startDateInput;
      endDate = endDateInput;
    } else {
      throw new Error('Either provide "days" or both "start-date" and "end-date"');
    }
    
    // Mask the GitHub token
    maskSecret(githubToken);
    
    core.info('🚀 Starting GitHub PR Metrics Analysis...');
    
    // Run the complete workflow - always generate both JSON and markdown reports
    const result = await runCompleteWorkflow({
      repository,
      reviewerUsername,
      startDate,
      endDate,
      outputDir: outputPath,
      githubToken
    }, {
      info: core.info,
      warning: core.warning,
      error: core.error
    });

    // Set artifact outputs
    result.artifacts.forEach(artifact => {
      const ext = artifact.endsWith('.json') ? 'json' : 'markdown';
      core.setOutput(`report-${ext}-path`, artifact);
    });
    
    // Set numeric outputs
    core.setOutput('total-prs', result.summary.totalPRs.toString());
    core.setOutput('total-comments', result.summary.totalComments.toString());
    core.setOutput('average-comments-per-pr', result.summary.averageCommentsPerPR.toString());
    
    // Show the generated markdown report in the workflow summary
    const markdownReportPath = result.artifacts.find(artifact => artifact.endsWith('.md'));
    
    core.info(`📁 Available artifacts: ${result.artifacts.join(', ')}`);
    
    if (markdownReportPath) {
      try {
        const fs = await import('fs/promises');
        core.info(`📖 Reading markdown report from: ${markdownReportPath}`);
        const markdownContent = await fs.readFile(markdownReportPath, 'utf8');
        core.info(`📄 Markdown content length: ${markdownContent.length} characters`);
        await core.summary.addRaw(markdownContent).write();
        core.info(`📊 Analysis report displayed in workflow summary`);
      } catch (error) {
        core.warning(`Failed to read markdown report for summary: ${error}`);
      }
    } else {
      core.warning('No markdown report found to display in summary');
    }
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    core.setFailed(`Analysis failed: ${errorMessage}`);
    
    if (error instanceof Error && error.stack) {
      core.debug(`Stack trace: ${error.stack}`);
    }
  }
}

// Run the action
if (require.main === module) {
  run();
}

export { run };