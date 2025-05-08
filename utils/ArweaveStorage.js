import Arweave from "arweave";

class ArweaveStorage {
  constructor(jwkJson) {
    this.arweave = Arweave.init({
      host: "arweave.net",
      port: 443,
      protocol: "https",
    });

    // Parse JWK if it's a string
    this.jwk = typeof jwkJson === "string" ? JSON.parse(jwkJson) : jwkJson;
  }

  async uploadImage(file) {
    try {
      // Convert file to ArrayBuffer
      const buffer = await file.arrayBuffer();

      // Create transaction
      const transaction = await this.arweave.createTransaction(
        {
          data: buffer,
        },
        this.jwk
      );

      // Set content type based on file type
      transaction.addTag("Content-Type", file.type);

      // Sign transaction
      await this.arweave.transactions.sign(transaction, this.jwk);

      // Submit transaction
      const response = await this.arweave.transactions.post(transaction);

      if (response.status === 200 || response.status === 202) {
        return {
          id: transaction.id,
          url: `https://arweave.net/${transaction.id}`,
          status: "success",
        };
      } else {
        throw new Error(`Transaction failed with status ${response.status}`);
      }
    } catch (error) {
      console.error("Arweave upload error:", error);
      throw error;
    }
  }

  async uploadImages(files) {
    if (!files || files.length === 0) {
      return [];
    }

    const uploadPromises = files.map((file) => this.uploadImage(file));
    return Promise.all(uploadPromises);
  }

  async uploadMetadata(postContent, imageUrls) {
    const metadata = {
      content: postContent,
      images: imageUrls,
      timestamp: Date.now(),
      version: "1.0",
    };

    try {
      // Create transaction with the metadata
      const transaction = await this.arweave.createTransaction(
        {
          data: JSON.stringify(metadata),
        },
        this.jwk
      );

      // Set content type for JSON
      transaction.addTag("Content-Type", "application/json");
      transaction.addTag("App-Name", "EtchLocal");
      transaction.addTag("Type", "post-metadata");

      // Sign transaction
      await this.arweave.transactions.sign(transaction, this.jwk);

      // Submit transaction
      const response = await this.arweave.transactions.post(transaction);

      if (response.status === 200 || response.status === 202) {
        return {
          id: transaction.id,
          url: `https://arweave.net/${transaction.id}`,
          status: "success",
        };
      } else {
        throw new Error(
          `Metadata transaction failed with status ${response.status}`
        );
      }
    } catch (error) {
      console.error("Arweave metadata upload error:", error);
      throw error;
    }
  }
}

export default ArweaveStorage;
