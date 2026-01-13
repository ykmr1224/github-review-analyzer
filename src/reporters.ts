/**
 * Report generation system for GitHub PR metrics analysis
 */

import { MetricsReport, DetailedMetrics, MetricsSummary } from './types/core';
import { IReportGenerator } from './types/interfaces';

/**
 * Supported output formats
 */
export type OutputFormat = 'json' | 'markdown';

/**
 * Template data interface for report generation
 */
export interface ReportTemplateData {
  report: MetricsReport;
  formatters: {
    date: (date: Date) => string;
    number: (num: number) => string;
    percentage: (num: number, total: number) => string;
  };
}

/**
 * Report configuration interface
 */
export interface ReportConfig {
  format: OutputFormat;
  template?: string;
  customFields?: Record<string, any>;
}

/**
 * Abstract base class for report formatters
 */
export abstract class BaseReportFormatter {
  protected formatters = {
    date: (date: Date) => date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }),
    number: (num: number) => Number(num).toFixed(2),
    percentage: (num: number, total: number) => {
      if (total === 0) return '0.00';
      return ((num / total) * 100).toFixed(1);
    }
  };

  abstract generate(data: MetricsReport): string | Promise<string>;
  abstract getFormat(): OutputFormat;
}

/**
 * JSON report formatter
 */
export class JSONReportFormatter extends BaseReportFormatter {
  getFormat(): OutputFormat {
    return 'json';
  }

  generate(data: MetricsReport): string {
    // Create a clean, structured format that's both human and machine readable
    const jsonReport = {
      metadata: {
        repository: data.repository,
        period: {
          start: data.period.start.toISOString(),
          end: data.period.end.toISOString()
        },
        reviewer: data.reviewer,
        generatedAt: data.generatedAt.toISOString(),
        notes: [
          "CodeRabbit 'Addressed in commit' messages are automatically detected as positive feedback",
          "Comments with commit resolution messages are counted as resolved"
        ]
      },
      summary: {
        pullRequests: {
          total: data.summary.totalPRs
        },
        comments: {
          total: data.summary.totalComments,
          averagePerPR: Number(data.summary.averageCommentsPerPR.toFixed(2))
        },
        reactions: {
          positive: data.summary.positiveReactions,
          negative: data.summary.negativeReactions,
          positivePercentage: data.summary.totalComments > 0 
            ? Number(((data.summary.positiveReactions / data.summary.totalComments) * 100).toFixed(1))
            : 0,
          negativePercentage: data.summary.totalComments > 0 
            ? Number(((data.summary.negativeReactions / data.summary.totalComments) * 100).toFixed(1))
            : 0
        },
        engagement: {
          repliedComments: data.summary.repliedComments,
          resolvedComments: data.summary.resolvedComments,
          replyRate: data.summary.totalComments > 0 
            ? Number(((data.summary.repliedComments / data.summary.totalComments) * 100).toFixed(1))
            : 0,
          resolutionRate: data.summary.totalComments > 0 
            ? Number(((data.summary.resolvedComments / data.summary.totalComments) * 100).toFixed(1))
            : 0
        }
      },
      detailed: data.detailed,
      pullRequests: data.detailed.prDetails || []
    };

    return JSON.stringify(jsonReport, null, 2);
  }
}

/**
 * Markdown report formatter
 */
export class MarkdownReportFormatter extends BaseReportFormatter {
  getFormat(): OutputFormat {
    return 'markdown';
  }

  generate(data: MetricsReport): string {
    const template = this.getMarkdownTemplate();
    return this.renderTemplate(template, data);
  }

  private renderTemplate(template: string, data: MetricsReport): string {
    const context = {
      report: data,
      formatters: this.formatters,
      prDetailsTable: this.generatePRDetailsTable(data.detailed.prDetails)
    };

    return this.processTemplate(template, context);
  }

  private generatePRDetailsTable(prDetails: any[]): string {
    return prDetails.map(pr => 
      `| [#${pr.number}](${pr.url}) | ${pr.title} | ${pr.totalComments} | ${pr.aiComments} | ${pr.resolvedAiComments} | ${pr.positiveReactions} | ${pr.negativeReactions} |`
    ).join('\n');
  }

  private processTemplate(template: string, context: any): string {
    // Match template expressions: {{expression}}
    return template.replace(/\{\{([^}]+)\}\}/g, (match, expression) => {
      try {
        return this.evaluateExpression(expression.trim(), context);
      } catch (error) {
        // Return original expression if evaluation fails to maintain template integrity
        return match;
      }
    });
  }

  private evaluateExpression(expression: string, context: any): string {
    // Handle formatter function calls: formatters.date report.period.start
    if (expression.startsWith('formatters.')) {
      return this.evaluateFormatterCall(expression, context);
    }

    // Handle simple property access: report.repository
    return String(this.getNestedProperty(expression, context) ?? '');
  }

  private evaluateFormatterCall(expression: string, context: any): string {
    const parts = expression.split(' ');
    const formatterPath = parts[0]; // e.g., "formatters.date"
    const args = parts.slice(1); // e.g., ["report.period.start"]

    const formatter = this.getNestedProperty(formatterPath, context);
    if (typeof formatter !== 'function') {
      throw new Error(`Formatter not found: ${formatterPath}`);
    }

    const resolvedArgs = args.map(arg => this.getNestedProperty(arg, context));
    return String(formatter(...resolvedArgs));
  }

  private getNestedProperty(path: string, obj: any): any {
    return path.split('.').reduce((current, key) => {
      return current?.[key];
    }, obj);
  }

  private getMarkdownTemplate(): string {
    return `# GitHub PR Metrics Report

## Repository Analysis
- **Repository**: {{report.repository}}
- **Analysis Period**: {{formatters.date report.period.start}} to {{formatters.date report.period.end}}
- **AI Reviewer**: {{report.reviewer}}
- **Generated**: {{formatters.date report.generatedAt}}

## Summary Metrics

| Metric | Value |
|--------|-------|
| Total Pull Requests | {{report.summary.totalPRs}} |
| Total AI Comments | {{report.summary.totalComments}} |
| Average Comments per PR | {{formatters.number report.summary.averageCommentsPerPR}} |
| Comments with Positive Reactions | {{report.summary.positiveReactions}} |
| Comments with Negative Reactions | {{report.summary.negativeReactions}} |
| Comments with Human Replies | {{report.summary.repliedComments}} |
| Resolved Comments | {{report.summary.resolvedComments}} |

## Engagement Analysis

### Reaction Distribution
- **Positive Reactions**: {{report.summary.positiveReactions}} ({{formatters.percentage report.summary.positiveReactions report.summary.totalComments}}%)
- **Negative Reactions**: {{report.summary.negativeReactions}} ({{formatters.percentage report.summary.negativeReactions report.summary.totalComments}}%)

### Response Rate
- **Comments with Replies**: {{report.summary.repliedComments}} ({{formatters.percentage report.summary.repliedComments report.summary.totalComments}}%)
- **Resolution Rate**: {{report.summary.resolvedComments}} ({{formatters.percentage report.summary.resolvedComments report.summary.totalComments}}%)

### CodeRabbit Resolution Tracking
CodeRabbit's "Addressed in commit" messages are automatically detected as positive feedback, indicating that:
- The reviewer's feedback was actionable and clear
- The author responded appropriately by making changes
- The review process facilitated effective collaboration

*Note: Comments with "Addressed in commit [hash]" messages are counted as resolved, even without explicit user reactions.*

## Pull Request Details

| PR | Title | Total Comments | AI Comments | Resolved AI Comments | Positive Reactions | Negative Reactions | 
|----|-------|----------------|-------------|----------------------|--------------------|-------------------|
{{prDetailsTable}}

## Detailed Breakdown

### Pull Request Analysis
- **Merged**: {{report.detailed.prBreakdown.byState.merged}} PRs
- **Closed**: {{report.detailed.prBreakdown.byState.closed}} PRs

### Comment Analysis
- **Resolved**: {{report.detailed.commentBreakdown.byResolution.resolved}} comments
- **Unresolved**: {{report.detailed.commentBreakdown.byResolution.unresolved}} comments

---
*Report generated by GitHub PR Metrics Analyzer*
*CodeRabbit "Addressed in commit" messages are automatically recognized as positive engagement*
`;
  }
}

/**
 * Main report generator implementation
 */
export class ReportGenerator implements IReportGenerator {
  private formatters: Map<OutputFormat, BaseReportFormatter>;

  constructor() {
    this.formatters = new Map([
      ['json', new JSONReportFormatter()],
      ['markdown', new MarkdownReportFormatter()]
    ]);
  }

  async generateReport(data: MetricsReport, config: ReportConfig = { format: 'markdown' }): Promise<string> {
    const formatter = this.formatters.get(config.format);
    if (!formatter) {
      throw new Error(`Unsupported format: ${config.format}`);
    }

    return await formatter.generate(data);
  }

  generateJSON(data: MetricsReport): string {
    const formatter = this.formatters.get('json') as JSONReportFormatter;
    return formatter.generate(data);
  }

  async generateMarkdown(data: MetricsReport): Promise<string> {
    const formatter = this.formatters.get('markdown') as MarkdownReportFormatter;
    return formatter.generate(data);
  }

  /**
   * Add a custom formatter for a specific format
   */
  addFormatter(format: OutputFormat, formatter: BaseReportFormatter): void {
    this.formatters.set(format, formatter);
  }

  /**
   * Get available formats
   */
  getAvailableFormats(): OutputFormat[] {
    return Array.from(this.formatters.keys());
  }
}

/**
 * Factory function to create a report generator
 */
export function createReportGenerator(): IReportGenerator {
  return new ReportGenerator();
}

/**
 * Utility function to detect output format from file extension
 */
export function detectOutputFormat(filename: string): OutputFormat {
  const extension = filename.toLowerCase().split('.').pop();
  switch (extension) {
    case 'json':
      return 'json';
    case 'md':
    case 'markdown':
      return 'markdown';
    default:
      return 'markdown'; // Default fallback
  }
}

/**
 * Utility function to get appropriate file extension for format
 */
export function getFileExtension(format: OutputFormat): string {
  switch (format) {
    case 'json':
      return '.json';
    case 'markdown':
      return '.md';
    default:
      return '.txt';
  }
}

/**
 * Utility function to check format compatibility
 */
export function isFormatSupported(format: string): format is OutputFormat {
  return ['json', 'markdown'].includes(format);
}

/**
 * Utility function to create a comprehensive metrics report
 */
export function createMetricsReport(
  repository: string,
  period: { start: Date; end: Date },
  reviewer: string,
  summary: MetricsSummary,
  detailed: DetailedMetrics
): MetricsReport {
  return {
    repository,
    period,
    reviewer,
    summary,
    detailed,
    generatedAt: new Date()
  };
}