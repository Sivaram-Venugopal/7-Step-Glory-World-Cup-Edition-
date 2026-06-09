import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { 
  Users, User, ArrowRight, Play, RotateCcw, 
  Settings, Shield, ChevronRight, CheckCircle2, AlertCircle, Sparkles, RefreshCw,
  LogOut, Calendar, Award, Eye, EyeOff
} from 'lucide-react';
import RetroDither from './RetroDither';
import { supabase, isSupabaseConfigured } from './supabase.js';

const WorldCupTrophy = ({ size = 24, className = "", style = {}, ...props }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="currentColor"
      className={className}
      style={{ display: 'inline-block', verticalAlign: 'middle', ...style }}
      {...props}
    >
      {/* Globe at the top */}
      <circle cx="32" cy="16" r="10" />
      <path d="M26 13.5c3 1.5 6 2 10 0" fill="none" stroke="var(--bg-dark, #000)" strokeWidth="1.2" opacity="0.3" />
      <path d="M24.5 17.5c4 2 8 2.5 13.5-.5" fill="none" stroke="var(--bg-dark, #000)" strokeWidth="1.2" opacity="0.3" />
      <path d="M29 9c2 1 4 2 4 4.5S31 19.5 31.5 22" fill="none" stroke="var(--bg-dark, #000)" strokeWidth="1" opacity="0.25" />
      
      {/* Swirling figures supporting the globe */}
      <path d="M22 50c.5-3.5 1.5-7.5 1.5-12.5s-2.5-9-4-11c-1-1.5-1.5-3 0-3.5s3.5.5 5 3.5c1.8 3.5 2.5 8 2 13.5s-1.5 10-1.5 10h-3z" />
      <path d="M42 50c-.5-3.5-1.5-7.5-1.5-12.5s2.5-9 4-11c1-1.5 1.5-3 0-3.5s-3.5.5-5 3.5c-1.8 3.5-2.5 8-2 13.5s1.5 10 1.5 10h3z" />
      
      {/* Central rising core */}
      <path d="M28 50c.5-5 2.5-10.5 4-16.5 .5-2 1.5-2 2 0 1.5 6 3.5 11.5 4 16.5h-10z" />
      
      {/* Ribbon extensions wrapping globe */}
      <path d="M21 21.5c4-2 8.5-5 11-10c.5 1.5 1.5 3 2.5 3 2.5 0 4-2.5 6.5-5.5c-1.5 3-4 5-6.5 5-2 0-3.5-1.5-4.5-3.5-1.5 2.5-4.5 5-7.5 6.5c-1.2.6-1.5 4.5-1.5 4.5z" />

      {/* Base: Stack of rings */}
      <path d="M25 48h14v3H25z" />
      <path d="M22 51h20v2H22z" fill="rgba(255,255,255,0.4)" />
      <path d="M21 53h22v3H21z" />
      <path d="M19 56h26v2H19z" fill="rgba(255,255,255,0.4)" />
      <path d="M18 58h28v4H18z" />
    </svg>
  );
};

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || (
  window.location.hostname === 'localhost' 
    ? 'http://localhost:5000' 
    : `http://${window.location.hostname}:5000`
);

const TACTIC_DETAILS = {
  "tiki-taka": { name: "Tiki-Taka", desc: "Focuses on short passing, ball control, and positional play.", color: "#ffffff" },
  "counter-attack": { name: "Counter-Attack", desc: "Solid defensive block with explosive transitions on breaks.", color: "#888888" },
  "gegenpress": { name: "Gegenpress", desc: "Aggressive defensive pressure high up the pitch to win back possession.", color: "#dddddd" },
  "long-ball": { name: "Long Ball", desc: "Direct vertical distribution bypassing midfield to target tall forwards.", color: "#aaaaaa" },
  "park-the-bus": { name: "Park the Bus", desc: "Extremely deep defensive block prioritizing absolute safety.", color: "#555555" },
  "wing-play": { name: "Wing Play", desc: "Spreads play wide to cross balls into the box from the flanks.", color: "#cccccc" }
};

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

const FORMATIONS = ["4-3-3", "4-4-2", "3-5-2", "5-4-1", "4-2-3-1", "3-4-3"];

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

const getPlayerPositions = (formation) => {
  const layouts = {
    "4-4-2": [
      { top: '88%', left: '50%' },
      { top: '70%', left: '15%' }, { top: '72%', left: '38%' }, { top: '72%', left: '62%' }, { top: '70%', left: '85%' },
      { top: '48%', left: '15%' }, { top: '50%', left: '38%' }, { top: '50%', left: '62%' }, { top: '48%', left: '85%' },
      { top: '24%', left: '35%' }, { top: '24%', left: '65%' }
    ],
    "3-5-2": [
      { top: '88%', left: '50%' },
      { top: '72%', left: '22%' }, { top: '74%', left: '50%' }, { top: '72%', left: '78%' },
      { top: '52%', left: '15%' }, { top: '50%', left: '35%' }, { top: '54%', left: '50%' }, { top: '50%', left: '65%' }, { top: '52%', left: '85%' },
      { top: '24%', left: '35%' }, { top: '24%', left: '65%' }
    ],
    "5-4-1": [
      { top: '88%', left: '50%' },
      { top: '70%', left: '12%' }, { top: '72%', left: '32%' }, { top: '74%', left: '50%' }, { top: '72%', left: '68%' }, { top: '70%', left: '88%' },
      { top: '48%', left: '20%' }, { top: '50%', left: '40%' }, { top: '50%', left: '60%' }, { top: '48%', left: '80%' },
      { top: '22%', left: '50%' }
    ],
    "4-2-3-1": [
      { top: '88%', left: '50%' },
      { top: '70%', left: '15%' }, { top: '72%', left: '38%' }, { top: '72%', left: '62%' }, { top: '70%', left: '85%' },
      { top: '54%', left: '35%' }, { top: '54%', left: '65%' },
      { top: '42%', left: '18%' }, { top: '38%', left: '50%' }, { top: '42%', left: '82%' },
      { top: '22%', left: '50%' }
    ],
    "3-4-3": [
      { top: '88%', left: '50%' },
      { top: '72%', left: '22%' }, { top: '74%', left: '50%' }, { top: '72%', left: '78%' },
      { top: '50%', left: '15%' }, { top: '52%', left: '38%' }, { top: '52%', left: '62%' }, { top: '50%', left: '85%' },
      { top: '24%', left: '20%' }, { top: '20%', left: '50%' }, { top: '24%', left: '80%' }
    ],
    "4-3-3": [
      { top: '88%', left: '50%' },
      { top: '70%', left: '15%' }, { top: '72%', left: '38%' }, { top: '72%', left: '62%' }, { top: '70%', left: '85%' },
      { top: '50%', left: '25%' }, { top: '54%', left: '50%' }, { top: '50%', left: '75%' },
      { top: '24%', left: '20%' }, { top: '20%', left: '50%' }, { top: '24%', left: '80%' }
    ]
  };
  return layouts[formation] || layouts["4-3-3"];
};

// Position compatibility checker helper
function isPositionCompatible(playerPos, slotLabel) {
  if (playerPos === "GK") return slotLabel === "GK";
  if (playerPos === "DEF") return ["DEF", "LB", "CB", "RB", "LWB", "RWB"].includes(slotLabel);
  if (playerPos === "MID") return ["MID", "CM", "CDM", "CAM", "LM", "RM"].includes(slotLabel);
  if (playerPos === "FWD") return ["FWD", "ST", "LW", "RW"].includes(slotLabel);
  return false;
}

// 38-0-0 style jersey rendering helpers
const NATION_COLORS = {
  "england": ['#ffffff', '#cf081b'],
  "france": ['#00209f', '#ffffff'],
  "brazil": ['#f1c40f', '#00209f'],
  "argentina": ['#75aadb', '#ffffff'],
  "portugal": ['#8c0424', '#046c4c'],
  "germany": ['#ffffff', '#000000'],
  "spain": ['#c0392b', '#f1c40f'],
  "italy": ['#1f75fe', '#ffffff'],
  "netherlands": ['#e67e22', '#000000'],
  "croatia": ['#ffffff', '#cf081b'],
  "uruguay": ['#5cb5e6', '#000000'],
  "morocco": ['#c0392b', '#2ecc71'],
  "japan": ['#000080', '#ffffff'],
  "usa": ['#ffffff', '#00209f'],
  "belgium": ['#c0392b', '#f1c40f'],
  "senegal": ['#ffffff', '#27ae60'],
  "mexico": ['#27ae60', '#ffffff'],
  "canada": ['#c0392b', '#ffffff'],
  "south korea": ['#e81e25', '#00209f'],
  "australia": ['#f1c40f', '#27ae60'],
  "cameroon": ['#27ae60', '#c0392b'],
  "nigeria": ['#27ae60', '#ffffff'],
  "ghana": ['#ffffff', '#000000'],
  "ecuador": ['#f1c40f', '#00209f'],
  "switzerland": ['#c0392b', '#ffffff'],
  "poland": ['#ffffff', '#c0392b'],
  "denmark": ['#c0392b', '#ffffff'],
  "sweden": ['#f1c40f', '#00209f'],
  "ukraine": ['#f1c40f', '#0080ff'],
  "wales": ['#c0392b', '#ffffff'],
  "saudi arabia": ['#27ae60', '#ffffff'],
  "iran": ['#ffffff', '#27ae60'],
  "tunisia": ['#ffffff', '#c0392b'],
  "algeria": ['#ffffff', '#27ae60'],
  "egypt": ['#c0392b', '#ffffff'],
  "costa rica": ['#c0392b', '#00209f'],
  "bulgaria": ['#ffffff', '#27ae60'],
  "turkey": ['#c0392b', '#ffffff'],
  "colombia": ['#f1c40f', '#00209f'],
  "peru": ['#ffffff', '#c0392b'],
  "chile": ['#c0392b', '#00209f'],
  "austria": ['#c0392b', '#ffffff'],
  "hungary": ['#c0392b', '#27ae60'],
  "scotland": ['#0b2240', '#ffffff'],
  "norway": ['#c0392b', '#00209f'],
  "czech republic": ['#c0392b', '#ffffff'],
  "greece": ['#0d5df2', '#ffffff'],
  "serbia": ['#c0392b', '#ffffff']
};

function hexToGrayscale(hex, isInk = false) {
  if (!hex || hex.length < 7) return isInk ? '#000000' : '#ffffff';
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  
  if (isNaN(r) || isNaN(g) || isNaN(b)) {
    return isInk ? '#000000' : '#ffffff';
  }

  const luma = 0.299 * r + 0.587 * g + 0.114 * b;
  
  if (isInk) {
    return luma < 128 ? '#ffffff' : '#000000';
  }
  
  let q;
  if (luma < 64) q = 30;
  else if (luma < 128) q = 100;
  else if (luma < 192) q = 180;
  else q = 245;
  
  return `rgb(${q}, ${q}, ${q})`;
}

function getNationColors(teamId) {
  if (!teamId) return ['#f0f0f0', '#101010'];
  const lower = teamId.toLowerCase().replace(/_/g, ' ');
  let origColors = ['#f0f0f0', '#101010'];
  for (const country in NATION_COLORS) {
    if (lower.includes(country)) {
      origColors = NATION_COLORS[country];
      break;
    }
  }
  const bgGrayscale = hexToGrayscale(origColors[0], false);
  const fgGrayscale = hexToGrayscale(origColors[0], true);
  return [bgGrayscale, fgGrayscale];
}

const playerImageCache = new Map();

function PlayerImageOrJersey({ name, teamId, size = 42 }) {
  const [imgUrl, setImgUrl] = useState(playerImageCache.get(name) || null);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (playerImageCache.has(name)) {
      setImgUrl(playerImageCache.get(name));
      return;
    }

    let isMounted = true;
    const fetchImage = async () => {
      try {
        const query = encodeURIComponent(name);
        const url = `https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${query}&gsrlimit=1&prop=pageimages&pithumbsize=120&format=json&origin=*`;
        
        const res = await fetch(url);
        const data = await res.json();
        
        if (data.query && data.query.pages) {
          const pages = data.query.pages;
          const pageId = Object.keys(pages)[0];
          const thumbnail = pages[pageId]?.thumbnail;
          if (thumbnail && thumbnail.source) {
            const src = thumbnail.source;
            playerImageCache.set(name, src);
            if (isMounted) {
              setImgUrl(src);
            }
            return;
          }
        }
      } catch (e) {
        console.error("Wikimedia error for " + name, e);
      }
      
      playerImageCache.set(name, null);
    };

    fetchImage();
    return () => {
      isMounted = false;
    };
  }, [name]);

  const initials = getInitials(name);
  const fallbackJersey = renderJerseySVG(teamId, initials, size);

  if (imgUrl && !hasError) {
    return (
      <div 
        className="player-avatar-wrapper"
        style={{ 
          width: size, 
          height: size, 
          borderRadius: '50%', 
          overflow: 'hidden', 
          border: '1.5px solid var(--color-gold)', 
          background: '#090909',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 0 8px rgba(255,215,0,0.25)',
          position: 'relative'
        }}
      >
        <img 
          src={imgUrl} 
          alt={name} 
          style={{ 
            width: '100%', 
            height: '100%', 
            objectFit: 'cover'
          }} 
          onError={() => {
            playerImageCache.set(name, null);
            setHasError(true);
          }}
        />
      </div>
    );
  }

  return fallbackJersey;
}

const JERSEY_PATH = 'M22 6 L10 12 L4 26 L14 32 L20 27 L20 58 L44 58 L44 27 L50 32 L60 26 L54 12 L42 6 C42 6 38 12 32 12 C26 12 22 6 22 6 Z';
function renderJerseySVG(teamId, initials, size = 42) {
  const [bg, ink] = getNationColors(teamId);
  const lower = (teamId || "").toLowerCase();
  
  let fillVal = bg;
  
  if (lower.includes("argentina")) {
    fillVal = "url(#stripes-jersey)";
  } else if (lower.includes("croatia")) {
    fillVal = "url(#checker-jersey)";
  } else if (lower.includes("brazil") || lower.includes("germany") || lower.includes("spain") || lower.includes("italy")) {
    fillVal = `url(#dither-jersey-${lower.includes("brazil") || lower.includes("spain") ? 'light' : 'dark'})`;
  }

  return (
    <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true" style={{ display: 'block' }}>
      <defs>
        <pattern id="stripes-jersey" width="12" height="12" patternUnits="userSpaceOnUse">
          <rect width="6" height="12" fill="#f0f0f0" />
          <rect x="6" width="6" height="12" fill="#606060" />
        </pattern>
        <pattern id="checker-jersey" width="12" height="12" patternUnits="userSpaceOnUse">
          <rect width="6" height="6" fill="#f0f0f0" />
          <rect x="6" width="6" height="6" fill="#303030" />
          <rect y="6" width="6" height="6" fill="#303030" />
          <rect x="6" y="6" width="6" height="6" fill="#f0f0f0" />
        </pattern>
        <pattern id="dither-jersey-light" width="4" height="4" patternUnits="userSpaceOnUse">
          <rect width="4" height="4" fill="#e0e0e0" />
          <rect width="2" height="2" fill="#808080" />
          <rect x="2" y="2" width="2" height="2" fill="#808080" />
        </pattern>
        <pattern id="dither-jersey-dark" width="4" height="4" patternUnits="userSpaceOnUse">
          <rect width="4" height="4" fill="#303030" />
          <rect width="2" height="2" fill="#a0a0a0" />
          <rect x="2" y="2" width="2" height="2" fill="#a0a0a0" />
        </pattern>
      </defs>
      <path d={JERSEY_PATH} fill={fillVal} stroke="rgba(255,255,255,.3)" strokeWidth="2"/>
      <circle cx="32" cy="40" r="11" fill={ink === '#ffffff' ? '#000000' : '#ffffff'} opacity="0.85" />
      <text x="32" y="44" textAnchor="middle" fontFamily="'Share Tech Mono', monospace" fontSize="13" fontWeight="900" fill={ink}>
        {initials}
      </text>
    </svg>
  );
}

function getInitials(name) {
  if (!name) return '??';
  const parts = name.replace(/\./g, '').split(/\s+/).filter(Boolean);
  if (!parts.length) return '??';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function ovClass(o) {
  if (o >= 90) return 'ov-90';
  if (o >= 80) return 'ov-80';
  if (o >= 75) return 'ov-75';
  if (o >= 70) return 'ov-70';
  return 'ov-low';
}

const ConfettiCelebration = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let animationFrameId;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const colors = ['#f1c40f', '#e74c3c', '#3498db', '#2ecc71', '#9b59b6', '#e67e22', '#1abc9c'];
    const particles = [];

    for (let i = 0; i < 150; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height - canvas.height,
        r: Math.random() * 6 + 4,
        d: Math.random() * canvas.height,
        color: colors[Math.floor(Math.random() * colors.length)],
        tilt: Math.random() * 10 - 5,
        tiltAngleIncremental: Math.random() * 0.07 + 0.02,
        tiltAngle: 0
      });
    }

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach((p, idx) => {
        p.tiltAngle += p.tiltAngleIncremental;
        p.y += (Math.cos(p.d) + 3 + p.r / 2) / 2;
        p.x += Math.sin(p.tiltAngle);
        p.tilt = Math.sin(p.tiltAngle - idx / 3) * 15;

        ctx.beginPath();
        ctx.lineWidth = p.r;
        ctx.strokeStyle = p.color;
        ctx.moveTo(p.x + p.tilt + p.r / 2, p.y);
        ctx.lineTo(p.x + p.tilt, p.y + p.tilt + p.r / 2);
        ctx.stroke();

        if (p.y > canvas.height) {
          particles[idx] = {
            x: Math.random() * canvas.width,
            y: -20,
            r: p.r,
            d: p.d,
            color: p.color,
            tilt: p.tilt,
            tiltAngleIncremental: p.tiltAngleIncremental,
            tiltAngle: p.tiltAngle
          };
        }
      });

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <canvas 
      ref={canvasRef} 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        zIndex: 999999
      }}
    />
  );
};

export default function App() {
  const [socket, setSocket] = useState(null);
  const [introState, setIntroState] = useState('playing'); // 'playing' | 'fading' | 'done'
  const [playerName, setPlayerName] = useState('');
  const [roomId, setRoomId] = useState('');
  const [isSinglePlayer, setIsSinglePlayer] = useState(false);
  const [screenLoading, setScreenLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('LOADING SYSTEM...');

  const [landingSubmenu, setLandingSubmenu] = useState("MAIN"); // MAIN, MULTIPLAYER_CHOOSE, LOCAL_LOBBY, GLOBAL_MATCHMAKING
  const [activeRooms, setActiveRooms] = useState([]);
  const [globalLeaderboard, setGlobalLeaderboard] = useState([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);
  const playerNameRef = useRef('');

  useEffect(() => {
    playerNameRef.current = playerName;
  }, [playerName]);

  useEffect(() => {
    const timer1 = setTimeout(() => {
      setIntroState('fading');
    }, 3200);
    const timer2 = setTimeout(() => {
      setIntroState('done');
    }, 4000);
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, []);
  
  const [room, setRoom] = useState(null);
  const [localPlayer, setLocalPlayer] = useState(null);

  // Drafting states
  const [draftData, setDraftData] = useState(null); // { round, type, choices, teamName }
  const [selectedCard, setSelectedCard] = useState(null); // Active player card chosen from roster
  const [isSpinning, setIsSpinning] = useState(false);
  const [spinDegree, setSpinDegree] = useState(0);
  const [hasSpun, setHasSpun] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Bench Swap
  const [selectedSwapSlot, setSelectedSwapSlot] = useState(null); // { type: 'squad' | 'sub', index: number }
  const [showTimeoutPopup, setShowTimeoutPopup] = useState(false);
  const [countdown, setCountdown] = useState(30);

  // Navigation tabs for tournament dashboard
  const [activeDashboardTab, setActiveDashboardTab] = useState("SCOUTING"); // SCOUTING, STANDINGS, STATS
  const [selectedStandingsGroup, setSelectedStandingsGroup] = useState("A"); // A..L

  // Match Simulation
  const [simulationActive, setSimulationActive] = useState(false);
  const [simFinished, setSimFinished] = useState(false);
  const [simDetails, setSimDetails] = useState(null);
  const [visibleEvents, setVisibleEvents] = useState([]);
  const [eventIndex, setEventIndex] = useState(0);
  const eventListEndRef = useRef(null);

  // Live Field & Interactive Shootout
  const [ballPos, setBallPos] = useState({ x: '50%', y: '50%' });
  const [alertMessage, setAlertMessage] = useState('');
  const [shootoutState, setShootoutState] = useState(null); // 'shoot' | 'save' | null
  const [shootoutEvent, setShootoutEvent] = useState(null);
  const [prevShootoutEventsLength, setPrevShootoutEventsLength] = useState(0);
  const startingTournamentRef = useRef(false);

  const handleInteractiveShootoutChoice = (spotIdx) => {
    if (!room || !socket) return;
    socket.emit('submit_shootout_choice', { roomId: room.roomId, choice: spotIdx });
  };

  const handleUpdatePlayStyle = (playStyle) => {
    if (socket && room) {
      socket.emit('update_play_style', { roomId: room.roomId, playStyle });
    }
  };

  const handleShootoutChoice = (spotIdx) => {
    if (!shootoutEvent) return;

    const spots = {
      1: { x: '35%', y: '32%' },
      2: { x: '50%', y: '30%' },
      3: { x: '65%', y: '32%' },
      4: { x: '34%', y: '45%' },
      5: { x: '50%', y: '43%' },
      6: { x: '66%', y: '45%' },
      7: { x: '36%', y: '58%' },
      8: { x: '50%', y: '56%' },
      9: { x: '64%', y: '58%' }
    };

    const targetPos = spots[spotIdx] || { x: '50%', y: '43%' };
    setBallPos(targetPos);
    playSound('kick');

    // Wait a brief moment to show ball travel, then reveal outcome
    setTimeout(() => {
      setVisibleEvents(prev => [...prev, shootoutEvent]);
      setEventIndex(idx => idx + 1);

      if (shootoutEvent.type === 'goal') {
        setAlertMessage('GOAL!');
        playSound('goal');
      } else {
        setAlertMessage('SAVED / MISSED!');
        playSound('kick');
      }

      // Clear shootout states to resume simulation
      setShootoutState(null);
      setShootoutEvent(null);
      
      // Clear alert message after 1.5s
      setTimeout(() => setAlertMessage(''), 1500);
    }, 1000);
  };

  // Supabase Authentication states
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [authMode, setAuthMode] = useState(isSupabaseConfigured ? "LOGIN" : "GUEST"); // LOGIN, SIGNUP, GUEST
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState("");

  // Local/Custom Manager Login states (for password authentication without email)
  const [loginManagerName, setLoginManagerName] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [localAuthError, setLocalAuthError] = useState("");
  const [localAuthSuccess, setLocalAuthSuccess] = useState("");

  // Retro popup states for unregistered users
  const [showSignUpPopup, setShowSignUpPopup] = useState(false);
  const [pendingUsername, setPendingUsername] = useState("");
  const [pendingPassword, setPendingPassword] = useState("");

  // Supabase Tournament History states
  const [supabaseTournamentId, setSupabaseTournamentId] = useState(null);
  const [activeTournaments, setActiveTournaments] = useState([]);
  const [loadingActiveTournaments, setLoadingActiveTournaments] = useState(false);
  const [historicalRuns, setHistoricalRuns] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [expandedRunId, setExpandedRunId] = useState(null);

  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [pendingExitAction, setPendingExitAction] = useState(null);

  // Supabase & Local Session Hooks
  useEffect(() => {
    // Check local storage manager profile first
    const savedManager = localStorage.getItem('logged_in_manager');
    if (savedManager) {
      setPlayerName(savedManager);
      setUser({
        id: 'local-' + savedManager.toLowerCase(),
        email: savedManager,
        user_metadata: { username: savedManager }
      });
    }

    if (!supabase) return;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSession(session);
        setUser(session.user);
        setPlayerName(session.user.user_metadata?.username || session.user.email.split('@')[0]);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setSession(session);
        setUser(session.user);
        setPlayerName(session.user.user_metadata?.username || session.user.email.split('@')[0]);
      } else {
        setSession(null);
        // Only clear user if we are not logged in locally either
        if (!localStorage.getItem('logged_in_manager')) {
          setUser(null);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLocalSignIn = async (e) => {
    e.preventDefault();
    setLocalAuthError("");
    setLocalAuthSuccess("");
    if (!loginManagerName || !loginPassword) {
      setLocalAuthError("Please enter both Manager Name and Password.");
      return;
    }

    const trimmedName = loginManagerName.trim();
    const lowerName = trimmedName.toLowerCase().replace(/\s+/g, '_');

    if (supabase && isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('manager_accounts')
          .select('username, password')
          .eq('username', trimmedName)
          .maybeSingle();

        if (error) throw error;

        if (!data) {
          // User not found in Supabase -> Show popup to confirm creation
          setPendingUsername(trimmedName);
          setPendingPassword(loginPassword);
          setShowSignUpPopup(true);
          return;
        }

        if (data.password !== loginPassword) {
          setLocalAuthError("Incorrect password for this manager.");
          return;
        }

        // Login successful via Supabase table
        localStorage.setItem('logged_in_manager', trimmedName);
        setPlayerName(trimmedName);
        setUser({
          id: 'local-' + lowerName,
          email: trimmedName,
          user_metadata: { username: trimmedName }
        });
        setLocalAuthSuccess(`Welcome back, Manager ${trimmedName}!`);
        playSound('whistle');
      } catch (err) {
        setLocalAuthError(err.message);
      }
    } else {
      // Local fallback
      const saved = localStorage.getItem('registered_managers');
      const managers = saved ? JSON.parse(saved) : {};

      if (!managers[lowerName]) {
        // User not found -> Show popup to confirm creation
        setPendingUsername(trimmedName);
        setPendingPassword(loginPassword);
        setShowSignUpPopup(true);
        return;
      }

      if (managers[lowerName] !== loginPassword) {
        setLocalAuthError("Incorrect password for this manager.");
        return;
      }

      // Login successful locally
      localStorage.setItem('logged_in_manager', trimmedName);
      setPlayerName(trimmedName);
      setUser({
        id: 'local-' + lowerName,
        email: trimmedName,
        user_metadata: { username: trimmedName }
      });
      setLocalAuthSuccess(`Welcome back, Manager ${trimmedName}!`);
      playSound('whistle');
    }
  };

  const handleConfirmSignUp = async () => {
    if (!pendingUsername || !pendingPassword) return;
    
    if (pendingPassword.length < 6) {
      setLocalAuthError("Password must be at least 6 characters.");
      setShowSignUpPopup(false);
      return;
    }

    const trimmedName = pendingUsername.trim();
    const lowerName = trimmedName.toLowerCase().replace(/\s+/g, '_');

    if (supabase && isSupabaseConfigured) {
      try {
        const { error } = await supabase
          .from('manager_accounts')
          .insert({
            username: trimmedName,
            password: pendingPassword
          });

        if (error) {
          if (error.message.includes("duplicate key")) {
            throw new Error("This manager name is already registered. Try signing in!");
          }
          throw error;
        }

        // Auto login
        localStorage.setItem('logged_in_manager', trimmedName);
        setPlayerName(trimmedName);
        setUser({
          id: 'local-' + lowerName,
          email: trimmedName,
          user_metadata: { username: trimmedName }
        });
        setLocalAuthSuccess(`Profile created in Supabase! Welcome, Manager ${trimmedName}.`);
        playSound('whistle');
      } catch (err) {
        setLocalAuthError(err.message);
      } finally {
        setShowSignUpPopup(false);
        setPendingUsername("");
        setPendingPassword("");
      }
    } else {
      // Local fallback
      const saved = localStorage.getItem('registered_managers');
      const managers = saved ? JSON.parse(saved) : {};

      // Save registration
      managers[lowerName] = pendingPassword;
      localStorage.setItem('registered_managers', JSON.stringify(managers));

      // Auto log-in
      localStorage.setItem('logged_in_manager', trimmedName);
      setPlayerName(trimmedName);
      setUser({
        id: 'local-' + lowerName,
        email: trimmedName,
        user_metadata: { username: trimmedName }
      });
      setLocalAuthSuccess(`Profile created! Welcome, Manager ${trimmedName}.`);
      playSound('whistle');

      // Reset states
      setShowSignUpPopup(false);
      setPendingUsername("");
      setPendingPassword("");
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    if (!email || !password) return;
    setAuthError("");
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username: email.split('@')[0]
          }
        }
      });
      if (error) throw error;
      setAuthError("Check your email for confirmation link!");
    } catch (err) {
      setAuthError(err.message);
    }
  };

  const handleLogIn = async (e) => {
    e.preventDefault();
    if (!email || !password) return;
    setAuthError("");
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      if (error) throw error;
    } catch (err) {
      setAuthError(err.message);
    }
  };

  const handleLogOut = async () => {
    if (supabase && isSupabaseConfigured) {
      await supabase.auth.signOut();
    }
    localStorage.removeItem('logged_in_manager');
    setSession(null);
    setUser(null);
    setAuthMode("LOGIN");
    setShowSignUpPopup(false);
    setLocalAuthError("");
    setLocalAuthSuccess("");
  };

  const startSupabaseTournament = async (roomState) => {
    const localId = 'local-' + Math.random().toString(36).substring(2, 9);
    setSupabaseTournamentId(localId);

    // Save to active tournaments initially
    if (roomState.isSinglePlayer && roomState.aiMode === 'tournament') {
      const updatedState = { ...roomState, supabaseTournamentId: localId };
      await saveActiveTournament(updatedState);
    }

    if (!supabase || !user || user.id.startsWith('local-')) return;

    try {
      const userPlayer = roomState.players.find(p => p.id === socket?.id) || roomState.players[0];
      const { data, error } = await supabase
        .from('tournaments')
        .insert({
          user_id: user.id,
          user_name: user.user_metadata?.username || user.email.split('@')[0],
          user_team: userPlayer?.teamName || "Brazil",
          type: roomState.isSinglePlayer ? 'AI' : 'Friend',
          stages_played: 0,
          won_cup: false
        })
        .select()
        .single();

      if (error) throw error;
      setSupabaseTournamentId(data.id);

      // Update active tournament with correct supabase database tournament id
      if (roomState.isSinglePlayer && roomState.aiMode === 'tournament') {
        const updatedState = { ...roomState, supabaseTournamentId: data.id };
        await saveActiveTournament(updatedState);
      }
    } catch (err) {
      console.error("Error creating tournament record:", err.message);
    }
  };

  const saveActiveTournament = async (roomState) => {
    if (!roomState) return false;
    
    const stateToSave = {
      ...roomState,
      supabaseTournamentId: supabaseTournamentId || roomState.supabaseTournamentId
    };

    if (supabase && isSupabaseConfigured && user && !user.id.startsWith('local-')) {
      try {
        let activeId = roomState.activeTournamentId;
        if (!activeId) {
          const { data: list, error: countError } = await supabase
            .from('active_tournaments')
            .select('id')
            .eq('user_id', user.id);
          
          if (!countError && list && list.length >= 5) {
            setAlertMessage("MAX ACTIVE TOURNAMENTS (5) REACHED! PLEASE TERMINATE A SESSION FIRST.");
            setTimeout(() => setAlertMessage(''), 3000);
            return false;
          }

          const { data, error } = await supabase
            .from('active_tournaments')
            .insert({
              user_id: user.id,
              user_name: playerName,
              room_state: stateToSave
            })
            .select()
            .single();
          
          if (error) throw error;
          if (data) {
            roomState.activeTournamentId = data.id;
          }
        } else {
          const { error } = await supabase
            .from('active_tournaments')
            .update({
              room_state: stateToSave,
              last_saved_at: new Date().toISOString()
            })
            .eq('id', activeId);
          
          if (error) throw error;
        }
        return true;
      } catch (err) {
        console.error("Error saving active tournament:", err.message);
        return false;
      }
    } else {
      // Local storage fallback for Guest
      try {
        const localActive = JSON.parse(localStorage.getItem('active_tournaments') || '[]');
        let activeId = roomState.activeTournamentId;
        
        if (!activeId) {
          const userActiveCount = localActive.filter(t => t.user_id === user?.id || t.user_name === playerName).length;
          if (userActiveCount >= 5) {
            setAlertMessage("MAX ACTIVE TOURNAMENTS (5) REACHED! PLEASE TERMINATE A SESSION FIRST.");
            setTimeout(() => setAlertMessage(''), 3000);
            return false;
          }
          activeId = 'active-local-' + Date.now();
          roomState.activeTournamentId = activeId;
          stateToSave.activeTournamentId = activeId;

          localActive.push({
            id: activeId,
            user_id: user?.id || 'local-guest',
            user_name: playerName,
            created_at: new Date().toISOString(),
            last_saved_at: new Date().toISOString(),
            room_state: stateToSave
          });
        } else {
          const idx = localActive.findIndex(t => t.id === activeId);
          if (idx !== -1) {
            localActive[idx].room_state = stateToSave;
            localActive[idx].last_saved_at = new Date().toISOString();
          } else {
            localActive.push({
              id: activeId,
              user_id: user?.id || 'local-guest',
              user_name: playerName,
              created_at: new Date().toISOString(),
              last_saved_at: new Date().toISOString(),
              room_state: stateToSave
            });
          }
        }
        localStorage.setItem('active_tournaments', JSON.stringify(localActive));
        return true;
      } catch (e) {
        console.warn("Error saving active tournament locally:", e);
        return false;
      }
    }
  };

  const terminateActiveTournament = async (roomState) => {
    if (!roomState) return;

    const activeId = roomState.activeTournamentId;
    const tourneyId = supabaseTournamentId || roomState.supabaseTournamentId;

    // 1. Log to history as Terminated
    try {
      const localHistory = JSON.parse(localStorage.getItem('local_match_history') || '[]');
      const userPlayer = roomState.players?.find(p => p.id === socket?.id) || roomState.players?.[0];
      const existingIdx = localHistory.findIndex(t => t.id === tourneyId);
      if (existingIdx !== -1) {
        localHistory[existingIdx].is_terminated = true;
        localHistory[existingIdx].won_cup = false;
      } else {
        localHistory.push({
          id: tourneyId || 'local-' + Date.now(),
          user_team: userPlayer?.teamName || "Brazil",
          type: 'AI',
          stages_played: roomState.matchesPlayed || 0,
          won_cup: false,
          is_terminated: true,
          created_at: new Date().toISOString(),
          tournament_matches: []
        });
      }
      localStorage.setItem('local_match_history', JSON.stringify(localHistory));
    } catch (e) {
      console.warn("Local history log error on terminate:", e);
    }

    if (supabase && isSupabaseConfigured && user && tourneyId && !tourneyId.startsWith('local-')) {
      try {
        await supabase
          .from('tournaments')
          .update({
            is_terminated: true,
            won_cup: false
          })
          .eq('id', tourneyId);
      } catch (err) {
        console.error("Supabase history update error on terminate:", err.message);
      }
    }

    // 2. Free the slot (delete from active tournaments)
    if (supabase && isSupabaseConfigured && user && activeId && !activeId.startsWith('active-local-')) {
      try {
        await supabase
          .from('active_tournaments')
          .delete()
          .eq('id', activeId);
      } catch (err) {
        console.error("Supabase active delete error on terminate:", err.message);
      }
    } else if (activeId) {
      try {
        const localActive = JSON.parse(localStorage.getItem('active_tournaments') || '[]');
        const updated = localActive.filter(t => t.id !== activeId);
        localStorage.setItem('active_tournaments', JSON.stringify(updated));
      } catch (e) {
        console.warn("Local active delete error on terminate:", e);
      }
    }
  };

  const fetchActiveTournaments = async () => {
    setLoadingActiveTournaments(true);
    if (supabase && isSupabaseConfigured && user && !user.id.startsWith('local-')) {
      try {
        const { data, error } = await supabase
          .from('active_tournaments')
          .select('*')
          .eq('user_id', user.id)
          .order('last_saved_at', { ascending: false });

        if (error) throw error;
        setActiveTournaments(data || []);
      } catch (err) {
        console.error("Error fetching active tournaments:", err.message);
      }
    } else {
      try {
        const localActive = JSON.parse(localStorage.getItem('active_tournaments') || '[]');
        const filtered = localActive.filter(t => t.user_id === user?.id || t.user_name === playerName);
        setActiveTournaments(filtered);
      } catch (e) {
        console.warn("Error reading local active tournaments:", e);
      }
    }
    setLoadingActiveTournaments(false);
  };

  const handleResumeTournament = (tourney) => {
    if (!playerName || !tourney || !tourney.room_state) return;

    setLoadingText('RESUMING CAMPAIGN...');
    setScreenLoading(true);

    const roomState = tourney.room_state;
    roomState.activeTournamentId = tourney.id;
    setSupabaseTournamentId(roomState.supabaseTournamentId || null);
    setRoomId(roomState.roomId);
    setIsSinglePlayer(true);

    setTimeout(() => {
      if (socket) {
        socket.emit('resume_room', { roomState });
      }
      setScreenLoading(false);
    }, 600);
  };

  const handleDeleteActiveTournament = async (tourney) => {
    if (!tourney) return;
    if (window.confirm("Are you sure you want to terminate this campaign? It will be marked as Terminated in history and the slot will be freed.")) {
      setLoadingActiveTournaments(true);
      await terminateActiveTournament(tourney.room_state);
      await fetchActiveTournaments();
    }
  };

  const handleStartSingleMatch = () => {
    if (!playerName) return;
    setLoadingText('BOOTING QUICK MATCH...');
    setScreenLoading(true);
    const rId = "SOLO-" + Math.random().toString(36).substring(2, 6).toUpperCase();
    setRoomId(rId);
    setIsSinglePlayer(true);
    setTimeout(() => {
      socket.emit('join_room', { 
        roomId: rId, 
        playerName, 
        isHost: true, 
        isSinglePlayer: true,
        aiMode: 'single'
      });
      setScreenLoading(false);
    }, 600);
  };

  const handleStartTournamentCampaign = () => {
    if (!playerName) return;
    setLoadingText('BOOTING CAMPAIGN...');
    setScreenLoading(true);
    const rId = "SOLO-" + Math.random().toString(36).substring(2, 6).toUpperCase();
    setRoomId(rId);
    setIsSinglePlayer(true);
    setTimeout(() => {
      socket.emit('join_room', { 
        roomId: rId, 
        playerName, 
        isHost: true, 
        isSinglePlayer: true,
        aiMode: 'tournament'
      });
      setScreenLoading(false);
    }, 600);
  };

  const saveMatchToSupabase = async (matchDetails, roomState) => {
    // Determine if local player won in multiplayer
    const isP1 = matchDetails.playerAName === playerName;
    const isWinner = isP1 
      ? matchDetails.scoreA > matchDetails.scoreB 
      : matchDetails.scoreB > matchDetails.scoreA;

    const wonCup = roomState.isSinglePlayer 
      ? (roomState.status === 'finished' && matchDetails.matchNum >= 8 && (matchDetails.scoreA > matchDetails.scoreB))
      : (roomState.status === 'finished' && isWinner);

    if (wonCup && playerName) {
      try {
        const localLeaderboard = JSON.parse(localStorage.getItem('local_leaderboard_stats') || '{}');
        localLeaderboard[playerName] = (localLeaderboard[playerName] || 0) + 1;
        localStorage.setItem('local_leaderboard_stats', JSON.stringify(localLeaderboard));
      } catch (e) {
        console.warn("Local storage error:", e);
      }
    }

    // Always log to local storage match history as fallback/record
    try {
      const localHistory = JSON.parse(localStorage.getItem('local_match_history') || '[]');
      const userPlayer = roomState.players.find(p => p.id === socket?.id) || roomState.players[0];
      // Create a record matching the tournament database structure
      const newMatchRecord = {
        id: supabaseTournamentId || 'local-' + Date.now(),
        user_team: userPlayer?.teamName || "Brazil",
        type: roomState.isSinglePlayer ? 'AI' : 'Friend',
        stages_played: matchDetails.matchNum,
        won_cup: wonCup,
        created_at: new Date().toISOString(),
        tournament_matches: [{
          match_num: matchDetails.matchNum,
          team_a_name: matchDetails.teamAName,
          team_b_name: matchDetails.teamBName,
          score_a: matchDetails.scoreA,
          score_b: matchDetails.scoreB
        }]
      };

      // Check if we should append to an existing tournament in local history or add new
      const existingTourneyIdx = localHistory.findIndex(t => t.id === supabaseTournamentId);
      if (existingTourneyIdx !== -1 && supabaseTournamentId) {
        localHistory[existingTourneyIdx].stages_played = matchDetails.matchNum;
        localHistory[existingTourneyIdx].won_cup = wonCup;
        if (!localHistory[existingTourneyIdx].tournament_matches) {
          localHistory[existingTourneyIdx].tournament_matches = [];
        }
        // Avoid duplicate matches in same tourney
        const hasMatch = localHistory[existingTourneyIdx].tournament_matches.some(m => m.match_num === matchDetails.matchNum);
        if (!hasMatch) {
          localHistory[existingTourneyIdx].tournament_matches.push(newMatchRecord.tournament_matches[0]);
        }
      } else {
        localHistory.push(newMatchRecord);
      }
      localStorage.setItem('local_match_history', JSON.stringify(localHistory));
    } catch (e) {
      console.warn("Local match history error:", e);
    }

    if (!supabase || !user || !supabaseTournamentId) return;

    try {
      if (!roomState.isSinglePlayer) {
        const { error: matchErr } = await supabase
          .from('tournament_matches')
          .insert({
            tournament_id: supabaseTournamentId,
            match_num: matchDetails.matchNum,
            team_a_name: matchDetails.teamAName,
            team_b_name: matchDetails.teamBName,
            score_a: matchDetails.scoreA,
            score_b: matchDetails.scoreB,
            events: matchDetails.events
          });

        if (matchErr) throw matchErr;
      }

      const { error: tournErr } = await supabase
        .from('tournaments')
        .update({
          stages_played: matchDetails.matchNum,
          won_cup: wonCup
        })
        .eq('id', supabaseTournamentId);

      if (tournErr) throw tournErr;
    } catch (err) {
      console.error("Error saving match details:", err.message);
    }

    // Update active tournament record with new roomState, or delete if finished
    if (roomState.isSinglePlayer && roomState.aiMode === 'tournament') {
      if (roomState.status === 'finished') {
        const activeId = roomState.activeTournamentId;
        if (activeId) {
          if (supabase && isSupabaseConfigured && user && !user.id.startsWith('local-') && !activeId.startsWith('active-local-')) {
            supabase.from('active_tournaments').delete().eq('id', activeId).then(({ error }) => {
              if (error) console.error("Error deleting finished active tournament:", error.message);
            });
          } else {
            try {
              const localActive = JSON.parse(localStorage.getItem('active_tournaments') || '[]');
              const updated = localActive.filter(t => t.id !== activeId);
              localStorage.setItem('active_tournaments', JSON.stringify(updated));
            } catch (e) {
              console.warn("Error deleting finished active tournament locally:", e);
            }
          }
        }
      } else {
        saveActiveTournament(roomState);
      }
    }
  };

  const loadTournamentHistory = async () => {
    let localHistory = [];
    try {
      localHistory = JSON.parse(localStorage.getItem('local_match_history') || '[]');
    } catch (e) {
      console.warn("Error reading local match history:", e);
    }

    if (!supabase || !user) {
      setHistoricalRuns(localHistory.sort((a,b) => new Date(b.created_at) - new Date(a.created_at)));
      return;
    }
    setLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from('tournaments')
        .select(`
          id,
          user_team,
          type,
          stages_played,
          won_cup,
          is_terminated,
          created_at,
          tournament_matches (
            match_num,
            team_a_name,
            team_b_name,
            score_a,
            score_b
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Merge local history and Supabase history, deduplicating by ID
      const merged = [...data];
      localHistory.forEach(localRun => {
        if (!merged.some(dbRun => dbRun.id === localRun.id)) {
          merged.push(localRun);
        }
      });
      // Sort merged history by created_at desc
      merged.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      setHistoricalRuns(merged);
    } catch (err) {
      console.error("Error loading tournament history:", err.message);
      setHistoricalRuns(localHistory.sort((a,b) => new Date(b.created_at) - new Date(a.created_at)));
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (activeDashboardTab === "HISTORY") {
      loadTournamentHistory();
    }
  }, [activeDashboardTab, user]);

  // Audio Synth
  const playSound = (type) => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'whistle') {
        osc.frequency.setValueAtTime(1100, ctx.currentTime);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        osc.start();
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
        setTimeout(() => {
          const osc2 = ctx.createOscillator();
          const gain2 = ctx.createGain();
          osc2.connect(gain2);
          gain2.connect(ctx.destination);
          osc2.frequency.setValueAtTime(1200, ctx.currentTime);
          gain2.gain.setValueAtTime(0.1, ctx.currentTime);
          osc2.start();
          gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
          osc2.stop(ctx.currentTime + 0.3);
        }, 150);
        osc.stop(ctx.currentTime + 0.2);
      } else if (type === 'goal') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(100, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.5);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
        osc.start();
        osc.stop(ctx.currentTime + 0.6);
      } else if (type === 'kick') {
        osc.frequency.setValueAtTime(70, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(20, ctx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.25, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
        osc.start();
        osc.stop(ctx.currentTime + 0.12);
      } else if (type === 'card') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        osc.frequency.setValueAtTime(400, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        osc.start();
        osc.stop(ctx.currentTime + 0.35);
      } else if (type === 'spin') {
        osc.frequency.setValueAtTime(400, ctx.currentTime);
        gain.gain.setValueAtTime(0.02, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
        osc.start();
        osc.stop(ctx.currentTime + 0.05);
      }
    } catch (e) {
      console.warn("Audio Context blocked");
    }
  };

  useEffect(() => {
    const s = io(SOCKET_URL);
    setSocket(s);

    s.on('room_update', (roomState) => {
      setRoom(prevRoom => {
        if (prevRoom && prevRoom.status === 'lobby' && roomState.status === 'drafting') {
          setLoadingText('INITIALIZING DRAFT BOARD...');
          setScreenLoading(true);
          setTimeout(() => {
            setScreenLoading(false);
          }, 800);
        }
        return roomState;
      });
      if (roomState.status === 'shootout') {
        setSimulationActive(true);
        setSimFinished(false);
      }
      const lp = roomState.players.find(p => p.id === s.id);
      setLocalPlayer(lp);

      // Initialize Supabase tournament record if starting tournament (both players do it for their own profiles)
      if (roomState.status === 'tournament' && roomState.matchesPlayed === 0) {
        if (!supabaseTournamentId && !startingTournamentRef.current) {
          startingTournamentRef.current = true;
          startSupabaseTournament(roomState);
        }
      } else if (roomState.status === 'lobby') {
        startingTournamentRef.current = false;
        setSupabaseTournamentId(null);
      }
    });

    s.on('lobby_error', (errorMsg) => {
      alert(errorMsg);
      setScreenLoading(false);
      setRoom(null);
      setLandingSubmenu("MULTIPLAYER_CHOOSE");
    });

    s.on('draft_options', (data) => {
      setDraftData(data);
      setHasSpun(false);
      setIsSpinning(false);
      setSelectedCard(null); // Clear active choice
      setSearchQuery(''); // Reset search text
    });

    s.on('global_queued', () => {
      setLandingSubmenu("GLOBAL_MATCHMAKING");
    });

    s.on('global_matched', ({ roomId, isHost }) => {
      setRoomId(roomId);
      s.emit('join_room', { roomId, playerName: playerNameRef.current, isHost, isSinglePlayer: false });
      setLandingSubmenu("MAIN");
    });

    s.on('global_left', () => {
      setLandingSubmenu("MULTIPLAYER_CHOOSE");
    });

    s.on('local_rooms_list', (roomsList) => {
      setActiveRooms(roomsList);
    });

    s.on('match_simulated', ({ matchDetails, roomState }) => {
      setSimDetails(matchDetails);
      setVisibleEvents([]);
      setEventIndex(0);
      setSimulationActive(true);
      setSimFinished(false);
      setRoom(roomState);
      setShootoutState(null);
      setShootoutEvent(null);
      setBallPos({ x: '50%', y: '50%' });
      playSound('whistle');

      // Save match to Supabase for both players
      saveMatchToSupabase(matchDetails, roomState);
    });

    return () => {
      s.disconnect();
    };
  }, []);

  // Intercept back navigation when in room/game
  useEffect(() => {
    if (!room) return;

    // Push dummy state to capture the popstate
    window.history.pushState({ inRoom: true }, '');

    const handlePopState = (event) => {
      // Restore dummy state immediately to block navigation
      window.history.pushState({ inRoom: true }, '');

      setPendingExitAction(() => () => handleLeaveRoom());
      setShowExitConfirm(true);
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [room, socket]);

  const handleForfeitDueToTimeout = () => {
    if (room && socket) {
      socket.emit('forfeit_game', { roomId: room.roomId });
      socket.emit('leave_room', { roomId: room.roomId });
    }
    if (socket) {
      socket.disconnect();
      socket.connect();
    }
    setRoom(null);
    setDraftData(null);
    setSimulationActive(false);
    setSimDetails(null);
    setSupabaseTournamentId(null);
    setLandingSubmenu("MAIN");
    setShowTimeoutPopup(true);
  };

  useEffect(() => {
    if (landingSubmenu === "TOURNAMENT_MANAGER") {
      fetchActiveTournaments();
    }
  }, [landingSubmenu]);

  useEffect(() => {
    if (room && !room.isSinglePlayer && room.status === 'tournament' && localPlayer && !localPlayer.ready) {
      setCountdown(30);
      const timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            handleForfeitDueToTimeout();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [room?.status, localPlayer?.ready]);

  // Live simulation ticker scroll
  useEffect(() => {
    if (!simulationActive || !simDetails || shootoutState) return;

    if (eventIndex < simDetails.events.length) {
      const nextEv = simDetails.events[eventIndex];

      // Check if this is a penalty kick that needs user interaction
      if (nextEv.text.includes('[Penalty Shootout') && (nextEv.type === 'goal' || nextEv.type === 'miss')) {
        const isUserKick = nextEv.text.includes(localPlayer?.teamName || "");
        setShootoutEvent(nextEv);
        setShootoutState(isUserKick ? 'shoot' : 'save');
        setBallPos({ x: '50%', y: '75%' });
        return;
      }

      const timer = setTimeout(() => {
        setVisibleEvents(prev => [...prev, nextEv]);
        setEventIndex(idx => idx + 1);

        // Update ball position and alerts based on event type
        if (nextEv.type === 'whistle') {
          setBallPos({ x: '50%', y: '50%' });
          if (nextEv.text.includes('decided from the spot') || nextEv.text.includes('PENALTY SHOOTOUT')) {
            setAlertMessage('PENALTIES!');
          } else if (nextEv.text.includes('final whistle') || nextEv.text.includes('Finished')) {
            setAlertMessage('FULL TIME!');
          } else {
            setAlertMessage('KICK OFF!');
          }
          setTimeout(() => setAlertMessage(''), 1500);
          playSound('whistle');
        } else if (nextEv.type === 'goal') {
          if (nextEv.team === 'A') {
            setBallPos({ x: '92%', y: '50%' });
            setAlertMessage('GOAL FOR YOU!');
          } else {
            setBallPos({ x: '8%', y: '50%' });
            setAlertMessage('GOAL AGAINST!');
          }
          setTimeout(() => setAlertMessage(''), 1500);
          playSound('goal');
        } else if (nextEv.type === 'save') {
          if (nextEv.team === 'A') {
            setBallPos({ x: '12%', y: `${35 + Math.random() * 30}%` });
            setAlertMessage('GREAT SAVE!');
          } else {
            setBallPos({ x: '88%', y: `${35 + Math.random() * 30}%` });
            setAlertMessage('OPPONENT SAVE!');
          }
          setTimeout(() => setAlertMessage(''), 1500);
          playSound('kick');
        } else if (nextEv.type === 'miss') {
          if (nextEv.team === 'A') {
            setBallPos({ x: '92%', y: `${20 + Math.random() * 60}%` });
          } else {
            setBallPos({ x: '8%', y: `${20 + Math.random() * 60}%` });
          }
          setAlertMessage('MISSED!');
          setTimeout(() => setAlertMessage(''), 1500);
          playSound('kick');
        } else if (nextEv.type === 'yellow_card') {
          setAlertMessage('YELLOW CARD!');
          setTimeout(() => setAlertMessage(''), 1500);
          playSound('card');
        } else if (nextEv.type === 'red_card') {
          setAlertMessage('RED CARD!');
          setTimeout(() => setAlertMessage(''), 1500);
          playSound('card');
        } else {
          const isA = nextEv.team === 'A';
          const rx = isA ? `${60 + Math.random() * 25}%` : `${15 + Math.random() * 25}%`;
          const ry = `${20 + Math.random() * 60}%`;
          setBallPos({ x: rx, y: ry });
          playSound('kick');
        }
      }, 2500);
      return () => clearTimeout(timer);
    } else {
      setSimFinished(true);
    }
  }, [simulationActive, eventIndex, simDetails, shootoutState, localPlayer]);

  useEffect(() => {
    if (room && room.status === 'shootout' && room.shootout) {
      const events = room.shootout.events || [];
      if (events.length > prevShootoutEventsLength) {
        const lastEvent = events[events.length - 1];
        const isGoal = lastEvent.type === 'goal';
        const isWhistle = lastEvent.type === 'whistle';
        
        if (!isWhistle) {
          setAlertMessage(lastEvent.text);
          playSound('kick');
          
          const randomSpot = Math.floor(Math.random() * 9) + 1;
          const spots = {
            1: { x: '35%', y: '32%' }, 2: { x: '50%', y: '30%' }, 3: { x: '65%', y: '32%' },
            4: { x: '34%', y: '45%' }, 5: { x: '50%', y: '43%' }, 6: { x: '66%', y: '45%' },
            7: { x: '36%', y: '58%' }, 8: { x: '50%', y: '56%' }, 9: { x: '64%', y: '58%' }
          };
          setBallPos(spots[randomSpot]);
          
          setTimeout(() => {
            if (isGoal) {
              playSound('goal');
            } else {
              playSound('kick');
            }
          }, 600);
          
          setTimeout(() => {
            setAlertMessage('');
            setBallPos({ x: '50%', y: '75%' });
          }, 3500);
        }
        
        setPrevShootoutEventsLength(events.length);
      }
    } else if (room && room.status !== 'shootout') {
      setPrevShootoutEventsLength(0);
    }
  }, [room?.shootout?.events?.length, room?.status]);

  useEffect(() => {
    eventListEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [visibleEvents]);

  const handleLeaveRoom = () => {
    if (socket) {
      socket.disconnect();
      socket.connect();
    }
    setRoom(null);
    setDraftData(null);
    setSimulationActive(false);
    setSimDetails(null);
    setSupabaseTournamentId(null);
    setIsSinglePlayer(false);
    startingTournamentRef.current = false;
    setLandingSubmenu("MAIN");
  };

  // Actions
  const handleCreateRoom = (e) => {
    e.preventDefault();
    if (!playerName) return;
    setLoadingText('CREATING LOBBY...');
    setScreenLoading(true);
    const rId = Math.random().toString(36).substring(2, 6).toUpperCase();
    setRoomId(rId);
    setTimeout(() => {
      socket.emit('join_room', { roomId: rId, playerName, isHost: true, isSinglePlayer: false });
      setScreenLoading(false);
    }, 600);
  };

  const handleJoinRoom = (e) => {
    e.preventDefault();
    if (!playerName || !roomId) return;
    setLoadingText('CONNECTING TO LOBBY...');
    setScreenLoading(true);
    setTimeout(() => {
      socket.emit('join_room', { roomId: roomId.toUpperCase(), playerName, isHost: false, isSinglePlayer: false });
      setScreenLoading(false);
    }, 600);
  };

  const handleSinglePlayer = () => {
    if (!playerName) return;
    setLoadingText('BOOTING CAMPAIGN...');
    setScreenLoading(true);
    const rId = "SOLO-" + Math.random().toString(36).substring(2, 6).toUpperCase();
    setRoomId(rId);
    setIsSinglePlayer(true);
    setTimeout(() => {
      socket.emit('join_room', { roomId: rId, playerName, isHost: true, isSinglePlayer: true });
      setScreenLoading(false);
    }, 600);
  };

  const fetchGlobalLeaderboard = async () => {
    setLoadingLeaderboard(true);
    if (supabase && isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('tournaments')
          .select('user_name')
          .eq('won_cup', true);

        if (error) throw error;

        const winsMap = {};
        data.forEach(t => {
          const name = t.user_name || "Guest";
          winsMap[name] = (winsMap[name] || 0) + 1;
        });

        const sorted = Object.entries(winsMap)
          .map(([username, wins]) => ({ username, wins }))
          .sort((a, b) => b.wins - a.wins)
          .slice(0, 10);

        setGlobalLeaderboard(sorted);
      } catch (err) {
        console.error("Error fetching leaderboard:", err.message);
      } finally {
        setLoadingLeaderboard(false);
      }
    } else {
      try {
        const savedStats = localStorage.getItem('local_leaderboard_stats') || '{}';
        const stats = JSON.parse(savedStats);
        const sorted = Object.entries(stats)
          .map(([username, wins]) => ({ username, wins }))
          .sort((a, b) => b.wins - a.wins)
          .slice(0, 10);
        setGlobalLeaderboard(sorted);
      } catch (e) {
        console.warn(e);
      } finally {
        setLoadingLeaderboard(false);
      }
    }
  };

  const handleStartGlobalMatchmaking = () => {
    if (socket && playerName) {
      socket.emit('join_global', { playerName });
      fetchGlobalLeaderboard();
    }
  };

  const handleCancelGlobalMatchmaking = () => {
    if (socket) {
      socket.emit('leave_global');
    }
  };

  const handleJoinActiveRoom = (rId) => {
    if (!playerName) return;
    setRoomId(rId);
    socket.emit('join_room', { roomId: rId, playerName, isHost: false, isSinglePlayer: false });
  };

  const handleExitClick = () => {
    const isMultiplayerActive = room && !room.isSinglePlayer && room.status !== 'finished' && room.status !== 'lobby';
    if (isMultiplayerActive) {
      setPendingExitAction(() => () => handleConfirmForfeit());
    } else {
      setPendingExitAction(() => () => handleLeaveRoom());
    }
    setShowExitConfirm(true);
  };

  const handleConfirmForfeit = () => {
    if (room && socket) {
      socket.emit('forfeit_game', { roomId: room.roomId });
      socket.emit('leave_room', { roomId: room.roomId });
    }
    handleLeaveRoom();
  };

  const handleUpdateSettings = (formation, tactic, teamName) => {
    socket.emit('update_settings', { roomId, formation, tactic, teamName });
  };

  const handleStartGame = () => {
    socket.emit('start_game', { roomId });
  };

  const handleSpinWheel = () => {
    if (isSpinning) return;
    setIsSpinning(true);
    
    const targetDeg = 720 + Math.floor(Math.random() * 360);
    setSpinDegree(targetDeg);

    let ticks = 0;
    const tickInterval = setInterval(() => {
      playSound('spin');
      ticks++;
      if (ticks > 15) clearInterval(tickInterval);
    }, 120);

    setTimeout(() => {
      setHasSpun(true);
      setIsSpinning(false);
    }, 2000);
  };

  const isPlayerEligibleForDraft = (player) => {
    if (!localPlayer || !room) return false;
    if (draftData?.manager) return false; // Enforce manager selection first
    
    // Check if there is a compatible empty slot on the starting XI
    const hasCompatiblePitchSlot = getPlayerPositions(localPlayer.formation).some((_, idx) => {
      const isSlotEmpty = !localPlayer.squad[idx];
      const slotLabel = getPositionLabel(localPlayer.formation, idx);
      return isSlotEmpty && isPositionCompatible(player.position, slotLabel);
    });

    // Check if there is an empty bench slot (bench slots accept any player position!)
    const hasEmptyBenchSlot = Object.keys(localPlayer.subs || {}).length < 3;

    return hasCompatiblePitchSlot || hasEmptyBenchSlot;
  };

  // Select player from draft roster card
  const handleSelectDraftPlayer = (player) => {
    if (draftData?.manager) return; // Enforce manager selection first
    setSelectedCard(player);
  };

  const handleSelectDraftManager = (manager) => {
    socket.emit('pick_draft_item', { roomId, type: 'manager', item: manager });
    setDraftData(null);
    setSelectedCard(null);
  };

  // Click on Pitch slot or Bench Sub during draft or swap (38-0-0.com style placement)
  const handleSlotClick = (idx) => {
    if (room.status === 'drafting') {
      if (selectedCard) {
        // Draft player into starting XI
        const slotLabel = getPositionLabel(localPlayer.formation, idx);
        if (isPositionCompatible(selectedCard.position, slotLabel) && !localPlayer.squad[idx]) {
          socket.emit('pick_draft_item', { 
            roomId, 
            type: 'player', 
            item: { ...selectedCard, teamId: (localPlayer?.spunTeams || room.spunTeams)[room.draftRound - 1] }, 
            slotType: 'squad', 
            slotIndex: idx 
          });
          setDraftData(null);
          setSelectedCard(null);
        }
      } else {
        // Swap selection during drafting
        const player = localPlayer.squad[idx];
        if (player) {
          if (!selectedSwapSlot) {
            setSelectedSwapSlot({ type: 'squad', index: idx });
          } else if (selectedSwapSlot.type === 'squad') {
            if (selectedSwapSlot.index === idx) {
              setSelectedSwapSlot(null);
            } else {
              setSelectedSwapSlot({ type: 'squad', index: idx });
            }
          } else if (selectedSwapSlot.type === 'sub') {
            // Swap sub to squad
            const subPlayer = localPlayer.subs[selectedSwapSlot.index];
            const slotLabel = getPositionLabel(localPlayer.formation, idx);
            if (subPlayer && !isPositionCompatible(subPlayer.position, slotLabel)) {
              return; // Not compatible
            }
            socket.emit('swap_player', { roomId, starterIdx: idx, subIdx: selectedSwapSlot.index });
            setSelectedSwapSlot(null);
          }
        } else {
          // Empty slot click
          if (selectedSwapSlot && selectedSwapSlot.type === 'sub') {
            const subPlayer = localPlayer.subs[selectedSwapSlot.index];
            const slotLabel = getPositionLabel(localPlayer.formation, idx);
            if (subPlayer && !isPositionCompatible(subPlayer.position, slotLabel)) {
              return; // Not compatible
            }
            socket.emit('swap_player', { roomId, starterIdx: idx, subIdx: selectedSwapSlot.index });
            setSelectedSwapSlot(null);
          }
        }
      }
    } else if (room.status === 'tournament') {
      const player = localPlayer?.squad[idx];
      if (!selectedSwapSlot) {
        if (player) setSelectedSwapSlot({ type: 'squad', index: idx });
      } else if (selectedSwapSlot.type === 'squad') {
        if (selectedSwapSlot.index === idx) {
          setSelectedSwapSlot(null);
        } else {
          if (player) setSelectedSwapSlot({ type: 'squad', index: idx });
        }
      } else if (selectedSwapSlot.type === 'sub') {
        // Swap sub to squad in tournament
        const subPlayer = localPlayer?.subs[selectedSwapSlot.index];
        if (subPlayer && subPlayer.suspended) {
          setAlertMessage("THIS PLAYER IS SUSPENDED AND CANNOT BE SWAPPED IN!");
          setTimeout(() => setAlertMessage(''), 2000);
          setSelectedSwapSlot(null);
          return;
        }
        const slotLabel = getPositionLabel(localPlayer.formation, idx);
        if (subPlayer && !isPositionCompatible(subPlayer.position, slotLabel)) {
          return; // Not compatible
        }
        socket.emit('swap_player', { roomId, starterIdx: idx, subIdx: selectedSwapSlot.index });
        setSelectedSwapSlot(null);
      }
    }
  };

  const handleSubClick = (subIdx) => {
    if (room.status === 'drafting') {
      if (selectedCard) {
        // Draft player to sub bench (allowed at any round now!)
        if (!localPlayer.subs[subIdx]) {
          socket.emit('pick_draft_item', { 
            roomId, 
            type: 'player', 
            item: { ...selectedCard, teamId: (localPlayer?.spunTeams || room.spunTeams)[room.draftRound - 1] }, 
            slotType: 'sub', 
            slotIndex: subIdx 
          });
          setDraftData(null);
          setSelectedCard(null);
        }
      } else {
        // Swap selection during drafting
        const player = localPlayer.subs[subIdx];
        if (!selectedSwapSlot) {
          if (player) setSelectedSwapSlot({ type: 'sub', index: subIdx });
        } else if (selectedSwapSlot.type === 'sub') {
          if (selectedSwapSlot.index === subIdx) {
            setSelectedSwapSlot(null);
          } else {
            if (player) setSelectedSwapSlot({ type: 'sub', index: subIdx });
          }
        } else if (selectedSwapSlot.type === 'squad') {
          // Swap squad to sub
          const subPlayer = localPlayer.subs[subIdx];
          if (subPlayer) {
            const slotLabel = getPositionLabel(localPlayer.formation, selectedSwapSlot.index);
            if (!isPositionCompatible(subPlayer.position, slotLabel)) {
              return; // Not compatible
            }
          }
          socket.emit('swap_player', { roomId, starterIdx: selectedSwapSlot.index, subIdx });
          setSelectedSwapSlot(null);
        }
      }
    } else if (room.status === 'tournament') {
      const player = localPlayer?.subs[subIdx];
      if (player && player.suspended) {
        setAlertMessage("THIS PLAYER IS SUSPENDED AND CANNOT BE SWAPPED IN!");
        setTimeout(() => setAlertMessage(''), 2000);
        return;
      }
      if (!selectedSwapSlot) {
        if (player) setSelectedSwapSlot({ type: 'sub', index: subIdx });
      } else if (selectedSwapSlot.type === 'sub') {
        if (selectedSwapSlot.index === subIdx) {
          setSelectedSwapSlot(null);
        } else {
          if (player) setSelectedSwapSlot({ type: 'sub', index: subIdx });
        }
      } else if (selectedSwapSlot.type === 'squad') {
        // Swap squad to sub in tournament
        const subPlayer = localPlayer?.subs[subIdx];
        if (subPlayer && subPlayer.suspended) {
          setAlertMessage("THIS PLAYER IS SUSPENDED AND CANNOT BE SWAPPED IN!");
          setTimeout(() => setAlertMessage(''), 2000);
          setSelectedSwapSlot(null);
          return;
        }
        if (subPlayer) {
          const slotLabel = getPositionLabel(localPlayer.formation, selectedSwapSlot.index);
          if (!isPositionCompatible(subPlayer.position, slotLabel)) {
            return; // Not compatible
          }
        }
        socket.emit('swap_player', { roomId, starterIdx: selectedSwapSlot.index, subIdx });
        setSelectedSwapSlot(null);
      }
    }
  };

  const handleUpdateTactic = (tactic) => {
    socket.emit('update_tournament_tactic', { roomId, tactic });
  };

  const handleReadyMatch = () => {
    socket.emit('ready_match', { roomId });
  };

  const handleContinue = () => {
    setSimulationActive(false);
    setSimDetails(null);
  };

  const handleRestart = () => {
    setSimulationActive(false);
    setSimDetails(null);
    setDraftData(null);
    setSupabaseTournamentId(null);
    startingTournamentRef.current = false;
    socket.emit('restart_game', { roomId });
  };

  // Get running score safely
  const getRunningScore = () => {
    let running = [0, 0];
    if (!simDetails) return running;
    for (let j = 0; j < eventIndex; j++) {
      if (simDetails.events[j]?.score) {
        running = simDetails.events[j].score;
      }
    }
    return running;
  };

  const renderExitConfirmModal = () => {
    if (!showExitConfirm) return null;
    const isMultiplayerActive = room && !room.isSinglePlayer && room.status !== 'finished' && room.status !== 'lobby';
    
    // Check if it is a single-player tournament campaign (where we can save or terminate)
    const isSinglePlayerCampaignActive = room && room.isSinglePlayer && room.aiMode === 'tournament' && room.status !== 'finished';

    if (isSinglePlayerCampaignActive) {
      return (
        <div className="retro-popup-overlay" style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.85)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999,
          padding: '20px'
        }}>
          <div className="exit-confirm-panel text-center" style={{ borderColor: 'var(--color-gold)' }}>
            <div className="flex justify-center text-yellow-500">
              <AlertCircle size={36} />
            </div>
            <div className="space-y-1">
              <h3 className="logo-heading" style={{ fontSize: '1.25rem', color: 'var(--color-gold)' }}>
                EXIT CAMPAIGN?
              </h3>
              <p className="text-xs" style={{ color: 'var(--color-text-dim)', lineHeight: '1.3' }}>
                Would you like to save your progress and exit, or terminate this tournament campaign permanently?
              </p>
            </div>
            <div className="flex flex-col gap-2 w-full mt-4">
              <button 
                onClick={async () => {
                  const ok = await saveActiveTournament(room);
                  if (ok !== false) {
                    handleLeaveRoom();
                    setShowExitConfirm(false);
                  }
                }}
                className="btn-sports w-full"
                style={{ fontSize: '0.75rem', padding: '8px', background: '#2ecc71', color: '#fff', border: '1px solid #2ecc71' }}
              >
                Save & Exit
              </button>
              <button 
                onClick={async () => {
                  if (window.confirm("Are you sure you want to terminate this campaign? All progress will be lost and slot will be freed.")) {
                    await terminateActiveTournament(room);
                    handleLeaveRoom();
                    setShowExitConfirm(false);
                  }
                }}
                className="btn-sports w-full"
                style={{ fontSize: '0.75rem', padding: '8px', background: '#c0392b', color: '#fff', border: '1px solid #c0392b' }}
              >
                Terminate Campaign
              </button>
              <button 
                onClick={() => {
                  setShowExitConfirm(false);
                }}
                className="btn-sports-secondary w-full"
                style={{ fontSize: '0.75rem', padding: '8px' }}
              >
                Cancel (Keep Playing)
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="retro-popup-overlay" style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.85)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99999,
        padding: '20px'
      }}>
        <div className="exit-confirm-panel text-center" style={isMultiplayerActive ? { borderColor: '#c0392b' } : {}}>
          <div className="flex justify-center" style={{ color: isMultiplayerActive ? '#c0392b' : '#ffffff' }}>
            <AlertCircle size={36} />
          </div>
          <div className="space-y-1">
            <h3 className="logo-heading" style={{ fontSize: '1.25rem', color: isMultiplayerActive ? '#c0392b' : 'inherit' }}>
              {isMultiplayerActive ? 'FORFEIT MATCH?' : 'LEAVE GAME?'}
            </h3>
            <p className="text-xs" style={{ color: 'var(--color-text-dim)', lineHeight: '1.3' }}>
              {isMultiplayerActive 
                ? 'Leaving will result in an immediate 3-0 forfeit loss. Are you sure you want to exit?' 
                : 'Are you sure you want to exit? All unsaved draft progress will be lost.'}
            </p>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => {
                setShowExitConfirm(false);
                setPendingExitAction(null);
              }}
              className="btn-sports-secondary w-full"
              style={{ fontSize: '0.72rem', padding: '8px', minWidth: '0' }}
            >
              Stay
            </button>
            <button 
              onClick={() => {
                if (pendingExitAction) {
                  pendingExitAction();
                }
                setShowExitConfirm(false);
                setPendingExitAction(null);
              }}
              className="btn-sports w-full"
              style={{ 
                fontSize: '0.72rem', 
                padding: '8px', 
                background: isMultiplayerActive ? '#c0392b' : '#ffffff', 
                color: isMultiplayerActive ? '#ffffff' : '#000000', 
                border: isMultiplayerActive ? '1px solid #c0392b' : '1px solid #ffffff',
                minWidth: '0' 
              }}
            >
              {isMultiplayerActive ? 'Forfeit & Exit' : 'Exit'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderTimeoutPopupModal = () => {
    if (!showTimeoutPopup) return null;
    return (
      <div className="retro-popup-overlay" style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.85)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99999,
        padding: '20px'
      }}>
        <div className="exit-confirm-panel text-center" style={{ borderColor: '#c0392b' }}>
          <div className="flex justify-center" style={{ color: '#c0392b' }}>
            <AlertCircle size={36} className="animate-bounce" />
          </div>
          <div className="space-y-1">
            <h3 className="logo-heading" style={{ fontSize: '1.25rem', color: '#c0392b' }}>
              MATCH FORFEITED
            </h3>
            <p className="text-xs" style={{ color: 'var(--color-text-dim)', lineHeight: '1.3' }}>
              You failed to click 'Kick Off Match' within 30 seconds. You have forfeited the match with a 3-0 loss.
            </p>
          </div>
          <button 
            onClick={() => setShowTimeoutPopup(false)}
            className="btn-sports w-full"
            style={{ fontSize: '0.72rem', padding: '8px', background: '#c0392b', color: '#ffffff', border: 'none', marginTop: '12px' }}
          >
            Acknowledge
          </button>
        </div>
      </div>
    );
  };

  const renderOpponentLeftModal = () => {
    if (!room || room.isSinglePlayer || room.status === 'lobby' || room.players.length >= 2) return null;
    return (
      <div className="retro-popup-overlay" style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.85)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99999,
        padding: '20px'
      }}>
        <div className="exit-confirm-panel text-center" style={{ borderColor: '#c0392b' }}>
          <div className="flex justify-center" style={{ color: '#c0392b' }}>
            <AlertCircle size={36} className="animate-bounce" />
          </div>
          <div className="space-y-1">
            <h3 className="logo-heading" style={{ fontSize: '1.25rem', color: '#c0392b' }}>
              OPPONENT LEFT
            </h3>
            <p className="text-xs" style={{ color: 'var(--color-text-dim)', lineHeight: '1.3' }}>
              The other player has disconnected or left the game. Please return to the main menu.
            </p>
          </div>
          <button 
            onClick={handleLeaveRoom}
            className="btn-sports w-full"
            style={{ fontSize: '0.72rem', padding: '8px', background: '#c0392b', color: '#ffffff', border: 'none', marginTop: '12px' }}
          >
            Exit to Main Menu
          </button>
        </div>
      </div>
    );
  };


  if (introState !== 'done') {
    return (
      <div className={`intro-overlay ${introState === 'fading' ? 'fade-out' : ''}`}>
        <div className="intro-content">
          <div className="intro-logo-container">
            <WorldCupTrophy size={80} className="intro-trophy" />
            <div className="intro-football-wrapper">
              <svg viewBox="0 0 64 64" width="48" height="48" className="intro-football">
                <circle cx="32" cy="32" r="30" fill="#f0f0f0" stroke="#101010" strokeWidth="4" />
                <polygon points="32,22 40,28 37,38 27,38 24,28" fill="#101010" />
                <line x1="32" y1="22" x2="32" y2="2" stroke="#101010" strokeWidth="4" />
                <line x1="40" y1="28" x2="59" y2="22" stroke="#101010" strokeWidth="4" />
                <line x1="37" y1="38" x2="49" y2="56" stroke="#101010" strokeWidth="4" />
                <line x1="27" y1="38" x2="15" y2="56" stroke="#101010" strokeWidth="4" />
                <line x1="24" y1="28" x2="5" y2="22" stroke="#101010" strokeWidth="4" />
              </svg>
            </div>
          </div>
          <h1 className="intro-title">WORLD CUP DRAFT</h1>
          <h2 className="intro-subtitle">7-STEP TROPHY RUN</h2>
          <div className="intro-loading-text">BOOTING RETRO SYSTEM...</div>
        </div>
      </div>
    );
  }

  // Render Auth screen if not logged in
  if (!user) {
    return (
      <>
      <div className="landing-wrapper" style={{ padding: '40px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: '24px' }}>
        <div className="text-center">
          <div className="flex justify-center mb-2">
            <WorldCupTrophy size={46} style={{ color: 'var(--color-gold)' }} />
          </div>
          <h1 className="logo-heading" style={{ fontSize: '2.4rem' }}>WORLD CUP DRAFT</h1>
          <h2 className="sub-heading" style={{ fontSize: '0.85rem', letterSpacing: '3px' }}>7-Step Trophy Run</h2>
          <p className="text-xs" style={{ color: 'var(--color-text-dim)', marginTop: '6px', fontWeight: 800 }}>FIFA 2026 EDITION</p>
        </div>

        <div className="dashboard-panel max-w-md" style={{ width: '100%', margin: '0' }}>
          {localAuthError && (
            <div className="alert-box alert-box-red text-xs mb-4 text-center">
              {localAuthError}
            </div>
          )}

          {localAuthSuccess && (
            <div className="alert-box text-xs mb-4 text-center">
              {localAuthSuccess}
            </div>
          )}

          <div className="space-y-4">
            <h3 className="text-sm uppercase font-bold border-b pb-2 flex items-center gap-2" style={{ color: 'var(--color-gold)', fontFamily: "'Share Tech Mono', monospace" }}>
              <User size={16} /> Manager Login
            </h3>

            <form onSubmit={handleLocalSignIn} className="space-y-4">
              <div>
                <label className="block text-xs uppercase font-bold mb-1" style={{ color: 'var(--color-text-dim)', fontFamily: "'Share Tech Mono', monospace" }}>Manager Name</label>
                <input 
                  type="text" 
                  placeholder="e.g. Pep Guardiola" 
                  value={loginManagerName} 
                  onChange={e => setLoginManagerName(e.target.value)}
                  className="sports-input"
                  required
                />
              </div>

              <div>
                <label className="block text-xs uppercase font-bold mb-1" style={{ color: 'var(--color-text-dim)', fontFamily: "'Share Tech Mono', monospace" }}>Password</label>
                <div style={{ position: 'relative' }}>
                  <input 
                    type={showLoginPassword ? "text" : "password"} 
                    placeholder="••••••••" 
                    value={loginPassword} 
                    onChange={e => setLoginPassword(e.target.value)}
                    className="sports-input"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    style={{ position: 'absolute', right: '12px', top: '15px', background: 'transparent', border: 'none', color: 'var(--color-text-dim)', cursor: 'pointer' }}
                  >
                    {showLoginPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button type="submit" className="btn-sports w-full mt-2">
                <Play size={14} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} /> Enter Manager Suite
              </button>
            </form>
          </div>
        </div>

        {/* Retro Sign Up Popup Modal */}
        {showSignUpPopup && (
          <div className="retro-popup-overlay" style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999999
          }}>
            <div className="dashboard-panel max-w-md" style={{
              background: '#090909',
              border: '3px double #ffffff',
              padding: '30px',
              textAlign: 'center',
              boxShadow: '0 0 30px rgba(255,255,255,0.2)'
            }}>
              <AlertCircle size={48} style={{ color: '#ffffff', marginBottom: '16px' }} />
              <h3 style={{ fontFamily: "'Share Tech Mono', monospace", textTransform: 'uppercase', marginBottom: '12px', letterSpacing: '1px' }}>
                Profile Not Found
              </h3>
              <p className="text-xs" style={{ color: '#cccccc', marginBottom: '24px', lineHeight: '1.6' }}>
                Manager profile <b>"{pendingUsername}"</b> is not registered. <br />
                Would you like to create a new profile with these credentials?
              </p>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                <button 
                  onClick={() => { setShowSignUpPopup(false); setPendingUsername(""); setPendingPassword(""); }} 
                  className="btn-sports-secondary"
                  style={{ minWidth: '100px', fontSize: '0.8rem', padding: '10px 18px' }}
                >
                  Cancel
                </button>
                <button 
                  onClick={handleConfirmSignUp} 
                  className="btn-sports"
                  style={{ minWidth: '140px', fontSize: '0.8rem', padding: '10px 18px' }}
                >
                  Create Profile
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      {screenLoading && (
        <div className="screen-transition-overlay">
          <div className="screen-transition-content">
            <div className="screen-transition-spinner"></div>
            <div className="screen-transition-text">{loadingText}</div>
          </div>
        </div>
      )}
      </>
    );
  }

  // Render Landing Page
  if (!room) {
    return (
      <>
      <div className="landing-wrapper" style={{ flexDirection: 'column', gap: '12px' }}>
        {user && (
          <div className="flex justify-between items-center" style={{ width: '100%', maxWidth: '480px', fontSize: '0.75rem', fontFamily: "'Share Tech Mono', monospace", padding: '0 8px' }}>
            <span style={{ color: 'var(--color-text-dim)' }}>Logged in as: <b style={{ color: '#ffffff' }}>{user.email}</b></span>
            <button 
              onClick={handleLogOut} 
              className="landing-signout-btn"
            >
              <LogOut size={12} /> Sign Out
            </button>
          </div>
        )}
        <div className="dashboard-panel max-w-md">
          <div className="text-center mb-6">
            <div className="flex justify-center mb-2">
              <WorldCupTrophy size={46} style={{ color: 'var(--color-gold)' }} />
            </div>
            <h1 className="logo-heading">WORLD CUP DRAFT</h1>
            <h2 className="sub-heading">7-Step Trophy Run</h2>
            <p className="text-xs" style={{ color: 'var(--color-text-dim)', marginTop: '6px', fontWeight: 800 }}>FIFA 2026 EDITION</p>
          </div>

          <div className="stadium-banner-frame">
            <RetroDither 
              src="/world_cup_banner_new.png" 
              pixelSize={2}
              brightness={1.0}
              contrast={1.4}
              className="stadium-banner-img"
              alt="World Cup 2026 Stadium Banner" 
            />
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-xs uppercase font-bold mb-2" style={{ color: '#ffffff' }}>Active Manager Profile</label>
              <input 
                type="text" 
                placeholder="Manager Name..." 
                value={playerName} 
                className="sports-input" 
                disabled={true}
                style={{ opacity: 0.8, cursor: 'not-allowed', background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255, 255, 255, 0.15)' }}
              />
            </div>

            <div className="pt-4 border-t space-y-4">
              {landingSubmenu === "MAIN" && (
                <>
                  <button 
                    onClick={() => setLandingSubmenu("SINGLE_PLAYER_CHOOSE")}
                    disabled={!playerName}
                    className="btn-sports w-full"
                  >
                    <Sparkles size={18} /> Play VS AI (Solo)
                  </button>

                  <button 
                    onClick={() => setLandingSubmenu("MULTIPLAYER_CHOOSE")}
                    disabled={!playerName}
                    className="btn-sports w-full"
                  >
                    <Users size={18} /> Multiplayer
                  </button>
                </>
              )}

              {landingSubmenu === "SINGLE_PLAYER_CHOOSE" && (
                <div className="space-y-4">
                  <div className="text-center text-xs" style={{ color: 'var(--color-text-dim)', fontWeight: 'bold' }}>SELECT SOLO MODE</div>
                  
                  <button 
                    onClick={handleStartSingleMatch}
                    className="btn-sports w-full"
                  >
                    Quick Match VS AI
                  </button>

                  <button 
                    onClick={() => setLandingSubmenu("TOURNAMENT_MANAGER")}
                    className="btn-sports w-full font-bold"
                  >
                    Tournament Manager
                  </button>

                  <button 
                    onClick={() => setLandingSubmenu("MAIN")}
                    className="btn-sports-secondary w-full"
                  >
                    Back
                  </button>
                </div>
              )}

              {landingSubmenu === "TOURNAMENT_MANAGER" && (
                <div className="space-y-4">
                  <div className="text-center text-xs font-bold" style={{ color: 'var(--color-gold)' }}>TOURNAMENT CAMPAIGN MANAGER</div>
                  
                  {loadingActiveTournaments ? (
                    <div className="text-center py-4 text-xs animate-pulse" style={{ color: 'var(--color-text-dim)' }}>
                      LOADING ACTIVE CAMPAIGNS...
                    </div>
                  ) : activeTournaments.length === 0 ? (
                    <div className="text-center py-4 text-xs" style={{ color: 'var(--color-text-dim)' }}>
                      No active campaigns found. Start a new one!
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                      {activeTournaments.map((t) => {
                        const savedDate = new Date(t.last_saved_at || t.created_at).toLocaleDateString(undefined, {
                          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                        });
                        const pName = t.room_state?.players?.[0]?.name || "Guest";
                        const tName = t.room_state?.players?.[0]?.teamName || "Brazil";
                        const matchesPlayed = t.room_state?.matchesPlayed || 0;
                        return (
                          <div key={t.id} className="p-3 rounded border flex justify-between items-center bg-black/40 text-left" style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}>
                            <div>
                              <div className="text-xs font-bold text-white">{tName} <span className="text-[10px] text-slate-400">({pName})</span></div>
                              <div className="text-[9px] text-slate-500 mt-1">Match {matchesPlayed + 1} of 8 • Saved: {savedDate}</div>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleResumeTournament(t)}
                                className="btn-sports"
                                style={{ padding: '4px 8px', fontSize: '0.65rem', width: 'auto' }}
                              >
                                Resume
                              </button>
                              <button
                                onClick={() => handleDeleteActiveTournament(t)}
                                className="btn-sports"
                                style={{ padding: '4px 8px', fontSize: '0.65rem', width: 'auto', background: '#c0392b', border: '1px solid #c0392b' }}
                              >
                                Terminate
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <button 
                    onClick={handleStartTournamentCampaign}
                    disabled={activeTournaments.length >= 5}
                    className="btn-sports w-full font-bold"
                    style={activeTournaments.length >= 5 ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                  >
                    {activeTournaments.length >= 5 ? "Campaign Slots Full (Max 5)" : "+ Start New Campaign"}
                  </button>

                  <button 
                    onClick={() => setLandingSubmenu("SINGLE_PLAYER_CHOOSE")}
                    className="btn-sports-secondary w-full"
                  >
                    Back
                  </button>
                </div>
              )}

              {landingSubmenu === "MULTIPLAYER_CHOOSE" && (
                <div className="space-y-4">
                  <div className="text-center text-xs" style={{ color: 'var(--color-text-dim)', fontWeight: 'bold' }}>SELECT HOSTING TYPE</div>
                  
                  <button 
                    onClick={() => {
                      setLandingSubmenu("LOCAL_LOBBY");
                      if (socket) socket.emit('get_local_rooms');
                    }}
                    className="btn-sports w-full"
                  >
                    Local Hosting
                  </button>

                  <button 
                    onClick={handleStartGlobalMatchmaking}
                    className="btn-sports w-full animate-pulse"
                  >
                    Global Join
                  </button>

                  <button 
                    onClick={() => setLandingSubmenu("MAIN")}
                    className="btn-sports-secondary w-full"
                  >
                    Back
                  </button>
                </div>
              )}

              {landingSubmenu === "GLOBAL_MATCHMAKING" && (
                <div className="space-y-4 text-center">
                  <div className="text-sm font-bold uppercase animate-pulse" style={{ color: 'var(--color-gold)' }}>
                    Searching for Opponent...
                  </div>
                  <p className="text-xs" style={{ color: 'var(--color-text-dim)' }}>
                    Connecting you to random players around the globe.
                  </p>
                  <div className="matrix-spinner-box" style={{ border: 'none', background: 'transparent', minHeight: 'auto', padding: '10px' }}>
                    <div className="matrix-spinner-reel" style={{ fontSize: '1rem' }}>SEARCHING GLOBALLY...</div>
                  </div>

                  {/* Global leaderboard */}
                  <div className="border-t pt-3 mt-4 text-left">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-2">Global Leaderboard (Most Wins)</span>
                    <div className="space-y-1 max-h-48 overflow-y-auto" style={{ border: '1px solid rgba(255,255,255,0.05)', padding: '6px', borderRadius: '4px', background: '#050505' }}>
                      {loadingLeaderboard ? (
                        <div className="text-[10px] text-center text-slate-500 py-3 animate-pulse">LOADING LEADERBOARD...</div>
                      ) : globalLeaderboard.length === 0 ? (
                        <div className="text-[10px] text-center text-slate-500 py-3">No champion managers found yet. Be the first!</div>
                      ) : (
                        <table className="retro-table" style={{ fontSize: '9px', margin: 0 }}>
                          <thead>
                            <tr>
                              <th style={{ padding: '2px 4px' }}>RANK</th>
                              <th style={{ padding: '2px 4px', textAlign: 'left' }}>MANAGER</th>
                              <th style={{ padding: '2px 4px', textAlign: 'right' }}>CUP WINS</th>
                            </tr>
                          </thead>
                          <tbody>
                            {globalLeaderboard.map((m, mIdx) => (
                              <tr key={mIdx} className={m.username === playerName ? 'active-row' : ''}>
                                <td style={{ padding: '2px 4px' }}>{mIdx + 1}</td>
                                <td style={{ padding: '2px 4px', textAlign: 'left', fontWeight: 'bold' }}>{m.username}</td>
                                <td style={{ padding: '2px 4px', textAlign: 'right', color: 'var(--color-gold)', fontWeight: 'bold' }}>{m.wins}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>

                  <button 
                    onClick={handleCancelGlobalMatchmaking}
                    className="btn-sports-secondary w-full"
                  >
                    Cancel Matchmaking
                  </button>
                </div>
              )}

              {landingSubmenu === "LOCAL_LOBBY" && (
                <div className="space-y-4">
                  <div className="text-center text-xs" style={{ color: 'var(--color-text-dim)', fontWeight: 'bold' }}>LOCAL ROOM LOBBIES</div>
                  
                  <div className="grid-2">
                    <button 
                      onClick={handleCreateRoom}
                      disabled={!playerName}
                      className="btn-sports-secondary"
                    >
                      Create Room
                    </button>
                    <div style={{ position: 'relative' }}>
                      <input 
                        type="text" 
                        placeholder="Lobby Code" 
                        value={roomId} 
                        onChange={e => setRoomId(e.target.value)}
                        className="sports-input text-center uppercase" 
                      />
                      <button 
                        onClick={handleJoinRoom}
                        disabled={!playerName || !roomId}
                        className="lobby-arrow-btn"
                      >
                        <ArrowRight size={18} />
                      </button>
                    </div>
                  </div>

                  {/* Existing creations / local rooms list */}
                  <div className="border-t pt-3 mt-3 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] uppercase font-bold text-slate-400">Available Local Rooms</span>
                      <button 
                        onClick={() => socket && socket.emit('get_local_rooms')} 
                        className="btn-sports-secondary"
                        style={{ padding: '2px 8px', fontSize: '9px', width: 'auto' }}
                      >
                        Refresh
                      </button>
                    </div>
                    
                    <div className="space-y-1.5 max-h-36 overflow-y-auto" style={{ border: '1px solid rgba(255,255,255,0.05)', padding: '4px', borderRadius: '4px', background: '#050505' }}>
                      {activeRooms.length === 0 ? (
                        <div className="text-[10px] text-center text-slate-500 py-3">No active local rooms found. Create one above!</div>
                      ) : (
                        activeRooms.map((r, rIdx) => (
                          <div key={rIdx} className="flex justify-between items-center p-2 rounded" style={{ background: '#0c0c0c', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <div className="text-left">
                              <span className="font-extrabold text-[11px] text-white uppercase">{r.roomId}</span>
                              <span className="text-[9px] text-slate-400 block">Host: {r.hostName} ({r.playersCount}/2)</span>
                            </div>
                            <button 
                              onClick={() => handleJoinActiveRoom(r.roomId)}
                              className="btn-sports"
                              style={{ padding: '4px 10px', fontSize: '10px', width: 'auto', background: '#ffffff', color: '#000000', border: 'none' }}
                            >
                              Join
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <button 
                    onClick={() => setLandingSubmenu("MULTIPLAYER_CHOOSE")}
                    className="btn-sports-secondary w-full"
                  >
                    Back
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      {screenLoading && (
        <div className="screen-transition-overlay">
          <div className="screen-transition-content">
            <div className="screen-transition-spinner"></div>
            <div className="screen-transition-text">{loadingText}</div>
          </div>
        </div>
      )}
      </>
    );
  }

  // Render Lobby screen
  if (room.status === 'lobby') {
    return (
      <>
        <div className="max-w-6xl p-6 lobby-grid">
          <div className="dashboard-panel space-y-6">
            <div className="flex justify-between items-center border-b pb-4">
              <div>
                <p className="text-xs uppercase" style={{ color: 'var(--color-text-dim)' }}>Lobby Code</p>
                <h2 className="logo-heading" style={{ fontSize: '1.6rem' }}>{room.roomId}</h2>
              </div>
              <div className="flex gap-3 items-center">
                {room.isSinglePlayer ? (
                  <span className="alert-box text-xs" style={{ padding: '6px 12px' }}>CAMPAIGN (48-TEAM STAGE)</span>
                ) : (
                  <span className="alert-box alert-box-amber text-xs" style={{ padding: '6px 12px' }}>MULTIPLAYER DUEL</span>
                )}
                <button 
                  onClick={() => {
                    setPendingExitAction(() => () => handleLeaveRoom());
                    setShowExitConfirm(true);
                  }} 
                  className="btn-sports-secondary" 
                  style={{ padding: '6px 12px', fontSize: '0.7rem' }}
                >
                  Exit Lobby
                </button>
              </div>
            </div>

          <div className="space-y-4">
            <h3 className="text-sm uppercase font-bold flex items-center gap-2">
              <Users size={16} /> Managers Connected ({room.players.length})
            </h3>
            <div className="space-y-3">
              {room.players.map((p, idx) => (
                <div key={idx} className="lobby-manager-card">
                  <div className="lobby-manager-info">
                    <div className="lobby-manager-avatar">
                      <User size={20} />
                    </div>
                    <div className="lobby-manager-details">
                      <div className="lobby-manager-name-row">
                        <span className="lobby-manager-name">{p.name}</span>
                        {p.teamName && (
                          <span className="lobby-manager-team">[{p.teamName}]</span>
                        )}
                        {p.isHost && !room.isSinglePlayer && (
                          <span className="lobby-manager-host-badge">HOST</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="lobby-manager-setup-col">
                    <span className="lobby-manager-formation">
                      {p.formation}
                    </span>
                    <span className="lobby-manager-tactic">
                      {p.tactic}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {localPlayer && (
            <div className="space-y-6 pt-4 border-t">
              <h3 className="text-sm uppercase font-bold flex items-center gap-2">
                <Settings size={16} /> Team Setup
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem' }}>
                <div>
                  <label className="block text-xs mb-2 uppercase font-semibold">Formation</label>
                  <select 
                    value={localPlayer.formation} 
                    onChange={e => handleUpdateSettings(e.target.value, localPlayer.tactic, localPlayer.teamName)}
                    className="sports-input"
                  >
                    {FORMATIONS.map(form => (
                      <option key={form} value={form}>{form}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs mb-2 uppercase font-semibold">Tactic Style</label>
                  <select 
                    value={localPlayer.tactic} 
                    onChange={e => handleUpdateSettings(localPlayer.formation, e.target.value, localPlayer.teamName)}
                    className="sports-input"
                  >
                    {Object.keys(TACTIC_DETAILS).map(tacKey => (
                      <option key={tacKey} value={tacKey}>{TACTIC_DETAILS[tacKey].name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs mb-2 uppercase font-semibold">Play Style</label>
                  <select 
                    value={localPlayer.playStyle || "balanced"} 
                    onChange={e => handleUpdatePlayStyle(e.target.value)}
                    className="sports-input"
                  >
                    <option value="balanced">Balanced</option>
                    <option value="attack">Attack (+3 ATT / -2 DEF)</option>
                    <option value="defense">Defense (+3 DEF / -2 ATT)</option>
                    <option value="control">Midfield Control (+2 MID)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs mb-2 uppercase font-semibold">Select Country</label>
                  <select 
                    value={localPlayer.teamName || "Brazil"} 
                    onChange={e => handleUpdateSettings(localPlayer.formation, localPlayer.tactic, e.target.value)}
                    className="sports-input"
                  >
                    {ALL_HISTORICAL_NATIONS.map(nation => (
                      <option key={nation} value={nation}>{nation}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="tactic-info-card">
                <h4 className="tactic-info-title">
                  {TACTIC_DETAILS[localPlayer.tactic]?.name}
                </h4>
                <p className="tactic-info-desc">{TACTIC_DETAILS[localPlayer.tactic]?.desc}</p>
              </div>
            </div>
          )}

          {localPlayer?.isHost && (
            <button 
              onClick={handleStartGame}
              disabled={!room.isSinglePlayer && room.players.length < 2}
              className="btn-sports w-full"
            >
              Start Draft Phase
            </button>
          )}
          {!localPlayer?.isHost && (
            <p className="text-center text-xs animate-pulse" style={{ color: 'var(--color-text-dim)' }}>Awaiting host to initialize draft...</p>
          )}
        </div>

        {/* Pitch preview */}
        <div className="dashboard-panel">
          <div className="text-center mb-4">
            <h3 className="text-sm uppercase font-bold" style={{ color: 'var(--color-text-dim)' }}>Squad Lineup Pitch</h3>
          </div>
          <div className="pitch-container">
            <div className="pitch-overlay"></div>
            <div className="pitch-center-line"></div>
            <div className="pitch-center-circle"></div>
            <div className="pitch-penalty-box-top"></div>
            <div className="pitch-penalty-box-bottom"></div>
            
            {localPlayer && getPlayerPositions(localPlayer.formation).map((pos, idx) => (
              <div 
                key={idx} 
                className="pitch-node"
                style={{ top: pos.top, left: pos.left }}
              >
                <div className="pitch-node-label">{getPositionLabel(localPlayer.formation, idx)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      {renderExitConfirmModal()}
      {renderTimeoutPopupModal()}
      {renderOpponentLeftModal()}
      </>
    );
  }

  // Render Drafting Phase
  if (room.status === 'drafting') {
    const localSpunTeams = localPlayer?.spunTeams || room.spunTeams || [];
    return (
      <>
        <div className="max-w-6xl p-6 draft-grid">
          <div className="dashboard-panel space-y-6">
            <div className="flex justify-between items-center border-b pb-4">
              <div>
                <p className="text-xs uppercase" style={{ color: 'var(--color-text-dim)' }}>Draft Round {room.draftRound} of 15</p>
                <h2 className="text-lg font-bold" style={{ margin: 0 }}>Draft Player or Manager</h2>
              </div>
              <div className="text-right flex items-center gap-4">
                <div>
                  <p className="text-xs" style={{ color: 'var(--color-text-dim)' }}>Spun Nation</p>
                  <p className="font-extrabold text-white text-md">
                    {localSpunTeams[room.draftRound - 1]?.replace('_', ' ').toUpperCase()}
                  </p>
                </div>
                <button 
                  onClick={handleExitClick}
                  className="btn-sports-secondary" 
                  style={{ padding: '6px 12px', fontSize: '0.7rem' }}
                >
                  Exit Game
                </button>
              </div>
            </div>

          {!draftData ? (
            <div className="matrix-spinner-box">
              <div className="matrix-spinner-reel">
                {isSpinning 
                  ? "SCOUTING..." 
                  : localSpunTeams[room.draftRound - 1]?.replace('_', ' ').toUpperCase()}
              </div>
              <button 
                onClick={handleSpinWheel}
                disabled={isSpinning || hasSpun}
                className="btn-sports"
                style={{ maxWidth: '200px' }}
              >
                {isSpinning ? "SPINNING..." : "SPIN SCOUT REEL"}
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              
              {/* Step instructions */}
              <div className="alert-box alert-box-amber text-xs font-semibold">
                {draftData.manager ? (
                  <span>» <b>REQUIRED STEP:</b> You must draft the manager first to unlock player roster selection.</span>
                ) : selectedCard ? (
                  <span>» <b>STEP 2:</b> Click a flashing node on the pitch map or substitute bench to assign <b>{selectedCard.name}</b>.</span>
                ) : (
                  <span>» <b>STEP 1:</b> Select a player from the roster list below.</span>
                )}
              </div>

              {/* Team Manager choice block */}
              {draftData.manager && (
                <div className="manager-scout-card p-4 rounded-lg flex items-center justify-between animate-pulse" style={{ background: 'rgba(0,0,0,0.4)', border: '2px solid var(--color-gold)', marginBottom: '16px' }}>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg" style={{ background: 'var(--color-gold)', color: '#000' }}>
                      M
                    </div>
                    <div>
                      <h4 className="font-extrabold text-sm text-white">MANAGER: {draftData.manager.name} ({draftData.manager.country})</h4>
                      <p className="text-xs" style={{ color: 'var(--color-gold)' }}>Boost: {draftData.manager.boost}</p>
                      <p className="text-[10px]" style={{ color: 'var(--color-text-dim)', maxWidth: '400px' }}>{draftData.manager.desc}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleSelectDraftManager(draftData.manager)}
                    className="btn-sports"
                    style={{ padding: '8px 16px', background: 'var(--color-gold)', color: '#000', border: 'none', width: 'auto', fontSize: '0.75rem' }}
                  >
                    Draft Manager
                  </button>
                </div>
              )}

              {/* Roster Choices (FUT card grid with search) */}
              <div className="draft-pane">
                <div className="draft-head">
                  <div className="draft-title">
                    <span className="draft-title-name">{draftData.teamName}</span>
                    <span className="draft-year">{draftData.choices[0]?.year || "Historical"}</span>
                  </div>
                  <div className="draft-search-wrapper">
                    <input 
                      className="draft-search" 
                      type="text"
                      placeholder="Search player..." 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>
                
                <div className="draft-subhead" style={{ justifyContent: 'center' }}>
                  <span className="draft-instruct">
                    {draftData.manager ? (
                      <span style={{ color: 'var(--color-gold)' }}>» <b>DRAFT LOCK:</b> Manager selection required.</span>
                    ) : selectedCard ? (
                      <span>» <b>STEP 2:</b> Click a flashing node on the pitch map to assign <b>{selectedCard.name}</b>.</span>
                    ) : (
                      <span>» <b>STEP 1:</b> Click a player card below to select them.</span>
                    )}
                  </span>
                </div>
                
                <div className={`player-list-grid ${draftData.manager ? 'draft-locked' : ''}`}>
                  {draftData.choices
                    .filter(choice => choice.name.toLowerCase().includes(searchQuery.toLowerCase()))
                    .map((choice) => {
                      const isSelected = selectedCard?.id === choice.id;
                      const isEligible = isPlayerEligibleForDraft(choice);
                      
                      let cardTier = "gold";
                      if (choice.rating < 72) cardTier = "bronze";
                      else if (choice.rating < 82) cardTier = "silver";
                      
                      return (
                        <div 
                          key={choice.id}
                          onClick={() => isEligible && handleSelectDraftPlayer(choice)}
                          className={`fut-card ${cardTier} ${isSelected ? 'selected' : ''} ${!isEligible ? 'ineligible' : ''}`}
                        >
                          <div className="fut-card-header">
                            <span className="fut-card-rating">{choice.rating}</span>
                            <span className="fut-card-pos">{choice.position}</span>
                          </div>
                          
                          <div className="fut-card-badge">
                            <PlayerImageOrJersey name={choice.name} teamId={localSpunTeams[room.draftRound - 1]} size={42} />
                          </div>
                          
                          <span className="fut-card-name" title={choice.name}>{choice.name.split(' ').pop()}</span>
                          
                          <div className="fut-card-stats">
                            <div className="fut-card-stat"><span>PAC</span>{choice.stats.pace}</div>
                            <div className="fut-card-stat"><span>SHO</span>{choice.stats.shooting}</div>
                            <div className="fut-card-stat"><span>PAS</span>{choice.stats.passing}</div>
                            <div className="fut-card-stat"><span>DRI</span>{choice.stats.dribbling}</div>
                            <div className="fut-card-stat"><span>DEF</span>{choice.stats.defending}</div>
                            <div className="fut-card-stat"><span>PHY</span>{choice.stats.physical}</div>
                          </div>
                        </div>
                      );
                    })}
                  {draftData.choices.filter(choice => choice.name.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
                    <div style={{ gridColumn: '1 / -1', padding: '24px', textAlign: 'center', color: 'var(--color-text-dim)', fontSize: '0.85rem' }}>
                      No players match search filter.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {localPlayer?.ready && (
            <div className="alert-box">
              WAITING FOR OTHER MANAGER...
            </div>
          )}
        </div>

        {/* Pitch Map (Used to drop drafted players) */}
        <div className="dashboard-panel">
          <div className="text-center mb-4">
            <h3 className="text-sm uppercase font-bold" style={{ color: 'var(--color-text-dim)' }}>Tactical Pitch</h3>
          </div>
          
          <div className="pitch-container">
            <div className="pitch-overlay"></div>
            <div className="pitch-center-line"></div>
            <div className="pitch-center-circle"></div>
            <div className="pitch-penalty-box-top"></div>
            <div className="pitch-penalty-box-bottom"></div>
            
            {localPlayer && getPlayerPositions(localPlayer.formation).map((pos, idx) => {
              const draftedPlayer = localPlayer.squad[idx];
              const slotLabel = getPositionLabel(localPlayer.formation, idx);

              // 38-0-0.com style flashing compatible slot finder
              const isCompatible = selectedCard && 
                                   !draftedPlayer && 
                                   isPositionCompatible(selectedCard.position, slotLabel);

              const isSelectedForSwap = selectedSwapSlot && 
                                        selectedSwapSlot.type === 'squad' && 
                                        selectedSwapSlot.index === idx;

              return (
                <div 
                  key={idx} 
                  onClick={() => handleSlotClick(idx)}
                  className={`pitch-node ${draftedPlayer ? 'filled' : ''} ${isCompatible || isSelectedForSwap ? 'active-draft' : ''}`}
                  style={{ 
                    top: pos.top, 
                    left: pos.left,
                    cursor: isCompatible ? 'pointer' : draftedPlayer ? 'pointer' : 'not-allowed',
                    opacity: selectedCard && !isCompatible && !draftedPlayer ? 0.35 : 1,
                    background: draftedPlayer ? 'transparent' : undefined,
                    border: draftedPlayer ? 'none' : undefined,
                    boxShadow: draftedPlayer ? 'none' : undefined,
                    overflow: draftedPlayer ? 'visible' : 'hidden'
                  }}
                >
                  {draftedPlayer ? (
                    <div style={{ position: 'relative', width: '64px', height: '64px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <PlayerImageOrJersey name={draftedPlayer.name} teamId={draftedPlayer.teamId || localSpunTeams[room.draftRound - 1]} size={46} />
                      <div className="slot-ov">
                        {draftedPlayer.rating}
                      </div>
                      <span className="slot-name">
                        {draftedPlayer.name.split(' ').pop()}
                      </span>
                    </div>
                  ) : (
                    <div className="pitch-node-label">{slotLabel}</div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Subs Bench Slots (Flashes when a card is selected or selected for swap) */}
          {localPlayer && (
            <div className="mt-4 pt-4 border-t">
              <p className="text-xs uppercase font-bold mb-2 text-center" style={{ color: 'var(--color-text-dim)' }}>Substitute Bench</p>
              <div className="flex gap-4 justify-center">
                {Array.from({ length: 3 }).map((_, subIdx) => {
                  const player = localPlayer.subs[subIdx];
                  const isCompatibleSub = selectedCard && !player;
                  const isSelectedSub = selectedSwapSlot && 
                                        selectedSwapSlot.type === 'sub' && 
                                        selectedSwapSlot.index === subIdx;
                  return (
                    <div 
                      key={subIdx}
                      onClick={() => handleSubClick(subIdx)}
                      className={`p-2 rounded-lg text-center ${player ? 'filled' : ''} ${isCompatibleSub || isSelectedSub ? 'active-draft-sub active-draft' : ''}`}
                      style={{ 
                        width: '90px', 
                        background: '#000', 
                        border: isCompatibleSub || isSelectedSub ? '2px solid #fff' : player ? '1px solid var(--color-gold)' : '1px dotted rgba(46,204,113,0.3)',
                        fontSize: '0.65rem',
                        cursor: isCompatibleSub || player ? 'pointer' : 'default',
                        opacity: selectedCard && !isCompatibleSub && !player ? 0.35 : 1,
                        position: 'relative',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minHeight: '80px'
                      }}
                    >
                      {player ? (
                        <>
                          <PlayerImageOrJersey name={player.name} teamId={player.teamId || localSpunTeams[room.draftRound - 1]} size={36} />
                          <div className="slot-ov" style={{
                            position: 'absolute',
                            top: '4px',
                            right: '4px',
                            width: '18px',
                            height: '18px',
                            borderRadius: '50%',
                            background: 'var(--color-gold)',
                            color: '#1a1a1a',
                            fontWeight: '900',
                            fontSize: '9px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: '1.5px solid #000',
                            zIndex: 2
                          }}>
                            {player.rating}
                          </div>
                          <div className="font-bold mt-1" style={{ color: 'var(--color-gold)', fontSize: '0.6rem' }}>
                            {player.name.split(' ').pop()}
                          </div>
                        </>
                      ) : (
                        <>
                          <div>SUB {subIdx + 1}</div>
                          <div className="mt-1" style={{ color: 'var(--color-text-dim)' }}>EMPTY</div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
      {renderExitConfirmModal()}
      {renderTimeoutPopupModal()}
      {renderOpponentLeftModal()}
      </>
    );
  }

  // Render Tournament Dashboard & Statistics
  if (room.status === 'tournament' || room.status === 'finished') {
    const user = room.players.find(p => p.id === socket?.id) || room.players[0];
    const opponent = !room.isSinglePlayer 
      ? (room.players.find(p => p.id !== socket?.id) || room.players[1] || { name: "Disconnected", stats: { totalOvr: 0, att: 0, mid: 0, def: 0 }, squad: {} }) 
      : (room.currentOpponent || { name: "AI Opponent", stats: { totalOvr: 60, att: 60, mid: 60, def: 60 } });
    
    const hasFinished = room.status === 'finished';
    const lastMatch = room.matchesHistory[room.matchesHistory.length - 1];
    const isP1 = lastMatch && lastMatch.playerAName 
      ? lastMatch.playerAName === user.name 
      : room.players[0]?.id === socket?.id;
    const wonCup = hasFinished && (
      room.isSinglePlayer 
        ? (room.aiMode === 'single'
            ? (lastMatch && lastMatch.scoreA > lastMatch.scoreB)
            : (room.matchesPlayed >= 8 && lastMatch && lastMatch.scoreA > lastMatch.scoreB))
        : (room.matchesPlayed === 1 && lastMatch && (isP1 ? lastMatch.scoreA > lastMatch.scoreB : lastMatch.scoreB > lastMatch.scoreA))
    );

    const sortedScorers = Object.entries(room.playerStats || {}).map(([name, s]) => ({ name, ...s })).sort((a,b) => b.goals - a.goals);
    const sortedAssisters = Object.entries(room.playerStats || {}).map(([name, s]) => ({ name, ...s })).sort((a,b) => b.assists - a.assists);
    const sortedGKs = Object.entries(room.playerStats || {}).map(([name, s]) => ({ name, ...s })).sort((a,b) => b.cleanSheets - a.cleanSheets);

    const groups = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];

    return (
      <>
        {hasFinished && wonCup && <ConfettiCelebration />}
        <div className="max-w-6xl p-6 space-y-8">
          
          {/* Header Campaign Banner */}
          <div className="dashboard-panel flex justify-between items-center" style={{ flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <p className="text-xs uppercase" style={{ color: 'var(--color-text-dim)' }}>
                {room.isSinglePlayer ? "FIFA World Cup Campaign 2026" : "Multiplayer Duel Arena"}
              </p>
              <h2 className="logo-heading" style={{ fontSize: '1.6rem' }}>
                {hasFinished 
                  ? (wonCup ? (room.isSinglePlayer ? "🏆 CHAMPION!" : "🏆 VICTORY!") : "💀 DEFEATED") 
                  : (room.isSinglePlayer && room.aiMode !== 'single'
                      ? `STAGE RUN: MATCH ${room.matchesPlayed + 1} OF 8` 
                      : "CHALLENGE MATCH: 1-GAME FINAL")
                }
              </h2>
              <p className="text-xs font-bold" style={{ color: 'var(--color-gold)', marginTop: '4px' }}>
                {hasFinished ? (wonCup ? (room.isSinglePlayer ? "YOU CLAIMED SUPREME GLORY!" : "YOU WON THE DUEL!") : (room.isSinglePlayer ? "END OF TOURNAMENT" : "YOU LOST THE DUEL")) : (
                  room.isSinglePlayer && room.aiMode !== 'single' ? (
                    room.matchesPlayed < 3 
                      ? `GROUP STAGE MATCH - GROUP A`
                      : room.matchesPlayed === 3 ? "ROUND of 32 (GAME 4)"
                      : room.matchesPlayed === 4 ? "ROUND OF 16 (GAME 5)"
                      : room.matchesPlayed === 5 ? "QUARTERFINAL (GAME 6)"
                      : room.matchesPlayed === 6 ? "SEMIFINAL (GAME 7)" : "THE WORLD CUP FINAL (GAME 8)"
                  ) : "DEFEAT YOUR OPPONENT TO CLAIM BRAGGING RIGHTS!"
                )}
              </p>
            </div>

            <div className="flex gap-4 items-center">
              <div className="flex gap-2">
                {room.matchesHistory.map((h, idx) => {
                  const won = h.scoreA > h.scoreB;
                  const draw = h.scoreA === h.scoreB;
                  return (
                    <div 
                      key={idx} 
                      className={`result-bubble ${won ? 'badge-win' : draw ? 'badge-draw' : 'badge-loss'}`}
                    >
                      {won ? 'W' : draw ? 'D' : 'L'}
                    </div>
                  );
                })}
              </div>
              {!hasFinished ? (
                <button 
                  onClick={handleExitClick}
                  className="btn-sports"
                  style={{ padding: '6px 12px', background: '#c0392b', color: '#fff', border: 'none', width: 'auto', fontSize: '0.75rem', height: 'fit-content' }}
                >
                  Leave Game
                </button>
              ) : (
                <button 
                  onClick={handleLeaveRoom}
                  className="btn-sports-secondary"
                  style={{ padding: '6px 12px', width: 'auto', fontSize: '0.75rem', height: 'fit-content' }}
                >
                  Exit to Menu
                </button>
              )}
            </div>
          </div>

        {/* Dashboard Tabs Toggle */}
        <div className="tab-row">
          <button onClick={() => setActiveDashboardTab("SCOUTING")} className={`tab-btn ${activeDashboardTab === "SCOUTING" ? 'active' : ''}`}>Squad Scouting</button>
          {room.isSinglePlayer && room.aiMode !== 'single' && <button onClick={() => setActiveDashboardTab("STANDINGS")} className={`tab-btn ${activeDashboardTab === "STANDINGS" ? 'active' : ''}`}>All Groups Standings</button>}
          <button onClick={() => setActiveDashboardTab("STATS")} className={`tab-btn ${activeDashboardTab === "STATS" ? 'active' : ''}`}>Leaderboards</button>
          {user && <button onClick={() => setActiveDashboardTab("HISTORY")} className={`tab-btn ${activeDashboardTab === "HISTORY" ? 'active' : ''}`}>🏆 {room.isSinglePlayer ? "Tournament History" : "Match History"}</button>}
        </div>

        {/* --- TAB 1: SQUAD SCOUTING & CONTROLS --- */}
        {activeDashboardTab === "SCOUTING" && (
          <div className="tournament-grid">
            
            {/* Tactic adjust card */}
            <div className="dashboard-panel space-y-6">
              <h3 className="text-sm uppercase font-bold border-b pb-2">Manager Board</h3>

              {user.manager && (
                <div className="manager-board-card">
                  <div className="manager-board-name">Manager: {user.manager.name} ({user.manager.country})</div>
                  <div className="manager-board-boost">Boost: {user.manager.boost}</div>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '1rem' }}>
                <div>
                  <label className="block text-xs mb-2 uppercase font-semibold">Tactic Style</label>
                  <select 
                    value={user.tactic} 
                    onChange={e => handleUpdateTactic(e.target.value)}
                    className="sports-input"
                    disabled={simulationActive}
                  >
                    {Object.keys(TACTIC_DETAILS).map(tacKey => (
                      <option key={tacKey} value={tacKey}>{TACTIC_DETAILS[tacKey].name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs mb-2 uppercase font-semibold">Play Style</label>
                  <select 
                    value={localPlayer?.playStyle || "balanced"} 
                    onChange={e => handleUpdatePlayStyle(e.target.value)}
                    className="sports-input"
                    disabled={simulationActive}
                  >
                    <option value="balanced">Balanced</option>
                    <option value="attack">Attack (+3 ATT / -2 DEF)</option>
                    <option value="defense">Defense (+3 DEF / -2 ATT)</option>
                    <option value="control">Midfield Control (+2 MID)</option>
                  </select>
                </div>
              </div>

              <div className="tactic-info-card">
                <h4 className="tactic-info-title">
                  {TACTIC_DETAILS[user.tactic]?.name}
                </h4>
                <p className="tactic-info-desc">{TACTIC_DETAILS[user.tactic]?.desc}</p>
              </div>

              {!hasFinished && (
                <div className="pt-4 border-t">
                  {!user.ready ? (
                    <button onClick={handleReadyMatch} className="btn-sports w-full flex justify-between items-center px-4">
                      <span>Kick Off Match</span>
                      {!room.isSinglePlayer && (
                        <span className="font-mono bg-red-600/20 text-red-500 border border-red-500/30 px-2 py-0.5 rounded text-[10px] animate-pulse">
                          [ 00:{countdown < 10 ? '0' + countdown : countdown} ]
                        </span>
                      )}
                    </button>
                  ) : (
                    <div className="alert-box text-sm">AWAITING OPPONENT READY...</div>
                  )}
                </div>
              )}

              {hasFinished && (
                <button onClick={handleRestart} className="btn-sports w-full">
                  <RotateCcw size={16} /> Start New Tournament
                </button>
              )}
            </div>

            {/* Pitch & substitutes view */}
            <div className="dashboard-panel flex flex-col gap-4">
              <h3 className="text-sm uppercase font-bold border-b pb-2 text-center">Active Starting XI</h3>
              
              {selectedSwapSlot !== null && (
                <div className="alert-box alert-box-amber text-xs">
                  SWAP MODE: Select a slot in the other section (bench/starting XI) to swap.
                </div>
              )}

              <div className="pitch-container" style={{ maxHeight: '420px' }}>
                <div className="pitch-overlay"></div>
                <div className="pitch-center-line"></div>
                <div className="pitch-center-circle"></div>
                <div className="pitch-penalty-box-top"></div>
                <div className="pitch-penalty-box-bottom"></div>
                
                {getPlayerPositions(user.formation).map((pos, idx) => {
                  const player = user.squad[idx];
                  const isSelectedForSwap = selectedSwapSlot && selectedSwapSlot.type === 'squad' && selectedSwapSlot.index === idx;

                  return (
                    <div 
                      key={idx} 
                      onClick={() => handleSlotClick(idx)}
                      className={`pitch-node ${player ? 'filled' : ''} ${isSelectedForSwap ? 'active-draft' : ''}`}
                      style={{ 
                        top: pos.top, 
                        left: pos.left,
                        background: player ? 'transparent' : undefined,
                        border: player ? 'none' : undefined,
                        boxShadow: player ? 'none' : undefined,
                        overflow: player ? 'visible' : 'hidden'
                      }}
                    >
                      {player ? (
                        <div style={{ position: 'relative', width: '64px', height: '64px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <PlayerImageOrJersey name={player.name} teamId={player.teamId} size={46} />
                          <div className="slot-ov">
                            {player.rating}
                          </div>
                          <span className="slot-name">
                            {player.name.split(' ').pop()}
                          </span>
                        </div>
                      ) : (
                        <div className="pitch-node-label">{getPositionLabel(user.formation, idx)}</div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="pt-4 border-t">
                <p className="text-xs uppercase font-bold mb-2 text-center" style={{ color: 'var(--color-text-dim)' }}>Substitute Bench (Click slot in other section to swap)</p>
                <div className="flex gap-4 justify-center">
                  {Array.from({ length: 3 }).map((_, subIdx) => {
                    const player = user.subs[subIdx];
                    const isSelectedSub = selectedSwapSlot && selectedSwapSlot.type === 'sub' && selectedSwapSlot.index === subIdx;
                    return (
                      <div 
                        key={subIdx}
                        onClick={() => handleSubClick(subIdx)}
                        className={`p-2 rounded-lg text-center ${player ? 'filled' : ''} ${isSelectedSub ? 'active-draft' : ''}`}
                        style={{ 
                          width: '95px', 
                          background: '#000', 
                          border: isSelectedSub ? '2px solid #fff' : player ? '1px solid var(--color-gold)' : '1px dotted rgba(46,204,113,0.3)',
                          fontSize: '0.68rem',
                          cursor: 'pointer',
                          position: 'relative',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          minHeight: '80px'
                        }}
                      >
                        {player ? (
                          <>
                            <PlayerImageOrJersey name={player.name} teamId={player.teamId} size={36} />
                            <div className="slot-ov" style={{
                              position: 'absolute',
                              top: '4px',
                              right: '4px',
                              width: '18px',
                              height: '18px',
                              borderRadius: '50%',
                              background: 'var(--color-gold)',
                              color: '#1a1a1a',
                              fontWeight: '900',
                              fontSize: '9px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              border: '1.5px solid #000',
                              zIndex: 2
                            }}>
                              {player.rating}
                            </div>
                            <div className="font-bold mt-1" style={{ color: 'var(--color-gold)', fontSize: '0.6rem' }}>
                              {player.name.split(' ').pop()}
                            </div>
                            {player.suspended && (
                              <div className="text-[8px] bg-red-600 text-white px-1 py-0.5 rounded font-extrabold mt-1">
                                SUSPENDED
                              </div>
                            )}
                          </>
                        ) : (
                          <>
                            <div>SUB {subIdx + 1}</div>
                            <div className="mt-1" style={{ color: 'var(--color-text-dim)' }}>EMPTY</div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

          </div>
        )}

        {/* --- TAB 2: STANDINGS (ALL 12 GROUPS) --- */}
        {activeDashboardTab === "STANDINGS" && room.isSinglePlayer && (
          <div className="dashboard-panel space-y-6">
            <div className="flex justify-between items-center border-b pb-4" style={{ flexWrap: 'wrap', gap: '12px' }}>
              <h3 className="text-sm uppercase font-bold">Groups Standings Directory</h3>
              <div className="flex items-center gap-2">
                <span className="text-xs" style={{ color: 'var(--color-text-dim)' }}>Select Group:</span>
                <select 
                  value={selectedStandingsGroup} 
                  onChange={e => setSelectedStandingsGroup(e.target.value)}
                  className="sports-input"
                  style={{ width: '120px', padding: '8px 12px' }}
                >
                  {groups.map(gLetter => (
                    <option key={gLetter} value={gLetter}>Group {gLetter}</option>
                  ))}
                </select>
              </div>
            </div>

            {room.allGroupsStandings && room.allGroupsStandings[selectedStandingsGroup] ? (
              <table className="retro-table">
                <thead>
                  <tr>
                    <th>TEAM</th>
                    <th>P</th>
                    <th>W</th>
                    <th>D</th>
                    <th>L</th>
                    <th>GF</th>
                    <th>GA</th>
                    <th>GD</th>
                    <th>PTS</th>
                  </tr>
                </thead>
                <tbody>
                  {room.allGroupsStandings[selectedStandingsGroup].map((team, idx) => (
                    <tr key={idx} className={team.isUser ? 'active-row' : ''}>
                      <td>{idx + 1}. {team.name} {team.isUser ? "[YOU]" : ""}</td>
                      <td>{team.played}</td>
                      <td>{team.won}</td>
                      <td>{team.drawn}</td>
                      <td>{team.lost}</td>
                      <td>{team.gf}</td>
                      <td>{team.ga}</td>
                      <td>{team.gd}</td>
                      <td>{team.points}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-center text-slate-500">Group standing details unavailable.</p>
            )}
          </div>
        )}

        {/* --- TAB 3: STATS LEADERBOARD --- */}
        {activeDashboardTab === "STATS" && (
          <div className="grid-2" style={{ gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
            
            <div className="dashboard-panel space-y-6">
              <h3 className="text-sm uppercase font-bold border-b pb-2 text-center" style={{ color: 'var(--color-gold)' }}>🎖️ Attacking Leaderboard</h3>
              
              <div className="space-y-4">
                <h4 className="text-xs uppercase font-bold text-center">Golden Boot (Most Goals)</h4>
                {sortedScorers.length > 0 ? (
                  <table className="retro-table">
                    <thead>
                      <tr>
                        <th>RANK</th>
                        <th>PLAYER</th>
                        <th>GOALS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedScorers.slice(0, 5).map((p, idx) => (
                        <tr key={idx}>
                          <td>{idx + 1}</td>
                          <td style={{ textAlign: 'left', fontWeight: 'bold' }}>{p.name}</td>
                          <td style={{ color: 'var(--color-gold)', fontWeight: 'bold' }}>{p.goals}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="text-center text-xs text-slate-500 py-4">No goals recorded yet.</p>
                )}
              </div>

              <div className="space-y-4 pt-4 border-t">
                <h4 className="text-xs uppercase font-bold text-center">Top Playmakers (Assists)</h4>
                {sortedAssisters.length > 0 ? (
                  <table className="retro-table">
                    <thead>
                      <tr>
                        <th>RANK</th>
                        <th>PLAYER</th>
                        <th>ASSISTS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedAssisters.slice(0, 5).map((p, idx) => (
                        <tr key={idx}>
                          <td>{idx + 1}</td>
                          <td style={{ textAlign: 'left', fontWeight: 'bold' }}>{p.name}</td>
                          <td style={{ color: 'var(--color-gold)', fontWeight: 'bold' }}>{p.assists}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="text-center text-xs text-slate-500 py-4">No assists recorded yet.</p>
                )}
              </div>
            </div>

            <div className="dashboard-panel space-y-6">
              <h3 className="text-sm uppercase font-bold border-b pb-2 text-center" style={{ color: 'var(--color-gold)' }}>🛡️ Defensive Leaderboard</h3>
              
              <div className="space-y-4">
                <h4 className="text-xs uppercase font-bold text-center">Golden Glove (Clean Sheets)</h4>
                {sortedGKs.length > 0 ? (
                  <table className="retro-table">
                    <thead>
                      <tr>
                        <th>RANK</th>
                        <th>GOALKEEPER</th>
                        <th>CLEAN SHEETS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedGKs.slice(0, 5).map((p, idx) => (
                        <tr key={idx}>
                          <td>{idx + 1}</td>
                          <td style={{ textAlign: 'left', fontWeight: 'bold' }}>{p.name}</td>
                          <td style={{ color: 'var(--color-gold)', fontWeight: 'bold' }}>{p.cleanSheets}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="text-center text-xs text-slate-500 py-4">No clean sheets recorded yet.</p>
                )}
              </div>
            </div>

          </div>
        )}

        {/* --- TAB 4: TOURNAMENT/MATCH HISTORY --- */}
        {activeDashboardTab === "HISTORY" && user && (
          <div className="dashboard-panel space-y-6">
            <h3 className="text-sm uppercase font-bold border-b pb-2 flex items-center gap-2" style={{ color: 'var(--color-gold)' }}>
              <Award size={16} /> {room.isSinglePlayer ? "Cloud Campaign History Log" : "Match History Log"}
            </h3>

            {loadingHistory ? (
              <div className="text-center py-8 text-xs animate-pulse" style={{ color: 'var(--color-text-dim)' }}>
                LOADING CLOUD HISTORY...
              </div>
            ) : historicalRuns.length === 0 ? (
              <div className="text-center py-8 text-xs" style={{ color: 'var(--color-text-dim)' }}>
                No completed tournament logs found in your account history.
              </div>
            ) : (
              <div className="space-y-4">
                {historicalRuns.map((run) => {
                  const isExpanded = expandedRunId === run.id;
                  const dateStr = new Date(run.created_at).toLocaleDateString(undefined, {
                    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                  });

                  const getStageLabel = (stagesPlayed, wonCup, isTerminated) => {
                    if (isTerminated) return "❌ TERMINATED";
                    if (wonCup) return "🏆 CHAMPIONS!";
                    if (stagesPlayed <= 3) return "Group Stage";
                    if (stagesPlayed === 4) return "Round of 32";
                    if (stagesPlayed === 5) return "Round of 16";
                    if (stagesPlayed === 6) return "Quarterfinal";
                    if (stagesPlayed === 7) return "Semifinal";
                    if (stagesPlayed === 8) return "Runner-up";
                    return `Match ${stagesPlayed}`;
                  };

                  return (
                    <div key={run.id} className="p-4 rounded-lg" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(46,204,113,0.15)' }}>
                      <div className="flex justify-between items-center flex-wrap gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-white text-sm">{run.user_team}</span>
                            <span className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded uppercase font-semibold">
                              VS {run.type}
                            </span>
                          </div>
                          <p className="text-[10px] mt-1" style={{ color: 'var(--color-text-dim)' }}>
                            <Calendar size={10} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} /> {dateStr}
                          </p>
                        </div>
                        
                        <div className="flex items-center gap-4">
                          <span className="text-xs font-extrabold" style={{ color: run.won_cup ? 'var(--color-gold)' : run.is_terminated ? '#c0392b' : 'var(--color-white)' }}>
                            {getStageLabel(run.stages_played, run.won_cup, run.is_terminated)}
                          </span>
                          {run.tournament_matches && run.tournament_matches.length > 0 && (
                            <button 
                              onClick={() => setExpandedRunId(isExpanded ? null : run.id)}
                              className="btn-sports-secondary"
                              style={{ padding: '6px 12px', fontSize: '0.68rem' }}
                            >
                              {isExpanded ? 'Hide Details' : 'View Matches'}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Expanded matches list */}
                      {isExpanded && (
                        <div className="mt-4 pt-4 border-t border-dashed" style={{ borderColor: 'rgba(46,204,113,0.2)' }}>
                          <h4 className="text-[10px] uppercase font-bold mb-2 text-slate-400">Match Progression:</h4>
                          <div className="space-y-2">
                            {run.tournament_matches?.sort((a,b) => a.match_num - b.match_num).map((match, mIdx) => {
                              const wonMatch = match.score_a > match.score_b;
                              const drawMatch = match.score_a === match.score_b;
                              return (
                                <div key={mIdx} className="flex justify-between items-center text-xs p-2 rounded" style={{ background: 'rgba(0,0,0,0.2)' }}>
                                  <span style={{ color: 'var(--color-text-dim)' }}>Match {match.match_num}</span>
                                  <span className="font-semibold text-white">
                                    {match.team_a_name} <span style={{ color: 'var(--color-gold)' }}>{match.score_a} - {match.score_b}</span> {match.team_b_name}
                                  </span>
                                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${wonMatch ? 'bg-green-500/10 text-green-400' : drawMatch ? 'bg-slate-500/10 text-slate-400' : 'bg-red-500/10 text-red-400'}`}>
                                    {wonMatch ? 'W' : drawMatch ? 'D' : 'L'}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Scouting report detail overlay */}
        {!hasFinished && activeDashboardTab === "SCOUTING" && (
          <div className="dashboard-panel opp-card-panel space-y-4">
            <h3 className="text-sm uppercase font-bold border-b pb-2 flex items-center gap-2" style={{ color: '#e74c3c' }}>
              <Shield size={16} /> Scouting Report: Opponent Details
            </h3>

            <div className="grid-2" style={{ gridTemplateColumns: '1fr 2fr', gap: '24px' }}>
              <div className="space-y-4">
                <div style={{ background: '#000', padding: '16px', borderRadius: '8px', border: '1px solid rgba(231, 76, 60, 0.3)' }}>
                  <p className="font-bold text-lg text-white">{opponent.name}</p>
                  {opponent.manager && <p className="text-xs mt-1" style={{ color: 'var(--color-text-dim)' }}>Manager: {opponent.manager.name}</p>}
                  <p className="text-xs" style={{ color: 'var(--color-text-dim)' }}>Tactic: {opponent.tactic?.toUpperCase()}</p>
                </div>
                <div className="scouting-power-box">
                  <div className="scouting-power-title">POWER RATINGS</div>
                  <div className="scouting-power-grid">
                    <div className="scouting-power-item">
                      OVR
                      <span className="scouting-power-value">{opponent.stats?.totalOvr}</span>
                    </div>
                    <div className="scouting-power-item">
                      ATT
                      <span className="scouting-power-value">{opponent.stats?.att}</span>
                    </div>
                    <div className="scouting-power-item">
                      MID
                      <span className="scouting-power-value">{opponent.stats?.mid}</span>
                    </div>
                    <div className="scouting-power-item">
                      DEF
                      <span className="scouting-power-value">{opponent.stats?.def}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-xs uppercase font-bold mb-2">Active Opponent Squad Roster</p>
                <div 
                  className="flex gap-2 opponent-roster-scroll-container" 
                  style={{ 
                    overflowX: 'auto', 
                    whiteSpace: 'nowrap', 
                    padding: '8px 4px', 
                    background: 'rgba(0, 0, 0, 0.3)', 
                    border: '1px solid rgba(255, 255, 255, 0.05)', 
                    borderRadius: '8px', 
                    width: '100%',
                    justifyContent: 'flex-start',
                    alignItems: 'center'
                  }}
                >
                  {opponent.squad && Object.values(opponent.squad).filter(Boolean).map((p, idx) => {
                    let cardTier = "gold";
                    if (p.rating < 72) cardTier = "bronze";
                    else if (p.rating < 82) cardTier = "silver";
                    
                    return (
                      <div 
                        key={idx} 
                        className={`fut-card ${cardTier}`}
                        style={{ 
                          width: '90px', 
                          height: '135px', 
                          padding: '6px',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          flexShrink: 0,
                          justifyContent: 'space-between',
                          boxShadow: '0 4px 8px rgba(0,0,0,0.4)',
                          cursor: 'default',
                          transform: 'none'
                        }}
                      >
                        {/* Custom Hover Tooltip Pop-up */}
                        <div className="fut-card-tooltip">
                          <div className="tooltip-stat"><span>PAC</span> {p.stats?.pace || 50}</div>
                          <div className="tooltip-stat"><span>SHO</span> {p.stats?.shooting || 50}</div>
                          <div className="tooltip-stat"><span>PAS</span> {p.stats?.passing || 50}</div>
                          <div className="tooltip-stat"><span>DRI</span> {p.stats?.dribbling || 50}</div>
                          <div className="tooltip-stat"><span>DEF</span> {p.stats?.defending || 50}</div>
                          <div className="tooltip-stat"><span>PHY</span> {p.stats?.physical || 50}</div>
                        </div>

                        <div className="flex justify-between w-full" style={{ fontSize: '0.65rem', fontWeight: 900, lineHeight: 1 }}>
                          <span>{p.rating}</span>
                          <span>{p.position}</span>
                        </div>
                        <div style={{ margin: '2px 0' }}>
                          <PlayerImageOrJersey name={p.name} teamId={p.teamId || opponent.manager?.country} size={30} />
                        </div>
                        <span className="font-bold text-center" style={{ width: '100%', fontSize: '0.62rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '2px' }}>
                          {p.name.split(' ').pop()}
                        </span>
                        <span style={{ fontSize: '0.48rem', opacity: 0.7, textTransform: 'uppercase', fontWeight: 800 }}>
                          OVR: {p.rating}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Live Match Simulation Overlay */}
        {simulationActive && (
          <div style={{
            position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
            background: 'rgba(0, 0, 0, 0.96)', zIndex: 10000, display: 'flex',
            alignItems: 'center', justifyContent: 'center', padding: '24px',
            overflowY: 'auto'
          }}>
            <div className="dashboard-panel max-w-6xl p-6 space-y-6" style={{ margin: 'auto', border: '2px solid rgba(255, 255, 255, 0.15)' }}>
              <h3 className="logo-heading text-center" style={{ fontSize: '1.4rem' }}>WORLD CUP SIMULATION</h3>

              <div className="grid-2 text-center" style={{ gridTemplateColumns: '1.2fr auto 1.2fr', background: '#000', padding: '20px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.15)', alignItems: 'center' }}>
                <div>
                  <p className="font-bold text-lg text-white">{simDetails?.teamAName}</p>
                  <p className="text-xs" style={{ color: 'var(--color-text-dim)' }}>
                    OVR: {simDetails?.teamAStats?.totalOvr || 75} | {simDetails?.teamAStats?.tactic?.toUpperCase() || 'BALANCED'}
                  </p>
                </div>
                <div style={{ padding: '0 30px' }}>
                  <div className="text-3xl font-extrabold" style={{ color: 'var(--color-gold)' }}>
                    {getRunningScore()[0]} - {getRunningScore()[1]}
                  </div>
                  {!simFinished ? (
                    <span className="text-xs font-bold uppercase animate-pulse" style={{ color: '#ffffff', display: 'inline-block', marginTop: '6px' }}>LIVE MATCHPLAY</span>
                  ) : (
                    <span className="text-xs font-bold uppercase" style={{ color: 'var(--color-gold)', display: 'inline-block', marginTop: '6px' }}>FULL TIME</span>
                  )}
                </div>
                <div>
                  <p className="font-bold text-lg text-white">{simDetails?.teamBName}</p>
                  <p className="text-xs" style={{ color: 'var(--color-text-dim)' }}>
                    OVR: {simDetails?.teamBStats?.totalOvr || 75} | {simDetails?.teamBStats?.tactic?.toUpperCase() || 'BALANCED'}
                  </p>
                </div>
              </div>

              {/* 3D Field Visualizer */}
              <div className="sim-field-container">
                <div className="sim-field-pitch">
                  <div className="sim-field-grid"></div>
                  <div className="sim-field-center-line"></div>
                  <div className="sim-field-center-circle"></div>
                  <div className="sim-field-penalty-left"></div>
                  <div className="sim-field-penalty-right"></div>
                  
                  {/* Flashing Goalposts */}
                  <div className={`sim-goalpost left ${alertMessage && alertMessage.toLowerCase().includes('against') ? 'flash' : ''}`}></div>
                  <div className={`sim-goalpost right ${alertMessage && alertMessage.toLowerCase().includes('you') ? 'flash' : ''}`}></div>

                  {/* Dynamic Tactical Players */}
                  {(() => {
                    const bx = parseFloat(ballPos.x) || 50;
                    const by = parseFloat(ballPos.y) || 50;
                    
                    // Team A (Gold/White core)
                    const p1Att = { x: `${52 + bx * 0.35}%`, y: `${by * 0.7 + 15}%` };
                    const p1Mid = { x: `${30 + bx * 0.25}%`, y: `${40 + (by - 50) * 0.4}%` };
                    const p1Def = { x: `${10 + bx * 0.15}%`, y: `${30 + (by - 50) * 0.2}%` };

                    // Team B (Crimson/Dark core)
                    const p2Att = { x: `${48 - (100 - bx) * 0.35}%`, y: `${by * 0.7 + 15}%` };
                    const p2Mid = { x: `${70 - (100 - bx) * 0.25}%`, y: `${60 - (50 - by) * 0.4}%` };
                    const p2Def = { x: `${90 - (100 - bx) * 0.15}%`, y: `${70 - (50 - by) * 0.2}%` };

                    return (
                      <>
                        <div className="sim-player-dot team-a" style={{ left: p1Att.x, top: p1Att.y }} title="Striker"></div>
                        <div className="sim-player-dot team-a" style={{ left: p1Mid.x, top: p1Mid.y }} title="Midfielder"></div>
                        <div className="sim-player-dot team-a" style={{ left: p1Def.x, top: p1Def.y }} title="Defender"></div>

                        <div className="sim-player-dot team-b" style={{ left: p2Att.x, top: p2Att.y }} title="Striker"></div>
                        <div className="sim-player-dot team-b" style={{ left: p2Mid.x, top: p2Mid.y }} title="Midfielder"></div>
                        <div className="sim-player-dot team-b" style={{ left: p2Def.x, top: p2Def.y }} title="Defender"></div>
                      </>
                    );
                  })()}

                  {/* Ball element animated via top/left inline styles */}
                  <div 
                    className="sim-field-ball"
                    style={{ left: ballPos.x, top: ballPos.y }}
                  ></div>
 
                  {/* Broadcast Alert Text overlay */}
                  {alertMessage && (
                    <div className="sim-field-alert-overlay">
                      <div className="sim-field-alert-text">{alertMessage}</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Interactive Penalty Shootout spot selection */}
              {room.status === 'shootout' && room.shootout && (() => {
                const localPlayerRole = room.shootout.strikerId === socket?.id ? 'striker' : (room.shootout.keeperId === socket?.id ? 'keeper' : 'spectator');
                const hasSubmitted = localPlayerRole === 'striker' ? room.shootout.hasSubmittedStriker : (localPlayerRole === 'keeper' ? room.shootout.hasSubmittedKeeper : true);
                
                return (
                  <div className="shootout-overlay">
                    <div className="text-center mb-3">
                      <h4 className="text-sm font-bold uppercase text-white" style={{ color: 'var(--color-gold)' }}>
                        🏆 INTERACTIVE PENALTY SHOOTOUT
                      </h4>
                      <p className="text-xs font-mono text-slate-300">
                        Round {room.shootout.round} | {room.shootout.teamAName} {room.shootout.scoreA} - {room.shootout.scoreB} {room.shootout.teamBName}
                      </p>
                      {hasSubmitted ? (
                        <p className="text-xs animate-pulse text-amber-500 font-bold mt-2">
                          Waiting for opponent to make their selection...
                        </p>
                      ) : (
                        <>
                          <h5 className="text-xs uppercase font-bold text-white mt-2">
                            {localPlayerRole === 'striker' ? '🎯 YOU ARE TAKING THE PENALTY' : '🧤 YOU ARE DEFENDING'}
                          </h5>
                          <p className="text-[10px]" style={{ color: 'var(--color-text-dim)' }}>
                            {localPlayerRole === 'striker' 
                              ? 'Select a target area to strike the penalty kick:' 
                              : 'Anticipate the striker and select a corner to dive:'}
                          </p>
                        </>
                      )}
                    </div>
                    
                    {!hasSubmitted && (
                      <div className="penalty-goal-grid">
                        <button onClick={() => handleInteractiveShootoutChoice(1)} className="penalty-spot-btn">Top Left</button>
                        <button onClick={() => handleInteractiveShootoutChoice(2)} className="penalty-spot-btn">Top Center</button>
                        <button onClick={() => handleInteractiveShootoutChoice(3)} className="penalty-spot-btn">Top Right</button>
                        <button onClick={() => handleInteractiveShootoutChoice(4)} className="penalty-spot-btn">Mid Left</button>
                        <button onClick={() => handleInteractiveShootoutChoice(5)} className="penalty-spot-btn">Center</button>
                        <button onClick={() => handleInteractiveShootoutChoice(6)} className="penalty-spot-btn">Mid Right</button>
                        <button onClick={() => handleInteractiveShootoutChoice(7)} className="penalty-spot-btn">Bottom L</button>
                        <button onClick={() => handleInteractiveShootoutChoice(8)} className="penalty-spot-btn">Bottom C</button>
                        <button onClick={() => handleInteractiveShootoutChoice(9)} className="penalty-spot-btn">Bottom R</button>
                      </div>
                    )}
                    
                    {/* Shootout commentary log */}
                    <div className="mt-3 max-h-[80px] overflow-y-auto space-y-1 text-left border-t border-white/10 pt-2 text-[10px] font-mono text-slate-400">
                      {room.shootout.events.map((e, idx) => (
                        <div key={idx} className="border-b border-white/5 pb-1 last:border-none">
                          {e.text}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              <div className="ticker-console">
                {visibleEvents.map((ev, idx) => {
                  let eventClass = "";
                  if (ev.type === 'goal') eventClass = "goal";
                  if (ev.type === 'yellow_card') eventClass = "yellow";
                  if (ev.type === 'red_card') eventClass = "red";
                  
                  return (
                    <div key={idx} className={`ticker-event ${eventClass}`}>
                      <div className="ticker-time">{ev.time}'</div>
                      <div className="ticker-text">{ev.text}</div>
                    </div>
                  );
                })}
                <div ref={eventListEndRef} />
              </div>

              {simFinished && (
                <div className="flex justify-center">
                  <button 
                    onClick={handleContinue}
                    className="btn-sports"
                    style={{ maxWidth: '200px' }}
                  >
                    CONTINUE
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      {renderExitConfirmModal()}
      {renderTimeoutPopupModal()}
      {renderOpponentLeftModal()}
      {screenLoading && (
        <div className="screen-transition-overlay">
          <div className="screen-transition-content">
            <div className="screen-transition-spinner"></div>
            <div className="screen-transition-text">{loadingText}</div>
          </div>
        </div>
      )}
      </>
    );
  }

  return null;
}
