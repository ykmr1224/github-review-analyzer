# GitHub PR Metrics Analyzer

A metrics collection tool that analyzes GitHub Pull Request feedback effectiveness, specifically targeting AI reviewer comments (starting with CodeRabbit) but designed to be extensible for any AI agent.

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
REVIEWER_USERNAME=coderabbitai
```

### 3. Build the Project
```bash
npm run build
```

### 4. Run Analysis
```bash
# Step 1: Collect data from GitHub
npm start collect --repo owner/repo --reviewer coderabbitai --days 7

# Step 2: Analyze the collected data
npm start analyze --input ./temp/pr-data.json --detailed

# Or use development mode
npm run dev collect --repo owner/repo --reviewer coderabbitai --days 7
npm run dev analyze --input ./temp/pr-data.json

# Show current configuration
npm run dev config
```

## CLI Usage

The tool provides three main commands:

### Collect Command
Collects PR data from GitHub and saves to JSON file:
```bash
github-pr-metrics collect [options]

Options:
  -r, --repo <repo>      Repository in format owner/repo
  -u, --reviewer <user>  Reviewer username to analyze
  -d, --days <days>      Number of days to analyze (default: "7")
  -o, --output <file>    Output JSON file path (default: "./temp/pr-data.json")
  -h, --help            Display help for command
```

### Analyze Command
Analyzes collected PR data from JSON file:
```bash
github-pr-metrics analyze [options]

Options:
  -i, --input <file>     Input JSON file path (default: "./temp/pr-data.json")
  --detailed            Show detailed comment analysis
  -h, --help            Display help for command
```

### Config Command
Shows current configuration:
```bash
github-pr-metrics config
```

### Examples
```bash
# Collect data for last 7 days from your configured repo
npm run dev collect

# Collect from specific repository for last 7 days
npm run dev collect --repo microsoft/vscode --days 7 --reviewer dependabot

# Analyze collected data with detailed output
npm run dev analyze --detailed

# Full workflow example
npm run dev collect --repo microsoft/vscode --reviewer coderabbitai --days 14
npm run dev analyze --input ./temp/pr-data.json --detailed
```

## What It Does

Currently implemented features:
- ✅ **Data Collection**: Retrieves PRs and comments from GitHub API
- ✅ **Authentication**: Supports GitHub tokens and GitHub App authentication  
- ✅ **Comment Analysis**: Processes reviewer comments with metadata
- ✅ **Reaction Tracking**: Collects and categorizes emoji reactions
- ✅ **Reply Detection**: Identifies comment threads and replies
- ✅ **Time Filtering**: Analyzes data within specified date ranges
- ✅ **Metrics Calculation**: Comprehensive statistics and effectiveness indicators
- ✅ **Data Storage**: JSON file-based data persistence
- ✅ **Detailed Analysis**: Resolution rates, engagement metrics, sentiment analysis

The tool operates in two phases:
1. **Collection Phase**: Gathers PR and comment data from GitHub API and saves to JSON
2. **Analysis Phase**: Processes the collected data and generates comprehensive metrics

### Sample Output
The analysis provides:
- Pull request summaries with state and author information
- Comment statistics with resolution and reaction tracking  
- Comprehensive metrics including resolution rates, engagement rates, and sentiment analysis
- Effectiveness indicators with color-coded ratings (🟢 Excellent, 🟡 Good, 🔴 Needs Improvement)
- Detailed breakdowns by PR state, comment type, and reaction type

## Development

### Run Tests
```bash
npm test
```

### Development Mode
```bash
# Collect data in development mode
npm run dev collect --repo your-org/your-repo --reviewer coderabbitai --days 7

# Analyze collected data
npm run dev analyze --input ./temp/pr-data.json --detailed
```

### Build
```bash
npm run build
```

## Features

- Collect PR data for specified repositories and time periods
- Analyze AI reviewer comment interactions and effectiveness
- Generate comprehensive reports in multiple formats (JSON, Markdown, HTML)
- Extensible plugin system for custom metrics and AI reviewers
- GitHub Actions integration for automated reporting

## Installation

```bash
npm install
npm run build
```

## Usage

```bash
# Step 1: Collect data from GitHub
npm run start collect --repo owner/repo --period 30d --ai-reviewer coderabbitai

# Step 2: Analyze collected data  
npm run start analyze --input ./temp/pr-data.json

# Development mode
npm run dev collect --help
npm run dev analyze --help
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

## Project Structure

```
src/
├── cli/                 # Command-line interface
├── config/             # Configuration management
├── github/             # GitHub API client
├── collectors/         # Data collection services
├── processors/         # Data processing logic
├── metrics/            # Metrics calculation engines
├── plugins/            # Plugin system implementation
├── reporters/          # Report generation
├── templates/          # Report templates
├── types/              # TypeScript type definitions
└── utils/              # Shared utilities

tests/
├── unit/               # Unit tests
├── properties/         # Property-based tests
└── fixtures/           # Test data fixtures
```

## Configuration

The tool can be configured through environment variables, configuration files, or CLI arguments. See the documentation for detailed configuration options.

## License

MIT