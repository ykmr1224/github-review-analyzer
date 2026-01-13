/**
 * Unit tests for report generation system
 */

import {
  ReportGenerator,
  JSONReportFormatter,
  MarkdownReportFormatter,
  createReportGenerator,
  createMetricsReport,
  detectOutputFormat,
  getFileExtension,
  isFormatSupported
} from '../../src/reporters';
import { MetricsReport, MetricsSummary, DetailedMetrics } from '../../src/types/core';

describe('ReportGenerator', () => {
  let reportGenerator: ReportGenerator;
  let sampleReport: MetricsReport;

  beforeEach(() => {
    reportGenerator = new ReportGenerator();
    
    const summary: MetricsSummary = {
      totalPRs: 10,
      totalComments: 25,
      averageCommentsPerPR: 2.5,
      positiveReactions: 15,
      negativeReactions: 3,
      repliedComments: 8,
      resolvedComments: 20
    };

    const detailed: DetailedMetrics = {
      prBreakdown: {
        byState: { merged: 8, closed: 2 },
        byAuthor: { 'user1': 5, 'user2': 5 }
      },
      commentBreakdown: {
        byType: { review: 20, general: 5 },
        byResolution: { resolved: 20, unresolved: 5 }
      },
      reactionBreakdown: {
        byType: { thumbs_up: 15, thumbs_down: 3 },
        positiveVsNegative: { positive: 15, negative: 3 }
      },
      prDetails: [
        {
          number: 1,
          title: 'Test PR 1',
          url: 'https://github.com/owner/repo/pull/1',
          totalComments: 3,
          aiComments: 3,
          resolvedAiComments: 2,
          positiveReactions: 2,
          negativeReactions: 0
        },
        {
          number: 2,
          title: 'Test PR 2',
          url: 'https://github.com/owner/repo/pull/2',
          totalComments: 2,
          aiComments: 2,
          resolvedAiComments: 1,
          positiveReactions: 1,
          negativeReactions: 1
        }
      ]
    };

    sampleReport = createMetricsReport(
      'owner/repo',
      { start: new Date('2024-01-01'), end: new Date('2024-01-31') },
      'coderabbit[bot]',
      summary,
      detailed
    );
  });

  describe('JSON generation', () => {
    it('should generate valid JSON output', () => {
      const output = reportGenerator.generateJSON(sampleReport);
      
      expect(() => JSON.parse(output)).not.toThrow();
      
      const parsed = JSON.parse(output);
      expect(parsed.metadata.repository).toBe('owner/repo');
      expect(parsed.metadata.reviewer).toBe('coderabbit[bot]');
      expect(parsed.summary.pullRequests.total).toBe(10);
      expect(parsed.summary.comments.total).toBe(25);
    });

    it('should include calculated percentages in JSON', () => {
      const output = reportGenerator.generateJSON(sampleReport);
      const parsed = JSON.parse(output);
      
      expect(parsed.summary.reactions.positivePercentage).toBe(60.0);
      expect(parsed.summary.reactions.negativePercentage).toBe(12.0);
      expect(parsed.summary.engagement.replyRate).toBe(32.0);
      expect(parsed.summary.engagement.resolutionRate).toBe(80.0);
    });

    it('should include PR details in JSON output', () => {
      const output = reportGenerator.generateJSON(sampleReport);
      const parsed = JSON.parse(output);
      
      expect(parsed.pullRequests).toBeDefined();
      expect(Array.isArray(parsed.pullRequests)).toBe(true);
      expect(parsed.pullRequests.length).toBe(2);
      
      const firstPR = parsed.pullRequests[0];
      expect(firstPR.number).toBe(1);
      expect(firstPR.title).toBe('Test PR 1');
      expect(firstPR.url).toBe('https://github.com/owner/repo/pull/1');
      expect(firstPR.totalComments).toBe(3);
      expect(firstPR.aiComments).toBe(3);
      expect(firstPR.resolvedAiComments).toBe(2);
      expect(firstPR.positiveReactions).toBe(2);
      expect(firstPR.negativeReactions).toBe(0);
    });
  });

  describe('Markdown generation', () => {
    it('should generate valid markdown output', async () => {
      const output = await reportGenerator.generateMarkdown(sampleReport);
      
      expect(output).toContain('# GitHub PR Metrics Report');
      expect(output).toContain('## Repository Analysis');
      expect(output).toContain('## Summary Metrics');
      expect(output).toContain('owner/repo');
      expect(output).toContain('coderabbit[bot]');
    });

    it('should include PR details table in markdown output', async () => {
      const output = await reportGenerator.generateMarkdown(sampleReport);
      
      expect(output).toContain('## Pull Request Details');
      expect(output).toContain('| PR | Title | Total Comments | AI Comments | Resolved AI Comments | Positive Reactions | Negative Reactions |');
      expect(output).toContain('| [#1](https://github.com/owner/repo/pull/1) | Test PR 1 | 3 | 3 | 2 | 2 | 0 |');
      expect(output).toContain('| [#2](https://github.com/owner/repo/pull/2) | Test PR 2 | 2 | 2 | 1 | 1 | 1 |');
    });
  });

  describe('Format support', () => {
    it('should support JSON and Markdown formats', () => {
      const availableFormats = reportGenerator.getAvailableFormats();
      expect(availableFormats).toContain('json');
      expect(availableFormats).toContain('markdown');
      expect(availableFormats).not.toContain('html');
    });

    it('should generate reports using generateReport method', async () => {
      const jsonOutput = await reportGenerator.generateReport(sampleReport, { format: 'json' });
      expect(() => JSON.parse(jsonOutput)).not.toThrow();

      const markdownOutput = await reportGenerator.generateReport(sampleReport, { format: 'markdown' });
      expect(markdownOutput).toContain('# GitHub PR Metrics Report');
    });
  });
});

describe('Utility functions', () => {
  describe('detectOutputFormat', () => {
    it('should detect format from file extensions', () => {
      expect(detectOutputFormat('report.json')).toBe('json');
      expect(detectOutputFormat('report.md')).toBe('markdown');
      expect(detectOutputFormat('report.markdown')).toBe('markdown');
      expect(detectOutputFormat('report.txt')).toBe('markdown'); // default
    });
  });

  describe('getFileExtension', () => {
    it('should return correct extensions for formats', () => {
      expect(getFileExtension('json')).toBe('.json');
      expect(getFileExtension('markdown')).toBe('.md');
    });
  });

  describe('isFormatSupported', () => {
    it('should identify supported formats', () => {
      expect(isFormatSupported('json')).toBe(true);
      expect(isFormatSupported('markdown')).toBe(true);
      expect(isFormatSupported('html')).toBe(false);
      expect(isFormatSupported('pdf')).toBe(false);
      expect(isFormatSupported('xml')).toBe(false);
    });
  });
});

describe('createReportGenerator factory', () => {
  it('should create a report generator instance', () => {
    const generator = createReportGenerator();
    expect(generator).toBeInstanceOf(ReportGenerator);
  });
});

describe('BaseReportFormatter subclasses', () => {
  describe('JSONReportFormatter', () => {
    let formatter: JSONReportFormatter;
    let sampleReport: MetricsReport;

    beforeEach(() => {
      formatter = new JSONReportFormatter();
      
      const summary: MetricsSummary = {
        totalPRs: 5,
        totalComments: 10,
        averageCommentsPerPR: 2.0,
        positiveReactions: 8,
        negativeReactions: 1,
        repliedComments: 4,
        resolvedComments: 9
      };

      const detailed: DetailedMetrics = {
        prBreakdown: {
          byState: { merged: 4, closed: 1 },
          byAuthor: { 'user1': 3, 'user2': 2 }
        },
        commentBreakdown: {
          byType: { review: 8, general: 2 },
          byResolution: { resolved: 9, unresolved: 1 }
        },
        reactionBreakdown: {
          byType: { thumbs_up: 8, thumbs_down: 1 },
          positiveVsNegative: { positive: 8, negative: 1 }
        },
        prDetails: [
          {
            number: 1,
            title: 'Test PR 1',
            url: 'https://github.com/test/repo/pull/1',
            totalComments: 2,
            aiComments: 2,
            resolvedAiComments: 2,
            positiveReactions: 1,
            negativeReactions: 0
          }
        ]
      };

      sampleReport = createMetricsReport(
        'test/repo',
        { start: new Date('2024-01-01'), end: new Date('2024-01-31') },
        'test-bot',
        summary,
        detailed
      );
    });

    it('should generate valid JSON with correct structure', () => {
      const output = formatter.generate(sampleReport);
      expect(() => JSON.parse(output)).not.toThrow();
      
      const parsed = JSON.parse(output);
      expect(parsed.metadata.repository).toBe('test/repo');
      expect(parsed.summary.pullRequests.total).toBe(5);
      expect(parsed.metadata).toHaveProperty('generatedAt');
      expect(parsed.summary).toHaveProperty('reactions');
      expect(parsed.summary).toHaveProperty('engagement');
    });

    it('should return correct format', () => {
      expect(formatter.getFormat()).toBe('json');
    });
  });

  describe('MarkdownReportFormatter', () => {
    let formatter: MarkdownReportFormatter;
    let sampleReport: MetricsReport;

    beforeEach(() => {
      formatter = new MarkdownReportFormatter();
      
      const summary: MetricsSummary = {
        totalPRs: 5,
        totalComments: 10,
        averageCommentsPerPR: 2.0,
        positiveReactions: 8,
        negativeReactions: 1,
        repliedComments: 4,
        resolvedComments: 9
      };

      const detailed: DetailedMetrics = {
        prBreakdown: {
          byState: { merged: 4, closed: 1 },
          byAuthor: { 'user1': 3, 'user2': 2 }
        },
        commentBreakdown: {
          byType: { review: 8, general: 2 },
          byResolution: { resolved: 9, unresolved: 1 }
        },
        reactionBreakdown: {
          byType: { thumbs_up: 8, thumbs_down: 1 },
          positiveVsNegative: { positive: 8, negative: 1 }
        },
        prDetails: [
          {
            number: 1,
            title: 'Test PR 1',
            url: 'https://github.com/test/repo/pull/1',
            totalComments: 2,
            aiComments: 2,
            resolvedAiComments: 2,
            positiveReactions: 1,
            negativeReactions: 0
          }
        ]
      };

      sampleReport = createMetricsReport(
        'test/repo',
        { start: new Date('2024-01-01'), end: new Date('2024-01-31') },
        'test-bot',
        summary,
        detailed
      );
    });

    it('should generate valid markdown with required sections', () => {
      const output = formatter.generate(sampleReport);
      expect(output).toContain('# GitHub PR Metrics Report');
      expect(output).toContain('## Repository Analysis');
      expect(output).toContain('## Summary Metrics');
      expect(output).toContain('## Engagement Analysis');
      expect(output).toContain('test/repo');
      expect(output).toContain('test-bot');
    });

    it('should return correct format', () => {
      expect(formatter.getFormat()).toBe('markdown');
    });
  });
});