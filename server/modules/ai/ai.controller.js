const prisma = require('../../shared/prismaClient');

exports.chat = async (req, res) => {
  const { message, conversation_history } = req.body;
  try {
    // Collect context
    const assetCount = await prisma.asset.count();
    
    // Simulate Gemini API call
    const response = `We have ${assetCount} assets in the database. (Mock Gemini Response for: "${message}")`;
    
    res.json({ data: { response } });
  } catch (err) {
    console.error('AI chat failed:', err);
    res.status(503).json({ error: 'AI Assistant is currently unavailable' });
  }
};

exports.search = async (req, res) => {
  const { query } = req.body;
  try {
    // Simulate Gemini converting natural language to Prisma filters
    res.json({
      data: {
        assets: [],
        interpreted_filters: { natural_query: query }
      }
    });
  } catch (err) {
    console.error('AI search failed:', err);
    res.status(503).json({ error: 'AI Search is currently unavailable' });
  }
};

exports.insights = async (req, res) => {
  try {
    const overdueCount = await prisma.allocation.count({
      where: { expected_return_date: { lt: new Date() }, actual_return_date: null }
    });
    
    const summary = `${overdueCount} assets are currently overdue.`;
    
    res.json({ data: { summary } });
  } catch (err) {
    console.error('AI insights failed:', err);
    res.status(503).json({ error: 'AI Insights are currently unavailable' });
  }
};

exports.maintenancePriority = async (req, res) => {
  try {
    res.json({
      data: {
        priority_list: []
      }
    });
  } catch (err) {
    console.error('AI maintenance priority failed:', err);
    res.status(503).json({ error: 'AI Maintenance Priority is currently unavailable' });
  }
};
