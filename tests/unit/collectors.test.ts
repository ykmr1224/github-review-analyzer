/**
 * Unit tests for data collection services
 */

import { DataCollector } from '../../src/collectors';
import { IGitHubClient } from '../../src/types/interfaces';
import { PullRequest, Comment, User, Reaction } from '../../src/types/core';
import { AnalysisConfig, RepositoryConfig } from '../../src/config';

// Mock GitHub client for testing
class MockGitHubClient implements IGitHubClient {
  private authenticated = true;

  async authenticate(): Promise<void> {
    this.authenticated = true;
  }

  async getPullRequests(): Promise<PullRequest[]> {
    const mockUser: User = { login: 'testuser', type: 'User', id: 1 };
    return [
      {
        id: 1,
        number: 1,
        title: 'Test PR',
        state: 'open',
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-02'),
        author: mockUser,
        comments: []
      }
    ];
  }

  async getComments(): Promise<Comment[]> {
    const mockUser: User = { login: 'coderabbitai', type: 'Bot', id: 2 };
    const mockReaction: Reaction = {
      type: 'thumbs_up',
      user: { login: 'reviewer', type: 'User', id: 3 },
      createdAt: new Date('2023-01-01')
    };

    return [
      {
        id: 1,
        body: 'This looks good!',
        author: mockUser,
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-01'),
        isResolved: false,
        reactions: [mockReaction],
        replies: []
      }
    ];
  }

  async getRateLimit() {
    return { limit: 5000, remaining: 4999, resetTime: new Date() };
  }

  isAuthenticated(): boolean {
    return this.authenticated;
  }
}

describe('DataCollector', () => {
  let mockClient: MockGitHubClient;
  let collector: DataCollector;

  beforeEach(() => {
    mockClient = new MockGitHubClient();
    collector = new DataCollector(mockClient);
  });

  describe('collectComments', () => {
    it('should filter comments by AI reviewer username', async () => {
      const mockPRs: PullRequest[] = [
        {
          id: 1,
          number: 1,
          title: 'Test PR',
          state: 'open',
          createdAt: new Date('2023-01-01'),
          updatedAt: new Date('2023-01-02'),
          author: { login: 'testuser', type: 'User', id: 1 },
          comments: []
        }
      ];

      const repoConfig: RepositoryConfig = { owner: 'testowner', repo: 'testrepo' };
      const comments = await collector.collectComments(mockPRs, 'coderabbitai', repoConfig);
      
      expect(comments).toHaveLength(1);
      expect(comments[0].author.login).toBe('coderabbitai');
    });

    it('should handle case-insensitive username matching', async () => {
      const mockPRs: PullRequest[] = [
        {
          id: 1,
          number: 1,
          title: 'Test PR',
          state: 'open',
          createdAt: new Date('2023-01-01'),
          updatedAt: new Date('2023-01-02'),
          author: { login: 'testuser', type: 'User', id: 1 },
          comments: []
        }
      ];

      const repoConfig: RepositoryConfig = { owner: 'testowner', repo: 'testrepo' };
      const comments = await collector.collectComments(mockPRs, 'CODERABBITAI', repoConfig);
      
      expect(comments).toHaveLength(1);
      expect(comments[0].author.login).toBe('coderabbitai');
    });
  });


});

describe('DataCollector with repository config', () => {
  let mockClient: MockGitHubClient;
  let collector: DataCollector;
  let repoConfig: RepositoryConfig;

  beforeEach(() => {
    mockClient = new MockGitHubClient();
    repoConfig = { owner: 'testowner', repo: 'testrepo' };
    collector = new DataCollector(mockClient);
  });

  describe('collectPullRequests', () => {
    it('should collect pull requests with time period filtering', async () => {
      const config: AnalysisConfig = {
        reviewerUserName: 'coderabbitai',
        timePeriod: {
          start: new Date('2022-12-01'),
          end: new Date('2023-02-01')
        }
      };

      const prs = await collector.collectPullRequests(config, repoConfig);
      
      expect(prs).toHaveLength(1);
      expect(prs[0].createdAt).toBeInstanceOf(Date);
    });
  });

  describe('parseCommentMetadata', () => {
    it('should parse and validate comment metadata', () => {
      const rawComment: Comment = {
        id: 1,
        body: 'Test comment',
        author: { login: 'testuser', type: 'User', id: 1 },
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-01'),
        isResolved: false,
        reactions: [],
        replies: []
      };

      const parsed = collector.parseCommentMetadata(rawComment);
      
      expect(parsed.createdAt).toBeInstanceOf(Date);
      expect(parsed.updatedAt).toBeInstanceOf(Date);
      expect(parsed.author.login).toBe('testuser');
      expect(Array.isArray(parsed.reactions)).toBe(true);
      expect(Array.isArray(parsed.replies)).toBe(true);
    });
  });

  describe('reaction type validation', () => {
    it('should handle unknown reaction types without polluting data', () => {
      const commentWithUnknownReaction: Comment = {
        id: 1,
        body: 'Test comment',
        author: { login: 'testuser', type: 'User', id: 1 },
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-01'),
        isResolved: false,
        reactions: [
          {
            type: 'invalid_type' as any, // Simulate invalid reaction type
            user: { login: 'reviewer', type: 'User', id: 3 },
            createdAt: new Date('2023-01-01')
          }
        ],
        replies: []
      };

      const parsed = collector.parseCommentMetadata(commentWithUnknownReaction);
      
      // The reaction should still be there but type should be preserved for validation later
      expect(parsed.reactions).toHaveLength(1);
      expect(parsed.reactions[0].type).toBe('invalid_type'); // parseCommentMetadata doesn't validate types
    });

    it('should convert invalid reaction types to unknown during enhancement', async () => {
      const commentsWithInvalidReactions: Comment[] = [
        {
          id: 1,
          body: 'Test comment',
          author: { login: 'testuser', type: 'User', id: 1 },
          createdAt: new Date('2023-01-01'),
          updatedAt: new Date('2023-01-01'),
          isResolved: false,
          reactions: [
            {
              type: 'invalid_type' as any, // Simulate invalid reaction type
              user: { login: 'reviewer', type: 'User', id: 3 },
              createdAt: new Date('2023-01-01')
            }
          ],
          replies: []
        }
      ];

      const enhanced = await collector.enhanceCommentMetadata(commentsWithInvalidReactions);
      
      // The invalid reaction type should be converted to 'unknown'
      expect(enhanced).toHaveLength(1);
      expect(enhanced[0].reactions).toHaveLength(1);
      expect(enhanced[0].reactions[0].type).toBe('unknown');
    });
  });

  describe('reply detection', () => {
    it('should detect replies using GitHub inReplyToId attribute', async () => {
      const parentComment: Comment = {
        id: 1,
        body: 'Original comment',
        author: { login: 'reviewer', type: 'Bot', id: 1 },
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-01'),
        isResolved: false,
        reactions: [],
        replies: []
      };

      const replyComment: Comment = {
        id: 2,
        body: 'Reply to original comment',
        author: { login: 'developer', type: 'User', id: 2 },
        createdAt: new Date('2023-01-02'),
        updatedAt: new Date('2023-01-02'),
        isResolved: false,
        reactions: [],
        replies: [],
        inReplyToId: 1 // This comment is a reply to comment ID 1
      };

      const enhanced = await collector.enhanceCommentMetadata([parentComment, replyComment]);
      
      // The parent comment should have the reply in its replies array
      expect(enhanced[0].replies).toHaveLength(1);
      expect(enhanced[0].replies[0].id).toBe(2);
      expect(enhanced[0].replies[0].inReplyToId).toBe(1);
      
      // The reply comment should have no replies itself
      expect(enhanced[1].replies).toHaveLength(0);
    });

    it('should efficiently handle multiple replies using hash map', async () => {
      const parentComment: Comment = {
        id: 1,
        body: 'Original comment',
        author: { login: 'reviewer', type: 'Bot', id: 1 },
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-01'),
        isResolved: false,
        reactions: [],
        replies: []
      };

      const reply1: Comment = {
        id: 2,
        body: 'First reply',
        author: { login: 'dev1', type: 'User', id: 2 },
        createdAt: new Date('2023-01-02'),
        updatedAt: new Date('2023-01-02'),
        isResolved: false,
        reactions: [],
        replies: [],
        inReplyToId: 1
      };

      const reply2: Comment = {
        id: 3,
        body: 'Second reply',
        author: { login: 'dev2', type: 'User', id: 3 },
        createdAt: new Date('2023-01-03'),
        updatedAt: new Date('2023-01-03'),
        isResolved: false,
        reactions: [],
        replies: [],
        inReplyToId: 1
      };

      const enhanced = await collector.enhanceCommentMetadata([parentComment, reply1, reply2]);
      
      // The parent comment should have both replies, sorted by creation date
      expect(enhanced[0].replies).toHaveLength(2);
      expect(enhanced[0].replies[0].id).toBe(2); // First reply (earlier date)
      expect(enhanced[0].replies[1].id).toBe(3); // Second reply (later date)
      
      // Reply comments should have no replies themselves
      expect(enhanced[1].replies).toHaveLength(0);
      expect(enhanced[2].replies).toHaveLength(0);
    });
  });

  describe('collectComments with repository config', () => {
    it('should work with explicit repository configuration', async () => {
      const mockPRs: PullRequest[] = [
        {
          id: 1,
          number: 1,
          title: 'Test PR',
          state: 'open',
          createdAt: new Date('2023-01-01'),
          updatedAt: new Date('2023-01-02'),
          author: { login: 'testuser', type: 'User', id: 1 },
          comments: []
        }
      ];

      // Should work when passing repoConfig explicitly
      const comments = await collector.collectComments(mockPRs, 'coderabbitai', repoConfig);
      
      expect(comments).toHaveLength(1);
      expect(comments[0].author.login).toBe('coderabbitai');
    });
  });
});