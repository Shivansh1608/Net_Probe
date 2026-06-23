const Anthropic = require('@anthropic-ai/sdk');

/**
 * Calls the Anthropic Claude API to generate a plain-English summary of the network metrics and diagnosed issues.
 * @param {object} metric - The network Metric record
 * @param {Array<object>} issues - List of issues diagnosed for this metric
 * @returns {Promise<string>} - Human-readable AI summary
 */
async function generateAISummary(metric, issues) {
  if (process.env.ENABLE_AI_SUMMARY !== 'true') {
    return 'AI Summary is disabled. Set ENABLE_AI_SUMMARY=true and configure ANTHROPIC_API_KEY in the environment to enable it.';
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.warn('Anthropic API key is missing. Skipping AI summary generation.');
    return 'AI Summary could not be generated: ANTHROPIC_API_KEY is not configured in .env.';
  }

  try {
    const anthropic = new Anthropic({ apiKey });
    
    const prompt = `Analyze these network metrics and diagnosed issues. Translate them into a short, plain-English summary (1-2 paragraphs) for a non-technical home user. Explain what is wrong and what they can do to fix it. Keep it friendly and actionable.
    
Metrics:
- Latency (Ping): ${metric.latency} ms
- Packet Loss: ${metric.packetLoss}%
- DNS Lookup Time: ${metric.dnsTime} ms
- Download Speed: ${metric.downloadSpeed} Mbps
- Upload Speed: ${metric.uploadSpeed} Mbps
- Wi-Fi Signal Strength: ${metric.wifiSignal}%
- Target scan host: ${metric.targetHost}

Diagnosed Issues:
${issues.length === 0 ? '- None (Network is healthy)' : issues.map(issue => `- [${issue.severity.toUpperCase()}] ${issue.issueType}: ${issue.explanation}\n  Suggested Fix: ${issue.suggestion}`).join('\n')}
`;

    // The user suggested model claude-sonnet-4-6. If it fails, we fall back to a standard API name like claude-3-5-sonnet-20241022.
    const model = process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022';

    const response = await anthropic.messages.create({
      model: model,
      max_tokens: 350,
      system: "You are a friendly network assistant explaining diagnostics to a home user. Summarize the diagnostic information accurately and plainly. Do not include markdown headers or bulleted lists, summarize in paragraphs.",
      messages: [
        { role: 'user', content: prompt }
      ]
    });

    if (response && response.content && response.content[0]) {
      return response.content[0].text;
    }
    
    return 'No summary returned by the AI assistant.';
  } catch (err) {
    console.error('Claude API summary generation error:', err.message);
    return `AI Summary could not be generated: ${err.message}`;
  }
}

module.exports = { generateAISummary };
