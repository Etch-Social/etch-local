import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { ethers } from "ethers";
import EtchContract from "../utils/EtchContract";

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

  // Initialize providers
  useEffect(() => {
    if (typeof window !== "undefined" && window.ethereum) {
      try {
        const web3Provider = new ethers.providers.Web3Provider(window.ethereum);
        setProvider(web3Provider);
      } catch (err) {
        console.error("Error initializing Web3Provider:", err);
        setError("Failed to initialize Web3 provider");
      }
    } else if (process.env.NEXT_PUBLIC_ALCHEMY_API_KEY) {
      try {
        // Fallback to Alchemy provider if MetaMask is not available
        const alchemyProvider = new ethers.providers.AlchemyProvider(
          "homestead", // mainnet
          process.env.NEXT_PUBLIC_ALCHEMY_API_KEY
        );
        setProvider(alchemyProvider);
      } catch (err) {
        console.error("Error initializing AlchemyProvider:", err);
        setError("Failed to initialize Alchemy provider");
      }
    } else {
      setError("No Web3 provider available");
    }
  }, []);

  // Initialize contract when provider is ready
  useEffect(() => {
    if (provider && process.env.NEXT_PUBLIC_CONTRACT_ADDRESS) {
      try {
        const contractInstance = new EtchContract(
          process.env.NEXT_PUBLIC_CONTRACT_ADDRESS,
          provider
        );

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

  // Update network info when provider changes
  useEffect(() => {
    const updateNetwork = async () => {
      if (provider) {
        try {
          const network = await provider.getNetwork();
          setChainId(network.chainId);
          setNetworkName(network.name);
        } catch (err) {
          console.error("Error getting network:", err);
        }
      }
    };

    updateNetwork();
  }, [provider]);

  // Connect wallet function
  const connectWallet = useCallback(async () => {
    if (!window.ethereum) {
      setError("MetaMask is not installed");
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      const web3Provider = new ethers.providers.Web3Provider(window.ethereum);

      // Check if we're on BASE network
      const chainId = await window.ethereum.request({ method: "eth_chainId" });
      const BASE_CHAIN_ID = "0x2105"; // BASE mainnet
      const BASE_TESTNET_CHAIN_ID = "0x14a33"; // BASE testnet

      if (chainId !== BASE_CHAIN_ID && chainId !== BASE_TESTNET_CHAIN_ID) {
        try {
          // Try to switch to BASE mainnet
          await window.ethereum.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: BASE_CHAIN_ID }],
          });
          // Update chainId after successful switch
          setChainId(BASE_CHAIN_ID);
        } catch (switchError) {
          // This error code indicates that the chain has not been added to MetaMask
          if (switchError.code === 4902) {
            try {
              await window.ethereum.request({
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
              // Update chainId after successful add
              setChainId(BASE_CHAIN_ID);
            } catch (addError) {
              console.error("Error adding BASE network:", addError);
              setError("Failed to add BASE network to MetaMask");
              setIsConnecting(false);
              return;
            }
          } else {
            console.error("Error switching to BASE network:", switchError);
            setError("Failed to switch to BASE network");
            setIsConnecting(false);
            return;
          }
        }
      }

      // Request account access after network switch
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });

      setAccount(accounts[0]);
      setProvider(web3Provider);
      setSigner(web3Provider.getSigner());

      // Update contract with signer
      if (etchContract) {
        await etchContract.connect(web3Provider.getSigner());
      }
    } catch (err) {
      console.error("Error connecting wallet:", err);
      setError(err.message || "Failed to connect wallet");
    } finally {
      setIsConnecting(false);
    }
  }, [etchContract]);

  // Auto-connect to wallet on page load
  useEffect(() => {
    const autoConnect = async () => {
      if (window.ethereum && !account) {
        try {
          // Check if we have any accounts already connected
          const accounts = await window.ethereum.request({
            method: "eth_accounts",
          });
          if (accounts.length > 0) {
            // If we have accounts, trigger the connect wallet flow
            await connectWallet();
          }
        } catch (err) {
          console.error("Error auto-connecting wallet:", err);
        }
      }
    };

    autoConnect();
  }, [account, connectWallet]);

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
