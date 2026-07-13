import OpenAI from 'openai';
import { config } from '../config.js';
import { getMarketsWithContracts } from '../data/markets.js';
import { enrichMarket } from '../chain/markets.js';
import type { AiTradeSuggestion, AiTraderRules, Market } from '../types.js';

const client = config.XAI_API_KEY
  ? new OpenAI({ apiKey: config.XAI_API_KEY, baseURL: 'https://api.x.ai/v1' })
  : null;

function marketSnapshot(m: Market): string {
  const odds = m.outcomes.map((o) => `${o.label}:${o.probability}%`).join(', ');
  return `[${m.id}] ${m.category} | ${m.question} | ${odds} | vol $${m.volumeUsd}`;
}

export async function scanMarketsForTrades(
  rules: AiTraderRules,
  limit = 5,
): Promise<AiTradeSuggestion[]> {
  const all = getMarketsWithContracts().filter(
    (m) =>
      (m.status === 'open' || m.status === 'live') &&
      rules.categories.includes(m.category as AiTraderRules['categories'][number]),
  );

  const enriched = await Promise.all(all.slice(0, 15).map(enrichMarket));

  const candidates = enriched.filter((m) =>
    m.outcomes.some((o) => o.probability >= rules.minProbability),
  );

  if (!client) {
    return heuristicSuggestions(candidates, rules).slice(0, limit);
  }

  const prompt = `You are HoodPredict AI Trader — a disciplined prediction market agent on Robinhood Chain.

USER RULES:
- Max bet: $${rules.maxBetUsd} USDC per trade
- Min probability threshold: ${rules.minProbability}%
- Categories: ${rules.categories.join(', ')}
- Daily budget: $${rules.dailyBudgetUsd}
- Auto-execute: ${rules.autoExecute ? 'yes (high confidence only)' : 'no — suggest only'}

MARKETS:
${candidates.slice(0, 10).map(marketSnapshot).join('\n')}

Analyze and return up to ${limit} trade suggestions as JSON array:
[{"marketId":"m1","outcomeIndex":0,"outcomeLabel":"Yes","amountUsd":25,"confidence":82,"reasoning":"one sentence"}]

Only suggest outcomes meeting min probability. Be selective. JSON only.`;

  try {
    const resp = await client.chat.completions.create({
      model: config.XAI_MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.4,
      max_tokens: 800,
    });

    const text = resp.choices[0]?.message?.content ?? '[]';
    const match = text.match(/\[[\s\S]*\]/);
    if (!match) return heuristicSuggestions(candidates, rules).slice(0, limit);

    const parsed = JSON.parse(match[0]) as AiTradeSuggestion[];
    return parsed
      .filter((s) => s.amountUsd <= rules.maxBetUsd && s.confidence >= 60)
      .slice(0, limit);
  } catch {
    return heuristicSuggestions(candidates, rules).slice(0, limit);
  }
}

function heuristicSuggestions(markets: Market[], rules: AiTraderRules): AiTradeSuggestion[] {
  const out: AiTradeSuggestion[] = [];
  for (const m of markets) {
    const best = [...m.outcomes].sort((a, b) => b.probability - a.probability)[0];
    const idx = m.outcomes.indexOf(best);
    if (!best || best.probability < rules.minProbability) continue;

    out.push({
      marketId: m.id,
      outcomeIndex: idx,
      outcomeLabel: best.label,
      amountUsd: Math.min(rules.maxBetUsd, 25),
      confidence: Math.round(best.probability),
      reasoning: `${best.label} leads at ${best.probability}% with ${m.volumeUsd >= 1_000_000 ? 'strong' : 'decent'} volume.`,
    });
    if (out.length >= 3) break;
  }
  return out;
}

export async function forecastMarket(marketId: string): Promise<string> {
  const market = await enrichMarket(
    getMarketsWithContracts().find((m) => m.id === marketId)!,
  );

  if (!client) {
    const top = market.outcomes[0];
    return (
      `📈 *AI Forecast — ${market.question}*\n\n` +
      `Leading outcome: *${top?.label}* at ${top?.probability}%\n` +
      `_Add XAI_API_KEY for deep probability forecasts._`
    );
  }

  const prompt = `Forecast this Robinhood Chain prediction market for retail bettors.

Market: ${market.question}
Category: ${market.category}
Outcomes: ${market.outcomes.map((o) => `${o.label} ${o.probability}%`).join(', ')}
Volume: $${market.volumeUsd}
Ends: ${market.endTime}

Give: 1) Updated probability estimate 2) Key catalysts 3) Risk factors 4) 1-week outlook.
Under 180 words. Markdown. Exciting but honest tone.`;

  const resp = await client.chat.completions.create({
    model: config.XAI_MODEL,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.5,
    max_tokens: 400,
  });

  return `🔮 *AI Forecast*\n\n${resp.choices[0]?.message?.content ?? 'Unavailable'}`;
}

export function formatSuggestion(s: AiTradeSuggestion, question: string): string {
  return (
    `🤖 *AI Trade Suggestion*\n\n` +
    `📌 ${question}\n` +
    `✅ *${s.outcomeLabel}* — $${s.amountUsd} USDC\n` +
    `🎯 Confidence: *${s.confidence}%*\n` +
    `💡 ${s.reasoning}`
  );
}