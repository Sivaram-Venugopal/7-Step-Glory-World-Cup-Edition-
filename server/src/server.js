import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { historicalTeams, managers } from './data/players.js';
import { calculateTeamStats, simulateMatch, generateAISquad, generateNationSquad } from './engine/simulator.js';

const app = express();
app.use(cors());
app.use(express.json());

const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 5000;

const rooms = {};

const TEAM_TIERS = {
  big: [
    "brazil_1970", "brazil_2002", "argentina_1986", "argentina_2022", "france_1998", 
    "spain_2010", "germany_2014", "italy_2006", "england_2006", "portugal_2006"
  ],
  medium: [
    "croatia_2018", "uruguay_2010", "belgium_2018", "netherlands_1974", "turkey_2002", 
    "ghana_2010", "s_korea_2002", "colombia_2014", "mexico_1998", "sweden_1994", 
    "bulgaria_1994", "romania_1994", "denmark_1998", "poland_1974", "chile_1998", 
    "australia_2006", "ukraine_2006", "czech_2006", "yugoslavia_1990", "ussr_1986"
  ],
  small: [
    "morocco_2022", "cameroon_1990", "usa_2002", "nigeria_1994", "senegal_2002", 
    "japan_2022", "tunisia_2022", "costarica_2014", "ecuador_2006", "norway_1998", 
    "algeria_2014", "saudi_arabia_1994", "scotland_1978", "austria_1978", "ireland_1990", 
    "egypt_2018", "senegal_2022", "switzerland_2018", "s_africa_2010", "wales_2022"
  ]
};

function spinWeightedTeam() {
  const roll = Math.random() * 100;
  let tier;
  if (roll < 30) {
    tier = TEAM_TIERS.big;
  } else if (roll < 70) {
    tier = TEAM_TIERS.medium;
  } else {
    tier = TEAM_TIERS.small;
  }
  const randomId = tier[Math.floor(Math.random() * tier.length)];
  return randomId;
}

function getBalancedDraftPool() {
  const pool = [];
  // Pick 4 big
  for (let i = 0; i < 4; i++) {
    pool.push(TEAM_TIERS.big[Math.floor(Math.random() * TEAM_TIERS.big.length)]);
  }
  // Pick 6 medium
  for (let i = 0; i < 6; i++) {
    pool.push(TEAM_TIERS.medium[Math.floor(Math.random() * TEAM_TIERS.medium.length)]);
  }
  // Pick 5 small
  for (let i = 0; i < 5; i++) {
    pool.push(TEAM_TIERS.small[Math.floor(Math.random() * TEAM_TIERS.small.length)]);
  }
  // Shuffle
  return pool.sort(() => 0.5 - Math.random());
}

const ALL_HISTORICAL_NATIONS = [
  "Algeria", "Angola", "Argentina", "Australia", "Austria", "Belgium", "Bolivia", "Bosnia and Herzegovina", "Brazil", "Bulgaria",
  "Cameroon", "Canada", "Chile", "China", "Colombia", "Costa Rica", "Croatia", "Cuba", "Czech Republic", "Denmark",
  "Ecuador", "Egypt", "El Salvador", "England", "France", "Germany", "Ghana", "Greece", "Haiti", "Honduras",
  "Hungary", "Iceland", "Iran", "Iraq", "Ireland", "Israel", "Italy", "Ivory Coast", "Jamaica", "Japan",
  "Kuwait", "Morocco", "Netherlands", "New Zealand", "Nigeria", "North Korea", "Northern Ireland", "Norway", "Panama", "Paraguay",
  "Peru", "Poland", "Portugal", "Qatar", "Romania", "Russia", "Saudi Arabia", "Scotland", "Senegal", "Serbia",
  "Slovakia", "Slovenia", "South Africa", "South Korea", "Spain", "Sweden", "Switzerland", "Togo", "Trinidad and Tobago", "Tunisia",
  "Turkey", "Ukraine", "United Arab Emirates", "USA", "Uruguay", "Wales"
];

const NATIONS_LIST = [
  "England", "France", "Brazil", "Argentina", "Portugal", "Germany", "Spain", "Italy", "Netherlands", "Croatia",
  "Uruguay", "Morocco", "Japan", "USA", "Belgium", "Senegal", "Mexico", "Canada", "South Korea", "Australia",
  "Cameroon", "Nigeria", "Ghana", "Ecuador", "Switzerland", "Poland", "Denmark", "Sweden", "Ukraine", "Wales",
  "Saudi Arabia", "Iran", "Tunisia", "Algeria", "Egypt", "Costa Rica", "Bulgaria", "Turkey", "Colombia", "Peru",
  "Chile", "Austria", "Hungary", "Scotland", "Norway", "Czech Republic", "Greece", "Serbia"
];

io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  // Join Room
  socket.on('join_room', ({ roomId, playerName, isHost, isSinglePlayer }) => {
    socket.join(roomId);

    if (!rooms[roomId]) {
      rooms[roomId] = {
        roomId,
        players: [],
        status: 'lobby',
        isSinglePlayer: !!isSinglePlayer,
        draftRound: 0,
        spunTeams: [], // Historical team ids spun for each round (1-14)
        matchesPlayed: 0,
        matchesHistory: [],
        currentOpponent: null,
        playerStats: {}, // Player leaderboard stats: { name: { goals, assists, cleanSheets } }
        allGroupsStandings: {} // 48-team standings
      };
    }

    const room = rooms[roomId];

    let player = room.players.find(p => p.id === socket.id);
    if (!player) {
      player = {
        id: socket.id,
        name: playerName,
        teamName: "Brazil", // default country choice
        isHost: !!isHost,
        manager: null,
        squad: {}, // keys 0..10 (Starting XI)
        subs: {}, // keys 0..2 (Bench substitutes)
        formation: "4-3-3",
        tactic: "tiki-taka",
        stats: null,
        ready: false,
        draftedNames: [] // prevent duplicate draftings
      };
      room.players.push(player);
    }

    io.to(roomId).emit('room_update', getSanitizedRoom(room));
  });

  // Settings modification
  socket.on('update_settings', ({ roomId, formation, tactic, teamName }) => {
    const room = rooms[roomId];
    if (!room) return;

    const player = room.players.find(p => p.id === socket.id);
    if (player) {
      player.formation = formation;
      player.tactic = tactic;
      if (teamName) {
        player.teamName = teamName;
      }
      io.to(roomId).emit('room_update', getSanitizedRoom(room));
    }
  });

  // Start Draft Phase
  socket.on('start_game', ({ roomId }) => {
    const room = rooms[roomId];
    if (!room) return;

    room.status = 'drafting';
    room.draftRound = 1; // Start at Round 1

    // Pre-spin teams for 15 rounds of drafts with exactly balanced tiers (4 Big, 6 Medium, 5 Small)
    room.spunTeams = getBalancedDraftPool();

    sendDraftRoundOptions(room);
  });

  // Pick draft item with flexible slot placement (like 38-0-0.com)
  socket.on('pick_draft_item', ({ roomId, type, item, slotType, slotIndex }) => {
    const room = rooms[roomId];
    if (!room) return;

    const player = room.players.find(p => p.id === socket.id);
    if (!player) return;

    // Save picked name to prevent duplicate picks
    player.draftedNames.push(item.name);

    if (type === 'manager') {
      player.manager = item;
    } else {
      if (slotType === 'squad') {
        player.squad[slotIndex] = item;
      } else if (slotType === 'sub') {
        player.subs[slotIndex] = item;
      }
    }

    player.ready = true;

    // Check if everyone is ready to progress round
    const allReady = room.players.every(p => p.ready);
    if (allReady) {
      if (room.draftRound < 15) {
        room.draftRound++;
        room.players.forEach(p => { p.ready = false; });
        sendDraftRoundOptions(room);
      } else {
        // Drafting finished
        room.players.forEach(p => {
          p.ready = false;
          p.stats = calculateTeamStats(p.squad, p.formation, p.tactic, p.manager);
        });

        if (room.isSinglePlayer) {
          setupSinglePlayerCampaign(room);
        } else {
          room.status = 'tournament';
          setupMultiplayerOpponent(room);
        }
      }
    } else {
      io.to(roomId).emit('room_update', getSanitizedRoom(room));
    }
  });

  // Swap starter with sub
  socket.on('swap_player', ({ roomId, starterIdx, subIdx }) => {
    const room = rooms[roomId];
    if (!room) return;

    const player = room.players.find(p => p.id === socket.id);
    if (player) {
      const starter = player.squad[starterIdx];
      const sub = player.subs[subIdx];
      
      player.squad[starterIdx] = sub;
      player.subs[subIdx] = starter;

      player.stats = calculateTeamStats(player.squad, player.formation, player.tactic, player.manager);
      io.to(roomId).emit('room_update', getSanitizedRoom(room));
    }
  });

  // Update tactic during tournament
  socket.on('update_tournament_tactic', ({ roomId, tactic }) => {
    const room = rooms[roomId];
    if (!room) return;

    const player = room.players.find(p => p.id === socket.id);
    if (player) {
      player.tactic = tactic;
      player.stats = calculateTeamStats(player.squad, player.formation, tactic, player.manager);
      io.to(roomId).emit('room_update', getSanitizedRoom(room));
    }
  });

  // Ready for simulation
  socket.on('ready_match', ({ roomId }) => {
    const room = rooms[roomId];
    if (!room) return;

    const player = room.players.find(p => p.id === socket.id);
    if (player) {
      player.ready = true;
    }

    const allReady = room.players.every(p => p.ready);
    if (allReady) {
      simulateRound(room);
    } else {
      io.to(roomId).emit('room_update', getSanitizedRoom(room));
    }
  });

  // Reset lobby
  socket.on('restart_game', ({ roomId }) => {
    const room = rooms[roomId];
    if (!room) return;

    room.status = 'lobby';
    room.draftRound = 0;
    room.matchesPlayed = 0;
    room.matchesHistory = [];
    room.spunTeams = [];
    room.allGroupsStandings = {};
    room.currentOpponent = null;
    room.playerStats = {};

    room.players.forEach(p => {
      p.manager = null;
      p.squad = {};
      p.subs = {};
      p.stats = null;
      p.ready = false;
      p.draftedNames = [];
    });

    io.to(roomId).emit('room_update', getSanitizedRoom(room));
  });

  // Disconnect
  socket.on('disconnect', () => {
    for (let roomId in rooms) {
      const room = rooms[roomId];
      const playerIdx = room.players.findIndex(p => p.id === socket.id);
      if (playerIdx !== -1) {
        room.players.splice(playerIdx, 1);
        if (room.players.length === 0) {
          delete rooms[roomId];
          console.log(`Lobby ${roomId} closed.`);
        } else {
          io.to(roomId).emit('room_update', getSanitizedRoom(room));
        }
        break;
      }
    }
  });
});

// Helper: send options for manager/player drafting rounds
function sendDraftRoundOptions(room) {
  const round = room.draftRound;
  const teamId = room.spunTeams[round - 1];
  const team = historicalTeams.find(t => t.id === teamId) || historicalTeams[0];
  
  room.players.forEach(p => {
    // Filter out duplicate drafted players by name
    const filteredRoster = team.roster.filter(player => !p.draftedNames.includes(player.name));
    
    // Find manager associated with this team
    const managerObj = managers.find(m => m.name === team.manager);
    const showManager = managerObj && !p.draftedNames.includes(managerObj.name) && !p.manager;

    io.to(p.id).emit('draft_options', { 
      round, 
      type: 'player', 
      teamName: team.name, 
      choices: filteredRoster, // The entire 22 player roster
      manager: showManager ? managerObj : null
    });
  });

  io.to(room.roomId).emit('room_update', getSanitizedRoom(room));
}

// 48-Team Group Stage Setup (12 groups A..L of 4 teams)
// 48-Team Group Setup (12 groups A..L of 4 teams)
function setupSinglePlayerCampaign(room) {
  room.status = 'tournament';

  const user = room.players[0];
  const userTeam = user.teamName || "Brazil";

  // Filter out chosen team from NATIONS_LIST to prevent duplicate entries
  const shuffNations = NATIONS_LIST.filter(n => n.toLowerCase() !== userTeam.toLowerCase()).sort(() => 0.5 - Math.random());
  
  const groups = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];
  
  // Filter out chosen team from historical teams to prevent duplicate entries in Group A
  const poolHist = historicalTeams.filter(t => !t.name.toLowerCase().includes(userTeam.toLowerCase())).sort(() => 0.5 - Math.random());
  const opA1 = poolHist[0];
  const opA2 = poolHist[1];
  const opA3 = poolHist[2];

  room.allGroupsStandings["A"] = [
    { name: userTeam, isUser: true, played: 0, won: 0, drawn: 0, lost: 0, points: 0, gf: 0, ga: 0, gd: 0 },
    { name: opA1.name, teamId: opA1.id, played: 0, won: 0, drawn: 0, lost: 0, points: 0, gf: 0, ga: 0, gd: 0 },
    { name: opA2.name, teamId: opA2.id, played: 0, won: 0, drawn: 0, lost: 0, points: 0, gf: 0, ga: 0, gd: 0 },
    { name: opA3.name, teamId: opA3.id, played: 0, won: 0, drawn: 0, lost: 0, points: 0, gf: 0, ga: 0, gd: 0 }
  ];

  let nationIdx = 0;
  for (let i = 1; i < groups.length; i++) {
    const grLetter = groups[i];
    room.allGroupsStandings[grLetter] = [
      { name: shuffNations[nationIdx++], played: 0, won: 0, drawn: 0, lost: 0, points: 0, gf: 0, ga: 0, gd: 0 },
      { name: shuffNations[nationIdx++], played: 0, won: 0, drawn: 0, lost: 0, points: 0, gf: 0, ga: 0, gd: 0 },
      { name: shuffNations[nationIdx++], played: 0, won: 0, drawn: 0, lost: 0, points: 0, gf: 0, ga: 0, gd: 0 },
      { name: shuffNations[nationIdx++], played: 0, won: 0, drawn: 0, lost: 0, points: 0, gf: 0, ga: 0, gd: 0 }
    ];
  }

  // Active opponent details for Group Match 1
  room.currentOpponent = generateAISquad(opA1.id);
  io.to(room.roomId).emit('room_update', getSanitizedRoom(room));
}

// Multiplayer lobby opponent detail assignment
function setupMultiplayerOpponent(room) {
  const p1 = room.players[0];
  const p2 = room.players[1];

  p1.stats = calculateTeamStats(p1.squad, p1.formation, p1.tactic, p1.manager);
  p2.stats = calculateTeamStats(p2.squad, p2.formation, p2.tactic, p2.manager);

  io.to(room.roomId).emit('room_update', getSanitizedRoom(room));
}

// Helper: simulate a match between two standing teams and record player stats
function simulateAndRecordMatch(room, standingA, standingB, isKnockout = false) {
  let squadA, squadB;

  if (standingA.isUser) {
    const user = room.players[0];
    squadA = { name: user.teamName || user.name, squad: user.squad, tactic: user.tactic, stats: user.stats };
  } else if (standingA.teamId) {
    squadA = generateAISquad(standingA.teamId);
  } else {
    squadA = generateNationSquad(standingA.name);
  }

  if (standingB.isUser) {
    const user = room.players[0];
    squadB = { name: user.teamName || user.name, squad: user.squad, tactic: user.tactic, stats: user.stats };
  } else if (standingB.teamId) {
    squadB = generateAISquad(standingB.teamId);
  } else {
    squadB = generateNationSquad(standingB.name);
  }

  const res = simulateMatch(squadA, squadB, isKnockout);

  updateStanding(standingA, res.scoreA, res.scoreB);
  updateStanding(standingB, res.scoreB, res.scoreA);

  updateStatsTracker(room, res, squadA.squad, squadB.squad);

  return res;
}

// Resolve match simulation
function simulateRound(room) {
  room.matchesPlayed++;
  
  if (room.isSinglePlayer) {
    const user = room.players[0];
    const opponent = room.currentOpponent;
    let matchRes;

    if (room.matchesPlayed <= 3) {
      const userStanding = room.allGroupsStandings["A"].find(s => s.isUser);
      const oppStanding = room.allGroupsStandings["A"].find(s => s.name === opponent.name);

      // Simulate user's match
      matchRes = simulateAndRecordMatch(room, userStanding, oppStanding, false);

      // Simulate Group A other match
      const oppA2 = room.allGroupsStandings["A"].find(s => s.name !== userStanding.name && s.name !== oppStanding.name);
      const oppA3 = room.allGroupsStandings["A"].find(s => s.name !== userStanding.name && s.name !== oppStanding.name && s.name !== oppA2.name);
      
      simulateAndRecordMatch(room, oppA2, oppA3, false);

      // Sort Group A Standings
      room.allGroupsStandings["A"].sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.gd !== a.gd) return b.gd - a.gd;
        return b.gf - a.gf;
      });

      // Simulate Groups B..L completely in background
      const groups = ["B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];
      groups.forEach(grKey => {
        const list = room.allGroupsStandings[grKey];
        let t0 = list[0], t1 = list[1], t2 = list[2], t3 = list[3];
        if (room.matchesPlayed === 1) {
          simulateAndRecordMatch(room, t0, t1, false);
          simulateAndRecordMatch(room, t2, t3, false);
        } else if (room.matchesPlayed === 2) {
          simulateAndRecordMatch(room, t0, t2, false);
          simulateAndRecordMatch(room, t1, t3, false);
        } else {
          simulateAndRecordMatch(room, t0, t3, false);
          simulateAndRecordMatch(room, t1, t2, false);
        }

        list.sort((a, b) => {
          if (b.points !== a.points) return b.points - a.points;
          if (b.gd !== a.gd) return b.gd - a.gd;
          return b.gf - a.gf;
        });
      });

      // Prepare opponent for next round
      if (room.matchesPlayed < 3) {
        const playedOpponents = [...room.matchesHistory.map(h => h.teamBName), opponent.name];
        const nextOpp = room.allGroupsStandings["A"].find(s => !s.isUser && !playedOpponents.includes(s.name));
        room.currentOpponent = generateAISquad(nextOpp.teamId);
      } else {
        // Group Stage Completed! Determine 32-team Knockout qualifiers
        const qualified = check48TeamQualification(room);
        if (!qualified) {
          room.status = 'finished'; // User knocked out
        } else {
          const randomOpp = historicalTeams[Math.floor(Math.random() * historicalTeams.length)];
          room.currentOpponent = generateAISquad(randomOpp.id);
        }
      }
    } else {
      // Knockout Phase (Matches 4 to 8)
      // Simulate user's match with knockout penalties enabled
      matchRes = simulateMatch(
        { name: user.teamName || user.name, squad: user.squad, tactic: user.tactic, stats: user.stats },
        { name: opponent.name, squad: opponent.squad, tactic: opponent.tactic, stats: opponent.stats },
        true
      );

      // Track Player stats
      updateStatsTracker(room, matchRes, user.squad, opponent.squad);

      // Simulate other knockout matches in background to keep stats running
      let numBgMatches = 0;
      if (room.matchesPlayed === 4) numBgMatches = 7;
      else if (room.matchesPlayed === 5) numBgMatches = 3;
      else if (room.matchesPlayed === 6) numBgMatches = 1;
      else if (room.matchesPlayed === 7) numBgMatches = 1;

      for (let j = 0; j < numBgMatches; j++) {
        const t1 = historicalTeams[Math.floor(Math.random() * historicalTeams.length)];
        let t2 = historicalTeams[Math.floor(Math.random() * historicalTeams.length)];
        while (t1.id === t2.id) {
          t2 = historicalTeams[Math.floor(Math.random() * historicalTeams.length)];
        }
        const squad1 = generateAISquad(t1.id);
        const squad2 = generateAISquad(t2.id);
        const bgRes = simulateMatch(squad1, squad2, true);
        updateStatsTracker(room, bgRes, squad1.squad, squad2.squad);
      }

      if (matchRes.scoreB > matchRes.scoreA) {
        room.status = 'finished'; // Lost knockout match
      } else {
        if (room.matchesPlayed >= 8) {
          room.status = 'finished'; // Won World Cup Final!
        } else {
          const randomOpp = historicalTeams[Math.floor(Math.random() * historicalTeams.length)];
          room.currentOpponent = generateAISquad(randomOpp.id);
        }
      }
    }

    const matchDetails = {
      matchNum: room.matchesPlayed,
      teamAName: user.teamName || user.name,
      teamBName: opponent.name,
      teamAStats: {
        totalOvr: user.stats?.totalOvr || 75,
        tactic: user.tactic,
        formation: user.formation
      },
      teamBStats: {
        totalOvr: opponent.stats?.totalOvr || 75,
        tactic: opponent.tactic,
        formation: opponent.formation
      },
      scoreA: matchRes.scoreA,
      scoreB: matchRes.scoreB,
      events: matchRes.events,
      opponentSquad: opponent.squad,
      opponentManager: opponent.manager,
      opponentStats: opponent.stats
    };
    room.matchesHistory.push(matchDetails);

    room.players.forEach(p => { p.ready = false; });

    io.to(room.roomId).emit('match_simulated', {
      matchDetails,
      roomState: getSanitizedRoom(room)
    });
  } else {
    // Multiplayer duel simulation
    const p1 = room.players[0];
    const p2 = room.players[1];

    const isKnockout = room.matchesPlayed > 3;
    const matchRes = simulateMatch(
      { name: p1.teamName || p1.name, squad: p1.squad, tactic: p1.tactic, stats: p1.stats },
      { name: p2.teamName || p2.name, squad: p2.squad, tactic: p2.tactic, stats: p2.stats },
      isKnockout
    );

    updateStatsTracker(room, matchRes, p1.squad, p2.squad);

    const matchDetails = {
      matchNum: room.matchesPlayed,
      teamAName: p1.teamName || p1.name,
      teamBName: p2.teamName || p2.name,
      teamAStats: {
        totalOvr: p1.stats?.totalOvr || 75,
        tactic: p1.tactic,
        formation: p1.formation
      },
      teamBStats: {
        totalOvr: p2.stats?.totalOvr || 75,
        tactic: p2.tactic,
        formation: p2.formation
      },
      scoreA: matchRes.scoreA,
      scoreB: matchRes.scoreB,
      events: matchRes.events,
      opponentSquad: p2.squad,
      opponentManager: p2.manager,
      opponentStats: p2.stats
    };
    room.matchesHistory.push(matchDetails);

    room.players.forEach(p => { p.ready = false; });

    if (room.matchesPlayed >= 7) {
      room.status = 'finished';
    }

    io.to(room.roomId).emit('match_simulated', {
      matchDetails,
      roomState: getSanitizedRoom(room)
    });
  }
}


// Check qualification from 12 groups (top 2 from each group + 8 best 3rd place teams)
function check48TeamQualification(room) {
  const groups = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];
  
  const groupAUser = room.allGroupsStandings["A"].find(s => s.isUser);
  const userRankA = room.allGroupsStandings["A"].indexOf(groupAUser);

  if (userRankA < 2) return true; // Top 2 qualify

  // Check 3rd place rankings
  const thirdPlaceTeams = [];
  groups.forEach(grLetter => {
    const list = room.allGroupsStandings[grLetter];
    const thirdTeam = list[2];
    if (thirdTeam) {
      thirdPlaceTeams.push({ ...thirdTeam, group: grLetter });
    }
  });

  thirdPlaceTeams.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.gd !== a.gd) return b.gd - a.gd;
    return b.gf - a.gf;
  });

  const userStandingInThirds = thirdPlaceTeams.findIndex(t => t.isUser);
  if (userStandingInThirds !== -1 && userStandingInThirds < 8) {
    return true; // Qualifies as best 3rd
  }

  return false;
}

// simulate AI vs AI group match
function simulateGroupMatch(teamId1, teamId2) {
  const t1 = generateAISquad(teamId1);
  const t2 = generateAISquad(teamId2);
  const res = simulateMatch(t1, t2);
  return { scoreA: res.scoreA, scoreB: res.scoreB };
}

// simulate basic AI random score
function simulateRandomMatch() {
  const scoreA = Math.floor(Math.random() * 3);
  const scoreB = Math.floor(Math.random() * 3);
  return { scoreA, scoreB };
}

// update standing
function updateStanding(team, gf, ga) {
  team.played++;
  team.gf += gf;
  team.ga += ga;
  team.gd = team.gf - team.ga;
  if (gf > ga) {
    team.won++;
    team.points += 3;
  } else if (gf === ga) {
    team.drawn++;
    team.points += 1;
  } else {
    team.lost++;
  }
}

// Track stats
function updateStatsTracker(room, matchRes, squadA, squadB) {
  matchRes.scorers.forEach(goal => {
    const pName = goal.name;
    if (!room.playerStats[pName]) {
      room.playerStats[pName] = { goals: 0, assists: 0, cleanSheets: 0 };
    }
    room.playerStats[pName].goals++;
  });

  matchRes.assists.forEach(assist => {
    const pName = assist.name;
    if (!room.playerStats[pName]) {
      room.playerStats[pName] = { goals: 0, assists: 0, cleanSheets: 0 };
    }
    room.playerStats[pName].assists++;
  });

  if (matchRes.cleanSheets.A) {
    const gkName = matchRes.cleanSheets.A;
    if (!room.playerStats[gkName]) {
      room.playerStats[gkName] = { goals: 0, assists: 0, cleanSheets: 0 };
    }
    room.playerStats[gkName].cleanSheets++;
  }
  if (matchRes.cleanSheets.B) {
    const gkName = matchRes.cleanSheets.B;
    if (!room.playerStats[gkName]) {
      room.playerStats[gkName] = { goals: 0, assists: 0, cleanSheets: 0 };
    }
    room.playerStats[gkName].cleanSheets++;
  }
}

// Sanitization mapper
function getSanitizedRoom(room) {
  return {
    roomId: room.roomId,
    status: room.status,
    isSinglePlayer: room.isSinglePlayer,
    draftRound: room.draftRound,
    spunTeams: room.spunTeams,
    matchesPlayed: room.matchesPlayed,
    matchesHistory: room.matchesHistory,
    allGroupsStandings: room.allGroupsStandings,
    playerStats: room.playerStats,
    currentOpponent: room.currentOpponent ? {
      name: room.currentOpponent.name,
      formation: room.currentOpponent.formation,
      tactic: room.currentOpponent.tactic,
      stats: room.currentOpponent.stats,
      squad: room.currentOpponent.squad,
      manager: room.currentOpponent.manager
    } : null,
    players: room.players.map(p => ({
      id: p.id,
      name: p.name,
      teamName: p.teamName,
      isHost: p.isHost,
      manager: p.manager,
      squad: p.squad,
      subs: p.subs,
      formation: p.formation,
      tactic: p.tactic,
      stats: p.stats,
      ready: p.ready,
      draftedNames: p.draftedNames
    }))
  };
}

server.listen(PORT, () => {
  console.log(`World Cup Draft server running on port ${PORT}`);
});
