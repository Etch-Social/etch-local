import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import PostForm from "../components/PostForm.jsx";
import PostCard from "../components/PostCard.jsx";
import SetupModal from "../components/SetupModal.jsx";
import AboutModal from "../components/AboutModal.jsx";
import TabNavigation from "../components/TabNavigation.jsx";
import FeedsSection from "../components/FeedsSection.jsx";
import { WalletProvider, useWallet } from "../contexts/WalletContext.jsx";
import ArweaveStorage from "../utils/ArweaveStorage";
// No env helper; read contract address directly from localStorage
import { getPublicKey, finalizeEvent, verifyEvent } from "nostr-tools/pure";
import { hexToBytes, bytesToHex } from "@noble/hashes/utils";
import { nip19 } from "nostr-tools";

function Home() {
  const {
    account,
    connectWallet,
    isConnecting,
    error: walletError,
    etchContract,
    provider,
    contractAddress,
    chainId,
  } = useWallet();

  const [posts, setPosts] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [arweaveStorage, setArweaveStorage] = useState(() => {
    try {
      // Prefer localStorage to support SPA refresh persistence
      if (typeof window === "undefined") return null;
      const keyString = window.localStorage.getItem("ARWEAVE_KEY");
     
      if (!keyString) return null;
      // Robustly parse ARWEAVE_KEY (handles double-encoded and wrapped JSON)
      let jwk = null;
      try {
        jwk = JSON.parse(keyString);
        if (typeof jwk === "string") {
          jwk = JSON.parse(jwk);
        }
        if (jwk && jwk.jwk && typeof jwk.jwk === "object") {
          jwk = jwk.jwk;
        }
      } catch (_) {}
      return new ArweaveStorage(jwk);
    } catch (_) {}
    return null;
  });
  const [showSetupModal, setShowSetupModal] = useState(() => {
    try {
      if (typeof window === "undefined") return false;
      const saved = window.localStorage.getItem("SHOW_SETUP_MODAL");
      return saved === "true"; // default closed unless explicitly saved open
    } catch (_) {
      return false;
    }
  });
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [activeTab, setActiveTab] = useState("publish");
  const [arweaveRefreshKey, setArweaveRefreshKey] = useState(0);

  // Persist modal open state so it won't auto-close on remounts (e.g., after deploy)
  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem("SHOW_SETUP_MODAL", showSetupModal ? "true" : "false");
      }
    } catch (_) {}
  }, [showSetupModal]);

  // Mirror SetupModal network check so modal only closes when on BASE and fully configured
  const isOnBaseNetwork =
    chainId === "0x2105" ||
    chainId === "0x14a33" || // BASE mainnet or testnet (hex)
    chainId === 8453 ||
    chainId === 84532; // BASE mainnet or testnet (decimal)

  useEffect(() => {
    let isMounted = true;
    const checkSetup = async () => {
      try {
        const contractAddress =
          typeof window !== "undefined"
            ? window.localStorage.getItem("CONTRACT_ADDRESS")
            : null;
        // Prefer localStorage for Arweave key to ensure it is visible after refresh in SPA
        try {
          // Access local storage only; Arweave key is optional
          typeof window !== "undefined" && window.localStorage.getItem("ARWEAVE_KEY");
        } catch (_) {}
        if (isMounted) {
          // Only auto-open when setup is needed; never auto-close
          const needsSetup = !account || !isOnBaseNetwork || !contractAddress;
          if (needsSetup) {
            setShowSetupModal(true);
          }
        }
      } catch (err) {
        console.error("Error checking setup:", err);
        if (isMounted) {
          setShowSetupModal(true);
        }
      }
    };
    if (account) {
      checkSetup();
    } else {
      setShowSetupModal(true);
    }
    return () => {
      isMounted = false;
    };
  }, [account, etchContract, chainId]);

  useEffect(() => {
    const initArweave = async () => {

      try {
        // Keep existing storage instance until we have a valid replacement
        // Prefer localStorage to support SPA refresh persistence
        let keyString = null;
        try {
          keyString =
            typeof window !== "undefined"
              ? window.localStorage.getItem("ARWEAVE_KEY")
              : null;
        } catch (_) {}

        let jwk = null;
        try {
          if (keyString) {
            jwk = JSON.parse(keyString);
            if (typeof jwk === "string") jwk = JSON.parse(jwk);
            if (jwk && jwk.jwk && typeof jwk.jwk === "object") jwk = jwk.jwk;
          }
        } catch (_) {}
        setArweaveStorage(new ArweaveStorage(jwk));
      
      } catch (err) {
        console.error("Error initializing Arweave storage:", err);
        setError("Failed to initialize Arweave storage");
      }
    };
    initArweave();
  }, [arweaveRefreshKey]);

  const loadPosts = useCallback(async () => {
    if (!etchContract) return;
    setLoading(true);
    setError(null);
    try {
      const eventLogs = await etchContract.getPostEvents();
      setPosts(eventLogs.reverse());
    } catch (err) {
      console.error("Error loading posts:", err);
      setError("Failed to load posts");
    } finally {
      setLoading(false);
    }
  }, [etchContract]);

  useEffect(() => {
    if (etchContract) {
      loadPosts();
    }
  }, [etchContract, loadPosts]);

  const handleSubmitPost = async (postData) => {
    if (!account || !etchContract) {
      setError("Please connect your wallet");
      return;
    }

    if (postData.image && !arweaveStorage) {
      setError(
        "You need to configure an Arweave key in Setup to attach images. Go to Setup > Step 3 to add your Arweave key."
      );
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      // Get private key from localStorage only
      let privateKeyString = null;
      try {
        privateKeyString =
          typeof window !== "undefined"
            ? window.localStorage.getItem("NOSTR_PRIVATE_KEY")
            : null;
      } catch (_) {}
      if (!privateKeyString) {
        throw new Error(
          "Private key not found. Please set up your private key in the setup modal."
        );
      }
      let imageUrl = null;
      if (postData.image) {
        const imageUpload = await arweaveStorage.uploadImage(postData.image);
        if (imageUpload) {
          imageUrl = imageUpload.url;
        }
      }
      const timestamp = Math.floor(Date.now() / 1000);
      const tokenId = timestamp;
      const normalizeHexKey = (input) => {
        let s = (input || "").trim();
        // Strip accidental wrapping quotes
        if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
          s = s.slice(1, -1).trim();
        }
        if (s.toLowerCase().startsWith("nsec")) {
          try {
            const decoded = nip19.decode(s);
            if (decoded.type !== "nsec" || !decoded.data) {
              throw new Error("Invalid nsec key");
            }
            const hex = bytesToHex(decoded.data);
            s = hex;
          } catch (e) {
            throw new Error("Invalid nsec private key. Please check and try again.");
          }
        }
        if (s.startsWith("0x") || s.startsWith("0X")) s = s.slice(2);
        // Remove whitespace inside the key
        s = s.replace(/\s+/g, "");
        if (!/^[0-9a-fA-F]*$/.test(s)) {
          throw new Error(
            "Invalid private key format. Enter a 64-char hex or an nsec... key, or use Generate."
          );
        }
        if (s.length % 2 === 1) {
          s = "0" + s; // left-pad to even length
        }
        if (s.length !== 64) {
          if (s.length < 64) {
            s = s.padStart(64, "0");
          } else {
            throw new Error(
              "Invalid private key length. Expected 64 hex characters (32 bytes)."
            );
          }
        }
        return s.toLowerCase();
      };

      const skHexNormalized = normalizeHexKey(privateKeyString);
      const skBytes = hexToBytes(skHexNormalized);
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
              typeof window !== "undefined"
                ? window.localStorage.getItem("CONTRACT_ADDRESS") || ""
                : ""
            }`,
            `${tokenId}`,
          ],
        ],
        content: imageUrl ? `${postData.content}\n\n${imageUrl}` : postData.content,
        pubkey: pk,
      };
      const event = finalizeEvent(unsignedEvent, skBytes);
      let isGood = verifyEvent(event);
      if (!isGood) {
        throw new Error("Failed to verify event");
      }
      let metadataUpload;
      if (arweaveStorage) {
        metadataUpload = await arweaveStorage.uploadMetadata(
          postData.content,
          imageUrl,
          event.tags,
          event.pubkey,
          event
        );
      } else {
        const metadata = {
          name: `${event.pubkey}-${Date.now().toString()}-${postData.content.slice(0, 10)}`,
          description: postData.content,
          attributes: [
            { trait_type: "kind", value: event.kind },
            { trait_type: "sig", value: event.sig },
            { trait_type: "id", value: event.id },
            { trait_type: "pubkey", value: event.pubkey },
            { trait_type: "created_at", value: event.created_at },
            { trait_type: "content", value: event.content },
          ],
          image: imageUrl || "https://arweave.net/dWPZeOyiaD4h7CUpVKnnjAVPhEOrf5kk2Blg_YRBWuQ",
        };
        const metadataJson = JSON.stringify(metadata);
        const encodedMetadata = btoa(metadataJson);
        metadataUpload = {
          url: `data:application/json;base64,${encodedMetadata}`,
          id: "local-metadata",
          status: "local",
        };
      }
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
        1
      );
      await tx.wait();
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
    setArweaveRefreshKey((prev) => prev + 1);
  };

  return (
    <div className="min-h-screen py-4 bg-gray-100">
      <main className="container mx-auto px-4 max-w-md">
        <header className="mb-6 text-center relative">
          <button
            onClick={() => setShowSetupModal(true)}
            className="absolute left-0 top-0 px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            Setup
          </button>
          <button
            onClick={() => setShowAboutModal(true)}
            className="absolute right-0 top-0 px-3 py-1 text-sm bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
          >
            About
          </button>
          <h1 className="text-2xl font-bold text-blue-600 mb-2">Etch It</h1>
          <p className="text-gray-600 mb-4">Publish content direct to blockchains</p>
          {!account ? (
            <button onClick={() => setShowSetupModal(true)} disabled={isConnecting} className="btn">
              {isConnecting ? "Connecting..." : "Setup Required"}
            </button>
          ) : (
            <div className="text-sm text-gray-600 space-y-1">
              <div>
                Connected: {account.substring(0, 6)}...{account.substring(account.length - 4)}
              </div>
              <div>
                Contract: {contractAddress || (typeof window !== "undefined" ? window.localStorage.getItem("CONTRACT_ADDRESS") : "")}
              </div>
            </div>
          )}
        </header>

        <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />

        {(walletError || error) && (
          <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-600 rounded">
            {walletError || error}
          </div>
        )}

        {activeTab === "publish" && (
          <>
            {account && (
              <PostForm onSubmit={handleSubmitPost} isSubmitting={isSubmitting} hasArweaveStorage={!!arweaveStorage}/>
            )}
            <h2 className="text-xl font-medium mb-4 text-gray-800">Your Posts</h2>
            {loading ? (
              <div className="text-center text-gray-500">Loading posts...</div>
            ) : posts.length === 0 ? (
              <div className="text-center text-gray-500">No posts found. Create your first one!</div>
            ) : (
              <div className="space-y-4">
                {posts.map((post, index) => (
                  <PostCard key={`${post.id}-${index}`} post={post} metadataUrl={post.tokenUri} />
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === "feeds" && <FeedsSection provider={provider} />}
      </main>

      <SetupModal isOpen={showSetupModal} onClose={() => setShowSetupModal(false)} onSetupComplete={handleSetupComplete} />
      <AboutModal isOpen={showAboutModal} onClose={() => setShowAboutModal(false)} />
    </div>
  );
}

export default function App() {
  return (
    <WalletProvider>
      <Home />
    </WalletProvider>
  );
}


