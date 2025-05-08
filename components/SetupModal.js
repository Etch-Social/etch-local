import { useState } from "react";
import { ethers } from "ethers";
import { useWallet } from "../contexts/WalletContext";

const SetupModal = ({ isOpen, onClose, onSetupComplete }) => {
  const { connectWallet, isConnecting, error: walletError } = useWallet();
  const [arweaveKey, setArweaveKey] = useState("");
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployError, setDeployError] = useState(null);
  const [deployedAddress, setDeployedAddress] = useState(null);

  const handleArweaveKeyChange = (e) => {
    setArweaveKey(e.target.value);
  };

  const saveArweaveKey = () => {
    try {
      // Validate that it's valid JSON
      const parsedKey = JSON.parse(arweaveKey);
      localStorage.setItem("arweaveJwk", arweaveKey);
      return true;
    } catch (err) {
      alert("Invalid Arweave key format. Please enter valid JSON.");
      return false;
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
      // Get the contract factory
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();

      // Import the contract ABI and bytecode
      const EtchV1 = await ethers.getContractFactory("EtchV1", signer);

      // Deploy the contract
      const contract = await EtchV1.deploy();
      await contract.deployed();

      // Save the contract address to localStorage
      localStorage.setItem("CONTRACT_ADDRESS", contract.address);
      setDeployedAddress(contract.address);

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
    if (saveArweaveKey()) {
      onSetupComplete();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <h2 className="text-2xl font-bold mb-4">Setup Required</h2>

        <div className="space-y-4">
          {/* Wallet Connection Section */}
          <div className="border-b pb-4">
            <h3 className="font-medium mb-2">1. Connect Wallet</h3>
            <button
              onClick={connectWallet}
              disabled={isConnecting}
              className="btn w-full"
            >
              {isConnecting ? "Connecting..." : "Connect Wallet"}
            </button>
            {walletError && (
              <p className="text-red-500 text-sm mt-1">{walletError}</p>
            )}
          </div>

          {/* Arweave Key Section */}
          <div className="border-b pb-4">
            <h3 className="font-medium mb-2">2. Arweave Key</h3>
            <textarea
              value={arweaveKey}
              onChange={handleArweaveKeyChange}
              placeholder="Paste your Arweave JWK here"
              className="input min-h-[100px]"
            />
          </div>

          {/* Contract Deployment Section */}
          <div className="border-b pb-4">
            <h3 className="font-medium mb-2">3. Deploy Contract</h3>
            <button
              onClick={deployContract}
              disabled={isDeploying}
              className="btn w-full bg-green-500 hover:bg-green-600"
            >
              {isDeploying ? "Deploying..." : "Deploy Contract"}
            </button>
            {deployError && (
              <p className="text-red-500 text-sm mt-1">{deployError}</p>
            )}
            {deployedAddress && (
              <p className="text-green-500 text-sm mt-1">
                Contract deployed at: {deployedAddress}
              </p>
            )}
          </div>

          {/* Complete Setup Button */}
          <div className="flex justify-end space-x-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
            <button onClick={handleComplete} className="btn">
              Complete Setup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SetupModal;
