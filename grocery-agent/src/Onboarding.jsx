import { useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const ACTIVITY_LEVELS = [
  { value: "sedentary", label: "Sedentary", desc: "Little or no exercise" },
  { value: "light", label: "Light", desc: "1-3 days/week" },
  { value: "moderate", label: "Moderate", desc: "3-5 days/week" },
  { value: "active", label: "Active", desc: "6-7 days/week" },
  { value: "very_active", label: "Very Active", desc: "Intense daily training" },
];

const GOALS = [
  { value: "fat_loss", label: "Fat Loss", emoji: "🔥" },
  { value: "maintenance", label: "Maintenance", emoji: "⚖️" },
  { value: "muscle_gain", label: "Muscle Gain", emoji: "💪" },
];

function calculateMacros(age, weight, height, gender, activity, goal) {
  // Mifflin-St Jeor BMR
  let bmr = gender === "female"
    ? (10 * weight) + (6.25 * height) - (5 * age) - 161
    : (10 * weight) + (6.25 * height) - (5 * age) + 5;

  const activityMultipliers = {
    sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, very_active: 1.9
  };

  let tdee = Math.round(bmr * (activityMultipliers[activity] || 1.55));

  // Adjust for goal
  let calories = goal === "fat_loss" ? tdee - 400 : goal === "muscle_gain" ? tdee + 300 : tdee;

  // Protein: 2g per kg for active people
  let protein = Math.round(weight * 2);

  return { calories: Math.round(calories), protein, tdee: Math.round(tdee) };
}

export default function Onboarding({ onComplete }) {
  const [step, setStep] = useState(0);
  const [people, setPeople] = useState([
    { name: "Supriya", age: "", weight: "", height: "", gender: "female", activity: "active", goal: "fat_loss" },
    { name: "Vivek", age: "", weight: "", height: "", gender: "male", activity: "active", goal: "muscle_gain" },
  ]);
  const [saving, setSaving] = useState(false);

  function update(idx, field, value) {
    setPeople(prev => prev.map((p, i) => i === idx ? { ...p, [field]: value } : p));
  }

  async function save() {
    setSaving(true);
    for (const person of people) {
      const macros = calculateMacros(
        +person.age, +person.weight, +person.height,
        person.gender, person.activity, person.goal
      );
      await supabase.from('profiles').upsert({
        name: person.name,
        age: +person.age,
        weight_kg: +person.weight,
        height_cm: +person.height,
        gender: person.gender,
        activity_level: person.activity,
        goal: person.goal,
        protein_goal: macros.protein,
        calorie_goal: macros.calories,
      });
    }
    setSaving(false);
    onComplete(people.map(p => ({
      ...p,
      ...calculateMacros(+p.age, +p.weight, +p.height, p.gender, p.activity, p.goal)
    })));
  }

  const inp = {
    background: "#141414", border: "1px solid #222", borderRadius: 8,
    padding: "10px 14px", color: "#F0EBE3", fontSize: 14,
    fontFamily: "'DM Sans',sans-serif", outline: "none", width: "100%",
    boxSizing: "border-box", marginBottom: 12,
  };

  const person = people[step];
  const macros = person.age && person.weight && person.height
    ? calculateMacros(+person.age, +person.weight, +person.height, person.gender, person.activity, person.goal)
    : null;

  return (
    <div style={{ minHeight: "100vh", background: "#080808", color: "#F0EBE3", fontFamily: "'DM Sans',sans-serif", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />
      <div style={{ maxWidth: 420, width: "100%" }}>
        {/* Header */}
        <div style={{ marginBottom: 32, textAlign: "center" }}>
          <p style={{ fontSize: 36, margin: "0 0 8px" }}>🍳</p>
          <h1 style={{ margin: "0 0 6px", fontSize: 24, fontWeight: 700 }}>Sous Chef Setup</h1>
          <p style={{ margin: 0, fontSize: 13, color: "#555" }}>
            {step === 0 ? "Tell me about Supriya" : "Now tell me about Vivek"}
          </p>
          {/* Step dots */}
          <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 16 }}>
            {[0, 1].map(i => (
              <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: i === step ? "#4CAF7D" : "#222" }} />
            ))}
          </div>
        </div>

        {/* Form */}
        <div style={{ background: "#111", border: "1px solid #1E1E1E", borderRadius: 16, padding: 24 }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            {["female", "male"].map(g => (
              <button key={g} onClick={() => update(step, "gender", g)} style={{
                flex: 1, padding: "10px", borderRadius: 8, border: "none", cursor: "pointer",
                background: person.gender === g ? "#4CAF7D" : "#1A1A1A",
                color: person.gender === g ? "#000" : "#555",
                fontWeight: 600, fontSize: 13, fontFamily: "'DM Sans',sans-serif",
                textTransform: "capitalize",
              }}>{g === "female" ? "👩 Female" : "👨 Male"}</button>
            ))}
          </div>

          <input style={inp} placeholder="Age" type="number" value={person.age} onChange={e => update(step, "age", e.target.value)} />
          <div style={{ display: "flex", gap: 8 }}>
            <input style={{ ...inp, flex: 1 }} placeholder="Weight (kg)" type="number" value={person.weight} onChange={e => update(step, "weight", e.target.value)} />
            <input style={{ ...inp, flex: 1 }} placeholder="Height (cm)" type="number" value={person.height} onChange={e => update(step, "height", e.target.value)} />
          </div>

          <p style={{ margin: "4px 0 10px", fontSize: 11, color: "#555", letterSpacing: 2, textTransform: "uppercase", fontFamily: "'DM Mono',monospace" }}>Activity Level</p>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
            {ACTIVITY_LEVELS.map(a => (
              <button key={a.value} onClick={() => update(step, "activity", a.value)} style={{
                padding: "6px 12px", borderRadius: 20, border: "none", cursor: "pointer",
                background: person.activity === a.value ? "#F9C23C" : "#1A1A1A",
                color: person.activity === a.value ? "#000" : "#555",
                fontWeight: 600, fontSize: 12, fontFamily: "'DM Sans',sans-serif",
              }}>{a.label}</button>
            ))}
          </div>

          <p style={{ margin: "4px 0 10px", fontSize: 11, color: "#555", letterSpacing: 2, textTransform: "uppercase", fontFamily: "'DM Mono',monospace" }}>Goal</p>
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            {GOALS.map(g => (
              <button key={g.value} onClick={() => update(step, "goal", g.value)} style={{
                flex: 1, padding: "8px 4px", borderRadius: 10, border: "none", cursor: "pointer",
                background: person.goal === g.value ? "#E8473F22" : "#1A1A1A",
                border: person.goal === g.value ? "1px solid #E8473F55" : "1px solid transparent",
                color: person.goal === g.value ? "#E8473F" : "#555",
                fontWeight: 600, fontSize: 12, fontFamily: "'DM Sans',sans-serif",
              }}>{g.emoji} {g.label}</button>
            ))}
          </div>

          {/* Live macro preview */}
          {macros && (
            <div style={{ background: "#0D1F12", border: "1px solid #1E3323", borderRadius: 10, padding: "12px 14px", marginBottom: 16 }}>
              <p style={{ margin: "0 0 8px", fontSize: 10, color: "#4CAF7D", letterSpacing: 2, textTransform: "uppercase", fontFamily: "'DM Mono',monospace" }}>Your targets</p>
              <div style={{ display: "flex", gap: 16 }}>
                <div>
                  <p style={{ margin: 0, fontSize: 10, color: "#555" }}>Calories</p>
                  <p style={{ margin: "2px 0 0", fontSize: 20, fontWeight: 700, color: "#F9C23C", fontFamily: "'DM Mono',monospace" }}>{macros.calories}</p>
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: 10, color: "#555" }}>Protein</p>
                  <p style={{ margin: "2px 0 0", fontSize: 20, fontWeight: 700, color: "#4CAF7D", fontFamily: "'DM Mono',monospace" }}>{macros.protein}g</p>
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: 10, color: "#555" }}>TDEE</p>
                  <p style={{ margin: "2px 0 0", fontSize: 20, fontWeight: 700, color: "#888", fontFamily: "'DM Mono',monospace" }}>{macros.tdee}</p>
                </div>
              </div>
            </div>
          )}

          {step === 0 ? (
            <button onClick={() => setStep(1)} disabled={!person.age || !person.weight || !person.height} style={{
              width: "100%", padding: 14, background: (!person.age || !person.weight || !person.height) ? "#1A1A1A" : "#4CAF7D",
              border: "none", borderRadius: 12, color: (!person.age || !person.weight || !person.height) ? "#333" : "#000",
              fontWeight: 700, fontSize: 15, cursor: "pointer", fontFamily: "'DM Sans',sans-serif",
            }}>Next → Vivek's profile</button>
          ) : (
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setStep(0)} style={{ padding: "14px 20px", background: "#1A1A1A", border: "none", borderRadius: 12, color: "#666", fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>← Back</button>
              <button onClick={save} disabled={saving || !person.age || !person.weight || !person.height} style={{
                flex: 1, padding: 14, background: saving ? "#1A1A1A" : "#4CAF7D",
                border: "none", borderRadius: 12, color: saving ? "#333" : "#000",
                fontWeight: 700, fontSize: 15, cursor: "pointer", fontFamily: "'DM Sans',sans-serif",
              }}>{saving ? "Saving..." : "🚀 Let's Cook!"}</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
