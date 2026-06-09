import { historicalTeams } from '../data/players.js';
import { historicalPlayersByCountry } from '../data/historical_players_db.js';

function getPositionLabel(formation, index) {
  const layouts = {
    "4-3-3": ["GK", "LB", "CB", "CB", "RB", "CM", "CDM", "CM", "LW", "ST", "RW"],
    "4-4-2": ["GK", "LB", "CB", "CB", "RB", "LM", "CM", "CM", "RM", "ST", "ST"],
    "3-5-2": ["GK", "CB", "CB", "CB", "LM", "CM", "CDM", "CM", "RM", "ST", "ST"],
    "5-4-1": ["GK", "LWB", "CB", "CB", "CB", "RWB", "LM", "CM", "CM", "RM", "ST"],
    "4-2-3-1": ["GK", "LB", "CB", "CB", "RB", "LDM", "RDM", "LM", "CAM", "RM", "ST"],
    "3-4-3": ["GK", "CB", "CB", "CB", "LM", "CM", "CM", "RM", "LW", "ST", "RW"]
  };
  return layouts[formation]?.[index] || "SUB";
}

// Peter Drury-style dramatic commentaries
const GOAL_TEMPLATES = [
  "Oh, it is written in the stars! {scorer} has painted the canvas of this stadium with sheer genius! Assisted by {assister} who read the play like a scholar!",
  "He rises! {scorer} rises like a colossus! An unbelievable header that leaves the keeper clutching at shadows! Brilliant cross from {assister}!",
  "That is absolute poetry in motion! {scorer} finishing off a move of breathtaking fluidity! Credit to {assister} for that defense-splitting pass!",
  "Oh, sensory overload! Unbelievable scenes! {scorer} fires it into the top corner! The stadium has erupted into a cauldron of pure noise! Set up beautifully by {assister}!",
  "Lethal! Clinical! A strike of pure venom from {scorer} that tears into the back of the net! {assister} provided the perfect link-up play!",
  "A moment of pure sorcery! {scorer} dances past the challenges and lifts it calmly over the keeper! Fantastic work by {assister} to set it up!",
  "Simply majestic! {scorer} with a first-time volley that defies the laws of physics! {assister} found him with a pinpoint diagonal ball!",
  "He has hit it with absolute thunder! {scorer} scores a screamer! The crowd stands in awe! The assist goes to {assister} after some patient buildup.",
  "Delightful, delicious, de-lovely! {scorer} taps it in! It is a team goal of spectacular quality, orchestrated by {assister}!",
  "It is a goal that echoes around the world! {scorer} makes no mistake! {assister} carved them open like a surgeon!",
  "Absolute stardust! {scorer} produces a moment of pure magic out of nothing! A breathtaking finish! What a pass by {assister}!",
  "Oh, the audacity! The sheer, unadulterated class of {scorer}! A chip of delicate beauty over the stranded keeper! Assisted by {assister}!",
  "He has hit that with maximum velocity! {scorer} rocketed it home from thirty yards! The net is practically smoking! Magnificently set up by {assister}!",
  "A symphony of passes, and {scorer} delivers the crescendo! An exquisite finish that takes the breath away! Phenomenal vision from {assister}!",
  "He's done it again! {scorer} is the talisman, the hero, the savior! A predatory finish in the six-yard box! Fed beautifully by {assister}!",
  "Breathtaking! Majestic! Unstoppable! {scorer} hammers it into the roof of the net! A strike of absolute conviction! Brilliant work from {assister}!"
];

const SAVE_TEMPLATES = [
  "What a save! A reflex block of pure defiance! {gk} stood big like a giant brick wall to deny {shooter}!",
  "Defiant! Heroic! Goalkeeper {gk} tips it onto the post with a fingernail! {shooter} is left holding his head in agony!",
  "Incredible! A stunning display of agility from {gk}! He flew through the air to push {shooter}'s goalbound effort wide!",
  "Denied! {gk} refuses to be beaten, throwing his body on the line to smother {shooter}'s shot!",
  "Sensational stop by {gk}! He anticipated {shooter}'s intention perfectly and blocked it with his legs!",
  "Oh, world-class goalkeeping! {gk} dives low to his right and pushes the ball away from {shooter}'s feet!",
  "Astral preservation! {gk} stretches to the absolute limit and claws {shooter}'s goalbound header out of the top corner!",
  "Incredible reflex! {gk} turns it over the bar! {shooter} cannot believe he hasn't scored there!",
  "Like a cat! {gk} springs across his goal line and smothers the ball at the feet of {shooter}!"
];

const MISS_TEMPLATES = [
  "{shooter} shoots... but oh, he has dragged it wide! A moment of absolute agony for {team}!",
  "How has {shooter} missed that?! A clean sight of goal, but he gets under it and sends it high into the stands!",
  "He hits the crossbar! The metalwork is still shaking! {shooter} was so close to giving {team} the lead!",
  "A wild attempt! The pressure gets the better of {shooter}, and the shot sails well wide of the post!",
  "He had time, he had space, but {shooter} rushes the shot and pulls it wide of the mark!",
  "An ambitious effort from {shooter}! He tries it from distance but it doesn't trouble the goalkeeper.",
  "Oh, the anguish! {shooter} has sent it into orbit! A golden opportunity completely wasted!",
  "It's wide! Just a coat of paint away! {shooter} watches in despair as it rolls past the far post!"
];

const YELLOW_CARD_TEMPLATES = [
  "The referee reaches into his pocket... it is a yellow card! A tactical booking for {player} ({team}) to halt the flow of play!",
  "Yellow card! A booking of necessity for {player} ({team}), stopping the break with a cynical block.",
  "Foul! The referee shows the yellow card to {player} ({team}) for that late, mistimed challenge.",
  "A stern talking-to and now a yellow card for {player} ({team})! The referee will not tolerate that behavior.",
  "Booking! {player} ({team}) goes into the referee's notebook after a persistent series of fouls.",
  "He has crossed the line! The referee flashes the yellow card at {player} ({team}) for that cynical pull of the shirt."
];

const RED_CARD_TEMPLATES = [
  "Off! {player} ({team}) is off! A moment of madness that costs his team dearly! The referee waves the red card!",
  "RED CARD! A catastrophic error of judgment from {player} ({team})! He must take the long, lonely walk down the tunnel!",
  "Disaster for {team}! {player} receives a straight red card for a reckless tackle! The crowd is in uproar!",
  "Red card! The referee shows no mercy! {player} ({team}) is sent off after a dangerous high boot!",
  "An early shower for {player} ({team})! A straight red card for that flying tackle! Absolutely no complaints!"
];

const PENALTY_GOAL_TEMPLATES = [
  "Clean strike into the top corner!",
  "He sends the keeper the wrong way!",
  "Ice-cool penalty, slotting it low into the bottom corner!",
  "Powerful strike, right down the middle!",
  "Hit with precision, clipping the inside of the post!",
  "Drilled low and hard! The keeper got a hand to it but couldn't keep it out!",
  "Panenka! Oh, the absolute confidence! He chips it down the middle!"
];

const PENALTY_MISS_TEMPLATES = [
  "Saved by the keeper with a spectacular diving block!",
  "Shot goes wide of the post! Agony!",
  "Hit the crossbar and bounces out!",
  "The keeper stands tall and catches it down the middle!",
  "Dragged wide! The pressure was too much!",
  "Tipped onto the post by the fingertips of the keeper!",
  "He skied it! High over the crossbar! Oh, the heartbreak!"
];

export function getGoalCommentary(scorer, assister, team) {
  const template = GOAL_TEMPLATES[Math.floor(Math.random() * GOAL_TEMPLATES.length)];
  return template.replace(/{scorer}/g, scorer).replace(/{assister}/g, assister).replace(/{team}/g, team);
}

export function getSaveCommentary(gk, shooter, team) {
  const template = SAVE_TEMPLATES[Math.floor(Math.random() * SAVE_TEMPLATES.length)];
  return template.replace(/{gk}/g, gk).replace(/{shooter}/g, shooter).replace(/{team}/g, team);
}

export function getMissCommentary(shooter, team) {
  const template = MISS_TEMPLATES[Math.floor(Math.random() * MISS_TEMPLATES.length)];
  return template.replace(/{shooter}/g, shooter).replace(/{team}/g, team);
}

export function getYellowCardCommentary(player, team) {
  const template = YELLOW_CARD_TEMPLATES[Math.floor(Math.random() * YELLOW_CARD_TEMPLATES.length)];
  return template.replace(/{player}/g, player).replace(/{team}/g, team);
}

export function getRedCardCommentary(player, team) {
  const template = RED_CARD_TEMPLATES[Math.floor(Math.random() * RED_CARD_TEMPLATES.length)];
  return template.replace(/{player}/g, player).replace(/{team}/g, team);
}

export function getPenaltyGoalCommentary() {
  return PENALTY_GOAL_TEMPLATES[Math.floor(Math.random() * PENALTY_GOAL_TEMPLATES.length)];
}

export function getPenaltyMissCommentary() {
  return PENALTY_MISS_TEMPLATES[Math.floor(Math.random() * PENALTY_MISS_TEMPLATES.length)];
}

/**
 * Calculates team sector stats (ATT, MID, DEF, OVR, Chemistry) based on selected squad (starting XI), formation, tactic, and manager.
 */
export function calculateTeamStats(squad, formation, tactic, managerObj, playStyle = "balanced") {
  let attRatings = [];
  let midRatings = [];
  let defRatings = [];
  let gkRating = 50;

  for (let idx = 0; idx <= 10; idx++) {
    const p = squad[idx];
    if (p && p.rating) {
      const slotLabel = getPositionLabel(formation, idx);
      
      let sector = "";
      if (slotLabel === "GK") sector = "GK";
      else if (["LB", "CB", "RB", "LWB", "RWB"].includes(slotLabel)) sector = "DEF";
      else if (["LM", "CM", "RM", "CDM", "CAM", "LDM", "RDM"].includes(slotLabel)) sector = "MID";
      else if (["LW", "ST", "RW", "FWD"].includes(slotLabel)) sector = "FWD";
      
      let naturalPos = p.position; // "GK", "DEF", "MID", "FWD"
      let rating = p.rating;
      
      // Enforce position compatibility penalty
      if (naturalPos !== sector) {
        rating = Math.max(40, rating - 15);
      }

      if (sector === "FWD") {
        attRatings.push(rating);
      } else if (sector === "MID") {
        midRatings.push(rating);
      } else if (sector === "DEF") {
        defRatings.push(rating);
      } else if (sector === "GK") {
        gkRating = rating;
      }
    }
  }

  const avg = arr => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 65;

  let att = Math.round(avg(attRatings));
  let mid = Math.round(avg(midRatings));
  let def = Math.round((avg(defRatings) * 2 + gkRating) / 3);

  // Chemistry
  const countryCounts = {};
  for (let idx = 0; idx <= 10; idx++) {
    const p = squad[idx];
    if (p) {
      const origin = p.country || "Unknown";
      countryCounts[origin] = (countryCounts[origin] || 0) + 1;
    }
  }

  let chemScore = 20;
  Object.values(countryCounts).forEach(count => {
    if (count > 1) chemScore += count * 8;
  });
  const chemistry = Math.min(100, chemScore);

  // Manager boosts
  if (managerObj) {
    if (managerObj.tactic === tactic) {
      att += 2;
      mid += 2;
      def += 2;
    }
  }

  // Play style boosts
  if (playStyle === "attack") {
    att += 3;
    def -= 2;
  } else if (playStyle === "defense") {
    def += 3;
    att -= 2;
  } else if (playStyle === "control") {
    mid += 2;
  }

  // Balanced tactics
  if (tactic === "park-the-bus") {
    def += 4;
    att -= 2;
  } else if (tactic === "tiki-taka") {
    mid += 3;
  } else if (tactic === "gegenpress") {
    mid += 2;
    def += 2;
  } else if (tactic === "counter-attack") {
    def += 1;
    att += 2;
  } else if (tactic === "long-ball") {
    att += 2;
    mid -= 1;
  } else if (tactic === "wing-play") {
    att += 2;
    mid += 1;
  }

  const baseOvr = (att * 0.45 + mid * 0.3 + def * 0.25);
  const totalOvr = Math.round(baseOvr + (chemistry / 15));

  return { 
    att: Math.min(99, Math.max(40, att)), 
    mid: Math.min(99, Math.max(40, mid)), 
    def: Math.min(99, Math.max(40, def)), 
    chemistry, 
    totalOvr: Math.min(99, Math.max(40, totalOvr)) 
  };
}

/**
 * Simulates a football match including red cards, yellow cards, goals, saves, and on-the-fly stat drops.
 */
export function simulateMatch(teamA, teamB, isKnockout = false, interactiveShootout = false) {
  const statsA = { ...teamA.stats };
  const statsB = { ...teamB.stats };

  // Keep track of card states
  const playerStatsA = Object.values(teamA.squad).filter(Boolean).map(p => ({ id: p.id, name: p.name, position: p.position, rating: p.rating, cards: 0, sentOff: false }));
  const playerStatsB = Object.values(teamB.squad).filter(Boolean).map(p => ({ id: p.id, name: p.name, position: p.position, rating: p.rating, cards: 0, sentOff: false }));

  let scoreA = 0;
  let scoreB = 0;
  const events = [];

  // Arrays to collect scorers & assists for room stats tracking
  const scorersList = [];
  const assistsList = [];

  events.push({ time: 0, type: "whistle", text: `The atmosphere is electric! The referee blows the whistle, and the theater of football begins: ${teamA.name} vs ${teamB.name}!` });

  const numEvents = 8;
  const times = [9, 21, 33, 44, 56, 69, 78, 86];

  for (let i = 0; i < numEvents; i++) {
    const time = times[i] + Math.floor(Math.random() * 3) - 1;
    
    // Balanced card trigger (only 5% chance per event step)
    if (Math.random() < 0.05) {
      const isTeamA = Math.random() < 0.5;
      const targetList = isTeamA ? playerStatsA : playerStatsB;
      const targetStats = isTeamA ? statsA : statsB;
      const teamName = isTeamA ? teamA.name : teamB.name;

      const activePlayers = targetList.filter(p => !p.sentOff);
      if (activePlayers.length > 0) {
        const player = activePlayers[Math.floor(Math.random() * activePlayers.length)];
        
        // Direct red card is extremely rare (5% of card triggers, 95% yellow)
        const isDirectRed = Math.random() < 0.05;
        
        if (isDirectRed) {
          player.sentOff = true;
          applyRedCardPenalty(targetStats, player.position);
          events.push({
            time,
            type: "red_card",
            text: `🔴 RED CARD! ${getRedCardCommentary(player.name, teamName)}`
          });
        } else {
          player.cards++;
          if (player.cards === 2) {
            player.sentOff = true;
            applyRedCardPenalty(targetStats, player.position);
            events.push({
              time,
              type: "red_card",
              text: `🟨🔴 SECOND YELLOW! ${player.name} (${teamName}) receives his second booking and must leave the field!`
            });
          } else {
            events.push({
              time,
              type: "yellow_card",
              text: `🟨 YELLOW CARD! ${getYellowCardCommentary(player.name, teamName)}`
            });
          }
        }
      }
      continue;
    }

    // Play attack simulation
    const possessionProb = statsA.mid / (statsA.mid + statsB.mid);
    const isAttackingA = Math.random() < possessionProb;

    if (isAttackingA) {
      const scorer = getRandomPlayer(playerStatsA, "FWD");
      const assister = getRandomPlayer(playerStatsA, "MID");
      const gk = getRandomPlayer(playerStatsB, "GK");

      const scoreProb = (statsA.att * 1.1) / (statsA.att + statsB.def);
      const randVal = Math.random();

      if (randVal < scoreProb * 0.35) {
        scoreA++;
        const commentary = getGoalCommentary(scorer.name, assister.name, teamA.name);
        events.push({
          time,
          type: "goal",
          team: "A",
          score: [scoreA, scoreB],
          text: `⚽ GOAL! ${commentary}`
        });
        scorersList.push({ name: scorer.name, team: "A", time });
        assistsList.push({ name: assister.name, team: "A" });
      } else if (randVal < scoreProb * 0.70) {
        const commentary = getSaveCommentary(gk.name, scorer.name, teamB.name);
        events.push({
          time,
          type: "save",
          team: "B",
          text: `🧤 SAVE! ${commentary}`
        });
      } else {
        const commentary = getMissCommentary(scorer.name, teamA.name);
        events.push({
          time,
          type: "miss",
          team: "A",
          text: `❌ MISS! ${commentary}`
        });
      }
    } else {
      const scorer = getRandomPlayer(playerStatsB, "FWD");
      const assister = getRandomPlayer(playerStatsB, "MID");
      const gk = getRandomPlayer(playerStatsA, "GK");

      const scoreProb = (statsB.att * 1.1) / (statsB.att + statsA.def);
      const randVal = Math.random();

      if (randVal < scoreProb * 0.35) {
        scoreB++;
        const commentary = getGoalCommentary(scorer.name, assister.name, teamB.name);
        events.push({
          time,
          type: "goal",
          team: "B",
          score: [scoreA, scoreB],
          text: `⚽ GOAL! ${commentary}`
        });
        scorersList.push({ name: scorer.name, team: "B", time });
        assistsList.push({ name: assister.name, team: "B" });
      } else if (randVal < scoreProb * 0.70) {
        const commentary = getSaveCommentary(gk.name, scorer.name, teamA.name);
        events.push({
          time,
          type: "save",
          team: "A",
          text: `🧤 SAVE! ${commentary}`
        });
      } else {
        const commentary = getMissCommentary(scorer.name, teamB.name);
        events.push({
          time,
          type: "miss",
          team: "B",
          text: `❌ MISS! ${commentary}`
        });
      }
    }
  }

  events.push({ time: 90, type: "whistle", text: `And there is the final whistle! Peter Drury signing off. What a match: ${teamA.name} ${scoreA} - ${scoreB} ${teamB.name}!` });

  // Determine clean sheets before shootout starts (shootout goals don't ruin clean sheets)
  let cleanSheetGK_A = scoreB === 0 ? getRandomPlayer(playerStatsA, "GK")?.name : null;
  let cleanSheetGK_B = scoreA === 0 ? getRandomPlayer(playerStatsB, "GK")?.name : null;

  let needsShootout = false;
  if (isKnockout && scoreA === scoreB) {
    if (interactiveShootout) {
      needsShootout = true;
    } else {
      const shootoutRes = simulatePenaltyShootout(playerStatsA, playerStatsB, teamA.name, teamB.name);
      events.push(...shootoutRes.events);
      if (shootoutRes.scoreA > shootoutRes.scoreB) {
        scoreA += 1;
      } else {
        scoreB += 1;
      }
    }
  }

  return {
    scoreA,
    scoreB,
    events,
    needsShootout,
    scorers: scorersList,
    assists: assistsList,
    cleanSheets: { A: cleanSheetGK_A, B: cleanSheetGK_B }
  };
}

function applyRedCardPenalty(stats, position) {
  if (position === "DEF" || position === "GK") {
    stats.def = Math.max(40, Math.round(stats.def * 0.85));
  } else if (position === "MID") {
    stats.mid = Math.max(40, Math.round(stats.mid * 0.85));
  } else {
    stats.att = Math.max(40, Math.round(stats.att * 0.85));
  }
  stats.totalOvr = Math.round((stats.att * 0.45 + stats.mid * 0.3 + stats.def * 0.25));
}

function getRandomPlayer(playerList, preferredPos) {
  const onPitch = playerList.filter(p => !p.sentOff);
  if (onPitch.length === 0) return { name: "Substitute", position: preferredPos };
  
  const matches = onPitch.filter(p => p.position === preferredPos);
  if (matches.length > 0) {
    return matches[Math.floor(Math.random() * matches.length)];
  }
  return onPitch[Math.floor(Math.random() * onPitch.length)];
}

/**
 * Generates an AI opponent squad using a real historical team.
 */
export function generateAISquad(teamId) {
  const team = historicalTeams.find(t => t.id === teamId) || historicalTeams[0];
  const squad = {};

  const nerfOffset = 7;
  const nerfedRoster = team.roster.map(p => {
    const newRating = Math.max(60, p.rating - nerfOffset);
    const newStats = p.stats ? {
      pace: Math.max(40, p.stats.pace - nerfOffset),
      shooting: Math.max(40, p.stats.shooting - nerfOffset),
      passing: Math.max(40, p.stats.passing - nerfOffset),
      dribbling: Math.max(40, p.stats.dribbling - nerfOffset),
      defending: Math.max(40, p.stats.defending - nerfOffset),
      physical: Math.max(40, p.stats.physical - nerfOffset)
    } : undefined;
    return { ...p, rating: newRating, stats: newStats };
  });

  const gkList = nerfedRoster.filter(p => p.position === 'GK');
  const defList = nerfedRoster.filter(p => p.position === 'DEF');
  const midList = nerfedRoster.filter(p => p.position === 'MID');
  const fwdList = nerfedRoster.filter(p => p.position === 'FWD');

  const gk = gkList[0] || { id: "bf_gk", name: "Goalkeeper", position: "GK", rating: 72, stats: { pace: 45, shooting: 18, passing: 60, dribbling: 45, defending: 72, physical: 72 }, teamId: team.id };
  const defs = defList.slice(0, 4);
  const mids = midList.slice(0, 3);
  const fwds = fwdList.slice(0, 3);

  const finalXI = [];
  finalXI.push(gk);
  for (let idx = 0; idx < 4; idx++) {
    finalXI.push(defs[idx] || { id: `bf_def_${idx}`, name: "Defender", position: "DEF", rating: 72, stats: { pace: 65, shooting: 40, passing: 60, dribbling: 55, defending: 75, physical: 75 }, teamId: team.id });
  }
  for (let idx = 0; idx < 3; idx++) {
    finalXI.push(mids[idx] || { id: `bf_mid_${idx}`, name: "Midfielder", position: "MID", rating: 72, stats: { pace: 65, shooting: 65, passing: 75, dribbling: 70, defending: 65, physical: 65 }, teamId: team.id });
  }
  for (let idx = 0; idx < 3; idx++) {
    finalXI.push(fwds[idx] || { id: `bf_fwd_${idx}`, name: "Striker", position: "FWD", rating: 72, stats: { pace: 75, shooting: 75, passing: 65, dribbling: 73, defending: 30, physical: 67 }, teamId: team.id });
  }

  finalXI.forEach((p, idx) => {
    squad[idx] = { ...p, teamId: team.id };
  });

  const tactics = ["tiki-taka", "counter-attack", "gegenpress", "long-ball", "park-the-bus", "wing-play"];
  const randomTactic = tactics[Math.floor(Math.random() * tactics.length)];

  const managers = [
    { id: "ai_mgr_1", name: "AI Manager", tactic: randomTactic, rating: 80 }
  ];

  const stats = calculateTeamStats(squad, "4-3-3", randomTactic, managers[0]);

  return {
    name: team.name,
    manager: managers[0],
    formation: "4-3-3",
    tactic: randomTactic,
    squad,
    stats
  };
}

function simulatePenaltyShootout(playerListA, playerListB, teamAName, teamBName) {
  const events = [];
  let scoreA = 0;
  let scoreB = 0;
  let kicksA = 0;
  let kicksB = 0;
  
  const activeA = playerListA.filter(p => !p.sentOff && p.position !== "GK");
  const activeB = playerListB.filter(p => !p.sentOff && p.position !== "GK");
  const gkA = playerListA.find(p => p.position === "GK") || { name: "Goalkeeper" };
  const gkB = playerListB.find(p => p.position === "GK") || { name: "Goalkeeper" };

  events.push({
    time: 120,
    type: "whistle",
    text: `🚨 PENALTY SHOOTOUT! The match must be decided from the spot! ${teamAName} vs ${teamBName}!`
  });

  let round = 1;
  let suddenDeath = false;

  while (true) {
    // Team A kick
    const kickerA = activeA[(kicksA) % activeA.length] || { name: `Kicker A${kicksA + 1}`, rating: 75 };
    const successChanceA = 0.75 + (kickerA.rating - gkB.rating) * 0.005;
    const scoredA = Math.random() < Math.max(0.40, Math.min(0.95, successChanceA));
    kicksA++;
    if (scoredA) scoreA++;
    
    events.push({
      time: 120 + round * 2 - 1,
      type: scoredA ? "goal" : "miss",
      text: `🎯 [Penalty Shootout - Round ${round}] ${kickerA.name} steps up for ${teamAName}... ${scoredA ? "⚽ GOAL! " + getPenaltyGoalCommentary() : "❌ MISSED! " + getPenaltyMissCommentary() + " (Saved by " + gkB.name + ")" } (Penalties: ${scoreA}-${scoreB})`
    });

    // Check if shootout resolved after Team A kick
    if (canResolveShootout(scoreA, scoreB, kicksA, kicksB, suddenDeath)) {
      break;
    }

    // Team B kick
    const kickerB = activeB[(kicksB) % activeB.length] || { name: `Kicker B${kicksB + 1}`, rating: 75 };
    const successChanceB = 0.75 + (kickerB.rating - gkA.rating) * 0.005;
    const scoredB = Math.random() < Math.max(0.40, Math.min(0.95, successChanceB));
    kicksB++;
    if (scoredB) scoreB++;

    events.push({
      time: 120 + round * 2,
      type: scoredB ? "goal" : "miss",
      text: `🎯 [Penalty Shootout - Round ${round}] ${kickerB.name} steps up for ${teamBName}... ${scoredB ? "⚽ GOAL! " + getPenaltyGoalCommentary() : "❌ MISSED! " + getPenaltyMissCommentary() + " (Saved by " + gkA.name + ")" } (Penalties: ${scoreA}-${scoreB})`
    });

    // Check if shootout resolved after Team B kick
    if (canResolveShootout(scoreA, scoreB, kicksA, kicksB, suddenDeath)) {
      break;
    }

    round++;
    if (round > 5) suddenDeath = true;
  }

  events.push({
    time: 130,
    type: "whistle",
    text: `🏆 Shootout Finished! Final Penalty Score: ${teamAName} ${scoreA} - ${scoreB} ${teamBName}.`
  });

  return { scoreA, scoreB, events };
}

export function canResolveShootout(scoreA, scoreB, kicksA, kicksB, suddenDeath) {
  if (suddenDeath) {
    return kicksA === kicksB && scoreA !== scoreB;
  }
  const remainingA = 5 - kicksA;
  const remainingB = 5 - kicksB;
  if (scoreA > scoreB + remainingB) return true;
  if (scoreB > scoreA + remainingA) return true;
  return false;
}

export function generateMockRosterForNation(nationName) {
  const firstNames = {
    spanish: ["José", "Luis", "Carlos", "Juan", "Jorge", "Pedro", "Manuel", "Miguel", "Angel", "Diego", "Alejandro", "Andrés"],
    french: ["Jean", "Pierre", "Michel", "Lucas", "Hugo", "Antoine", "Clément", "Nicolas", "Julien", "Thierry", "Olivier", "Laurent"],
    german: ["Hans", "Thomas", "Michael", "Andreas", "Stefan", "Christian", "Sebastian", "Lukas", "Julian", "Alexander", "Philipp", "Mats"],
    italian: ["Giovanni", "Francesco", "Alessandro", "Giuseppe", "Marco", "Antonio", "Luca", "Roberto", "Andrea", "Stefano", "Filippo", "Davide"],
    portuguese: ["João", "José", "Antônio", "Lucas", "Mateus", "Gabriel", "Bruno", "Felipe", "Thiago", "Rodrigo", "André", "Diego"],
    slavic: ["Luka", "Ivan", "Milan", "Dragan", "Marko", "Nikola", "Petar", "Igor", "Sergey", "Dmitry", "Jan", "Pavel"],
    arabic: ["Mohamed", "Ahmed", "Youssef", "Ali", "Hamza", "Mustafa", "Khaled", "Tarek", "Karim", "Omar", "Hassan", "Yassine"],
    english: ["John", "David", "James", "Peter", "Robert", "Michael", "William", "Thomas", "Richard", "Daniel", "Jack", "Harry"]
  };

  const lastNames = {
    spanish: ["Rodriguez", "Gomez", "Lopez", "Diaz", "Martinez", "Sanchez", "Perez", "García", "Fernandez", "Gonzales", "Romero", "Torres"],
    french: ["Martin", "Bernard", "Dubois", "Thomas", "Robert", "Richard", "Petit", "Durand", "Leroy", "Moreau", "Simon", "Michel"],
    german: ["Müller", "Schmidt", "Schneider", "Fischer", "Weber", "Weber", "Wagner", "Becker", "Schulz", "Hoffmann", "Schäfer", "Bauer"],
    italian: ["Rossi", "Ferrari", "Russo", "Bianchi", "Romano", "Colombo", "Ricci", "Marini", "Greco", "Bruno", "Gallo", "Conti"],
    portuguese: ["Silva", "Santos", "Oliveira", "Souza", "Rodrigues", "Almeida", "Nascimento", "Costa", "Gomes", "Martins", "Pereira", "Carvalho"],
    slavic: ["Kovacevic", "Horvat", "Novak", "Kovacic", "Petrovic", "Nikolic", "Markovic", "Dmitriev", "Ivanov", "Sokolov", "Popov", "Svoboda"],
    arabic: ["Salah", "Hassan", "Saeed", "Mansour", "Geziri", "Rahman", "Jabrane", "Regragui", "Khazri", "Msakni", "Skhiri", "Laïdouni"],
    english: ["Smith", "Jones", "Taylor", "Brown", "Williams", "Wilson", "Johnson", "Davis", "Miller", "Anderson", "Thomas", "Jackson"]
  };

  // Determine language family
  let family = "english";
  const nameLower = nationName.toLowerCase();
  
  if (["spain", "ecuador", "poland", "costa rica", "colombia", "peru", "chile", "mexico"].includes(nameLower)) family = "spanish";
  else if (["france", "switzerland", "belgium"].includes(nameLower)) family = "french";
  else if (["germany", "austria"].includes(nameLower)) family = "german";
  else if (["italy"].includes(nameLower)) family = "italian";
  else if (["brazil", "portugal"].includes(nameLower)) family = "portuguese";
  else if (["croatia", "poland", "ukraine", "bulgaria", "serbia", "czech republic", "hungary"].includes(nameLower)) family = "slavic";
  else if (["morocco", "saudi arabia", "iran", "tunisia", "algeria", "egypt"].includes(nameLower)) family = "arabic";

  // Predefined stars for famous nations to make it extremely premium
  const stars = {
    "egypt": ["Mohamed Salah", "Mostafa Mohamed", "Mohamed Elneny", "Trezeguet"],
    "norway": ["Erling Haaland", "Martin Ødegaard", "Alexander Sørloth", "Julian Ryerson"],
    "south korea": ["Heung-min Son", "Min-jae Kim", "Kang-in Lee", "Hee-chan Hwang"],
    "poland": ["R. Lewandowski", "Piotr Zieliński", "Matty Cash", "Nicola Zalewski"],
    "colombia": ["Luis Díaz", "James Rodríguez", "Duvan Zapata", "Davinson Sánchez"],
    "turkey": ["Hakan Çalhanoğlu", "Arda Güler", "Barış Alper Yılmaz", "Kerem Aktürkoğlu"],
    "serbia": ["Aleksandar Mitrović", "Dušan Tadić", "Dušan Vlahović", "Sergej Milinković-Savić"],
    "scotland": ["Andy Robertson", "John McGinn", "Scott McTominay", "Che Adams"],
    "sweden": ["Viktor Gyökeres", "Alexander Isak", "Dejan Kulusevski", "Victor Lindelöf"],
    "ukraine": ["Mykhailo Mudryk", "Oleksandr Zinchenko", "Artem Dovbyk", "Andriy Lunin"],
    "wales": ["Aaron Ramsey", "Daniel James", "Ben Davies", "Harry Wilson"],
    "chile": ["Alexis Sánchez", "Arturo Vidal", "Ben Brereton Díaz", "Claudio Bravo"]
  };

  const roster = [];
  const nationStars = [...(stars[nameLower] || [])];

  // Generate 15 players
  for (let idx = 0; idx < 15; idx++) {
    let position = "MID";
    if (idx === 0) position = "GK";
    else if (idx <= 5) position = "DEF";
    else if (idx <= 10) position = "MID";
    else position = "FWD";

    let name = "";
    if (position === "FWD" && nationStars.length > 0) {
      name = nationStars.pop();
    } else {
      const first = firstNames[family][Math.floor(Math.random() * firstNames[family].length)];
      const last = lastNames[family][Math.floor(Math.random() * lastNames[family].length)];
      name = `${first} ${last}`;
    }

    const rating = 72 + Math.floor(Math.random() * 10); // 72 to 81 rating range for balanced mock nations

    roster.push({
      id: `${nameLower.replace(/\s+/g, '_')}_mock_${idx}`,
      name,
      position,
      rating,
      stats: {
        pace: 60 + Math.floor(Math.random() * 30),
        shooting: 55 + Math.floor(Math.random() * 35),
        passing: 60 + Math.floor(Math.random() * 30),
        dribbling: 60 + Math.floor(Math.random() * 30),
        defending: 55 + Math.floor(Math.random() * 35),
        physical: 60 + Math.floor(Math.random() * 30)
      }
    });
  }

  return roster;
}

export function generateNationSquad(nationName) {
  // Try to find if we have a historical team for this nation
  const historical = historicalTeams.find(t => t.name.toLowerCase().includes(nationName.toLowerCase()) || t.id.toLowerCase().includes(nationName.toLowerCase()));
  if (historical) {
    return generateAISquad(historical.id);
  }
  
  // Otherwise generate a custom mock squad for this nation
  const squad = {};
  const roster = generateMockRosterForNation(nationName);
  
  roster.forEach((p, idx) => {
    squad[idx] = { ...p, teamId: nationName.toLowerCase().replace(/\s+/g, '_') };
  });

  const tactics = ["tiki-taka", "counter-attack", "gegenpress", "long-ball", "park-the-bus", "wing-play"];
  const randomTactic = tactics[Math.floor(Math.random() * tactics.length)];
  const manager = { id: `mgr_${nationName.toLowerCase()}`, name: `${nationName} Coach`, tactic: randomTactic, rating: 80 };

  const stats = calculateTeamStats(squad, "4-3-3", randomTactic, manager);

  return {
    name: nationName,
    manager,
    formation: "4-3-3",
    tactic: randomTactic,
    squad,
    stats
  };
}
