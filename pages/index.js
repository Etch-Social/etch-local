import { useState, useEffect, useCallback } from "react";
import Head from "next/head";
import { ethers } from "ethers";
import PostForm from "../components/PostForm";
import PostCard from "../components/PostCard";
import SetupModal from "../components/SetupModal";
import { WalletProvider, useWallet } from "../contexts/WalletContext";
import ArweaveStorage from "../utils/ArweaveStorage";

// Main app component
function Home() {
  const {
    account,
    connectWallet,
    isConnecting,
    error: walletError,
    etchContract,
  } = useWallet();

  const [posts, setPosts] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [arweaveStorage, setArweaveStorage] = useState(null);
  const [showSetupModal, setShowSetupModal] = useState(false);

  // Check if setup is required
  useEffect(() => {
    const contractAddress =
      process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ||
      localStorage.getItem("CONTRACT_ADDRESS");
    const arweaveJwk = localStorage.getItem("arweaveJwk");

    if (!account || !contractAddress || !arweaveJwk) {
      setShowSetupModal(true);
    }
  }, [account]);

  // Initialize Arweave storage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const jwkString = localStorage.getItem("arweaveJwk");

      if (jwkString) {
        try {
          const jwk = JSON.parse(jwkString);
          setArweaveStorage(new ArweaveStorage(jwk));
        } catch (err) {
          console.error("Error initializing Arweave storage:", err);
          setError("Failed to initialize Arweave storage");
        }
      }
    }
  }, []);

  // Load posts from contract
  const loadPosts = useCallback(async () => {
    if (!etchContract) return;

    setLoading(true);
    setError(null);

    try {
      const eventLogs = await etchContract.getPostEvents();
      setPosts(eventLogs.reverse()); // Show newest first
    } catch (err) {
      console.error("Error loading posts:", err);
      setError("Failed to load posts");
    } finally {
      setLoading(false);
    }
  }, [etchContract]);

  // Load posts on contract change
  useEffect(() => {
    if (etchContract) {
      loadPosts();
    }
  }, [etchContract, loadPosts]);

  // Handle post submission
  const handleSubmitPost = async (postData) => {
    if (!account || !etchContract || !arweaveStorage) {
      setError("Please connect your wallet and ensure Arweave is configured");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Upload images to Arweave
      const imageUploads = await arweaveStorage.uploadImages(postData.images);
      const imageUrls = imageUploads.map((upload) => upload.url);

      // Upload metadata to Arweave
      const metadataUpload = await arweaveStorage.uploadMetadata(
        postData.content,
        imageUrls
      );

      // Generate tokenId (using timestamp and random for uniqueness)
      const tokenId =
        Math.floor(Date.now() / 1000) + Math.floor(Math.random() * 1000);

      // Convert id and pubkey to bytes32 if they're not already
      let id = postData.id;
      let pubkey = postData.pubkey;

      if (typeof id === "string") {
        id = ethers.utils.formatBytes32String(id);
      }

      if (typeof pubkey === "string") {
        pubkey = ethers.utils.formatBytes32String(pubkey);
      }

      // Create post on contract
      const tx = await etchContract.createPost(
        account,
        metadataUpload.url,
        tokenId,
        id,
        pubkey,
        postData.created_at,
        postData.kind,
        postData.content,
        postData.tags,
        postData.sig || "",
        1 // quantity
      );

      // Wait for transaction to be mined
      await tx.wait();

      // Reload posts
      await loadPosts();
    } catch (err) {
      console.error("Error submitting post:", err);
      setError(err.message || "Failed to submit post");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSetupComplete = () => {
    setShowSetupModal(false);
    window.location.reload(); // Reload to pick up new contract address
  };

  return (
    <div className="min-h-screen py-4">
      <Head>
        <title>Etch Social - Local Posts</title>
        <meta name="description" content="Create and view NFT posts locally" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="container mx-auto px-4 max-w-md">
        <header className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-blue-600 mb-2">Etch Social</h1>
          <p className="text-gray-600 mb-4">Create and publish posts as NFTs</p>

          {!account ? (
            <button
              onClick={() => setShowSetupModal(true)}
              disabled={isConnecting}
              className="btn"
            >
              {isConnecting ? "Connecting..." : "Setup Required"}
            </button>
          ) : (
            <div className="text-sm text-gray-600">
              Connected: {account.substring(0, 6)}...
              {account.substring(account.length - 4)}
            </div>
          )}
        </header>

        {(walletError || error) && (
          <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-600 rounded">
            {walletError || error}
          </div>
        )}

        {account && arweaveStorage && (
          <PostForm onSubmit={handleSubmitPost} isSubmitting={isSubmitting} />
        )}

        <h2 className="text-xl font-medium mb-4 text-gray-800">Recent Posts</h2>

        {loading ? (
          <div className="text-center text-gray-500">Loading posts...</div>
        ) : posts.length === 0 ? (
          <div className="text-center text-gray-500">
            No posts found. Create the first one!
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map((post, index) => (
              <PostCard
                key={`${post.id}-${index}`}
                post={post}
                metadataUrl={post.tokenUri}
              />
            ))}
          </div>
        )}
      </main>

      <SetupModal
        isOpen={showSetupModal}
        onClose={() => setShowSetupModal(false)}
        onSetupComplete={handleSetupComplete}
      />
    </div>
  );
}

// Wrap the component with the WalletProvider
export default function HomeWithProvider() {
  return (
    <WalletProvider>
      <Home />
    </WalletProvider>
  );
}
