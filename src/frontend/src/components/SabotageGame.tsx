import { useEffect, useRef, useState } from "react";

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

interface Settings {
  moveSpeed: number;
  killCooldown: number;
  numBots: number;
  numTasks: number;
}

// ── Map Data ─────────────────────────────────────────────────────────────────
const WALLS: Wall[] = [
  { x: -20, z: -20, w: 40, h: 2, d: 2 },
  { x: -20, z: 18, w: 40, h: 2, d: 2 },
  { x: -20, z: -20, w: 2, h: 2, d: 40 },
  { x: 18, z: -20, w: 2, h: 2, d: 40 },
  { x: -10, z: -10, w: 8, h: 2, d: 8 },
  { x: 5, z: -10, w: 8, h: 2, d: 8 },
  { x: -10, z: 5, w: 8, h: 2, d: 8 },
  { x: 5, z: 5, w: 8, h: 2, d: 8 },
  { x: -2, z: -20, w: 4, h: 2, d: 40 },
  { x: -20, z: -2, w: 40, h: 2, d: 4 },
];

const ALL_TASKS: Omit<Task, "completed">[] = [
  { x: -6, z: -6, name: "STABILIZE REACTOR" },
  { x: 9, z: -6, name: "SCAN SAMPLE" },
  { x: -6, z: 9, name: "DOWNLOAD DATA" },
  { x: 9, z: 9, name: "CLEAN FILTER" },
  { x: 0, z: 0, name: "FIX WIRING" },
  { x: 15, z: 0, name: "ALIGN TELESCOPE" },
  { x: -15, z: 0, name: "UPLOAD LOGS" },
  { x: 0, z: 15, name: "PATCH HULL" },
  { x: 0, z: -15, name: "REROUTE POWER" },
  { x: 12, z: -12, name: "CALIBRATE ENGINES" },
];

const ALL_BOTS: Omit<Bot, "speed" | "targetTaskIndex" | "pauseFrames">[] = [
  {
    x: -15,
    z: -15,
    color: "#f472b6",
    alive: true,
    vx: 0,
    vz: 0,
    name: "BOT_PINK",
  },
  {
    x: 15,
    z: 15,
    color: "#60a5fa",
    alive: true,
    vx: 0,
    vz: 0,
    name: "BOT_BLUE",
  },
  {
    x: -15,
    z: 15,
    color: "#fbbf24",
    alive: true,
    vx: 0,
    vz: 0,
    name: "BOT_YELLOW",
  },
  {
    x: 12,
    z: -5,
    color: "#a78bfa",
    alive: true,
    vx: 0,
    vz: 0,
    name: "BOT_PURPLE",
  },
  {
    x: -5,
    z: 12,
    color: "#34d399",
    alive: true,
    vx: 0,
    vz: 0,
    name: "BOT_GREEN",
  },
  {
    x: 5,
    z: -18,
    color: "#fb923c",
    alive: true,
    vx: 0,
    vz: 0,
    name: "BOT_ORANGE",
  },
];

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
  if (x > -10 && x < -2 && z > -10 && z < -2) return "REACTOR";
  if (x > 5 && x < 13 && z > -10 && z < -2) return "MEDBAY";
  if (x > -10 && x < -2 && z > 5 && z < 13) return "SECURITY";
  if (x > 5 && x < 13 && z > 5 && z < 13) return "CAFETERIA";
  if (x < -10 && z > -3 && z < 3) return "ENGINEERING";
  if (x > 10 && z > -3 && z < 3) return "BRIDGE";
  if (z > 10) return "STORAGE";
  return "MAIN DECK";
}

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
  const isMobileRef = useRef(
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent,
    ),
  );
  const rafRef = useRef<number>(0);
  const notifTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const meetingActiveRef = useRef(false);

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
        g.killCooldown = settingsRef.current.killCooldown;
        showNotification("ELIMINATED", "alert");
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

  function checkBodyNearby(): boolean {
    const player = playerRef.current;
    for (const body of deadBodiesRef.current) {
      const dist = Math.hypot(body.x - player.x, body.z - player.z);
      if (dist < 3) return true;
    }
    return false;
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
        showNotification(
          g.isImpostor ? "EXPOSED! GAME OVER" : "YOU WERE VOTED OUT!",
          "alert",
        );
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
    function castRay(angle: number): number {
      let dist = 0;
      const step = 0.05;
      const maxDist = 30;
      while (dist < maxDist) {
        const x = playerRef.current.x + Math.sin(angle) * dist;
        const z = playerRef.current.z - Math.cos(angle) * dist;
        if (checkCollision(x, z, WALLS)) return dist;
        dist += step;
      }
      return maxDist;
    }

    function render() {
      const w = canvas!.width;
      const h = canvas!.height;
      const player = playerRef.current;

      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, "#0a0a15");
      grad.addColorStop(0.5, "#1a1a2e");
      grad.addColorStop(1, "#0a0a15");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      if (!gameRef.current.isPlaying) return;

      const numRays = Math.min(w / 2, 400);
      const fov = (60 * Math.PI) / 180;

      for (let i = 0; i < numRays; i++) {
        const rayAngle = player.yaw - fov / 2 + (i / numRays) * fov;
        const dist = castRay(rayAngle);
        const wallHeight = (h / dist) * 0.6;
        const x = (i / numRays) * w;
        const y = (h - wallHeight) / 2;
        const brightness = Math.max(0.15, 1 - dist / 25);
        const green = Math.floor(50 * brightness);
        const stripW = w / numRays + 1;

        const wallGrad = ctx.createLinearGradient(x, y, x, y + wallHeight);
        wallGrad.addColorStop(0, `rgb(0,${green + 20},${green})`);
        wallGrad.addColorStop(0.5, `rgb(0,${green + 40},${green + 20})`);
        wallGrad.addColorStop(1, `rgb(0,${green + 20},${green})`);
        ctx.fillStyle = wallGrad;
        ctx.fillRect(x, y, stripW, wallHeight);

        ctx.fillStyle = `rgb(5,${Math.floor(10 * brightness)},5)`;
        ctx.fillRect(x, y + wallHeight, stripW, h - y - wallHeight);

        ctx.fillStyle = `rgb(5,5,${Math.floor(10 * brightness)})`;
        ctx.fillRect(x, 0, stripW, y);
      }

      drawObjects();
    }

    function drawObjects() {
      const w = canvas!.width;
      const h = canvas!.height;
      const player = playerRef.current;
      const fovTan = Math.tan((30 * Math.PI) / 180);

      for (const task of tasksRef.current) {
        if (task.completed) continue;
        const dx = task.x - player.x;
        const dz = task.z - player.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist >= 15) continue;
        const angle = Math.atan2(dx, -dz) - player.yaw;
        const screenX = w / 2 + (Math.tan(angle) * (w / 2)) / fovTan;
        const size = Math.max(5, 100 / dist);
        if (screenX < -100 || screenX > w + 100) continue;

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

      for (const bot of botsRef.current) {
        if (!bot.alive) continue;
        const dx = bot.x - player.x;
        const dz = bot.z - player.z;
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

    function drawMinimap() {
      const mw = minimap!.width;
      const mh = minimap!.height;
      const player = playerRef.current;
      const g = gameRef.current;
      const scale = isMobile ? 3 : 4;
      const cx = mw / 2;
      const cz = mh / 2;

      minimapCtx.fillStyle = "rgba(0,20,0,0.9)";
      minimapCtx.fillRect(0, 0, mw, mh);

      minimapCtx.fillStyle = "rgba(0,255,0,0.3)";
      for (const w of WALLS) {
        minimapCtx.fillRect(
          cx + w.x * scale,
          cz + w.z * scale,
          w.w * scale,
          w.d * scale,
        );
      }

      // Room labels
      const roomLabels = [
        { name: "REACTOR", x: -7, z: -7 },
        { name: "MEDBAY", x: 8, z: -7 },
        { name: "SECURITY", x: -8, z: 8 },
        { name: "CAFETERIA", x: 6, z: 8 },
      ];
      minimapCtx.fillStyle = "rgba(0,200,0,0.7)";
      minimapCtx.font = `${isMobile ? 5 : 6}px Arial`;
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
        minimapCtx.fillStyle = t.completed ? "#0a0" : "#0f0";
        minimapCtx.beginPath();
        minimapCtx.arc(cx + t.x * scale, cz + t.z * scale, 3, 0, Math.PI * 2);
        minimapCtx.fill();
      }

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

      // Bots
      for (const b of botsRef.current) {
        if (!b.alive) continue;
        minimapCtx.fillStyle = b.color;
        minimapCtx.beginPath();
        minimapCtx.arc(cx + b.x * scale, cz + b.z * scale, 4, 0, Math.PI * 2);
        minimapCtx.fill();
      }

      // Player
      minimapCtx.fillStyle = g.isImpostor ? "#f00" : "#0f0";
      minimapCtx.beginPath();
      minimapCtx.arc(
        cx + player.x * scale,
        cz + player.z * scale,
        5,
        0,
        Math.PI * 2,
      );
      minimapCtx.fill();

      minimapCtx.strokeStyle = g.isImpostor ? "#f00" : "#0f0";
      minimapCtx.lineWidth = 2;
      minimapCtx.beginPath();
      minimapCtx.moveTo(cx + player.x * scale, cz + player.z * scale);
      minimapCtx.lineTo(
        cx + player.x * scale + Math.sin(player.yaw) * 12,
        cz + player.z * scale - Math.cos(player.yaw) * 12,
      );
      minimapCtx.stroke();
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

      if (!checkCollision(player.x + dx, player.z, WALLS)) player.x += dx;
      if (!checkCollision(player.x, player.z + dz, WALLS)) player.z += dz;

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
            if (!checkCollision(bot.x + fleeDx, bot.z, WALLS)) bot.x += fleeDx;
            if (!checkCollision(bot.x, bot.z + fleeDz, WALLS)) bot.z += fleeDz;
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

            if (!checkCollision(bot.x + moveDx, bot.z, WALLS)) {
              bot.x += moveDx;
            } else {
              // Try perpendicular
              const perpDx = Math.sin(angle + Math.PI / 2) * bot.speed;
              if (!checkCollision(bot.x + perpDx, bot.z, WALLS))
                bot.x += perpDx;
            }

            if (!checkCollision(bot.x, bot.z + moveDz, WALLS)) {
              bot.z += moveDz;
            } else {
              const perpDz = Math.cos(angle + Math.PI / 2) * bot.speed;
              if (!checkCollision(bot.x, bot.z + perpDz, WALLS))
                bot.z += perpDz;
            }
          }
        } else {
          // No tasks left, wander
          if (Math.random() < 0.02) {
            bot.vx = (Math.random() - 0.5) * bot.speed;
            bot.vz = (Math.random() - 0.5) * bot.speed;
          }
          if (!checkCollision(bot.x + bot.vx, bot.z, WALLS)) bot.x += bot.vx;
          if (!checkCollision(bot.x, bot.z + bot.vz, WALLS)) bot.z += bot.vz;
        }
      }

      // Kill cooldown
      if (g.killCooldown > 0) {
        g.killCooldown -= 0.016;
        updateKillUI();
      }

      // Update report button visibility
      const nearby = checkBodyNearby();
      if (reportBtnRef.current) {
        reportBtnRef.current.style.opacity = nearby ? "1" : "0.3";
        reportBtnRef.current.style.transform = nearby
          ? "scale(1.05)"
          : "scale(1)";
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
      rafRef.current = requestAnimationFrame(gameLoop);
    }

    rafRef.current = requestAnimationFrame(gameLoop);

    // ── Start Game ────────────────────────────────────────────────────────────
    function startGame() {
      const s = settingsRef.current;

      // Initialize tasks and bots based on settings
      tasksRef.current = ALL_TASKS.slice(0, s.numTasks).map((t) => ({
        ...t,
        completed: false,
      }));
      botsRef.current = ALL_BOTS.slice(0, s.numBots).map((b) => ({
        ...b,
        speed: 0.03 + Math.random() * 0.03,
        targetTaskIndex: Math.floor(Math.random() * s.numTasks),
        pauseFrames: 0,
      }));
      deadBodiesRef.current = [];

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
          banner.textContent = "IMPOSTOR";
          banner.classList.add("role-impostor");
          if (statusTextRef.current)
            statusTextRef.current.textContent = "ELIMINATE ALL";
          showNotification("YOU ARE THE IMPOSTOR", "alert");
        } else {
          banner.textContent = "CREWMATE";
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
    }
    function onKeyUp(e: KeyboardEvent) {
      keysRef.current[e.key.toLowerCase()] = false;
      if (e.key === "Shift") playerRef.current.isSprinting = false;
    }
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("keyup", onKeyUp);

    // ── Mouse ────────────────────────────────────────────────────────────────
    function onMouseMove(e: MouseEvent) {
      if (document.pointerLockElement === canvas && !isMobile) {
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
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("click", onClick);

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
        const centerX = rect.left + 60;
        const centerY = rect.top + 60;
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
        {/* Crosshair */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%,-50%)",
            width: 40,
            height: 40,
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              position: "absolute",
              width: 2,
              height: 20,
              background: "rgba(0,255,100,0.9)",
              boxShadow: "0 0 10px rgba(0,255,100,0.8)",
              left: "50%",
              top: "50%",
              transform: "translate(-50%,-50%)",
            }}
          />
          <div
            style={{
              position: "absolute",
              width: 20,
              height: 2,
              background: "rgba(0,255,100,0.9)",
              boxShadow: "0 0 10px rgba(0,255,100,0.8)",
              left: "50%",
              top: "50%",
              transform: "translate(-50%,-50%)",
            }}
          />
          <div
            style={{
              position: "absolute",
              width: 4,
              height: 4,
              background: "rgba(0,255,100,1)",
              borderRadius: "50%",
              top: "50%",
              left: "50%",
              transform: "translate(-50%,-50%)",
              boxShadow: "0 0 8px rgba(0,255,100,1)",
            }}
          />
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
            padding: "8px 40px",
            fontSize: 24,
            fontWeight: "bold",
            letterSpacing: 4,
            textTransform: "uppercase",
            color: "#0f0",
            background:
              "linear-gradient(90deg, transparent, rgba(0,50,0,0.8), transparent)",
            border: "2px solid #0f0",
            textShadow: "0 0 20px #0f0",
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
              color: "#0f0",
              fontSize: 12,
              textTransform: "uppercase",
              letterSpacing: 2,
              marginBottom: 5,
              textAlign: "center",
              textShadow: "0 0 10px #0f0",
            }}
          >
            TASK PROGRESS
          </div>
          <div
            style={{
              width: "100%",
              height: 8,
              background: "rgba(0,50,0,0.5)",
              border: "1px solid #0f0",
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
            background: "rgba(0,20,0,0.9)",
            border: "2px solid #0f0",
            overflow: "hidden",
            boxShadow: "0 0 30px rgba(0,255,0,0.3)",
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
              boxShadow: "inset 0 0 40px rgba(0,255,0,0.2)",
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
            background:
              "radial-gradient(circle, rgba(255,0,0,0.3), rgba(100,0,0,0.8))",
            border: "3px solid #f00",
            color: "#f00",
            fontSize: 18,
            fontWeight: "bold",
            textTransform: "uppercase",
            display: "none",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 0 30px rgba(255,0,0,0.5)",
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
            background:
              "radial-gradient(circle, rgba(255,165,0,0.3), rgba(100,60,0,0.8))",
            border: "3px solid #fa0",
            color: "#fa0",
            fontSize: 13,
            fontWeight: "bold",
            textTransform: "uppercase",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 0 20px rgba(255,165,0,0.4)",
            pointerEvents: "auto",
            cursor: "pointer",
            opacity: 0.3,
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
            background: "rgba(20,10,0,0.9)",
            border: "2px solid #fa0",
            color: "#fa0",
            fontSize: 16,
            fontWeight: "bold",
            textTransform: "uppercase",
            letterSpacing: 3,
            cursor: "pointer",
            pointerEvents: "auto",
            boxShadow: "0 0 20px rgba(255,165,0,0.4)",
            display: "flex",
            alignItems: "center",
            gap: 8,
            zIndex: 20,
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
            background: "rgba(0,50,0,0.9)",
            border: "2px solid #0f0",
            color: "#0f0",
            fontSize: 18,
            fontWeight: "bold",
            textTransform: "uppercase",
            letterSpacing: 2,
            opacity: 0,
            transition: "opacity 0.3s",
            textShadow: "0 0 10px #0f0",
            boxShadow: "0 0 30px rgba(0,255,0,0.3)",
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
                background: "#f00",
                boxShadow: "0 0 10px #f00",
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
            border: "3px solid #0f0",
            color: "#0f0",
            fontSize: 24,
            fontWeight: "bold",
            textTransform: "uppercase",
            letterSpacing: 3,
            textAlign: "center",
            opacity: 0,
            transition: "opacity 0.5s",
            pointerEvents: "none",
            zIndex: 100,
            textShadow: "0 0 20px #0f0",
            boxShadow: "0 0 40px rgba(0,255,0,0.3)",
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
                border: "none",
                background: "radial-gradient(circle at 35% 35%, #4af, #06f)",
                color: "#fff",
                fontSize: 28,
                pointerEvents: "auto",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow:
                  "0 4px 12px rgba(0,100,255,0.6), inset 0 -3px 6px rgba(0,0,0,0.3)",
                cursor: "pointer",
              }}
              title="Sprint"
            >
              🏃
            </button>

            {/* Meeting - Yellow (top-right) */}
            <button
              type="button"
              data-ocid="game.mobile_meeting_button"
              onClick={triggerMeeting}
              style={{
                width: 70,
                height: 70,
                borderRadius: "50%",
                border: "none",
                background:
                  "radial-gradient(circle at 35% 35%, #ffe066, #e6a800)",
                color: "#fff",
                fontSize: 28,
                pointerEvents: "auto",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow:
                  "0 4px 12px rgba(230,168,0,0.6), inset 0 -3px 6px rgba(0,0,0,0.3)",
                cursor: "pointer",
              }}
              title="Emergency Meeting"
            >
              🚨
            </button>

            {/* Report - Orange (bottom-left) */}
            <button
              type="button"
              data-ocid="game.mobile_report_button"
              onClick={reportBody}
              style={{
                width: 70,
                height: 70,
                borderRadius: "50%",
                border: "none",
                background:
                  "radial-gradient(circle at 35% 35%, #ffa040, #e65000)",
                color: "#fff",
                fontSize: 28,
                pointerEvents: "auto",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow:
                  "0 4px 12px rgba(230,80,0,0.6), inset 0 -3px 6px rgba(0,0,0,0.3)",
                cursor: "pointer",
              }}
              title="Report Body"
            >
              📢
            </button>

            {/* Interact/Use - Green (bottom-right), Kill replaces when impostor */}
            <button
              type="button"
              id="sabotage-btn-interact"
              data-ocid="game.interact_button"
              style={{
                width: 70,
                height: 70,
                borderRadius: "50%",
                border: "none",
                background: "radial-gradient(circle at 35% 35%, #6f6, #090)",
                color: "#fff",
                fontSize: 28,
                pointerEvents: "auto",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow:
                  "0 4px 12px rgba(0,200,0,0.6), inset 0 -3px 6px rgba(0,0,0,0.3)",
                cursor: "pointer",
              }}
              title="Use / Interact"
            >
              ✅
            </button>

            {/* Kill - Red (overlays interact slot for impostors) */}
            <button
              type="button"
              ref={mobileKillBtnRef}
              data-ocid="game.mobile_kill_button"
              style={{
                width: 70,
                height: 70,
                borderRadius: "50%",
                border: "none",
                background: "radial-gradient(circle at 35% 35%, #f66, #c00)",
                color: "#fff",
                fontSize: 28,
                pointerEvents: "auto",
                display: "none",
                alignItems: "center",
                justifyContent: "center",
                boxShadow:
                  "0 4px 12px rgba(200,0,0,0.6), inset 0 -3px 6px rgba(0,0,0,0.3)",
                cursor: "pointer",
                gridColumn: "2",
                gridRow: "2",
              }}
              title="Kill"
            >
              ☠️
            </button>
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
            "linear-gradient(135deg, #000 0%, #0a1a0a 50%, #000 100%)",
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
            color: "#0f0",
            textShadow: "0 0 50px #0f0",
            letterSpacing: 15,
            marginBottom: 10,
            animation: "flicker 3s infinite",
          }}
        >
          SABOTAGE
        </h1>
        <div
          style={{
            color: "#0a0",
            fontSize: 20,
            letterSpacing: 8,
            marginBottom: 50,
          }}
        >
          TACTICAL SOCIAL DEDUCTION
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
              padding: "25px 40px",
              fontSize: 22,
              background: "transparent",
              color: "#0a0",
              border: "2px solid #050",
              cursor: "pointer",
              textTransform: "uppercase",
              letterSpacing: 3,
              fontWeight: "bold",
              boxShadow: "0 0 15px rgba(0,100,0,0.2)",
              transition: "all 0.3s",
              fontFamily: "'Impact', 'Arial Black', sans-serif",
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLButtonElement).style.borderColor = "#0f0";
              (e.target as HTMLButtonElement).style.color = "#0f0";
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLButtonElement).style.borderColor = "#050";
              (e.target as HTMLButtonElement).style.color = "#0a0";
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
            "linear-gradient(135deg, #000 0%, #0a1a0a 50%, #000 100%)",
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
            color: "#0f0",
            letterSpacing: 8,
            textShadow: "0 0 30px #0f0",
            marginBottom: 8,
          }}
        >
          SETTINGS
        </h2>
        <div
          style={{
            color: "#0a0",
            fontSize: 14,
            letterSpacing: 4,
            marginBottom: 40,
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

        <button
          type="button"
          data-ocid="game.settings_back_button"
          onClick={() => setCurrentScreen("start")}
          style={{
            padding: "15px 60px",
            fontSize: 20,
            background: "transparent",
            color: "#0a0",
            border: "2px solid #050",
            cursor: "pointer",
            textTransform: "uppercase",
            letterSpacing: 5,
            fontWeight: "bold",
            transition: "all 0.3s",
            fontFamily: "'Impact', 'Arial Black', sans-serif",
          }}
          onMouseEnter={(e) => {
            (e.target as HTMLButtonElement).style.borderColor = "#0f0";
            (e.target as HTMLButtonElement).style.color = "#0f0";
          }}
          onMouseLeave={(e) => {
            (e.target as HTMLButtonElement).style.borderColor = "#050";
            (e.target as HTMLButtonElement).style.color = "#0a0";
          }}
        >
          ← BACK
        </button>
      </div>

      {/* Global styles */}
      <style>{`
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
        background: isVoted ? "rgba(0,80,0,0.6)" : "rgba(0,20,0,0.7)",
        border: `2px solid ${isVoted ? "#0f0" : isSkip ? "#444" : color}`,
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
          color: isVoted ? "#0f0" : "#ccc",
          fontSize: "clamp(13px, 2.5vw, 17px)",
          fontWeight: "bold",
          letterSpacing: 2,
          textTransform: "uppercase",
        }}
      >
        {label}
      </div>
      {!isVoted && (
        <div
          style={{
            padding: "6px 18px",
            border: "1px solid #0a0",
            color: "#0f0",
            fontSize: 13,
            letterSpacing: 2,
            fontWeight: "bold",
            background: "rgba(0,40,0,0.5)",
          }}
        >
          VOTE
        </div>
      )}
      {isVoted && (
        <div
          style={{
            color: "#0f0",
            fontSize: 13,
            letterSpacing: 2,
            fontWeight: "bold",
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
    width: 40,
    height: 40,
    background: "rgba(0,40,0,0.6)",
    border: "2px solid #0a0",
    color: "#0f0",
    fontSize: 22,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "'Impact', 'Arial Black', sans-serif",
    flexShrink: 0,
  };
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 16,
        background: "rgba(0,20,0,0.7)",
        border: "1px solid #0a0",
        padding: "14px 20px",
      }}
    >
      <div
        style={{
          flex: 1,
          color: "#0a0",
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
          color: "#0f0",
          fontSize: 20,
          fontWeight: "bold",
          textShadow: "0 0 10px #0f0",
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
