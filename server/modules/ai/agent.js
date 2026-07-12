const { TOOL_SCHEMAS, TOOL_FUNCTIONS } = require('./tools');

const OLLAMA_URL = 'http://localhost:11434/api/chat';
const MODEL = 'qwen2.5:7b-instruct';
const MAX_ITERATIONS = 6;

const SYSTEM_PROMPT = `You are SiteLine AI, an intelligent assistant for enterprise asset management. You have access to a real database with 500+ assets, 50+ employees, and 12 departments.

When answering questions:
1. Think about which tools to use
2. Call the appropriate tools to gather data
3. Analyze the results
4. If you need more info, call more tools
5. Provide specific, data-driven answers with numbers and names

Available asset categories: Laptops, Desktops, Monitors, Printers, Servers, Network Equipment, Phones, Tablets, Furniture, Vehicles, Lab Equipment, Safety Equipment, AV Equipment, Power Tools, HVAC Systems
Asset statuses: Available, Allocated, In Maintenance, Retired, Lost
Maintenance priorities: Critical, High, Medium, Low
Allocation statuses: Active, Returned, Overdue

Always be helpful, concise, and reference specific data from your tool calls.`;

async function runAgent(userMessage, conversationHistory = []) {
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...conversationHistory,
    { role: 'user', content: userMessage }
  ];
  const trace = [];

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    let response;
    try {
      const res = await fetch(OLLAMA_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: MODEL, messages, tools: TOOL_SCHEMAS, stream: false }),
        signal: AbortSignal.timeout(120000)
      });
      response = await res.json();
    } catch (err) {
      throw new Error(`Ollama connection failed: ${err.message}`);
    }

    const msg = response.message;
    if (!msg) throw new Error('No response from Ollama');
    messages.push(msg);

    if (!msg.tool_calls || msg.tool_calls.length === 0) {
      return { answer: msg.content || 'No response generated.', trace };
    }

    for (const toolCall of msg.tool_calls) {
      const fnName = toolCall.function?.name;
      const fn = TOOL_FUNCTIONS[fnName];
      let result;
      try {
        result = fn ? await fn(toolCall.function.arguments || {}) : { error: `Unknown tool: ${fnName}` };
      } catch (e) {
        result = { error: e.message };
      }
      trace.push({ tool: fnName, arguments: toolCall.function?.arguments || {}, result });
      messages.push({ role: 'tool', content: JSON.stringify(result) });
    }
  }

  // Force final answer after max iterations
  messages.push({ role: 'user', content: 'Please provide your final answer based on the data gathered so far.' });
  try {
    const res = await fetch(OLLAMA_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: MODEL, messages, stream: false }),
      signal: AbortSignal.timeout(120000)
    });
    const final = await res.json();
    return { answer: final.message?.content || 'Unable to generate response.', trace };
  } catch {
    return { answer: 'Max iterations reached. Here is what I found so far.', trace };
  }
}

module.exports = { runAgent };
