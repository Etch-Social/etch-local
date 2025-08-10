import { useState, useEffect } from "react";
import { ethers } from "ethers";
import PostCard from "./PostCard";
import EtchContract from "../utils/EtchContract";
import { apiCall } from "../utils/StaticModeHelper";

const FeedsSection = ({ provider }) => {
  const [feedContracts, setFeedContracts] = useState([]);
  const [newContractAddress, setNewContractAddress] = useState("");
  const [allPosts, setAllPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAddingContract, setIsAddingContract] = useState(false);

  // Load saved feed contracts on mount
  useEffect(() => {
    const loadFeedContracts = async () => {
      try {
        const response = await apiCall("/api/getFeedContracts");
        if (!response.ok) throw new Error("Failed to load feed contracts");
        const data = await response.json();
        setFeedContracts(data.contracts || []);
      } catch (err) {
        console.error("Error loading feed contracts:", err);
        setError("Failed to load feed contracts");
      }
    };
    loadFeedContracts();
  }, []);

  // Load posts from all feed contracts
  useEffect(() => {
    const loadAllPosts = async () => {
      if (!provider || feedContracts.length === 0) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const allPostsPromises = feedContracts.map(async (contractAddress) => {
          const contract = new EtchContract(contractAddress, provider);
          const posts = await contract.getPostEvents();
          return posts.map((post) => ({
            ...post,
            contractAddress, // Add contract address to each post for reference
          }));
        });

        const postsArrays = await Promise.all(allPostsPromises);
        const flattenedPosts = postsArrays.flat();

        // Sort by created_at timestamp, newest first
        flattenedPosts.sort((a, b) => b.createdAt - a.createdAt);

        setAllPosts(flattenedPosts);
      } catch (err) {
        console.error("Error loading posts from feeds:", err);
        setError("Failed to load posts from feeds");
      } finally {
        setLoading(false);
      }
    };

    loadAllPosts();
  }, [provider, feedContracts]);

  const handleAddContract = async (e) => {
    e.preventDefault();
    if (!newContractAddress) return;

    setIsAddingContract(true);
    setError(null);

    try {
      // Validate the contract address
      if (!ethers.utils.isAddress(newContractAddress)) {
        throw new Error("Invalid contract address");
      }

      // Save the new contract address
      const response = await apiCall("/api/saveFeedContract", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ address: newContractAddress }),
      });

      if (!response.ok) {
        throw new Error("Failed to save feed contract");
      }

      // Add to local state
      setFeedContracts((prev) => [...prev, newContractAddress]);
      setNewContractAddress("");
    } catch (err) {
      console.error("Error adding feed contract:", err);
      setError(err.message || "Failed to add feed contract");
    } finally {
      setIsAddingContract(false);
    }
  };

  const handleRemoveContract = async (contractAddress) => {
    try {
      const response = await apiCall("/api/removeFeedContract", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ address: contractAddress }),
      });

      if (!response.ok) {
        throw new Error("Failed to remove feed contract");
      }

      // Remove from local state
      setFeedContracts((prev) =>
        prev.filter((addr) => addr !== contractAddress)
      );
    } catch (err) {
      console.error("Error removing feed contract:", err);
      setError(err.message || "Failed to remove feed contract");
    }
  };

  return (
    <div className="space-y-6">
      {/* Add Feed Contract Form */}
      <form onSubmit={handleAddContract} className="space-y-4">
        <div>
          <label
            htmlFor="contractAddress"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Add Feed Contract
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              id="contractAddress"
              value={newContractAddress}
              onChange={(e) => setNewContractAddress(e.target.value)}
              placeholder="Enter contract address"
              className="input flex-1"
            />
            <button
              type="submit"
              disabled={isAddingContract || !newContractAddress}
              className="btn bg-blue-500 hover:bg-blue-600 disabled:opacity-50"
            >
              {isAddingContract ? "Adding..." : "Add"}
            </button>
          </div>
        </div>
      </form>

      {/* Feed Contracts List */}
      {feedContracts.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-medium text-gray-700">Active Feeds</h3>
          <div className="space-y-2">
            {feedContracts.map((address) => (
              <div
                key={address}
                className="flex items-center justify-between bg-gray-50 p-2 rounded"
              >
                <span className="text-sm font-mono">{address}</span>
                <button
                  onClick={() => handleRemoveContract(address)}
                  className="text-red-500 hover:text-red-600 text-sm"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="p-3 bg-red-100 border border-red-300 text-red-600 rounded">
          {error}
        </div>
      )}

      {/* Posts List */}
      <div className="space-y-4">
        <h3 className="font-medium text-gray-700">Feed Posts</h3>
        {loading ? (
          <div className="text-center text-gray-500">Loading posts...</div>
        ) : allPosts.length === 0 ? (
          <div className="text-center text-gray-500">
            No posts found in any feeds. Add a feed contract to get started!
          </div>
        ) : (
          <div className="space-y-4">
            {allPosts.map((post, index) => (
              <PostCard
                key={`${post.id}-${post.contractAddress}-${index}`}
                post={post}
                metadataUrl={post.tokenUri}
                contractAddress={post.contractAddress}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FeedsSection;
