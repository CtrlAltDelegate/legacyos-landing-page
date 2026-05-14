const Anthropic = require('@anthropic-ai/sdk');
const { query } = require('../config/database');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const COMPLIANCE_DISCLAIMER =
  '\n\n---\n*This is financial information based on your data, not personalized investment advice. ' +
  'Always consult a qualified financial advisor before making investment decisions.*';

/**
 * Build a portfolio context string from the user's assets.
 * This is injected into Flo's system prompt so every response is grounded in real data.
 */
async function buildPortfolioContext(userId) {
  const [equities, realEstate, otherAssets, restricted, subscription] = await Promise.all([
    query('SELECT * FROM equities WHERE user_id = $1 AND is_active = true ORDER BY ticker', [userId]),
    query('SELECT * FROM real_estate WHERE user_id = $1 AND is_active = true', [userId]),
    query('SELECT * FROM other_assets WHERE user_id = $1 AND is_active = true', [userId]),
    query('SELECT * FROM restricted_assets WHERE user_id = $1 AND is_active = true', [userId]),
    query('SELECT plan FROM subscriptions WHERE user_id = $1', [userId]),
  ]);

  const plan = subscription.rows[0]?.plan || 'free';

  // Calculate totals
  const equitiesTotal = equities.rows.reduce((sum, e) => {
    return sum + (parseFloat(e.current_price || 0) * parseFloat(e.shares || 0));
  }, 0);

  const realEstateEquity = realEstate.rows.reduce((sum, r) => {
    return sum + parseFloat(r.equity || 0);
  }, 0);
  const realEstateLiabilities = realEstate.rows.reduce((sum, r) => {
    return sum + parseFloat(r.mortgage_balance || 0);
  }, 0);

  const otherTotal = otherAssets.rows.reduce((sum, o) => {
    return sum + parseFloat(o.current_value || 0);
  }, 0);

  const restrictedTotal = restricted.rows.reduce((sum, r) => {
    return sum + parseFloat(r.estimated_value || 0);
  }, 0);

  const totalAssets = equitiesTotal + realEstateEquity + otherTotal;
  const totalLiabilities = realEstateLiabilities;
  const netWorth = totalAssets - totalLiabilities;

  let context = `## User Portfolio Summary\n`;
  context += `- **Net Worth:** $${netWorth.toLocaleString('en-US', { maximumFractionDigits: 0 })}\n`;
  context += `- **Total Assets:** $${totalAssets.toLocaleString('en-US', { maximumFractionDigits: 0 })}\n`;
  context += `- **Total Liabilities:** $${totalLiabilities.toLocaleString('en-US', { maximumFractionDigits: 0 })}\n\n`;

  if (equities.rows.length > 0) {
    context += `### Equities ($${equitiesTotal.toLocaleString('en-US', { maximumFractionDigits: 0 })} total)\n`;
    equities.rows.forEach(e => {
      const value = parseFloat(e.current_price || 0) * parseFloat(e.shares || 0);
      context += `- ${e.ticker}: ${e.shares} shares @ $${e.current_price || 'N/A'} = $${value.toLocaleString('en-US', { maximumFractionDigits: 0 })} (${e.account_type || 'taxable'})\n`;
    });
    context += '\n';
  }

  if (realEstate.rows.length > 0) {
    context += `### Real Estate ($${realEstateEquity.toLocaleString('en-US', { maximumFractionDigits: 0 })} equity)\n`;
    realEstate.rows.forEach(r => {
      context += `- ${r.address}: Est. $${parseFloat(r.adjusted_value || r.estimated_value).toLocaleString('en-US', { maximumFractionDigits: 0 })}, Mortgage $${parseFloat(r.mortgage_balance || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}, Equity $${parseFloat(r.equity || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}\n`;
    });
    context += '\n';
  }

  if (otherAssets.rows.length > 0) {
    context += `### Other Assets ($${otherTotal.toLocaleString('en-US', { maximumFractionDigits: 0 })} total)\n`;
    otherAssets.rows.forEach(o => {
      context += `- ${o.name} (${o.category}): $${parseFloat(o.current_value).toLocaleString('en-US', { maximumFractionDigits: 0 })}\n`;
    });
    context += '\n';
  }

  if (restricted.rows.length > 0) {
    context += `### Restricted Assets — NOT included in net worth ($${restrictedTotal.toLocaleString('en-US', { maximumFractionDigits: 0 })} total)\n`;
    restricted.rows.forEach(r => {
      context += `- ${r.name} (${r.category}): ~$${parseFloat(r.estimated_value || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}\n`;
    });
    context += '\n';
  }

  return { context, plan, netWorth, totalAssets };
}

function buildSystemPrompt(portfolioContext, plan) {
  return `You are Flo, the AI financial companion inside LegacyOS — a family wealth operating system for the mass-affluent ($500K–$5M net worth) segment. You are NOT a financial advisor. You provide financial **information** and **context**, never directives.

## Your Role
You help users understand their own financial picture, explore scenarios, and ask better questions. You are like a knowledgeable CFO brain — analytical, clear, and grounded in their actual data.

## Compliance Rules — Non-Negotiable
- NEVER say "You should buy X", "Sell Y", "I recommend allocating to Z" or any directive
- NEVER claim fiduciary status
- NEVER present outputs with false precision or certainty
- ALWAYS frame insights as: "Here's how people in similar situations have addressed this..." or "Based on your data, one consideration is..."
- ALWAYS append the standard disclaimer to any allocation or recommendation-adjacent output
- For retirement accounts, distinguish between gross and after-tax values (assume 25% rate unless user specifies)

## Communication Style
- Lead with one clear insight, not a data dump
- Be direct and confident — this segment dislikes hedge-everything language
- Use dollar amounts from the user's actual data
- Flag anomalies or gaps (e.g., low emergency fund, concentration risk)
- When a user enters a round number for business equity, ask how they arrived at that valuation

## User's Current Portfolio
${portfolioContext}

## Plan: ${plan}
${plan === 'free' ? 'User is on Free plan. Provide general information and portfolio summaries only. Prompt upgrade for scenario modeling and allocation analysis.' : 'User is on ' + plan + ' plan. Full Flo capabilities enabled.'}`;
}

/**
 * Send a message to Flo and get a response.
 * @param {string} userId
 * @param {Array} messages - [{role: 'user'|'assistant', content: string}]
 * @returns {Promise<{response: string, usage: object}>}
 */
async function chat(userId, messages) {
  const { context, plan } = await buildPortfolioContext(userId);
  const systemPrompt = buildSystemPrompt(context, plan);

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: systemPrompt,
    messages,
  });

  let text = response.content[0]?.text || '';

  // Append compliance disclaimer if the response touches allocation/advice territory
  const adviceKeywords = /allocat|invest|return|yield|buy|sell|portfolio|diversif|risk|rebalance/i;
  if (adviceKeywords.test(text)) {
    text += COMPLIANCE_DISCLAIMER;
  }

  return {
    response: text,
    usage: response.usage,
  };
}

module.exports = { chat, buildPortfolioContext };
