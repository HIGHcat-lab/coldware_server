const express = require("express");
const bodyParser = require("body-parser");

const app = express();
app.use(bodyParser.json());

// ====================
// Hardcoded License Keys
// ====================
// Add or remove keys here. HWID is null until a user activates the license.
let licenses = [
  { key: "71C6D6B9-A84D-4544-9714-FA7831CE6BAC", hwid: null },
  { key: "D8432EAD-6C27-4EAB-8F4B-AEDCBE5BD6F1", hwid: null },
  { key: "3F2BBEBB-FF5A-43AD-8E27-07B2D35D58AA", hwid: null },
  { key: "E7BD8221-1650-4B19-B5A8-2C1919949C47", hwid: null },
  { key: "A34E58F0-F7E2-4C6F-A571-6C1E63C1D4E9", hwid: null }
];

// ====================
// Routes
// ====================

// Root route
app.get("/", (req, res) => {
  res.send("✅ License API is running!");
});

// Activate license (binds license to a specific HWID)
app.post("/activate", (req, res) => {
  const { license, hwid } = req.body;
  if (!license || !hwid) return res.status(400).json({ message: "Missing license or hwid" });

  const lic = licenses.find(l => l.key === license);
  if (!lic) return res.status(404).json({ message: "License not found" });

  if (!lic.hwid) {
    lic.hwid = hwid;
    return res.json({ message: "Activated successfully" });
  } else if (lic.hwid === hwid) {
    return res.json({ message: "Already activated on this machine" });
  } else {
    return res.status(403).json({ message: "License already bound to another HWID" });
  }
});

// Verify license (checks if license matches HWID)
app.post("/verify", (req, res) => {
  const { license, hwid } = req.body;
  if (!license || !hwid) return res.status(400).json({ message: "Missing license or hwid" });

  const lic = licenses.find(l => l.key === license && l.hwid === hwid);
  if (lic) return res.json({ message: "Valid" });
  else return res.status(403).json({ message: "Invalid or mismatched HWID" });
});

// Admin route to see all keys
app.get("/keys", (req, res) => {
  res.json(licenses);
});

// ====================
// Start Server
// ====================
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`🚀 License server running on port ${port}`));
