import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { useWallet } from "../contexts/WalletContext";
import EtchV1Bytecode from "../artifacts/contracts/EtchV1.sol/EtchV1.json";
import { generateSecretKey } from "nostr-tools/pure";

const SetupModal = ({ isOpen, onClose, onSetupComplete }) => {
  const {
    connectWallet,
    isConnecting,
    error: walletError,
    account,
    chainId,
  } = useWallet();
  const [arweaveKey, setArweaveKey] = useState("");
  const [privateKey, setPrivateKey] = useState("");
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployError, setDeployError] = useState(null);
  const [deployedAddress, setDeployedAddress] = useState(null);
  const [saveStatus, setSaveStatus] = useState(null);
  const [privateKeySaveStatus, setPrivateKeySaveStatus] = useState(null);
  const [isSwitchingNetwork, setIsSwitchingNetwork] = useState(false);
  const [currentChainId, setCurrentChainId] = useState(null);
  const [existingContractAddress, setExistingContractAddress] = useState(null);

  // Load saved Arweave key and contract address on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load Arweave key
        const keyResponse = await fetch("/api/getArweaveKey");
        if (keyResponse.ok) {
          const data = await keyResponse.json();
          if (data.key) {
            setArweaveKey(data.key);
          }
        }

        // Load private key
        const privateKeyResponse = await fetch("/api/getPrivateKey");
        if (privateKeyResponse.ok) {
          const data = await privateKeyResponse.json();
          if (data.key) {
            setPrivateKey(data.key);
          }
        }

        // Load existing contract address
        const contractAddress =
          process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ||
          localStorage.getItem("CONTRACT_ADDRESS");
        if (contractAddress) {
          setExistingContractAddress(contractAddress);
        }
      } catch (err) {
        console.error("Error loading data:", err);
      }
    };
    loadData();
  }, []);

  // Monitor chainId changes
  useEffect(() => {
    if (window.ethereum) {
      const checkChainId = async () => {
        try {
          const id = await window.ethereum.request({ method: "eth_chainId" });
          setCurrentChainId(id);
        } catch (err) {
          console.error("Error checking chainId:", err);
        }
      };

      // Check immediately
      checkChainId();

      // Set up listener for chain changes
      window.ethereum.on("chainChanged", checkChainId);

      return () => {
        window.ethereum.removeListener("chainChanged", checkChainId);
      };
    }
  }, []);

  const handleArweaveKeyChange = (e) => {
    setArweaveKey(e.target.value);
    setSaveStatus(null); // Clear save status when key changes
  };

  const handlePrivateKeyChange = (e) => {
    setPrivateKey(e.target.value);
    setPrivateKeySaveStatus(null);
  };

  const generatePrivateKey = () => {
    const newKey = generateSecretKey();
    // key should be in hex format
    setPrivateKey(Buffer.from(newKey).toString("hex"));
    setPrivateKeySaveStatus(null);
  };

  const savePrivateKey = async () => {
    try {
      const response = await fetch("/api/savePrivateKey", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ key: privateKey }),
      });

      if (!response.ok) {
        throw new Error("Failed to save private key");
      }

      setPrivateKeySaveStatus("success");
      return true;
    } catch (err) {
      setPrivateKeySaveStatus("error");
      alert("Failed to save private key. Please try again.");
      return false;
    }
  };

  const isOnBaseNetwork =
    currentChainId === "0x2105" || currentChainId === "0x14a33"; // BASE mainnet or testnet

  const handleConnectWallet = async () => {
    setIsSwitchingNetwork(true);
    try {
      await connectWallet();
    } finally {
      setIsSwitchingNetwork(false);
    }
  };

  const saveArweaveKey = async () => {
    try {
      // Validate that it's valid JSON
      JSON.parse(arweaveKey);

      // Save to project root via API
      const response = await fetch("/api/saveArweaveKey", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ key: arweaveKey }),
      });

      if (!response.ok) {
        throw new Error("Failed to save key to project root");
      }

      setSaveStatus("success");
      return true;
    } catch (err) {
      setSaveStatus("error");
      alert(
        "Invalid Arweave key format or failed to save. Please enter valid JSON."
      );
      return false;
    }
  };

  const handleSaveKey = async () => {
    await saveArweaveKey();
  };

  const deployContract = async () => {
    if (!window.ethereum) {
      setDeployError("Please install MetaMask to deploy the contract");
      return;
    }

    setIsDeploying(true);
    setDeployError(null);

    try {
      // Get the provider and signer
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();

      // Contract ABI and bytecode
      const contractABI = [
        "function createPost(address toAddress, string memory url, uint256 tokenId, bytes32 id, bytes32 pubkey, uint256 created_at, uint32 kind, string memory content, string memory tags, string memory sig, uint256 quantity) public",
        "function updatePost(uint256 tokenId, string memory newUrl, bytes32 id, bytes32 pubkey, uint256 created_at, uint32 kind, string memory content, string memory tags, string memory sig) public",
        "function uri(uint256 tokenId) public view returns (string memory)",
        "function totalPosts() external view returns (uint256)",
        "function totalSupply(uint256 id) public view returns (uint256)",
        "function setAllowMultiple(uint256 tokenId, bool allow) public",
      ];

      // Deploy the contract using the factory
      const factory = new ethers.ContractFactory(
        contractABI,
        EtchV1Bytecode.bytecode,
        signer
      );
      const contract = await factory.deploy();
      await contract.deployed();

      // Save the contract address to localStorage
      localStorage.setItem("CONTRACT_ADDRESS", contract.address);
      setDeployedAddress(contract.address);
      setExistingContractAddress(contract.address);

      // Save the contract address to the backend
      const response = await fetch("/api/saveContractAddress", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ address: contract.address }),
      });

      if (!response.ok) {
        throw new Error("Failed to save contract address to backend");
      }

      // Reload the page to pick up the new contract address
      window.location.reload();
    } catch (err) {
      console.error("Error deploying contract:", err);
      setDeployError(err.message || "Failed to deploy contract");
    } finally {
      setIsDeploying(false);
    }
  };

  const handleComplete = () => {
    onSetupComplete();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <h2 className="text-2xl font-bold mb-4">Setup Required</h2>

        <div className="space-y-4">
          {/* Wallet Connection Section */}
          <div className="border-b pb-4">
            <h3 className="font-medium mb-2">
              1. Connect Wallet (Base for now)
            </h3>
            {account ? (
              <div className="text-sm text-gray-600 mb-2">
                Connected: {account.substring(0, 6)}...
                {account.substring(account.length - 4)}
              </div>
            ) : (
              <button
                onClick={handleConnectWallet}
                disabled={isConnecting || isSwitchingNetwork}
                className="btn w-full"
              >
                {isSwitchingNetwork
                  ? "Switching to BASE Network..."
                  : isConnecting
                  ? "Connecting..."
                  : isOnBaseNetwork
                  ? "Connect Wallet"
                  : "Switch to Base Network"}
              </button>
            )}
            {walletError && (
              <p className="text-red-500 text-sm mt-1">{walletError}</p>
            )}
          </div>

          {/* Private Key Section */}
          <div className="border-b pb-4">
            <h3 className="font-medium mb-2">2. Nostr Private Key</h3>
            <textarea
              value={privateKey}
              onChange={handlePrivateKeyChange}
              placeholder="Enter your Nostr private key"
              className="input min-h-[100px] mb-2"
            />
            <div className="flex items-center justify-between">
              <div className="space-x-2">
                <button
                  onClick={savePrivateKey}
                  className="btn bg-blue-500 hover:bg-blue-600"
                >
                  Save
                </button>
                <button
                  onClick={generatePrivateKey}
                  className="btn bg-green-500 hover:bg-green-600"
                >
                  Generate
                </button>
              </div>
              {privateKeySaveStatus === "success" && (
                <span className="text-green-500 text-sm">
                  Key saved successfully!
                </span>
              )}
              {privateKeySaveStatus === "error" && (
                <span className="text-red-500 text-sm">Failed to save key</span>
              )}
            </div>
          </div>

          {/* Arweave Key Section */}
          <div className="border-b pb-4">
            <h3 className="font-medium mb-2">
              3. Arweave Key{" "}
              <a
                href="https://arweave.app/"
                target="_blank"
                rel="noopener noreferrer"
              >
                (https://arweave.app/)
              </a>
            </h3>
            <textarea
              value={arweaveKey}
              onChange={handleArweaveKeyChange}
              placeholder="Paste your Arweave JWK here. Example: {d:xyx...very long ...qi:xyx}"
              className="input min-h-[100px] mb-2"
            />
            <div className="flex items-center justify-between">
              <button
                onClick={handleSaveKey}
                className="btn bg-blue-500 hover:bg-blue-600"
              >
                Save Key
              </button>
              {saveStatus === "success" && (
                <span className="text-green-500 text-sm">
                  Key saved successfully!
                </span>
              )}
              {saveStatus === "error" && (
                <span className="text-red-500 text-sm">Invalid key format</span>
              )}
            </div>
          </div>

          {/* Contract Deployment Section */}
          <div className="border-b pb-4">
            <h3 className="font-medium mb-2">4. Deploy Contract</h3>
            {existingContractAddress ? (
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">
                  Existing contract address:
                </p>
                <p className="text-sm font-mono bg-gray-100 p-2 rounded">
                  {existingContractAddress}
                </p>
              </div>
            ) : null}
            <button
              onClick={deployContract}
              disabled={isDeploying}
              className="btn w-full bg-green-500 hover:bg-green-600"
            >
              {isDeploying
                ? "Deploying..."
                : existingContractAddress
                ? "Deploy New Contract"
                : "Deploy Contract"}
            </button>
            {deployError && (
              <p className="text-red-500 text-sm mt-1">{deployError}</p>
            )}
            {deployedAddress && (
              <div className="mt-2">
                <p className="text-green-500 text-sm">
                  Contract deployed successfully!
                </p>
                <p className="text-sm font-mono bg-gray-100 p-2 rounded mt-1">
                  {deployedAddress}
                </p>
              </div>
            )}
          </div>

          {/* Complete Setup Button */}
          <div className="flex justify-end">
            <button
              onClick={handleComplete}
              disabled={!account || !existingContractAddress}
              className={`btn ${
                !account || !existingContractAddress
                  ? "opacity-50 cursor-not-allowed"
                  : ""
              }`}
            >
              Complete Setup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SetupModal;
