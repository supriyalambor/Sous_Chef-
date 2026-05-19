-- ── Sous Chef Database Schema ─────────────────────────────────────

-- Meal plans table — stores every planned day
create table meal_plans (
  id uuid default gen_random_uuid() primary key,
  planned_date date not null,
  day_of_week text not null,
  is_veg boolean default false,
  breakfast text,
  lunch text,
  dinner text,
  evening_snack text,
  total_protein integer,
  total_calories integer,
  confirmed boolean default false,
  created_at timestamp with time zone default now()
);

-- Shopping list table — linked to a meal plan week
create table shopping_items (
  id uuid default gen_random_uuid() primary key,
  week_start date not null,
  item text not null,
  qty text not null,
  platform text not null,
  estimated_price integer,
  purchased boolean default false,
  created_at timestamp with time zone default now()
);

-- Expenses table — actual spend logged
create table expenses (
  id uuid default gen_random_uuid() primary key,
  platform text not null,
  amount integer not null,
  note text,
  expense_date date default current_date,
  created_at timestamp with time zone default now()
);

-- Preferences table — user settings
create table preferences (
  id uuid default gen_random_uuid() primary key,
  key text unique not null,
  value text not null,
  updated_at timestamp with time zone default now()
);

-- Seed default preferences
insert into preferences (key, value) values
  ('protein_goal', '220'),
  ('weekly_budget', '9000'),
  ('monthly_budget', '38000'),
  ('veg_days', 'Thu'),
  ('people', 'Supriya,Vivek');

-- ── Indexes ────────────────────────────────────────────────────────
create index idx_meal_plans_date on meal_plans(planned_date);
create index idx_expenses_date on expenses(expense_date);
create index idx_shopping_week on shopping_items(week_start);

-- ── Row Level Security (open for single user app) ──────────────────
alter table meal_plans enable row level security;
alter table shopping_items enable row level security;
alter table expenses enable row level security;
alter table preferences enable row level security;

create policy "Allow all" on meal_plans for all using (true);
create policy "Allow all" on shopping_items for all using (true);
create policy "Allow all" on expenses for all using (true);
create policy "Allow all" on preferences for all using (true);
