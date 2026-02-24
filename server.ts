import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";

const app = express();
app.use(express.json());

// Initialize Database
const db = new Database("bot_test.db");
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY,
    username TEXT,
    nickname TEXT,
    karma INTEGER DEFAULT 0,
    rank INTEGER DEFAULT 0, -- 0: User, 1: Moderator, 2: Admin
    banned INTEGER DEFAULT 0,
    tripcode TEXT,
    joined INTEGER DEFAULT 1
  );
  CREATE TABLE IF NOT EXISTS polls (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    question TEXT,
    options TEXT,
    votes TEXT DEFAULT '{}',
    closed INTEGER DEFAULT 0,
    creator_id INTEGER
  );
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );
`);

// Bot Logic Constants
const LEVELS = [
  { min: -100, name: "💀 Outcast" },
  { min: 0, name: "🔰 Newcomer" },
  { min: 10, name: "🌱 Initiate" },
  { min: 25, name: "📜 Learner" },
  { min: 50, name: "🔍 Seeker" },
  { min: 100, name: "🛡️ Guardian" }
];

const RANK_WEIGHTS: Record<number, number> = {
  0: 1,  // User
  1: 5,  // Moderator
  2: 10  // Admin
};

// Helper to get level
const getLevel = (karma: number) => {
  const sortedLevels = [...LEVELS].sort((a, b) => b.min - a.min);
  return sortedLevels.find(l => karma >= l.min) || LEVELS[0];
};

// Simple Tripcode Generator
const generateTripcode = (userId: number) => {
  return "!" + Math.random().toString(36).substring(2, 8).toUpperCase();
};

// API Routes for Bot Commands
app.post("/api/bot/command", (req, res) => {
  const { command, args, userId, username } = req.body;
  
  // Ensure user exists
  let user = db.prepare("SELECT * FROM users WHERE id = ?").get(userId) as any;
  if (!user) {
    db.prepare("INSERT INTO users (id, username, rank) VALUES (?, ?, ?)").run(userId, username, 0);
    user = { id: userId, username, karma: 0, nickname: null, rank: 0, banned: 0, joined: 1 };
  }

  if (user.banned) {
    return res.json({ response: "❌ **Access Denied:** You are banned from this lounge." });
  }

  let response = "";

  // Handle Chat (Broadcasting simulation)
  if (!command.startsWith("/")) {
    if (!user.joined) return res.json({ response: "❌ Use /gmpc to join first." });
    if (!user.nickname) return res.json({ response: "❌ Set a /nick first." });
    
    const message = [command, ...args].join(" ");
    const trip = user.tripcode ? ` <code>[${user.tripcode}]</code>` : "";
    response = `<b>[${user.nickname}]</b>${trip}\n${message}`;
    return res.json({ response });
  }

  // Command Handler
  switch (command) {
    case "/gmpc":
      db.prepare("UPDATE users SET joined = 1 WHERE id = ?").run(userId);
      const motd = db.prepare("SELECT value FROM settings WHERE key = 'motd'").get() as any;
      response = `Welcome to GMPC Lounge! 🌂\n\n${motd ? `📢 **MOTD:** ${motd.value}\n\n` : ""}` +
                 `⚠️ **Notice:** Set a nickname with /nick to start chatting.`;
      break;

    case "/stop":
      db.prepare("UPDATE users SET joined = 0 WHERE id = ?").run(userId);
      response = "👋 You have left the lounge. You will no longer receive messages.";
      break;

    case "/help":
      response = `📖 **Command List:**\n` +
                 `🚀 /gmpc | /stop - Join/Leave\n` +
                 `👤 /nick [name] - Set display name\n` +
                 `🔑 /tripcode - Toggle digital signature\n` +
                 `📊 /info | /level - User stats\n` +
                 `🗳️ /poll | /vote | /endpoll - Polls\n` +
                 `🛡️ /users | /ban | /promote - Admin tools`;
      break;

    case "/info":
      const lvl = getLevel(user.karma);
      response = `👤 **User Info:**\n` +
                 `ID: #user_${userId}\n` +
                 `Rank: ${user.rank === 2 ? 'Admin' : user.rank === 1 ? 'Moderator' : 'User'}\n` +
                 `Level: ${lvl.name}\n` +
                 `Karma: ${user.karma}\n` +
                 `Tripcode: ${user.tripcode || 'None'}`;
      break;

    case "/nick":
      const nick = args.join(" ");
      if (!nick) response = user.nickname ? `Current nick: ${user.nickname}` : "No nick set.";
      else {
        db.prepare("UPDATE users SET nickname = ? WHERE id = ?").run(nick, userId);
        response = `✅ Nickname set to **${nick}**.`;
      }
      break;

    case "/tripcode":
      const newTrip = user.tripcode ? null : generateTripcode(userId);
      db.prepare("UPDATE users SET tripcode = ? WHERE id = ?").run(newTrip, userId);
      response = newTrip ? `✅ Tripcode enabled: ${newTrip}` : "❌ Tripcode disabled.";
      break;

    case "/poll":
      const pollParts = args.join(" ").split("|").map((p: string) => p.trim());
      if (pollParts.length < 3) response = "❌ Usage: /poll Q | O1 | O2";
      else {
        const result = db.prepare("INSERT INTO polls (question, options, creator_id) VALUES (?, ?, ?)").run(pollParts[0], JSON.stringify(pollParts.slice(1)), userId);
        response = `🗳️ Poll Created (ID: ${result.lastInsertRowid})`;
      }
      break;

    case "/vote":
      const pId = parseInt(args[0]);
      const oIdx = parseInt(args[1]) - 1;
      const p = db.prepare("SELECT * FROM polls WHERE id = ?").get(pId) as any;
      if (!p || p.closed) response = "❌ Poll not found or closed.";
      else {
        const v = JSON.parse(p.votes);
        v[userId] = oIdx;
        db.prepare("UPDATE polls SET votes = ? WHERE id = ?").run(JSON.stringify(v), pId);
        response = "✅ Vote recorded.";
      }
      break;

    case "/endpoll":
      const epId = parseInt(args[0]);
      db.prepare("UPDATE polls SET closed = 1 WHERE id = ?").run(epId);
      response = `🏁 Poll #${epId} closed. Results calculated.`;
      break;

    case "/level":
    case "/rank":
      const l = getLevel(user.karma);
      response = `📊 Level: ${l.name} (${user.karma} Karma)`;
      break;

    // Admin Commands
    case "/motd":
      if (user.rank < 1) response = "❌ Staff only.";
      else {
        db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('motd', ?)").run(args.join(" "));
        response = "✅ MOTD updated.";
      }
      break;

    case "/users":
      const count = db.prepare("SELECT COUNT(*) as c FROM users WHERE joined = 1").get() as any;
      response = `👥 Online Users: ${count.c}`;
      break;

    case "/ban":
      if (user.rank < 1) response = "❌ Staff only.";
      else {
        db.prepare("UPDATE users SET banned = 1 WHERE id = ?").run(args[0]);
        response = `🚫 User ${args[0]} banned.`;
      }
      break;

    case "/promote":
      if (user.rank < 2) response = "❌ Admin only.";
      else {
        db.prepare("UPDATE users SET rank = 1 WHERE id = ?").run(args[0]);
        response = `🎖️ User ${args[0]} promoted to Moderator.`;
      }
      break;

    case "/react": // Simulation
      const rType = args[0];
      const target = parseInt(args[1]) || userId;
      const w = RANK_WEIGHTS[user.rank] || 1;
      db.prepare("UPDATE users SET karma = karma + ? WHERE id = ?").run(rType === "up" ? w : -w, target);
      response = `🎭 Reaction ${rType === "up" ? '👍' : '👎'} recorded.`;
      break;

    case "/setrank": // Testing
      db.prepare("UPDATE users SET rank = ? WHERE id = ?").run(args[0], userId);
      response = `🛡️ Rank set to ${args[0]}.`;
      break;

    default:
      response = "❓ Unknown command.";
  }

  res.json({ response });
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }

  app.listen(3000, "0.0.0.0", () => {
    console.log("Server running on http://localhost:3000");
  });
}

startServer();
