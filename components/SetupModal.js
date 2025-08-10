import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { useWallet } from "../contexts/WalletContext";
import EtchV1Bytecode from "../artifacts/contracts/EtchV1.sol/EtchV1.json";
import { generateSecretKey } from "nostr-tools/pure";
import { apiCall, getContractAddress } from "../utils/StaticModeHelper";

const SetupModal = ({ isOpen, onClose, onSetupComplete }) => {
  const {
    connectWallet,
    connectAccountsOnly,
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
  const [existingContractAddress, setExistingContractAddress] = useState(null);
  const [contractAddressInput, setContractAddressInput] = useState("");
  const [contractSaveStatus, setContractSaveStatus] = useState(null);

  // Load saved Arweave key and contract address on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load Arweave key
        const keyResponse = await apiCall("/api/getArweaveKey");
        if (keyResponse.ok) {
          const data = await keyResponse.json();
          if (data.key) {
            setArweaveKey(data.key);
          }
        }

        // Load private key
        const privateKeyResponse = await apiCall("/api/getPrivateKey");
        if (privateKeyResponse.ok) {
          const data = await privateKeyResponse.json();
          if (data.key) {
            setPrivateKey(data.key);
          }
        }

        // Load existing contract address
        const contractAddress = getContractAddress();
        if (contractAddress) {
          setExistingContractAddress(contractAddress);
        }
      } catch (err) {
        console.error("Error loading data:", err);
      }
    };
    loadData();
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
      const response = await apiCall("/api/savePrivateKey", {
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
    chainId === "0x2105" ||
    chainId === "0x14a33" || // BASE mainnet or testnet (hex)
    chainId === 8453 ||
    chainId === 84532; // BASE mainnet or testnet (decimal)

  const handleConnectWallet = async () => {
    setIsSwitchingNetwork(true);
    console.log("SetupModal: Starting wallet connection...");
    console.log("SetupModal: Current chainId:", chainId);
    console.log("SetupModal: Is on Base network:", isOnBaseNetwork);
    try {
      // Just connect accounts, don't do network switching yet
      await connectAccountsOnly();
      console.log("SetupModal: Wallet connection completed");
    } catch (error) {
      console.error("SetupModal: Wallet connection failed:", error);
    } finally {
      setIsSwitchingNetwork(false);
    }
  };

  const handleSwitchNetwork = async () => {
    setIsSwitchingNetwork(true);
    console.log("SetupModal: Starting network switch...");
    try {
      await connectWallet(); // This will handle network switching
      console.log("SetupModal: Network switch completed");
    } catch (error) {
      console.error("SetupModal: Network switch failed:", error);
    } finally {
      setIsSwitchingNetwork(false);
    }
  };

  const saveArweaveKey = async () => {
    try {
      // Allow empty key (for deletion), otherwise validate JSON
      if (arweaveKey.trim() !== "") {
        JSON.parse(arweaveKey);
      }

      // Save to project root via API
      const response = await apiCall("/api/saveArweaveKey", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ key: arweaveKey.trim() }),
      });

      if (!response.ok) {
        throw new Error("Failed to save key to project root");
      }

      setSaveStatus("success");
      // Update success message based on whether key was saved or removed
      if (arweaveKey.trim() === "") {
        setSaveStatus("removed");
      } else {
        setSaveStatus("success");
      }
      return true;
    } catch (err) {
      setSaveStatus("error");
      alert(
        "Invalid Arweave key format or failed to save. Please enter valid JSON or leave empty to remove the key."
      );
      return false;
    }
  };

  const handleSaveKey = async () => {
    await saveArweaveKey();
  };

  const handleContractAddressChange = (e) => {
    setContractAddressInput(e.target.value);
    setContractSaveStatus(null);
  };

  const saveContractAddress = async () => {
    if (!contractAddressInput.trim()) {
      setContractSaveStatus("error");
      alert("Please enter a contract address");
      return;
    }

    // Basic validation for Ethereum address format
    if (!ethers.utils.isAddress(contractAddressInput.trim())) {
      setContractSaveStatus("error");
      alert("Please enter a valid Ethereum address");
      return;
    }

    try {
      const address = contractAddressInput.trim();

      // Save to localStorage
      localStorage.setItem("CONTRACT_ADDRESS", address);
      setExistingContractAddress(address);

      // Save to backend
      const response = await apiCall("/api/saveContractAddress", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ address }),
      });

      if (!response.ok) {
        throw new Error("Failed to save contract address to backend");
      }

      setContractSaveStatus("success");
      setContractAddressInput(""); // Clear the input after successful save
    } catch (err) {
      console.error("Error saving contract address:", err);
      setContractSaveStatus("error");
      alert("Failed to save contract address. Please try again.");
    }
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
      const response = await apiCall("/api/saveContractAddress", {
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
              1. Connect Wallet & Switch to Base Network
            </h3>

            {/* Step 1: Connect Wallet */}
            {!account ? (
              <div className="mb-3">
                <p className="text-sm text-gray-600 mb-2">
                  First, connect your MetaMask wallet:
                </p>
                <button
                  onClick={handleConnectWallet}
                  disabled={isConnecting || isSwitchingNetwork}
                  className="btn w-full bg-blue-500 hover:bg-blue-600"
                >
                  {isSwitchingNetwork || isConnecting
                    ? "Connecting..."
                    : "Connect Wallet"}
                </button>
              </div>
            ) : (
              <div className="mb-3">
                <p className="text-sm text-green-600 mb-1">
                  ✓ Wallet Connected
                </p>
                <p className="text-sm text-gray-600">
                  {account.substring(0, 6)}...
                  {account.substring(account.length - 4)}
                </p>
              </div>
            )}

            {/* Step 2: Switch Network (only show if wallet is connected) */}
            {account && !isOnBaseNetwork && (
              <div className="mb-3">
                <p className="text-sm text-gray-600 mb-2">
                  Now switch to Base network:
                </p>
                <button
                  onClick={handleSwitchNetwork}
                  disabled={isSwitchingNetwork}
                  className="btn w-full bg-orange-500 hover:bg-orange-600"
                >
                  {isSwitchingNetwork
                    ? "Switching to BASE Network..."
                    : "Switch to Base Network"}
                </button>
              </div>
            )}

            {/* Success state */}
            {account && isOnBaseNetwork && (
              <div className="mb-3">
                <p className="text-sm text-green-600">
                  ✓ Connected to Base Network
                </p>
              </div>
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
              3. Arweave Key (Optional){" "}
              <a
                href="https://arweave.app/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:text-blue-600"
              >
                Get one here
              </a>
            </h3>
            <p className="text-sm text-gray-600 mb-2">
              Required only if you want to attach images to your posts. You can
              skip this step and add it later. Leave empty to remove an existing
              key.
            </p>
            <textarea
              value={arweaveKey}
              onChange={handleArweaveKeyChange}
              placeholder="Paste your Arweave JWK here (Example: {d:xyx...very long ...qi:xyx})"
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
              {saveStatus === "removed" && (
                <span className="text-green-500 text-sm">
                  Key removed successfully!
                </span>
              )}
              {saveStatus === "error" && (
                <span className="text-red-500 text-sm">Invalid key format</span>
              )}
            </div>
          </div>

          {/* Contract Deployment Section */}
          <div className="border-b pb-4">
            <h3 className="font-medium mb-2">4. Contract Setup</h3>
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

            {/* Manual Contract Address Entry */}
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">
                Enter existing contract address:
              </p>
              <div className="flex items-center space-x-2 mb-2">
                <input
                  type="text"
                  value={contractAddressInput}
                  onChange={handleContractAddressChange}
                  placeholder="0x..."
                  className="input flex-grow"
                />
                <button
                  onClick={saveContractAddress}
                  className="btn bg-blue-500 hover:bg-blue-600"
                >
                  Save
                </button>
              </div>
              {contractSaveStatus === "success" && (
                <p className="text-green-500 text-sm">
                  Address saved successfully!
                </p>
              )}
              {contractSaveStatus === "error" && (
                <p className="text-red-500 text-sm">Invalid address</p>
              )}
            </div>

            {/* OR Separator */}
            <div className="flex items-center my-4">
              <div className="flex-grow border-t border-gray-300"></div>
              <span className="px-4 text-gray-500 text-sm font-medium">OR</span>
              <div className="flex-grow border-t border-gray-300"></div>
            </div>

            {/* Deploy New Contract */}
            <div>
              <p className="text-sm text-gray-600 mb-2">
                Deploy a new contract:
              </p>
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
            </div>
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
              disabled={
                !account || !existingContractAddress || !isOnBaseNetwork
              }
              className={`btn ${
                !account || !existingContractAddress || !isOnBaseNetwork
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
