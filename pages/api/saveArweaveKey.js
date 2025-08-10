import fs from "fs";
import path from "path";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { key } = req.body;
    const filePath = path.join(process.cwd(), "arweave-key.json");

    // If key is empty, delete the file to remove the key
    if (!key || key.trim() === "") {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      res.status(200).json({ message: "Key removed successfully" });
      return;
    }

    // Validate the key is valid JSON
    JSON.parse(key);

    // Write the key to arweave-key.json in the project root
    fs.writeFileSync(filePath, key);

    res.status(200).json({ message: "Key saved successfully" });
  } catch (error) {
    console.error("Error saving Arweave key:", error);
    res
      .status(500)
      .json({ message: "Failed to save key", error: error.message });
  }
}
