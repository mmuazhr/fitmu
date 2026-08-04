import Anthropic from 'npm:@anthropic-ai/sdk';
import { createClient } from 'npm:@supabase/supabase-js';

const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY')! });

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MAX_MEAL_COUNT = 5;
const RATE_LIMIT_PER_DAY = 30;
const FUNCTION_NAME = 'ai-meals';

const VALID_MODES = new Set(['cook', 'nearby', 'takeaway']);
const VALID_CONTEXTS = new Set(['breakfast', 'lunch', 'dinner', 'snack', 'any']);

interface MealRequest {
  mode: 'cook' | 'nearby' | 'takeaway';
  context: 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'any';
  city?: string;
  dietary_prefs?: string[];
  count?: number;
}

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

  // ── Input validation ──────────────────────────────────────
  let body: MealRequest;
  try {
    body = await req.json();
  } catch {
    return jsonError('Invalid JSON body', 400);
  }

  if (!VALID_MODES.has(body.mode)) {
    return jsonError('mode must be one of: cook, nearby, takeaway', 400);
  }
  if (body.context !== undefined && !VALID_CONTEXTS.has(body.context)) {
    return jsonError('context must be one of: breakfast, lunch, dinner, snack, any', 400);
  }

  const {
    mode,
    context = 'any',
    city = 'Kuala Lumpur',
    dietary_prefs = ['halal'],
    count: rawCount = 3,
  } = body;

  // Cap count server-side regardless of what the client sends
  const count = Math.min(typeof rawCount === 'number' ? rawCount : 3, MAX_MEAL_COUNT);

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

  const modeInstructions: Record<string, string> = {
    cook: 'Simple recipes they can cook at home in under 30 minutes with common Malaysian ingredients.',
    nearby: `Food stalls, kedai mamak, warung, kopitiam, or restaurants near ${city}. Realistic options a Malaysian would find.`,
    takeaway: 'Food they can order via Grab Food, Food Panda, or call for delivery in Malaysia. Name specific chains or dish types available in MY.',
  };

  const prompt = `Suggest ${count} ${context === 'any' ? '' : context + ' '}meal options for a Malaysian adult trying to lose weight.
Mode: ${mode} — ${modeInstructions[mode]}
Dietary requirements: ${dietary_prefs.join(', ')}.

Rules:
- All suggestions must be Malaysia-realistic and halal-friendly
- Never include calorie numbers — use descriptors like "light", "protein-rich", "filling"
- Suggest the healthier choice within Malaysian cuisine (e.g. steamed vs fried, kurang manis, kuah version over goreng)
- For nearby/takeaway: be specific about what to order (e.g. "nasi campur with ikan bakar, skip the fried chicken, add extra sayur")
- Do not suggest completely foreign cuisines unless they're common in Malaysia (e.g. Korean rice bowls are fine)

Return ONLY valid JSON (no markdown):
{
  "suggestions": [
    {
      "name": "dish name",
      "type": "${mode}",
      "description": "2 sentences max",
      "why_good": "1 sentence why this helps their goal",
      "prep_or_order": "specific action: Cook in 20 min / Order at mamak: ask for... / Grab Food: search for...",
      "estimated_satisfaction": "filling|light|moderate"
    }
  ]
}`;

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 512,
    temperature: 0.7,
    messages: [{ role: 'user', content: prompt }],
  });

  const rawText = response.content[0].type === 'text' ? response.content[0].text : '{}';
  let result;
  try {
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    result = jsonMatch ? JSON.parse(jsonMatch[0]) : { suggestions: [] };
  } catch {
    return new Response(JSON.stringify({ error: 'Parse failed', raw: rawText }), {
      status: 500,
      headers: corsHeaders,
    });
  }

  if (result.suggestions?.length) {
    // Record usage
    await supabase.from('ai_usage').insert({
      user_id: user.id,
      function_name: FUNCTION_NAME,
    });

    // Cache suggestions in DB
    await supabase.from('meal_suggestions').insert({
      user_id: user.id,
      mode,
      context,
      suggestion: result,
    });
  }

  return new Response(JSON.stringify(result), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
