const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const bodyParser = require("body-parser");
const { v4: uuidv4 } = require("uuid");
const fs = require("fs");

const app = express();
const dbFile = "./.data/licenses.db";
const exists = fs.existsSync(dbFile);
const db = new sqlite3.Database(dbFile);

app.use(bodyParser.json());

// === Generate 100 keys on first run ===
if (!exists) {
  db.serialize(() => {
    db.run("CREATE TABLE licenses (license_key TEXT PRIMARY KEY, hwid TEXT)");
    const stmt = db.prepare("INSERT INTO licenses VALUES (?, NULL)");
    for (let i = 0; i < 100; i++) {
      stmt.run(uuidv4().toUpperCase());
    }
    stmt.finalize();
    console.log("✅ 100 license keys generated");
  });
}

// === Root route
app.get("/", (req, res) => {
  res.send("License API is running!");
});

// === License verification route
app.post("/verify", (req, res) => {
  console.log("🔧 /verify called with:", req.body);

  const { license, hwid } = req.body || {};

  if (!license || !hwid) {
    return res.status(400).json({ status: "fail", message: "Missing fields" });
  }

  db.get("SELECT hwid FROM licenses WHERE license_key = ?", [license], (err, row) => {
    if (err) {
      return res.status(500).json({ status: "fail", message: "DB error" });
    }

    if (!row) {
      return res.status(403).json({ status: "fail", message: "Invalid license key" });
    }

    if (!row.hwid) {
      db.run("UPDATE licenses SET hwid = ? WHERE license_key = ?", [hwid, license], (err) => {
        if (err) {
          return res.status(500).json({ status: "fail", message: "Activation error" });
        }
        return res.json({ status: "success", message: "License activated" });
      });
    } else if (row.hwid === hwid) {
      return res.json({ status: "success", message: "License valid" });
    } else {
      return res.status(403).json({ status: "fail", message: "License used on another machine" });
    }
  });
});

// === Optional: List all licenses (for testing)
app.get("/keys", (req, res) => {
  db.all("SELECT * FROM licenses", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("🚀 App is listening on port " + listener.address().port);
});
