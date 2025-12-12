# Minimal Configuration Example

## Environment Variables

```bash
# Required
GITHUB_REPOSITORY_OWNER=microsoft
GITHUB_REPOSITORY_NAME=vscode
GITHUB_TOKEN=ghp_your_token_here

# Optional (with defaults)
REVIEWER_USERNAME=coderabbitai
ANALYSIS_START_DATE=2024-01-01
ANALYSIS_END_DATE=2024-12-31
OUTPUT_FORMAT=json
OUTPUT_DIR=./reports
```

## Usage

```typescript
import { ConfigurationManager } from './src/config';

const configManager = new ConfigurationManager();
const config = await configManager.loadConfig();

console.log(config);
// {
//   repository: { owner: 'microsoft', repo: 'vscode' },
//   auth: { token: 'ghp_your_token_here' },
//   analysis: {
//     reviewerUserName: 'coderabbitai',
//     timePeriod: { start: Date, end: Date }
//   },
//   output: { format: 'json', outputDir: './reports' }
// }
```

## What Was Simplified

- Removed complex validation schemas
- Removed plugin system configuration
- Removed advanced options (rate limiting, caching, retry)
- Removed multiple authentication methods (only token now)
- Removed file-based configuration loading
- Removed CLI argument parsing
- Simplified to only environment variables + defaults
- Removed complex merging and nested property setting

This gives us exactly what we need to start implementing the core functionality!