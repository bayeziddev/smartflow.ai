# ⚡ SmartFlow AI
<p align="center">
  <img src="https://readme-typing-svg.demolab.com?font=Fira+Code&weight=600&size=24&pause=1000&color=00E5FF&center=true&vCenter=true&width=600&lines=Omnichannel+AI+Agent+Platform;Automate+WhatsApp+%26+Telegram;Bring+Your+Own+Key+(BYOK);Built+for+Modern+SaaS+Startups" alt="Typing SVG" />
</p>
> **An open-source, multi-tenant Omnichannel AI Agent & Automation Platform. Build intelligent WhatsApp, Telegram & Web bots with BYOK (Bring Your Own Key) support for OpenAI, Gemini, and LLaMA 3.1 (Groq). Automate workflows seamlessly.**

[![License: Apache 2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](http://makeapullrequest.com)

SmartFlow AI is a powerful, highly scalable SaaS boilerplate designed to unify customer communications and automate order management. It acts as an intelligent API gateway, allowing businesses to seamlessly connect Large Language Models to everyday communication channels while maintaining complete control over their API keys and data.

---

## ✨ Key Features
<p align="center">
  <a href="https://skillicons.dev">
    <img src="https://skillicons.dev/icons?i=ts,react,tailwind,nodejs,mysql,redis,github&theme=dark" alt="Tech Stack" />
  </a>
</p>

---
*   **Dark UI/UX Landing Page:** A modern, animated hero section with Framer Motion and quick social channel integration buttons (WhatsApp, Telegram, Messenger, Email).
*   **BYOK Architecture:** Built-in multi-AI provider router supporting OpenAI, Gemini, and Manus AI. Automatic fallback logic ensures 100% uptime if a provider fails or rate-limits.
*   **Omnichannel Integration:**
    *   **WhatsApp:** Scan a QR code directly from the admin dashboard to authenticate and connect your WhatsApp account.
    *   **Telegram:** Connect via a secure bot token to receive and reply to messages.
    *   **Email:** Send and receive automated emails using configurable SMTP credentials.
*   **Smart Order Automation:** The AI automatically detects "order confirmation" intent from incoming messages, logs the data to the database, and appends it to a downloadable Excel (`.xlsx`) sheet.
*   **Comprehensive Admin Dashboard:**
    *   Secure, role-based access control (RBAC).
    *   UI to manually add, update, and securely store API keys.
    *   Toggle switches to easily turn specific channel integrations on or off.
    *   Real-time conversation log viewer (track incoming messages, source channels, AI responses, and timestamps).
    *   View and download automated Excel export files securely from cloud storage.

---

## 🚀 Project Roadmap & TODOs

### Core Features
- [ ] Live landing page with modern dark UI/UX, animated hero section, and social channel buttons (WhatsApp, Telegram, Messenger, Email)
- [ ] WhatsApp QR code scan login display in admin dashboard
- [ ] Multi-AI provider router (OpenAI, Gemini, Manus AI) with automatic fallback
- [ ] Admin dashboard with login
- [ ] Admin dashboard: UI to add/update AI API keys (`OPEN_Ai_TEST_KEY`, `GEMINI_TEST_KEY`, `MANUS_Ai_TEST_KEY`)
- [ ] Admin dashboard: Toggle switches for channel integrations (WhatsApp, Telegram, Email)
- [ ] Telegram bot integration (connect bot token)
- [ ] Email channel integration (SMTP credentials for automated replies)
- [ ] Order confirmation detection using built-in LLM
- [ ] Automated Excel sheet export for confirmed orders (`.xlsx` format)
- [ ] Admin dashboard: View and download Excel export files
- [ ] Admin dashboard: Conversation log viewer (incoming messages, channel, AI response, timestamps)
- [ ] Role-based access control for admin-only routes (API key management, channel settings, order logs, Excel export)
- [ ] Built-in LLM for all multi-channel chatbot responses and automated replies
- [ ] Automated notification to admin/owner for new order confirmations
- [ ] Cloud storage for persistent Excel export files

### UI/UX Improvements
- [ ] Implement modern dark UI/UX aesthetic for landing page
- [ ] Implement animated hero section for landing page
- [ ] Improve UI/UX for admin dashboard

### Technical Tasks
- [ ] Configure environment secrets (`OPEN_Ai_TEST_KEY`, `GEMINI_TEST_KEY`, `MANUS_Ai_TEST_KEY`)
- [ ] Create database schema for API keys, channels, conversations, and orders
- [ ] Implement AI multi-provider router logic
- [ ] Implement WhatsApp channel handler
- [ ] Implement Telegram channel handler
- [ ] Implement Email channel handler
- [ ] Implement order detection logic
- [ ] Implement Excel export logic
- [ ] Implement cloud storage integration for Excel files
- [ ] Implement notification system
- [ ] Secure admin-only routes
- [ ] Write unit tests for core functionalities
- [ ] Push all code to GitHub repository

---

## 🔐 Environment Variables

To run this project locally, you will need to configure the following environment secrets in your `.env` file:

```env
# AI Provider Test Keys
OPEN_Ai_TEST_KEY="your_openai_api_key_here"
GEMINI_TEST_KEY="your_gemini_api_key_here"
MANUS_Ai_TEST_KEY="your_manus_api_key_here"

# Database & Authentication 
# (Add your TiDB/MySQL and Auth secrets here)
```
## 👑 Core Maintainer

<div align="center">
  <table>
    <tr>
      <td align="center">
        <a href="https://github.com/Sayadbayezid">
          <img src="https://avatars.githubusercontent.com/Sayadbayezid" width="100px;" alt="Sayad Md Bayezid Hosan" style="border-radius: 50%;"/>
          <br />
          <b>Sayad Md Bayezid Hosan</b>
        </a>
        <br />
        <i>SmartGen</i>
      </td>
    </tr>
  </table>
</div>
---
## 🤝 Contributors

<a href="https://github.com/Sayadbayezid/Manus-Ai-Fanchatbot/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=Sayadbayezid/Manus-Ai-Fanchatbot" alt="Contributors list" />
</a>
## 👨‍💻 Maintainer

Maintained by **Sayad Md Bayezid Hosan** at **Connect with Bayezid**.