// Static Mode Helper - Provides localStorage-based fallbacks for API calls and process.env
// This allows the app to work in static export mode by using localStorage instead of server APIs

// Check if we're in static mode (no server APIs available)
const isStaticMode = () => {
  return typeof window !== "undefined" && !process.env.NODE_ENV;
};

// Safe localStorage operations
const safeLocalStorage = {
  getItem: (key) => {
    if (typeof window === "undefined") return null;
    try {
      return localStorage.getItem(key);
    } catch (e) {
      console.warn("localStorage getItem failed:", e);
      return null;
    }
  },
  setItem: (key, value) => {
    if (typeof window === "undefined") return false;
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (e) {
      console.warn("localStorage setItem failed:", e);
      return false;
    }
  },
  removeItem: (key) => {
    if (typeof window === "undefined") return false;
    try {
      localStorage.removeItem(key);
      return true;
    } catch (e) {
      console.warn("localStorage removeItem failed:", e);
      return false;
    }
  },
};

// Static-mode-friendly API call wrapper
export const apiCall = async (endpoint, options = {}) => {
  // Try real API call first (works in development mode)
  if (typeof window !== "undefined") {
    try {
      const response = await fetch(endpoint, options);
      // If the API call succeeds AND returns a successful status, return it (development mode)
      if (response.ok) {
        return response;
      } else {
        // HTTP error response (404, 500, etc.) - fall back to localStorage simulation
        console.log(
          `API call returned ${response.status}, using localStorage fallback:`,
          endpoint
        );
      }
    } catch (error) {
      // Network error - fall back to localStorage simulation (static mode)
      console.log("API call failed, using localStorage fallback:", endpoint);
    }

    // Fallback to localStorage simulation for static mode
    try {
      // Simulate API delay for consistency
      await new Promise((resolve) => setTimeout(resolve, 50));

      switch (endpoint) {
        case "/api/getArweaveKey":
          return {
            ok: true,
            json: async () => ({
              key: safeLocalStorage.getItem("ARWEAVE_KEY") || null,
            }),
          };

        case "/api/getPrivateKey":
          return {
            ok: true,
            json: async () => ({
              key: safeLocalStorage.getItem("NOSTR_PRIVATE_KEY") || null,
            }),
          };

        case "/api/getFeedContracts":
          const feedContracts = safeLocalStorage.getItem("FEED_CONTRACTS");
          return {
            ok: true,
            json: async () => ({
              contracts: feedContracts ? JSON.parse(feedContracts) : [],
            }),
          };

        case "/api/saveArweaveKey":
          if (options.method === "POST" && options.body) {
            const data = JSON.parse(options.body);
            safeLocalStorage.setItem("ARWEAVE_KEY", data.key);
          }
          return {
            ok: true,
            json: async () => ({ success: true }),
          };

        case "/api/savePrivateKey":
          if (options.method === "POST" && options.body) {
            const data = JSON.parse(options.body);
            safeLocalStorage.setItem("NOSTR_PRIVATE_KEY", data.key);
          }
          return {
            ok: true,
            json: async () => ({ success: true }),
          };

        case "/api/saveContractAddress":
          if (options.method === "POST" && options.body) {
            const data = JSON.parse(options.body);
            safeLocalStorage.setItem("CONTRACT_ADDRESS", data.address);
          }
          return {
            ok: true,
            json: async () => ({ success: true }),
          };

        case "/api/saveFeedContract":
          if (options.method === "POST" && options.body) {
            const data = JSON.parse(options.body);
            const existingContracts =
              safeLocalStorage.getItem("FEED_CONTRACTS");
            const contracts = existingContracts
              ? JSON.parse(existingContracts)
              : [];
            if (!contracts.includes(data.address)) {
              contracts.push(data.address);
              safeLocalStorage.setItem(
                "FEED_CONTRACTS",
                JSON.stringify(contracts)
              );
            }
          }
          return {
            ok: true,
            json: async () => ({ success: true }),
          };

        case "/api/removeFeedContract":
          if (options.method === "POST" && options.body) {
            const data = JSON.parse(options.body);
            const existingContracts =
              safeLocalStorage.getItem("FEED_CONTRACTS");
            if (existingContracts) {
              const contracts = JSON.parse(existingContracts);
              const filtered = contracts.filter(
                (addr) => addr !== data.address
              );
              safeLocalStorage.setItem(
                "FEED_CONTRACTS",
                JSON.stringify(filtered)
              );
            }
          }
          return {
            ok: true,
            json: async () => ({ success: true }),
          };

        default:
          // Fallback for unknown endpoints
          return {
            ok: false,
            status: 404,
            json: async () => ({ error: "Endpoint not found in static mode" }),
          };
      }
    } catch (error) {
      console.warn("Static mode API call failed:", error);
      return {
        ok: false,
        status: 500,
        json: async () => ({ error: "Static mode error" }),
      };
    }
  }

  // Fallback to regular fetch if not in static mode
  return fetch(endpoint, options);
};

// Static-mode-friendly process.env replacement
export const getEnvVar = (varName, fallbackKey = null) => {
  // First try process.env if available
  if (process.env[varName]) {
    return process.env[varName];
  }

  // In static mode or when process.env is not available, use localStorage
  if (typeof window !== "undefined") {
    const localStorageKey = fallbackKey || varName;
    return safeLocalStorage.getItem(localStorageKey);
  }

  return null;
};

// Convenience functions for common environment variables
export const getContractAddress = () => {
  return getEnvVar("NEXT_PUBLIC_CONTRACT_ADDRESS", "CONTRACT_ADDRESS");
};

export const getFeedContracts = () => {
  const feedContractsStr = getEnvVar(
    "NEXT_PUBLIC_FEED_CONTRACTS",
    "FEED_CONTRACTS"
  );
  if (feedContractsStr) {
    try {
      return Array.isArray(feedContractsStr)
        ? feedContractsStr
        : JSON.parse(feedContractsStr);
    } catch (e) {
      console.warn("Failed to parse feed contracts:", e);
      return [];
    }
  }
  return [];
};

export default {
  apiCall,
  getEnvVar,
  getContractAddress,
  getFeedContracts,
  isStaticMode,
};
