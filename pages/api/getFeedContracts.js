export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    // Get feed contracts from environment variable
    const feedContracts = process.env.NEXT_PUBLIC_FEED_CONTRACTS || "";
    const contracts = feedContracts.split(",").filter(Boolean);

    res.status(200).json({ contracts });
  } catch (error) {
    console.error("Error getting feed contracts:", error);
    res.status(500).json({
      message: "Failed to get feed contracts",
      error: error.message,
    });
  }
}
