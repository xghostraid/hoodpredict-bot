/** Top predictors on HoodPredict — demo whales for copy-trading UX */

export interface WhaleProfile {
  id: string;
  handle: string;
  winRate: number;
  volumeUsd: number;
  pnlUsd: number;
  specialty: string;
  emoji: string;
}

export const TOP_WHALES: WhaleProfile[] = [
  {
    id: 'w1',
    handle: '0xDegen...King',
    winRate: 68,
    volumeUsd: 284_000,
    pnlUsd: 42_100,
    specialty: 'Sports',
    emoji: '🏆',
  },
  {
    id: 'w2',
    handle: '0xStock...Oracle',
    winRate: 61,
    volumeUsd: 512_000,
    pnlUsd: 38_400,
    specialty: 'Stock Tokens',
    emoji: '📈',
  },
  {
    id: 'w3',
    handle: '0xPoly...Sharp',
    winRate: 72,
    volumeUsd: 198_000,
    pnlUsd: 29_800,
    specialty: 'Politics',
    emoji: '🏛️',
  },
  {
    id: 'w4',
    handle: '0xChain...Alpha',
    winRate: 58,
    volumeUsd: 890_000,
    pnlUsd: 67_200,
    specialty: 'Crypto',
    emoji: '₿',
  },
];

export function getWhale(id: string): WhaleProfile | undefined {
  return TOP_WHALES.find((w) => w.id === id);
}