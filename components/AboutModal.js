import { useState } from "react";

export default function AboutModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[80vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-800">
              About Etch Local
            </h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
            >
              ×
            </button>
          </div>

          <div className="space-y-4 text-sm text-gray-700">
            <p>
              This tool allows you to publish social media and other posts
              directly onchain using the{" "}
              <span className="font-semibold text-blue-600">
                ERC-7847 NFT Social Media and Content standard
              </span>
              .
            </p>

            <p>
              Everything is{" "}
              <span className="font-semibold">
                permissionless and completely on-chain
              </span>
              . You own your smart contract and can publish anything you want to
              it.
            </p>

            <div className="space-y-3">
              <div>
                <h3 className="font-semibold text-gray-800 mb-1">
                  🔐 Arweave Storage
                </h3>
                <p>
                  You need to get an Arweave key to publish images and metadata
                  permanently.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-800 mb-1">
                  📡 View Other Feeds
                </h3>
                <p>
                  You can view feeds from other contracts that people have
                  published.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-800 mb-1">
                  🔑 Nostr Key
                </h3>
                <p>
                  Keep track of your Nostr key because it is used to sign your
                  data to prove your identity. You may also import a Nostr key
                  from any Nostr app.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-800 mb-1">
                  📝 Your Contract
                </h3>
                <p>
                  Keep track of your contract that you publish on so you can
                  publish on it again in the future.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-800 mb-1">
                  🌐 Nostr Network
                </h3>
                <p>
                  All posts are also picked up and relayed to the Nostr network
                  by{" "}
                  <a
                    href="https://etch.social"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    Etch.social
                  </a>
                  .
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-gray-200">
              <p className="text-xs text-gray-600">
                Source code available at:{" "}
                <a
                  href="https://github.com/Etch-Social/etch-local/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline break-all"
                >
                  github.com/Etch-Social/etch-local
                </a>
              </p>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
