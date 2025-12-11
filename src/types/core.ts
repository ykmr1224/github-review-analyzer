/**
 * Core data models for GitHub PR metrics analysis
 */

export interface User {
  login: string;
  type: 'User' | 'Bot';
  id: number;
}

export interface Reaction {
  type: 'thumbs_up' | 'thumbs_down' | 'laugh' | 'hooray' | 'confused' | 'heart' | 'rocket' | 'eyes';
  user: User;
  createdAt: Date;
}

export interface Comment {
  id: number;
  body: string;
  author: User;
  createdAt: Date;
  updatedAt: Date;
  position?: number;
  path?: string;
  isResolved: boolean;
  reactions: Reaction[];
  replies: Comment[];
}

export interface PullRequest {
  id: number;
  number: number;
  title: string;
  state: 'open' | 'closed' | 'merged';
  createdAt: Date;
  updatedAt: Date;
  mergedAt?: Date;
  author: User;
  comments: Comment[];
}

export interface DateRange {
  start: Date;
  end: Date;
}

export interface MetricsSummary {
  totalPRs: number;
  totalComments: number;
  averageCommentsPerPR: number;
  positiveReactions: number;
  negativeReactions: number;
  repliedComments: number;
  resolvedComments: number;
}

export interface DetailedMetrics {
  prBreakdown: {
    byState: Record<string, number>;
    byAuthor: Record<string, number>;
  };
  commentBreakdown: {
    byType: Record<string, number>;
    byResolution: Record<string, number>;
  };
  reactionBreakdown: {
    byType: Record<string, number>;
    positiveVsNegative: {
      positive: number;
      negative: number;
    };
  };
}

export interface MetricsReport {
  repository: string;
  period: DateRange;
  aiReviewer: string;
  summary: MetricsSummary;
  detailed: DetailedMetrics;
  generatedAt: Date;
}