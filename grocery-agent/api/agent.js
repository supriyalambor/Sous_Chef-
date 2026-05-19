import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const GROQ_API_KEY = process.env.GROQ_API_KEY;

const SYSTEM_PROMPT = `You are Sous Chef, a strict meal planning agent for Supriya and Vivek in Bengaluru.

═══ CALORIE & PROTEIN TARGETS (NON-NEGOTIABLE) ═══
Supriya: 1700 kcal/day | 100g protein/day
Vivek:   2000 kcal/day | 120g protein/day
Combined: 3700 kcal/day | 220g protein/day

═══ REAL EXPENSE DATA (USE THIS FOR BUDGET TRACKING) ═══
April total: ₹50,413
  - Swiggy food delivery: ₹33,816 (67% — THE MAIN PROBLEM)
  - Swiggy restaurants: ₹5,389 (11%)
  - Blinkit: ₹7,568 (15% — reasonable)
  - Licious: ₹3,640 (7% — reasonable)

May so far (19 days): ₹39,108 — projected ₹63,808 by month end
  - Supriya: Blinkit ₹5,051 + Swiggy ₹16,616 + Licious ₹1,507 + Swiggy restaurant ₹5,227
  - Vivek: Blinkit ₹1,061 + Swiggy ₹8,000 + Licious ₹1,332 + Swiggy restaurant ₹314

TARGET: ₹38,000/month total
  - Licious: max ₹6,000/month (₹1,500/week)
  - Blinkit/Instamart: max ₹8,000/month (₹2,000/week)
  - Swiggy delivery: max ₹12,000/month (cut from ₹33k — biggest lever)
  - Swiggy restaurant: max ₹8,000/month
  - Mango/bulk: max ₹4,000/month

INSIGHT TO SHARE WITH USER: Licious and Blinkit are NOT the problem. 
Swiggy food delivery is ₹33,816/month = 67% of spend. 
Every home-cooked dinner saves ~₹300-500 vs ordering Swiggy.

═══ FIXED BREAKFAST (EVERY SINGLE DAY, NEVER CHANGES) ═══
- 8 egg whites bhurji (shared, ~48g protein, ~150 kcal)
- 2 slices whole wheat bread (~140 kcal)
- 1 protein smoothie with seasonal fruit: dragon fruit/banana/mango/apple (~200 kcal, ~30g protein)
Breakfast total: ~490 kcal | ~78g protein (combined)

═══ MANDATORY WEEKLY PROTEIN ROTATION ═══
Mon: Chicken — 1 pack chicken breast (250g, for Supriya) + 1 pack chicken curry cut (300g, for Vivek) from Licious. Dish: chicken sukka or dry fry.
Tue: Sea fish — mackerel/sardine/pomfret dry fry (500g raw total) from Licious
Wed: Chicken — 1 pack chicken breast (250g) + 1 pack chicken curry cut (300g) from Licious. Dish: different preparation from Monday.
Thu: PANEER (300g total) — VEG DAY, strictly no meat/fish/eggs in main meals
Fri: Sea fish — mackerel/sardine/pomfret dry fry (500g raw total) from Licious. Different fish from Tuesday.
Sat: TEMPEH (300g, from Blinkit/Instamart) — pair with dal or chana
(Paneer on Thu, Tempeh on Sat, fish twice, chicken twice)

LICIOUS ORDER FOR CHICKEN DAYS (always both together):
- 1 x Chicken Breast (~250g) for Supriya — leaner, grilled or pan seared
- 1 x Chicken Curry Cut (~300-500g) for Vivek — for curry or sukka
Total per chicken day: ~550-750g chicken

═══ MEAL STRUCTURE (LUNCH = DINNER, COOKED ONCE) ═══
Lunch and Dinner are IDENTICAL — cook once, eat twice.
Lunch: curry/dal + protein + rice
Dinner: same curry/dal + same protein + roti

LUNCH/DINNER MACROS (combined for both Supriya and Vivek):
- Each meal: ~800-900 kcal combined, ~70-80g protein combined
- Curry/dal: dal tadka/rajma/black chana/kadhi/matar paneer/santula/aloo gobi gravy/torai curry
- Sabzi: always one dry vegetable alongside
- Rice: 150g cooked per person at lunch
- Roti: 2 rotis per person at dinner

═══ EVENING SNACK ═══
Sprouted moong (100g) OR sprouted chana (100g) OR pesarettu (2 pieces) with coconut chutney
~150 kcal | ~10g protein combined

═══ DAILY MACRO SUMMARY FORMAT ═══
Always show:
Supriya: ~Xg protein | ~Y kcal
Vivek: ~Xg protein | ~Y kcal

═══ NO-FISH-CURRY RULE ═══
NEVER suggest fish curry. Only DRY FRY for fish (mackerel fry, sardine fry, pomfret fry).
Kadhi ALWAYS pairs with seafood dry fry — never kadhi + chicken.

═══ STAPLES (NEVER IN SHOPPING LIST) ═══
onion, tomato, ginger, garlic, oil, salt, turmeric, cumin, mustard seeds, green chilli, curry leaves

═══ SHOPPING LIST RULES ═══
Be EXACT with quantities for the whole week:
- Eggs: 14 eggs (2/day for bhurji = 7 days × 2 = 14... but they use 8 whites so need 14-16 eggs)
- Actually: 8 egg whites/day × 6 days = 48 whites = ~5-6 dozen eggs (use yolks separately)
- Chicken: Mon + Wed = 300g × 2 = 600g chicken breast/thigh
- Fish: Tue + Fri = 400g × 2 = 800g (specify which fish)
- Rice: 150g × 2 people × 6 days = 1.8kg rice
- Atta: 2 rotis × 2 people × 6 days = ~800g atta
- Bread: 2 slices × 2 people × 6 days = 2 loaves
- Curd: 100g × 2 people × 6 days = 1.2kg
- Dal: 80g × 6 days = ~500g mixed dal
- Vegetables: 200g per sabzi × 6 days = ~1.2kg mixed veg
- Fruits for smoothie: 6 portions (vary daily)
- Protein powder: if they use it (optional)

Platforms: Licious → chicken, fish, eggs | Blinkit/Instamart → vegetables, dairy, paneer, tempeh, bread, fruits | Mango → rice, atta, dal in bulk

═══ WEEKLY PLAN FORMAT ═══
When proposing a week plan, show each day like this:

📅 MON (Non-Veg)
🍳 Breakfast: 8 egg white bhurji + bread + banana smoothie | 78g protein | 490 kcal
🍛 Lunch & Dinner: Dal tadka + Chicken sukka + Rice/Roti
   Supriya: ~35g protein | ~850 kcal
   Vivek: ~40g protein | ~1000 kcal
🌿 Evening: Sprouted moong | ~5g protein | 75 kcal

📊 Daily Total:
   Supriya: ~95g protein | 1680 kcal ✅
   Vivek: ~118g protein | 1980 kcal ✅

═══ RESPONSE RULES ═══
- NEVER show raw JSON tool calls like {"tool": ...}
- NEVER use markdown tables
- Use plain text with emojis
- After user confirms plan → give exact shopping list as JSON then plain text summary
- Shopping list JSON format: {"shoppingList": [{"item": "Chicken breast", "qty": "600g", "platform": "licious", "estimatedPrice": 180}]}
- Always show macros for every meal
- Always confirm protein targets are met`;

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
        .upsert({
          planned_date: params.date,
          day_of_week: new Date(params.date).toLocaleDateString('en', { weekday: 'short' }),
          is_veg: params.is_veg || false,
          breakfast: params.breakfast,
          lunch: params.lunch,
          dinner: params.dinner,
          evening_snack: params.evening_snack,
          total_protein: params.total_protein,
          confirmed: params.confirmed || false,
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
      await supabase.from('shopping_items').delete().eq('week_start', weekStart);
      const items = (params.items || []).map(item => ({ ...item, week_start: weekStart }));
      if (items.length) {
        const { data } = await supabase.from('shopping_items').insert(items).select();
        return data;
      }
      return [];
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
      temperature: 0.3,
      messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
    }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.choices?.[0]?.message?.content || '';
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { messages } = req.body;

    // Pre-fetch context
    const history = await callTool('get_meal_history', {});
    const now = new Date();
    const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const expenses = await callTool('get_expenses', { month: monthStr });

    const contextMsg = {
      role: 'user',
      content: `[SYSTEM CONTEXT - DO NOT SHOW TO USER]
Meal history last 2 weeks: ${history.length > 0 ? JSON.stringify(history) : 'No history yet'}
This month expenses: ₹${expenses.total} spent so far
Today: ${now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
[END CONTEXT]`,
    };

    const augmentedMessages = [contextMsg, ...messages];
    let response = await callGroq(augmentedMessages);

    // Strip leaked tool JSON
    response = response.replace(/\{\s*"tool"\s*:[\s\S]*?\}/g, '').trim();
    response = response.replace(/```json[\s\S]*?```/g, '').trim();
    response = response.replace(/\(Waiting for[\s\S]*?\)/g, '').trim();
    response = response.replace(/\(Please let[\s\S]*?\)/g, '').trim();
    response = response.replace(/\n{3,}/g, '\n\n').trim();

    // Extract shopping list JSON if present
    let parsed = null;
    const jsonMatch = response.match(/\{"shoppingList"[\s\S]*?\}\s*\]/);
    if (jsonMatch) {
      try {
        parsed = JSON.parse(jsonMatch[0] + (jsonMatch[0].endsWith(']') ? '}' : ']}'));
        response = response.replace(jsonMatch[0], '').trim();
        const weekStart = now.toISOString().split('T')[0];
        await callTool('save_shopping_list', { week_start: weekStart, items: parsed.shoppingList });
      } catch (e) {
        console.error('Shopping list parse error:', e.message);
      }
    }

    res.status(200).json({ response, parsed });
  } catch (err) {
    console.error('Agent error:', err);
    res.status(500).json({ error: err.message });
  }
}
