import { useState, useEffect } from "react";

const PostCard = ({ post, metadataUrl }) => {
  const [metadata, setMetadata] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        // If we have the content directly, use it
        if (post.content) {
          setMetadata({
            content: post.content,
            images: post.images || [],
          });
          setLoading(false);
          return;
        }

        // Otherwise, fetch from URL
        if (metadataUrl) {
          const response = await fetch(metadataUrl);
          if (!response.ok) {
            throw new Error("Failed to fetch metadata");
          }
          const data = await response.json();
          setMetadata(data);
        } else {
          // If no URL, just use the post content
          setMetadata({
            content: post.content || "",
            images: [],
          });
        }
      } catch (err) {
        console.error("Error fetching metadata:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

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
    <div className="card mb-4">
      <div className="mb-2 flex justify-between items-start">
        <h3 className="font-medium text-gray-800">
          {post.pubkey ? post.pubkey.substring(0, 8) + "..." : "Anonymous"}
        </h3>
        <span className="text-xs text-gray-500">
          {formatDate(post.createdAt || post.created_at)}
        </span>
      </div>

      {metadata?.content && (
        <p className="text-gray-700 mb-3 whitespace-pre-wrap">
          {metadata.content}
        </p>
      )}

      {metadata?.images && metadata.images.length > 0 && (
        <div className="mb-3 grid grid-cols-1 gap-2">
          {metadata.images.map((image, index) => (
            <img
              key={index}
              src={typeof image === "string" ? image : image.url}
              alt={`Post image ${index + 1}`}
              className="rounded-lg w-full"
            />
          ))}
        </div>
      )}

      <div className="flex text-sm text-gray-500">
        <span className="mr-2">TokenID: {post.tokenId || "N/A"}</span>
        {post.kind && <span className="mr-2">Kind: {post.kind}</span>}
      </div>
    </div>
  );
};

export default PostCard;
