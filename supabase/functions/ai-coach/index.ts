import Anthropic from 'npm:@anthropic-ai/sdk';
import { createClient } from 'npm:@supabase/supabase-js';

const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY')! });

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ── Constants ──────────────────────────────────────────────
const MAX_MESSAGE_LENGTH = 2000;
const VALID_ACTIONS = new Set(['chat', 'generate_plan']);
const RATE_LIMIT_PER_DAY = 50;
const FUNCTION_NAME = 'ai-coach';

// ── Types ──────────────────────────────────────────────────
interface CoachRequest {
  message: string;
  action?: 'chat' | 'generate_plan';
}

interface Profile {
  height_cm: number;
  current_weight: number;
  goal_weight: number;
  activity_level: string;
  dietary_pref: string[];
  city: string;
  display_name: string | null;
}

interface WeeklySummary {
  avg_water_ml: number;
  avg_steps: number;
  workouts_completed: number;
  weight_start: number | null;
  weight_end: number | null;
  avg_mood: number | null;
}

// ── Helper ─────────────────────────────────────────────────
function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// ── Handler ────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return jsonError('Unauthorized', 401);

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser(
    authHeader.replace('Bearer ', '')
  );
  if (authError || !user) return jsonError('Unauthorized', 401);

  // ── Input validation ──────────────────────────────────────
  let body: CoachRequest;
  try {
    body = await req.json();
  } catch {
    return jsonError('Invalid JSON body', 400);
  }

  if (typeof body.message !== 'string' || body.message.trim().length === 0) {
    return jsonError('message must be a non-empty string', 400);
  }
  if (body.message.length > MAX_MESSAGE_LENGTH) {
    return jsonError(`message must not exceed ${MAX_MESSAGE_LENGTH} characters`, 400);
  }
  if (body.action !== undefined && !VALID_ACTIONS.has(body.action)) {
    return jsonError('action must be one of: chat, generate_plan', 400);
  }

  // ── Rate limiting ─────────────────────────────────────────
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count: usageCount } = await supabase
    .from('ai_usage')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('function_name', FUNCTION_NAME)
    .gte('created_at', since24h);

  if ((usageCount ?? 0) >= RATE_LIMIT_PER_DAY) {
    return jsonError('Rate limit exceeded. Try again tomorrow.', 429);
  }

  // ── Fetch profile ─────────────────────────────────────────
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single() as { data: Profile | null };

  if (!profile) return jsonError('Profile not found', 404);

  // ── Fetch last 10 coach messages for context ──────────────
  const { data: history } = await supabase
    .from('coach_conversations')
    .select('role, content')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(10);

  const conversationHistory = (history ?? []).reverse();

  // ── Build 7-day summary ───────────────────────────────────
  const since = new Date();
  since.setDate(since.getDate() - 7);

  const { data: dailyData } = await supabase
    .from('daily_logs')
    .select('water_ml, steps, mood')
    .eq('user_id', user.id)
    .gte('log_date', since.toISOString().split('T')[0]);

  const { count: workoutsCompleted } = await supabase
    .from('workout_logs')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .gte('completed_at', since.toISOString());

  const { data: weightData } = await supabase
    .from('weight_logs')
    .select('weight_kg')
    .eq('user_id', user.id)
    .gte('logged_at', since.toISOString())
    .order('logged_at', { ascending: true });

  const summary: WeeklySummary = {
    avg_water_ml: dailyData?.length
      ? Math.round(dailyData.reduce((s, d) => s + (d.water_ml ?? 0), 0) / dailyData.length)
      : 0,
    avg_steps: dailyData?.length
      ? Math.round(dailyData.reduce((s, d) => s + (d.steps ?? 0), 0) / dailyData.length)
      : 0,
    workouts_completed: workoutsCompleted ?? 0,
    weight_start: weightData?.[0]?.weight_kg ?? null,
    weight_end: weightData?.[weightData.length - 1]?.weight_kg ?? null,
    avg_mood: dailyData?.filter((d) => d.mood).length
      ? parseFloat(
          (
            dailyData.filter((d) => d.mood).reduce((s, d) => s + d.mood, 0) /
            dailyData.filter((d) => d.mood).length
          ).toFixed(1)
        )
      : null,
  };

  const bmi = (profile.current_weight / ((profile.height_cm / 100) ** 2)).toFixed(1);
  const weightToGoal = (profile.current_weight - profile.goal_weight).toFixed(1);

  // ── System prompt — no hardcoded personal fallbacks ───────
  const systemPrompt = `You are Fitmu, a compassionate and direct weight loss coach for ${profile.display_name ?? 'the user'}.

## User Profile
- Height: ${profile.height_cm}cm | Current weight: ${profile.current_weight}kg | BMI: ${bmi}
- Goal weight: ${profile.goal_weight}kg (${weightToGoal}kg to go)
- Activity level: ${profile.activity_level}
- Dietary preferences: ${profile.dietary_pref.join(', ') || 'none specified'}
- City: ${profile.city}

## Last 7 Days Summary
- Avg water: ${summary.avg_water_ml}ml/day (target: 3000ml)
- Avg steps: ${summary.avg_steps.toLocaleString()}/day
- Workouts completed: ${summary.workouts_completed}
- Weight: ${summary.weight_start ?? '?'}kg → ${summary.weight_end ?? '?'}kg
- Avg mood: ${summary.avg_mood ?? 'not tracked'}/5

## Coaching Rules (STRICT)
- NEVER shame about weight, slow progress, or missed days
- Do NOT enforce calorie counting — focus on food quality and habit building
- Keep workout suggestions at absolute beginner level (no jumping, no burpees)
- All food suggestions must be Malaysia-relevant (mamak, warung, kopitiam context)
- Respond in English. Occasional Malay phrases (boleh, okay la, jangan risau) are warm and appropriate
- Celebrate non-scale victories: energy, mood, consistency, mobility
- Safe weight loss rate: 0.5–1.0 kg/week maximum

## Response Format — ALWAYS return valid JSON
{
  "reply": "<your coaching response, 2-4 sentences, warm and direct>",
  "action_type": "chat|plan_update|motivation|progress_review",
  "weekly_plan": null,
  "suggested_next_action": "<one specific action for today>"
}

For generate_plan action, weekly_plan must be:
{
  "week_theme": "<motivational theme>",
  "days": [
    {
      "day": "Monday",
      "workout": {"name": "...", "duration_min": 15, "exercises": [{"name":"...","duration_sec":40,"rest_sec":30,"notes":"..."}]},
      "meal_focus": "<simple guidance>",
      "daily_habit": "<one small habit>",
      "water_target_ml": 3000
    }
  ],
  "coach_note": "<encouraging paragraph>"
}`;

  const messages: Anthropic.MessageParam[] = [
    ...conversationHistory.map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
    { role: 'user', content: body.message },
  ];

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: body.action === 'generate_plan' ? 2048 : 1024,
    temperature: 0.5,
    system: [
      {
        type: 'text',
        text: systemPrompt,
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages,
  });

  const rawText = response.content[0].type === 'text' ? response.content[0].text : '{}';
  let parsed;
  try {
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    parsed = jsonMatch
      ? JSON.parse(jsonMatch[0])
      : { reply: rawText, action_type: 'chat', weekly_plan: null, suggested_next_action: '' };
  } catch {
    parsed = { reply: rawText, action_type: 'chat', weekly_plan: null, suggested_next_action: '' };
  }

  const totalTokens = response.usage.input_tokens + response.usage.output_tokens;

  // ── Record usage before writing conversation ──────────────
  await supabase.from('ai_usage').insert({
    user_id: user.id,
    function_name: FUNCTION_NAME,
  });

  // ── Save conversation ─────────────────────────────────────
  await supabase.from('coach_conversations').insert({
    user_id: user.id,
    role: 'user',
    content: body.message,
    model_used: 'claude-sonnet-4-6',
  });

  await supabase.from('coach_conversations').insert({
    user_id: user.id,
    role: 'assistant',
    content: parsed.reply,
    tokens_used: totalTokens,
    model_used: 'claude-sonnet-4-6',
  });

  // ── Upsert weekly plan if returned ────────────────────────
  if (parsed.weekly_plan) {
    const monday = getMonday(new Date());
    await supabase.from('weekly_plans').upsert({
      user_id: user.id,
      week_start: monday,
      plan_json: parsed.weekly_plan,
      generated_at: new Date().toISOString(),
    });
  }

  return new Response(JSON.stringify(parsed), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});

function getMonday(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().split('T')[0];
}
