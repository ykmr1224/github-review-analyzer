# Example Usage

## Testing with a Public Repository

You can test the tool with any public GitHub repository without authentication for basic functionality:

### 1. Set up minimal configuration
Create a `.env` file:
```env
GITHUB_REPOSITORY_OWNER=microsoft
GITHUB_REPOSITORY_NAME=vscode
REVIEWER_USERNAME=github-actions
GITHUB_AUTH_TYPE=token
GITHUB_TOKEN=your_token_here
```

### 2. Run analysis
```bash
# Build first
npm run build

# Test with development mode
npm run dev analyze --repo microsoft/vscode --reviewer dependabot --days 7

# Or use built version
npm start analyze --repo microsoft/vscode --reviewer dependabot --days 7
```

## What You'll See

The tool will output:
1. **Configuration Summary** - Repository, reviewer, time period
2. **Authentication Status** - GitHub API connection
3. **Pull Requests Summary** - List of PRs found in the time period
4. **Comments Summary** - Detailed breakdown of reviewer comments
5. **Basic Statistics** - Counts, averages, and percentages

## Example Output

```
🚀 GitHub PR Metrics Analyzer
================================

📋 Loading configuration...
📊 Repository: microsoft/vscode
👤 Reviewer: dependabot
📅 Period: 2024-12-04 to 2024-12-11

🔐 Authenticating with GitHub...
✅ Authentication successful

📥 Collecting pull requests...
✅ Found 15 pull requests

📋 Pull Requests Summary:
========================
1. #1234: Bump axios from 1.5.0 to 1.6.0
   State: merged | Author: dependabot[bot]
   Created: 2024-12-10

💬 Collecting reviewer comments...
✅ Found 8 comments from dependabot

💬 Comments Summary:
===================
1. Comment ID: 12345
   Author: dependabot[bot] (Bot)
   Created: 2024-12-10T10:30:00Z
   Resolved: ✅
   Reactions: 2
   Replies: 1
   Reaction breakdown: {"thumbs_up":2}
   Body preview: Bumps axios from 1.5.0 to 1.6.0...

📊 Basic Statistics:
===================
Total PRs: 15
Total Comments: 8
Average Comments per PR: 0.53
Resolved Comments: 6 (75.0%)
Total Reactions: 12
Total Replies: 3

🎉 Analysis complete!
```

## Next Steps

Once you verify the data collection works, you can:
1. Configure it for your own repositories
2. Analyze different reviewers (CodeRabbit, GitHub Copilot, etc.)
3. Experiment with different time periods
4. Use the collected data for further analysis