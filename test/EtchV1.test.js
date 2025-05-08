const { expect } = require("chai");
const { ethers } = require("hardhat");
const {
  generateSecretKey,
  getPublicKey,
  finalizeEvent,
} = require("nostr-tools/pure");

describe("EtchV1", function () {
  let EtchV1, etchV1;
  let owner, addr1;
  let sk, pk; // Nostr private and public keys
  let MINTER_ROLE;

  before(async function () {
    [owner, addr1] = await ethers.getSigners();
    EtchV1 = await ethers.getContractFactory("EtchV1");

    // Generate Nostr keypair
    sk = generateSecretKey(); // 32 bytes private key
    pk = getPublicKey(sk); // 32 bytes public key
  });

  beforeEach(async function () {
    etchV1 = await EtchV1.deploy();
    await etchV1.deployed();
    MINTER_ROLE = await etchV1.MINTER_ROLE();
  });

  it("Should deploy successfully", async function () {
    expect(await etchV1.totalPosts()).to.equal(0);
  });

  it("Should create a post with specified tokenId", async function () {
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

    const event = finalizeEvent(unsignedEvent, sk);

    const tx = await etchV1.createPost(
      owner.address,
      "https://example.com/metadata.json",
      1,
      `0x${event.id}`,
      `0x${event.pubkey}`,
      event.created_at,
      event.kind,
      event.content,
      JSON.stringify(event.tags),
      event.sig,
      1 // quantity
    );
    await tx.wait();

    expect(await etchV1.balanceOf(owner.address, 1)).to.equal(1);
    expect(await etchV1.uri(1)).to.equal("https://example.com/metadata.json");
    expect(await etchV1.totalPosts()).to.equal(1);
  });

  it("Should not allow duplicate tokenIds when allowMultiple is false", async function () {
    const event = finalizeEvent(
      {
        kind: 1,
        created_at: Math.floor(Date.now() / 1000),
        tags: [],
        content: "First post",
        pubkey: pk,
      },
      sk
    );

    await etchV1.createPost(
      owner.address, // mint to owner
      "https://example.com/1.json",
      1, // tokenId
      `0x${event.id}`,
      `0x${event.pubkey}`,
      event.created_at,
      event.kind,
      event.content,
      "[]",
      event.sig,
      1
    );

    const event2 = finalizeEvent(
      {
        kind: 1,
        created_at: Math.floor(Date.now() / 1000),
        tags: [],
        content: "Duplicate tokenId",
        pubkey: pk,
      },
      sk
    );

    await expect(
      etchV1.createPost(
        owner.address, // mint to owner
        "https://example.com/2.json",
        1, // same tokenId
        `0x${event2.id}`,
        `0x${event2.pubkey}`,
        event2.created_at,
        event2.kind,
        event2.content,
        "[]",
        event2.sig,
        1
      )
    ).to.be.revertedWith("Token already exists");
  });

  it("Should allow multiple mints of same tokenId when allowMultiple is true", async function () {
    const event = finalizeEvent(
      {
        kind: 1,
        created_at: Math.floor(Date.now() / 1000),
        tags: [],
        content: "Multiple mint test",
        pubkey: pk,
      },
      sk
    );

    await etchV1.createPost(
      owner.address, // mint to owner
      "https://example.com/multi.json",
      1,
      `0x${event.id}`,
      `0x${event.pubkey}`,
      event.created_at,
      event.kind,
      event.content,
      "[]",
      event.sig,
      2
    );

    expect(await etchV1.balanceOf(owner.address, 1)).to.equal(2);
  });

  it("Should update post URI and emit new PubEvent", async function () {
    // First create a post
    const event = finalizeEvent(
      {
        kind: 1,
        created_at: Math.floor(Date.now() / 1000),
        tags: [],
        content: "Original post",
        pubkey: pk,
      },
      sk
    );

    await etchV1.createPost(
      owner.address, // mint to owner
      "https://example.com/original.json",
      1,
      `0x${event.id}`,
      `0x${event.pubkey}`,
      event.created_at,
      event.kind,
      event.content,
      "[]",
      event.sig,
      1
    );

    // Create update event
    const updateEvent = finalizeEvent(
      {
        kind: 1,
        created_at: Math.floor(Date.now() / 1000),
        tags: [],
        content: "Updated post",
        pubkey: pk,
      },
      sk
    );

    // Update the post
    await expect(
      etchV1.updatePost(
        1, // tokenId
        "https://example.com/updated.json",
        `0x${updateEvent.id}`,
        `0x${updateEvent.pubkey}`,
        updateEvent.created_at,
        updateEvent.kind,
        updateEvent.content,
        "[]",
        updateEvent.sig
      )
    )
      .to.emit(etchV1, "PubEvent")
      .withArgs(
        `0x${updateEvent.id}`,
        `0x${updateEvent.pubkey}`,
        updateEvent.created_at,
        updateEvent.kind,
        updateEvent.content,
        "[]",
        updateEvent.sig
      );

    expect(await etchV1.uri(1)).to.equal("https://example.com/updated.json");
  });

  it("Should not update non-existent post", async function () {
    const event = finalizeEvent(
      {
        kind: 1,
        created_at: Math.floor(Date.now() / 1000),
        tags: [],
        content: "Update non-existent",
        pubkey: pk,
      },
      sk
    );

    await expect(
      etchV1.updatePost(
        999, // non-existent tokenId
        "https://example.com/nonexistent.json",
        `0x${event.id}`,
        `0x${event.pubkey}`,
        event.created_at,
        event.kind,
        event.content,
        "[]",
        event.sig
      )
    ).to.be.revertedWith("Post does not exist");
  });

  it("Should revert when non-minter tries to create or update post", async function () {
    const event = finalizeEvent(
      {
        kind: 1,
        created_at: Math.floor(Date.now() / 1000),
        tags: [],
        content: "Unauthorized post",
        pubkey: pk,
      },
      sk
    );

    const etchV1_addr1 = etchV1.connect(addr1);

    await expect(
      etchV1_addr1.createPost(
        addr1.address, // non-minter trying to mint to self
        "https://example.com/unauthorized.json",
        1,
        `0x${event.id}`,
        `0x${event.pubkey}`,
        event.created_at,
        event.kind,
        event.content,
        "[]",
        event.sig,
        1
      )
    )
      .to.be.revertedWithCustomError(etchV1, "AccessControlUnauthorizedAccount")
      .withArgs(addr1.address, MINTER_ROLE);

    // First create a post as owner
    await etchV1.createPost(
      owner.address, // mint to owner
      "https://example.com/owner.json",
      1,
      `0x${event.id}`,
      `0x${event.pubkey}`,
      event.created_at,
      event.kind,
      event.content,
      "[]",
      event.sig,
      1
    );

    // Try to update as non-minter
    await expect(
      etchV1_addr1.updatePost(
        1,
        "https://example.com/unauthorized-update.json",
        `0x${event.id}`,
        `0x${event.pubkey}`,
        event.created_at,
        event.kind,
        event.content,
        "[]",
        event.sig
      )
    )
      .to.be.revertedWithCustomError(etchV1, "AccessControlUnauthorizedAccount")
      .withArgs(addr1.address, MINTER_ROLE);
  });

  it("Should allow minter to create and update posts", async function () {
    // Grant MINTER_ROLE to addr1
    await etchV1.grantRole(MINTER_ROLE, addr1.address);

    const event = finalizeEvent(
      {
        kind: 1,
        created_at: Math.floor(Date.now() / 1000),
        tags: [],
        content: "Authorized post",
        pubkey: pk,
      },
      sk
    );

    const etchV1_addr1 = etchV1.connect(addr1);

    // Create post as minter
    await etchV1_addr1.createPost(
      addr1.address, // authorized minter minting to self
      "https://example.com/authorized.json",
      1,
      `0x${event.id}`,
      `0x${event.pubkey}`,
      event.created_at,
      event.kind,
      event.content,
      "[]",
      event.sig,
      1
    );

    expect(await etchV1.balanceOf(addr1.address, 1)).to.equal(1);

    // Update post as minter
    await etchV1_addr1.updatePost(
      1,
      "https://example.com/authorized-update.json",
      `0x${event.id}`,
      `0x${event.pubkey}`,
      event.created_at,
      event.kind,
      event.content,
      "[]",
      event.sig
    );

    expect(await etchV1.uri(1)).to.equal(
      "https://example.com/authorized-update.json"
    );
  });

  it("Should emit PubEvent when creating a post", async function () {
    const event = finalizeEvent(
      {
        kind: 1,
        created_at: Math.floor(Date.now() / 1000),
        tags: [],
        content: "Test post for event emission",
        pubkey: pk,
      },
      sk
    );

    await expect(
      etchV1.createPost(
        owner.address, // mint to owner
        "https://example.com/event-test.json",
        1,
        `0x${event.id}`,
        `0x${event.pubkey}`,
        event.created_at,
        event.kind,
        event.content,
        "[]",
        event.sig,
        1
      )
    )
      .to.emit(etchV1, "PubEvent")
      .withArgs(
        `0x${event.id}`,
        `0x${event.pubkey}`,
        event.created_at,
        event.kind,
        event.content,
        "[]",
        event.sig
      );
  });

  it("Should emit PubEvent when updating a post", async function () {
    // First create a post
    const createEvent = finalizeEvent(
      {
        kind: 1,
        created_at: Math.floor(Date.now() / 1000),
        tags: [],
        content: "Original post",
        pubkey: pk,
      },
      sk
    );

    await etchV1.createPost(
      owner.address, // mint to owner
      "https://example.com/original.json",
      1,
      `0x${createEvent.id}`,
      `0x${createEvent.pubkey}`,
      createEvent.created_at,
      createEvent.kind,
      createEvent.content,
      "[]",
      createEvent.sig,
      1
    );

    // Create update event
    const updateEvent = finalizeEvent(
      {
        kind: 1,
        created_at: Math.floor(Date.now() / 1000),
        tags: [],
        content: "Updated content",
        pubkey: pk,
      },
      sk
    );

    // Verify update event emission
    await expect(
      etchV1.updatePost(
        1,
        "https://example.com/updated.json",
        `0x${updateEvent.id}`,
        `0x${updateEvent.pubkey}`,
        updateEvent.created_at,
        updateEvent.kind,
        updateEvent.content,
        "[]",
        updateEvent.sig
      )
    )
      .to.emit(etchV1, "PubEvent")
      .withArgs(
        `0x${updateEvent.id}`,
        `0x${updateEvent.pubkey}`,
        updateEvent.created_at,
        updateEvent.kind,
        updateEvent.content,
        "[]",
        updateEvent.sig
      );
  });

  it("Should mint token to specified address", async function () {
    const event = finalizeEvent(
      {
        kind: 1,
        created_at: Math.floor(Date.now() / 1000),
        tags: [],
        content: "Mint to different address",
        pubkey: pk,
      },
      sk
    );

    // Create post and mint to addr1's address
    await etchV1.createPost(
      addr1.address, // mint to addr1 instead of sender
      "https://example.com/different-address.json",
      1,
      `0x${event.id}`,
      `0x${event.pubkey}`,
      event.created_at,
      event.kind,
      event.content,
      "[]",
      event.sig,
      1
    );

    // Check that addr1 received the token
    expect(await etchV1.balanceOf(addr1.address, 1)).to.equal(1);
    // Check that sender (owner) did not receive the token
    expect(await etchV1.balanceOf(owner.address, 1)).to.equal(0);
    // Verify URI is still set correctly
    expect(await etchV1.uri(1)).to.equal(
      "https://example.com/different-address.json"
    );
  });

  it("Should control multiple minting with setAllowMultiple", async function () {
    const event = finalizeEvent(
      {
        kind: 1,
        created_at: Math.floor(Date.now() / 1000),
        tags: [],
        content: "Multiple mint test",
        pubkey: pk,
      },
      sk
    );

    // First mint should succeed
    await etchV1.createPost(
      owner.address,
      "https://example.com/multi.json",
      1,
      `0x${event.id}`,
      `0x${event.pubkey}`,
      event.created_at,
      event.kind,
      event.content,
      "[]",
      event.sig,
      1
    );

    // Second mint should fail by default
    await expect(
      etchV1.createPost(
        owner.address,
        "https://example.com/multi.json",
        1,
        `0x${event.id}`,
        `0x${event.pubkey}`,
        event.created_at,
        event.kind,
        event.content,
        "[]",
        event.sig,
        1
      )
    ).to.be.revertedWith("Token already exists");

    // Enable multiple minting for tokenId 1
    await etchV1.setAllowMultiple(1, true);

    // Now second mint should succeed
    await etchV1.createPost(
      owner.address,
      "https://example.com/multi.json",
      1,
      `0x${event.id}`,
      `0x${event.pubkey}`,
      event.created_at,
      event.kind,
      event.content,
      "[]",
      event.sig,
      1
    );

    expect(await etchV1.balanceOf(owner.address, 1)).to.equal(2);
  });

  it("Should only allow MINTER_ROLE to set allowMultiple", async function () {
    const etchV1_addr1 = etchV1.connect(addr1);

    await expect(etchV1_addr1.setAllowMultiple(1, true))
      .to.be.revertedWithCustomError(etchV1, "AccessControlUnauthorizedAccount")
      .withArgs(addr1.address, MINTER_ROLE);
  });
});
