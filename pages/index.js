import { useState, useEffect, useCallback } from "react";
import Head from "next/head";
import { ethers } from "ethers";
import PostForm from "../components/PostForm";
import PostCard from "../components/PostCard";
import SetupModal from "../components/SetupModal";
import TabNavigation from "../components/TabNavigation";
import FeedsSection from "../components/FeedsSection";
import { WalletProvider, useWallet } from "../contexts/WalletContext";
import ArweaveStorage from "../utils/ArweaveStorage";

import { getPublicKey, finalizeEvent, verifyEvent } from "nostr-tools/pure";
import { hexToBytes } from "@noble/hashes/utils";

// Main app component
function Home() {
  const {
    account,
    connectWallet,
    isConnecting,
    error: walletError,
    etchContract,
    provider,
  } = useWallet();

  const [posts, setPosts] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [arweaveStorage, setArweaveStorage] = useState(null);
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [activeTab, setActiveTab] = useState("publish");

  // Check if setup is required
  useEffect(() => {
    let isMounted = true;
    const checkSetup = async () => {
      try {
        const contractAddress =
          process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ||
          localStorage.getItem("CONTRACT_ADDRESS");

        // Fetch Arweave key from API
        const response = await fetch("/api/getArweaveKey");
        const data = await response.json();
        const hasArweaveKey = data.key !== null;

        // Only update state if component is still mounted
        if (isMounted) {
          // Only show setup modal if we're certain something is missing
          const needsSetup = !account || !contractAddress || !hasArweaveKey;
          setShowSetupModal(needsSetup);
        }
      } catch (err) {
        console.error("Error checking setup:", err);
        if (isMounted) {
          setShowSetupModal(true);
        }
      }
    };

    // Only run check if we have an account
    if (account) {
      checkSetup();
    } else {
      setShowSetupModal(true);
    }

    return () => {
      isMounted = false;
    };
  }, [account, etchContract]); // Added etchContract as dependency since it's part of setup

  // Initialize Arweave storage
  useEffect(() => {
    const initArweave = async () => {
      try {
        const response = await fetch("/api/getArweaveKey");
        if (!response.ok) {
          throw new Error("Failed to fetch Arweave key");
        }
        const data = await response.json();
        if (data.key) {
          const jwk = JSON.parse(data.key);
          setArweaveStorage(new ArweaveStorage(jwk));
        }
      } catch (err) {
        console.error("Error initializing Arweave storage:", err);
        setError("Failed to initialize Arweave storage");
      }
    };
    initArweave();
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
      // Get private key from API
      const response = await fetch("/api/getPrivateKey");
      if (!response.ok) {
        throw new Error("Failed to fetch private key");
      }
      const data = await response.json();
      if (!data.key) {
        throw new Error(
          "Private key not found. Please set up your private key in the setup modal."
        );
      }

      // Upload image to Arweave if present
      let imageUrl = null;
      if (postData.image) {
        const imageUpload = await arweaveStorage.uploadImage(postData.image);
        if (imageUpload) {
          imageUrl = imageUpload.url;
        }
      }

      const timestamp = Math.floor(Date.now() / 1000);
      const tokenId = timestamp;

      const skHex = data.key;
      const skBytes = hexToBytes(skHex);

      // Generate Nostr event
      const pk = getPublicKey(skBytes);
      const unsignedEvent = {
        kind: 1,
        created_at: Math.floor(Date.now() / 1000),
        tags: [
          ["l", "app-etch"],
          ["p", pk],
          [
            "blockchain",
            "base",
            `${
              process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ||
              localStorage.getItem("CONTRACT_ADDRESS")
            }`,
            `${tokenId}`,
          ],
        ],
        content: imageUrl
          ? `${postData.content}\n\n${imageUrl}`
          : postData.content,
        pubkey: pk,
      };
      const event = finalizeEvent(unsignedEvent, skBytes);
      let isGood = verifyEvent(event);
      if (!isGood) {
        throw new Error("Failed to verify event");
      }

      // Upload metadata to Arweave
      const metadataUpload = await arweaveStorage.uploadMetadata(
        postData.content,
        imageUrl,
        event.tags,
        event.pubkey,
        event
      );

      // Create post on contract
      const tx = await etchContract.createPost(
        account,
        metadataUpload.url,
        tokenId,
        `0x${event.id}`,
        `0x${event.pubkey}`,
        event.created_at,
        event.kind,
        event.content,
        JSON.stringify(event.tags),
        event.sig,
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
  };

  return (
    <div className="min-h-screen py-4 bg-gray-100">
      <Head>
        <title>Etch Social - Local Posts</title>
        <meta name="description" content="Create and view NFT posts locally" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="container mx-auto px-4 max-w-md">
        <header className="mb-6 text-center relative">
          <button
            onClick={() => setShowSetupModal(true)}
            className="absolute left-0 top-0 px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            Setup
          </button>
          <h1 className="text-2xl font-bold text-blue-600 mb-2">
            Etch Social - Local
          </h1>
          <p className="text-gray-600 mb-4">
            Publish content direct to blockchains
          </p>

          {!account ? (
            <button
              onClick={() => setShowSetupModal(true)}
              disabled={isConnecting}
              className="btn"
            >
              {isConnecting ? "Connecting..." : "Setup Required"}
            </button>
          ) : (
            <div className="text-sm text-gray-600 space-y-1">
              <div>
                Connected: {account.substring(0, 6)}...
                {account.substring(account.length - 4)}
              </div>
              <div>
                Contract:{" "}
                {process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ||
                  localStorage.getItem("CONTRACT_ADDRESS")}
              </div>
            </div>
          )}
        </header>

        {/* Tab Navigation */}
        <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />

        {(walletError || error) && (
          <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-600 rounded">
            {walletError || error}
          </div>
        )}

        {/* Publish Tab Content */}
        {activeTab === "publish" && (
          <>
            {account && arweaveStorage && (
              <PostForm
                onSubmit={handleSubmitPost}
                isSubmitting={isSubmitting}
              />
            )}

            <h2 className="text-xl font-medium mb-4 text-gray-800">
              Your Posts
            </h2>

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
          </>
        )}

        {/* Feeds Tab Content */}
        {activeTab === "feeds" && <FeedsSection provider={provider} />}
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
