# GitHub PR Metrics Analyzer

A metrics collection tool that analyzes GitHub Pull Request feedback effectiveness, specifically targeting AI reviewer comments (starting with CodeRabbit) but designed to be extensible for any AI agent.

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