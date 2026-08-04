import Anthropic from 'npm:@anthropic-ai/sdk';
import { createClient } from 'npm:@supabase/supabase-js';

const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY')! });

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const RATE_LIMIT_PER_DAY = 20;
const FUNCTION_NAME = 'ai-workout';

function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

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

  const { data: profile } = await supabase
    .from('profiles')
    .select('height_cm, current_weight')
    .eq('id', user.id)
    .single();

  const prompt = `Generate ONE easy 10-15 minute workout for an absolute beginner.
User stats: ${profile?.height_cm ?? 170}cm, ${profile?.current_weight ?? 80}kg.
No equipment required. Suitable for someone who hasn't exercised in months.
Focus on movement and habit building — NOT intensity.
STRICTLY avoid: jumping, burpees, running, anything high-impact.
Exercises must be doable with any body size.

Return ONLY valid JSON (no markdown):
{
  "name": "workout name",
  "duration_min": 12,
  "vibe": "fun tagline e.g. The Lazy Monday Mover",
  "exercises": [
    {"name": "...", "duration_sec": 40, "rest_sec": 30, "notes": "brief form cue"}
  ],
  "encouragement": "one short motivating line"
}`;

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 512,
    temperature: 0.8,
    messages: [{ role: 'user', content: prompt }],
  });

  const rawText = response.content[0].type === 'text' ? response.content[0].text : '{}';
  let workout;
  try {
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    workout = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
  } catch {
    return new Response(JSON.stringify({ error: 'Parse failed', raw: rawText }), {
      status: 500,
      headers: corsHeaders,
    });
  }

  if (workout) {
    // Record usage
    await supabase.from('ai_usage').insert({
      user_id: user.id,
      function_name: FUNCTION_NAME,
    });

    // Save to workout_templates scoped to the caller
    await supabase.from('workout_templates').insert({
      name: workout.name,
      type: 'random_easy',
      difficulty: 'beginner',
      duration_min: workout.duration_min,
      exercises: workout.exercises,
      tags: ['ai_generated', 'no_equipment', 'beginner'],
      is_ai_gen: true,
      user_id: user.id,
    });
  }

  return new Response(JSON.stringify(workout), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
