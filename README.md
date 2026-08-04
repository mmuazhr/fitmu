# fitmu — Personal Weight Loss App

iPhone + Apple Watch companion for your weight loss journey. Malaysian food context, AI coaching via Claude, no calorie obsession.

---

## Setup (Step by Step)

### 1. Prerequisites

```bash
# Node.js (check)
node --version  # should be v18+

# Xcode — install from App Store, then:
xcode-select --install

# CocoaPods
sudo gem install cocoapods
```

### 2. Supabase Project

1. Go to [supabase.com](https://supabase.com) → New Project → name it `fitmu`
2. Copy your Project URL and anon key from Settings → API
3. In SQL Editor, run each migration file in order:
   - `supabase/migrations/001_init_schema.sql`
   - `supabase/migrations/002_workouts.sql`
   - `supabase/migrations/003_meals.sql`
4. Deploy Edge Functions (needs Supabase CLI + Docker):
   ```bash
   cd fitmu
   supabase login
   supabase link --project-ref YOUR_PROJECT_REF
   supabase secrets set ANTHROPIC_API_KEY=sk-ant-YOUR_KEY
   supabase functions deploy ai-coach
   supabase functions deploy ai-workout
   supabase functions deploy ai-meals
   ```
5. In Supabase Dashboard → Auth → URL Configuration:
   - Site URL: `fitmu://localhost`
   - Add redirect URL: `fitmu://localhost`

### 3. Mobile App

```bash
cd fitmu/mobile

# Copy and fill in your keys
cp .env.example .env
# Edit .env: set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY

# Install iOS pods
npx expo install
cd ios && pod install && cd ..

# Run on iPhone Simulator
npx expo start --ios

# Or run on real iPhone (sign in to Apple account in Xcode first)
npx expo run:ios --device
```

### 4. Getting Your Anthropic API Key

1. Go to [console.anthropic.com](https://console.anthropic.com)
2. API Keys → Create Key
3. Set via `supabase secrets set ANTHROPIC_API_KEY=sk-ant-...`

---

## Project Structure

```
fitmu/
├── mobile/          # Expo React Native iPhone app
│   ├── app/         # Screens (Expo Router file-based)
│   ├── components/  # UI components
│   ├── hooks/       # Data fetching hooks
│   ├── lib/         # Supabase, HealthKit, notifications
│   ├── store/       # Zustand global state
│   └── types/       # TypeScript types
├── supabase/
│   ├── migrations/  # Database schema (run in order)
│   └── functions/   # Edge Functions (AI calls)
└── watch/           # WatchKit app (Phase 4, build in Xcode)
```

---

## AI Cost Estimate (~personal use)

| Feature | Model | ~Cost/month |
|---|---|---|
| Coach chat (3 msg/day) | Sonnet | ~$3.50 |
| Weekly plan (1/week) | Sonnet | ~$0.50 |
| Meal suggestions (3/day) | Haiku | ~$0.30 |
| Random workouts (1/day) | Haiku | ~$0.05 |
| **Total** | | **~$4.35** |

---

## Health Disclaimer

fitmu is not a medical device. For individuals with BMI >40 or existing health conditions, consult a doctor or registered dietitian before starting any diet or exercise program. See `docs/health-research.md` for evidence-based sources used in app design.
