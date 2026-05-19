import { useState, useRef, useEffect } from "react";

const DAYS = ["Mon","Tue","Wed","Thu","Fri","Sat"];
const VEG_DAYS = ["Thu"];
const TODAY_IDX = Math.min(new Date().getDay() === 0 ? 6 : new Date().getDay() - 1, 5);
const TODAY_NAME = DAYS[TODAY_IDX] || "Mon";

const PLATFORMS = {
  licious:   { label: "Licious",   color: "#E8473F", emoji: "🥩", search: q => `https://www.licious.in/search?q=${encodeURIComponent(q)}` },
  blinkit:   { label: "Blinkit",   color: "#F9C23C", emoji: "💛", search: q => `https://blinkit.com/s/?q=${encodeURIComponent(q)}` },
  instamart: { label: "Instamart", color: "#FC8019", emoji: "🛍️", search: q => `https://www.swiggy.com/instamart/search?query=${encodeURIComponent(q)}` },
  mango:     { label: "Mango",     color: "#4CAF7D", emoji: "🏪", search: q => `https://www.google.com/search?q=mango+hypermarket+${encodeURIComponent(q)}` },
};

function fmt(n) { return "₹" + Number(n || 0).toLocaleString("en-IN"); }

const SYSTEM_PROMPT = `You are a smart grocery and meal planning agent for an Indian household in Bengaluru, India.
HOUSEHOLD: 2 adults who work out regularly.
- User (Supriya): 100g protein/day
- Vivek: 120g protein/day
- Combined protein goal: 220g/day
MONTHLY FOOD BUDGET: ₹35,000 to ₹40,000 (they currently overspend at ₹50,000/month and want to reduce).
WEEKLY GROCERY BUDGET: ₹8,000 to ₹10,000 for fresh groceries only.
USE REALISTIC INDIAN PRICES IN BENGALURU:
- Eggs: ₹7-8 per egg, ₹80-90 per dozen
- Chicken breast: ₹280-320 per kg
- Fish (rohu/tilapia): ₹200-250 per kg  
- Paneer: ₹80-100 per 200g
- Vegetables: ₹30-60 per kg
- Fruits: ₹60-100 per kg
MEAL PATTERN: Simple home-style Odia/Indian food.
- Breakfast: FIXED EVERY DAY — 8 egg white bhurji + 1-2 slices of bread + 1 glass protein smoothie with a fruit (dragon fruit, banana, apple, mango, berries etc). This never changes.
- Lunch: one curry/dal + one sabzi + rice or roti + curd
- Evening: chai, fruit, roasted chana, boiled eggs, or protein shake
- Dinner: lighter version — dal or curry + sabzi + roti

ACTUAL DISHES THEY COOK (rotate these, don't repeat same dish twice in a week):
CURRIES/DAL: dal tadka, dal fry, rajma, black chana gravy, matar paneer, aloo gobi gravy, torai (ridge gourd) curry, santula (Odia mixed veg curry), kadhi, egg curry, chicken curry, mackerel curry, fish fry
SABZI (dry): aloo gobi, mix veg sabzi, bhindi fry, palak, beans sabzi, cabbage sabzi, baingan bharta, dry chicken fry, chicken sukka, dry fish fry
RICE DISHES: plain rice, jeera rice, kadhi chawal (kadhi as curry + plain rice — a favourite combo)
ROTI: plain roti or phulka
NEVER suggest exotic or restaurant-style dishes. Keep it simple and home-style.
VEG DAYS: Thursday only (no meat, fish, eggs on Thursday).
PROTEIN SOURCES: 
- Eggs (daily breakfast staple)
- Chicken (2-3 times a week)
- Fish: mackerel (bangda) weekly, seabass occasionally (once a week max)
- Paneer (on veg days or when needed)
- Tempeh (occasionally, as a paneer alternative)
- Dal and curd (daily)
FISH NOTE: No fish curry — too time consuming to cook. Only dry fish fry is okay (quick to make).
FISH PRICES IN BENGALURU:
- Mackerel (bangda) for dry fry: ₹180-220 per kg
- Seabass: ₹400-500 per kg (occasional, dry fry only)
- Tempeh: ₹120-150 per 200g pack
STAPLES ALWAYS AT HOME (never put in shopping list): milk, coffee, curd, onion, tomato, ginger, garlic, oil, atta, rice, dal, salt, spices.
PLATFORMS: Licious for chicken/fish/eggs; Blinkit or Instamart for vegetables, paneer, tempeh and dairy; Mango for bulk staples.

CRITICAL INSTRUCTIONS:
- If the user asks to plan a week, respond with ONLY a raw JSON object starting with {"action":"PLAN_WEEK"...} — no text before or after, no markdown
- If the user asks to plan today or a single day, FIRST propose the meals in plain text and ask if it's okay. Say something like: "Here's what I'm thinking for today:\n\nBreakfast: ...\nLunch: ...\nEvening: ...\nDinner: ...\n\nDoes this work for you? Any changes?"
- Only after the user confirms (says yes/okay/looks good), respond with the PLAN_DAY JSON including the shopping list
- If user asks for changes, adjust and propose again before giving the JSON
- For all other questions respond in plain text
- AVOID fish curry in any plan — only dry fish fry is allowed (quick to make)

MEAL COMBINATION RULES:
- Every lunch and dinner = one main (curry/dal/kadhi) + one sabzi (dry) + rice OR roti
- Example combos: "Kadhi + rice + dry chicken fry", "Dal tadka + roti + aloo gobi", "Mackerel curry + rice + bhindi fry"
- Breakfast always simple: eggs/poha/upma/idli + milk/coffee
- Evening: sprouted moong / sprouted chana / pesarettu (moong dal crepes) with coconut chutney / fruit. NO boiled eggs as snack.
- Thursday: strictly veg — use dal, kadhi, matar paneer, santula, chana, rajma

SHOPPING LIST RULES:
- Include ALL ingredients needed for the week including: vegetables (with exact kg), meat/fish (exact kg), eggs (exact count)
- Include staples that need restocking: rice (kg), atta (kg), besan (if kadhi), curd (kg)
- Group by what needs to be bought fresh vs weekly stock
- Use real Bengaluru market prices
- Platform: Licious for chicken/fish/eggs, Blinkit/Instamart for veggies/dairy, Mango for rice/atta/bulk

PLAN_WEEK JSON (fill all fields with real values):
{"action":"PLAN_WEEK","days":[{"day":"Mon","veg":false,"meals":{"breakfast":{"dish":"","protein":0},"lunch":{"dish":"curry + sabzi + rice/roti","protein":0},"evening":{"dish":"","protein":0},"dinner":{"dish":"curry + sabzi + roti","protein":0}},"totalProtein":0,"totalCalories":0},{"day":"Tue","veg":false,"meals":{"breakfast":{"dish":"","protein":0},"lunch":{"dish":"","protein":0},"evening":{"dish":"","protein":0},"dinner":{"dish":"","protein":0}},"totalProtein":0,"totalCalories":0},{"day":"Wed","veg":false,"meals":{"breakfast":{"dish":"","protein":0},"lunch":{"dish":"","protein":0},"evening":{"dish":"","protein":0},"dinner":{"dish":"","protein":0}},"totalProtein":0,"totalCalories":0},{"day":"Thu","veg":true,"meals":{"breakfast":{"dish":"","protein":0},"lunch":{"dish":"","protein":0},"evening":{"dish":"","protein":0},"dinner":{"dish":"","protein":0}},"totalProtein":0,"totalCalories":0},{"day":"Fri","veg":false,"meals":{"breakfast":{"dish":"","protein":0},"lunch":{"dish":"","protein":0},"evening":{"dish":"","protein":0},"dinner":{"dish":"","protein":0}},"totalProtein":0,"totalCalories":0},{"day":"Sat","veg":false,"meals":{"breakfast":{"dish":"","protein":0},"lunch":{"dish":"","protein":0},"evening":{"dish":"","protein":0},"dinner":{"dish":"","protein":0}},"totalProtein":0,"totalCalories":0}],"shoppingList":[{"item":"Chicken","qty":"1.5 kg","platform":"licious","estimatedPrice":450,"days":["Mon","Wed"]},{"item":"Mackerel","qty":"1 kg","platform":"licious","estimatedPrice":220,"days":["Fri"]},{"item":"Eggs","qty":"2 dozen","platform":"licious","estimatedPrice":180,"days":["Mon","Tue","Wed","Thu","Fri","Sat"]},{"item":"Rice","qty":"3 kg","platform":"mango","estimatedPrice":180,"days":["all"]},{"item":"Atta","qty":"2 kg","platform":"mango","estimatedPrice":120,"days":["all"]},{"item":"Potatoes","qty":"1 kg","platform":"blinkit","estimatedPrice":40,"days":["Tue","Thu"]},{"item":"Cauliflower","qty":"1 head","platform":"blinkit","estimatedPrice":40,"days":["Tue"]}],"estimatedWeeklyCost":8500}

PLAN_DAY JSON:
{"action":"PLAN_DAY","day":"Mon","veg":false,"meals":{"breakfast":{"dish":"","protein":0},"lunch":{"dish":"curry + sabzi + rice","protein":0},"evening":{"dish":"","protein":0},"dinner":{"dish":"curry + sabzi + roti","protein":0}},"shoppingList":[{"item":"","qty":"","platform":"blinkit","estimatedPrice":0,"forMeal":""}],"totalProtein":0,"totalCalories":0,"estimatedCost":0}`;

const SUGGESTIONS = [
  { label: "📅 Plan my week", msg: "Plan my week Mon to Sat" },
  { label: `🍳 Plan today (${TODAY_NAME})`, msg: `Plan today's meals (${TODAY_NAME})` },
  { label: "📧 Email grocery list", msg: "Email me the grocery list" },
  { label: "💰 How to save money?", msg: "How can we reduce our ₹50k monthly grocery spend without losing protein?" },
];

export default function App() {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem("ga_apikey2") || "");
  const [keyInput, setKeyInput] = useState("");
  const [messages, setMessages] = useState([{
    role: "assistant", type: "text",
    content: `Hey! 👋 I'm your grocery agent.\n\nI know you and Vivek eat simple home-style Indian food, Thursday is veg day, and you both work out.\n\nTap a suggestion or just tell me what you need.`,
  }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [weekPlan, setWeekPlan] = useState(null);
  const [shoppingList, setShoppingList] = useState([]);
  const [activeDay, setActiveDay] = useState(TODAY_NAME);
  const [panel, setPanel] = useState("chat");
  const bottomRef = useRef();

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  function saveKey() {
    const k = keyInput.trim();
    if (!k) return alert("Please enter an API key");
    localStorage.setItem("ga_apikey2", k);
    setApiKey(k);
    setKeyInput("");
  }

  async function sendMessage(text) {
    if (!text.trim() || loading || !apiKey) return;
    const userMsg = { role: "user", type: "text", content: text };
    const history = [...messages.filter(m => m.type !== "typing"), userMsg];
    setMessages(prev => [...prev, userMsg, { role: "assistant", type: "typing" }]);
    setInput("");
    setLoading(true);

    // If asking to email and we have a list, open mailto
    if (/email|send|mail|alert|notify/i.test(text) && shoppingList.length > 0) {
      const body = Object.entries(PLATFORMS).map(([pid, p]) => {
        const items = shoppingList.filter(i => i.platform === pid);
        if (!items.length) return "";
        return `${p.emoji} ${p.label}:\n${items.map(i => `  - ${i.item} (${i.qty}) — ${fmt(i.estimatedPrice)}`).join("\n")}`;
      }).filter(Boolean).join("\n\n");
      const total = shoppingList.reduce((a, b) => a + (b.estimatedPrice || 0), 0);
      const subject = encodeURIComponent("🛒 Weekly Grocery List");
      const bodyEnc = encodeURIComponent(`Hi,\n\nHere's this week's grocery list:\n\n${body}\n\nEstimated total: ${fmt(total)}\n\n— Grocery Agent`);
      window.open(`mailto:?subject=${subject}&body=${bodyEnc}`);
      setMessages(prev => [...prev.filter(m => m.type !== "typing"), {
        role: "assistant", type: "text",
        content: `📧 Opened your email app with the grocery list!\n\nJust add Vivek's email and hit send. Estimated total: **${fmt(total)}**`,
      }]);
      setLoading(false);
      return;
    }

    try {
      const apiMessages = history.map(m => ({ role: m.role, content: m.content }));
      const isGemini = apiKey.startsWith("AIza");
      const isGroq = apiKey.startsWith("gsk_");
      let raw = "";

      if (isGroq) {
        const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            max_tokens: 2000,
            messages: [
              { role: "system", content: SYSTEM_PROMPT },
              ...apiMessages,
            ],
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error?.message || `Groq error ${res.status}`);
        raw = data.choices?.[0]?.message?.content || "";
      } else if (isGemini) {
        // Build a single user message with full context
        const fullContext = SYSTEM_PROMPT + "\n\n" + apiMessages.map(m => 
          (m.role === "user" ? "User: " : "Assistant: ") + m.content
        ).join("\n");
        
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: fullContext }] }],
            generationConfig: { maxOutputTokens: 2000, temperature: 0.7 },
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error?.message || `API error ${res.status}`);
        raw = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
        if (!raw) throw new Error("Empty response");
      } else {
        const res = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
            "anthropic-dangerous-direct-browser-access": "true",
          },
          body: JSON.stringify({
            model: "claude-sonnet-4-20250514",
            max_tokens: 1000,
            system: SYSTEM_PROMPT,
            messages: apiMessages,
          }),
        });
        if (res.status === 401) throw new Error("invalid_key");
        const data = await res.json();
        raw = data.content?.find(b => b.type === "text")?.text || "";
      }

      let parsed = null;
      try { parsed = JSON.parse(raw.replace(/```json|```/g, "").trim()); } catch {}

      setMessages(prev => prev.filter(m => m.type !== "typing"));

      if (parsed?.action === "PLAN_WEEK") {
        setWeekPlan(parsed);
        setShoppingList(parsed.shoppingList || []);
        setPanel("plan");
        setMessages(prev => [...prev, {
          role: "assistant", type: "plan_week",
          content: `Done! Mon–Sat plan is ready 🗓️\n\nShopping list: **${(parsed.shoppingList || []).length} items** · Estimated **${fmt(parsed.estimatedWeeklyCost)}** for the week.\n\nWant me to email the grocery list to you and Vivek?`,
          data: parsed,
        }]);
      } else if (parsed?.action === "PLAN_DAY") {
        setShoppingList(parsed.shoppingList || []);
        setPanel("plan");
        setMessages(prev => [...prev, {
          role: "assistant", type: "plan_day",
          content: `Here's your ${parsed.day} plan ${parsed.veg ? "🥦 (veg day)" : "🥩"}\n\nProtein: **${parsed.totalProtein}g** · ${parsed.totalCalories} cal · Est. groceries: **${fmt(parsed.estimatedCost)}**`,
          data: parsed,
        }]);
      } else {
        setMessages(prev => [...prev, { role: "assistant", type: "text", content: raw }]);
      }
    } catch (e) {
      const msg = e.message === "invalid_key"
        ? "❌ Invalid API key. Please check and update it below."
        : `Something went wrong: ${e.message}`;
      setMessages(prev => [...prev.filter(m => m.type !== "typing"), { role: "assistant", type: "text", content: msg }]);
    }
    setLoading(false);
  }

  function renderText(text) {
    return text.split(/(\*\*[^*]+\*\*)/).map((p, i) =>
      p.startsWith("**") ? <strong key={i} style={{ color: "#fff" }}>{p.slice(2, -2)}</strong> : p
    );
  }

  function renderMsg(msg, i) {
    const isUser = msg.role === "user";
    if (msg.type === "typing") return (
      <div key={i} style={{ display: "flex", gap: 10, marginBottom: 16, alignItems: "flex-start" }}>
        <div style={{ width: 30, height: 30, borderRadius: "50%", background: "#1A1A1A", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>🤖</div>
        <div style={{ background: "#141414", border: "1px solid #1E1E1E", borderRadius: "4px 14px 14px 14px", padding: "14px 18px" }}>
          <span style={{ color: "#555", fontSize: 20, letterSpacing: 4 }}>···</span>
        </div>
      </div>
    );
    return (
      <div key={i} style={{ display: "flex", gap: 10, marginBottom: 16, justifyContent: isUser ? "flex-end" : "flex-start", alignItems: "flex-start" }}>
        {!isUser && <div style={{ width: 30, height: 30, borderRadius: "50%", background: "#1A1A1A", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>🤖</div>}
        <div style={{ maxWidth: "82%" }}>
          <div style={{ background: isUser ? "#1C2E1C" : "#141414", border: `1px solid ${isUser ? "#2A4A2A" : "#1E1E1E"}`, borderRadius: isUser ? "14px 4px 14px 14px" : "4px 14px 14px 14px", padding: "12px 16px", fontSize: 13, lineHeight: 1.7, whiteSpace: "pre-wrap", color: "#F0EBE3" }}>
            {renderText(msg.content)}
          </div>
          {(msg.type === "plan_week" || msg.type === "plan_day") && (
            <button onClick={() => setPanel(p => p === "plan" ? "chat" : "plan")} style={{ marginTop: 6, padding: "6px 14px", background: "#F9C23C22", border: "1px solid #F9C23C44", borderRadius: 8, color: "#F9C23C", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>
              {panel === "plan" ? "Hide plan ↑" : "View plan ↓"}
            </button>
          )}
        </div>
        {isUser && <div style={{ width: 30, height: 30, borderRadius: "50%", background: "#1C2E1C", border: "1px solid #2A4A2A", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, flexShrink: 0 }}>👤</div>}
      </div>
    );
  }

  // ── Key setup screen ──────────────────────────────────────────────
  if (!apiKey) return (
    <div style={{ minHeight: "100vh", background: "#080808", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: "'DM Sans',sans-serif" }}>
      <div style={{ maxWidth: 380, width: "100%" }}>
        <h1 style={{ margin: "0 0 8px", fontSize: 24, fontWeight: 700, color: "#F0EBE3" }}>🛒 Grocery Agent</h1>
        <p style={{ margin: "0 0 28px", fontSize: 13, color: "#555", lineHeight: 1.6 }}>Add your free Groq API key (gsk_...) from console.groq.com</p>
        <label style={{ fontSize: 11, color: "#555", letterSpacing: 2, textTransform: "uppercase", fontFamily: "'DM Mono',monospace", display: "block", marginBottom: 8 }}>API Key</label>
        <input
          type="password" placeholder="gsk_... (Groq — free) or AIza... (Gemini)"
          value={keyInput} onChange={e => setKeyInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && saveKey()}
          style={{ width: "100%", background: "#111", border: "1px solid #222", borderRadius: 10, padding: "12px 16px", color: "#F0EBE3", fontSize: 14, fontFamily: "'DM Mono',monospace", boxSizing: "border-box", outline: "none", marginBottom: 10 }}
        />
        <button onClick={saveKey} style={{ width: "100%", padding: 13, background: "#4CAF7D", border: "none", borderRadius: 10, color: "#000", fontWeight: 700, fontSize: 15, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>
          Let's Go →
        </button>
        <p style={{ margin: "16px 0 0", fontSize: 12, color: "#333", lineHeight: 1.6, textAlign: "center" }}>
          Get your key at <a href="https://console.anthropic.com" target="_blank" rel="noreferrer" style={{ color: "#4CAF7D" }}>console.anthropic.com</a>
        </p>
      </div>
    </div>
  );

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: "#080808", color: "#F0EBE3", fontFamily: "'DM Sans',sans-serif" }}>
      {/* Header */}
      <div style={{ padding: "16px 20px 14px", borderBottom: "1px solid #141414", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>🛒 Grocery Agent</h1>
          <p style={{ margin: "2px 0 0", fontSize: 11, color: "#444" }}>You + Vivek · Bengaluru · {TODAY_NAME} is {VEG_DAYS.includes(TODAY_NAME) ? "🥦 veg" : "🥩 non-veg"}</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {shoppingList.length > 0 && (
            <button onClick={() => setPanel(p => p === "plan" ? "chat" : "plan")} style={{ padding: "6px 12px", background: "#1A1A1A", border: "1px solid #252525", borderRadius: 8, color: "#888", fontSize: 12, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>
              {panel === "plan" ? "Chat" : "Plan"} ↕
            </button>
          )}
          <button onClick={() => { localStorage.removeItem("ga_apikey"); setApiKey(""); }} style={{ padding: "6px 10px", background: "#1A0A09", border: "1px solid #2A1510", borderRadius: 8, color: "#666", fontSize: 11, cursor: "pointer" }} title="Change API key">🔑</button>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 16px 0" }}>

        {/* Week plan panel */}
        {panel === "plan" && weekPlan && (
          <div style={{ background: "#0D0D0D", border: "1px solid #1A1A1A", borderRadius: 16, marginBottom: 16, overflow: "hidden" }}>
            <div style={{ display: "flex", borderBottom: "1px solid #1A1A1A", overflowX: "auto" }}>
              {DAYS.map(d => {
                const isVeg = VEG_DAYS.includes(d);
                const isActive = d === activeDay;
                const col = isVeg ? "#4CAF7D" : "#E8473F";
                return (
                  <button key={d} onClick={() => setActiveDay(d)} style={{ flex: 1, minWidth: 48, padding: "10px 4px", border: "none", background: isActive ? "#141414" : "transparent", cursor: "pointer", borderBottom: `2px solid ${isActive ? col : "transparent"}`, transition: "all 0.2s" }}>
                    <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: isActive ? col : "#444", fontFamily: "'DM Mono',monospace" }}>{d}</p>
                    <p style={{ margin: "2px 0 0", fontSize: 9, color: isVeg ? "#4CAF7D" : "#333" }}>{isVeg ? "veg" : "·"}</p>
                  </button>
                );
              })}
            </div>
            {(() => {
              const day = weekPlan.days?.find(d => d.day === activeDay);
              if (!day) return null;
              return (
                <div style={{ padding: "14px 16px" }}>
                  <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                    {[{ l: "Protein", v: `${day.totalProtein}g`, c: "#4CAF7D" }, { l: "Calories", v: day.totalCalories, c: "#F9C23C" }].map(s => (
                      <div key={s.l} style={{ flex: 1, background: "#111", borderRadius: 8, padding: "8px 10px", textAlign: "center" }}>
                        <p style={{ margin: 0, fontSize: 10, color: "#444" }}>{s.l}</p>
                        <p style={{ margin: "3px 0 0", fontSize: 14, fontWeight: 700, color: s.c, fontFamily: "'DM Mono',monospace" }}>{s.v}</p>
                      </div>
                    ))}
                  </div>
                  {Object.entries(day.meals).map(([name, meal]) => (
                    <div key={name} style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderBottom: "1px solid #141414" }}>
                      <div>
                        <p style={{ margin: 0, fontSize: 10, color: "#444", textTransform: "capitalize", letterSpacing: 1 }}>{name}</p>
                        <p style={{ margin: "3px 0 0", fontSize: 13, fontWeight: 600 }}>{meal.dish}</p>
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 10 }}>
                        <p style={{ margin: 0, fontSize: 12, color: "#4CAF7D", fontFamily: "'DM Mono',monospace" }}>{meal.protein}g</p>
                        <p style={{ margin: "2px 0 0", fontSize: 10, color: "#333" }}>⏱ {meal.prepTime}</p>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
            {shoppingList.length > 0 && (
              <div style={{ padding: "12px 16px", borderTop: "1px solid #1A1A1A" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <p style={{ margin: 0, fontSize: 11, color: "#555", letterSpacing: 2, textTransform: "uppercase", fontFamily: "'DM Mono',monospace" }}>Weekly Groceries</p>
                  <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: "#F9C23C", fontFamily: "'DM Mono',monospace" }}>{fmt(weekPlan.estimatedWeeklyCost)}</p>
                </div>
                {Object.entries(PLATFORMS).map(([pid, pconf]) => {
                  const items = shoppingList.filter(i => i.platform === pid);
                  if (!items.length) return null;
                  return (
                    <div key={pid} style={{ marginBottom: 10 }}>
                      <p style={{ margin: "0 0 5px", fontSize: 11, fontWeight: 700, color: pconf.color }}>{pconf.emoji} {pconf.label}</p>
                      {items.map((item, i) => (
                        <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 0", borderBottom: "1px solid #0F0F0F" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ fontSize: 12 }}>{item.item}</span>
                            <span style={{ fontSize: 11, color: "#444" }}>{item.qty}</span>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ fontSize: 12, color: pconf.color, fontFamily: "'DM Mono',monospace" }}>{fmt(item.estimatedPrice)}</span>
                            <a href={pconf.search(item.item)} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: pconf.color, textDecoration: "none", padding: "2px 8px", background: pconf.color + "22", borderRadius: 4 }}>Order →</a>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })}
                <button onClick={() => sendMessage("Email me the grocery list")} style={{ width: "100%", marginTop: 8, padding: 10, background: "#4CAF7D", border: "none", borderRadius: 10, color: "#000", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>
                  📧 Email Grocery List to Vivek
                </button>
              </div>
            )}
          </div>
        )}

        {/* Messages */}
        {messages.map((msg, i) => renderMsg(msg, i))}

        {/* Suggestions */}
        {messages.length <= 1 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16, marginLeft: 40 }}>
            {SUGGESTIONS.map((s, i) => (
              <button key={i} onClick={() => sendMessage(s.msg)} style={{ alignSelf: "flex-start", padding: "9px 16px", background: "#111", border: "1px solid #222", borderRadius: 20, color: "#888", fontSize: 13, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>
                {s.label}
              </button>
            ))}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Quick replies */}
      {messages.length > 2 && !loading && (
        <div style={{ padding: "10px 16px 0", display: "flex", gap: 6, overflowX: "auto" }}>
          {[
            shoppingList.length > 0 && { label: "📧 Email list", msg: "Email me the grocery list" },
            { label: "📅 Plan week", msg: "Plan my week Mon to Sat" },
            { label: `🍳 Today (${TODAY_NAME})`, msg: `Plan today's meals (${TODAY_NAME})` },
            weekPlan && { label: "💰 Save money", msg: "How can we reduce our grocery spend?" },
          ].filter(Boolean).map((s, i) => (
            <button key={i} onClick={() => sendMessage(s.msg)} style={{ flexShrink: 0, padding: "6px 12px", background: "#111", border: "1px solid #1E1E1E", borderRadius: 16, color: "#666", fontSize: 12, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", marginBottom: 6 }}>
              {s.label}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div style={{ padding: "10px 16px 20px", borderTop: "1px solid #141414", flexShrink: 0 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <input
            value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage(input)}
            placeholder="Ask anything — plan week, email list, recipe ideas..."
            style={{ flex: 1, background: "#111", border: "1px solid #222", borderRadius: 12, padding: "12px 16px", color: "#F0EBE3", fontSize: 14, fontFamily: "'DM Sans',sans-serif", outline: "none" }}
          />
          <button onClick={() => sendMessage(input)} disabled={loading || !input.trim()} style={{ width: 44, height: 44, background: loading || !input.trim() ? "#141414" : "#4CAF7D", border: "none", borderRadius: 12, color: loading || !input.trim() ? "#333" : "#000", fontSize: 20, cursor: loading || !input.trim() ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            {loading ? "⟳" : "↑"}
          </button>
        </div>
      </div>
    </div>
  );
}
