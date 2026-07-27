const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const { env } = require('./config/env');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

const authRoutes = require('./routes/auth.routes');
const apiConfigRoutes = require('./routes/apiConfig.routes');
const chatRoutes = require('./routes/chat.routes');
const orderRoutes = require('./routes/order.routes');
const channelRoutes = require('./routes/channel.routes');
const webhookRoutes = require('./routes/webhook.routes');

const app = express();

app.use(helmet());
app.use(cors({ origin: env.FRONTEND_URL, credentials: true }));
app.use(express.json({ limit: '1mb' }));

const limiter = rateLimit({ windowMs: env.rateLimit.windowMs, max: env.rateLimit.max, standardHeaders: true });
app.use('/api', limiter);

app.get('/health', (req, res) => res.json({ ok: true, service: 'fanchatbot-backend' }));

app.use('/api/auth', authRoutes);
app.use('/api/config', apiConfigRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/channels', channelRoutes);
app.use('/api/webhooks', webhookRoutes); // no requireAuth — external callers

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
