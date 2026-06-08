import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Resolve directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env configuration
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const { SUPABASE_URL, SUPABASE_ANON_KEY } = process.env;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("❌ ERROR: Please define SUPABASE_URL and SUPABASE_ANON_KEY in server/.env file.");
  process.exit(1);
}

// NOTE: During migration, if RLS is active, it is best to use your Supabase service_role key.
// If you use the Anon key, make sure you temporarily disable RLS or add INSERT policies.
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Import local data files using relative resolution
const playersFilePath = path.resolve(__dirname, '../data/players.js');

async function runMigration() {
  console.log("🚀 Starting Supabase Seeding / Migration...");

  // Dynamic import of local Javascript database file
  let playersData;
  try {
    playersData = await import('file://' + playersFilePath);
  } catch (err) {
    console.error("❌ Failed to load players.js data file:", err);
    process.exit(1);
  }

  const { historicalTeams, managers } = playersData;

  if (!historicalTeams || !managers) {
    console.error("❌ Invalid data exported from players.js.");
    process.exit(1);
  }

  // 1. Migrate Historical Teams & Players
  console.log(`\n📦 Migrating ${historicalTeams.length} historical teams and rosters...`);
  for (const team of historicalTeams) {
    console.log(`⏳ Seeding team: ${team.name} (${team.id})...`);
    
    // Insert team
    const { error: teamErr } = await supabase
      .from('historical_teams')
      .upsert({
        id: team.id,
        name: team.name,
        manager: team.manager,
        tier: team.tier || 'medium'
      });

    if (teamErr) {
      console.error(`❌ Error inserting team ${team.name}:`, teamErr.message);
      continue;
    }

    // Insert players
    const rosterPlayers = team.roster.map(p => ({
      id: p.id,
      name: p.name,
      position: p.position,
      rating: p.rating,
      team_id: team.id,
      pace: p.stats?.pace || 70,
      shooting: p.stats?.shooting || 70,
      passing: p.stats?.passing || 70,
      dribbling: p.stats?.dribbling || 70,
      defending: p.stats?.defending || 70,
      physical: p.stats?.physical || 70
    }));

    const { error: playerErr } = await supabase
      .from('players')
      .upsert(rosterPlayers);

    if (playerErr) {
      console.error(`❌ Error inserting players for team ${team.name}:`, playerErr.message);
    } else {
      console.log(`   ✅ Successfully seeded ${rosterPlayers.length} players for ${team.name}.`);
    }
  }

  // 2. Migrate Managers
  console.log(`\n💼 Seeding ${managers.length} managers...`);
  const managersData = managers.map(m => ({
    id: m.id || m.name.toLowerCase().replace(/\s+/g, '_'),
    name: m.name,
    country: m.country,
    tactic: m.tactic,
    rating: m.rating || 80,
    boost: m.boost,
    description: m.desc || m.description
  }));

  const { error: mgrErr } = await supabase
    .from('managers')
    .upsert(managersData);

  if (mgrErr) {
    console.error(`❌ Error inserting managers:`, mgrErr.message);
  } else {
    console.log(`✅ Successfully seeded ${managersData.length} managers.`);
  }

  console.log("\n🎉 Seeding completed!");
  process.exit(0);
}

runMigration();
