import fs from "fs";
import path from "path";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const filePath = path.join(process.cwd(), "arweave-key.json");

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(200).json({ key: null });
    }

    // Read the key file
    const key = fs.readFileSync(filePath, "utf8");

    // Validate it's valid JSON
    JSON.parse(key);

    res.status(200).json({ key });
  } catch (error) {
    console.error("Error reading Arweave key:", error);
    res
      .status(500)
      .json({ message: "Failed to read key", error: error.message });
  }
}
