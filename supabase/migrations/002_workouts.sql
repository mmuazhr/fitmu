-- ============================================================
-- fitmu: workouts schema + seed data
-- ============================================================

CREATE TABLE IF NOT EXISTS workout_templates (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  type         TEXT NOT NULL CHECK (type IN ('home', 'gym', 'random_easy')),
  difficulty   TEXT NOT NULL DEFAULT 'beginner'
               CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  duration_min INTEGER NOT NULL,
  exercises    JSONB NOT NULL DEFAULT '[]',
  tags         TEXT[] NOT NULL DEFAULT '{}',
  is_ai_gen    BOOLEAN NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS workout_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  template_id     UUID REFERENCES workout_templates(id),
  completed_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  duration_actual INTEGER,
  notes           TEXT,
  source          TEXT NOT NULL DEFAULT 'manual'
);

CREATE INDEX IF NOT EXISTS idx_workout_logs_user ON workout_logs (user_id, completed_at DESC);

ALTER TABLE workout_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workout_logs_own" ON workout_logs
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ============================================================
-- Seed: 10 Home Workouts (beginner, no equipment, low-impact)
-- ============================================================
INSERT INTO workout_templates (name, type, difficulty, duration_min, exercises, tags) VALUES

('Morning Mover', 'home', 'beginner', 12,
 '[
   {"name":"March in Place","duration_sec":60,"rest_sec":30,"notes":"Lift knees gently, swing arms"},
   {"name":"Wall Push-Up","duration_sec":40,"rest_sec":30,"notes":"Hands shoulder-width on wall, lean in and push back"},
   {"name":"Seated Leg Raise","duration_sec":40,"rest_sec":30,"notes":"Sit on chair, straighten one leg, hold 2 sec, alternate"},
   {"name":"Standing Side Bend","duration_sec":40,"rest_sec":20,"notes":"Reach one arm over head, lean slowly to side"},
   {"name":"Gentle Neck Roll","duration_sec":30,"rest_sec":20,"notes":"Slow circles, do not force range"},
   {"name":"March in Place (cooldown)","duration_sec":60,"rest_sec":0,"notes":"Slow down gradually"}
 ]',
 ARRAY['no_equipment','morning','low_impact','beginner']),

('The Chair Champion', 'home', 'beginner', 15,
 '[
   {"name":"Seated March","duration_sec":60,"rest_sec":30,"notes":"March while seated, drive knees up"},
   {"name":"Chair Squat (stand & sit)","duration_sec":50,"rest_sec":40,"notes":"Lower onto chair slowly, stand back up. Use armrests if needed."},
   {"name":"Seated Arm Circles","duration_sec":40,"rest_sec":20,"notes":"Small to large circles, both directions"},
   {"name":"Seated Torso Twist","duration_sec":40,"rest_sec":30,"notes":"Hands on shoulders, rotate torso left-right gently"},
   {"name":"Chair Squat","duration_sec":50,"rest_sec":40,"notes":"Second set"},
   {"name":"Deep Breathing","duration_sec":60,"rest_sec":0,"notes":"In through nose 4 counts, out through mouth 6 counts"}
 ]',
 ARRAY['chair','no_equipment','low_impact','beginner']),

('Living Room Loop', 'home', 'beginner', 15,
 '[
   {"name":"Walk Around Room","duration_sec":90,"rest_sec":30,"notes":"Casual pace, pick up feet fully"},
   {"name":"Wall Sit","duration_sec":30,"rest_sec":45,"notes":"Back flat against wall, lower until comfortable. Not to floor."},
   {"name":"Shoulder Roll","duration_sec":30,"rest_sec":20,"notes":"Forward 10x, backward 10x"},
   {"name":"Calf Raise (hold wall)","duration_sec":40,"rest_sec":30,"notes":"Rise onto toes slowly, lower slowly"},
   {"name":"Walk Around Room","duration_sec":90,"rest_sec":30,"notes":"Slightly faster pace"},
   {"name":"Seated Stretch","duration_sec":60,"rest_sec":0,"notes":"Sit and reach for toes or shins. Hold 10 sec."}
 ]',
 ARRAY['no_equipment','low_impact','beginner','cardio']),

('Core Starter', 'home', 'beginner', 12,
 '[
   {"name":"Belly Breathing","duration_sec":60,"rest_sec":20,"notes":"Breathe into belly, feel abs expand. Foundation of core work."},
   {"name":"Pelvic Tilt","duration_sec":40,"rest_sec":30,"notes":"Lie on back, flatten lower back to floor by tightening abs"},
   {"name":"Dead Bug (modified)","duration_sec":40,"rest_sec":30,"notes":"Lie on back, raise one arm overhead while straightening opposite leg. Alternate."},
   {"name":"Bird Dog (kneeling)","duration_sec":40,"rest_sec":30,"notes":"On hands and knees, extend one arm and opposite leg. Hold 3 sec."},
   {"name":"Side-Lying Leg Raise","duration_sec":40,"rest_sec":30,"notes":"Lie on side, raise top leg 30cm, lower slowly"},
   {"name":"Belly Breathing (cooldown)","duration_sec":60,"rest_sec":0,"notes":"Return to relaxed breathing"}
 ]',
 ARRAY['core','no_equipment','floor','beginner']),

('Doorway Stretch Session', 'home', 'beginner', 10,
 '[
   {"name":"Doorway Chest Stretch","duration_sec":45,"rest_sec":20,"notes":"Forearms on door frame, lean gently forward"},
   {"name":"Standing Quad Stretch","duration_sec":40,"rest_sec":20,"notes":"Hold door frame, pull one ankle toward glute. Hold 20 sec each leg."},
   {"name":"Hip Flexor Stretch","duration_sec":45,"rest_sec":20,"notes":"Step one leg back into lunge, keep back knee off floor. Hold."},
   {"name":"Hamstring Wall Stretch","duration_sec":40,"rest_sec":20,"notes":"Lie near wall, extend one leg up wall. Hold 20 sec."},
   {"name":"Upper Back Stretch","duration_sec":40,"rest_sec":20,"notes":"Interlace fingers, push palms forward, round upper back"},
   {"name":"Neck Side Stretch","duration_sec":30,"rest_sec":0,"notes":"Ear to shoulder gently. Hold 15 sec each side."}
 ]',
 ARRAY['stretching','flexibility','no_equipment','beginner','recovery']),

('Staircase Starter', 'home', 'beginner', 12,
 '[
   {"name":"Step Touch Side to Side","duration_sec":60,"rest_sec":30,"notes":"Step right, bring left foot in. Repeat other side. Keep moving."},
   {"name":"Stair Step-Up (1 step)","duration_sec":50,"rest_sec":40,"notes":"Step up with right foot, bring left up, step down. 10 reps each lead."},
   {"name":"March in Place","duration_sec":60,"rest_sec":30,"notes":"Active recovery between sets"},
   {"name":"Stair Step-Up","duration_sec":50,"rest_sec":40,"notes":"Second set, switch lead foot"},
   {"name":"Step Touch","duration_sec":60,"rest_sec":30,"notes":"Cool down pace"},
   {"name":"Calf Stretch on Step","duration_sec":40,"rest_sec":0,"notes":"Heel off edge, hold 20 sec each leg"}
 ]',
 ARRAY['stairs','low_impact','cardio','beginner']),

('Gentle Yoga Flow', 'home', 'beginner', 15,
 '[
   {"name":"Child''s Pose","duration_sec":60,"rest_sec":10,"notes":"Kneel and reach arms forward, forehead to floor or cushion"},
   {"name":"Cat-Cow","duration_sec":60,"rest_sec":20,"notes":"On hands and knees, arch and round spine slowly with breath"},
   {"name":"Seated Forward Fold","duration_sec":45,"rest_sec":20,"notes":"Legs extended, reach toward feet. Stop where comfortable."},
   {"name":"Supine Knee Hug","duration_sec":45,"rest_sec":20,"notes":"Lie on back, pull both knees to chest, rock gently"},
   {"name":"Legs Up the Wall","duration_sec":90,"rest_sec":20,"notes":"Lie near wall, rest legs straight up. Relaxing."},
   {"name":"Savasana","duration_sec":60,"rest_sec":0,"notes":"Lie flat, arms at sides, breathe naturally"}
 ]',
 ARRAY['yoga','stretching','no_equipment','beginner','evening','recovery']),

('Posture Power', 'home', 'beginner', 12,
 '[
   {"name":"Wall Angel","duration_sec":40,"rest_sec":30,"notes":"Back and arms flat on wall, slide arms up and down like snow angel"},
   {"name":"Chin Tuck","duration_sec":30,"rest_sec":20,"notes":"Standing, gently pull chin straight back (not down). 10 reps."},
   {"name":"Shoulder Blade Squeeze","duration_sec":40,"rest_sec":20,"notes":"Squeeze shoulder blades together, hold 5 sec, release. 10 reps."},
   {"name":"Hip Hinge","duration_sec":40,"rest_sec":30,"notes":"Stand, push hips back (not bend knees), keep back straight. 12 reps."},
   {"name":"Wall Angel","duration_sec":40,"rest_sec":30,"notes":"Second set"},
   {"name":"Standing Tall","duration_sec":60,"rest_sec":0,"notes":"Stand with feet hip-width, stack head over shoulders over hips. Breathe."}
 ]',
 ARRAY['posture','no_equipment','beginner','back_health']),

('Evening Wind-Down', 'home', 'beginner', 10,
 '[
   {"name":"Neck Roll","duration_sec":40,"rest_sec":20,"notes":"Very slow circles, drop ear to shoulder"},
   {"name":"Shoulder & Chest Open","duration_sec":40,"rest_sec":20,"notes":"Clasp hands behind back, open chest, look slightly up"},
   {"name":"Seated Spinal Twist","duration_sec":45,"rest_sec":20,"notes":"Sit cross-legged, hand on opposite knee, twist and breathe"},
   {"name":"Supine Hip Opener","duration_sec":50,"rest_sec":20,"notes":"Lie on back, ankle on opposite knee (figure 4), pull gently toward chest"},
   {"name":"Progressive Relaxation","duration_sec":60,"rest_sec":10,"notes":"Tense then relax each muscle group from feet upward"},
   {"name":"Box Breathing","duration_sec":60,"rest_sec":0,"notes":"In 4 counts, hold 4, out 4, hold 4. Calm nervous system."}
 ]',
 ARRAY['evening','recovery','stretching','beginner','sleep']),

('The 10-Minute Activator', 'home', 'beginner', 10,
 '[
   {"name":"March in Place","duration_sec":60,"rest_sec":20,"notes":"Warm up, medium pace"},
   {"name":"Wall Push-Up","duration_sec":40,"rest_sec":30,"notes":"10-12 reps"},
   {"name":"Chair Squat","duration_sec":40,"rest_sec":30,"notes":"8-10 reps, controlled descent"},
   {"name":"Lateral Step Touch","duration_sec":50,"rest_sec":30,"notes":"Side to side, wide stance"},
   {"name":"Overhead Reach","duration_sec":30,"rest_sec":20,"notes":"Both arms, reach and stretch, alternate"},
   {"name":"March (cooldown)","duration_sec":60,"rest_sec":0,"notes":"Slow down, deep breaths"}
 ]',
 ARRAY['no_equipment','beginner','quick','full_body']);

-- ============================================================
-- Seed: 10 Gym Workouts (beginner, machine-based, low-impact)
-- ============================================================
INSERT INTO workout_templates (name, type, difficulty, duration_min, exercises, tags) VALUES

('Machine Circuit Starter', 'gym', 'beginner', 25,
 '[
   {"name":"Treadmill Walk","duration_sec":300,"rest_sec":60,"notes":"5 min warm-up walk, 3.5-4.5 km/h, flat"},
   {"name":"Leg Press (machine)","sets":3,"reps":12,"rest_sec":60,"notes":"Light weight, push through heels"},
   {"name":"Seated Row (cable)","sets":3,"reps":12,"rest_sec":60,"notes":"Pull elbows back, squeeze shoulder blades"},
   {"name":"Chest Press (machine)","sets":3,"reps":12,"rest_sec":60,"notes":"Controlled push, do not lock elbows"},
   {"name":"Treadmill Walk (cooldown)","duration_sec":300,"rest_sec":0,"notes":"3 km/h, recover"}
 ]',
 ARRAY['gym','machine','beginner','full_body']),

('Upper Body Machine Day', 'gym', 'beginner', 25,
 '[
   {"name":"Recumbent Bike","duration_sec":300,"rest_sec":60,"notes":"5 min warm-up, low resistance"},
   {"name":"Lat Pulldown (machine)","sets":3,"reps":12,"rest_sec":60,"notes":"Wide grip, pull to upper chest"},
   {"name":"Shoulder Press (machine)","sets":3,"reps":10,"rest_sec":60,"notes":"Controlled up and down"},
   {"name":"Bicep Curl (cable)","sets":3,"reps":12,"rest_sec":60,"notes":"Elbows tucked at sides"},
   {"name":"Tricep Pushdown (cable)","sets":3,"reps":12,"rest_sec":60,"notes":"Push down fully, slow return"},
   {"name":"Stretching","duration_sec":120,"rest_sec":0,"notes":"Chest, shoulders, back"}
 ]',
 ARRAY['gym','upper_body','machine','beginner']),

('Lower Body Machine Day', 'gym', 'beginner', 25,
 '[
   {"name":"Treadmill Walk","duration_sec":300,"rest_sec":60,"notes":"Warm-up walk"},
   {"name":"Leg Press","sets":3,"reps":15,"rest_sec":60,"notes":"Light weight, full range, push through whole foot"},
   {"name":"Leg Curl (machine)","sets":3,"reps":12,"rest_sec":60,"notes":"Curl heel toward glute, control the return"},
   {"name":"Calf Raise (machine)","sets":3,"reps":15,"rest_sec":45,"notes":"Rise slowly, hold at top"},
   {"name":"Hip Abductor (machine)","sets":3,"reps":15,"rest_sec":45,"notes":"Push knees outward, targets outer glutes"},
   {"name":"Stretching","duration_sec":120,"rest_sec":0,"notes":"Quads, hamstrings, calves"}
 ]',
 ARRAY['gym','lower_body','machine','beginner']),

('Cardio Machine Mix', 'gym', 'beginner', 30,
 '[
   {"name":"Recumbent Bike","duration_sec":600,"rest_sec":60,"notes":"10 min at conversational pace, light resistance"},
   {"name":"Elliptical (low resistance)","duration_sec":600,"rest_sec":60,"notes":"10 min, minimal incline, smooth motion"},
   {"name":"Treadmill Walk","duration_sec":600,"rest_sec":0,"notes":"10 min, 3.5 km/h, end with 2 min very slow cooldown"}
 ]',
 ARRAY['gym','cardio','beginner','low_impact']),

('Functional Strength Basics', 'gym', 'beginner', 25,
 '[
   {"name":"Treadmill Warm-Up","duration_sec":300,"rest_sec":60,"notes":"4 km/h flat walk"},
   {"name":"Goblet Squat (light dumbbell)","sets":3,"reps":12,"rest_sec":60,"notes":"Hold dumbbell at chest, squat to comfortable depth"},
   {"name":"Seated Cable Row","sets":3,"reps":12,"rest_sec":60,"notes":"Keep back straight, pull to lower chest"},
   {"name":"Dumbbell RDL (light)","sets":3,"reps":12,"rest_sec":60,"notes":"Hip hinge, feel hamstrings. Not a squat."},
   {"name":"Pallof Press (cable)","sets":3,"reps":10,"rest_sec":45,"notes":"Anti-rotation core. Press away from anchor, hold 2 sec."},
   {"name":"Foam Roll","duration_sec":120,"rest_sec":0,"notes":"Calves, quads, upper back"}
 ]',
 ARRAY['gym','functional','beginner','core']),

('Pool Walk Circuit', 'gym', 'beginner', 30,
 '[
   {"name":"Pool Walk","duration_sec":300,"rest_sec":60,"notes":"Chest-deep water, walk width of pool back and forth"},
   {"name":"Water Arm Circles","duration_sec":60,"rest_sec":30,"notes":"Arms in water, large circles"},
   {"name":"Side Step in Water","duration_sec":120,"rest_sec":60,"notes":"Step sideways, 10 steps each direction"},
   {"name":"Pool Walk (faster)","duration_sec":300,"rest_sec":60,"notes":"Slightly quicker pace"},
   {"name":"Water Jogging (gentle)","duration_sec":120,"rest_sec":60,"notes":"Jog lightly in chest-deep water, low impact"},
   {"name":"Pool Walk (cooldown)","duration_sec":120,"rest_sec":0,"notes":"Slow to cool down"}
 ]',
 ARRAY['gym','pool','water','beginner','low_impact']),

('Core & Stability', 'gym', 'beginner', 20,
 '[
   {"name":"Plank (on knees)","duration_sec":30,"rest_sec":45,"notes":"Hold 3 sets. Hips level, breathe normally."},
   {"name":"Swiss Ball Sit","duration_sec":60,"rest_sec":30,"notes":"Sit on stability ball, feet flat on floor, maintain balance"},
   {"name":"Pallof Press","sets":3,"reps":10,"rest_sec":45,"notes":"Light cable resistance, anti-rotation"},
   {"name":"Dead Bug","sets":3,"reps":8,"rest_sec":45,"notes":"On mat, slow alternating arm/leg extension"},
   {"name":"Hip Bridge (glute bridge)","sets":3,"reps":15,"rest_sec":45,"notes":"On mat, drive hips up, squeeze glutes at top"},
   {"name":"Stretching","duration_sec":120,"rest_sec":0,"notes":"Hip flexors, lower back"}
 ]',
 ARRAY['gym','core','stability','beginner']),

('Back Strength Intro', 'gym', 'beginner', 25,
 '[
   {"name":"Treadmill Walk","duration_sec":300,"rest_sec":60,"notes":"Warm-up"},
   {"name":"Lat Pulldown","sets":3,"reps":12,"rest_sec":60,"notes":"Neutral grip, pull to chest level"},
   {"name":"Seated Cable Row","sets":3,"reps":12,"rest_sec":60,"notes":"Row to lower chest, elbows past torso"},
   {"name":"Face Pull (cable)","sets":3,"reps":15,"rest_sec":45,"notes":"Rope attachment, pull toward forehead, external rotation"},
   {"name":"Back Extension (machine)","sets":3,"reps":12,"rest_sec":45,"notes":"Light weight, hinge at hips, keep back neutral"},
   {"name":"Foam Roll Upper Back","duration_sec":90,"rest_sec":0,"notes":"Work thoracic spine"}
 ]',
 ARRAY['gym','back','posture','beginner']),

('Steady-State Cardio', 'gym', 'beginner', 30,
 '[
   {"name":"Recumbent Bike","duration_sec":1800,"rest_sec":0,"notes":"30 min steady. Target: able to hold a conversation. Zone 2 effort. No pushing."}
 ]',
 ARRAY['gym','cardio','endurance','beginner','zone2']),

('Full Body Machine Circuit', 'gym', 'beginner', 30,
 '[
   {"name":"Treadmill Walk","duration_sec":300,"rest_sec":45,"notes":"5 min warm-up"},
   {"name":"Leg Press","sets":2,"reps":15,"rest_sec":45,"notes":"Light, warm up legs"},
   {"name":"Chest Press (machine)","sets":2,"reps":12,"rest_sec":45,"notes":"Controlled"},
   {"name":"Lat Pulldown","sets":2,"reps":12,"rest_sec":45,"notes":"Controlled"},
   {"name":"Shoulder Press (machine)","sets":2,"reps":10,"rest_sec":45,"notes":"Light weight"},
   {"name":"Leg Curl","sets":2,"reps":12,"rest_sec":45,"notes":"Controlled return"},
   {"name":"Treadmill Walk (cooldown)","duration_sec":300,"rest_sec":0,"notes":"3 km/h, wind down"}
 ]',
 ARRAY['gym','full_body','circuit','beginner']);
