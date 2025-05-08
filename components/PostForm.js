import { useState, useRef } from "react";
import { ethers } from "ethers";

const PostForm = ({ onSubmit, isSubmitting, maxImages = 5 }) => {
  const [content, setContent] = useState("");
  const [images, setImages] = useState([]);
  const [preview, setPreview] = useState([]);
  const fileInputRef = useRef(null);

  const handleContentChange = (e) => {
    setContent(e.target.value);
  };

  const handleImageChange = (e) => {
    const selectedFiles = Array.from(e.target.files);

    // Limit to max allowed images
    const newFiles = selectedFiles.slice(0, maxImages - images.length);

    if (newFiles.length > 0) {
      setImages([...images, ...newFiles]);

      // Generate previews
      newFiles.forEach((file) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreview((prev) => [...prev, { file, url: reader.result }]);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removeImage = (index) => {
    const newImages = [...images];
    newImages.splice(index, 1);
    setImages(newImages);

    const newPreviews = [...preview];
    newPreviews.splice(index, 1);
    setPreview(newPreviews);
  };

  const triggerFileInput = () => {
    fileInputRef.current.click();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!content.trim() && images.length === 0) {
      alert("Please add some content or at least one image to your post.");
      return;
    }

    // Generate a random ID for the post if needed
    const id = ethers.utils.randomBytes(32);
    const pubkey = ethers.utils.randomBytes(32);

    await onSubmit({
      content,
      images,
      id,
      pubkey,
      created_at: Math.floor(Date.now() / 1000),
      kind: 1, // Default kind
      tags: JSON.stringify([]),
      sig: "",
    });

    // Reset form after submission
    setContent("");
    setImages([]);
    setPreview([]);
  };

  return (
    <div className="card mb-6">
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <textarea
            value={content}
            onChange={handleContentChange}
            placeholder="What's happening?"
            className="input min-h-[120px] resize-y"
          />
        </div>

        {preview.length > 0 && (
          <div className="mb-4 grid grid-cols-2 md:grid-cols-3 gap-2">
            {preview.map((img, index) => (
              <div key={index} className="relative">
                <img
                  src={img.url}
                  alt={`Preview ${index}`}
                  className="w-full h-32 object-cover rounded-lg"
                />
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex space-x-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageChange}
              className="hidden"
            />
            <button
              type="button"
              onClick={triggerFileInput}
              disabled={images.length >= maxImages || isSubmitting}
              className={`p-2 rounded-full ${
                images.length >= maxImages
                  ? "bg-gray-300 cursor-not-allowed"
                  : "bg-blue-100 text-blue-600 hover:bg-blue-200"
              }`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-5 h-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
                />
              </svg>
            </button>
            {images.length > 0 && (
              <span className="text-sm text-gray-500 self-center">
                {images.length}/{maxImages} images
              </span>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting || (!content.trim() && images.length === 0)}
            className={`btn ${
              isSubmitting || (!content.trim() && images.length === 0)
                ? "bg-blue-300 cursor-not-allowed"
                : "bg-blue-500 hover:bg-blue-600"
            }`}
          >
            {isSubmitting ? "Publishing..." : "Publish"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default PostForm;
