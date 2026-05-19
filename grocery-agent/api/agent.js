import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const GROQ_API_KEY = process.env.GROQ_API_KEY;

const SYSTEM_PROMPT = `You are Sous Chef, a smart meal planning and grocery agent for an Indian household in Bengaluru.

HOUSEHOLD:
- Supriya: 100g protein/day
- Vivek: 120g protein/day  
- Combined: 220g protein/day
- Both work out daily

MONTHLY BUDGET: ₹35,000–40,000 | WEEKLY GROCERY BUDGET: ₹8,000–10,000

BREAKFAST (FIXED EVERY DAY — never changes):
8 egg white bhurji + 1-2 slices bread + protein smoothie with seasonal fruit (dragon fruit, banana, apple, mango, berries)

MEAL PATTERN:
- Lunch: one curry/dal + one dry sabzi + rice + curd
- Evening: sprouted moong / sprouted chana / pesarettu with coconut chutney / fruit
- Dinner: SAME curry + SAME sabzi as lunch + roti (they cook once, eat twice)

VEG DAYS: Thursday only — no meat, fish, eggs in main meals

ACTUAL DISHES:
CURRIES/DAL: dal tadka, dal fry, rajma, black chana gravy, matar paneer, aloo gobi gravy, torai curry, santula, kadhi, egg curry, chicken curry
SABZI (dry): aloo gobi, mix veg sabzi, bhindi fry, palak, beans sabzi, cabbage sabzi, baingan bharta, dry chicken fry, chicken sukka, mackerel dry fry, sardine fry, pomfret fry
COMBOS: kadhi always pairs with seafood dry fry (mackerel/sardines/pomfret) — never kadhi + chicken

SEAFOOD RULES:
- ONLY sea fish: mackerel (bangda), seabass, pomfret, sardines, tuna
- NO river fish, NO prawns
- NO fish curry — dry fry only (quick to make)
- Seafood 2-3 times a week

STAPLES (never put in shopping list): onion, tomato, ginger, garlic, oil, salt, spices, coffee
PLATFORMS: Licious → chicken/eggs/seafood | Blinkit/Instamart → vegetables/dairy/paneer/tempeh | Mango → rice/atta/bulk

BENGALURU PRICES:
- Eggs: ₹8 each, ₹90/dozen
- Chicken: ₹300/kg
- Mackerel: ₹200/kg | Sardines: ₹160/kg | Pomfret: ₹400/kg | Seabass: ₹450/kg
- Vegetables: ₹30-60/kg | Paneer: ₹90/200g | Curd: ₹60/500g
- Rice: ₹60/kg | Atta: ₹55/kg | Bread: ₹45/loaf

AGENT TOOLS — you have access to:
- get_meal_history: check what was eaten in the last 2 weeks (to avoid repetition)
- save_meal_plan: save confirmed meal plan to database
- get_expenses: check current month spending
- save_expense: log a new expense

CONVERSATION FLOW FOR DAY PLANNING:
1. Check meal history (use get_meal_history tool)
2. Propose today's meals avoiding recent repeats — ask "Does this work?"
3. After user confirms — save plan and give shopping list
4. Never repeat same combo within 2 weeks

RESPONSE FORMAT RULES — CRITICAL:
- NEVER show JSON tool calls in your response
- NEVER use markdown tables
- NEVER use markdown headers (## or ###)  
- Use simple plain text with line breaks
- Use emojis for visual structure

FOR DAY PLAN PROPOSAL (before confirmation):
📅 Tuesday — Non-Veg

🍳 Breakfast: 8 egg white bhurji + bread + dragon fruit smoothie

🍛 Lunch + 🌙 Dinner (same, cooked once):
Mackerel dry fry + Kadhi + Rice (lunch) / Roti (dinner)

🌿 Evening: Sprouted moong + coconut chutney

Protein: ~220g | Does this work? Any changes?

FOR SHOPPING LIST (after confirmation), respond with this JSON immediately followed by a clean text summary:
{"shoppingList": [{"item": "Mackerel", "qty": "500g", "platform": "licious", "estimatedPrice": 110}]}

Then summarize: "Here's your shopping list — ₹X total across Y items. Tap Order → on each item or email the full list to Vivek."

FOR BUDGET: Just say "You've spent ₹X this month. On track / ₹Y over budget. Projected ₹Z by month end." `;

async function callTool(tool, params) {
  switch (tool) {
    case 'get_meal_history': {
      const twoWeeksAgo = new Date();
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
      const { data } = await supabase
        .from('meal_plans')
        .select('planned_date, lunch, dinner, is_veg')
        .gte('planned_date', twoWeeksAgo.toISOString().split('T')[0])
        .order('planned_date', { ascending: false });
      return data || [];
    }
    case 'save_meal_plan': {
      const { data } = await supabase
        .from('meal_plans')
        .insert({
          planned_date: params.date,
          day_of_week: new Date(params.date).toLocaleDateString('en', { weekday: 'short' }),
          is_veg: params.is_veg || false,
          breakfast: params.breakfast,
          lunch: params.lunch,
          dinner: params.dinner,
          evening_snack: params.evening_snack,
          total_protein: params.total_protein,
          confirmed: true,
        })
        .select();
      return data;
    }
    case 'get_expenses': {
      const { data } = await supabase
        .from('expenses')
        .select('*')
        .gte('expense_date', params.month + '-01')
        .lte('expense_date', params.month + '-31')
        .order('expense_date', { ascending: false });
      const total = (data || []).reduce((sum, e) => sum + e.amount, 0);
      return { expenses: data || [], total, month: params.month };
    }
    case 'save_expense': {
      const { data } = await supabase
        .from('expenses')
        .insert({
          platform: params.platform,
          amount: params.amount,
          note: params.note,
          expense_date: new Date().toISOString().split('T')[0],
        })
        .select();
      return data;
    }
    case 'save_shopping_list': {
      const weekStart = params.week_start;
      // Clear old items for this week first
      await supabase.from('shopping_items').delete().eq('week_start', weekStart);
      const items = params.items.map(item => ({ ...item, week_start: weekStart }));
      const { data } = await supabase.from('shopping_items').insert(items).select();
      return data;
    }
    default:
      return { error: 'Unknown tool' };
  }
}

async function callGroq(messages) {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 2000,
      messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
    }),
  });
  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { messages } = req.body;
    
    // Pre-fetch meal history and expenses to include in context
    const history = await callTool('get_meal_history', {});
    const now = new Date();
    const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const expenses = await callTool('get_expenses', { month: monthStr });
    
    // Inject context into system
    const contextMsg = {
      role: 'user',
      content: `CONTEXT (do not show this to user):
Meal history last 2 weeks: ${JSON.stringify(history)}
Current month expenses: total ₹${expenses.total}, breakdown by platform available.
Today: ${new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}

Now respond to the user's request below. Never show raw JSON tool calls in your response. Never show table markdown. Respond in clean plain text with line breaks.`,
    };

    const augmentedMessages = [contextMsg, ...messages];
    let response = await callGroq(augmentedMessages);

    // Strip any leaked tool JSON from response
    response = response.replace(/\{[\s]*"tool"[\s]*:.*?\}/gs, '').trim();
    response = response.replace(/```json[\s\S]*?```/g, '').trim();
    response = response.replace(/\|[\s\S]*?\|/g, '').trim(); // strip markdown tables

    // Check if response contains a shopping list JSON
    let parsed = null;
    const jsonMatch = response.match(/\{[\s\S]*"shoppingList"[\s\S]*\}/);
    if (jsonMatch) {
      try {
        parsed = JSON.parse(jsonMatch[0]);
        // Remove JSON from text response
        response = response.replace(jsonMatch[0], '').trim();
        // Save shopping list
        const weekStart = new Date().toISOString().split('T')[0];
        await callTool('save_shopping_list', { week_start: weekStart, items: parsed.shoppingList });
      } catch {}
    }

    // Save meal plan if present
    if (parsed?.meals) {
      await callTool('save_meal_plan', {
        date: new Date().toISOString().split('T')[0],
        ...parsed.meals,
        confirmed: false,
      });
    }

    res.status(200).json({ response, parsed });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
