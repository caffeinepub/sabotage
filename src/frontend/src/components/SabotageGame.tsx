import { useEffect, useRef, useState } from "react";

// COD font injected once
if (!document.getElementById("cod-fonts")) {
  const link = document.createElement("link");
  link.id = "cod-fonts";
  link.rel = "stylesheet";
  link.href =
    "https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;600;700&family=Oswald:wght@400;600;700&display=swap";
  document.head.appendChild(link);
}

// ── Types ────────────────────────────────────────────────────────────────────
interface Wall {
  x: number;
  z: number;
  w: number;
  h: number;
  d: number;
}

interface Task {
  x: number;
  z: number;
  name: string;
  completed: boolean;
}

interface Bot {
  x: number;
  z: number;
  color: string;
  alive: boolean;
  vx: number;
  vz: number;
  name: string;
  speed: number;
  targetTaskIndex: number;
  pauseFrames: number;
}

interface DeadBody {
  x: number;
  z: number;
  color: string;
}

interface Player {
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
  isSprinting: boolean;
}

interface GameState {
  isPlaying: boolean;
  isImpostor: boolean;
  killCooldown: number;
  tasksCompleted: number;
  gameOver: boolean;
  totalTasks: number;
}

interface BtnColors {
  sprint: string;
  meeting: string;
  report: string;
  use: string;
  kill: string;
}

interface Settings {
  moveSpeed: number;
  killCooldown: number;
  numBots: number;
  numTasks: number;
  btnColors: BtnColors;
}

// ── Map Definitions ───────────────────────────────────────────────────────────

interface MapZone {
  name: string;
  x1: number;
  x2: number;
  z1: number;
  z2: number;
}
interface MapRoomLabel {
  name: string;
  x: number;
  z: number;
}
interface MapDefinition {
  id: string;
  label: string;
  description: string;
  walls: Wall[];
  tasks: Omit<Task, "completed">[];
  bots: Omit<Bot, "speed" | "targetTaskIndex" | "pauseFrames">[];
  zones: MapZone[];
  roomLabels: MapRoomLabel[];
  playerSpawn: { x: number; z: number };
}

const MAPS: Record<string, MapDefinition> = {
  alcatraz: {
    id: "alcatraz",
    label: "ALCATRAZ",
    description:
      "Maximum security island prison. Multiple wings & role stations.",
    playerSpawn: { x: 0, z: 0 },
    // Outer perimeter + internal room dividers
    walls: [
      // Outer walls
      { x: -28, z: -28, w: 56, h: 2, d: 2 }, // north
      { x: -28, z: 26, w: 56, h: 2, d: 2 }, // south
      { x: -28, z: -28, w: 2, h: 2, d: 56 }, // west
      { x: 26, z: -28, w: 2, h: 2, d: 56 }, // east
      // Cell block divider (N-S corridor wall)
      { x: -2, z: -28, w: 4, h: 2, d: 22 },
      { x: -2, z: 6, w: 4, h: 2, d: 20 },
      // Engineer wing walls (SW)
      { x: -28, z: 4, w: 18, h: 2, d: 2 },
      { x: -12, z: 4, w: 2, h: 2, d: 12 },
      // Doctor/Medbay wing walls (SE)
      { x: 10, z: 4, w: 18, h: 2, d: 2 },
      { x: 10, z: 4, w: 2, h: 2, d: 12 },
      // Guard tower walls (NW)
      { x: -28, z: -14, w: 12, h: 2, d: 2 },
      { x: -18, z: -28, w: 2, h: 2, d: 14 },
      // Armory walls (NE)
      { x: 16, z: -28, w: 2, h: 2, d: 14 },
      { x: 16, z: -14, w: 12, h: 2, d: 2 },
      // Central courtyard pillars
      { x: -4, z: -4, w: 2, h: 2, d: 2 },
      { x: 2, z: -4, w: 2, h: 2, d: 2 },
      { x: -4, z: 2, w: 2, h: 2, d: 2 },
      { x: 2, z: 2, w: 2, h: 2, d: 2 },
    ],
    zones: [
      { name: "ENGINEER BAY", x1: -28, x2: -12, z1: 4, z2: 26 },
      { name: "MEDBAY", x1: 10, x2: 28, z1: 4, z2: 26 },
      { name: "GUARD TOWER", x1: -28, x2: -18, z1: -28, z2: -14 },
      { name: "ARMORY", x1: 16, x2: 28, z1: -28, z2: -14 },
      { name: "CELL BLOCK A", x1: -28, x2: -2, z1: -14, z2: 4 },
      { name: "CELL BLOCK B", x1: 2, x2: 28, z1: -14, z2: 4 },
      { name: "MAIN COURTYARD", x1: -12, x2: 10, z1: -28, z2: 26 },
    ],
    roomLabels: [
      { name: "ENGINEER BAY", x: -20, z: 16 },
      { name: "MEDBAY", x: 18, z: 16 },
      { name: "GUARD TOWER", x: -23, z: -22 },
      { name: "ARMORY", x: 22, z: -22 },
      { name: "CELL BLOCK A", x: -15, z: -5 },
      { name: "CELL BLOCK B", x: 15, z: -5 },
      { name: "COURTYARD", x: 0, z: -10 },
    ],
    tasks: [
      { x: -20, z: 10, name: "FIX GENERATOR" }, // Engineer Bay
      { x: -22, z: 18, name: "REPAIR PIPES" }, // Engineer Bay
      { x: 18, z: 10, name: "SCAN PATIENT" }, // Medbay
      { x: 14, z: 20, name: "MIX ANTIDOTE" }, // Medbay
      { x: -23, z: -24, name: "GUARD PATROL LOG" }, // Guard Tower
      { x: 20, z: -24, name: "RESTOCK AMMO" }, // Armory
      { x: -15, z: -8, name: "UNLOCK CELL A4" }, // Cell Block A
      { x: 15, z: -8, name: "UNLOCK CELL B7" }, // Cell Block B
      { x: 0, z: -18, name: "CALIBRATE CAMERAS" }, // Courtyard
      { x: 0, z: 14, name: "FIX COURTYARD LIGHT" }, // Courtyard
    ],
    bots: [
      {
        x: -20,
        z: 12,
        color: "#f472b6",
        alive: true,
        vx: 0,
        vz: 0,
        name: "BOT_PINK",
      },
      {
        x: 18,
        z: 12,
        color: "#60a5fa",
        alive: true,
        vx: 0,
        vz: 0,
        name: "BOT_BLUE",
      },
      {
        x: -23,
        z: -22,
        color: "#fbbf24",
        alive: true,
        vx: 0,
        vz: 0,
        name: "BOT_YELLOW",
      },
      {
        x: 20,
        z: -22,
        color: "#a78bfa",
        alive: true,
        vx: 0,
        vz: 0,
        name: "BOT_PURPLE",
      },
      {
        x: -15,
        z: -6,
        color: "#34d399",
        alive: true,
        vx: 0,
        vz: 0,
        name: "BOT_GREEN",
      },
      {
        x: 15,
        z: -6,
        color: "#fb923c",
        alive: true,
        vx: 0,
        vz: 0,
        name: "BOT_ORANGE",
      },
    ],
  },

  testing: {
    id: "testing",
    label: "TESTING GROUND",
    description:
      "Open flat arena. All rooms visible, ideal for testing mechanics.",
    playerSpawn: { x: 0, z: 0 },
    walls: [
      // Outer boundary
      { x: -24, z: -24, w: 48, h: 2, d: 2 },
      { x: -24, z: 22, w: 48, h: 2, d: 2 },
      { x: -24, z: -24, w: 2, h: 2, d: 48 },
      { x: 22, z: -24, w: 2, h: 2, d: 48 },
      // Small divider walls for rooms (no dead ends)
      { x: -10, z: -10, w: 6, h: 2, d: 2 },
      { x: 4, z: -10, w: 6, h: 2, d: 2 },
      { x: -10, z: 8, w: 6, h: 2, d: 2 },
      { x: 4, z: 8, w: 6, h: 2, d: 2 },
    ],
    zones: [
      { name: "ENGINEER ROOM", x1: -24, x2: -4, z1: -24, z2: -2 },
      { name: "DOCTOR ROOM", x1: 4, x2: 22, z1: -24, z2: -2 },
      { name: "SPAWN ZONE", x1: -4, x2: 4, z1: -4, z2: 4 },
      { name: "STORAGE", x1: -24, x2: -4, z1: 2, z2: 22 },
      { name: "TEST RANGE", x1: 4, x2: 22, z1: 2, z2: 22 },
    ],
    roomLabels: [
      { name: "ENGINEER ROOM", x: -14, z: -14 },
      { name: "DOCTOR ROOM", x: 14, z: -14 },
      { name: "SPAWN", x: 0, z: 0 },
      { name: "STORAGE", x: -14, z: 12 },
      { name: "TEST RANGE", x: 14, z: 12 },
    ],
    tasks: [
      { x: -14, z: -16, name: "CALIBRATE TOOLS" }, // Engineer Room
      { x: -8, z: -18, name: "CHARGE BATTERY" }, // Engineer Room
      { x: 14, z: -16, name: "HEAL PATIENT" }, // Doctor Room
      { x: 8, z: -18, name: "ADMINISTER DRUG" }, // Doctor Room
      { x: 0, z: -2, name: "FIX TERMINAL" }, // Spawn
      { x: -14, z: 14, name: "SORT SUPPLIES" }, // Storage
      { x: 14, z: 14, name: "WEAPONS CHECK" }, // Test Range
      { x: -18, z: 8, name: "UPLOAD DATA" }, // Storage
      { x: 18, z: 8, name: "TARGET PRACTICE" }, // Test Range
      { x: 0, z: 18, name: "RESET SYSTEMS" }, // Bottom area
    ],
    bots: [
      {
        x: -14,
        z: -14,
        color: "#f472b6",
        alive: true,
        vx: 0,
        vz: 0,
        name: "BOT_PINK",
      },
      {
        x: 14,
        z: -14,
        color: "#60a5fa",
        alive: true,
        vx: 0,
        vz: 0,
        name: "BOT_BLUE",
      },
      {
        x: -14,
        z: 14,
        color: "#fbbf24",
        alive: true,
        vx: 0,
        vz: 0,
        name: "BOT_YELLOW",
      },
      {
        x: 14,
        z: 14,
        color: "#a78bfa",
        alive: true,
        vx: 0,
        vz: 0,
        name: "BOT_PURPLE",
      },
      {
        x: 2,
        z: -18,
        color: "#34d399",
        alive: true,
        vx: 0,
        vz: 0,
        name: "BOT_GREEN",
      },
      {
        x: -2,
        z: 18,
        color: "#fb923c",
        alive: true,
        vx: 0,
        vz: 0,
        name: "BOT_ORANGE",
      },
    ],
  },
};

// Legacy aliases (for backward compat inside useEffect)
let ACTIVE_MAP: MapDefinition = MAPS.alcatraz;

const BOT_DISPLAY_NAMES: Record<string, string> = {
  BOT_PINK: "Bot Pink",
  BOT_BLUE: "Bot Blue",
  BOT_YELLOW: "Bot Yellow",
  BOT_PURPLE: "Bot Purple",
  BOT_GREEN: "Bot Green",
  BOT_ORANGE: "Bot Orange",
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function checkCollision(x: number, z: number, walls: Wall[]): boolean {
  for (const w of walls) {
    if (
      x + 0.3 > w.x &&
      x - 0.3 < w.x + w.w &&
      z + 0.3 > w.z &&
      z - 0.3 < w.z + w.d
    )
      return true;
  }
  return false;
}

function getLocation(x: number, z: number): string {
  for (const zone of ACTIVE_MAP.zones) {
    if (x > zone.x1 && x < zone.x2 && z > zone.z1 && z < zone.z2)
      return zone.name;
  }
  return "OPEN AREA";
}

const CHARACTERS = [
  {
    id: 1,
    name: "Engineer",
    color: "#cc2200",
    accent: "#ff5533",
    icon: "🔧",
    desc: "Repairs systems faster",
  },
  {
    id: 2,
    name: "Medic",
    color: "#ccaa00",
    accent: "#ffdd22",
    icon: "☢",
    desc: "Detects hazardous zones",
  },
  {
    id: 3,
    name: "Soldier",
    color: "#778899",
    accent: "#aabbcc",
    icon: "💀",
    desc: "Moves faster in combat",
  },
  {
    id: 4,
    name: "Operative",
    color: "#336622",
    accent: "#55aa33",
    icon: "🎯",
    desc: "Sees farther on minimap",
  },
];

// ── Component ─────────────────────────────────────────────────────────────────
export default function SabotageGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const minimapRef = useRef<HTMLCanvasElement>(null);

  // DOM refs for HUD updates (avoid React re-renders)
  const roleBannerRef = useRef<HTMLDivElement>(null);
  const locationTextRef = useRef<HTMLDivElement>(null);
  const tasksTextRef = useRef<HTMLDivElement>(null);
  const statusTextRef = useRef<HTMLDivElement>(null);
  const aliveTextRef = useRef<HTMLDivElement>(null);
  const taskProgressRef = useRef<HTMLDivElement>(null);
  const killBtnRef = useRef<HTMLDivElement>(null);
  const reportBtnRef = useRef<HTMLButtonElement>(null);
  const interactionRef = useRef<HTMLDivElement>(null);
  const hitMarkerRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);
  const startScreenRef = useRef<HTMLDivElement>(null);
  const settingsScreenRef = useRef<HTMLDivElement>(null);
  const mobileControlsRef = useRef<HTMLDivElement>(null);
  const mobileKillBtnRef = useRef<HTMLButtonElement>(null);
  const joystickKnobRef = useRef<HTMLDivElement>(null);

  // Settings
  const settingsRef = useRef<Settings>({
    moveSpeed: 0.08,
    killCooldown: 10,
    numBots: 3,
    numTasks: 5,
    btnColors: {
      sprint: "#1a6fe8",
      meeting: "#e8c01a",
      report: "#e85c1a",
      use: "#1ae85c",
      kill: "#e81a1a",
    },
  });

  // Game state refs
  const playerRef = useRef<Player>({
    x: 0,
    y: 1.7,
    z: 0,
    yaw: 0,
    pitch: 0,
    isSprinting: false,
  });
  const botsRef = useRef<Bot[]>([]);
  const tasksRef = useRef<Task[]>([]);
  const deadBodiesRef = useRef<DeadBody[]>([]);
  const gameRef = useRef<GameState>({
    isPlaying: false,
    isImpostor: false,
    killCooldown: 0,
    tasksCompleted: 0,
    gameOver: false,
    totalTasks: 5,
  });
  const keysRef = useRef<Record<string, boolean>>({});
  const joystickRef = useRef({ x: 0, y: 0, active: false });
  const lookTouchRef = useRef<{
    id: number;
    lastX: number;
    lastY: number;
  } | null>(null);
  const isMobileRef = useRef(
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent,
    ),
  );
  const rafRef = useRef<number>(0);
  const notifTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const meetingActiveRef = useRef(false);
  const canReportRef = useRef(false);
  const witnessedKillRef = useRef(false);
  const lockJustAcquiredRef = useRef(false);

  // Meeting/Voting React state
  const [meetingActive, setMeetingActive] = useState(false);
  const [votingPhase, setVotingPhase] = useState<"voting" | "result" | null>(
    null,
  );
  const [votes, setVotes] = useState<Record<string, number>>({});
  const [myVote, setMyVote] = useState<string | null>(null);
  const [voteResult, setVoteResult] = useState<string | null>(null);
  const [meetingTimer, setMeetingTimer] = useState(30);
  const [currentScreen, setCurrentScreen] = useState<
    "start" | "settings" | "game"
  >("start");
  const [selectedMap, setSelectedMap] = useState<string>("alcatraz");
  const [selectedCharacter, setSelectedCharacter] = useState<number>(1);
  const playerColorRef = useRef<string>("#cc2200");
  const selectedCharacterRef = useRef<number>(1);
  // Camera perspective: 0=1P, 1=2P, 2=3P
  const [perspective, setPerspective] = useState<0 | 1 | 2>(0);
  const perspectiveRef = useRef<0 | 1 | 2>(0);

  // Sync meetingActiveRef with state
  const meetingTimerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );
  const myVoteRef = useRef<string | null>(null);

  function showNotification(text: string, type: "" | "alert" = "") {
    const el = notificationRef.current;
    if (!el) return;
    el.textContent = text;
    el.className = `visible${type ? " alert" : ""}`;
    if (notifTimerRef.current) clearTimeout(notifTimerRef.current);
    notifTimerRef.current = setTimeout(() => {
      if (notificationRef.current) notificationRef.current.className = "";
    }, 2000);
  }

  function updateKillUI() {
    const g = gameRef.current;
    const btn = killBtnRef.current;
    const mobileBtn = mobileKillBtnRef.current;
    if (!btn || !mobileBtn) return;

    const interactBtn = document.getElementById(
      "sabotage-btn-interact",
    ) as HTMLButtonElement | null;
    if (g.isImpostor) {
      btn.style.display = "flex";
      mobileBtn.style.display = "flex";
      if (interactBtn) interactBtn.style.display = "none";
      if (g.killCooldown <= 0) {
        btn.className = "kill-button active ready";
        btn.textContent = "KILL";
        mobileBtn.style.opacity = "1";
      } else {
        btn.className = "kill-button active cooldown";
        btn.textContent = String(Math.ceil(g.killCooldown));
        mobileBtn.style.opacity = "0.5";
      }
    } else {
      btn.style.display = "none";
      mobileBtn.style.display = "none";
      if (interactBtn) interactBtn.style.display = "flex";
    }
  }

  function updateAliveUI() {
    const bots = botsRef.current;
    const aliveBots = bots.filter((b) => b.alive).length;
    const total = bots.length + 1;
    const alive = aliveBots + 1;
    if (aliveTextRef.current)
      aliveTextRef.current.textContent = `${alive}/${total}`;
  }

  function completeTask() {
    const player = playerRef.current;
    const tasks = tasksRef.current;
    const g = gameRef.current;
    for (const t of tasks) {
      const dist = Math.hypot(t.x - player.x, t.z - player.z);
      if (dist < 2 && !t.completed) {
        t.completed = true;
        g.tasksCompleted++;
        const total = g.totalTasks;
        if (tasksTextRef.current)
          tasksTextRef.current.textContent = `${g.tasksCompleted}/${total}`;
        if (taskProgressRef.current)
          taskProgressRef.current.style.width = `${(g.tasksCompleted / total) * 100}%`;
        showNotification("TASK COMPLETED");
        if (g.tasksCompleted >= total && !g.isImpostor) {
          g.gameOver = true;
          showNotification("MISSION COMPLETE");
        }
        return;
      }
    }
  }

  function kill() {
    const player = playerRef.current;
    const g = gameRef.current;
    if (!g.isImpostor || g.killCooldown > 0) return;
    const bots = botsRef.current;
    for (const b of bots) {
      if (!b.alive) continue;
      const dist = Math.hypot(b.x - player.x, b.z - player.z);
      if (dist < 1.5) {
        b.alive = false;
        // Add dead body
        deadBodiesRef.current.push({ x: b.x, z: b.z, color: b.color });
        // Check if any bot witnessed the kill (was within 6 units)
        for (const witness of botsRef.current) {
          if (witness === b || !witness.alive) continue;
          const wDist = Math.hypot(witness.x - b.x, witness.z - b.z);
          if (wDist < 6) {
            witnessedKillRef.current = true;
            break;
          }
        }
        g.killCooldown = settingsRef.current.killCooldown;
        showNotification("ELIMINATED", "alert");
        // Kill feed entry
        const kfEl = document.getElementById("sabotage-killfeed");
        if (kfEl) {
          const entry = document.createElement("div");
          entry.className = "kf-entry";
          entry.innerHTML = `<span class="kf-killer">YOU</span> ☠ <span class="kf-victim">${b.name}</span>`;
          kfEl.appendChild(entry);
          setTimeout(() => entry.remove(), 4000);
        }
        const hm = hitMarkerRef.current;
        if (hm) {
          hm.classList.add("active");
          setTimeout(() => hm.classList.remove("active"), 300);
        }
        updateKillUI();
        updateAliveUI();
        const aliveBots = bots.filter((b2) => b2.alive);
        if (aliveBots.length === 0) {
          g.gameOver = true;
          showNotification("DOMINATION", "alert");
        }
        return;
      }
    }
  }

  // Report table is at the center of the map (0, 0)
  const REPORT_TABLE = { x: 0, z: 0 };
  const REPORT_TABLE_RADIUS = 3.5;

  function checkCanReport(): boolean {
    const player = playerRef.current;
    // Check if near a dead body
    for (const body of deadBodiesRef.current) {
      const dist = Math.hypot(body.x - player.x, body.z - player.z);
      if (dist < 3) return true;
    }
    // Check if witnessed a kill
    if (witnessedKillRef.current) return true;
    // Check if near the report table (center of map)
    const distTable = Math.hypot(
      REPORT_TABLE.x - player.x,
      REPORT_TABLE.z - player.z,
    );
    if (distTable < REPORT_TABLE_RADIUS && deadBodiesRef.current.length > 0)
      return true;
    return false;
  }

  function checkBodyNearby(): boolean {
    return checkCanReport();
  }

  function triggerMeeting() {
    const g = gameRef.current;
    if (!g.isPlaying || g.gameOver || meetingActiveRef.current) return;
    meetingActiveRef.current = true;
    setMeetingActive(true);
    setVotingPhase("voting");
    setMyVote(null);
    myVoteRef.current = null;
    setVotes({});
    setVoteResult(null);
    setMeetingTimer(30);

    // Document pointer lock exit
    if (document.pointerLockElement) document.exitPointerLock();

    // Start countdown
    let timeLeft = 30;
    if (meetingTimerIntervalRef.current)
      clearInterval(meetingTimerIntervalRef.current);
    meetingTimerIntervalRef.current = setInterval(() => {
      timeLeft--;
      setMeetingTimer(timeLeft);
      if (timeLeft <= 0) {
        if (meetingTimerIntervalRef.current)
          clearInterval(meetingTimerIntervalRef.current);
        resolveMeeting();
      }
    }, 1000);
  }

  function castVote(target: string) {
    if (myVoteRef.current) return;
    myVoteRef.current = target;
    setMyVote(target);
    if (meetingTimerIntervalRef.current)
      clearInterval(meetingTimerIntervalRef.current);
    resolveMeeting();
  }

  function resolveMeeting() {
    const g = gameRef.current;
    const bots = botsRef.current;
    const aliveBots = bots.filter((b) => b.alive);

    // Tally votes: player's vote + bot votes
    const tallyMap: Record<string, number> = {};

    // Player vote
    const pv = myVoteRef.current || "SKIP";
    tallyMap[pv] = (tallyMap[pv] || 0) + 1;

    // Bot votes (random)
    const candidates = [...aliveBots.map((b) => b.name), "PLAYER", "SKIP"];
    for (const _bot of aliveBots) {
      const pick = candidates[Math.floor(Math.random() * candidates.length)];
      tallyMap[pick] = (tallyMap[pick] || 0) + 1;
    }

    // Find highest
    let maxVotes = 0;
    let ejected = "SKIP";
    let tie = false;
    for (const [name, count] of Object.entries(tallyMap)) {
      if (count > maxVotes) {
        maxVotes = count;
        ejected = name;
        tie = false;
      } else if (count === maxVotes && name !== "SKIP") {
        tie = true;
      }
    }
    if (tie) ejected = "SKIP";

    setVotes(tallyMap);
    setVoteResult(ejected);
    setVotingPhase("result");

    // Handle result
    setTimeout(() => {
      closeMeeting();
      if (ejected === "PLAYER") {
        g.gameOver = true;
        showNotification("MISSION FAILED", "alert");
      } else if (ejected !== "SKIP") {
        // Remove ejected bot
        const bot = bots.find((b) => b.name === ejected);
        if (bot) {
          bot.alive = false;
          updateAliveUI();
          if (g.isImpostor) {
            showNotification(
              `${BOT_DISPLAY_NAMES[ejected] || ejected} EJECTED`,
            );
            const remaining = bots.filter((b) => b.alive).length;
            if (remaining === 0) {
              g.gameOver = true;
              showNotification("DOMINATION", "alert");
            }
          } else {
            // Check if we accidentally ejected someone — crewmates lose a member but game continues
            showNotification(
              `${BOT_DISPLAY_NAMES[ejected] || ejected} EJECTED`,
            );
          }
        }
      } else {
        showNotification("NO EJECTION - SKIP");
      }
    }, 3000);
  }

  function closeMeeting() {
    meetingActiveRef.current = false;
    setMeetingActive(false);
    setVotingPhase(null);
    setVoteResult(null);
    // Re-lock pointer on desktop
    const canvas = canvasRef.current;
    if (
      canvas &&
      !isMobileRef.current &&
      gameRef.current.isPlaying &&
      !gameRef.current.gameOver
    ) {
      canvas.requestPointerLock();
    }
  }

  function reportBody() {
    if (!checkBodyNearby()) {
      showNotification("NO BODY NEARBY", "");
      return;
    }
    showNotification("BODY REPORTED!", "alert");
    triggerMeeting();
  }

  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional single-run game loop
  useEffect(() => {
    const canvas = canvasRef.current;
    const minimap = minimapRef.current;
    if (!canvas || !minimap) return;

    const ctx = canvas.getContext("2d")!;
    const minimapCtx = minimap.getContext("2d")!;
    const isMobile = isMobileRef.current;

    // ── Resize ──────────────────────────────────────────────────────────────
    function resize() {
      if (!canvas || !minimap) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      minimap.width = isMobile ? 120 : 180;
      minimap.height = isMobile ? 120 : 180;
    }
    resize();
    window.addEventListener("resize", resize);

    // ── Raycasting ───────────────────────────────────────────────────────────

    // Returns hit info: distance, fractional hit position along wall (0-1),
    // whether the hit wall is a "door" (thin divider wall ≤2 units on one axis),
    // and the world hit coords for floor/ceiling projection.
    function castRayFull(
      angle: number,
      originX?: number,
      originZ?: number,
    ): {
      dist: number;
      wallX: number;
      isDoor: boolean;
      hitWorldX: number;
      hitWorldZ: number;
    } {
      let dist = 0;
      const step = 0.05;
      const maxDist = 30;
      const sinA = Math.sin(angle);
      const cosA = Math.cos(angle);
      const px = originX !== undefined ? originX : playerRef.current.x;
      const pz = originZ !== undefined ? originZ : playerRef.current.z;

      while (dist < maxDist) {
        const hx = px + sinA * dist;
        const hz = pz - cosA * dist;

        for (const wall of ACTIVE_MAP.walls) {
          if (
            hx + 0.3 > wall.x &&
            hx - 0.3 < wall.x + wall.w &&
            hz + 0.3 > wall.z &&
            hz - 0.3 < wall.z + wall.d
          ) {
            // Determine hit side: project hit point onto wall edges
            const wallCenterX = wall.x + wall.w / 2;
            const wallCenterZ = wall.z + wall.d / 2;
            const dx = hx - wallCenterX;
            const dz = hz - wallCenterZ;
            let wallX: number;
            // Figure out which face was hit by comparing normalised offsets
            if (Math.abs(dx / (wall.w / 2)) > Math.abs(dz / (wall.d / 2))) {
              // Hit on X-facing face; texture coordinate is along Z
              wallX = ((hz - wall.z) / wall.d) % 1;
            } else {
              // Hit on Z-facing face; texture coordinate is along X
              wallX = ((hx - wall.x) / wall.w) % 1;
            }
            if (wallX < 0) wallX += 1;

            // A "door" is a wall that is very thin on one dimension (≤ 2 units)
            // These are the internal divider/corridor walls that act as doorways
            const isDoor = wall.w <= 2 || wall.d <= 2;

            return { dist, wallX, isDoor, hitWorldX: hx, hitWorldZ: hz };
          }
        }
        dist += step;
      }
      return {
        dist: maxDist,
        wallX: 0,
        isDoor: false,
        hitWorldX: px + sinA * maxDist,
        hitWorldZ: pz - cosA * maxDist,
      };
    }

    // ── Texture helpers ───────────────────────────────────────────────────────

    // Simple deterministic noise: returns 0-1 for given integer grid coords
    function cellNoise(cx: number, cz: number): number {
      const n = Math.sin(cx * 127.1 + cz * 311.7) * 43758.5453;
      return n - Math.floor(n);
    }

    // Concrete block wall color for a given texture column (wallX 0-1) and
    // screen pixel Y within the wall strip (wallPY 0-wallHeight).
    // Returns an rgb string with distance-based brightness applied.
    function wallTexColor(
      wallX: number,
      wallPY: number,
      wallHeight: number,
      brightness: number,
      isDoor: boolean,
    ): string {
      // Map wallPY to a repeating texture space (0-64 pixels = one block height)
      const texH = 64; // texture height in px
      const texW = 64; // texture width in px
      // tex coords
      const tx = Math.floor(wallX * texW) % texW;
      const ty = Math.floor((wallPY / wallHeight) * texH * 3) % texH; // 3 = repeats per wall

      if (isDoor) {
        // ── Door: vertical iron bars ──────────────────────────────────────────
        // Bar every 8 texture pixels; bar width = 4px
        const barCycle = tx % 8;
        if (barCycle < 4) {
          // Metal bar — dark steel grey
          const bv = Math.floor(55 * brightness);
          return `rgb(${bv},${bv},${bv})`;
        }
        // Gap between bars — very dark, like open darkness behind bars
        const gv = Math.floor(15 * brightness);
        return `rgb(${gv},${gv},${gv + 5})`;
      }

      // ── Concrete block wall ───────────────────────────────────────────────
      // Mortar lines: horizontal every 16px, vertical every 32px (staggered)
      const blockRow = Math.floor(ty / 16);
      const stagger = (blockRow % 2) * 16; // brick stagger
      const blockCol = Math.floor((tx + stagger) / 32);

      // Mortar gap detection
      const rowMod = ty % 16;
      const colMod = (tx + stagger) % 32;
      const isMortar = rowMod <= 1 || colMod <= 1;

      if (isMortar) {
        // Mortar — slightly darker
        const mv = Math.floor(60 * brightness);
        return `rgb(${mv},${mv - 3},${mv - 5})`;
      }

      // Block face: vary colour by block position for realistic variation
      const noise = cellNoise(blockCol + blockRow * 7, blockRow);
      // Base palette: #585858(88) to #707070(112), with some blocks at #6b6b6b(107)
      const base = 88 + Math.floor(noise * 24); // 88–112
      const r = Math.floor(base * brightness);
      const g = Math.floor((base - 3) * brightness);
      const b = Math.floor((base - 6) * brightness);
      return `rgb(${r},${g},${b})`;
    }

    // Floor tile color for world position (rx, rz)
    function floorTexColor(rx: number, rz: number, brightness: number): string {
      const cx = Math.floor(rx / 1.5);
      const cz = Math.floor(rz / 1.5);
      const n = cellNoise(cx, cz);

      if (n < 0.45) {
        // Mossy dark green patch
        const v2 = cellNoise(cx * 3 + 1, cz * 3 + 1);
        const r = Math.floor((55 + v2 * 12) * brightness);
        const g = Math.floor((68 + v2 * 20) * brightness);
        const b = Math.floor((40 + v2 * 8) * brightness);
        return `rgb(${r},${g},${b})`;
      }
      if (n < 0.65) {
        // Slightly lighter moss
        const r = Math.floor(72 * brightness);
        const g = Math.floor(88 * brightness);
        const b = Math.floor(50 * brightness);
        return `rgb(${r},${g},${b})`;
      }
      // Concrete patch
      const v2 = cellNoise(cx + 100, cz + 100);
      const base = Math.floor((125 + v2 * 25) * brightness);
      return `rgb(${base},${base - 2},${base - 5})`;
    }

    function render() {
      const w = canvas!.width;
      const h = canvas!.height;
      const player = playerRef.current;

      // ── Background (only visible if not playing) ──────────────────────────
      ctx.fillStyle = "#1a1a1a";
      ctx.fillRect(0, 0, w, h);

      if (!gameRef.current.isPlaying) return;

      // ── Perspective camera offset ─────────────────────────────────────────
      const pMode = perspectiveRef.current; // 0=1P, 1=2P, 2=3P
      const camOffset = pMode === 1 ? 1.5 : pMode === 2 ? 3.0 : 0;
      const camX = player.x - Math.sin(player.yaw) * camOffset;
      const camZ = player.z + Math.cos(player.yaw) * camOffset;
      // Pitch adjusted upward for pulled-back modes to look slightly down
      const camPitch =
        player.pitch + (pMode === 1 ? 0.15 : pMode === 2 ? 0.28 : 0);

      const numRays = Math.min(w / 2, 400);
      const fov = (60 * Math.PI) / 180;
      const stripW = w / numRays + 1;

      // Horizon shift based on pitch
      const horizonShift = camPitch * h * 0.6;

      // ── Pre-draw solid ceiling and floor bands ────────────────────────────
      // Ceiling: pitch black (COD style)
      ctx.fillStyle = "#080808";
      ctx.fillRect(0, 0, w, h / 2);

      // Floor: dark concrete grey
      ctx.fillStyle = "#1a1c18";
      ctx.fillRect(0, h / 2, w, h / 2);

      for (let i = 0; i < numRays; i++) {
        const rayAngle = player.yaw - fov / 2 + (i / numRays) * fov;
        const hit = castRayFull(rayAngle, camX, camZ);
        const { dist, wallX, isDoor } = hit;

        const wallHeight = (h / dist) * 0.6;
        const screenX = (i / numRays) * w;
        const wallTop = (h - wallHeight) / 2 - horizonShift;
        const wallBottom = wallTop + wallHeight;
        const brightness = Math.max(0.08, 1 - dist / 18) * 0.75; // COD darker walls

        // ── Ceiling strip ────────────────────────────────────────────────────
        // Already filled above; add subtle distance tint
        const ceilV = Math.floor(58 * brightness);
        ctx.fillStyle = `rgb(${ceilV},${ceilV},${ceilV})`;
        ctx.fillRect(screenX, 0, stripW, wallTop);

        // ── Floor strip (perspective-correct sampled) ─────────────────────
        // For each pixel row below wallBottom, project back to world coords
        const floorStripStep = 4; // sample every N pixels for performance
        for (let py = Math.ceil(wallBottom); py < h; py += floorStripStep) {
          // How far below the horizon is this pixel? (0 = horizon, 1 = bottom)
          const rowFrac = py / h - 0.5; // 0..0.5
          if (rowFrac <= 0) continue;
          const floorDist = (h * 0.3) / rowFrac / 2;
          const floorBrightness = Math.max(0.08, 1 - floorDist / 18);

          const fx = camX + Math.sin(rayAngle) * floorDist;
          const fz = camZ - Math.cos(rayAngle) * floorDist;

          ctx.fillStyle = floorTexColor(fx, fz, floorBrightness);
          ctx.fillRect(screenX, py, stripW, floorStripStep);
        }

        // ── Wall strip ───────────────────────────────────────────────────────
        // Draw per-pixel vertically for texture detail
        const wallPixStep = 2; // sample every 2px vertically
        for (
          let py = Math.max(0, Math.floor(wallTop));
          py < Math.min(h, Math.ceil(wallBottom));
          py += wallPixStep
        ) {
          const wallPY = py - wallTop; // pixel offset within wall strip
          ctx.fillStyle = wallTexColor(
            wallX,
            wallPY,
            wallHeight,
            brightness,
            isDoor,
          );
          ctx.fillRect(screenX, py, stripW, wallPixStep);
        }

        // ── Door bars: texture-space vertical bars over door wall strip ─────
        // wallX is the fractional hit position along the wall (0-1).
        // Map that to a repeating 8-unit bar cycle (bar=4, gap=4).
        // The bars are already encoded in wallTexColor when isDoor=true,
        // so this additional pass adds a stronger darkened gap effect.
        if (isDoor) {
          const barCycle = (wallX * 64) % 8; // 0-8 in texture space
          if (barCycle >= 4) {
            // Gap between bars — darken heavily (simulate open space behind)
            ctx.fillStyle = "rgba(0,0,0,0.75)";
            ctx.fillRect(screenX, wallTop, stripW, wallHeight);
          }
        }
      }

      drawObjects();
    }

    function drawObjects() {
      const w = canvas!.width;
      const h = canvas!.height;
      const player = playerRef.current;
      const fovTan = Math.tan((30 * Math.PI) / 180);
      const pMode = perspectiveRef.current;
      const camOffset = pMode === 1 ? 1.5 : pMode === 2 ? 3.0 : 0;
      const camX = player.x - Math.sin(player.yaw) * camOffset;
      const camZ = player.z + Math.cos(player.yaw) * camOffset;

      for (const task of tasksRef.current) {
        if (task.completed) continue;
        const dx = task.x - camX;
        const dz = task.z - camZ;
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist >= 15) continue;
        const angle = Math.atan2(dx, -dz) - player.yaw;
        const screenX = w / 2 + (Math.tan(angle) * (w / 2)) / fovTan;
        const size = Math.max(5, 100 / dist);
        if (screenX < -100 || screenX > w + 100) continue;
        if (dist <= 0.1) continue;

        const glow = ctx.createRadialGradient(
          screenX,
          h / 2,
          0,
          screenX,
          h / 2,
          size * 3,
        );
        glow.addColorStop(0, "rgba(0,255,100,0.8)");
        glow.addColorStop(1, "rgba(0,255,100,0)");
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(screenX, h / 2, size * 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#0f0";
        ctx.beginPath();
        ctx.arc(screenX, h / 2, size / 2, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw player character sprite in 2P/3P mode
      if (pMode > 0) {
        drawPlayerSprite(w, h, pMode);
      }

      for (const bot of botsRef.current) {
        if (!bot.alive) continue;
        const dx = bot.x - camX;
        const dz = bot.z - camZ;
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist >= 20 || dist <= 0.5) continue;
        const angle = Math.atan2(dx, -dz) - player.yaw;
        const screenX = w / 2 + (Math.tan(angle) * (w / 2)) / fovTan;
        const size = Math.max(15, 150 / dist);
        if (screenX < -50 || screenX > w + 50) continue;

        ctx.fillStyle = bot.color;
        ctx.fillRect(screenX - size / 3, h / 2 - size / 2, size / 1.5, size);

        ctx.fillStyle = "#fff";
        ctx.font = `bold ${Math.max(10, 30 / dist)}px Arial`;
        ctx.textAlign = "center";
        ctx.fillText(
          BOT_DISPLAY_NAMES[bot.name] || "PLAYER",
          screenX,
          h / 2 - size / 2 - 10,
        );
      }
    }

    function drawPlayerSprite(w: number, h: number, pMode: number) {
      // Draw hazmat character at bottom-center of screen
      const char =
        CHARACTERS.find((c) => c.id === selectedCharacterRef.current) ||
        CHARACTERS[0];
      const baseSize = pMode === 2 ? 120 : 80; // larger in 3P
      const cx = w / 2;
      const cy = h - baseSize * 0.6;
      const s = baseSize;

      ctx.save();
      // Body (torso)
      ctx.fillStyle = char.color;
      ctx.beginPath();
      ctx.roundRect(cx - s * 0.22, cy - s * 0.38, s * 0.44, s * 0.44, s * 0.08);
      ctx.fill();
      // Backpack
      ctx.fillStyle = char.accent;
      ctx.fillRect(cx - s * 0.1, cy - s * 0.35, s * 0.2, s * 0.25);
      // Head/helmet
      ctx.fillStyle = char.color;
      ctx.beginPath();
      ctx.arc(cx, cy - s * 0.5, s * 0.18, 0, Math.PI * 2);
      ctx.fill();
      // Visor
      ctx.fillStyle = "rgba(0,200,255,0.5)";
      ctx.beginPath();
      ctx.ellipse(cx, cy - s * 0.5, s * 0.1, s * 0.07, 0, 0, Math.PI * 2);
      ctx.fill();
      // Legs
      ctx.fillStyle = char.color;
      ctx.fillRect(cx - s * 0.18, cy + s * 0.06, s * 0.14, s * 0.28);
      ctx.fillRect(cx + s * 0.04, cy + s * 0.06, s * 0.14, s * 0.28);
      // Arms
      ctx.fillRect(cx - s * 0.36, cy - s * 0.35, s * 0.14, s * 0.3);
      ctx.fillRect(cx + s * 0.22, cy - s * 0.35, s * 0.14, s * 0.3);
      // Outline
      ctx.strokeStyle = char.accent;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(cx - s * 0.22, cy - s * 0.38, s * 0.44, s * 0.44, s * 0.08);
      ctx.stroke();
      ctx.restore();
    }

    function drawMinimap() {
      const mw = minimap!.width;
      const mh = minimap!.height;
      const player = playerRef.current;
      const g = gameRef.current;
      const scale = isMobile ? 3 : 4;
      const cx = mw / 2;
      const cz = mh / 2;

      // Circular clip for minimap
      minimapCtx.clearRect(0, 0, mw, mh);
      minimapCtx.save();
      minimapCtx.beginPath();
      minimapCtx.arc(mw / 2, mh / 2, mw / 2, 0, Math.PI * 2);
      minimapCtx.clip();

      minimapCtx.fillStyle = "rgba(6,10,5,0.94)";
      minimapCtx.fillRect(0, 0, mw, mh);

      minimapCtx.fillStyle = "rgba(60,80,45,0.4)";
      for (const w of ACTIVE_MAP.walls) {
        minimapCtx.fillRect(
          cx + w.x * scale,
          cz + w.z * scale,
          w.w * scale,
          w.d * scale,
        );
      }

      // Room labels
      const roomLabels = ACTIVE_MAP.roomLabels;
      minimapCtx.fillStyle = "rgba(140,170,100,0.7)";
      minimapCtx.font = `bold ${isMobile ? 5 : 6}px Rajdhani, Arial`;
      minimapCtx.textAlign = "center";
      for (const room of roomLabels) {
        minimapCtx.fillText(
          room.name,
          cx + room.x * scale,
          cz + room.z * scale,
        );
      }

      // Tasks
      for (const t of tasksRef.current) {
        minimapCtx.fillStyle = t.completed ? "#4a7a4a" : "#7aaa5a";
        minimapCtx.beginPath();
        minimapCtx.arc(cx + t.x * scale, cz + t.z * scale, 3, 0, Math.PI * 2);
        minimapCtx.fill();
      }

      // Report table (center of map) - shown as a white diamond
      const rtx = cx + REPORT_TABLE.x * scale;
      const rtz = cz + REPORT_TABLE.z * scale;
      minimapCtx.save();
      minimapCtx.strokeStyle = "#fff";
      minimapCtx.fillStyle = "rgba(255,255,200,0.3)";
      minimapCtx.lineWidth = 1.5;
      minimapCtx.beginPath();
      minimapCtx.moveTo(rtx, rtz - 6);
      minimapCtx.lineTo(rtx + 6, rtz);
      minimapCtx.lineTo(rtx, rtz + 6);
      minimapCtx.lineTo(rtx - 6, rtz);
      minimapCtx.closePath();
      minimapCtx.fill();
      minimapCtx.stroke();
      minimapCtx.restore();

      // Dead bodies as red X
      for (const body of deadBodiesRef.current) {
        const bx = cx + body.x * scale;
        const bz = cz + body.z * scale;
        minimapCtx.strokeStyle = "#f00";
        minimapCtx.lineWidth = 2;
        minimapCtx.beginPath();
        minimapCtx.moveTo(bx - 4, bz - 4);
        minimapCtx.lineTo(bx + 4, bz + 4);
        minimapCtx.stroke();
        minimapCtx.beginPath();
        minimapCtx.moveTo(bx + 4, bz - 4);
        minimapCtx.lineTo(bx - 4, bz + 4);
        minimapCtx.stroke();
      }

      // Bots - shown as red enemy dots on minimap
      for (const b of botsRef.current) {
        if (!b.alive) continue;
        minimapCtx.fillStyle = gameRef.current.isImpostor ? "#cc3030" : b.color;
        minimapCtx.beginPath();
        minimapCtx.arc(cx + b.x * scale, cz + b.z * scale, 4, 0, Math.PI * 2);
        minimapCtx.fill();
      }

      // Player
      const pColor = g.isImpostor ? "#f00" : playerColorRef.current;
      minimapCtx.fillStyle = pColor;
      minimapCtx.beginPath();
      minimapCtx.arc(
        cx + player.x * scale,
        cz + player.z * scale,
        5,
        0,
        Math.PI * 2,
      );
      minimapCtx.fill();

      minimapCtx.strokeStyle = pColor;
      minimapCtx.lineWidth = 2;
      minimapCtx.beginPath();
      minimapCtx.moveTo(cx + player.x * scale, cz + player.z * scale);
      minimapCtx.lineTo(
        cx + player.x * scale + Math.sin(player.yaw) * 12,
        cz + player.z * scale - Math.cos(player.yaw) * 12,
      );
      minimapCtx.stroke();

      // Restore clip
      minimapCtx.restore();

      // Minimap border ring
      minimapCtx.strokeStyle = "rgba(80,100,60,0.5)";
      minimapCtx.lineWidth = 2;
      minimapCtx.beginPath();
      minimapCtx.arc(mw / 2, mh / 2, mw / 2 - 1, 0, Math.PI * 2);
      minimapCtx.stroke();

      // Compass cardinal directions
      minimapCtx.fillStyle = "rgba(140,170,100,0.8)";
      minimapCtx.font = `bold ${isMobile ? 6 : 7}px Rajdhani, Arial`;
      minimapCtx.textAlign = "center";
      minimapCtx.fillText("N", mw / 2, 10);
      minimapCtx.fillText("S", mw / 2, mh - 3);
      minimapCtx.fillText("W", 8, mh / 2 + 3);
      minimapCtx.fillText("E", mw - 7, mh / 2 + 3);
    }

    // ── Physics ───────────────────────────────────────────────────────────────
    function updatePhysics() {
      const g = gameRef.current;
      if (!g.isPlaying || g.gameOver || meetingActiveRef.current) return;

      const player = playerRef.current;
      const keys = keysRef.current;
      const joystick = joystickRef.current;
      const speed = player.isSprinting
        ? settingsRef.current.moveSpeed * 2
        : settingsRef.current.moveSpeed;
      let dx = 0;
      let dz = 0;

      if (keys.w || joystick.y < -0.3) {
        dx += Math.sin(player.yaw) * speed;
        dz -= Math.cos(player.yaw) * speed;
      }
      if (keys.s || joystick.y > 0.3) {
        dx -= Math.sin(player.yaw) * speed;
        dz += Math.cos(player.yaw) * speed;
      }
      if (keys.a || joystick.x < -0.3) {
        dx -= Math.cos(player.yaw) * speed;
        dz -= Math.sin(player.yaw) * speed;
      }
      if (keys.d || joystick.x > 0.3) {
        dx += Math.cos(player.yaw) * speed;
        dz += Math.sin(player.yaw) * speed;
      }

      if (!checkCollision(player.x + dx, player.z, ACTIVE_MAP.walls))
        player.x += dx;
      if (!checkCollision(player.x, player.z + dz, ACTIVE_MAP.walls))
        player.z += dz;

      // Bots — improved AI
      const tasks = tasksRef.current;
      const incompleteTasks = tasks.filter((t) => !t.completed);

      for (const bot of botsRef.current) {
        if (!bot.alive) continue;

        // Pause logic
        if (bot.pauseFrames > 0) {
          bot.pauseFrames--;
          continue;
        }
        if (Math.random() < 0.005) {
          bot.pauseFrames = 60;
          continue;
        }

        // Flee from player if impostor is near
        if (g.isImpostor) {
          const distToPlayer = Math.hypot(bot.x - player.x, bot.z - player.z);
          if (distToPlayer < 8) {
            const angle = Math.atan2(bot.x - player.x, bot.z - player.z);
            const fleeDx = Math.sin(angle) * bot.speed;
            const fleeDz = Math.cos(angle) * bot.speed;
            if (!checkCollision(bot.x + fleeDx, bot.z, ACTIVE_MAP.walls))
              bot.x += fleeDx;
            if (!checkCollision(bot.x, bot.z + fleeDz, ACTIVE_MAP.walls))
              bot.z += fleeDz;
            continue;
          }
        }

        // Pick/move toward target task
        if (incompleteTasks.length > 0) {
          const target =
            incompleteTasks[bot.targetTaskIndex % incompleteTasks.length];
          const distToTask = Math.hypot(target.x - bot.x, target.z - bot.z);

          if (distToTask < 3) {
            // Arrived, pick a new target
            bot.targetTaskIndex = Math.floor(
              Math.random() * incompleteTasks.length,
            );
          } else {
            const angle = Math.atan2(target.x - bot.x, target.z - bot.z);
            const moveDx = Math.sin(angle) * bot.speed;
            const moveDz = Math.cos(angle) * bot.speed;

            if (!checkCollision(bot.x + moveDx, bot.z, ACTIVE_MAP.walls)) {
              bot.x += moveDx;
            } else {
              // Try perpendicular
              const perpDx = Math.sin(angle + Math.PI / 2) * bot.speed;
              if (!checkCollision(bot.x + perpDx, bot.z, ACTIVE_MAP.walls))
                bot.x += perpDx;
            }

            if (!checkCollision(bot.x, bot.z + moveDz, ACTIVE_MAP.walls)) {
              bot.z += moveDz;
            } else {
              const perpDz = Math.cos(angle + Math.PI / 2) * bot.speed;
              if (!checkCollision(bot.x, bot.z + perpDz, ACTIVE_MAP.walls))
                bot.z += perpDz;
            }
          }
        } else {
          // No tasks left, wander
          if (Math.random() < 0.02) {
            bot.vx = (Math.random() - 0.5) * bot.speed;
            bot.vz = (Math.random() - 0.5) * bot.speed;
          }
          if (!checkCollision(bot.x + bot.vx, bot.z, ACTIVE_MAP.walls))
            bot.x += bot.vx;
          if (!checkCollision(bot.x, bot.z + bot.vz, ACTIVE_MAP.walls))
            bot.z += bot.vz;
        }
      }

      // Kill cooldown
      if (g.killCooldown > 0) {
        g.killCooldown -= 0.016;
        updateKillUI();
      }

      // Update report button visibility
      const canReport = checkCanReport();
      canReportRef.current = canReport;
      if (reportBtnRef.current) {
        reportBtnRef.current.style.display = canReport ? "flex" : "none";
      }
      // Also update mobile report button
      const mobileReportBtn = document.querySelector(
        '[data-ocid="game.mobile_report_button"]',
      ) as HTMLElement | null;
      if (mobileReportBtn) {
        mobileReportBtn.style.visibility = canReport ? "visible" : "hidden";
        mobileReportBtn.style.opacity = canReport ? "1" : "0";
        mobileReportBtn.style.pointerEvents = canReport ? "auto" : "none";
      }

      const loc = getLocation(player.x, player.z);
      if (locationTextRef.current) locationTextRef.current.textContent = loc;
    }

    function checkInteractions() {
      const g = gameRef.current;
      if (!g.isPlaying || g.gameOver || meetingActiveRef.current) return;
      const player = playerRef.current;
      const prompt = interactionRef.current;
      if (!prompt) return;

      let near = false;

      for (const t of tasksRef.current) {
        const dist = Math.hypot(t.x - player.x, t.z - player.z);
        if (dist < 2 && !t.completed) {
          near = true;
          prompt.textContent = isMobile
            ? `TAP USE TO ${t.name}`
            : `PRESS E TO ${t.name}`;
          prompt.style.color = "#0f0";
          prompt.style.borderColor = "#0f0";
          prompt.classList.add("visible");
          break;
        }
      }

      if (!near && g.isImpostor && g.killCooldown <= 0) {
        for (const b of botsRef.current) {
          if (!b.alive) continue;
          const dist = Math.hypot(b.x - player.x, b.z - player.z);
          if (dist < 1.5) {
            near = true;
            prompt.textContent = isMobile
              ? "TAP KILL TO ELIMINATE"
              : "PRESS Q TO ELIMINATE";
            prompt.style.color = "#f00";
            prompt.style.borderColor = "#f00";
            prompt.classList.add("visible");
            break;
          }
        }
      }

      if (!near) prompt.classList.remove("visible");
    }

    // ── Game Loop ─────────────────────────────────────────────────────────────
    function gameLoop() {
      updatePhysics();
      checkInteractions();
      render();
      drawMinimap();
      // Update compass bearing
      const compassEl = document.getElementById("sabotage-compass");
      if (compassEl) {
        const bearing = Math.round(
          ((((playerRef.current.yaw * 180) / Math.PI) % 360) + 360) % 360,
        );
        compassEl.textContent = `${bearing < 45 || bearing > 315 ? "N" : bearing < 135 ? "E" : bearing < 225 ? "S" : "W"} ── ${bearing}° ──`;
      }
      rafRef.current = requestAnimationFrame(gameLoop);
    }

    rafRef.current = requestAnimationFrame(gameLoop);

    // ── Start Game ────────────────────────────────────────────────────────────
    function startGame() {
      const s = settingsRef.current;

      // Initialize tasks and bots based on selected map
      tasksRef.current = ACTIVE_MAP.tasks.slice(0, s.numTasks).map((t) => ({
        ...t,
        completed: false,
      }));
      botsRef.current = ACTIVE_MAP.bots.slice(0, s.numBots).map((b) => ({
        ...b,
        speed: 0.03 + Math.random() * 0.03,
        targetTaskIndex: Math.floor(Math.random() * s.numTasks),
        pauseFrames: 0,
      }));
      deadBodiesRef.current = [];
      witnessedKillRef.current = false;
      canReportRef.current = false;

      const g = gameRef.current;
      g.isPlaying = true;
      g.tasksCompleted = 0;
      g.gameOver = false;
      g.killCooldown = 0;
      g.totalTasks = s.numTasks;

      if (isMobile) {
        document.documentElement.requestFullscreen?.();
        (screen.orientation as any)?.lock?.("landscape");
      } else {
        canvas!.requestPointerLock();
      }

      g.isImpostor = Math.random() < 0.3;
      const banner = roleBannerRef.current;
      if (banner) {
        if (g.isImpostor) {
          banner.textContent = "HOSTILE";
          banner.classList.add("role-impostor");
          if (statusTextRef.current)
            statusTextRef.current.textContent = "ELIMINATE ALL";
          showNotification("YOU ARE THE IMPOSTOR", "alert");
        } else {
          banner.textContent = "OPERATIVE";
          showNotification("COMPLETE TASKS TO WIN");
        }
      }

      if (tasksTextRef.current)
        tasksTextRef.current.textContent = `0/${s.numTasks}`;
      updateKillUI();
      updateAliveUI();

      if (isMobile && mobileControlsRef.current) {
        mobileControlsRef.current.style.display = "block";
      }
    }

    // Expose startGame to React
    (window as any).__sabotageStartGame = startGame;

    // ── Keyboard ─────────────────────────────────────────────────────────────
    function onKeyDown(e: KeyboardEvent) {
      keysRef.current[e.key.toLowerCase()] = true;
      if (e.key === "Shift") playerRef.current.isSprinting = true;
      if (e.key.toLowerCase() === "e") completeTask();
      if (e.key.toLowerCase() === "q") kill();
      if (e.key.toLowerCase() === "r") reportBody();
      if (e.key.toLowerCase() === "m") triggerMeeting();
      if (e.key.toLowerCase() === "v") {
        perspectiveRef.current = ((perspectiveRef.current + 1) % 3) as
          | 0
          | 1
          | 2;
        setPerspective(perspectiveRef.current);
      }
    }
    function onKeyUp(e: KeyboardEvent) {
      keysRef.current[e.key.toLowerCase()] = false;
      if (e.key === "Shift") playerRef.current.isSprinting = false;
    }
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("keyup", onKeyUp);

    // ── Mouse ────────────────────────────────────────────────────────────────
    function onMouseMove(e: MouseEvent) {
      if (
        document.pointerLockElement === canvas &&
        !isMobile &&
        !lockJustAcquiredRef.current
      ) {
        playerRef.current.yaw += e.movementX * 0.002;
        playerRef.current.pitch -= e.movementY * 0.002;
        playerRef.current.pitch = Math.max(
          -0.8,
          Math.min(0.8, playerRef.current.pitch),
        );
      }
    }
    function onClick() {
      if (
        gameRef.current.isPlaying &&
        document.pointerLockElement !== canvas &&
        !isMobile &&
        !meetingActiveRef.current
      ) {
        canvas!.requestPointerLock();
      }
    }
    function onPointerLockChange() {
      if (document.pointerLockElement === canvas) {
        lockJustAcquiredRef.current = true;
        setTimeout(() => {
          lockJustAcquiredRef.current = false;
        }, 200);
      }
    }
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("click", onClick);
    document.addEventListener("pointerlockchange", onPointerLockChange);

    // ── Desktop kill button ───────────────────────────────────────────────────
    const killBtn = killBtnRef.current;
    killBtn?.addEventListener("click", (e) => {
      e.stopPropagation();
      kill();
    });

    // ── Mobile Controls ───────────────────────────────────────────────────────
    if (isMobile) {
      const zone = document.getElementById("sabotage-joystick-zone");
      const knob = joystickKnobRef.current;
      let jTouch: Touch | null = null;

      function updateJoystick(touch: Touch) {
        const rect = zone!.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        let dx = touch.clientX - centerX;
        let dy = touch.clientY - centerY;
        const d = Math.hypot(dx, dy);
        const maxD = 40;
        if (d > maxD) {
          dx = (dx / d) * maxD;
          dy = (dy / d) * maxD;
        }
        if (knob) knob.style.transform = `translate(${dx}px,${dy}px)`;
        joystickRef.current = { x: dx / maxD, y: dy / maxD, active: true };
      }

      zone?.addEventListener("touchstart", (e) => {
        e.preventDefault();
        jTouch = e.touches[0];
        updateJoystick(e.touches[0]);
      });
      zone?.addEventListener("touchmove", (e) => {
        e.preventDefault();
        if (jTouch) {
          for (const t of Array.from(e.touches)) {
            if (t.identifier === jTouch.identifier) {
              updateJoystick(t);
              break;
            }
          }
        }
      });
      zone?.addEventListener("touchend", (e) => {
        e.preventDefault();
        joystickRef.current = { x: 0, y: 0, active: false };
        if (knob) knob.style.transform = "translate(0,0)";
        jTouch = null;
      });

      // Right-side swipe to look
      const canvas = canvasRef.current;
      canvas?.addEventListener(
        "touchstart",
        (e) => {
          for (const t of Array.from(e.changedTouches)) {
            if (t.clientX > window.innerWidth * 0.4 && !lookTouchRef.current) {
              lookTouchRef.current = {
                id: t.identifier,
                lastX: t.clientX,
                lastY: t.clientY,
              };
            }
          }
        },
        { passive: true },
      );
      canvas?.addEventListener(
        "touchmove",
        (e) => {
          if (!lookTouchRef.current) return;
          for (const t of Array.from(e.touches)) {
            if (t.identifier === lookTouchRef.current.id) {
              const dx = t.clientX - lookTouchRef.current.lastX;
              const dy = t.clientY - lookTouchRef.current.lastY;
              playerRef.current.yaw += dx * 0.005;
              playerRef.current.pitch = Math.max(
                -0.5,
                Math.min(0.5, playerRef.current.pitch + dy * 0.003),
              );
              lookTouchRef.current.lastX = t.clientX;
              lookTouchRef.current.lastY = t.clientY;
              break;
            }
          }
        },
        { passive: true },
      );
      canvas?.addEventListener(
        "touchend",
        (e) => {
          if (!lookTouchRef.current) return;
          for (const t of Array.from(e.changedTouches)) {
            if (t.identifier === lookTouchRef.current.id) {
              lookTouchRef.current = null;
              break;
            }
          }
        },
        { passive: true },
      );

      const sprintBtn = document.getElementById("sabotage-btn-sprint");
      sprintBtn?.addEventListener("touchstart", (e) => {
        e.preventDefault();
        playerRef.current.isSprinting = true;
      });
      sprintBtn?.addEventListener("touchend", (e) => {
        e.preventDefault();
        playerRef.current.isSprinting = false;
      });

      const interactBtn = document.getElementById("sabotage-btn-interact");
      interactBtn?.addEventListener("touchstart", (e) => {
        e.preventDefault();
        completeTask();
      });

      const mKillBtn = mobileKillBtnRef.current;
      mKillBtn?.addEventListener("touchstart", (e) => {
        e.preventDefault();
        kill();
      });

      if (window.DeviceOrientationEvent) {
        window.addEventListener(
          "deviceorientation",
          (e: DeviceOrientationEvent) => {
            if (e.gamma !== null) playerRef.current.yaw += e.gamma * 0.001;
            if (e.beta !== null)
              playerRef.current.pitch = Math.max(
                -0.5,
                Math.min(0.5, (e.beta - 45) * 0.005),
              );
          },
        );
      }
    }

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("keyup", onKeyUp);
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("pointerlockchange", onPointerLockChange);
      document.removeEventListener("click", onClick);
      if (meetingTimerIntervalRef.current)
        clearInterval(meetingTimerIntervalRef.current);
    };
  }, []);

  // ── Settings Screen ──────────────────────────────────────────────────────
  const [settingsState, setSettingsState] = useState<Settings>({
    moveSpeed: 0.08,
    killCooldown: 10,
    numBots: 3,
    numTasks: 5,
    btnColors: {
      sprint: "#1a6fe8",
      meeting: "#e8c01a",
      report: "#e85c1a",
      use: "#1ae85c",
      kill: "#e81a1a",
    },
  });

  function applySettings(s: Settings) {
    settingsRef.current = { ...s };
  }

  function updateSetting<K extends keyof Settings>(key: K, val: Settings[K]) {
    setSettingsState((prev) => {
      const next = { ...prev, [key]: val };
      settingsRef.current = next;
      return next;
    });
  }

  function handleStartGame() {
    applySettings(settingsState);
    // Set the active map based on selection
    ACTIVE_MAP = MAPS[selectedMap] || MAPS.alcatraz;
    // Reset player to map spawn
    playerRef.current.x = ACTIVE_MAP.playerSpawn.x;
    playerRef.current.z = ACTIVE_MAP.playerSpawn.z;
    // Set player color from selected character
    const char =
      CHARACTERS.find((c) => c.id === selectedCharacter) || CHARACTERS[0];
    playerColorRef.current = char.color;
    selectedCharacterRef.current = selectedCharacter;
    setCurrentScreen("game");
    if (startScreenRef.current) startScreenRef.current.style.display = "none";
    if (settingsScreenRef.current)
      settingsScreenRef.current.style.display = "none";
    setTimeout(() => {
      (window as any).__sabotageStartGame?.();
    }, 50);
  }

  // ── Alive bots (derived for voting overlay) ──────────────────────────────
  const getAliveBotNames = () =>
    botsRef.current.filter((b) => b.alive).map((b) => b.name);

  return (
    <div
      id="sabotage-game"
      style={{
        position: "relative",
        width: "100vw",
        height: "100vh",
        background: "#000",
        overflow: "hidden",
        fontFamily: "'Impact', 'Arial Black', sans-serif",
      }}
    >
      {/* Main Canvas */}
      <canvas
        ref={canvasRef}
        data-ocid="game.canvas_target"
        style={{ display: "block", width: "100%", height: "100%" }}
      />

      {/* UI Overlay */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
          zIndex: 10,
        }}
      >
        {/* Crosshair - COD 4-line style */}
        <div
          id="sabotage-crosshair"
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%,-50%)",
            width: 60,
            height: 60,
            pointerEvents: "none",
          }}
        >
          {/* Top */}
          <div
            style={{
              position: "absolute",
              width: 2,
              height: 10,
              background: "rgba(255,255,255,0.9)",
              left: "50%",
              top: "50%",
              transform: "translate(-50%, calc(-100% - 6px))",
            }}
          />
          {/* Bottom */}
          <div
            style={{
              position: "absolute",
              width: 2,
              height: 10,
              background: "rgba(255,255,255,0.9)",
              left: "50%",
              top: "50%",
              transform: "translate(-50%, 6px)",
            }}
          />
          {/* Left */}
          <div
            style={{
              position: "absolute",
              width: 10,
              height: 2,
              background: "rgba(255,255,255,0.9)",
              left: "50%",
              top: "50%",
              transform: "translate(calc(-100% - 6px), -50%)",
            }}
          />
          {/* Right */}
          <div
            style={{
              position: "absolute",
              width: 10,
              height: 2,
              background: "rgba(255,255,255,0.9)",
              left: "50%",
              top: "50%",
              transform: "translate(6px, -50%)",
            }}
          />
          {/* Center dot */}
          <div
            style={{
              position: "absolute",
              width: 2,
              height: 2,
              background: "rgba(255,255,255,0.7)",
              borderRadius: "50%",
              left: "50%",
              top: "50%",
              transform: "translate(-50%,-50%)",
            }}
          />
        </div>

        {/* Vignette & scanlines */}
        <div id="sabotage-game-vignette" />
        <div id="sabotage-game-scanlines" />

        {/* Compass */}
        <div id="sabotage-compass">N ───── 360° ─────</div>

        {/* Kill Feed */}
        <div id="sabotage-killfeed" />

        {/* Perspective Toggle */}
        <button
          type="button"
          data-ocid="game.perspective_toggle"
          onClick={() => {
            const next = ((perspectiveRef.current + 1) % 3) as 0 | 1 | 2;
            perspectiveRef.current = next;
            setPerspective(next);
          }}
          style={{
            position: "absolute",
            top: 35,
            left: 20,
            padding: "6px 14px",
            background: "rgba(8,12,6,0.88)",
            border: "1px solid rgba(80,100,60,0.5)",
            borderLeft: "3px solid #c8a84b",
            color: "#c8a84b",
            fontSize: 14,
            fontWeight: 700,
            fontFamily: "'Oswald', 'Rajdhani', sans-serif",
            letterSpacing: 3,
            textTransform: "uppercase",
            cursor: "pointer",
            pointerEvents: "auto",
            zIndex: 15,
          }}
          title="Cycle camera perspective (V)"
        >
          {perspective === 0 ? "1P" : perspective === 1 ? "2P" : "3P"}
        </button>

        {/* Health Bar */}
        <div id="sabotage-health">
          <div id="sabotage-health-label">HP</div>
          <div id="sabotage-health-bar">
            {Array.from({ length: 10 }).map((_, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: health segments are positional
              <div key={i} className="seg" />
            ))}
          </div>
        </div>

        {/* Ammo Counter */}
        <div id="sabotage-ammo">
          <div id="sabotage-ammo-main">30</div>
          <div id="sabotage-ammo-reserve">/ 90</div>
        </div>

        {/* Death Overlay */}
        <div id="sabotage-death-overlay">
          <h2>YOU WERE ELIMINATED</h2>
          <p>PRESS ENTER TO CONTINUE</p>
        </div>

        {/* Role Banner */}
        <div
          ref={roleBannerRef}
          className="role-banner"
          style={{
            position: "absolute",
            top: 20,
            left: "50%",
            transform: "translateX(-50%)",
            padding: "6px 40px",
            fontSize: 18,
            fontWeight: 700,
            letterSpacing: 6,
            textTransform: "uppercase",
            color: "#4aff4a",
            background:
              "linear-gradient(90deg, transparent, rgba(10,25,10,0.9), transparent)",
            border: "none",
            borderBottom: "2px solid #3a7a3a",
            textShadow: "0 0 12px rgba(74,255,74,0.5)",
            fontFamily: "'Oswald', sans-serif",
          }}
        >
          CREWMATE
        </div>

        {/* Task Bar */}
        <div
          style={{
            position: "absolute",
            top: 80,
            left: "50%",
            transform: "translateX(-50%)",
            width: 300,
          }}
        >
          <div
            style={{
              color: "#8aaa6a",
              fontSize: 10,
              textTransform: "uppercase",
              letterSpacing: 3,
              marginBottom: 4,
              textAlign: "center",
              fontFamily: "'Rajdhani', sans-serif",
            }}
          >
            TASK PROGRESS
          </div>
          <div
            style={{
              width: "100%",
              height: 6,
              background: "rgba(20,30,15,0.8)",
              border: "1px solid rgba(80,120,60,0.4)",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div
              ref={taskProgressRef}
              style={{
                height: "100%",
                width: "0%",
                background: "linear-gradient(90deg, #0f0, #0a0)",
                boxShadow: "0 0 20px #0f0",
                transition: "width 0.5s",
              }}
            />
          </div>
        </div>

        {/* Stats Panel */}
        <div
          style={{
            position: "absolute",
            bottom: 20,
            left: 20,
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          {(
            [
              { label: "LOCATION", id: "location" },
              { label: "TASKS", id: "tasks" },
              { label: "ALIVE", id: "alive" },
              { label: "STATUS", id: "status" },
            ] as { label: string; id: string }[]
          ).map(({ label, id }) => (
            <div
              key={id}
              style={{
                background: "rgba(0,20,0,0.85)",
                border: "1px solid #0f0",
                padding: "10px 20px",
                color: "#0f0",
                fontSize: 14,
                fontWeight: "bold",
                textTransform: "uppercase",
                letterSpacing: 2,
                boxShadow: "0 0 15px rgba(0,255,0,0.2)",
                minWidth: 180,
              }}
            >
              <div style={{ color: "#0a0", fontSize: 10, marginBottom: 2 }}>
                {label}
              </div>
              <div
                ref={
                  id === "location"
                    ? locationTextRef
                    : id === "tasks"
                      ? tasksTextRef
                      : id === "alive"
                        ? aliveTextRef
                        : statusTextRef
                }
                style={{ fontSize: 16, textShadow: "0 0 10px #0f0" }}
              >
                {id === "location"
                  ? "MAIN DECK"
                  : id === "tasks"
                    ? "0/5"
                    : id === "alive"
                      ? "4/4"
                      : "ALIVE"}
              </div>
            </div>
          ))}
        </div>

        {/* Minimap */}
        <div
          style={{
            position: "absolute",
            top: 20,
            right: 20,
            width: 180,
            height: 180,
            borderRadius: "50%",
            background: "rgba(6,10,5,0.92)",
            border: "2px solid rgba(80,100,60,0.6)",
            overflow: "hidden",
            boxShadow: "0 2px 12px rgba(0,0,0,0.8)",
          }}
        >
          <canvas ref={minimapRef} style={{ width: "100%", height: "100%" }} />
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              borderRadius: "50%",
              boxShadow: "inset 0 0 30px rgba(0,0,0,0.6)",
              pointerEvents: "none",
            }}
          />
        </div>

        {/* Kill Button (desktop) */}
        <div
          ref={killBtnRef}
          data-ocid="game.kill_button"
          className="kill-button"
          style={{
            position: "absolute",
            bottom: 100,
            right: 30,
            width: 100,
            height: 100,
            borderRadius: "50%",
            background: "rgba(20,5,5,0.92)",
            border: "2px solid #8a2020",
            color: "#cc4040",
            fontSize: 15,
            fontWeight: 700,
            textTransform: "uppercase",
            display: "none",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
            fontFamily: "'Oswald', sans-serif",
            letterSpacing: 2,
            pointerEvents: "auto",
            cursor: "pointer",
          }}
        >
          KILL
        </div>

        {/* Report Button */}
        <button
          type="button"
          ref={reportBtnRef}
          data-ocid="game.report_button"
          onClick={reportBody}
          style={{
            position: "absolute",
            bottom: 220,
            right: 30,
            width: 90,
            height: 90,
            borderRadius: "50%",
            background: "rgba(15,10,5,0.92)",
            border: "2px solid #6a5020",
            color: "#c8a84b",
            fontSize: 11,
            fontWeight: 700,
            textTransform: "uppercase",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
            fontFamily: "'Rajdhani', sans-serif",
            pointerEvents: "auto",
            cursor: "pointer",
            display: "none",
            transition: "opacity 0.3s, transform 0.3s",
            textAlign: "center",
            lineHeight: 1.2,
            flexDirection: "column",
          }}
        >
          <span style={{ fontSize: 18 }}>📢</span>
          REPORT
        </button>

        {/* Meeting Button (always visible) */}
        <button
          type="button"
          data-ocid="game.meeting_button"
          onClick={triggerMeeting}
          style={{
            position: "absolute",
            bottom: 20,
            left: "50%",
            transform: "translateX(-50%)",
            padding: "12px 30px",
            background: "rgba(8,8,5,0.92)",
            border: "1px solid #5a4a20",
            borderTop: "2px solid #c8a84b",
            color: "#c8a84b",
            fontSize: 13,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: 4,
            cursor: "pointer",
            pointerEvents: "auto",
            boxShadow: "0 -4px 20px rgba(0,0,0,0.4)",
            display: "flex",
            alignItems: "center",
            gap: 8,
            zIndex: 20,
            fontFamily: "'Oswald', sans-serif",
          }}
        >
          <span>🚨</span> EMERGENCY MEETING
        </button>

        {/* Interaction Prompt */}
        <div
          ref={interactionRef}
          style={{
            position: "absolute",
            top: "65%",
            left: "50%",
            transform: "translateX(-50%)",
            padding: "15px 30px",
            background: "rgba(6,10,5,0.92)",
            border: "1px solid rgba(80,120,60,0.5)",
            borderLeft: "3px solid #7aaa5a",
            color: "#a0cc80",
            fontSize: 15,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: 3,
            opacity: 0,
            transition: "opacity 0.3s",
            textShadow: "none",
            boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
            fontFamily: "'Rajdhani', sans-serif",
            whiteSpace: "nowrap",
          }}
          className="interaction-prompt"
        >
          PRESS E TO INTERACT
        </div>

        {/* Hit Marker */}
        <div
          ref={hitMarkerRef}
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%,-50%)",
            width: 60,
            height: 60,
            opacity: 0,
            pointerEvents: "none",
          }}
          className="hit-marker"
        >
          {[
            {
              id: "tl",
              top: 0,
              left: "50%",
              transform: "translateX(-50%) rotate(45deg)",
            },
            {
              id: "tr",
              top: 0,
              left: "50%",
              transform: "translateX(-50%) rotate(-45deg)",
            },
            {
              id: "bl",
              bottom: 0,
              left: "50%",
              transform: "translateX(-50%) rotate(45deg)",
            },
            {
              id: "br",
              bottom: 0,
              left: "50%",
              transform: "translateX(-50%) rotate(-45deg)",
            },
          ].map(({ id, ...style }) => (
            <div
              key={id}
              style={{
                position: "absolute",
                width: 15,
                height: 3,
                background: "#fff",
                boxShadow: "none",
                ...style,
              }}
            />
          ))}
        </div>

        {/* Notification */}
        <div
          ref={notificationRef}
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%,-50%)",
            padding: "20px 40px",
            background: "rgba(0,0,0,0.9)",
            border: "1px solid rgba(200,168,75,0.4)",
            borderLeft: "4px solid #c8a84b",
            color: "#e8d890",
            fontSize: 20,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: 3,
            textAlign: "center",
            opacity: 0,
            transition: "opacity 0.5s",
            pointerEvents: "none",
            zIndex: 100,
            textShadow: "none",
            boxShadow: "0 4px 20px rgba(0,0,0,0.6)",
            fontFamily: "'Oswald', sans-serif",
          }}
          className="notification"
        />

        {/* Mobile Controls */}
        <div
          ref={mobileControlsRef}
          style={{
            display: "none",
            position: "absolute",
            bottom: 0,
            left: 0,
            width: "100%",
            height: "100%",
            pointerEvents: "none",
          }}
        >
          <div
            id="sabotage-joystick-zone"
            style={{
              position: "absolute",
              bottom: 50,
              left: 50,
              width: 150,
              height: 150,
              pointerEvents: "auto",
            }}
          >
            <div
              style={{
                position: "absolute",
                width: 120,
                height: 120,
                border: "3px solid rgba(0,255,0,0.3)",
                borderRadius: "50%",
                background: "rgba(0,20,0,0.5)",
              }}
            />
            <div
              ref={joystickKnobRef}
              style={{
                position: "absolute",
                width: 50,
                height: 50,
                background: "radial-gradient(circle, #0f0, #0a0)",
                borderRadius: "50%",
                top: 35,
                left: 35,
                boxShadow: "0 0 20px #0f0",
              }}
            />
          </div>

          {/* Action Button Cluster - Bottom Right */}
          <div
            style={{
              position: "absolute",
              bottom: 30,
              right: 20,
              display: "grid",
              gridTemplateColumns: "70px 70px",
              gridTemplateRows: "70px 70px",
              gap: 10,
              pointerEvents: "auto",
            }}
          >
            {/* Sprint - Blue (top-left) */}
            <button
              type="button"
              id="sabotage-btn-sprint"
              data-ocid="game.sprint_button"
              style={{
                width: 70,
                height: 70,
                borderRadius: "50%",
                border: "3px solid rgba(255,255,255,0.3)",
                background: settingsState.btnColors.sprint,
                boxShadow: `0 4px 16px ${settingsState.btnColors.sprint}99, inset 0 -3px 6px rgba(0,0,0,0.4)`,
                pointerEvents: "auto",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
              title="Sprint"
            />

            {/* Meeting - Yellow (top-right) */}
            <button
              type="button"
              data-ocid="game.mobile_meeting_button"
              onClick={triggerMeeting}
              style={{
                width: 70,
                height: 70,
                borderRadius: "50%",
                border: "3px solid rgba(255,255,255,0.3)",
                background: settingsState.btnColors.meeting,
                boxShadow: `0 4px 16px ${settingsState.btnColors.meeting}99, inset 0 -3px 6px rgba(0,0,0,0.4)`,
                pointerEvents: "auto",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
              title="Emergency Meeting"
            />

            {/* Report - Orange (bottom-left) */}
            <button
              type="button"
              data-ocid="game.mobile_report_button"
              onClick={reportBody}
              style={{
                width: 70,
                height: 70,
                borderRadius: "50%",
                border: "3px solid rgba(255,255,255,0.3)",
                background: settingsState.btnColors.report,
                boxShadow: `0 4px 16px ${settingsState.btnColors.report}99, inset 0 -3px 6px rgba(0,0,0,0.4)`,
                pointerEvents: "auto",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
              title="Report Body"
            />

            {/* Interact/Use - Green (bottom-right), Kill replaces when impostor */}
            <button
              type="button"
              id="sabotage-btn-interact"
              data-ocid="game.interact_button"
              style={{
                width: 70,
                height: 70,
                borderRadius: "50%",
                border: "3px solid rgba(255,255,255,0.3)",
                background: settingsState.btnColors.use,
                boxShadow: `0 4px 16px ${settingsState.btnColors.use}99, inset 0 -3px 6px rgba(0,0,0,0.4)`,
                pointerEvents: "auto",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
              title="Use / Interact"
            />

            {/* Kill - Red (overlays interact slot for impostors) */}
            <button
              type="button"
              ref={mobileKillBtnRef}
              data-ocid="game.mobile_kill_button"
              style={{
                width: 70,
                height: 70,
                borderRadius: "50%",
                border: "3px solid rgba(255,255,255,0.3)",
                background: settingsState.btnColors.kill,
                boxShadow: `0 4px 16px ${settingsState.btnColors.kill}99, inset 0 -3px 6px rgba(0,0,0,0.4)`,
                pointerEvents: "auto",
                display: "none",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                gridColumn: "2",
                gridRow: "2",
              }}
              title="Kill"
            />
          </div>
        </div>
      </div>

      {/* ── VOTING OVERLAY ── */}
      {meetingActive && (
        <div
          data-ocid="game.dialog"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            background: "rgba(0,5,0,0.97)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "flex-start",
            zIndex: 2000,
            pointerEvents: "auto",
            overflowY: "auto",
            fontFamily: "'Impact', 'Arial Black', sans-serif",
          }}
        >
          {/* Header */}
          <div
            style={{
              width: "100%",
              borderBottom: "2px solid #0f0",
              padding: "20px 0 15px",
              textAlign: "center",
              background: "rgba(0,20,0,0.9)",
            }}
          >
            <div
              style={{
                fontSize: "clamp(20px, 5vw, 36px)",
                color: "#0f0",
                letterSpacing: 8,
                textShadow: "0 0 30px #0f0",
                marginBottom: 6,
              }}
            >
              🚨 EMERGENCY MEETING 🚨
            </div>
            {votingPhase === "voting" && (
              <div style={{ fontSize: 14, color: "#0a0", letterSpacing: 3 }}>
                DISCUSS AND VOTE — WHO IS THE SABOTEUR?
              </div>
            )}
          </div>

          {votingPhase === "voting" && (
            <div
              style={{
                width: "100%",
                maxWidth: 600,
                padding: "20px 24px",
                flex: 1,
              }}
            >
              {/* Timer */}
              <div style={{ textAlign: "center", marginBottom: 20 }}>
                <div
                  style={{
                    fontSize: 12,
                    color: "#0a0",
                    letterSpacing: 3,
                    marginBottom: 4,
                  }}
                >
                  TIME REMAINING
                </div>
                <div
                  style={{
                    fontSize: "clamp(32px, 8vw, 60px)",
                    color: meetingTimer <= 10 ? "#f00" : "#0f0",
                    textShadow: `0 0 30px ${meetingTimer <= 10 ? "#f00" : "#0f0"}`,
                    letterSpacing: 4,
                  }}
                >
                  {meetingTimer}s
                </div>
              </div>

              {/* Candidates */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                  marginBottom: 20,
                }}
              >
                {/* Vote for player */}
                <VoteRow
                  name="PLAYER"
                  label="Player (You)"
                  color="#0f0"
                  isVoted={myVote === "PLAYER"}
                  isYou={false}
                  onVote={() => castVote("PLAYER")}
                />
                {/* Vote for each alive bot */}
                {getAliveBotNames().map((botName) => (
                  <VoteRow
                    key={botName}
                    name={botName}
                    label={BOT_DISPLAY_NAMES[botName] || botName}
                    color={
                      botsRef.current.find((b) => b.name === botName)?.color ||
                      "#fff"
                    }
                    isVoted={myVote === botName}
                    isYou={false}
                    onVote={() => castVote(botName)}
                  />
                ))}
                {/* Skip */}
                <VoteRow
                  name="SKIP"
                  label="Skip Vote"
                  color="#666"
                  isVoted={myVote === "SKIP"}
                  isYou={false}
                  onVote={() => castVote("SKIP")}
                  isSkip
                />
              </div>

              {myVote && (
                <div
                  style={{
                    textAlign: "center",
                    color: "#0a0",
                    fontSize: 13,
                    letterSpacing: 2,
                  }}
                >
                  VOTE CAST — WAITING FOR RESULTS...
                </div>
              )}
            </div>
          )}

          {votingPhase === "result" && voteResult && (
            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: 30,
              }}
            >
              <div
                style={{
                  fontSize: "clamp(16px, 4vw, 28px)",
                  color: voteResult === "SKIP" ? "#666" : "#f00",
                  letterSpacing: 4,
                  textShadow: `0 0 30px ${voteResult === "SKIP" ? "#666" : "#f00"}`,
                  textAlign: "center",
                  lineHeight: 1.4,
                  marginBottom: 20,
                }}
              >
                {voteResult === "SKIP"
                  ? "NO MAJORITY — SKIP"
                  : voteResult === "PLAYER"
                    ? "YOU WERE EJECTED!"
                    : `${BOT_DISPLAY_NAMES[voteResult] || voteResult} WAS EJECTED!`}
              </div>
              {/* Vote tally */}
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 8,
                  justifyContent: "center",
                }}
              >
                {Object.entries(votes).map(([name, count]) => (
                  <div
                    key={name}
                    style={{
                      background: "rgba(0,30,0,0.8)",
                      border: "1px solid #0a0",
                      padding: "6px 14px",
                      color: "#0f0",
                      fontSize: 13,
                      letterSpacing: 1,
                    }}
                  >
                    {name === "PLAYER"
                      ? "You"
                      : name === "SKIP"
                        ? "SKIP"
                        : BOT_DISPLAY_NAMES[name] || name}
                    : {count} vote{count !== 1 ? "s" : ""}
                  </div>
                ))}
              </div>
              <div
                style={{
                  marginTop: 20,
                  color: "#050",
                  fontSize: 13,
                  letterSpacing: 2,
                }}
              >
                RESUMING IN 3 SECONDS...
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── START SCREEN ── */}
      <div
        ref={startScreenRef}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          background:
            "linear-gradient(160deg, #0a0b08 0%, #111410 40%, #0d0e0b 100%)",
          display: currentScreen === "start" ? "flex" : "none",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 1000,
          pointerEvents: "auto",
        }}
      >
        <h1
          style={{
            fontSize: "clamp(48px, 10vw, 80px)",
            color: "#c8a84b",
            textShadow: "0 2px 0 #6b5a1e, 0 0 40px rgba(200,168,75,0.4)",
            letterSpacing: 15,
            marginBottom: 10,
            fontFamily: "'Oswald', 'Arial Black', sans-serif",
            fontWeight: 700,
          }}
        >
          SABOTAGE
        </h1>
        <div
          style={{
            color: "#6b7c5a",
            fontSize: 16,
            letterSpacing: 8,
            marginBottom: 50,
            fontFamily: "'Rajdhani', sans-serif",
          }}
        >
          TACTICAL SOCIAL DEDUCTION
        </div>

        {/* Map Selector */}
        <div style={{ marginBottom: 30, textAlign: "center" }}>
          <div
            style={{
              color: "#6b7c5a",
              fontSize: 13,
              letterSpacing: 3,
              marginBottom: 12,
              textTransform: "uppercase",
              fontFamily: "'Rajdhani', sans-serif",
            }}
          >
            SELECT MAP
          </div>
          <div style={{ display: "flex", gap: 16, justifyContent: "center" }}>
            {Object.values(MAPS).map((m) => (
              <button
                key={m.id}
                type="button"
                data-ocid={`map.${m.id}.button`}
                onClick={() => setSelectedMap(m.id)}
                style={{
                  padding: "14px 22px",
                  minWidth: 160,
                  background:
                    selectedMap === m.id
                      ? "rgba(200,168,75,0.12)"
                      : "rgba(255,255,255,0.03)",
                  color: selectedMap === m.id ? "#c8a84b" : "#7a8a68",
                  border:
                    selectedMap === m.id
                      ? "2px solid #c8a84b"
                      : "2px solid #2a3020",
                  cursor: "pointer",
                  fontFamily: "'Oswald', 'Arial Black', sans-serif",
                  fontSize: 15,
                  letterSpacing: 3,
                  textTransform: "uppercase",
                  textAlign: "left",
                  transition: "all 0.2s",
                  boxShadow:
                    selectedMap === m.id
                      ? "0 0 16px rgba(200,168,75,0.25), inset 0 0 20px rgba(200,168,75,0.05)"
                      : "none",
                }}
              >
                <div style={{ fontWeight: "bold", marginBottom: 4 }}>
                  {m.label}
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: selectedMap === m.id ? "#a8904a" : "#4a5538",
                    letterSpacing: 1,
                    fontFamily: "Arial, sans-serif",
                    whiteSpace: "normal",
                    lineHeight: 1.3,
                  }}
                >
                  {m.description}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Character Selection */}
        <div style={{ marginBottom: 24, width: "100%" }}>
          <div
            style={{
              color: "#0f0",
              fontSize: 13,
              letterSpacing: 2,
              textTransform: "uppercase",
              marginBottom: 10,
              textAlign: "center",
            }}
          >
            SELECT CHARACTER
          </div>
          <div
            style={{
              display: "flex",
              gap: 10,
              justifyContent: "center",
              flexWrap: "wrap",
            }}
          >
            {CHARACTERS.map((char) => (
              <button
                type="button"
                key={char.id}
                data-ocid={`char.item.${char.id}`}
                onClick={() => setSelectedCharacter(char.id)}
                style={{
                  width: 80,
                  height: 100,
                  border:
                    selectedCharacter === char.id
                      ? `2px solid ${char.accent}`
                      : "2px solid rgba(255,255,255,0.15)",
                  borderRadius: 10,
                  background:
                    selectedCharacter === char.id
                      ? `${char.color}33`
                      : "rgba(0,0,0,0.4)",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 4,
                  boxShadow:
                    selectedCharacter === char.id
                      ? `0 0 12px ${char.accent}88`
                      : "none",
                  transition: "all 0.2s",
                }}
              >
                <svg
                  width="44"
                  height="52"
                  viewBox="0 0 44 52"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-label={char.name}
                  role="img"
                >
                  <circle
                    cx="22"
                    cy="11"
                    r="9"
                    fill={char.color}
                    stroke={char.accent}
                    strokeWidth="1.5"
                  />
                  <ellipse
                    cx="22"
                    cy="11"
                    rx="5"
                    ry="3.5"
                    fill="#001a00"
                    opacity="0.85"
                  />
                  <circle
                    cx="18"
                    cy="15"
                    r="2"
                    fill="#222"
                    stroke={char.accent}
                    strokeWidth="0.8"
                  />
                  <circle
                    cx="26"
                    cy="15"
                    r="2"
                    fill="#222"
                    stroke={char.accent}
                    strokeWidth="0.8"
                  />
                  <rect
                    x="12"
                    y="20"
                    width="20"
                    height="20"
                    rx="4"
                    fill={char.color}
                    stroke={char.accent}
                    strokeWidth="1"
                  />
                  <circle
                    cx="22"
                    cy="29"
                    r="4"
                    fill={char.accent}
                    opacity="0.5"
                  />
                  <rect
                    x="4"
                    y="20"
                    width="8"
                    height="14"
                    rx="3"
                    fill={char.color}
                    stroke={char.accent}
                    strokeWidth="0.8"
                  />
                  <rect
                    x="32"
                    y="20"
                    width="8"
                    height="14"
                    rx="3"
                    fill={char.color}
                    stroke={char.accent}
                    strokeWidth="0.8"
                  />
                  <rect
                    x="13"
                    y="40"
                    width="7"
                    height="11"
                    rx="3"
                    fill={char.color}
                    stroke={char.accent}
                    strokeWidth="0.8"
                  />
                  <rect
                    x="24"
                    y="40"
                    width="7"
                    height="11"
                    rx="3"
                    fill={char.color}
                    stroke={char.accent}
                    strokeWidth="0.8"
                  />
                </svg>
                <div
                  style={{
                    color: char.accent,
                    fontSize: 9,
                    fontWeight: 700,
                    letterSpacing: 1,
                    textTransform: "uppercase",
                  }}
                >
                  {char.name}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", gap: 20, marginBottom: 20 }}>
          <button
            type="button"
            data-ocid="game.start_button"
            onClick={handleStartGame}
            style={{
              padding: "25px 80px",
              fontSize: 28,
              background: "transparent",
              color: "#0f0",
              border: "3px solid #0f0",
              cursor: "pointer",
              textTransform: "uppercase",
              letterSpacing: 5,
              fontWeight: "bold",
              textShadow: "0 0 20px #0f0",
              boxShadow: "0 0 30px rgba(0,255,0,0.2)",
              transition: "all 0.3s",
              fontFamily: "'Impact', 'Arial Black', sans-serif",
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLButtonElement).style.background =
                "rgba(0,255,0,0.2)";
              (e.target as HTMLButtonElement).style.boxShadow =
                "0 0 50px rgba(0,255,0,0.5)";
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLButtonElement).style.background = "transparent";
              (e.target as HTMLButtonElement).style.boxShadow =
                "0 0 30px rgba(0,255,0,0.2)";
            }}
          >
            DEPLOY
          </button>

          <button
            type="button"
            data-ocid="game.settings_button"
            onClick={() => setCurrentScreen("settings")}
            style={{
              padding: "18px 40px",
              fontSize: 18,
              background: "rgba(255,255,255,0.03)",
              color: "#7a8a68",
              border: "2px solid #2a3020",
              cursor: "pointer",
              textTransform: "uppercase",
              letterSpacing: 3,
              fontWeight: 600,
              boxShadow: "none",
              transition: "all 0.3s",
              fontFamily: "'Oswald', 'Impact', sans-serif",
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLButtonElement).style.borderColor = "#c8a84b";
              (e.target as HTMLButtonElement).style.color = "#c8a84b";
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLButtonElement).style.borderColor = "#2a3020";
              (e.target as HTMLButtonElement).style.color = "#7a8a68";
            }}
          >
            SETTINGS
          </button>
        </div>

        <div
          style={{
            marginTop: 20,
            color: "#050",
            textAlign: "center",
            lineHeight: 2,
            fontSize: 14,
          }}
        >
          <p className="desktop-hint">
            {["W", "A", "S", "D"].map((k) => (
              <span
                key={k}
                style={{
                  color: "#0f0",
                  padding: "5px 10px",
                  border: "1px solid #0f0",
                  margin: "0 5px",
                  background: "rgba(0,50,0,0.3)",
                }}
              >
                {k}
              </span>
            ))}{" "}
            MOVE &nbsp;
            <span
              style={{
                color: "#0f0",
                padding: "5px 10px",
                border: "1px solid #0f0",
                margin: "0 5px",
                background: "rgba(0,50,0,0.3)",
              }}
            >
              MOUSE
            </span>{" "}
            AIM &nbsp;
            <span
              style={{
                color: "#0f0",
                padding: "5px 10px",
                border: "1px solid #0f0",
                margin: "0 5px",
                background: "rgba(0,50,0,0.3)",
              }}
            >
              E
            </span>{" "}
            INTERACT &nbsp;
            <span
              style={{
                color: "#0f0",
                padding: "5px 10px",
                border: "1px solid #0f0",
                margin: "0 5px",
                background: "rgba(0,50,0,0.3)",
              }}
            >
              Q
            </span>{" "}
            KILL &nbsp;
            <span
              style={{
                color: "#0f0",
                padding: "5px 10px",
                border: "1px solid #0f0",
                margin: "0 5px",
                background: "rgba(0,50,0,0.3)",
              }}
            >
              R
            </span>{" "}
            REPORT &nbsp;
            <span
              style={{
                color: "#0f0",
                padding: "5px 10px",
                border: "1px solid #0f0",
                margin: "0 5px",
                background: "rgba(0,50,0,0.3)",
              }}
            >
              M
            </span>{" "}
            MEETING
          </p>
          <p className="mobile-hint" style={{ display: "none" }}>
            TILT DEVICE TO AIM • JOYSTICK TO MOVE • BUTTONS TO ACT
          </p>
        </div>
      </div>

      {/* ── SETTINGS SCREEN ── */}
      <div
        ref={settingsScreenRef}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          background:
            "linear-gradient(160deg, #0a0b08 0%, #111410 40%, #0d0e0b 100%)",
          display: currentScreen === "settings" ? "flex" : "none",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 1000,
          pointerEvents: "auto",
        }}
      >
        <h2
          style={{
            fontSize: "clamp(28px, 6vw, 48px)",
            color: "#c8a84b",
            letterSpacing: 8,
            textShadow: "0 2px 0 #6b5a1e",
            marginBottom: 8,
            fontFamily: "'Oswald', sans-serif",
            fontWeight: 700,
          }}
        >
          SETTINGS
        </h2>
        <div
          style={{
            color: "#6b7c5a",
            fontSize: 13,
            letterSpacing: 4,
            marginBottom: 40,
            fontFamily: "'Rajdhani', sans-serif",
          }}
        >
          CONFIGURE MISSION PARAMETERS
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 24,
            width: "min(400px, 90vw)",
            marginBottom: 40,
          }}
        >
          <SettingRow
            label="MOVE SPEED"
            value={settingsState.moveSpeed.toFixed(2)}
            onDec={() =>
              updateSetting(
                "moveSpeed",
                Math.max(0.05, +(settingsState.moveSpeed - 0.01).toFixed(2)),
              )
            }
            onInc={() =>
              updateSetting(
                "moveSpeed",
                Math.min(0.2, +(settingsState.moveSpeed + 0.01).toFixed(2)),
              )
            }
          />
          <SettingRow
            label="KILL COOLDOWN"
            value={`${settingsState.killCooldown}s`}
            onDec={() =>
              updateSetting(
                "killCooldown",
                Math.max(5, settingsState.killCooldown - 1),
              )
            }
            onInc={() =>
              updateSetting(
                "killCooldown",
                Math.min(30, settingsState.killCooldown + 1),
              )
            }
          />
          <SettingRow
            label="NUMBER OF BOTS"
            value={String(settingsState.numBots)}
            onDec={() =>
              updateSetting("numBots", Math.max(1, settingsState.numBots - 1))
            }
            onInc={() =>
              updateSetting("numBots", Math.min(6, settingsState.numBots + 1))
            }
          />
          <SettingRow
            label="NUMBER OF TASKS"
            value={String(settingsState.numTasks)}
            onDec={() =>
              updateSetting("numTasks", Math.max(3, settingsState.numTasks - 1))
            }
            onInc={() =>
              updateSetting(
                "numTasks",
                Math.min(10, settingsState.numTasks + 1),
              )
            }
          />
        </div>

        {/* Button Color Customization */}
        <div
          style={{
            width: "min(400px, 90vw)",
            marginBottom: 32,
            background: "rgba(255,255,255,0.03)",
            border: "1px solid #2a3020",
            borderRadius: 2,
            padding: "18px 20px",
          }}
        >
          <div
            style={{
              color: "#c8a84b",
              fontSize: 13,
              letterSpacing: 4,
              textTransform: "uppercase",
              fontWeight: 700,
              marginBottom: 16,
              textAlign: "center",
              fontFamily: "'Rajdhani', sans-serif",
            }}
          >
            BUTTON COLOURS
          </div>
          {(
            [
              { key: "sprint", label: "SPRINT" },
              { key: "meeting", label: "MEETING" },
              { key: "report", label: "REPORT" },
              { key: "use", label: "USE" },
              { key: "kill", label: "KILL" },
            ] as { key: keyof BtnColors; label: string }[]
          ).map(({ key, label }) => (
            <div
              key={key}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                marginBottom: 10,
              }}
            >
              <div
                style={{
                  flex: 1,
                  color: "#aab0d4",
                  fontSize: 12,
                  letterSpacing: 3,
                  textTransform: "uppercase",
                  fontWeight: "bold",
                }}
              >
                {label}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                {[
                  "#1a6fe8",
                  "#e8c01a",
                  "#e85c1a",
                  "#1ae85c",
                  "#e81a1a",
                  "#c81ae8",
                  "#1ae8d4",
                  "#e8e81a",
                ].map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() =>
                      updateSetting("btnColors", {
                        ...settingsState.btnColors,
                        [key]: c,
                      })
                    }
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      border:
                        settingsState.btnColors[key] === c
                          ? "3px solid #fff"
                          : "2px solid rgba(255,255,255,0.2)",
                      background: c,
                      cursor: "pointer",
                      boxShadow:
                        settingsState.btnColors[key] === c
                          ? `0 0 10px ${c}`
                          : "none",
                      flexShrink: 0,
                    }}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          data-ocid="game.settings_back_button"
          onClick={() => setCurrentScreen("start")}
          style={{
            padding: "15px 60px",
            fontSize: 18,
            background: "rgba(200,168,75,0.08)",
            color: "#c8a84b",
            border: "2px solid #5a4a20",
            cursor: "pointer",
            textTransform: "uppercase",
            letterSpacing: 5,
            fontWeight: 600,
            transition: "all 0.3s",
            fontFamily: "'Oswald', sans-serif",
            borderRadius: 2,
          }}
          onMouseEnter={(e) => {
            (e.target as HTMLButtonElement).style.borderColor = "#c8a84b";
            (e.target as HTMLButtonElement).style.color = "#e8c870";
          }}
          onMouseLeave={(e) => {
            (e.target as HTMLButtonElement).style.borderColor = "#5a4a20";
            (e.target as HTMLButtonElement).style.color = "#c8a84b";
          }}
        >
          ← BACK
        </button>
      </div>

      {/* Global styles */}
      <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;600;700&family=Oswald:wght@400;600;700&display=swap');
        #sabotage-game .role-banner.role-impostor {
          color: #f00 !important;
          border-color: #f00 !important;
          text-shadow: 0 0 20px #f00 !important;
          background: linear-gradient(90deg, transparent, rgba(50,0,0,0.8), transparent) !important;
        }
        #sabotage-game .kill-button.ready {
          background: radial-gradient(circle, rgba(255,0,0,0.8), rgba(200,0,0,1)) !important;
          color: #fff !important;
          animation: pulse-fast 0.5s infinite !important;
        }
        #sabotage-game .kill-button.cooldown {
          background: radial-gradient(circle, rgba(50,50,50,0.8), rgba(20,20,20,1)) !important;
          border-color: #555 !important;
          color: #888 !important;
          animation: none !important;
        }
        #sabotage-game .interaction-prompt.visible { opacity: 1 !important; }
        #sabotage-game .hit-marker.active { animation: hit-anim 0.3s forwards !important; }
        #sabotage-game .notification.visible { opacity: 1 !important; }
        #sabotage-game .notification.alert {
          border-color: #f00 !important; color: #f00 !important;
          text-shadow: 0 0 20px #f00 !important; box-shadow: 0 0 40px rgba(255,0,0,0.3) !important;
        }
        @keyframes flicker {
          0%, 95%, 100% { opacity: 1; } 96% { opacity: 0.8; } 98% { opacity: 0.6; }
        }
        @keyframes pulse-fast {
          0%, 100% { box-shadow: 0 0 20px rgba(255,0,0,0.8); }
          50% { box-shadow: 0 0 40px rgba(255,0,0,1); }
        }
        @keyframes hit-anim {
          0% { opacity: 1; transform: translate(-50%,-50%) scale(1); }
          100% { opacity: 0; transform: translate(-50%,-50%) scale(1.5); }
        }
        @media (max-width: 768px) {
          #sabotage-game .desktop-hint { display: none !important; }
          #sabotage-game .mobile-hint { display: inline !important; }
        }
      #sabotage-game * { box-sizing: border-box; }
      #sabotage-game .role-banner {
        font-family: 'Oswald', 'Impact', sans-serif !important;
        font-weight: 700 !important;
      }
      #sabotage-game .role-banner.role-impostor {
        color: #ff4444 !important;
        border-color: transparent !important;
        border-bottom-color: #8a2020 !important;
        text-shadow: 0 0 16px rgba(255,68,68,0.5) !important;
        background: linear-gradient(90deg, transparent, rgba(30,5,5,0.9), transparent) !important;
        animation: impostor-blink 1.5s ease-in-out infinite !important;
      }
      @keyframes impostor-blink {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.75; }
      }
      #sabotage-game .kill-button.ready {
        background: rgba(20,5,5,0.95) !important;
        border-color: #cc3030 !important;
        color: #ff5050 !important;
        animation: kill-pulse 0.6s ease-in-out infinite !important;
        box-shadow: 0 0 20px rgba(200,50,50,0.4) !important;
      }
      #sabotage-game .kill-button.cooldown {
        background: rgba(15,10,10,0.9) !important;
        border-color: #3a2020 !important;
        color: #5a3a3a !important;
        animation: none !important;
        box-shadow: none !important;
      }
      @keyframes kill-pulse {
        0%, 100% { box-shadow: 0 0 12px rgba(200,50,50,0.3); }
        50% { box-shadow: 0 0 24px rgba(200,50,50,0.6); }
      }
      #sabotage-game .interaction-prompt.visible { opacity: 1 !important; }
      #sabotage-game .hit-marker.active { animation: hit-anim 0.25s forwards !important; }
      #sabotage-game .notification.visible { opacity: 1 !important; }
      #sabotage-game .notification.alert {
        border-left-color: #cc3030 !important;
        border-color: rgba(180,50,50,0.4) !important;
        color: #ff8080 !important;
        text-shadow: none !important;
        box-shadow: 0 4px 20px rgba(0,0,0,0.7) !important;
      }
      @keyframes flicker {
        0%, 95%, 100% { opacity: 1; } 96% { opacity: 0.85; } 98% { opacity: 0.7; }
      }
      @keyframes hit-anim {
        0% { opacity: 1; transform: translate(-50%,-50%) scale(1); }
        100% { opacity: 0; transform: translate(-50%,-50%) scale(1.6); }
      }
      /* Vignette overlay on game canvas */
      #sabotage-game-vignette {
        position: absolute; top: 0; left: 0; width: 100%; height: 100%;
        background: radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.65) 100%);
        pointer-events: none; z-index: 5;
      }
      /* Scanline effect */
      #sabotage-game-scanlines {
        position: absolute; top: 0; left: 0; width: 100%; height: 100%;
        background: repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.04) 2px, rgba(0,0,0,0.04) 4px);
        pointer-events: none; z-index: 6;
      }
      /* Compass bar */
      #sabotage-compass {
        position: absolute; top: 0; left: 50%; transform: translateX(-50%);
        width: 280px; height: 28px;
        background: rgba(6,10,5,0.85);
        border: 1px solid rgba(80,100,60,0.4);
        border-top: none;
        border-radius: 0 0 4px 4px;
        display: flex; align-items: center; justify-content: center;
        font-family: 'Rajdhani', sans-serif;
        font-size: 13px; font-weight: 700;
        color: #90aa70; letter-spacing: 4px;
        z-index: 15;
      }
      /* Kill feed */
      #sabotage-killfeed {
        position: absolute; top: 50px; right: 16px;
        display: flex; flex-direction: column; align-items: flex-end; gap: 4px;
        z-index: 15; pointer-events: none;
        font-family: 'Rajdhani', sans-serif;
      }
      #sabotage-killfeed .kf-entry {
        background: rgba(6,10,5,0.82);
        border-right: 3px solid #8a2020;
        padding: 4px 10px;
        font-size: 13px; font-weight: 600;
        color: #aaa; letter-spacing: 1px;
        animation: kf-fade 4s forwards;
      }
      #sabotage-killfeed .kf-entry .kf-killer { color: #c8c8c8; }
      #sabotage-killfeed .kf-entry .kf-victim { color: #cc5050; }
      @keyframes kf-fade {
        0%, 70% { opacity: 1; }
        100% { opacity: 0; }
      }
      /* Health bar COD style */
      #sabotage-health {
        position: absolute; bottom: 30px; left: 20px;
        display: flex; flex-direction: column; gap: 4px;
        z-index: 15;
      }
      #sabotage-health-label {
        font-family: 'Rajdhani', sans-serif;
        font-size: 11px; font-weight: 700;
        color: #7a9060; letter-spacing: 3px; text-transform: uppercase;
      }
      #sabotage-health-bar {
        width: 180px; height: 10px;
        background: rgba(20,30,15,0.8);
        border: 1px solid rgba(80,100,60,0.3);
        display: flex; gap: 2px; padding: 2px;
      }
      #sabotage-health-bar .seg {
        flex: 1; height: 100%;
        background: #4a9a4a;
        transition: background 0.3s;
      }
      #sabotage-health-bar .seg.dead { background: rgba(80,80,80,0.3); }
      /* Ammo counter */
      #sabotage-ammo {
        position: absolute; bottom: 30px; right: 20px;
        font-family: 'Oswald', 'Rajdhani', monospace;
        z-index: 15; text-align: right;
        pointer-events: none;
      }
      #sabotage-ammo-main {
        font-size: 42px; font-weight: 700;
        color: #e8e8e8; line-height: 1;
        text-shadow: 0 1px 0 rgba(0,0,0,0.8);
        letter-spacing: -1px;
      }
      #sabotage-ammo-reserve {
        font-size: 18px; color: #8a9880;
        line-height: 1; letter-spacing: 1px;
      }
      /* Death/elimination overlay */
      #sabotage-death-overlay {
        position: absolute; top: 0; left: 0; width: 100%; height: 100%;
        background: radial-gradient(ellipse at center, rgba(80,0,0,0.3) 0%, rgba(180,0,0,0.55) 100%);
        display: none; align-items: center; justify-content: center;
        z-index: 200; pointer-events: none;
        flex-direction: column;
      }
      #sabotage-death-overlay.active { display: flex; }
      #sabotage-death-overlay h2 {
        font-family: 'Oswald', sans-serif;
        font-size: clamp(32px, 8vw, 64px);
        font-weight: 700;
        color: #fff;
        letter-spacing: 8px;
        text-transform: uppercase;
        text-shadow: 0 0 40px rgba(255,50,50,0.8);
      }
      #sabotage-death-overlay p {
        font-family: 'Rajdhani', sans-serif;
        font-size: 16px; color: rgba(255,180,180,0.8);
        letter-spacing: 4px; margin-top: 8px;
      }
      @media (max-width: 768px) {
        #sabotage-game .desktop-hint { display: none !important; }
        #sabotage-game .mobile-hint { display: inline !important; }
      }
    `}</style>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────
function VoteRow({
  name: _name,
  label,
  color,
  isVoted,
  onVote,
  isSkip = false,
}: {
  name: string;
  label: string;
  color: string;
  isVoted: boolean;
  isYou: boolean;
  onVote: () => void;
  isSkip?: boolean;
}) {
  return (
    <button
      type="button"
      data-ocid="game.vote_button"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "14px 20px",
        background: isVoted ? "rgba(15,30,10,0.85)" : "rgba(8,12,6,0.85)",
        border: `1px solid ${isVoted ? "#5a8a4a" : isSkip ? "#3a3a3a" : "rgba(80,100,60,0.4)"}`,
        borderLeft: `3px solid ${isVoted ? "#5a8a4a" : isSkip ? "#3a3a3a" : color}`,
        cursor: isVoted ? "default" : "pointer",
        transition: "all 0.2s",
        boxShadow: isVoted ? "0 0 20px rgba(0,255,0,0.4)" : "none",
      }}
      onClick={isVoted ? undefined : onVote}
    >
      <div
        style={{
          width: 16,
          height: 16,
          borderRadius: "50%",
          background: isSkip ? "#333" : color,
          flexShrink: 0,
          boxShadow: `0 0 8px ${color}`,
        }}
      />
      <div
        style={{
          flex: 1,
          color: isVoted ? "#7acc7a" : "#b0b8a0",
          fontSize: "clamp(13px, 2.5vw, 17px)",
          fontWeight: 700,
          letterSpacing: 2,
          textTransform: "uppercase",
          fontFamily: "'Rajdhani', sans-serif",
        }}
      >
        {label}
      </div>
      {!isVoted && (
        <div
          style={{
            padding: "5px 14px",
            border: "1px solid #5a7a3a",
            color: "#8aaa6a",
            fontSize: 12,
            letterSpacing: 2,
            fontWeight: 700,
            background: "rgba(15,25,10,0.6)",
            fontFamily: "'Rajdhani', sans-serif",
          }}
        >
          VOTE
        </div>
      )}
      {isVoted && (
        <div
          style={{
            color: "#7acc7a",
            fontSize: 13,
            letterSpacing: 2,
            fontWeight: 700,
            fontFamily: "'Rajdhani', sans-serif",
          }}
        >
          ✓ VOTED
        </div>
      )}
    </button>
  );
}

function SettingRow({
  label,
  value,
  onDec,
  onInc,
}: { label: string; value: string; onDec: () => void; onInc: () => void }) {
  const btnStyle: React.CSSProperties = {
    width: 36,
    height: 36,
    background: "rgba(255,255,255,0.04)",
    border: "1px solid #3a4a2a",
    color: "#8aaa6a",
    fontSize: 20,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "'Rajdhani', sans-serif",
    flexShrink: 0,
    borderRadius: 2,
  };
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 16,
        background: "rgba(255,255,255,0.04)",
        border: "1px solid #3a3a6e",
        padding: "14px 20px",
        borderRadius: 8,
      }}
    >
      <div
        style={{
          flex: 1,
          color: "#aab0d4",
          fontSize: 13,
          letterSpacing: 3,
          textTransform: "uppercase",
          fontWeight: "bold",
        }}
      >
        {label}
      </div>
      <button type="button" style={btnStyle} onClick={onDec}>
        −
      </button>
      <div
        style={{
          width: 70,
          textAlign: "center",
          color: "#fff",
          fontSize: 20,
          fontWeight: "bold",
          textShadow: "0 0 10px #8888cc",
          letterSpacing: 2,
        }}
      >
        {value}
      </div>
      <button type="button" style={btnStyle} onClick={onInc}>
        +
      </button>
    </div>
  );
}
