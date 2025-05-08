# Etch Social - Local NFT Social Media

This project is a locally run social media application where posts are represented as NFTs. Built using the EtchV1 smart contract, the application allows users to create posts with text and images, which are then minted as NFTs on the blockchain.

## Features

- Create posts with text and up to 5 images
- Upload images to Arweave for permanent storage
- Mint posts as NFTs using the EtchV1 smart contract
- View a feed of all posts minted to the contract
- Mobile-first responsive design

## Prerequisites

- Node.js 16+
- Yarn or npm
- Metamask or another Ethereum wallet
- Arweave wallet for image storage

## Getting Started

1. Clone the repository:
   ```
   git clone <repository-url>
   cd etchLocal
   ```

2. Install dependencies:
   ```
   yarn install
   ```

3. Create a `.env` file in the root directory with the following variables:
   ```
   ALCHEMY_API_KEY=your_alchemy_api_key
   CONTRACT_ADDRESS=your_deployed_etch_contract_address
   ```

4. Compile the smart contract:
   ```
   yarn compile
   ```

5. Start the development server:
   ```
   yarn dev
   ```

6. Open [http://localhost:3000](http://localhost:3000) in your browser

## Using the Application

1. Connect your wallet by clicking the "Connect Wallet" button
2. Set up your Arweave wallet by clicking "Setup Arweave" and pasting your JWK (JSON Web Key)
3. Create a post by typing in the text area and optionally adding images
4. Click "Publish" to mint your post as an NFT
5. View your posts and others in the feed below

## Smart Contract

The EtchV1 smart contract implements the ERC-7847 standard for Social Media NFTs. It's built using OpenZeppelin's ERC1155 implementation and includes functionality for creating and updating posts.

To deploy the contract to a network:

```
npx hardhat run scripts/deploy.js --network <network-name>
```

## Technology Stack

- Next.js - React framework
- Tailwind CSS - Styling
- Ethers.js - Ethereum interaction
- Arweave - Decentralized storage
- Hardhat - Ethereum development environment
- ERC1155 - NFT standard

## License

MIT
