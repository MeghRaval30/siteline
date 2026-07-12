const express = require('express');
const router = express.Router();
const authenticate = require('../../shared/authenticate');
const { runAgent } = require('./agent');
const prisma = require('../../shared/prismaClient');
const { getOllamaStatus } = require('../../shared/ollamaSetup');

// POST /api/v1/ai/chat
router.post('/chat', authenticate, async (req, res) => {
  try {
    const { message, session_id } = req.body;
    if (!message) return res.status(400).json({ success: false, error: 'Message required' });

    let session;
    let conversationHistory = [];
    if (session_id) {
      session = await prisma.conversationSession.findUnique({ where: { id: session_id } }).catch(() => null);
      if (session) conversationHistory = JSON.parse(session.messages || '[]');
    }
    if (!session) {
      session = await prisma.conversationSession.create({ data: { user_id: req.user.id } });
    }

    const { answer, trace } = await runAgent(message, conversationHistory);

    conversationHistory.push({ role: 'user', content: message });
    conversationHistory.push({ role: 'assistant', content: answer });
    if (conversationHistory.length > 20) conversationHistory = conversationHistory.slice(-20);

    await prisma.conversationSession.update({
      where: { id: session.id },
      data: { messages: JSON.stringify(conversationHistory) }
    });

    res.json({ success: true, data: { answer, trace, session_id: session.id } });
  } catch (error) {
    console.error('AI chat error:', error.message);
    if (error.message?.includes('Ollama') || error.message?.includes('fetch') || error.cause?.code === 'ECONNREFUSED') {
      return res.json({ success: true, data: { answer: 'AI is currently offline. Please ensure Ollama is running with: `ollama run qwen2.5:7b-instruct`', trace: [], session_id: req.body.session_id || null, offline: true } });
    }
    res.status(500).json({ success: false, error: 'AI service error' });
  }
});

// GET /api/v1/ai/status
router.get('/status', authenticate, async (req, res) => {
  try {
    const status = getOllamaStatus();
    // Also do a live check
    const response = await fetch('http://localhost:11434/api/tags', { signal: AbortSignal.timeout(3000) });
    const data = await response.json();
    const hasModel = data.models?.some(m => m.name?.includes('qwen'));
    res.json({ success: true, data: { online: true, model_available: hasModel, pulling: status.pulling, error: status.error } });
  } catch {
    const status = getOllamaStatus();
    res.json({ success: true, data: { online: false, model_available: false, pulling: status.pulling, error: status.error } });
  }
});

// GET /api/v1/ai/insights
router.get('/insights', authenticate, async (req, res) => {
  try {
    const [overdueCount, pendingMaint, lowCondition, totalAssets] = await Promise.all([
      prisma.allocation.count({ where: { status: 'Active', expected_return_date: { lt: new Date() } } }),
      prisma.maintenanceRequest.count({ where: { status: { in: ['Pending', 'Approved'] } } }),
      prisma.asset.count({ where: { condition: 'Poor' } }),
      prisma.asset.count()
    ]);
    const insights = [];
    if (overdueCount > 0) insights.push({ type: 'warning', message: `${overdueCount} asset${overdueCount > 1 ? 's' : ''} overdue for return`, severity: 'high' });
    if (pendingMaint > 0) insights.push({ type: 'info', message: `${pendingMaint} maintenance request${pendingMaint > 1 ? 's' : ''} awaiting action`, severity: 'medium' });
    if (lowCondition > 0) insights.push({ type: 'danger', message: `${lowCondition} asset${lowCondition > 1 ? 's' : ''} in poor condition`, severity: 'high' });
    if (totalAssets > 0) insights.push({ type: 'success', message: `${totalAssets} total assets tracked`, severity: 'low' });
    res.json({ success: true, data: insights });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/v1/ai/sessions/:id
router.delete('/sessions/:id', authenticate, async (req, res) => {
  try {
    await prisma.conversationSession.delete({ where: { id: req.params.id } });
  } catch { /* ignore */ }
  res.json({ success: true });
});

module.exports = router;
