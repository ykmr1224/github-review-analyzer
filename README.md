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
# Using npm script
npm start analyze

# Or directly with options
npm run dev analyze --repo owner/repo --reviewer coderabbitai --days 30

# Show current configuration
npm run dev config
```

## CLI Usage

### Analyze Command
```bash
github-pr-metrics analyze [options]

Options:
  -r, --repo <repo>      Repository in format owner/repo
  -u, --reviewer <user>  Reviewer username to analyze (default: "coderabbitai")
  -d, --days <days>      Number of days to analyze (default: "30")
  -h, --help            Display help for command
```

### Examples
```bash
# Analyze last 30 days for CodeRabbit in your configured repo
npm run dev analyze

# Analyze specific repository for last 7 days
npm run dev analyze --repo microsoft/vscode --days 7

# Analyze different reviewer
npm run dev analyze --reviewer github-copilot --days 14
```

## What It Does

Currently implemented features:
- ✅ **Data Collection**: Retrieves PRs and comments from GitHub API
- ✅ **Authentication**: Supports GitHub tokens and GitHub App authentication
- ✅ **Comment Analysis**: Processes reviewer comments with metadata
- ✅ **Reaction Tracking**: Collects and categorizes emoji reactions
- ✅ **Reply Detection**: Identifies comment threads and replies
- ✅ **Time Filtering**: Analyzes data within specified date ranges

The tool will display:
- Pull request summaries
- Comment statistics
- Reaction breakdowns
- Basic metrics (resolution rates, engagement, etc.)

## Development

### Run Tests
```bash
npm test
```

### Development Mode
```bash
npm run dev analyze --repo your-org/your-repo
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
# CLI usage
npm run start -- --repo owner/repo --period 30d --ai-reviewer coderabbitai

# Development
npm run dev -- --help
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