import { useState, useRef, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const DAYS = ["Mon","Tue","Wed","Thu","Fri","Sat"];
const VEG_DAYS = ["Thu"];
const TODAY_IDX = Math.min(new Date().getDay() === 0 ? 6 : new Date().getDay() - 1, 5);
const TODAY_NAME = DAYS[TODAY_IDX] || "Mon";
const TODAY_LABEL = new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short" });
const DAY_OF_MONTH = new Date().getDate();
const isVegDay = VEG_DAYS.includes(TODAY_NAME);

const PLATFORMS = {
  licious:   { label: "Licious",   color: "#E8473F", emoji: "🥩", search: q => `https://www.licious.in/search?q=${encodeURIComponent(q)}` },
  blinkit:   { label: "Blinkit",   color: "#F9C23C", emoji: "💛", search: q => `https://blinkit.com/s/?q=${encodeURIComponent(q)}` },
  instamart: { label: "Instamart", color: "#FC8019", emoji: "🛍️", search: q => `https://www.swiggy.com/instamart/search?query=${encodeURIComponent(q)}` },
  mango:     { label: "Mango",     color: "#4CAF7D", emoji: "🏪", search: q => `https://www.google.com/search?q=mango+hypermarket+${encodeURIComponent(q)}` },
};

function fmt(n) { return "₹" + Number(n || 0).toLocaleString("en-IN"); }

const SUGGESTIONS = [
  { label: `🍳 Plan today (${TODAY_NAME})`, msg: `Plan today's meals for ${TODAY_NAME}` },
  { label: "📅 Plan my week", msg: "Plan my week Mon to Sat" },
  { label: "📧 Email grocery list", msg: "Email me the grocery list" },
  { label: "💰 How are we doing on budget?", msg: "How much have we spent this month?" },
];

export default function App() {
  const [messages, setMessages] = useState([{
    role: "assistant", type: "text",
    content: `Hey Supriya! 👋 I'm your Sous Chef agent.\n\nI remember what you've eaten, track your grocery spend, and plan meals so you never repeat the same combo twice.\n\n${isVegDay ? "🥦 Today is veg day!" : "🥩 Non-veg day today."} What do you need?`,
  }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [shoppingList, setShoppingList] = useState([]);
  const [monthExpenses, setMonthExpenses] = useState([]);
  const [totalMonth, setTotalMonth] = useState(0);
  const [showExpenses, setShowExpenses] = useState(false);
  const [newExp, setNewExp] = useState({ platform: "blinkit", amount: "", note: "" });
  const [checkedItems, setCheckedItems] = useState({});
  const bottomRef = useRef();

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  useEffect(() => { loadExpenses(); loadShoppingList(); }, []);

  async function loadExpenses() {
    const now = new Date();
    const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const { data } = await supabase
      .from("expenses")
      .select("*")
      .gte("expense_date", monthStr + "-01")
      .order("expense_date", { ascending: false });
    setMonthExpenses(data || []);
    setTotalMonth((data || []).reduce((a, b) => a + b.amount, 0));
  }

  async function loadShoppingList() {
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
    const weekStr = weekStart.toISOString().split("T")[0];
    const { data } = await supabase
      .from("shopping_items")
      .select("*")
      .gte("week_start", weekStr);
    if (data?.length) setShoppingList(data);
  }

  async function sendMessage(text) {
    if (!text.trim() || loading) return;

    // Handle email request locally
    if (/email|send|mail/i.test(text) && shoppingList.length > 0) {
      const body = Object.entries(PLATFORMS).map(([pid, p]) => {
        const items = shoppingList.filter(i => i.platform === pid);
        if (!items.length) return "";
        return `${p.emoji} ${p.label}:\n${items.map(i => `  - ${i.item} (${i.qty}) — ${fmt(i.estimated_price)}`).join("\n")}`;
      }).filter(Boolean).join("\n\n");
      const total = shoppingList.reduce((a, b) => a + (b.estimated_price || 0), 0);
      window.open(`mailto:?subject=${encodeURIComponent("🛒 Sous Chef — Weekly Grocery List")}&body=${encodeURIComponent(`Hi!\n\nThis week's grocery list:\n\n${body}\n\nEstimated total: ${fmt(total)}\n\n— Sous Chef 🍳`)}`);
      setMessages(prev => [...prev, { role: "user", type: "text", content: text }, {
        role: "assistant", type: "text",
        content: `📧 Opened your email app with the grocery list!\n\nEstimated total: **${fmt(total)}** across ${shoppingList.length} items.`,
      }]);
      setInput("");
      return;
    }

    const userMsg = { role: "user", type: "text", content: text };
    setMessages(prev => [...prev, userMsg, { role: "assistant", type: "typing" }]);
    setInput("");
    setLoading(true);

    try {
      const apiMessages = [...messages, userMsg]
        .filter(m => m.type !== "typing")
        .map(m => ({ role: m.role, content: m.content }));

      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: apiMessages }),
      });

      const data = await res.json();
      const { response, parsed } = data;

      setMessages(prev => prev.filter(m => m.type !== "typing"));

      if (parsed?.shoppingList) {
        setShoppingList(parsed.shoppingList);
        await loadExpenses();
        setMessages(prev => [...prev, {
          role: "assistant", type: "plan",
          content: response,
          shoppingList: parsed.shoppingList,
        }]);
      } else {
        setMessages(prev => [...prev, { role: "assistant", type: "text", content: response }]);
      }
    } catch (e) {
      setMessages(prev => [...prev.filter(m => m.type !== "typing"), {
        role: "assistant", type: "text", content: "Something went wrong. Try again!",
      }]);
    }
    setLoading(false);
  }

  async function addExpense() {
    if (!newExp.amount) return;
    const { data } = await supabase.from("expenses").insert({
      platform: newExp.platform,
      amount: parseInt(newExp.amount),
      note: newExp.note,
      expense_date: new Date().toISOString().split("T")[0],
    }).select();
    if (data) {
      setMonthExpenses(prev => [data[0], ...prev]);
      setTotalMonth(prev => prev + parseInt(newExp.amount));
    }
    setNewExp({ platform: "blinkit", amount: "", note: "" });
  }

  async function deleteExpense(id, amount) {
    await supabase.from("expenses").delete().eq("id", id);
    setMonthExpenses(prev => prev.filter(e => e.id !== id));
    setTotalMonth(prev => prev - amount);
  }

  function renderText(text) {
    return (text || "").split(/(\*\*[^*]+\*\*)/).map((p, i) =>
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
        <div style={{ maxWidth: "85%" }}>
          <div style={{ background: isUser ? "#1C2E1C" : "#141414", border: `1px solid ${isUser ? "#2A4A2A" : "#1E1E1E"}`, borderRadius: isUser ? "14px 4px 14px 14px" : "4px 14px 14px 14px", padding: "12px 16px", fontSize: 13, lineHeight: 1.7, whiteSpace: "pre-wrap", color: "#F0EBE3" }}>
            {renderText(msg.content)}
          </div>
          {/* Shopping list inline */}
          {msg.type === "plan" && msg.shoppingList?.length > 0 && (
            <div style={{ marginTop: 10, background: "#0D0D0D", border: "1px solid #1A1A1A", borderRadius: 12, overflow: "hidden" }}>
              <div style={{ padding: "10px 14px", borderBottom: "1px solid #1A1A1A", display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 11, color: "#555", letterSpacing: 2, textTransform: "uppercase", fontFamily: "monospace" }}>Shopping List</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#F9C23C", fontFamily: "monospace" }}>
                  {fmt(msg.shoppingList.reduce((a, b) => a + (b.estimatedPrice || b.estimated_price || 0), 0))}
                </span>
              </div>
              {Object.entries(PLATFORMS).map(([pid, pconf]) => {
                const items = msg.shoppingList.filter(it => it.platform === pid);
                if (!items.length) return null;
                return (
                  <div key={pid} style={{ padding: "10px 14px", borderBottom: "1px solid #111" }}>
                    <p style={{ margin: "0 0 6px", fontSize: 11, fontWeight: 700, color: pconf.color }}>{pconf.emoji} {pconf.label}</p>
                    {items.map((item, j) => (
                      <div key={j} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 0" }}>
                        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                          <input type="checkbox" checked={!!checkedItems[item.item]} onChange={() => setCheckedItems(c => ({ ...c, [item.item]: !c[item.item] }))} style={{ accentColor: pconf.color }} />
                          <span style={{ fontSize: 12, textDecoration: checkedItems[item.item] ? "line-through" : "none", color: checkedItems[item.item] ? "#444" : "#F0EBE3" }}>{item.item}</span>
                          <span style={{ fontSize: 11, color: "#444" }}>{item.qty}</span>
                        </div>
                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          <span style={{ fontSize: 11, color: pconf.color, fontFamily: "monospace" }}>{fmt(item.estimatedPrice || item.estimated_price)}</span>
                          <a href={pconf.search(item.item)} target="_blank" rel="noreferrer" style={{ fontSize: 10, color: pconf.color, textDecoration: "none", padding: "2px 6px", background: pconf.color + "22", borderRadius: 4 }}>Order →</a>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}
              <button onClick={() => sendMessage("Email me the grocery list")} style={{ width: "100%", padding: 10, background: "#4CAF7D", border: "none", color: "#000", fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>
                📧 Email to Vivek
              </button>
            </div>
          )}
        </div>
        {isUser && <div style={{ width: 30, height: 30, borderRadius: "50%", background: "#1C2E1C", border: "1px solid #2A4A2A", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, flexShrink: 0 }}>👤</div>}
      </div>
    );
  }

  const projected = DAY_OF_MONTH > 0 ? Math.round((totalMonth / DAY_OF_MONTH) * 31) : 0;

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: "#080808", color: "#F0EBE3", fontFamily: "'DM Sans',sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={{ padding: "16px 20px 12px", borderBottom: "1px solid #141414", flexShrink: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>🍳 Sous Chef</h1>
            <p style={{ margin: "2px 0 0", fontSize: 11, color: "#444" }}>Supriya + Vivek · Bengaluru · {TODAY_LABEL}</p>
          </div>
          <div style={{ textAlign: "right" }}>
            <span style={{ background: isVegDay ? "#0D1F12" : "#1A0A09", border: `1px solid ${isVegDay ? "#1E3323" : "#3A1510"}`, color: isVegDay ? "#4CAF7D" : "#E8473F", fontSize: 10, padding: "3px 8px", borderRadius: 20, fontWeight: 600 }}>
              {isVegDay ? "🥦 Veg Day" : "🥩 Non-Veg"}
            </span>
            <button onClick={() => setShowExpenses(!showExpenses)} style={{ display: "block", marginTop: 6, marginLeft: "auto", background: "none", border: "none", cursor: "pointer", textAlign: "right" }}>
              <p style={{ margin: 0, fontSize: 16, fontWeight: 700, fontFamily: "'DM Mono',monospace", color: totalMonth > 40000 ? "#E8473F" : "#F0EBE3" }}>{fmt(totalMonth)}</p>
              <p style={{ margin: "1px 0 0", fontSize: 9, color: "#444", fontFamily: "'DM Mono',monospace" }}>proj. {fmt(projected)} {showExpenses ? "↑" : "↓"}</p>
            </button>
          </div>
        </div>

        {/* Budget bar */}
        <div style={{ marginTop: 10, background: "#1A1A1A", borderRadius: 2, height: 3 }}>
          <div style={{ height: "100%", borderRadius: 2, width: `${Math.min((totalMonth / 40000) * 100, 100)}%`, background: totalMonth > 40000 ? "#E8473F" : totalMonth > 32000 ? "#F9C23C" : "#4CAF7D", transition: "width 0.5s" }} />
        </div>
      </div>

      {/* Expense panel */}
      {showExpenses && (
        <div style={{ background: "#0D0D0D", borderBottom: "1px solid #1A1A1A", padding: "12px 16px", maxHeight: 280, overflowY: "auto", flexShrink: 0 }}>
          {/* Platform breakdown */}
          <div style={{ display: "flex", gap: 6, marginBottom: 10, overflowX: "auto" }}>
            {Object.entries(PLATFORMS).map(([pid, pconf]) => {
              const amt = monthExpenses.filter(e => e.platform === pid).reduce((a, b) => a + b.amount, 0);
              if (!amt) return null;
              return (
                <div key={pid} style={{ flexShrink: 0, background: pconf.bg || "#111", border: `1px solid ${pconf.color}33`, borderRadius: 8, padding: "8px 10px", minWidth: 70 }}>
                  <p style={{ margin: 0, fontSize: 14 }}>{pconf.emoji}</p>
                  <p style={{ margin: "2px 0", fontSize: 12, fontWeight: 700, color: pconf.color, fontFamily: "'DM Mono',monospace" }}>{fmt(amt)}</p>
                  <p style={{ margin: 0, fontSize: 9, color: "#444" }}>{pconf.label}</p>
                </div>
              );
            })}
          </div>

          {/* Add expense */}
          <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
            <select value={newExp.platform} onChange={e => setNewExp(x => ({ ...x, platform: e.target.value }))} style={{ background: "#141414", border: "1px solid #222", borderRadius: 6, padding: "6px 8px", color: "#F0EBE3", fontSize: 12, fontFamily: "'DM Sans',sans-serif" }}>
              {Object.entries(PLATFORMS).map(([pid, p]) => <option key={pid} value={pid}>{p.emoji} {p.label}</option>)}
            </select>
            <input type="number" placeholder="₹ Amount" value={newExp.amount} onChange={e => setNewExp(x => ({ ...x, amount: e.target.value }))} style={{ flex: 1, background: "#141414", border: "1px solid #222", borderRadius: 6, padding: "6px 8px", color: "#F0EBE3", fontSize: 12, fontFamily: "'DM Mono',monospace", outline: "none" }} />
            <input placeholder="Note" value={newExp.note} onChange={e => setNewExp(x => ({ ...x, note: e.target.value }))} onKeyDown={e => e.key === "Enter" && addExpense()} style={{ flex: 1, background: "#141414", border: "1px solid #222", borderRadius: 6, padding: "6px 8px", color: "#F0EBE3", fontSize: 12, fontFamily: "'DM Sans',sans-serif", outline: "none" }} />
            <button onClick={addExpense} style={{ padding: "6px 12px", background: "#4CAF7D", border: "none", borderRadius: 6, color: "#000", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>+</button>
          </div>

          {/* Expense list */}
          {monthExpenses.slice(0, 8).map(exp => {
            const p = PLATFORMS[exp.platform] || PLATFORMS.blinkit;
            return (
              <div key={exp.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderBottom: "1px solid #111" }}>
                <span style={{ fontSize: 14 }}>{p.emoji}</span>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontSize: 12, fontWeight: 500 }}>{exp.note || p.label}</p>
                  <p style={{ margin: 0, fontSize: 10, color: "#444" }}>{new Date(exp.expense_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</p>
                </div>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: p.color, fontFamily: "'DM Mono',monospace" }}>{fmt(exp.amount)}</p>
                <button onClick={() => deleteExpense(exp.id, exp.amount)} style={{ background: "none", border: "none", color: "#2A2A2A", cursor: "pointer", fontSize: 14 }}>✕</button>
              </div>
            );
          })}
        </div>
      )}

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 16px 0" }}>
        {messages.map((msg, i) => renderMsg(msg, i))}
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
        <div style={{ padding: "8px 16px 0", display: "flex", gap: 6, overflowX: "auto", flexShrink: 0 }}>
          {[
            { label: `🍳 Plan today`, msg: `Plan today's meals for ${TODAY_NAME}` },
            { label: "📅 Plan week", msg: "Plan my week Mon to Sat" },
            shoppingList.length > 0 && { label: "📧 Email list", msg: "Email me the grocery list" },
            { label: "💰 Budget check", msg: "How much have we spent this month?" },
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
            placeholder="Ask anything — plan today, check budget, email list..."
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
