import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const GROQ_API_KEY = process.env.GROQ_API_KEY;

// This runs every Sunday at 8am IST via Vercel cron
export default async function handler(req, res) {
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Get last 2 weeks of meals to avoid repetition
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
    const { data: history } = await supabase
      .from('meal_plans')
      .select('planned_date, lunch, dinner')
      .gte('planned_date', twoWeeksAgo.toISOString().split('T')[0]);

    const recentMeals = (history || []).map(h => h.lunch).join(', ');

    // Generate week plan
    const prompt = `Generate a Mon-Sat meal plan for next week. 
Recent meals to AVOID repeating: ${recentMeals || 'none yet'}
Thursday must be veg day.
EVERY meal = 1 gravy + 1 dry sabzi + protein. Fish/dal days = rice both meals. Other days = rice lunch, roti dinner.
For each day give: breakfast (8 egg white bhurji + bread + smoothie), lunch (gravy+dry sabzi+protein+rice), evening snack, dinner (same as lunch + roti or rice for fish days).
Also give full weekly shopping list with quantities and platforms.
Respond in JSON: {"days": [{"date": "2026-05-25", "day": "Mon", "veg": false, "breakfast": "", "lunch": "", "evening": "", "dinner": "", "protein": 220}], "shoppingList": [{"item": "", "qty": "", "platform": "", "estimatedPrice": 0}], "estimatedWeeklyCost": 0}`;

    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GROQ_API_KEY}` },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    const groqData = await groqRes.json();
    const raw = groqData.choices?.[0]?.message?.content || '';
    const plan = JSON.parse(raw.replace(/```json|```/g, '').trim());

    // Save to DB
    for (const day of plan.days) {
      await supabase.from('meal_plans').upsert({
        planned_date: day.date,
        day_of_week: day.day,
        is_veg: day.veg,
        breakfast: day.breakfast,
        lunch: day.lunch,
        dinner: day.dinner,
        evening_snack: day.evening,
        total_protein: day.protein,
        confirmed: true,
      });
    }

    // Save shopping list
    const weekStart = plan.days[0]?.date;
    if (weekStart) {
      await supabase.from('shopping_items').delete().eq('week_start', weekStart);
      await supabase.from('shopping_items').insert(
        plan.shoppingList.map(item => ({ ...item, week_start: weekStart }))
      );
    }

    // Format email
    const emailBody = `
🍳 SOUS CHEF — WEEKLY MEAL PLAN
================================

${plan.days.map(d => `
📅 ${d.day} ${d.veg ? '🥦 VEG' : ''}
Breakfast: ${d.breakfast}
Lunch: ${d.lunch}
Evening: ${d.evening}
Dinner: ${d.dinner}
`).join('\n')}

🛒 SHOPPING LIST (Est. ₹${plan.estimatedWeeklyCost.toLocaleString('en-IN')})
================================
${['licious','blinkit','instamart','mango'].map(platform => {
  const items = plan.shoppingList.filter(i => i.platform === platform);
  if (!items.length) return '';
  const emoji = { licious: '🥩', blinkit: '💛', instamart: '🛍️', mango: '🏪' }[platform];
  return `\n${emoji} ${platform.toUpperCase()}\n${items.map(i => `  - ${i.item} (${i.qty}) — ₹${i.estimatedPrice}`).join('\n')}`;
}).join('')}

Have a great week! 💪
— Sous Chef Agent
    `;

    // Send via Gmail API (using nodemailer or resend)
    // For now log it — wire up email service after Supabase is connected
    console.log('Weekly plan generated:', emailBody);

    res.status(200).json({ success: true, plan });
  } catch (err) {
    console.error('Cron error:', err);
    res.status(500).json({ error: err.message });
  }
}
