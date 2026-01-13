/**
 * Analysis command for GitHub PR Metrics CLI
 */

import { Command } from 'commander';
import { createMetricsCalculator } from '../metrics';
import { createDataProcessor } from '../processors';
import { DataStorage } from '../storage';
import { createMetricsReport, getFileExtension } from '../reporters';
import { generateAndSaveReportToPath } from '../workflow';

export const analyzeCommand = new Command('analyze')
  .description('Analyze collected PR data and generate report')
  .option('-i, --input <file>', 'Input JSON file path', './temp/pr-data.json')
  .option('--report <format>', 'Report format (json, markdown)', 'json')
  .option('--report-output <file>', 'Output file for generated report')
  .action(async (options) => {
    try {
      console.log('🚀 Analyzing PR metrics...');

      // Validate and read data from JSON file
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
      console.log(`📊 Loaded ${metadata.totalPRs} PRs, ${metadata.totalComments} comments`);

      if (comments.length === 0) {
        console.log(`ℹ️  No comments found from reviewer: ${metadata.reviewer}`);
        return;
      }

      // Process data and calculate metrics
      console.log('🔄 Processing metrics...');
      const processor = createDataProcessor();
      const processedComments = processor.classifyReactions(
        processor.detectReplies(
          processor.detectResolution(comments)
        )
      );

      const calculator = createMetricsCalculator();
      const summary = calculator.calculateSummary(prs, processedComments);
      const detailed = calculator.calculateDetailed(prs, processedComments, metadata.repository);

      // Validate report format
      const format = options.report.toLowerCase();
      if (!['json', 'markdown'].includes(format)) {
        console.error('❌ Invalid report format. Supported formats: json, markdown');
        process.exit(1);
      }

      // Generate report using the extracted utility function
      const report = createMetricsReport(
        metadata.repository,
        {
          start: new Date(metadata.period.start),
          end: new Date(metadata.period.end)
        },
        metadata.reviewer,
        summary,
        detailed
      );

      // Determine output file path
      let outputPath = options.reportOutput;
      if (!outputPath) {
        const baseName = options.input.replace(/\.[^/.]+$/, ''); // Remove extension
        const extension = getFileExtension(format as 'json' | 'markdown');
        outputPath = `${baseName}-report${extension}`;
      }

      // Use the extracted report generation function
      await generateAndSaveReportToPath(
        report, 
        format as 'json' | 'markdown', 
        outputPath,
        { info: (message: string) => console.log(message) }
      );

      console.log(`✅ Report saved to: ${outputPath}`);

    } catch (error) {
      
      process.exit(1);
    }
  });