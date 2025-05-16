export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { key } = req.body;

    if (!key) {
      return res.status(400).json({ error: "Private key is required" });
    }

    // Save to .env.local file
    const fs = require("fs");
    const path = require("path");
    const envPath = path.resolve(process.cwd(), ".env");

    // Read existing .env.local file
    let envContent = "";
    try {
      envContent = fs.readFileSync(envPath, "utf8");
    } catch (err) {
      // File doesn't exist yet, that's okay
    }

    // Add or update NOSTR_PRIVATE_KEY
    const keyLine = `NOSTR_PRIVATE_KEY=${key}`;
    if (envContent.includes("NOSTR_PRIVATE_KEY=")) {
      envContent = envContent.replace(/NOSTR_PRIVATE_KEY=.*\n/, keyLine + "\n");
    } else {
      envContent += "\n" + keyLine + "\n";
    }

    // Write back to file
    fs.writeFileSync(envPath, envContent);

    res.status(200).json({ success: true });
  } catch (err) {
    console.error("Error saving private key:", err);
    res.status(500).json({ error: "Failed to save private key" });
  }
}
