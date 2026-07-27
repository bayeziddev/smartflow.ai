const AIRouter = require('../services/aiRouter/AIRouter');
const AppError = require('../utils/AppError');

// POST /api/chat  { provider, messages }
// Used by: the dashboard's "test this key" button, and internally by
// channel handlers once a WhatsApp/Telegram/Email message comes in.
async function chat(req, res, next) {
  try {
    const { provider, messages, options } = req.body;
    if (!Array.isArray(messages) || messages.length === 0) {
      throw new AppError('messages must be a non-empty array', 400, 'INVALID_MESSAGES');
    }
    const result = await AIRouter.chat({ tenantId: req.tenantId, provider, messages, options });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = { chat };
