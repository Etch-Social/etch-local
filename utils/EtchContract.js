import { ethers } from "ethers";

const EtchV1ABI = [
  // Events
  "event PubEvent(bytes32 id, bytes32 indexed pubkey, uint256 created_at, uint32 indexed kind, string content, string tags, string sig)",

  // Functions
  "function createPost(address toAddress, string memory url, uint256 tokenId, bytes32 id, bytes32 pubkey, uint256 created_at, uint32 kind, string memory content, string memory tags, string memory sig, uint256 quantity) public",
  "function updatePost(uint256 tokenId, string memory newUrl, bytes32 id, bytes32 pubkey, uint256 created_at, uint32 kind, string memory content, string memory tags, string memory sig) public",
  "function uri(uint256 tokenId) public view returns (string memory)",
  "function totalPosts() external view returns (uint256)",
  "function totalSupply(uint256 id) public view returns (uint256)",
  "function setAllowMultiple(uint256 tokenId, bool allow) public",
];

class EtchContract {
  constructor(contractAddress, provider) {
    this.contractAddress = contractAddress;
    this.provider = provider;
    this.contract = new ethers.Contract(contractAddress, EtchV1ABI, provider);
  }

  async connect(signer) {
    this.contract = this.contract.connect(signer);
    return this;
  }

  async createPost(
    toAddress,
    url,
    tokenId,
    id,
    pubkey,
    createdAt,
    kind,
    content,
    tags,
    sig,
    quantity = 1
  ) {
    return this.contract.createPost(
      toAddress,
      url,
      tokenId,
      id,
      pubkey,
      createdAt,
      kind,
      content,
      tags,
      sig,
      quantity
    );
  }

  async updatePost(
    tokenId,
    newUrl,
    id,
    pubkey,
    createdAt,
    kind,
    content,
    tags,
    sig
  ) {
    return this.contract.updatePost(
      tokenId,
      newUrl,
      id,
      pubkey,
      createdAt,
      kind,
      content,
      tags,
      sig
    );
  }

  async totalPosts() {
    return this.contract.totalPosts();
  }

  async getUri(tokenId) {
    return this.contract.uri(tokenId);
  }

  async getPostEvents() {
    // Get the PubEvent logs
    const filter = this.contract.filters.PubEvent();
    const logs = await this.contract.queryFilter(filter);

    // Get all transactions for these events
    const transactions = await Promise.all(
      logs.map(async (log) => {
        const tx = await log.getTransaction();
        return tx;
      })
    );

    return Promise.all(
      logs.map(async (log, index) => {
        const { id, pubkey, created_at, kind, content, tags, sig } = log.args;
        // Decode the transaction input data to get the tokenId
        const iface = new ethers.utils.Interface(
          this.contract.interface.format()
        );
        const decodedInput = iface.parseTransaction({
          data: transactions[index].data,
          value: transactions[index].value,
        });
        const tokenId = decodedInput.args[2]; // tokenId is the third argument in createPost

        // Get the token URI for this token
        const tokenUri = await this.contract.uri(tokenId);

        return {
          id: id.startsWith("0x") ? id.slice(2) : id,
          pubkey: pubkey.startsWith("0x") ? pubkey.slice(2) : pubkey,
          createdAt: created_at.toString(),
          kind: kind.toString(),
          content,
          tags,
          sig,
          tokenId: tokenId.toString(),
          tokenUri, // Add the token URI to the returned data
          transactionHash: transactions[index].hash,
          contractAddress: this.contractAddress,
        };
      })
    );
  }
}

export default EtchContract;
