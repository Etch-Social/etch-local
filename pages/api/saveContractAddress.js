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

    // Update or add the contract address
    const contractAddressLine = `NEXT_PUBLIC_CONTRACT_ADDRESS=${address}`;
    const envLines = envContent.split("\n");
    const existingIndex = envLines.findIndex((line) =>
      line.startsWith("NEXT_PUBLIC_CONTRACT_ADDRESS=")
    );

    if (existingIndex !== -1) {
      envLines[existingIndex] = contractAddressLine;
    } else {
      envLines.push(contractAddressLine);
    }

    // Write back to .env file
    fs.writeFileSync(envPath, envLines.join("\n"));

    res.status(200).json({ message: "Contract address saved successfully" });
  } catch (error) {
    console.error("Error saving contract address:", error);
    res.status(500).json({
      message: "Failed to save contract address",
      error: error.message,
    });
  }
}
