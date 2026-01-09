# GitHub PR Metrics Analyzer

A comprehensive metrics collection and reporting tool that analyzes GitHub Pull Request feedback effectiveness, specifically targeting AI reviewer comments (starting with CodeRabbit) but designed to be extensible for any AI agent. Generate professional reports in multiple formats for data-driven insights into code review effectiveness.

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
Copy the example configuration and fill in your details:
```bash
cp .env.example .env
```

Edit `.env` with your GitHub repository and authentication details:
```env
GITHUB_REPOSITORY_OWNER=your-org
GITHUB_REPOSITORY_NAME=your-repo
GITHUB_TOKEN=your_github_token_here
REVIEWER_USERNAME=coderabbit[bot]
```

### 3. Build the Project
```bash
npm run build
```

### 4. Complete Workflow
```bash
# Step 1: Collect data from GitHub
github-pr-metrics collect --repo owner/repo --reviewer coderabbit[bot] --days 7

# Step 2: Analyze and generate report
github-pr-metrics analyze --input ./temp/pr-data.json --report markdown
```

## CLI Usage

The tool provides two main commands for a complete analysis workflow:

### Collect Command
Collects PR data from GitHub and saves to JSON file:
```bash
github-pr-metrics collect [options]

Options:
  -r, --repo <repo>      Repository in format owner/repo
  -u, --reviewer <user>  Reviewer username to analyze
  -d, --days <days>      Number of days to analyze (default: "7")
  -s, --start <date>     Start date in YYYY-MM-DD format
  -e, --end <date>       End date in YYYY-MM-DD format
  -o, --output <file>    Output JSON file path (default: "./temp/pr-data.json")
  -h, --help            Display help for command
```

### Analyze Command
Analyzes collected PR data and generates reports:
```bash
github-pr-metrics analyze [options]

Options:
  -i, --input <file>         Input JSON file path (default: "./temp/pr-data.json")
  --report <format>          Generate report in specified format (json, markdown)
  --report-output <file>     Output file for generated report
  -h, --help                Display help for command
```

### Config Command
Shows current configuration:
```bash
github-pr-metrics config
```

### Examples

#### Basic Workflow
```bash
# Collect data for last 7 days from your configured repo
npm run dev collect --repo your-org/your-repo --reviewer coderabbit[bot] --days 7

# Analyze and generate Markdown report
npm run dev analyze --input ./temp/pr-data.json --report markdown

# Analyze and generate JSON report with custom output
npm run dev analyze --input ./temp/pr-data.json --report json --report-output ./reports/metrics.json
```

#### Complete Workflow Example
```bash
# 1. Collect data from repository
npm run dev collect --repo microsoft/vscode --reviewer coderabbit[bot] --days 14

# 2. Generate reports
npm run dev analyze --input ./temp/pr-data.json --report markdown
npm run dev analyze --input ./temp/pr-data.json --report json --report-output ./reports/metrics.json
```

#### CI/CD Usage
For automated environments, chain the commands:
```bash
# Complete workflow in CI
github-pr-metrics collect --repo owner/repo --reviewer coderabbitai --start 2024-01-01 --end 2024-01-31
github-pr-metrics analyze --input ./temp/pr-data.json --report markdown
```

## What It Does

Currently implemented features:
- ✅ **Data Collection**: Retrieves PRs and comments from GitHub API
- ✅ **Authentication**: Supports GitHub tokens and GitHub App authentication  
- ✅ **Comment Analysis**: Processes reviewer comments with metadata
- ✅ **Reaction Tracking**: Collects and categorizes emoji reactions
- ✅ **Reply Detection**: Identifies comment threads and replies
- ✅ **CodeRabbit Integration**: Automatically detects "Addressed in commit" messages as positive feedback
- ✅ **Time Filtering**: Analyzes data within specified date ranges
- ✅ **Metrics Calculation**: Comprehensive statistics and effectiveness indicators
- ✅ **Data Storage**: JSON file-based data persistence
- ✅ **Detailed Analysis**: Resolution rates, engagement metrics, sentiment analysis
- ✅ **Report Generation**: Professional reports in Markdown and JSON formats
- ✅ **CLI Integration**: Seamless workflow from data collection to report generation

The tool operates in three phases:
1. **Collection Phase**: Gathers PR and comment data from GitHub API and saves to JSON
2. **Analysis Phase**: Processes the collected data and generates comprehensive metrics
3. **Reporting Phase**: Creates formatted reports for sharing and documentation

### Report Formats

#### Markdown Reports
- Human-readable format perfect for documentation
- Professional layout with tables and sections
- Includes engagement analysis and detailed breakdowns
- Ideal for sharing with teams and stakeholders

#### JSON Reports
- Machine-readable structured format with calculated percentages
- Clean, hierarchical data structure with metadata
- Perfect for further processing, automation, or integration with other tools
- Includes all raw data and computed metrics

### Sample Output
The analysis provides:
- Pull request summaries with state and author information
- Comment statistics with resolution and reaction tracking  
- Comprehensive metrics including resolution rates, engagement rates, and sentiment analysis
- Effectiveness indicators with color-coded ratings (🟢 Excellent, 🟡 Good, 🔴 Needs Improvement)
- Detailed breakdowns by PR state, comment type, and reaction type
- Professional reports ready for presentation or further analysis

## Development

### For CLI Development
```bash
npm test                # Run tests
npm run build          # Compile TypeScript to dist/
npm run dev            # Run CLI in development mode
```

### For GitHub Action Development
```bash
npm run build:action   # Create bundled action at dist-action/index.js
```

The GitHub Action uses a single bundled file (`dist-action/index.js`) that contains all dependencies. This file should be committed to the repository.

### Development Mode Examples
```bash
# Collect data in development mode
npm run dev collect --repo your-org/your-repo --reviewer coderabbit[bot] --days 7

# Analyze and generate report
npm run dev analyze --input ./temp/pr-data.json --report markdown

# Generate JSON report with custom output
npm run dev analyze --input ./temp/pr-data.json --report json --report-output ./reports/metrics.json
```

## GitHub Actions Integration

Use as a GitHub Action for automated PR metrics analysis:

```yaml
jobs:
  analyze-pr-metrics:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: read
      issues: read
    steps:
      - name: 'Analyze PR Metrics'
        uses: your-org/github-pr-metrics@v1
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          reviewer-username: 'coderabbitai'
          start-date: '2024-01-01'
          end-date: '2024-01-31'
          report-format: 'both'
```

**Important:** The `permissions` section is required for the `GITHUB_TOKEN` to access pull requests and issues data.

**Note:** Replace `your-org/github-pr-metrics@v1` with the actual published action reference.

**Benefits of JavaScript Action Architecture:**
- ⚡ Ultra-fast setup (~5-10 seconds)
- 📦 Pre-bundled dependencies (no runtime installation)
- 🔍 Native GitHub Actions core utilities
- 💾 Minimal resource overhead
- 🔄 Automatic dependency management

See [GITHUB_ACTIONS.md](./GITHUB_ACTIONS.md) for complete documentation.

## Features

- **Comprehensive Data Collection**: Collect PR data for specified repositories and time periods
- **AI Reviewer Analysis**: Analyze AI reviewer comment interactions and effectiveness
- **Professional Report Generation**: Generate reports in multiple formats (JSON, Markdown)
- **Flexible CLI Interface**: Standalone commands or integrated workflow options
- **Extensible Architecture**: Plugin system for custom metrics and AI reviewers
- **CI/CD Integration**: Perfect for GitHub Actions and automated reporting workflows
- **Real-time Analysis**: Console output with detailed metrics and effectiveness indicators

## Installation

```bash
npm install
npm run build
```

## Usage

### Basic Workflow

1. **Collect PR data from GitHub**:
   ```bash
   github-pr-metrics collect --repo owner/repo --reviewer coderabbit[bot] --days 30
   ```

2. **Analyze data and generate report**:
   ```bash
   github-pr-metrics analyze --input ./temp/pr-data.json --report markdown
   ```

3. **Generate different report formats**:
   ```bash
   # JSON report
   github-pr-metrics analyze --input ./temp/pr-data.json --report json
   
   # Custom output location
   github-pr-metrics analyze --input ./temp/pr-data.json --report json --report-output ./reports/metrics.json
   ```

### Development Mode

```bash
# Using npm scripts for development
npm run dev collect --repo owner/repo --reviewer coderabbit[bot] --days 7
npm run dev analyze --input ./temp/pr-data.json --report markdown
```

## Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch
```

## Troubleshooting

### GitHub Actions Authentication Issues

**Problem:** Workflow fails with "Authentication failed: Request failed with status code 403"

**Solution:** Add required permissions to your workflow:
```yaml
jobs:
  your-job:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: read
      issues: read
```

**Problem:** Rate limiting errors

**Solution:** The tool automatically handles rate limits, but for large repositories consider:
- Using a Personal Access Token instead of `GITHUB_TOKEN`
- Running analysis during off-peak hours
- Reducing the analysis time period

### CLI Issues

**Problem:** "GitHub token is required" error

**Solution:** Ensure your `.env` file contains a valid `GITHUB_TOKEN`:
```env
GITHUB_TOKEN=ghp_your_token_here
```

**Problem:** No data collected

**Solution:** Verify:
- Repository name format is correct (`owner/repo`)
- Reviewer username matches exactly (case-sensitive)
- Date range contains actual PR activity

## Project Structure

```
src/
├── cli/                # Command-line interface
│   ├── index.ts        # Main CLI entry point
│   ├── collect.ts      # Data collection command
│   └── analyze.ts      # Analysis and reporting command
├── action.ts           # GitHub Action entry point
├── workflow.ts         # Shared workflow logic
├── config.ts           # Configuration management
├── github.ts           # GitHub API client
├── collectors.ts       # Data collection services
├── processors.ts       # Data processing logic
├── metrics.ts          # Metrics calculation engines
├── reporters.ts        # Report generation system
├── storage.ts          # Data persistence
├── types/              # TypeScript type definitions
│   ├── core.ts         # Core data models
│   ├── interfaces.ts   # System interfaces
│   └── index.ts        # Type exports
└── index.ts            # Main exports

tests/
├── unit/               # Unit tests
├── properties/         # Property-based tests
└── fixtures/           # Test data fixtures

dist-action/
└── index.js            # Bundled GitHub Action
```

## Configuration

The tool can be configured through environment variables, configuration files, or CLI arguments. See the documentation for detailed configuration options.


## License

MIT