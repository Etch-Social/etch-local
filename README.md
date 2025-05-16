# Publish and view blockchain social media posts

This project is a locally run social media application where posts are represented as NFTs. Built using the EtchV1 smart contract, the application allows users to create posts with text and images, which are then minted as NFTs on the blockchain creating a global permissionless social media network.

## Features

- Upload images to Arweave for permanent storage
- Mint posts as NFTs using the EtchV1 smart contract
- View a feed of all posts minted to the contract
- Mobile-first responsive design
- View posts on other contract addresses

## Prerequisites

- Node.js 16+
- Yarn or npm
- Metamask or another Ethereum wallet
- Arweave wallet for image storage and json metadata

## Getting Started

1. Clone the repository:

   ```bash
   git clone <repository-url>
   cd etch-local
   ```

2. Install dependencies:

   ```bash
   yarn install
   ```

3. Create a `.env`

4. Compile the smart contract:

   ```bash
   yarn compile
   ```

5. Start the development server:

   ```bash
   yarn dev
   ```

6. Open [http://localhost:3000](http://localhost:3000) in your browser

## Using the Application

1. Connect your wallet by clicking the "Connect Wallet" button
2. Add or generate a Nostr private key
3. Set up your Arweave wallet by clicking "Setup Arweave" and pasting your JWK (JSON Web Key)
4. Create a post by typing in the text area and optionally adding images
5. Click "Publish" to mint your post as an NFT
6. View your posts and others in the feed below
7. Switch to the feeds tab and add etch contracts others have deployed

## Smart Contract

The EtchV1 smart contract implements the ERC-7847 standard for Social Media NFTs. It's built using OpenZeppelin's ERC1155 implementation and includes functionality for creating and updating posts.


## Technology Stack

- Next.js - React framework
- Tailwind CSS - Styling
- Ethers.js - Ethereum interaction
- Arweave - Decentralized storage
- Hardhat - Ethereum development environment
- ERC1155 + ERC7847 - NFT standards

## License

MIT
