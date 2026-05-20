import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const SUPRIYA_EMAIL = process.env.SUPRIYA_EMAIL;
const VIVEK_EMAIL = process.env.VIVEK_EMAIL;

// ── SYSTEM PROMPT — kept minimal ─────────────────────────────────
const SYSTEM_PROMPT = `You are Sous Chef, a meal planning agent for Supriya and Vivek in Bengaluru, India.

TARGETS (fixed, do not change):
Supriya: 1,846 kcal/day | 130g protein/day | Fat loss
Vivek: 2,709 kcal/day | 166g protein/day | Fat loss + muscle
Combined: 4,555 kcal | 296g protein

FIXED BREAKFAST every day (never changes):
8 egg white bhurji + 2 bread slices + protein smoothie with fruit
Supriya: 38g protein | 480 kcal
Vivek: 38g protein | 520 kcal

WEEKLY ROTATION:
Mon/Wed/Sat: Chicken (breast 450g + curry cut 500g mixed together for ONE dish)
Tue/Fri/Sun: Fish dry fry (mackerel 500g or sardines — NO fish curry, dry fry only)
Thu: Paneer 400g — STRICT VEG DAY

MEAL STRUCTURE per day (lunch = dinner, cooked once):
EVERY meal MUST have ALL 4 components — NO EXCEPTIONS:
1. GRAVY (dal/kadhi/rajma/chana/matar paneer/palak dal/santula/aloo gobi gravy)
2. DRY SABZI (torai/bhindi/beans+carrot/cauliflower+matar+aloo/cabbage/baingan bharta/beetroot) — ALWAYS, including paneer days
3. PROTEIN (chicken/fish/paneer — on paneer days matar paneer is both gravy and protein)
4. RICE or ROTI:
   - Fish days → Rice BOTH meals (lunch + dinner)
   - Dal days → Rice BOTH meals
   - All other days → Rice at lunch, Roti at dinner

EXAMPLES (follow exactly):
Thu (paneer): Lunch = Matar paneer + Bhindi fry + Rice | Dinner = Matar paneer + Bhindi fry + Roti
Mon (chicken): Lunch = Dal tadka + Torai sabzi + Chicken sukka + Rice | Dinner = same + Roti
Tue (fish): Lunch = Kadhi + Beans carrot sabzi + Mackerel dry fry + Rice | Dinner = same + Rice

PER SITTING MACROS (one meal = lunch OR dinner):
Chicken: Supriya 32g protein | 400 kcal | Vivek 42g protein | 500 kcal
Fish: Supriya 30g protein | 370 kcal | Vivek 40g protein | 460 kcal  
Paneer: Supriya 24g protein | 380 kcal | Vivek 32g protein | 470 kcal
Dal/rajma: Supriya 20g protein | 350 kcal | Vivek 28g protein | 430 kcal
Evening snack: ~8g protein | 120 kcal each

DAILY TOTAL CHECK (chicken day example):
Supriya: 38+32+32+8 = 110g protein | 480+400+400+120+200(oil/curd) = 1,600 kcal ✅ (target 1,846)
Vivek: 38+42+42+8 = 130g protein | 520+500+500+120+300(oil/curd) = 1,940 kcal ✅ (target 2,709)
NOTE: Vivek needs bigger portions — 1.5x Supriya's rice/roti to reach his calorie target

RULES:
- Kadhi ALWAYS with fish dry fry (never chicken)
- Rajma/chana days = no meat same day
- Torai = always dry sabzi, never curry  
- Never repeat combo in same week
- Paneer on Thu = matar paneer IS the protein, no separate protein needed
- Sunday BF = paratha (aloo/methi/mooli) + egg bhurji or keema

GRAVIES: dal tadka, palak dal, rajma, black chana, matar paneer, paneer bhurji matar, kadhi, santula, aloo gobi gravy
DRY SABZI: torai, bhindi, beans+carrot, cauliflower+matar+aloo+carrot, cabbage, baingan bharta, beetroot

EVENING SNACK (rotate): pesarettu + coconut chutney | sprouted moong/chana chaat | Epigamia Greek yogurt | fruit

RESPONSE RULES:
- Max 200 words per response
- No markdown tables, no raw JSON visible
- Always show per-person macros separately
- After user CONFIRMS plan → output: {"shoppingList":[{"item":"","qty":"","platform":"licious|instamart|mango","estimatedPrice":0}]}
- For budget questions use: May spend ₹39,108 so far, target ₹38,000/month`;

// ── Tools ─────────────────────────────────────────────────────────
const TOOLS = [
  {
    type: "function",
    function: {
      name: "get_meal_history",
      description: "Get last 14 days of meals to avoid repetition",
      parameters: { type: "object", properties: {}, required: [] }
    }
  },
  {
    type: "function",
    function: {
      name: "save_meal_plan",
      description: "Save confirmed meal plan",
      parameters: {
        type: "object",
        properties: {
          date: { type: "string" },
          lunch: { type: "string" },
          dinner: { type: "string" },
          is_veg: { type: "boolean" },
          total_protein: { type: "number" }
        },
        required: ["date", "lunch"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_expenses",
      description: "Get this month's expenses",
      parameters: { type: "object", properties: {}, required: [] }
    }
  },
  {
    type: "function",
    function: {
      name: "save_expense",
      description: "Log a grocery expense",
      parameters: {
        type: "object",
        properties: {
          platform: { type: "string" },
          amount: { type: "number" },
          note: { type: "string" }
        },
        required: ["platform", "amount"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "send_email",
      description: "Email grocery list to Supriya and Vivek",
      parameters: {
        type: "object",
        properties: {
          items: { type: "array", items: { type: "object" } },
          total: { type: "number" }
        },
        required: ["items", "total"]
      }
    }
  }
];

// ── Tool executor ─────────────────────────────────────────────────
async function executeTool(name, args) {
  switch (name) {
    case "get_meal_history": {
      const since = new Date();
      since.setDate(since.getDate() - 14);
      const { data } = await supabase
        .from("meal_plans")
        .select("planned_date, lunch, dinner")
        .gte("planned_date", since.toISOString().split("T")[0])
        .order("planned_date", { ascending: false });
      return data?.length ? data.map(d => `${d.planned_date}: ${d.lunch}`).join(", ") : "No history";
    }
    case "save_meal_plan": {
      await supabase.from("meal_plans").upsert({
        planned_date: args.date,
        day_of_week: new Date(args.date).toLocaleDateString("en", { weekday: "short" }),
        is_veg: args.is_veg || false,
        lunch: args.lunch,
        dinner: args.dinner || args.lunch,
        total_protein: args.total_protein,
        confirmed: true,
      });
      return { success: true };
    }
    case "get_expenses": {
      const now = new Date();
      const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      const { data } = await supabase
        .from("expenses")
        .select("platform, amount, note, expense_date")
        .gte("expense_date", month + "-01");
      const total = (data || []).reduce((s, e) => s + e.amount, 0);
      const byPlatform = {};
      (data || []).forEach(e => { byPlatform[e.platform] = (byPlatform[e.platform] || 0) + e.amount; });
      return { total, byPlatform, month };
    }
    case "save_expense": {
      await supabase.from("expenses").insert({
        platform: args.platform, amount: args.amount,
        note: args.note, expense_date: new Date().toISOString().split("T")[0]
      });
      return { success: true };
    }
    case "send_email": {
      if (!RESEND_API_KEY) return { error: "Resend not configured" };
      const grouped = {};
      (args.items || []).forEach(i => {
        if (!grouped[i.platform]) grouped[i.platform] = [];
        grouped[i.platform].push(i);
      });
      const emoji = { licious: "🥩", instamart: "🛍️", blinkit: "💛", mango: "🏪" };
      const html = `<h2>🍳 Sous Chef Weekly Groceries</h2>
        <p>Total: <b>₹${(args.total || 0).toLocaleString("en-IN")}</b> — order everything Monday morning!</p>
        ${Object.entries(grouped).map(([p, items]) =>
          `<h3>${emoji[p] || "🛒"} ${p}</h3><ul>${items.map(i =>
            `<li>${i.item} ${i.qty} — ₹${i.estimatedPrice}</li>`).join("")}</ul>`
        ).join("")}`;
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${RESEND_API_KEY}` },
        body: JSON.stringify({
          from: "Sous Chef <onboarding@resend.dev>",
          to: [SUPRIYA_EMAIL, VIVEK_EMAIL].filter(Boolean),
          subject: "🛒 Weekly Grocery List",
          html,
        }),
      });
      return res.ok ? { success: true } : { error: "Email failed" };
    }
    default: return { error: "Unknown tool" };
  }
}

// ── Groq call ─────────────────────────────────────────────────────
async function callGroq(messages) {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${GROQ_API_KEY}` },
    body: JSON.stringify({
      model: "llama-3.1-8b-instant",
      max_tokens: 800,
      temperature: 0.2,
      messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
      tools: TOOLS,
    }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.choices?.[0]?.message;
}

// ── Handler ───────────────────────────────────────────────────────
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  try {
    const { messages } = req.body;
    const now = new Date();
    const today = now.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });
    const isVeg = now.getDay() === 4; // Thursday

    // Only last 3 messages + date context
    const ctx = [{
      role: "user",
      content: `Today: ${today}${isVeg ? " — VEG DAY" : ""}. Day ${now.getDate()}/31 of month.`
    }];
    const recent = (messages || []).slice(-3);
    let agentMsgs = [...ctx, ...recent];
    let finalText = "";
    let parsed = null;

    // Agent loop — max 3 tool calls
    for (let i = 0; i < 3; i++) {
      const msg = await callGroq(agentMsgs);
      if (!msg.tool_calls?.length) { finalText = msg.content || ""; break; }

      agentMsgs.push(msg);
      for (const tc of msg.tool_calls) {
        let args = {};
        try { args = JSON.parse(tc.function.arguments); } catch {}
        const result = await executeTool(tc.function.name, args);
        agentMsgs.push({ role: "tool", tool_call_id: tc.id, content: JSON.stringify(result) });
      }
    }

    // Clean response
    finalText = finalText.replace(/```json[\s\S]*?```/g, "").replace(/\n{3,}/g, "\n\n").trim();

    // Extract shopping list
    const match = finalText.match(/\{"shoppingList"[\s\S]*?\]\s*\}/);
    if (match) {
      try {
        parsed = JSON.parse(match[0]);
        finalText = finalText.replace(match[0], "").trim();
        const week = now.toISOString().split("T")[0];
        await supabase.from("shopping_items").delete().eq("week_start", week);
        if (parsed.shoppingList?.length) {
          await supabase.from("shopping_items").insert(parsed.shoppingList.map(i => ({ ...i, week_start: week })));
        }
      } catch {}
    }

    res.status(200).json({ response: finalText, parsed });
  } catch (err) {
    console.error("Agent error:", err.message);
    res.status(500).json({ error: err.message });
  }
}
