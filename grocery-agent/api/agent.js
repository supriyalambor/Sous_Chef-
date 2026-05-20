import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const SUPRIYA_EMAIL = process.env.SUPRIYA_EMAIL;
const VIVEK_EMAIL = process.env.VIVEK_EMAIL;

// ── Compact system prompt (~800 tokens) ──────────────────────────
const SYSTEM_PROMPT = `You are Sous Chef, a meal planning agent for Supriya (100g protein, 1700kcal) and Vivek (120g protein, 2000kcal) in Bengaluru. Combined: 220g protein, 3700kcal.

FIXED BREAKFAST (every day, never changes):
8 egg white bhurji (shared) + 2 bread slices each + protein smoothie with fruit
Breakfast macros:
  Supriya: ~40g protein | 480 kcal
  Vivek: ~40g protein | 520 kcal

PORTION SPLIT (Supriya eats less than Vivek):
  Supriya: 40% of shared meals
  Vivek: 60% of shared meals

WEEKLY PROTEIN ROTATION:
Mon/Wed/Sat: Chicken day — breast 450g + curry cut 500g (mixed together for curry/sukka)
Tue/Fri: Mackerel dry fry 500g ₹350 (or sardines ₹180 as budget option)
Thu: Paneer 400g — VEG DAY ONLY (no meat/fish/eggs)
Sun BF: Paratha (aloo/methi/mooli) + egg bhurji OR chicken keema
Sun lunch/dinner: Fish day OR paneer day

PANEER RULE: On paneer days, matar paneer IS the main protein + gravy. NO separate chicken/fish.
CHICKEN RULE: Chicken breast + curry cut mixed together for ONE dish (sukka or curry). NOT two separate dishes.

CRITICAL CALORIE RULES:
- Supriya target: 1700 kcal/day | Vivek target: 2000 kcal/day
- Lunch and dinner are THE SAME DISH but show DIFFERENT CALORIE COUNTS per sitting
- Supriya eats SMALLER portions than Vivek (she eats less rice/roti)

PER SITTING CALORIES (one meal = lunch OR dinner, not both):
BREAKFAST (same for both):
  Supriya: 38g protein | 480 kcal
  Vivek: 38g protein | 520 kcal

CHICKEN MEAL (per sitting — lunch OR dinner):
  Supriya: 30g protein | 380 kcal (small portion rice/roti + less chicken)
  Vivek: 40g protein | 480 kcal (larger portion rice/roti + more chicken)

FISH MEAL (per sitting):
  Supriya: 28g protein | 350 kcal
  Vivek: 38g protein | 440 kcal

PANEER MEAL (per sitting — matar paneer IS the protein, no separate paneer curry):
  Supriya: 22g protein | 360 kcal
  Vivek: 30g protein | 450 kcal

DAL/RAJMA/CHANA MEAL (per sitting):
  Supriya: 18g protein | 340 kcal
  Vivek: 25g protein | 420 kcal

EVENING SNACK:
  Pesarettu: Supriya 8g | 120 kcal | Vivek 8g | 120 kcal
  Sprouted moong/chana chaat: Supriya 7g | 100 kcal | Vivek 7g | 100 kcal
  Epigamia Greek yogurt: Supriya 25g | 150 kcal | Vivek 25g | 150 kcal
  Fruit: Supriya 2g | 80 kcal | Vivek 2g | 80 kcal

DAILY TOTAL CALCULATION EXAMPLE (Chicken day):
  Supriya: 38 + 30 + 30 + 8 = ~106g protein | 480 + 380 + 380 + 120 = ~1,360 kcal ✅ (target 1700)
  Vivek: 38 + 40 + 40 + 8 = ~126g protein | 520 + 480 + 480 + 120 = ~1,600 kcal ✅ (target 2000)

NOTE: Add 200-300 kcal for cooking oil, curd, and incidentals to reach targets.
NEVER show lunch and dinner with the same exact calorie number — they're the same dish but show it once each.

MEAL STRUCTURE (lunch = dinner, cooked once):
Every meal = 1 GRAVY + 1 DRY SABZI + protein (curry OR grill) + rice/roti
- Fish days → Rice BOTH meals
- Dal days → Rice BOTH meals  
- Other days → Rice lunch, Roti/Paratha dinner

STRICT RULES:
- Kadhi ALWAYS with seafood dry fry (never chicken)
- Rajma/chana days → NO meat
- Torai = ALWAYS dry sabzi, never curry
- Never repeat same combo within a week

GRAVIES: dal tadka, palak dal, rajma, black chana, matar paneer, paneer bhurji matar, kadhi, santula, aloo gobi gravy
DRY SABZI: torai, bhindi, beans+carrot, cauliflower+matar+aloo+carrot, cabbage, baingan bharta, beetroot, aloo gobi

EVENING SNACK: pesarettu with coconut chutney / sprouted moong or chana chaat / Epigamia Greek yogurt / fruit

BUDGET: Weekly ₹4,000-4,500 | Monthly target ₹32,000
REAL PROBLEM: Impulse Instamart orders (was ₹33k/month). Solution: ONE planned weekly shop Monday morning.

RESPONSE FORMAT:
- Plain text with emojis, no JSON tool calls visible, no markdown tables
- Always show macros per person per meal
- After user confirms plan → output shopping list as: {"shoppingList":[{"item":"","qty":"","platform":"licious|instamart|mango","estimatedPrice":0}]}
- Keep responses concise — max 300 words`;

// ── Tools ─────────────────────────────────────────────────────────
const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'get_meal_history',
      description: 'Get meals eaten in the last 14 days to avoid repetition',
      parameters: { type: 'object', properties: {}, required: [] }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_prices',
      description: 'Get current prices for groceries from the database',
      parameters: { type: 'object', properties: {}, required: [] }
    }
  },
  {
    type: 'function',
    function: {
      name: 'save_meal_plan',
      description: 'Save confirmed meal plan to database',
      parameters: {
        type: 'object',
        properties: {
          date: { type: 'string', description: 'Date in YYYY-MM-DD format' },
          breakfast: { type: 'string' },
          lunch: { type: 'string' },
          dinner: { type: 'string' },
          evening_snack: { type: 'string' },
          total_protein: { type: 'number' },
          is_veg: { type: 'boolean' }
        },
        required: ['date', 'lunch', 'dinner']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_expenses',
      description: 'Get current month expenses and total',
      parameters: { type: 'object', properties: {}, required: [] }
    }
  },
  {
    type: 'function',
    function: {
      name: 'save_expense',
      description: 'Log a new grocery expense',
      parameters: {
        type: 'object',
        properties: {
          platform: { type: 'string', enum: ['licious', 'instamart', 'blinkit', 'mango', 'swiggy'] },
          amount: { type: 'number' },
          note: { type: 'string' }
        },
        required: ['platform', 'amount']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'send_grocery_email',
      description: 'Send grocery list email to Supriya and Vivek',
      parameters: {
        type: 'object',
        properties: {
          subject: { type: 'string' },
          items: { type: 'array', items: { type: 'object' } },
          total: { type: 'number' }
        },
        required: ['items', 'total']
      }
    }
  }
];

// ── Tool executor ─────────────────────────────────────────────────
async function executeTool(name, args) {
  switch (name) {
    case 'get_meal_history': {
      const twoWeeksAgo = new Date();
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
      const { data } = await supabase
        .from('meal_plans')
        .select('planned_date, lunch, dinner')
        .gte('planned_date', twoWeeksAgo.toISOString().split('T')[0])
        .order('planned_date', { ascending: false });
      return data?.length ? data : 'No meal history yet';
    }

    case 'get_prices': {
      const { data } = await supabase
        .from('prices')
        .select('item, quantity, price_inr, platform')
        .order('category');
      return data || [];
    }

    case 'save_meal_plan': {
      const { data } = await supabase.from('meal_plans').upsert({
        planned_date: args.date,
        day_of_week: new Date(args.date).toLocaleDateString('en', { weekday: 'short' }),
        is_veg: args.is_veg || false,
        breakfast: args.breakfast || '8 egg white bhurji + bread + smoothie',
        lunch: args.lunch,
        dinner: args.dinner,
        evening_snack: args.evening_snack,
        total_protein: args.total_protein,
        confirmed: true,
      }).select();
      return { success: true, saved: data };
    }

    case 'get_expenses': {
      const now = new Date();
      const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const { data } = await supabase
        .from('expenses')
        .select('*')
        .gte('expense_date', monthStr + '-01')
        .order('expense_date', { ascending: false });
      const total = (data || []).reduce((sum, e) => sum + e.amount, 0);
      const byPlatform = {};
      (data || []).forEach(e => {
        byPlatform[e.platform] = (byPlatform[e.platform] || 0) + e.amount;
      });
      return { total, byPlatform, count: (data || []).length };
    }

    case 'save_expense': {
      const { data } = await supabase.from('expenses').insert({
        platform: args.platform,
        amount: args.amount,
        note: args.note,
        expense_date: new Date().toISOString().split('T')[0],
      }).select();
      return { success: true, saved: data };
    }

    case 'send_grocery_email': {
      if (!RESEND_API_KEY) return { error: 'No Resend API key configured' };
      
      const grouped = {};
      (args.items || []).forEach(item => {
        const p = item.platform || 'instamart';
        if (!grouped[p]) grouped[p] = [];
        grouped[p].push(item);
      });

      const platformEmojis = { licious: '🥩', instamart: '🛍️', blinkit: '💛', mango: '🏪' };
      
      const htmlBody = `
        <h2>🍳 Sous Chef — Weekly Grocery List</h2>
        <p>Estimated total: <strong>₹${args.total?.toLocaleString('en-IN')}</strong></p>
        ${Object.entries(grouped).map(([platform, items]) => `
          <h3>${platformEmojis[platform] || '🛒'} ${platform.charAt(0).toUpperCase() + platform.slice(1)}</h3>
          <ul>${items.map(i => `<li>${i.item} — ${i.qty} <strong>₹${i.estimatedPrice}</strong></li>`).join('')}</ul>
        `).join('')}
        <p><em>Order everything Monday morning for the week. One shop = no impulse orders!</em></p>
      `;

      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: 'Sous Chef <onboarding@resend.dev>',
          to: [SUPRIYA_EMAIL, VIVEK_EMAIL].filter(Boolean),
          subject: args.subject || '🛒 Sous Chef — Weekly Grocery List',
          html: htmlBody,
        }),
      });
      const data = await res.json();
      return res.ok ? { success: true, id: data.id } : { error: data.message };
    }

    default:
      return { error: `Unknown tool: ${name}` };
  }
}

// ── Groq call with native tool use ────────────────────────────────
async function callGroq(messages, useTools = true) {
  const body = {
    model: 'llama-3.1-8b-instant',
    max_tokens: 1000,
    temperature: 0.3,
    messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
  };
  if (useTools) body.tools = TOOLS;

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.choices?.[0]?.message;
}

// ── Main handler ──────────────────────────────────────────────────
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { messages } = req.body;
    
    // Keep only last 4 messages to save tokens
    const recentMessages = messages.slice(-4);
    
    // Add today's date context (minimal tokens)
    const now = new Date();
    const dateContext = {
      role: 'user',
      content: `[Context: Today is ${now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}. Day ${now.getDate()} of month.]`
    };
    
    let agentMessages = [dateContext, ...recentMessages];
    let finalResponse = '';
    let parsed = null;

    // Agentic loop — max 5 tool calls
    for (let i = 0; i < 5; i++) {
      const message = await callGroq(agentMessages);
      
      // No tool calls — we have final response
      if (!message.tool_calls || message.tool_calls.length === 0) {
        finalResponse = message.content || '';
        break;
      }

      // Execute all tool calls
      agentMessages.push(message);
      
      for (const toolCall of message.tool_calls) {
        const toolName = toolCall.function.name;
        let toolArgs = {};
        try { toolArgs = JSON.parse(toolCall.function.arguments); } catch {}
        
        console.log(`Executing tool: ${toolName}`);
        const result = await executeTool(toolName, toolArgs);
        
        agentMessages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify(result),
        });
      }
    }

    // Clean response
    finalResponse = finalResponse
      .replace(/```json[\s\S]*?```/g, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    // Extract shopping list if present
    const jsonMatch = finalResponse.match(/\{"shoppingList"[\s\S]*?\]\s*\}/);
    if (jsonMatch) {
      try {
        parsed = JSON.parse(jsonMatch[0]);
        finalResponse = finalResponse.replace(jsonMatch[0], '').trim();
        // Save shopping list
        const weekStart = now.toISOString().split('T')[0];
        await supabase.from('shopping_items').delete().eq('week_start', weekStart);
        if (parsed.shoppingList?.length) {
          await supabase.from('shopping_items').insert(
            parsed.shoppingList.map(item => ({ ...item, week_start: weekStart }))
          );
        }
      } catch (e) {
        console.log('Shopping list parse error:', e.message);
      }
    }

    res.status(200).json({ response: finalResponse, parsed });
  } catch (err) {
    console.error('Agent error:', err);
    res.status(500).json({ error: err.message });
  }
}
