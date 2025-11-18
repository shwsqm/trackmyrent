import express from "express";
import sqlite3 from "sqlite3";
import { open } from "sqlite";
import cors from "cors";
const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static("public"));
async function init() {
  const db = await open({
    filename: "./database.db",
    driver: sqlite3.Database
  });
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE,
      password TEXT,
      name TEXT,
      role TEXT
    );
    CREATE TABLE IF NOT EXISTS debts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      debt_id TEXT,
      date TEXT,
      amount REAL,
      expire TEXT,
      status TEXT,
      method TEXT,
      owner TEXT
    );
  `);
  app.post("/register", async (req, res) => {
    const { username, password, name } = req.body;
    if (!username || !password || !name)
      return res.status(400).json({ error: "Missing fields" });
    try {
      await db.run(
        "INSERT INTO users (username, password, name, role) VALUES (?, ?, ?, ?)",
        [username, password, name, "renter"]
      );
      res.json({ success: true });
    } catch {
      res.status(400).json({ error: "User exists" });
    }
  });
  app.post("/login", async (req, res) => {
    const { username, password } = req.body;
    const user = await db.get(
      "SELECT * FROM users WHERE username = ? AND password = ?",
      [username, password]
    );
    if (!user) return res.status(401).json({ error: "Invalid credentials" });
    res.json(user);
  });
  app.get("/debts", async (req, res) => {
    const { username, role } = req.query;
    const rows =
      role === "admin"
        ? await db.all("SELECT * FROM debts")
        : await db.all("SELECT * FROM debts WHERE owner = ?", [username]);
    res.json(rows);
  });
  app.post("/debts", async (req, res) => {
    const { name, debt_id, date, amount, expire, owner } = req.body;
    await db.run(
      "INSERT INTO debts (name, debt_id, date, amount, expire, status, owner) VALUES (?, ?, ?, ?, ?, 'due', ?)",
      [name, debt_id, date, amount, expire, owner]
    );
    res.json({ success: true });
  });
  app.put("/debts/:id/pay", async (req, res) => {
    const { id } = req.params;
    const { method } = req.body;
    await db.run("UPDATE debts SET status='paid', method=? WHERE id=?", [
      method,
      id
    ]);
    res.json({ success: true });
  });
  app.delete("/debts/:id", async (req, res) => {
    const { id } = req.params;
    await db.run("DELETE FROM debts WHERE id=?", [id]);
    res.json({ success: true });
  });
  app.listen(3000, () =>
    console.log("✅ Server running at http://localhost:3000")
  );
}
init();