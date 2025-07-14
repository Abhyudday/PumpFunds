import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  Home, 
  Briefcase, 
  User, 
  Wallet, 
  LogOut, 
  Menu, 
  X,
  TrendingUp,
  DollarSign 
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useWallet } from '../hooks/useWallet';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const { connected, publicKey, balance, connect, disconnect } = useWallet();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const navigation = [
    { name: 'Dashboard', href: '/', icon: Home },
    { name: 'Portfolio', href: '/portfolio', icon: Briefcase },
  ];

  const handleLogout = () => {
    logout();
    if (connected) {
      disconnect();
    }
  };

  return (
    <div className="min-h-screen bg-dark-950">
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 flex z-40 lg:hidden ${sidebarOpen ? '' : 'pointer-events-none'}`}>
        <div className={`fixed inset-0 bg-dark-900/80 ${sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'} transition-opacity duration-300`} onClick={() => setSidebarOpen(false)} />
        
        <div className={`relative flex-1 flex flex-col max-w-xs w-full bg-dark-900 border-r border-dark-700 transform transition-transform duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="absolute top-0 right-0 -mr-12 pt-2">
            <button
              type="button"
              className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-primary-500"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-6 w-6 text-white" />
            </button>
          </div>
          <MobileSidebar navigation={navigation} user={user} onLogout={handleLogout} />
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0">
        <Sidebar navigation={navigation} user={user} onLogout={handleLogout} />
      </div>

      {/* Main content */}
      <div className="lg:pl-64 flex flex-col flex-1">
        {/* Top bar */}
        <div className="sticky top-0 z-10 lg:hidden bg-dark-900/95 backdrop-blur-sm border-b border-dark-700">
          <div className="flex items-center justify-between h-16 px-4">
            <button
              type="button"
              className="text-gray-400 hover:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-6 w-6" />
            </button>
            
            <div className="flex items-center gap-4">
              <WalletButton 
                connected={connected} 
                publicKey={publicKey} 
                balance={balance} 
                onConnect={connect} 
                onDisconnect={disconnect} 
              />
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1">
          <div className="py-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

// Sidebar component
const Sidebar: React.FC<{
  navigation: any[];
  user: any;
  onLogout: () => void;
}> = ({ navigation, user, onLogout }) => {
  const { connected, publicKey, balance, connect, disconnect } = useWallet();

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-dark-900 border-r border-dark-700">
      {/* Logo */}
      <div className="flex items-center h-16 flex-shrink-0 px-4 bg-dark-800 border-b border-dark-700">
        <h1 className="text-xl font-bold gradient-text">PumpFunds</h1>
      </div>

      {/* Navigation */}
      <div className="flex-1 flex flex-col overflow-y-auto">
        <nav className="flex-1 px-2 py-4 space-y-1">
          {navigation.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              className={({ isActive }) =>
                `group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors duration-200 ${
                  isActive
                    ? 'bg-primary-600 text-white'
                    : 'text-gray-300 hover:bg-dark-800 hover:text-white'
                }`
              }
            >
              <item.icon className="mr-3 h-5 w-5 flex-shrink-0" />
              {item.name}
            </NavLink>
          ))}
        </nav>

        {/* Wallet section */}
        <div className="flex-shrink-0 p-4 border-t border-dark-700">
          <WalletButton 
            connected={connected} 
            publicKey={publicKey} 
            balance={balance} 
            onConnect={connect} 
            onDisconnect={disconnect} 
          />
        </div>

        {/* User section */}
        <div className="flex-shrink-0 p-4 border-t border-dark-700">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
                <User className="h-4 w-4 text-white" />
              </div>
            </div>
            <div className="ml-3 flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {user?.email || 'Wallet User'}
              </p>
              <p className="text-xs text-gray-400 truncate">
                {publicKey ? `${publicKey.slice(0, 8)}...${publicKey.slice(-4)}` : 'No wallet'}
              </p>
            </div>
            <button
              onClick={onLogout}
              className="ml-3 text-gray-400 hover:text-white transition-colors"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Mobile sidebar (simplified version)
const MobileSidebar: React.FC<{
  navigation: any[];
  user: any;
  onLogout: () => void;
}> = ({ navigation, user, onLogout }) => {
  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex items-center h-16 flex-shrink-0 px-4 bg-dark-800">
        <h1 className="text-xl font-bold gradient-text">PumpFunds</h1>
      </div>
      <div className="flex-1 flex flex-col overflow-y-auto">
        <nav className="flex-1 px-2 py-4 space-y-1">
          {navigation.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              className={({ isActive }) =>
                `group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                  isActive
                    ? 'bg-primary-600 text-white'
                    : 'text-gray-300 hover:bg-dark-800 hover:text-white'
                }`
              }
            >
              <item.icon className="mr-3 h-5 w-5 flex-shrink-0" />
              {item.name}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
};

// Wallet button component
const WalletButton: React.FC<{
  connected: boolean;
  publicKey: string | null;
  balance: number;
  onConnect: () => void;
  onDisconnect: () => void;
}> = ({ connected, publicKey, balance, onConnect, onDisconnect }) => {
  if (!connected) {
    return (
      <button
        onClick={onConnect}
        className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
      >
        <Wallet className="w-4 h-4" />
        Connect Wallet
      </button>
    );
  }

  return (
    <div className="w-full">
      <div className="bg-dark-800 rounded-lg p-3 border border-dark-700">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-gray-400">Wallet</span>
          <button
            onClick={onDisconnect}
            className="text-xs text-gray-400 hover:text-white"
          >
            Disconnect
          </button>
        </div>
        <div className="text-sm text-white font-mono">
          {publicKey ? `${publicKey.slice(0, 8)}...${publicKey.slice(-4)}` : 'N/A'}
        </div>
        <div className="flex items-center gap-1 mt-1">
          <DollarSign className="w-3 h-3 text-primary-400" />
          <span className="text-xs text-gray-300">{balance.toFixed(4)} SOL</span>
        </div>
      </div>
    </div>
  );
};

export default Layout; 