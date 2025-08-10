const express = require("express");
const bodyParser = require("body-parser");
const { createClient } = require("@supabase/supabase-js");

// Load environment variables
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
  console.error("❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE in environment variables.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);
const app = express();
app.use(bodyParser.json());

// Root route
app.get("/", (req, res) => {
  res.send("✅ License API (Supabase) is running!");
});

// === Verify license ===
app.post("/verify", async (req, res) => {
  const { license, hwid } = req.body;
  if (!license || !hwid) {
    return res.status(400).json({ message: "Missing license or hwid" });
  }

  const { data, error } = await supabase
    .from("licenses")
    .select("hwid")
    .eq("license_key", license)
    .single();

  if (error) {
    console.error(error);
    return res.status(500).json({ message: "DB error" });
  }

  if (!data) {
    return res.status(403).json({ message: "Invalid license key" });
  }

  if (data.hwid === hwid) {
    return res.json({ message: "License valid" });
  }

  return res.status(403).json({ message: "Invalid or mismatched HWID" });
});

// === Activate license ===
app.post("/activate", async (req, res) => {
  const { license, hwid } = req.body;
  if (!license || !hwid) {
    return res.status(400).json({ message: "Missing license or hwid" });
  }

  const { data, error } = await supabase
    .from("licenses")
    .select("hwid")
    .eq("license_key", license)
    .single();

  if (error) {
    console.error(error);
    return res.status(500).json({ message: "DB error" });
  }

  if (!data) {
    return res.status(404).json({ message: "License not found" });
  }

  if (!data.hwid) {
    const { error: updateError } = await supabase
      .from("licenses")
      .update({ hwid })
      .eq("license_key", license);
    if (updateError) {
      console.error(updateError);
      return res.status(500).json({ message: "DB update error" });
    }
    return res.json({ message: "Activated successfully" });
  }

  if (data.hwid === hwid) {
    return res.json({ message: "Already activated on this machine" });
  }

  return res.status(403).json({ message: "License already bound to another HWID" });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
