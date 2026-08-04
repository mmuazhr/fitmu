export interface Profile {
  id: string;
  display_name: string | null;
  height_cm: number;
  current_weight: number;
  goal_weight: number;
  activity_level: 'sedentary' | 'light' | 'moderate' | 'active';
  dietary_pref: string[];
  city: string;
  created_at: string;
  updated_at: string;
}

export interface WeightLog {
  id: string;
  user_id: string;
  weight_kg: number;
  logged_at: string;
  note: string | null;
  source: 'manual' | 'watch';
}

export interface DailyLog {
  id: string;
  user_id: string;
  log_date: string;
  water_ml: number;
  steps: number;
  calories_burned: number;
  active_minutes: number;
  standing_hours: number;
  mood: number | null;
  energy_level: number | null;
}

export interface MealLog {
  id: string;
  user_id: string;
  log_date: string;
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  description: string;
  source: 'manual' | 'ai_suggestion' | 'nearby';
  eaten_at: string;
}

export interface CoachMessage {
  id: string;
  user_id: string;
  role: 'user' | 'assistant';
  content: string;
  tokens_used: number | null;
  model_used: string | null;
  created_at: string;
}

export interface WeeklyPlan {
  id: string;
  user_id: string;
  week_start: string;
  plan_json: WeeklyPlanData;
  generated_at: string;
}

export interface WeeklyPlanData {
  week_theme: string;
  days: DayPlan[];
  coach_note: string;
}

export interface DayPlan {
  day: string;
  workout: {
    name: string;
    duration_min: number;
    exercises: Exercise[];
  };
  meal_focus: string;
  daily_habit: string;
  water_target_ml: number;
}

export interface Exercise {
  name: string;
  duration_sec?: number;
  sets?: number;
  reps?: number;
  rest_sec: number;
  notes: string;
}

export interface WorkoutTemplate {
  id: string;
  name: string;
  type: 'home' | 'gym' | 'random_easy';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  duration_min: number;
  exercises: Exercise[];
  tags: string[];
  is_ai_gen: boolean;
  user_id?: string | null;
}

export interface MealSuggestion {
  name: string;
  type: 'cook' | 'nearby' | 'takeaway';
  description: string;
  why_good: string;
  prep_or_order: string;
  estimated_satisfaction: 'filling' | 'light' | 'moderate';
}

export interface CoachResponse {
  reply: string;
  action_type: 'chat' | 'plan_update' | 'motivation' | 'progress_review';
  weekly_plan: WeeklyPlanData | null;
  suggested_next_action: string;
}
