# 🛒 Grocery Agent

A conversational AI agent for meal planning and grocery management — built for 2 people who eat home-style Indian food and work out.

## Features
- 📅 Weekly meal planner (Mon–Sat, auto-detects veg days)
- 🛒 Smart shopping list grouped by platform (Licious, Blinkit, Instamart, Mango)
- 📧 Email grocery list with one tap
- 💬 Chat with the agent for recipes, nutrition tips, and budget advice

## Setup

### 1. Clone the repo
```bash
git clone https://github.com/YOUR_USERNAME/grocery-agent.git
cd grocery-agent
```

### 2. Install dependencies
```bash
npm install
```

### 3. Run locally
```bash
npm run dev
```

Open http://localhost:5173 — you'll be asked for your Anthropic API key on first launch. It's stored only in your browser's localStorage.

## Deploy to Vercel (free, shareable link)

### Option A — Vercel CLI
```bash
npm install -g vercel
vercel
```
Follow the prompts. You'll get a URL like `https://grocery-agent-xyz.vercel.app`.

### Option B — Vercel Dashboard
1. Push this repo to GitHub
2. Go to [vercel.com](https://vercel.com) → New Project
3. Import your GitHub repo
4. Click Deploy — done!

Share the Vercel URL with Vivek. Each person enters their own API key on first visit (stored locally in their browser).

## Getting an Anthropic API Key
1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Sign up / log in
3. Go to API Keys → Create Key
4. Paste it into the app on first launch

## Notes
- The API key is stored in your browser's localStorage — never sent anywhere except Anthropic's API
- Each user (you and Vivek) needs their own API key
- Meal plans know your eating habits: simple Indian food, Thursday veg, ~160g protein/day for 2 people
