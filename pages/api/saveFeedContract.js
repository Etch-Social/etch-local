import fs from "fs";
import path from "path";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { address } = req.body;

    if (!address) {
      return res.status(400).json({ message: "Contract address is required" });
    }

    // Read the current .env file
    const envPath = path.join(process.cwd(), ".env");
    let envContent = "";

    try {
      envContent = fs.readFileSync(envPath, "utf8");
    } catch (error) {
      // If .env doesn't exist, that's okay - we'll create it
      console.log("No existing .env file found, creating new one");
    }

    // Get current feed contracts
    const envLines = envContent.split("\n");
    const feedContractsLine = envLines.find((line) =>
      line.startsWith("NEXT_PUBLIC_FEED_CONTRACTS=")
    );
    let currentContracts = [];

    if (feedContractsLine) {
      currentContracts = feedContractsLine
        .split("=")[1]
        .split(",")
        .filter(Boolean);
    }

    // Add new contract if it doesn't exist
    if (!currentContracts.includes(address)) {
      currentContracts.push(address);
    }

    // Update or add the feed contracts line
    const newFeedContractsLine = `NEXT_PUBLIC_FEED_CONTRACTS=${currentContracts.join(
      ","
    )}`;
    const existingIndex = envLines.findIndex((line) =>
      line.startsWith("NEXT_PUBLIC_FEED_CONTRACTS=")
    );

    if (existingIndex !== -1) {
      envLines[existingIndex] = newFeedContractsLine;
    } else {
      envLines.push(newFeedContractsLine);
    }

    // Write back to .env file
    fs.writeFileSync(envPath, envLines.join("\n"));

    res.status(200).json({ message: "Feed contract saved successfully" });
  } catch (error) {
    console.error("Error saving feed contract:", error);
    res.status(500).json({
      message: "Failed to save feed contract",
      error: error.message,
    });
  }
}
