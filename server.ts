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
    karma INTEGER DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS polls (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    question TEXT,
    options TEXT,
    votes TEXT DEFAULT '{}',
    closed INTEGER DEFAULT 0,
    creator_id INTEGER
  );
`);

// Bot Logic Constants
const LEVELS = [
  { min: 0, name: "🔰 Newcomer" },
  { min: 10, name: "🌱 Initiate" },
  { min: 25, name: "📜 Learner" },
  { min: 50, name: "🔍 Seeker" },
  { min: 100, name: "🛡️ Guardian" }
];

// Helper to get level
const getLevel = (karma: number) => {
  return LEVELS.reverse().find(l => karma >= l.min) || LEVELS[0];
};

// API Routes for Bot Commands
app.post("/api/bot/command", (req, res) => {
  const { command, args, userId, username } = req.body;
  
  // Ensure user exists
  let user = db.prepare("SELECT * FROM users WHERE id = ?").get(userId) as any;
  if (!user) {
    db.prepare("INSERT INTO users (id, username) VALUES (?, ?)").run(userId, username);
    user = { id: userId, username, karma: 0, nickname: null };
  }

  let response = "";

  switch (command) {
    case "/nick":
      const nick = args.join(" ");
      if (!nick) {
        response = user.nickname ? `Your current nick is: ${user.nickname}` : "You don't have a nickname set.";
      } else {
        db.prepare("UPDATE users SET nickname = ? WHERE id = ?").run(nick, userId);
        response = `✅ Nickname set to: ${nick}`;
      }
      break;

    case "/level":
      const level = getLevel(user.karma);
      response = `📊 Level: ${level.name}\n✨ Karma: ${user.karma}`;
      break;

    case "/poll":
      const parts = args.join(" ").split("|").map((p: string) => p.trim());
      if (parts.length < 3) {
        response = "❌ Usage: /poll Question | Opt1 | Opt2";
      } else {
        const question = parts[0];
        const options = JSON.stringify(parts.slice(1));
        const result = db.prepare("INSERT INTO polls (question, options, creator_id) VALUES (?, ?, ?)").run(question, options, userId);
        response = `🗳️ Poll Created (ID: ${result.lastInsertRowid})\nQ: ${question}`;
      }
      break;

    case "/vote":
      const pollId = parseInt(args[0]);
      const optIdx = parseInt(args[1]) - 1;
      const poll = db.prepare("SELECT * FROM polls WHERE id = ?").get(pollId) as any;
      if (!poll) {
        response = "❌ Poll not found.";
      } else if (poll.closed) {
        response = "❌ Poll is closed.";
      } else {
        const votes = JSON.parse(poll.votes);
        votes[userId] = optIdx;
        db.prepare("UPDATE polls SET votes = ? WHERE id = ?").run(JSON.stringify(votes), pollId);
        response = "✅ Vote registered!";
      }
      break;

    case "/add_karma": // Hidden command for testing
      const amount = parseInt(args[0]) || 1;
      db.prepare("UPDATE users SET karma = karma + ? WHERE id = ?").run(amount, userId);
      response = `➕ Added ${amount} karma.`;
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
