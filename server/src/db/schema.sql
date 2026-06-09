-- Drop existing tables to allow clean re-run of schema queries
DROP TABLE IF EXISTS public.tournament_matches CASCADE;
DROP TABLE IF EXISTS public.tournaments CASCADE;
DROP TABLE IF EXISTS public.players CASCADE;
DROP TABLE IF EXISTS public.historical_teams CASCADE;
DROP TABLE IF EXISTS public.managers CASCADE;
DROP TABLE IF EXISTS public.manager_accounts CASCADE;
DROP TABLE IF EXISTS public.active_tournaments CASCADE;

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


-- 4. Create Tournaments Table (Linked to custom manager profiles)
CREATE TABLE public.tournaments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    user_name TEXT NOT NULL,
    user_team TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('AI', 'Friend')),
    stages_played INTEGER NOT NULL DEFAULT 0,
    won_cup BOOLEAN NOT NULL DEFAULT false,
    is_terminated BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on tournaments
ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;

-- Allow public read access to tournaments (filtered on client by user_name)
CREATE POLICY "Allow public read access to tournaments" 
ON public.tournaments FOR SELECT USING (true);

-- Allow public insert access to tournaments
CREATE POLICY "Allow public insert access to tournaments" 
ON public.tournaments FOR INSERT WITH CHECK (true);

-- Allow public update access to tournaments
CREATE POLICY "Allow public update access to tournaments" 
ON public.tournaments FOR UPDATE USING (true);


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

-- Allow public read access to matches
CREATE POLICY "Allow public read access to tournament_matches" 
ON public.tournament_matches FOR SELECT USING (true);

-- Allow public insert access to matches
CREATE POLICY "Allow public insert access to tournament_matches" 
ON public.tournament_matches FOR INSERT WITH CHECK (true);


-- 6. Create Manager Accounts Table for custom username/password login
CREATE TABLE public.manager_accounts (
    username TEXT PRIMARY KEY,
    password TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.manager_accounts ENABLE ROW LEVEL SECURITY;

-- Allow public read access to verify accounts
CREATE POLICY "Allow public read access to manager_accounts"
ON public.manager_accounts FOR SELECT USING (true);

-- Allow public insert access to register new accounts
CREATE POLICY "Allow public insert access to manager_accounts"
ON public.manager_accounts FOR INSERT WITH CHECK (true);

-- 7. Create Active Tournaments Table to save/resume up to 5 tournament states
CREATE TABLE public.active_tournaments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    user_name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    last_saved_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    room_state JSONB NOT NULL
);

-- Enable RLS
ALTER TABLE public.active_tournaments ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Allow public read access to active_tournaments"
ON public.active_tournaments FOR SELECT USING (true);

-- Allow public insert access
CREATE POLICY "Allow public insert access to active_tournaments"
ON public.active_tournaments FOR INSERT WITH CHECK (true);

-- Allow public update access
CREATE POLICY "Allow public update access to active_tournaments"
ON public.active_tournaments FOR UPDATE USING (true);

-- Allow public delete access
CREATE POLICY "Allow public delete access to active_tournaments"
ON public.active_tournaments FOR DELETE USING (true);
