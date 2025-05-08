// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";

/**
 * @title ERC-7847 Social Media NFT
 *
 * @dev Inherits from OpenZeppelin's ERC721 and adds the `createPost` function
 *      required by the ERC-7847 spec. Token IDs are auto-incremented starting at 0.
 *      Compatible with Solidity 0.8.20.
 */

contract SocialMediaNFT is ERC721 {
    // -------------------------------------------------
    // Storage
    // -------------------------------------------------

    // Auto-incrementing counter for new token IDs
    uint256 private _currentTokenId;

    // Mapping of tokenId -> URI
    mapping(uint256 => string) private _tokenURIs;

    /**
     * @dev Emitted whenever a new social media post is created (ERC-7847).
     *
     * Required fields from ERC-7847:
     *  - id
     *  - pubkey
     *  - created_at
     *  - kind
     *  - content
     *  - tags
     *  - sig
     */
    event PubEvent(
        bytes32 id,
        bytes32 indexed pubkey,
        uint256 created_at,
        uint32 indexed kind,
        string content,
        string tags,
        string sig
    );

    /**
     * @dev Constructor sets the ERC721 name and symbol.
     */
    constructor() ERC721("SocialMediaNFT", "SMNFT") {
        // Initialize tokenId counter to 0 (optional, since default is 0).
        _currentTokenId = 0;
    }

    // -------------------------------------------------
    // Internal & Private Functions
    // -------------------------------------------------

    /**
     * @dev Internal function to mint a new token, auto-incrementing the ID.
     *
     * @param publisher Address that will own the newly minted token.
     * @param uri The metadata URI for the token.
     * @return tokenId The newly assigned token ID.
     */
    function _mintToken(
        address publisher,
        string memory uri
    ) internal returns (uint256) {
        uint256 tokenId = _currentTokenId;
        _currentTokenId++;

        _safeMint(publisher, tokenId);
        _tokenURIs[tokenId] = uri;

        return tokenId;
    }

    // -------------------------------------------------
    // External / Public Functions
    // -------------------------------------------------

    /**
     * @dev Creates a new post (mints a new token) and emits `PubEvent` (ERC-7847).
     *
     * @param uri         The metadata URI for the new token.
     * @param id          A unique identifier for the post (e.g., content hash).
     * @param pubkey      A public key or unique identifier for the publisher.
     * @param created_at  Timestamp (block time or external) for the post creation.
     * @param kind        A numeric code representing the type of post.
     * @param content     The content of the post.
     * @param tags        Any tags associated with the post.
     * @param sig         A signature or other validation data. 64 bytes
     */
    function createPost(
        string memory uri,
        bytes32 id,
        bytes32 pubkey,
        uint256 created_at,
        uint32 kind,
        string memory content,
        string memory tags,
        string memory sig
    ) public {
        // Mint a new token with auto-incremented ID
        _mintToken(msg.sender, uri);

        // Emit the event as required by ERC-7847
        emit PubEvent(id, pubkey, created_at, kind, content, tags, sig);
    }

    /**
     * @dev Returns the URI for a given tokenId.
     *
     * @param tokenId The token ID for which to retrieve the URI.
     * @return The metadata URI string associated with `tokenId`.
     */
    function tokenURI(
        uint256 tokenId
    ) public view virtual override returns (string memory) {
        return _tokenURIs[tokenId];
    }

    /**
     * @dev Optional: Expose a read-only function to see the current auto-increment value.
     */
    function currentTokenId() external view returns (uint256) {
        return _currentTokenId;
    }
}
