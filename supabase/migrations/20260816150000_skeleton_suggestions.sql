CREATE TABLE public.skeleton_suggestions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  skeleton_block_id UUID REFERENCES public.skeleton_blocks(id) ON DELETE CASCADE NOT NULL,
  field TEXT NOT NULL CHECK (field IN ('day_of_week', 'start_time', 'end_time')),
  current_value TEXT NOT NULL,
  suggested_value TEXT NOT NULL,
  rationale TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'dismissed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.skeleton_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own suggestions"
  ON public.skeleton_suggestions FOR ALL USING (auth.uid() = user_id);
