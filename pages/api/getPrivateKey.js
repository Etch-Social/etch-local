export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const privateKey = process.env.NOSTR_PRIVATE_KEY;
    res.status(200).json({ key: privateKey || null });
  } catch (err) {
    console.error("Error getting private key:", err);
    res.status(500).json({ error: "Failed to get private key" });
  }
}
