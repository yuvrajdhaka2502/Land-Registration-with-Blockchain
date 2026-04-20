import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';

import UserRegistryABI     from '../artifacts/UserRegistry.json';
import LandRegistryABI     from '../artifacts/LandRegistry.json';
import deployedContracts   from '../config/deployedContracts.json';

// These may not exist until deploy is run with all 4 contracts
let AadhaarOracleABI, CircleRateOracleABI;
try { AadhaarOracleABI    = require('../artifacts/AadhaarOracle.json'); } catch { AadhaarOracleABI = null; }
try { CircleRateOracleABI = require('../artifacts/CircleRateOracle.json'); } catch { CircleRateOracleABI = null; }

// Read expected chain from deployedContracts.json so it works for both localhost and Sepolia
const EXPECTED_CHAIN_ID = deployedContracts.chainId || 31337;
const NETWORK_NAMES = { 31337: "Hardhat Local", 11155111: "Sepolia Testnet" };
const EXPECTED_NETWORK_NAME = NETWORK_NAMES[EXPECTED_CHAIN_ID] || `Chain ID ${EXPECTED_CHAIN_ID}`;

const Web3Context = createContext(null);

export function Web3Provider({ children }) {
  const [provider,           setProvider]           = useState(null);
  const [signer,             setSigner]             = useState(null);
  const [account,            setAccount]            = useState(null);
  const [chainId,            setChainId]            = useState(null);
  const [userRegistry,       setUserRegistry]       = useState(null);
  const [landRegistry,       setLandRegistry]       = useState(null);
  const [aadhaarOracle,      setAadhaarOracle]      = useState(null);
  const [circleRateOracle,   setCircleRateOracle]   = useState(null);
  const [currentUser,        setCurrentUser]        = useState(null);
  const [isLoading,          setIsLoading]          = useState(false);
  const [txPending,          setTxPending]          = useState(false);
  const [error,              setError]              = useState(null);

  // ── Load user data after wallet connects ────────────────────────────────────
  const loadUserData = useCallback(async (userRegistryContract, walletAddress) => {
    try {
      const user = await userRegistryContract.getUserDetails(walletAddress);
      if (user.isRegistered) {
        setCurrentUser({
          walletAddress: user.walletAddress,
          name:          user.name,
          email:         user.email,
          phone:         user.phone,
          role:          Number(user.role),
          isKYCVerified: user.isKYCVerified,
          aadhaarHash:   user.aadhaarHash,
          isRegistered:  user.isRegistered,
        });
      } else {
        setCurrentUser({ isRegistered: false });
      }
    } catch (err) {
      console.error("Failed to load user data:", err);
      setCurrentUser({ isRegistered: false });
    }
  }, []);

  // ── Initialise contracts ─────────────────────────────────────────────────────
  const initContracts = useCallback(async (ethSigner) => {
    const ur = new ethers.Contract(
      deployedContracts.UserRegistry,
      UserRegistryABI.abi,
      ethSigner
    );
    const lr = new ethers.Contract(
      deployedContracts.LandRegistry,
      LandRegistryABI.abi,
      ethSigner
    );
    setUserRegistry(ur);
    setLandRegistry(lr);

    // Optional contracts (deployed in Stage 2+)
    if (AadhaarOracleABI && deployedContracts.AadhaarOracle) {
      const ao = new ethers.Contract(
        deployedContracts.AadhaarOracle,
        AadhaarOracleABI.abi,
        ethSigner
      );
      setAadhaarOracle(ao);
    }

    if (CircleRateOracleABI && deployedContracts.CircleRateOracle) {
      const cro = new ethers.Contract(
        deployedContracts.CircleRateOracle,
        CircleRateOracleABI.abi,
        ethSigner
      );
      setCircleRateOracle(cro);
    }

    return ur;
  }, []);

  // ── Connect wallet ───────────────────────────────────────────────────────────
  const connectWallet = useCallback(async () => {
    setError(null);
    if (!window.ethereum) {
      setError("MetaMask is not installed. Please install it from metamask.io.");
      return;
    }

    try {
      setIsLoading(true);
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const web3Provider = new ethers.BrowserProvider(window.ethereum);
      const web3Signer   = await web3Provider.getSigner();
      const network      = await web3Provider.getNetwork();
      const cid          = Number(network.chainId);

      setProvider(web3Provider);
      setSigner(web3Signer);
      setAccount(accounts[0]);
      setChainId(cid);

      if (cid !== EXPECTED_CHAIN_ID) {
        setError(`Wrong network. Please switch MetaMask to ${EXPECTED_NETWORK_NAME} (Chain ID: ${EXPECTED_CHAIN_ID}).`);
        setIsLoading(false);
        return;
      }

      const ur = await initContracts(web3Signer);
      await loadUserData(ur, accounts[0]);
    } catch (err) {
      console.error("connectWallet error:", err);
      setError(err.message || "Failed to connect wallet.");
    } finally {
      setIsLoading(false);
    }
  }, [initContracts, loadUserData]);

  // ── Disconnect wallet ────────────────────────────────────────────────────────
  const disconnectWallet = useCallback(() => {
    setProvider(null);
    setSigner(null);
    setAccount(null);
    setChainId(null);
    setUserRegistry(null);
    setLandRegistry(null);
    setAadhaarOracle(null);
    setCircleRateOracle(null);
    setCurrentUser(null);
    setError(null);
  }, []);

  // ── Refresh current user's on-chain data ─────────────────────────────────────
  const refreshUser = useCallback(async () => {
    if (userRegistry && account) {
      await loadUserData(userRegistry, account);
    }
  }, [userRegistry, account, loadUserData]);

  // ── Listen for account/network changes ───────────────────────────────────────
  useEffect(() => {
    if (!window.ethereum) return;

    const handleAccountsChanged = (accounts) => {
      if (accounts.length === 0) {
        disconnectWallet();
      } else {
        window.location.reload();
      }
    };

    const handleChainChanged = () => {
      window.location.reload();
    };

    window.ethereum.on('accountsChanged', handleAccountsChanged);
    window.ethereum.on('chainChanged',    handleChainChanged);

    return () => {
      window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
      window.ethereum.removeListener('chainChanged',    handleChainChanged);
    };
  }, [disconnectWallet]);

  // ── Auto-reconnect if MetaMask is already connected ──────────────────────────
  useEffect(() => {
    const autoConnect = async () => {
      if (!window.ethereum) return;
      try {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
          await connectWallet();
        }
      } catch { /* silent */ }
    };
    autoConnect();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Helper: send a tx with loading state ─────────────────────────────────────
  const sendTx = useCallback(async (txPromise) => {
    setTxPending(true);
    setError(null);
    try {
      const tx = await txPromise;
      await tx.wait();
      return tx;
    } catch (err) {
      const msg = err?.reason || err?.message || "Transaction failed.";
      setError(msg);
      throw err;
    } finally {
      setTxPending(false);
    }
  }, []);

  const value = {
    provider,
    signer,
    account,
    chainId,
    userRegistry,
    landRegistry,
    aadhaarOracle,
    circleRateOracle,
    currentUser,
    isLoading,
    txPending,
    error,
    setError,
    connectWallet,
    disconnectWallet,
    refreshUser,
    sendTx,
    isWrongNetwork: chainId !== null && chainId !== EXPECTED_CHAIN_ID,
    adminAddress: deployedContracts.deployer || null,
    oracleUrl: process.env.REACT_APP_ORACLE_URL || "http://localhost:3001",
  };

  return <Web3Context.Provider value={value}>{children}</Web3Context.Provider>;
}

export function useWeb3() {
  const ctx = useContext(Web3Context);
  if (!ctx) throw new Error("useWeb3 must be used inside <Web3Provider>");
  return ctx;
}
