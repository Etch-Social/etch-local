import fs from "fs";
import path from "path";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { key } = req.body;

    // Validate the key is valid JSON
    JSON.parse(key);

    // Write the key to arweave-key.json in the project root
    const filePath = path.join(process.cwd(), "arweave-key.json");
    fs.writeFileSync(filePath, key);

    res.status(200).json({ message: "Key saved successfully" });
  } catch (error) {
    console.error("Error saving Arweave key:", error);
    res
      .status(500)
      .json({ message: "Failed to save key", error: error.message });
  }
}
