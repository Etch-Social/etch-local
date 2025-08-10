import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { ethers } from "ethers";
import EtchContract from "../utils/EtchContract";
import { getContractAddress } from "../utils/StaticModeHelper";

// Create the context
const WalletContext = createContext();

// Export the provider component
export function WalletProvider({ children }) {
  const [account, setAccount] = useState(null);
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [etchContract, setEtchContract] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [networkName, setNetworkName] = useState(null);
  const hasAttemptedAutoConnect = useRef(false);
  const hasInitializedProvider = useRef(false);

  // Initialize providers and get initial chainId
  useEffect(() => {
    const initializeProvider = async () => {
      // Prevent duplicate initialization
      if (hasInitializedProvider.current) {
        console.log("WalletContext: Provider already initialized, skipping");
        return;
      }

      console.log("WalletContext: Starting provider initialization...");
      console.log("WalletContext: window.ethereum:", !!window.ethereum);
      console.log(
        "WalletContext: window.ethereum.isMetaMask:",
        window.ethereum?.isMetaMask
      );
      console.log(
        "WalletContext: window.ethereum.isConnected:",
        window.ethereum?.isConnected?.()
      );

      hasInitializedProvider.current = true;

      if (typeof window !== "undefined" && window.ethereum) {
        try {
          const web3Provider = new ethers.providers.Web3Provider(
            window.ethereum
          );
          setProvider(web3Provider);

          // Wait a bit for MetaMask to be fully loaded
          await new Promise((resolve) => setTimeout(resolve, 200));

          // Use ethers provider to get chainId instead of direct MetaMask calls
          console.log("WalletContext: Getting chainId via ethers provider...");
          try {
            // Add timeout to ethers getNetwork call
            const networkPromise = web3Provider.getNetwork();
            const timeoutPromise = new Promise((_, reject) =>
              setTimeout(
                () => reject(new Error("Ethers getNetwork timed out")),
                5000
              )
            );

            const network = await Promise.race([
              networkPromise,
              timeoutPromise,
            ]);
            console.log("WalletContext: Got network from provider:", network);
            const hexChainId = "0x" + network.chainId.toString(16);
            console.log("WalletContext: ChainId:", hexChainId);
            setChainId(hexChainId);
            setNetworkName(network.name);
          } catch (networkError) {
            console.warn(
              "WalletContext: Ethers getNetwork failed:",
              networkError
            );

            // Fallback to direct MetaMask chainId request
            try {
              console.log(
                "WalletContext: Fallback to direct MetaMask chainId request..."
              );
              const directChainIdPromise = window.ethereum.request({
                method: "eth_chainId",
              });
              const directTimeoutPromise = new Promise((_, reject) =>
                setTimeout(
                  () => reject(new Error("Direct chainId request timed out")),
                  3000
                )
              );

              const directChainId = await Promise.race([
                directChainIdPromise,
                directTimeoutPromise,
              ]);
              console.log(
                "WalletContext: Got chainId from direct request:",
                directChainId
              );
              setChainId(directChainId);
            } catch (directError) {
              console.warn(
                "WalletContext: Direct chainId request also failed:",
                directError
              );
              // Don't fail initialization, just leave chainId as null for now
            }
          }
        } catch (err) {
          console.error("Error initializing Web3Provider:", err);
          setError("Failed to initialize Web3 provider");
        }
      } else {
        console.log("WalletContext: No MetaMask available");
        setError(
          "MetaMask is required to use this application. Please install MetaMask."
        );
      }
    };

    initializeProvider();
  }, []);

  // Initialize contract when provider is ready
  useEffect(() => {
    const contractAddress = getContractAddress();
    if (provider && contractAddress) {
      try {
        const contractInstance = new EtchContract(contractAddress, provider);

        // If we have a signer, connect it immediately
        if (signer) {
          contractInstance.connect(signer);
        }

        setEtchContract(contractInstance);
      } catch (err) {
        console.error("Error initializing contract:", err);
        setError("Failed to initialize contract");
      }
    }
  }, [provider, signer]);

  // Network info is now handled during provider initialization, removed redundant useEffect

  // Connect wallet function
  const connectWallet = useCallback(async () => {
    console.log("WalletContext: connectWallet called");

    if (!window.ethereum) {
      console.log("WalletContext: MetaMask not found");
      setError("MetaMask is not installed");
      return;
    }

    setIsConnecting(true);
    setError(null);
    console.log("WalletContext: Starting connection process");

    try {
      const web3Provider = new ethers.providers.Web3Provider(window.ethereum);
      console.log("WalletContext: Web3Provider created");

      // First, request account access to trigger MetaMask popup
      console.log(
        "WalletContext: Requesting accounts first to trigger MetaMask popup..."
      );
      const accountsPromise = window.ethereum.request({
        method: "eth_requestAccounts",
      });
      const accountsTimeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Account request timed out")), 30000)
      );

      const accounts = await Promise.race([
        accountsPromise,
        accountsTimeoutPromise,
      ]);
      console.log("WalletContext: Got accounts:", accounts);

      if (!accounts || accounts.length === 0) {
        throw new Error("No accounts found or user denied access");
      }

      // Now get the current chainId after account connection
      console.log(
        "WalletContext: Getting current chainId after account connection..."
      );
      const chainIdPromise = window.ethereum.request({ method: "eth_chainId" });
      const chainIdTimeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("ChainId request timed out")), 10000)
      );

      const chainId = await Promise.race([
        chainIdPromise,
        chainIdTimeoutPromise,
      ]);
      const BASE_CHAIN_ID = "0x2105"; // BASE mainnet
      const BASE_TESTNET_CHAIN_ID = "0x14a33"; // BASE testnet

      console.log("WalletContext: Current chainId:", chainId);

      if (chainId !== BASE_CHAIN_ID && chainId !== BASE_TESTNET_CHAIN_ID) {
        console.log(
          "WalletContext: Not on BASE network, attempting to switch..."
        );
        try {
          // Try to switch to BASE mainnet
          console.log("WalletContext: Calling wallet_switchEthereumChain...");
          const switchPromise = window.ethereum.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: BASE_CHAIN_ID }],
          });
          const switchTimeoutPromise = new Promise((_, reject) =>
            setTimeout(
              () => reject(new Error("Network switch timed out")),
              60000
            )
          );

          await Promise.race([switchPromise, switchTimeoutPromise]);
          console.log("WalletContext: Successfully switched to BASE network");
          // Update chainId after successful switch
          setChainId(BASE_CHAIN_ID);
        } catch (switchError) {
          console.log("WalletContext: Switch error:", switchError);
          // This error code indicates that the chain has not been added to MetaMask
          if (switchError.code === 4902) {
            console.log(
              "WalletContext: BASE network not found, attempting to add..."
            );
            try {
              console.log("WalletContext: Calling wallet_addEthereumChain...");
              const addPromise = window.ethereum.request({
                method: "wallet_addEthereumChain",
                params: [
                  {
                    chainId: BASE_CHAIN_ID,
                    chainName: "BASE",
                    nativeCurrency: {
                      name: "ETH",
                      symbol: "ETH",
                      decimals: 18,
                    },
                    rpcUrls: ["https://mainnet.base.org"],
                    blockExplorerUrls: ["https://basescan.org"],
                  },
                ],
              });
              const addTimeoutPromise = new Promise((_, reject) =>
                setTimeout(
                  () => reject(new Error("Add network timed out")),
                  60000
                )
              );

              await Promise.race([addPromise, addTimeoutPromise]);
              console.log("WalletContext: Successfully added BASE network");
              // Update chainId after successful add
              setChainId(BASE_CHAIN_ID);
            } catch (addError) {
              console.error(
                "WalletContext: Error adding BASE network:",
                addError
              );
              setError(
                "Failed to add BASE network to MetaMask: " + addError.message
              );
              setIsConnecting(false);
              return;
            }
          } else {
            console.error(
              "WalletContext: Error switching to BASE network:",
              switchError
            );
            setError(
              "Failed to switch to BASE network: " + switchError.message
            );
            setIsConnecting(false);
            return;
          }
        }
      } else {
        console.log("WalletContext: Already on BASE network");
      }

      setAccount(accounts[0]);
      setProvider(web3Provider);
      setSigner(web3Provider.getSigner());
      console.log("WalletContext: Set account and signer");

      // Update contract with signer (get fresh contract instance)
      const contractAddress = getContractAddress();
      console.log("WalletContext: Contract address:", contractAddress);
      if (contractAddress) {
        try {
          const contractInstance = new EtchContract(
            contractAddress,
            web3Provider
          );
          contractInstance.connect(web3Provider.getSigner());
          setEtchContract(contractInstance);
          console.log("WalletContext: Contract updated");
        } catch (contractError) {
          console.error(
            "WalletContext: Error updating contract:",
            contractError
          );
          // Don't fail the whole connection process for contract issues
        }
      }
      console.log("WalletContext: Connection process completed successfully");
    } catch (err) {
      console.error("WalletContext: Error connecting wallet:", err);
      if (err.message.includes("timed out")) {
        setError(
          "MetaMask request timed out. Please try again or check if MetaMask is responding."
        );
      } else if (err.message.includes("denied")) {
        setError("User denied wallet connection. Please try again.");
      } else {
        setError(err.message || "Failed to connect wallet");
      }
    } finally {
      setIsConnecting(false);
      console.log("WalletContext: Connection process finished");
    }
  }, []);

  // Auto-connect to wallet on page load
  useEffect(() => {
    const autoConnect = async () => {
      // Only attempt auto-connect once
      if (hasAttemptedAutoConnect.current) {
        console.log("WalletContext: Auto-connect already attempted, skipping");
        return;
      }

      // Don't auto-connect if we're already connecting or have an account
      if (isConnecting || account) {
        console.log(
          "WalletContext: Skipping auto-connect (already connecting or have account)"
        );
        return;
      }

      console.log("WalletContext: Starting auto-connect attempt");
      hasAttemptedAutoConnect.current = true;

      if (window.ethereum) {
        try {
          console.log("WalletContext: Checking for existing accounts...");
          // Check if we have any accounts already connected
          const accounts = await window.ethereum.request({
            method: "eth_accounts",
          });
          console.log("WalletContext: Existing accounts found:", accounts);
          if (accounts.length > 0) {
            console.log(
              "WalletContext: Auto-connecting to existing account..."
            );
            // If we have accounts, trigger the connect wallet flow
            await connectWallet();
          } else {
            console.log(
              "WalletContext: No existing accounts, skipping auto-connect"
            );
          }
        } catch (err) {
          console.error("WalletContext: Error auto-connecting wallet:", err);
        }
      }
    };

    // Only run auto-connect once on mount
    autoConnect();
  }, []); // Empty dependency array - only run once on mount

  // Handle account changes
  useEffect(() => {
    if (window.ethereum) {
      const handleAccountsChanged = (accounts) => {
        if (accounts.length === 0) {
          // User has disconnected
          setAccount(null);
          setSigner(null);
        } else if (accounts[0] !== account) {
          setAccount(accounts[0]);
          if (provider) {
            const web3Provider = new ethers.providers.Web3Provider(
              window.ethereum
            );
            const newSigner = web3Provider.getSigner();
            setSigner(newSigner);

            // Update contract with new signer if it exists
            if (etchContract) {
              etchContract.connect(newSigner);
            }
          }
        }
      };

      const handleChainChanged = async () => {
        // Update chainId immediately
        const newChainId = await window.ethereum.request({
          method: "eth_chainId",
        });
        setChainId(newChainId);

        // Reload the page when chain changes
        window.location.reload();
      };

      window.ethereum.on("accountsChanged", handleAccountsChanged);
      window.ethereum.on("chainChanged", handleChainChanged);

      // Cleanup
      return () => {
        window.ethereum.removeListener(
          "accountsChanged",
          handleAccountsChanged
        );
        window.ethereum.removeListener("chainChanged", handleChainChanged);
      };
    }
  }, [account, provider, etchContract]);

  const disconnectWallet = useCallback(() => {
    setAccount(null);
    setSigner(null);
    // Note: There is no standard way to disconnect in MetaMask
    // The user needs to disconnect via the MetaMask UI
  }, []);

  // Simple function to just connect accounts without network switching
  const connectAccountsOnly = useCallback(async () => {
    console.log("WalletContext: connectAccountsOnly called");

    if (!window.ethereum) {
      console.log("WalletContext: MetaMask not found");
      setError("MetaMask is not installed");
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      console.log("WalletContext: Requesting accounts...");
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });

      console.log("WalletContext: Got accounts:", accounts);

      if (!accounts || accounts.length === 0) {
        throw new Error("No accounts found or user denied access");
      }

      const web3Provider = new ethers.providers.Web3Provider(window.ethereum);
      setAccount(accounts[0]);
      setProvider(web3Provider);
      setSigner(web3Provider.getSigner());

      // Get current chainId after connection
      try {
        const network = await web3Provider.getNetwork();
        const hexChainId = "0x" + network.chainId.toString(16);
        setChainId(hexChainId);
        setNetworkName(network.name);
      } catch (networkError) {
        console.warn(
          "Failed to get network info after account connection:",
          networkError
        );
      }

      console.log("WalletContext: Account connection completed");
    } catch (err) {
      console.error("WalletContext: Error connecting accounts:", err);
      if (err.message.includes("denied")) {
        setError("User denied wallet connection. Please try again.");
      } else {
        setError(err.message || "Failed to connect wallet");
      }
    } finally {
      setIsConnecting(false);
    }
  }, []);

  // Context value
  const value = {
    account,
    provider,
    signer,
    etchContract,
    chainId,
    networkName,
    isConnecting,
    error,
    connectWallet,
    connectAccountsOnly,
    disconnectWallet,
  };

  return (
    <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
  );
}

// Custom hook to use the wallet context
export function useWallet() {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error("useWallet must be used within a WalletProvider");
  }
  return context;
}

export default WalletContext;
