export interface User {
  id: number;
  email?: string;
  solanaWalletPubkey: string;
  createdAt: string;
}

export interface Fund {
  id: number;
  name: string;
  description: string;
  logoUrl?: string;
  traderWallets: string[];
  isActive: boolean;
  createdAt: string;
  roi7d?: number;
  roi30d?: number;
  totalInvested?: number;
  investorCount?: number;
}

export interface Investment {
  id: number;
  userId: number;
  fundId: number;
  type: 'SIP' | 'Lumpsum';
  amount: number;
  interval?: 'daily' | 'weekly' | 'monthly';
  nextExecution?: string;
  createdAt: string;
  fund?: Fund;
}

export interface TradeReplication {
  id: number;
  investmentId: number;
  txSignature: string;
  executedAt: string;
  status: 'pending' | 'completed' | 'failed';
  amount?: number;
  investment?: Investment;
}

export interface Portfolio {
  totalInvested: number;
  currentValue: number;
  totalReturns: number;
  returnsPercentage: number;
  activeSIPs: number;
  investments: Investment[];
}

export interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  loginWithWallet: (publicKey: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

export interface WalletContextType {
  connected: boolean;
  publicKey: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  balance: number;
} 