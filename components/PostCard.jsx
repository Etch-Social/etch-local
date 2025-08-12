import { useState, useEffect } from "react";
import { useWallet } from "../contexts/WalletContext";
import { nip19 } from "nostr-tools";

const PostCard = ({ post, metadataUrl, contractAddress }) => {
  const [metadata, setMetadata] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showTxPopup, setShowTxPopup] = useState(false);
  const [txHash, setTxHash] = useState(null);
  const [nip19Id, setNip19Id] = useState(null);
  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        // Always try to fetch from URL if available
        if (metadataUrl) {
          const response = await fetch(metadataUrl);
          if (!response.ok) {
            throw new Error(
              `Failed to fetch metadata: ${response.status} ${response.statusText}`
            );
          }
          const data = await response.json();
          setMetadata(data);
        } else if (post.content) {
          // Fallback to post content only if no metadataUrl
          setMetadata({
            content: post.content,
            image: post.image || null,
          });
        } else {
          // If neither exists, set empty metadata
          setMetadata({
            content: "",
            image: null,
          });
        }
      } catch (err) {
        console.error("Error in fetchMetadata:", err);
        setError(err.message);
        // Fallback to post content if fetch fails
        if (post.content) {
          setMetadata({
            content: post.content,
            image: post.image || null,
          });
        }
      } finally {
        setLoading(false);
      }
    };

    // Create nip19 of event id
    const _nip19Id = nip19.noteEncode(post.id);
    setNip19Id(_nip19Id);

    fetchMetadata();
  }, [post, metadataUrl]);

  const formatDate = (timestamp) => {
    if (!timestamp) return "";

    // Handle different formats
    const date =
      typeof timestamp === "string"
        ? new Date(isNaN(timestamp) ? timestamp : Number(timestamp) * 1000)
        : new Date(timestamp * 1000);

    return date.toLocaleString();
  };

  if (loading) {
    return (
      <div className="card animate-pulse mb-4">
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
        <div className="h-24 bg-gray-200 rounded mb-4"></div>
        <div className="h-4 bg-gray-200 rounded w-1/4"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card mb-4 border-red-200 bg-red-50">
        <p className="text-red-500">Error loading post: {error}</p>
      </div>
    );
  }

  return (
    <>
      <div className="card mb-4">
        <div className="mb-2 flex justify-between items-start">
          <h3 className="font-medium text-gray-800">
            Author:{" "}
            {post.pubkey ? post.pubkey.substring(0, 8) + "..." : "Anonymous"}
          </h3>
          <span className="text-sm text-gray-500">
            {formatDate(post.createdAt || post.created_at)}
          </span>
        </div>

        {metadata?.content && (
          <p className="text-gray-700 mb-3 whitespace-pre-wrap">
            {metadata.content}
          </p>
        )}

        {metadata?.image && (
          <div className="mb-3">
            <img
              src={
                typeof metadata.image === "string"
                  ? metadata.image
                  : metadata.image.url
              }
              alt="Post image"
              className="rounded-lg w-full"
            />
          </div>
        )}

        <div className="flex text-sm text-gray-500">
          <span className="mr-2">TokenID: {post.tokenId}</span>
          {/* {post.kind && <span className="mr-2">Kind: {post.kind}</span>} */}
        </div>

        {/* Add content to the post */}
        <div className="flex text-sm text-gray-500">
          <span className="mr-2 break-words overflow-hidden">
            Content: {post.content}
          </span>
        </div>

        {/* Add links to opensea, basescan and etch.social */}
        <div className="flex gap-6 mt-3">
          <a
            href={`https://etch.social/${nip19Id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 font-medium hover:underline"
          >
            Etch.social
          </a>

          <a
            href={`https://opensea.io/assets/base/${post.contractAddress}/${post.tokenId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 font-medium hover:underline"
          >
            OpenSea (5 mins)
          </a>
          <a
            href={`https://basescan.org/tx/${post.transactionHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 font-medium hover:underline"
          >
            Block Explorer
          </a>
        </div>

        {/* Add contract address display for feed posts */}
        {contractAddress && (
          <div className="mt-2 text-xs text-gray-500">
            Contract: {contractAddress.substring(0, 6)}...
            {contractAddress.substring(contractAddress.length - 4)}
          </div>
        )}
      </div>

      {/* Transaction Popup */}
      {showTxPopup && txHash && (
        <div className="fixed bottom-4 right-4 bg-green-100 border border-green-300 text-green-700 px-4 py-3 rounded shadow-lg">
          <p className="font-medium">Transaction Successful!</p>
          <p className="text-sm">
            Hash: {txHash.substring(0, 10)}...
            {txHash.substring(txHash.length - 8)}
          </p>
        </div>
      )}
    </>
  );
};

export default PostCard;


