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

  async uploadManifest(data, contentType, extension) {
    const manifest = {
      manifest: "arweave/paths",
      version: "0.1.0",
      paths: {
        [`index.${extension}`]: {
          id: "", // Will be filled after upload
          contentType: contentType,
        },
      },
    };

    // Create transaction for the data
    const dataTransaction = await this.arweave.createTransaction(
      {
        data: data,
      },
      this.jwk
    );

    // Set content type
    dataTransaction.addTag("Content-Type", contentType);
    dataTransaction.addTag("App-Name", "EtchLocal");

    // Sign and post data transaction
    await this.arweave.transactions.sign(dataTransaction, this.jwk);
    const dataResponse = await this.arweave.transactions.post(dataTransaction);

    if (dataResponse.status !== 200 && dataResponse.status !== 202) {
      throw new Error(
        `Data transaction failed with status ${dataResponse.status}`
      );
    }

    // Update manifest with the data transaction ID
    manifest.paths[`index.${extension}`].id = dataTransaction.id;

    // Create transaction for the manifest
    const manifestTransaction = await this.arweave.createTransaction(
      {
        data: JSON.stringify(manifest),
      },
      this.jwk
    );

    // Set manifest content type
    manifestTransaction.addTag(
      "Content-Type",
      "application/x.arweave-manifest+json"
    );
    manifestTransaction.addTag("App-Name", "EtchLocal");

    // Sign and post manifest transaction
    await this.arweave.transactions.sign(manifestTransaction, this.jwk);
    const manifestResponse = await this.arweave.transactions.post(
      manifestTransaction
    );

    if (manifestResponse.status !== 200 && manifestResponse.status !== 202) {
      throw new Error(
        `Manifest transaction failed with status ${manifestResponse.status}`
      );
    }

    // Return the full path URL that includes the manifest ID and file extension
    return {
      id: manifestTransaction.id,
      url: `https://arweave.net/${manifestTransaction.id}/index.${extension}`,
      dataId: dataTransaction.id,
      dataUrl: `https://arweave.net/${dataTransaction.id}`,
      status: "success",
    };
  }

  async uploadImage(file) {
    if (!file) {
      return null;
    }

    try {
      // Convert file to ArrayBuffer
      const buffer = await file.arrayBuffer();

      // Get file extension from type
      const extension = file.type.split("/")[1] || "bin";

      // Upload with manifest
      return await this.uploadManifest(buffer, file.type, extension);
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

  async uploadMetadata(postContent, imageUrl, tags, pubkey, event) {
    // Create proper NFT metadata format
    const _description = postContent;
    const _imageUrl =
      imageUrl ||
      "https://arweave.net/dWPZeOyiaD4h7CUpVKnnjAVPhEOrf5kk2Blg_YRBWuQ";

    // if tags are a string then json parse them
    let _tags = tags;
    if (typeof tags === "string") {
      _tags = JSON.parse(tags);
    }

    // tags is an array of arrays. For each array we need to take the first element and join the rest into a string
    let _attributes = _tags.map((tag) => {
      return { trait_type: tag[0], value: tag.slice(1).join(", ") };
    });

    // Add kind, sig, id, pubkey, created_at, and content to _attributes
    _attributes.push({ trait_type: "kind", value: event.kind });
    _attributes.push({ trait_type: "sig", value: event.sig });
    _attributes.push({ trait_type: "id", value: event.id });
    _attributes.push({ trait_type: "pubkey", value: event.pubkey });
    _attributes.push({ trait_type: "created_at", value: event.created_at });
    _attributes.push({ trait_type: "content", value: event.content });

    let metadata = {
      name: `${pubkey}-${Date.now().toString()}-${postContent.slice(0, 10)}`,
      description: _description,
      attributes: _attributes,
      image: _imageUrl,
    };

    try {
      // Upload metadata with manifest
      return await this.uploadManifest(
        JSON.stringify(metadata),
        "application/json",
        "json"
      );
    } catch (error) {
      console.error("Arweave metadata upload error:", error);
      throw error;
    }
  }
}

export default ArweaveStorage;
