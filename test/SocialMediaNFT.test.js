const { expect } = require("chai");
const { ethers } = require("hardhat");
const {
  generateSecretKey,
  getPublicKey,
  finalizeEvent,
} = require("nostr-tools/pure");

describe("SocialMediaNFT", function () {
  let SocialMediaNFT, socialMediaNFT;
  let owner, addr1;
  let sk, pk; // Nostr private and public keys

  before(async function () {
    [owner, addr1] = await ethers.getSigners();
    SocialMediaNFT = await ethers.getContractFactory("SocialMediaNFT");

    // Generate Nostr keypair
    sk = generateSecretKey(); // 32 bytes private key
    pk = getPublicKey(sk); // 32 bytes public key
  });

  beforeEach(async function () {
    socialMediaNFT = await SocialMediaNFT.deploy();
    await socialMediaNFT.deployed();
  });

  it("Should deploy successfully and set initial currentTokenId to 0", async function () {
    expect(await socialMediaNFT.currentTokenId()).to.equal(0);
  });

  it("Should create a post and increment tokenId", async function () {
    // Create a Nostr event
    const unsignedEvent = {
      kind: 1,
      created_at: Math.floor(Date.now() / 1000),
      tags: [
        [
          "imeta",
          "url https://nostr.build/i/my-image.jpg",
          "m image/jpeg",
          "dim 3024x4032",
          "alt A scenic photo overlooking the coast of Costa Rica",
        ],
      ],
      content: "Hello, world!",
      pubkey: pk,
    };

    // Finalize and sign the event
    const event = finalizeEvent(unsignedEvent, sk);

    // Create NFT post with Nostr event data
    const tx = await socialMediaNFT.createPost(
      "https://example.com/metadata.json",
      `0x${event.id}`, // Convert hex string to bytes32
      `0x${event.pubkey}`, // Convert hex string to bytes32
      event.created_at,
      event.kind,
      event.content,
      JSON.stringify(event.tags),
      event.sig // Already hex string
    );
    await tx.wait();

    expect(await socialMediaNFT.currentTokenId()).to.equal(1);

    // Create second post
    const unsignedEvent2 = {
      ...unsignedEvent,
      content: "Hello, world 2!",
      tags: [
        [
          "imeta",
          "url https://nostr.build/i/my-image2.jpg",
          "m image/jpeg",
          "dim 3024x4032",
          "alt Another scenic photo",
        ],
      ],
    };
    const event2 = finalizeEvent(unsignedEvent2, sk);

    const tx2 = await socialMediaNFT.createPost(
      "https://example.com/metadata2.json",
      `0x${event2.id}`,
      `0x${event2.pubkey}`,
      event2.created_at,
      event2.kind,
      event2.content,
      JSON.stringify(event2.tags),
      event2.sig
    );
    await tx2.wait();

    expect(await socialMediaNFT.currentTokenId()).to.equal(2);
    expect(await socialMediaNFT.tokenURI(0)).to.equal(
      "https://example.com/metadata.json"
    );
  });

  it("Should emit PubEvent with correct args on createPost", async function () {
    const unsignedEvent = {
      kind: 1,
      created_at: Math.floor(Date.now() / 1000),
      tags: [
        [
          "imeta",
          "url https://nostr.build/i/my-image3.jpg",
          "m image/jpeg",
          "dim 3024x4032",
          "alt Beautiful mountain landscape",
        ],
      ],
      content: "Hello, world 3!",
      pubkey: pk,
    };

    const event = finalizeEvent(unsignedEvent, sk);

    await expect(
      socialMediaNFT.createPost(
        "https://example.com/metadata3.json",
        `0x${event.id}`,
        `0x${event.pubkey}`,
        event.created_at,
        event.kind,
        event.content,
        JSON.stringify(event.tags),
        event.sig
      )
    )
      .to.emit(socialMediaNFT, "PubEvent")
      .withArgs(
        `0x${event.id}`,
        `0x${event.pubkey}`,
        event.created_at,
        event.kind,
        event.content,
        JSON.stringify(event.tags),
        event.sig
      );
  });

  it("Should allow a different account to create a post", async function () {
    // Generate new Nostr keypair for addr1
    const sk2 = generateSecretKey();
    const pk2 = getPublicKey(sk2);

    const unsignedEvent = {
      kind: 1,
      created_at: Math.floor(Date.now() / 1000),
      tags: [
        [
          "imeta",
          "url https://nostr.build/i/my-image4.jpg",
          "m image/jpeg",
          "dim 3024x4032",
          "alt Mountain lake at sunset",
        ],
      ],
      content: "Post from different account",
      pubkey: pk2,
    };

    const event = finalizeEvent(unsignedEvent, sk2);

    // Connect contract to addr1
    const socialMediaNFT_addr1 = socialMediaNFT.connect(addr1);

    await socialMediaNFT_addr1.createPost(
      "https://example.com/addr1.json",
      `0x${event.id}`,
      `0x${event.pubkey}`,
      event.created_at,
      event.kind,
      event.content,
      JSON.stringify(event.tags),
      event.sig
    );

    expect(await socialMediaNFT.currentTokenId()).to.equal(1);
    expect(await socialMediaNFT.tokenURI(0)).to.equal(
      "https://example.com/addr1.json"
    );
  });
});
