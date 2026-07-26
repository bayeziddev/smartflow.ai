# smartflow.ai
SmartFlow AI | An open-source, multi-tenant Omnichannel AI Agent &amp; Automation Platform. Build intelligent WhatsApp, Telegram &amp; Web bots with BYOK (Bring Your Own Key) support for OpenAI, Gemini, and LLaMA 3.1 (Groq). Automate workflows seamlessly.
Live landing page with modern dark UI/UX, animated hero section, and social channel buttons (WhatsApp, Telegram, Messenger, Email)
WhatsApp QR code scan login — display QR in the dashboard for the user to connect their WhatsApp account
Multi-AI provider router supporting OpenAI (OPEN_Ai_TEST_KEY), Gemini (GEMINI_TEST_KEY), and Manus AI (MANUS_Ai_TEST_KEY) environment secrets, with automatic fallback between providers
Admin dashboard with login — allows the admin to manually add/update AI API keys per provider and toggle channel integrations on/off
Telegram bot integration — connect a Telegram bot token to receive and reply to messages via the AI router
Email channel integration — send and receive automated email replies using SMTP credentials configured in the admin dashboard
Order confirmation detection — AI identifies order-confirmed intent in incoming messages and logs the order details to the database
Automated Excel sheet export — confirmed orders are appended to a downloadable Excel (.xlsx) file, viewable and downloadable from the admin dashboard
Conversation log viewer in admin dashboard — shows all incoming messages, channel source, AI response, and timestamps
Role-based access control — admin-only routes protect API key management,
Project TODO
Core Features
 Live landing page with modern dark UI/UX, animated hero section, and social channel buttons (WhatsApp, Telegram, Messenger, Email)
 WhatsApp QR code scan login display in admin dashboard
 Multi-AI provider router (OpenAI, Gemini, Manus AI) with automatic fallback
 Admin dashboard with login
 Admin dashboard: UI to add/update AI API keys (OPEN_Ai_TEST_KEY, GEMINI_TEST_KEY, MANUS_Ai_TEST_KEY)
 Admin dashboard: Toggle switches for channel integrations (WhatsApp, Telegram, Email)
 Telegram bot integration (connect bot token)
 Email channel integration (SMTP credentials for automated replies)
 Order confirmation detection using built-in LLM
 Automated Excel sheet export for confirmed orders (.xlsx format)
 Admin dashboard: View and download Excel export files
 Admin dashboard: Conversation log viewer (incoming messages, channel, AI response, timestamps)
 Role-based access control for admin-only routes (API key management, channel settings, order logs, Excel export)
 Built-in LLM for all multi-channel chatbot responses and automated replies
 Automated notification to admin/owner for new order confirmations
 Cloud storage for persistent Excel export files
UI/UX Improvements
 Implement modern dark UI/UX aesthetic for landing page
 Implement animated hero section for landing page
 Improve UI/UX for admin dashboard
Technical Tasks
 Configure environment secrets (OPEN_Ai_TEST_KEY, GEMINI_TEST_KEY, MANUS_Ai_TEST_KEY)
 Create database schema for API keys, channels, conversations, and orders
 Implement AI multi-provider router logic
 Implement WhatsApp channel handler
 Implement Telegram channel handler
 Implement Email channel handler
 Implement order detection logic
 Implement Excel export logic
 Implement cloud storage integration for Excel files
 Implement notification system
 Secure admin-only routes
 Write unit tests for core functionalities
 Push all code to GitHub repository