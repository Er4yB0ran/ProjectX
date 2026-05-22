-- 1. PROFILES
CREATE TABLE profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  wake_up_time TIME DEFAULT '07:00',
  bed_time TIME DEFAULT '23:00',
  energy_peaks JSONB,
  onboarding_completed BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. SKELETON_BLOCKS
CREATE TABLE skeleton_blocks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  title TEXT NOT NULL,
  is_hard_constraint BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. TASKS
CREATE TYPE task_status AS ENUM ('pending', 'completed', 'rescheduled', 'cancelled');

CREATE TABLE tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  skeleton_block_id UUID REFERENCES skeleton_blocks(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  task_date DATE DEFAULT CURRENT_DATE,
  start_time TIME,
  end_time TIME,
  energy_cost SMALLINT CHECK (energy_cost BETWEEN 1 AND 5),
  flexibility_score SMALLINT DEFAULT 3 CHECK (flexibility_score BETWEEN 1 AND 5),
  status task_status DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. ROW LEVEL SECURITY
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE skeleton_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own profile"
  ON profiles FOR ALL USING (auth.uid() = id);

CREATE POLICY "Users can manage their own skeleton"
  ON skeleton_blocks FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own tasks"
  ON tasks FOR ALL USING (auth.uid() = user_id);

-- 5. AUTO-CREATE PROFILE ON SIGNUP
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, onboarding_completed)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'full_name',
    FALSE
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
