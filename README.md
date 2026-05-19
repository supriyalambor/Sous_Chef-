# 🍳 Sous Chef

> A conversational AI meal planning and grocery agent built for two fitness-focused adults eating home-style Indian food in Bengaluru.

---

## What it does

Sous Chef is a personal AI agent that knows exactly how you eat — your dishes, your proteins, your budget, your veg days — and helps you plan meals and groceries through a simple chat interface.

### Features

- **Conversational meal planning** — just say "plan today" or "plan my week" and it proposes meals, waits for your approval, then gives you the shopping list
- **Knows your actual dishes** — dal tadka, santula, kadhi chawal, aloo gobi, matar paneer, black chana, mackerel dry fry, chicken sukka and more
- **Fixed breakfast** — 8 egg white bhurji + bread + protein smoothie with fruit, every single day
- **Thursday is veg day** — automatically switches to dal, kadhi, paneer, chana on Thursdays
- **Smart shopping list** — grouped by platform with exact quantities (2kg rice, 1.5kg chicken, 2 dozen eggs etc.)
- **Order links** — one tap to search each item on Licious, Blinkit, Instamart or Mango
- **Email grocery list** — sends the full list to your email with one tap
- **Budget aware** — targets ₹8,000–10,000/week, ₹35,000–40,000/month

---

## Built for

| | |
|---|---|
| 👤 People | Supriya + Vivek |
| 📍 Location | Bengaluru, India |
| 🏋️ Lifestyle | Both work out daily |
| 🎯 Protein goal | 220g/day combined (100g + 120g) |
| 💰 Monthly budget | ₹35,000 – ₹40,000 |
| 🥦 Veg days | Thursday only |

---

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend | React + Vite |
| AI | Groq API (Llama 3.3 70B) — free tier |
| Deployment | Vercel |
| Auth | API key stored in browser localStorage |

---

## Getting Started

### 1. Clone the repo

```bash
git clone https://github.com/supriyalambor/sous-chef.git
cd sous-chef
```

### 2. Install dependencies

```bash
npm install
```

### 3. Run locally

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). On first load you'll be asked for your API key.

### 4. Get a free API key

Go to [console.groq.com](https://console.groq.com) → sign in with Google → API Keys → Create Key.
It's completely free, no credit card needed. Key starts with `gsk_`.

---

## Deployment

Deployed on Vercel. Every push to `main` auto-deploys.

```bash
# Deploy manually
vercel --prod
```

Live at: **[sous-chef-rouge.vercel.app](https://sous-chef-rouge.vercel.app)**

---

## How to use

| You say | Agent does |
|---|---|
| "Plan today" | Proposes meals, asks if it's okay |
| "Yes" / "looks good" | Shows shopping list grouped by platform |
| "Swap lunch to rajma" | Adjusts and proposes again |
| "Plan my week" | Full Mon–Sat meal plan + weekly grocery list |
| "Email me the list" | Opens email with grocery list pre-filled |
| "How do we save money?" | Budget tips based on your spend |

---

## Meal Structure

Every day follows this pattern:

| Meal | What |
|---|---|
| 🍳 Breakfast | 8 egg white bhurji + bread + protein smoothie with fruit |
| 🍛 Lunch | One curry/dal + one dry sabzi + rice or roti + curd |
| ☕ Evening | Sprouted moong / sprouted chana / pesarettu with coconut chutney / fruit |
| 🌙 Dinner | Lighter — dal or curry + sabzi + roti |

---

## Platforms

| Platform | Used for |
|---|---|
| 🥩 Licious | Chicken, eggs, fish (dry fry only, no fish curry) |
| 💛 Blinkit | Fresh vegetables, dairy, paneer, tempeh |
| 🛍️ Instamart | Grocery top-ups |
| 🏪 Mango | Rice, atta, bulk staples |

---

## Project Structure

```
sous-chef/
├── src/
│   ├── App.jsx        # Main agent UI and logic
│   └── main.jsx       # React entry point
├── index.html
├── package.json
├── vite.config.js
├── vercel.json
└── README.md
```

---

## About

Built in a single conversation with Claude (Anthropic) as a solution to tracking and optimising a ₹50,000/month food spend. Turned into a portfolio project demonstrating practical AI agent development with real-world personalisation.

> *"The best AI agent is one that knows you well enough that you don't have to explain yourself."*
