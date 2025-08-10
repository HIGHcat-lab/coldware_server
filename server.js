const express = require("express");
const bodyParser = require("body-parser");
const { createClient } = require("@supabase/supabase-js");

const app = express();
app.use(bodyParser.json());

// ---- Supabase client (service role) ----
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE env vars");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);

// Root
app.get("/", (_req, res) => {
  res.send("✅ License API (Supabase) is running!");
});

// Activate license (binds license to first machine that uses it)
app.post("/activate", async (req, res) => {
  try {
    const { license, hwid } = req.body || {};
    if (!license || !hwid) {
      return res.status(400).json({ message: "Missing license or hwid" });
    }

    const { data, error } = await supabase
      .from("licenses")
      .select("license_key, hwid")
      .eq("license_key", license)
      .single();

    if (error || !data) return res.status(404).json({ message: "License not found" });

    if (!data.hwid) {
      const { error: updErr } = await supabase
        .from("licenses")
        .update({ hwid })
        .eq("license_key", license);
      if (updErr) return res.status(500).json({ message: "Activation error" });
      return res.json({ message: "Activated successfully" });
    } else if (data.hwid === hwid) {
      return res.json({ message: "Already activated on this machine" });
    } else {
      return res.status(403).json({ message: "License already bound to another HWID" });
    }
  } catch (e) {
    return res.status(500).json({ message: "Server error" });
  }
});

// Verify license (checks key + machine match)
app.post("/verify", async (req, res) => {
  try {
    const { license, hwid } = req.body || {};
    if (!license || !hwid) {
      return res.status(400).json({ message: "Missing license or hwid" });
    }

    const { data, error } = await supabase
      .from("licenses")
      .select("license_key")
      .eq("license_key", license)
      .eq("hwid", hwid)
      .maybeSingle();

    if (error || !data) return res.status(403).json({ message: "Invalid or mismatched HWID" });

    return res.json({ message: "Valid" });
  } catch (e) {
    return res.status(500).json({ message: "Server error" });
  }
});

// (Optional) Admin: list keys (for testing). Do NOT expose in production.
app.get("/keys", async (_req, res) => {
  const { data, error } = await supabase.from("licenses").select("license_key, hwid");
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`🚀 Supabase License server running on port ${port}`));
