# GitHub Actions Integration

Use the GitHub PR Metrics Analyzer as a GitHub Action in your workflows.

## Quick Start

```yaml
name: 'Weekly PR Metrics'
on:
  schedule:
    - cron: '0 0 * * 0'  # Every Sunday at midnight UTC
  workflow_dispatch:  # Allow manual runs

jobs:
  analyze:
    runs-on: ubuntu-latest
    steps:
      - name: 'Analyze PR Metrics'
        uses: your-org/github-pr-metrics@v1
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          reviewer-username: 'coderabbitai[bot]'
          # Analyzes last 7 days by default - perfect for weekly runs!
```

## Inputs

| Input | Required | Default | Description |
|-------|----------|---------|-------------|
| `github-token` | ✅ | - | GitHub token for API access |
| `reviewer-username` | ✅ | - | AI reviewer username to analyze |
| `days` | ❌ | `7` | Number of days to analyze from today |
| `start-date` | ❌ | - | Analysis start date (YYYY-MM-DD) |
| `end-date` | ❌ | - | Analysis end date (YYYY-MM-DD) |
| `repository` | ❌ | Current repo | Repository to analyze (owner/repo) |
| `report-format` | ❌ | `both` | Report format: json, markdown, or both |
| `output-path` | ❌ | `./pr-metrics-reports` | Output directory for reports |
| `include-detailed` | ❌ | `true` | Include detailed metrics |

**Date Options:** By default analyzes last 7 days. Use `days` for different periods or `start-date`/`end-date` for precise control.

## Outputs

| Output | Description |
|--------|-------------|
| `report-json-path` | Path to generated JSON report |
| `report-markdown-path` | Path to generated Markdown report |
| `total-prs` | Total number of PRs analyzed |
| `total-comments` | Total number of AI reviewer comments |
| `average-comments-per-pr` | Average comments per PR |

## Example Workflows

### Weekly Analysis

```yaml
name: 'Weekly PR Metrics'
on:
  schedule:
    - cron: '0 0 * * 0'  # Every Sunday
  workflow_dispatch:

jobs:
  analyze:
    runs-on: ubuntu-latest
    steps:
      - name: 'Analyze PR Metrics'
        id: metrics
        uses: your-org/github-pr-metrics@v1
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          reviewer-username: 'coderabbitai[bot]'
          # Uses default 7 days - perfect for weekly analysis!
      
      - name: 'Upload Reports'
        uses: actions/upload-artifact@v4
        with:
          name: pr-metrics-reports
          path: ./pr-metrics-reports/
```

### Manual Analysis

```yaml
name: 'Manual PR Analysis'
on:
  workflow_dispatch:
    inputs:
      days:
        description: 'Number of days to analyze'
        default: '30'
        type: string
      reviewer:
        description: 'AI reviewer username'
        default: 'coderabbitai[bot]'

jobs:
  analyze:
    runs-on: ubuntu-latest
    steps:
      - name: 'Run Analysis'
        uses: your-org/github-pr-metrics@v1
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          reviewer-username: ${{ github.event.inputs.reviewer }}
          days: ${{ github.event.inputs.days }}
```

## Security

Required permissions:
```yaml
permissions:
  contents: read
  pull-requests: read
  issues: read
```

The action automatically masks tokens and validates inputs.

## Development

Build the action:
```bash
npm run build:action
```

Always commit `dist-action/index.js` after changes.