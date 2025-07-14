import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { toast } from 'react-hot-toast';
import { WalletContextType } from '../types';

const WalletContext = createContext<WalletContextType | undefined>(undefined);

interface WalletProviderProps {
  children: ReactNode;
}

// Solana connection
const connection = new Connection(
  import.meta.env.VITE_SOLANA_RPC_URL || 'https://api.devnet.solana.com',
  'confirmed'
);

// Type for window.solana (Phantom/Backpack)
interface SolanaWallet {
  isPhantom?: boolean;
  isBackpack?: boolean;
  connect: () => Promise<{ publicKey: PublicKey }>;
  disconnect: () => Promise<void>;
  publicKey: PublicKey | null;
  connected: boolean;
  on: (event: string, callback: (args: any) => void) => void;
  off: (event: string, callback: (args: any) => void) => void;
}

declare global {
  interface Window {
    solana?: SolanaWallet;
    backpack?: SolanaWallet;
  }
}

export const WalletProvider: React.FC<WalletProviderProps> = ({ children }) => {
  const [connected, setConnected] = useState(false);
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [balance, setBalance] = useState(0);

  // Check for wallet availability and auto-connect
  useEffect(() => {
    const checkWallet = async () => {
      if (window.solana?.isPhantom || window.backpack?.isBackpack) {
        // Try to connect silently if user was previously connected
        const savedPublicKey = localStorage.getItem('walletPublicKey');
        if (savedPublicKey) {
          try {
            await connect();
          } catch (error) {
            console.error('Auto-connect failed:', error);
          }
        }
      }
    };

    checkWallet();
  }, []);

  // Update balance when publicKey changes
  useEffect(() => {
    if (publicKey) {
      updateBalance();
      // Set up balance polling
      const interval = setInterval(updateBalance, 30000); // Update every 30 seconds
      return () => clearInterval(interval);
    }
  }, [publicKey]);

  const getWallet = (): SolanaWallet | null => {
    if (window.solana?.isPhantom) {
      return window.solana;
    }
    if (window.backpack?.isBackpack) {
      return window.backpack;
    }
    return null;
  };

  const connect = async (): Promise<void> => {
    try {
      const wallet = getWallet();
      
      if (!wallet) {
        toast.error('Please install Phantom or Backpack wallet');
        window.open('https://phantom.app/', '_blank');
        return;
      }

      const response = await wallet.connect();
      const walletPublicKey = response.publicKey.toString();
      
      setConnected(true);
      setPublicKey(walletPublicKey);
      localStorage.setItem('walletPublicKey', walletPublicKey);
      
      // Set up wallet event listeners
      wallet.on('connect', () => {
        setConnected(true);
      });
      
      wallet.on('disconnect', () => {
        setConnected(false);
        setPublicKey(null);
        setBalance(0);
        localStorage.removeItem('walletPublicKey');
      });
      
      toast.success('Wallet connected successfully!');
    } catch (error: any) {
      console.error('Wallet connection failed:', error);
      if (error.message?.includes('User rejected')) {
        toast.error('Wallet connection was cancelled');
      } else {
        toast.error('Failed to connect wallet');
      }
      throw error;
    }
  };

  const disconnect = async (): Promise<void> => {
    try {
      const wallet = getWallet();
      if (wallet) {
        await wallet.disconnect();
      }
      
      setConnected(false);
      setPublicKey(null);
      setBalance(0);
      localStorage.removeItem('walletPublicKey');
      
      toast.success('Wallet disconnected');
    } catch (error) {
      console.error('Disconnect failed:', error);
      toast.error('Failed to disconnect wallet');
    }
  };

  const updateBalance = async (): Promise<void> => {
    if (!publicKey) return;
    
    try {
      const pubKey = new PublicKey(publicKey);
      const lamports = await connection.getBalance(pubKey);
      const solBalance = lamports / LAMPORTS_PER_SOL;
      setBalance(solBalance);
    } catch (error) {
      console.error('Failed to fetch balance:', error);
    }
  };

  const value: WalletContextType = {
    connected,
    publicKey,
    connect,
    disconnect,
    balance,
  };

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = (): WalletContextType => {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
}; 