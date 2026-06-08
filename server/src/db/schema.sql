-- 1. Create Historical Teams Table
CREATE TABLE public.historical_teams (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    manager TEXT,
    tier TEXT NOT NULL CHECK (tier IN ('big', 'medium', 'small'))
);

-- Enable RLS on historical_teams
ALTER TABLE public.historical_teams ENABLE ROW LEVEL SECURITY;

-- Allow public read access to historical_teams
CREATE POLICY "Allow public read access to historical_teams" 
ON public.historical_teams FOR SELECT USING (true);


-- 2. Create Players Table
CREATE TABLE public.players (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    position TEXT NOT NULL CHECK (position IN ('GK', 'DEF', 'MID', 'FWD')),
    rating INTEGER NOT NULL,
    team_id TEXT REFERENCES public.historical_teams(id) ON DELETE CASCADE,
    pace INTEGER NOT NULL,
    shooting INTEGER NOT NULL,
    passing INTEGER NOT NULL,
    dribbling INTEGER NOT NULL,
    defending INTEGER NOT NULL,
    physical INTEGER NOT NULL
);

-- Enable RLS on players
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;

-- Allow public read access to players
CREATE POLICY "Allow public read access to players" 
ON public.players FOR SELECT USING (true);


-- 3. Create Managers Table
CREATE TABLE public.managers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    country TEXT NOT NULL,
    tactic TEXT NOT NULL,
    rating INTEGER NOT NULL,
    boost TEXT,
    description TEXT
);

-- Enable RLS on managers
ALTER TABLE public.managers ENABLE ROW LEVEL SECURITY;

-- Allow public read access to managers
CREATE POLICY "Allow public read access to managers" 
ON public.managers FOR SELECT USING (true);


-- 4. Create Tournaments Table (Linked to Supabase Auth Users)
CREATE TABLE public.tournaments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
    user_name TEXT NOT NULL,
    user_team TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('AI', 'Friend')),
    stages_played INTEGER NOT NULL DEFAULT 0,
    won_cup BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on tournaments
ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;

-- Users can only view their own tournaments
CREATE POLICY "Users can view own tournaments" 
ON public.tournaments FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own tournaments
CREATE POLICY "Users can insert own tournaments" 
ON public.tournaments FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own tournaments
CREATE POLICY "Users can update own tournaments" 
ON public.tournaments FOR UPDATE USING (auth.uid() = user_id);


-- 5. Create Tournament Matches Table
CREATE TABLE public.tournament_matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id UUID REFERENCES public.tournaments(id) ON DELETE CASCADE NOT NULL,
    match_num INTEGER NOT NULL,
    team_a_name TEXT NOT NULL,
    team_b_name TEXT NOT NULL,
    score_a INTEGER NOT NULL,
    score_b INTEGER NOT NULL,
    events JSONB NOT NULL
);

-- Enable RLS on tournament_matches
ALTER TABLE public.tournament_matches ENABLE ROW LEVEL SECURITY;

-- Users can view matches of their own tournaments
CREATE POLICY "Users can view own tournament matches" 
ON public.tournament_matches FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.tournaments 
        WHERE tournaments.id = tournament_matches.tournament_id 
        AND tournaments.user_id = auth.uid()
    )
);

-- Users can insert matches of their own tournaments
CREATE POLICY "Users can insert own tournament matches" 
ON public.tournament_matches FOR INSERT 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.tournaments 
        WHERE tournaments.id = tournament_matches.tournament_id 
        AND tournaments.user_id = auth.uid()
    )
);
