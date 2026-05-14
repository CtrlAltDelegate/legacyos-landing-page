/**
 * Flo AI Service
 *
 * Flo is LegacyOS's AI financial companion. She:
 * - Provides financial INFORMATION, not advice
 * - Uses "here's how people in similar situations..." framing
 * - Always appends a compliance disclaimer
 * - Has full access to the user's portfolio context
 * - Never directs "buy X" or "sell Y"
 */

const Anthropic = require('@anthropic-ai/sdk');

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const COMPLIANCE_DISCLAIMER =
  'This information is provided for educational purposes only and does not constitute financial, tax, or legal advice. Please consult a qualified financial advisor before making any financial decisions.';

/**
 * Build Flo's system prompt with the user's portfolio context.
 *
 * @param {object} portfolioContext - User's financial data
 * @returns {string} System prompt
 */
function buildSystemPrompt(portfolioContext) {
  const { user, subscription, netWorthSnapshot, equities, realEstate, otherAssets } = portfolioContext;

  const fmt = (n) =>
    n != null
      ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
      : 'not available';

  const portfolioSummary = netWorthSnapshot
    ? `
CURRENT PORTFOLIO SNAPSHOT (as of ${netWorthSnapshot.snapshot_date}):
- Net Worth: ${fmt(netWorthSnapshot.net_worth)}
- Total Assets: ${fmt(netWorthSnapshot.total_assets)}
- Total Liabilities: ${fmt(netWorthSnapshot.total_liabilities)}
- Equity Holdings: ${fmt(netWorthSnapshot.equities_total)}
- Real Estate Equity: ${fmt(netWorthSnapshot.real_estate_total)}
- Other Assets: ${fmt(netWorthSnapshot.other_total)}
- Restricted/Unvested Assets (not in net worth): ${fmt(netWorthSnapshot.restricted_total)}`
    : '\nNo portfolio snapshot available yet.';

  const equitiesSummary =
    equities && equities.length > 0
      ? `\nEQUITY HOLDINGS:\n${equities
          .map(
            (e) =>
              `- ${e.ticker}${e.name ? ` (${e.name})` : ''}: ${e.shares} shares @ ${fmt(e.current_price)}/share = ${fmt(parseFloat(e.shares) * parseFloat(e.current_price || 0))} [${e.account_type || 'unspecified account'}]`
          )
          .join('\n')}`
      : '\nNo equity holdings recorded.';

  const reSummary =
    realEstate && realEstate.length > 0
      ? `\nREAL ESTATE:\n${realEstate
          .map(
            (r) =>
              `- ${r.address} (${r.property_type || 'unspecified'}): Value ${fmt(r.value)}, Mortgage ${fmt(r.mortgage_balance)}, Equity ${fmt(r.equity)}`
          )
          .join('\n')}`
      : '\nNo real estate holdings recorded.';

  const otherSummary =
    otherAssets && otherAssets.length > 0
      ? `\nOTHER ASSETS:\n${otherAssets.map((a) => `- ${a.name} (${a.category || 'other'}): ${fmt(a.current_value)}`).join('\n')}`
      : '\nNo other assets recorded.';

  return `You are Flo, a warm, knowledgeable AI financial companion for LegacyOS — a family wealth management platform.

IDENTITY & TONE:
- You are supportive, clear, and professional — like a trusted CFP friend, not a robot
- You celebrate financial wins, gently flag risks, and educate without lecturing
- You use plain language. Avoid jargon unless you explain it
- You are NOT a licensed financial advisor. You provide financial INFORMATION, not ADVICE

COMPLIANCE FRAMEWORK (NON-NEGOTIABLE):
- You NEVER give personalized investment advice: no "you should buy X", "sell Y", "move to Z"
- You NEVER predict market movements or promise returns
- You frame insights as: "Here's how people in similar situations often think about this..." or "Common approaches to this include..."
- When asked for advice, redirect: "That's a great question for your financial advisor — here's the context that might help that conversation:"
- Always end responses with the disclaimer tag: [DISCLAIMER]
- If asked about tax, legal, or insurance specifics, remind the user to consult professionals

USER CONTEXT:
Name: ${user?.full_name || 'Unknown'}
Subscription: ${subscription?.plan || 'free'}
Member since: ${user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'unknown'}
${portfolioSummary}
${equitiesSummary}
${reSummary}
${otherSummary}

RESPONSE GUIDELINES:
- Reference the user's actual portfolio data when relevant
- Keep responses concise and scannable — use bullet points and headers when helpful
- If data is missing or incomplete, acknowledge it and suggest how to fill the gap
- Prioritize the user's financial wellbeing and literacy over sounding impressive
- If you notice a potential concern (e.g., high liability ratio, concentration risk), surface it gently
- The restricted/unvested assets are NOT counted in net worth — make sure the user understands this distinction
- For real estate values, remind the user that LegacyOS uses a 91% adjustment factor (typical net-of-costs)
- For retirement accounts, context about pre-tax vs. after-tax matters for true net worth calculations`;
}

/**
 * Get Flo's response to a user message.
 *
 * @param {object} options
 * @param {string} options.userMessage - The user's message
 * @param {Array} options.conversationHistory - Previous messages [{role, content}]
 * @param {object} options.portfolioContext - User's portfolio data
 * @returns {Promise<{ content: string, disclaimer: string, model: string, usage: object }>}
 */
async function getFloResponse({ userMessage, conversationHistory = [], portfolioContext }) {
  const systemPrompt = buildSystemPrompt(portfolioContext);

  // Build message history for Claude
  const messages = [
    ...conversationHistory.map((msg) => ({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.content,
    })),
    { role: 'user', content: userMessage },
  ];

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1500,
    system: systemPrompt,
    messages,
  });

  let content = response.content[0]?.text || '';

  // Strip the [DISCLAIMER] tag from the visible content (we return it separately)
  const hasDisclaimer = content.includes('[DISCLAIMER]');
  content = content.replace('[DISCLAIMER]', '').trim();

  // If Flo forgot the disclaimer (rare), we still append it
  const disclaimer = COMPLIANCE_DISCLAIMER;

  return {
    content,
    disclaimer,
    model: response.model,
    usage: response.usage,
    stop_reason: response.stop_reason,
  };
}

module.exports = { getFloResponse, buildSystemPrompt, COMPLIANCE_DISCLAIMER };
