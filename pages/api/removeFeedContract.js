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
      return res.status(404).json({ message: "No .env file found" });
    }

    // Get current feed contracts
    const envLines = envContent.split("\n");
    const feedContractsLine = envLines.find((line) =>
      line.startsWith("NEXT_PUBLIC_FEED_CONTRACTS=")
    );

    if (!feedContractsLine) {
      return res.status(404).json({ message: "No feed contracts found" });
    }

    // Remove the contract
    const currentContracts = feedContractsLine
      .split("=")[1]
      .split(",")
      .filter(Boolean);
    const updatedContracts = currentContracts.filter(
      (addr) => addr !== address
    );

    // Update the feed contracts line
    const newFeedContractsLine = `NEXT_PUBLIC_FEED_CONTRACTS=${updatedContracts.join(
      ","
    )}`;
    const existingIndex = envLines.findIndex((line) =>
      line.startsWith("NEXT_PUBLIC_FEED_CONTRACTS=")
    );

    if (existingIndex !== -1) {
      envLines[existingIndex] = newFeedContractsLine;
    }

    // Write back to .env file
    fs.writeFileSync(envPath, envLines.join("\n"));

    res.status(200).json({ message: "Feed contract removed successfully" });
  } catch (error) {
    console.error("Error removing feed contract:", error);
    res.status(500).json({
      message: "Failed to remove feed contract",
      error: error.message,
    });
  }
}
