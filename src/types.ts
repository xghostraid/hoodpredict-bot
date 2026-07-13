export type MarketCategory =
  | 'trending'
  | 'stock_tokens'
  | 'sports'
  | 'crypto'
  | 'politics'
  | 'entertainment';

export type MarketStatus = 'open' | 'closed' | 'resolved' | 'cancelled' | 'live';

export type BetStatus = 'active' | 'won' | 'lost' | 'claimed' | 'refunded' | 'pending';

export interface MarketOutcome {
  id: string;
  label: string;
  probability: number;
  odds: string;
  poolUsd: number;
}

export interface Market {
  id: string;
  question: string;
  description?: string;
  category: MarketCategory;
  status: MarketStatus;
  outcomes: MarketOutcome[];
  volumeUsd: number;
  liquidityUsd: number;
  endTime: string;
  createdAt?: string;
  imageUrl?: string;
  tags: string[];
  isLive?: boolean;
  collateral: 'USDC' | 'NVDA' | 'AAPL' | 'ETH' | string;
  contractAddress?: string;
  comments: number;
  creator: string;
}

export interface UserBet {
  id: string;
  marketId: string;
  marketQuestion: string;
  outcomeLabel: string;
  outcomeIndex: number;
  amount: number;
  collateral: string;
  potentialPayout: number;
  status: BetStatus;
  placedAt: string;
  resolvedAt?: string;
  txHash?: string;
}

export interface AiTraderRules {
  maxBetUsd: number;
  minProbability: number;
  categories: MarketCategory[];
  autoExecute: boolean;
  dailyBudgetUsd: number;
}

export interface AiTradeSuggestion {
  marketId: string;
  outcomeIndex: number;
  outcomeLabel: string;
  amountUsd: number;
  confidence: number;
  reasoning: string;
}

export type PremiumTier = 'free' | 'premium';

export interface Comment {
  id: string;
  user: string;
  text: string;
  createdAt: string;
  likes: number;
}

export interface ProbabilityPoint {
  time: string;
  probabilities: number[];
}