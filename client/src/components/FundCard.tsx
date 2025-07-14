import React from 'react';
import { TrendingUp, TrendingDown, Users, DollarSign, ArrowUpRight } from 'lucide-react';
import { Fund } from '../types';

interface FundCardProps {
  fund: Fund;
  onInvest: () => void;
}

const FundCard: React.FC<FundCardProps> = ({ fund, onInvest }) => {
  const roi30d = fund.roi30d || 0;
  const roi7d = fund.roi7d || 0;
  const isPositive30d = roi30d >= 0;
  const isPositive7d = roi7d >= 0;

  return (
    <div className="card-gradient rounded-xl p-6 hover:scale-105 transition-all duration-300 group cursor-pointer">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl overflow-hidden bg-gradient-to-br from-primary-500 to-accent-500 flex-shrink-0">
            {fund.logoUrl ? (
              <img 
                src={fund.logoUrl} 
                alt={fund.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white font-bold text-lg">
                {fund.name.charAt(0)}
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-white text-lg truncate group-hover:text-primary-300 transition-colors">
              {fund.name}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                fund.isActive 
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                  : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
              }`}>
                {fund.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <p className="text-gray-400 text-sm mb-4 line-clamp-2 leading-relaxed">
        {fund.description}
      </p>

      {/* Performance Stats */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-dark-800/50 rounded-lg p-3 border border-dark-700/50">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">7D ROI</span>
            {isPositive7d ? (
              <TrendingUp className="w-3 h-3 text-green-400" />
            ) : (
              <TrendingDown className="w-3 h-3 text-red-400" />
            )}
          </div>
          <p className={`text-sm font-semibold ${isPositive7d ? 'text-green-400' : 'text-red-400'}`}>
            {isPositive7d ? '+' : ''}{roi7d.toFixed(1)}%
          </p>
        </div>

        <div className="bg-dark-800/50 rounded-lg p-3 border border-dark-700/50">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">30D ROI</span>
            {isPositive30d ? (
              <TrendingUp className="w-3 h-3 text-green-400" />
            ) : (
              <TrendingDown className="w-3 h-3 text-red-400" />
            )}
          </div>
          <p className={`text-sm font-semibold ${isPositive30d ? 'text-green-400' : 'text-red-400'}`}>
            {isPositive30d ? '+' : ''}{roi30d.toFixed(1)}%
          </p>
        </div>
      </div>

      {/* Fund Stats */}
      <div className="flex items-center justify-between mb-4 text-sm">
        <div className="flex items-center gap-1">
          <Users className="w-4 h-4 text-gray-400" />
          <span className="text-gray-400">{fund.investorCount || 0} investors</span>
        </div>
        <div className="flex items-center gap-1">
          <DollarSign className="w-4 h-4 text-gray-400" />
          <span className="text-gray-400">{(fund.totalInvested || 0).toFixed(2)} SOL</span>
        </div>
      </div>

      {/* Trader Wallets */}
      <div className="mb-4">
        <span className="text-xs text-gray-400 mb-2 block">Trader Wallets</span>
        <div className="flex flex-wrap gap-1">
          {fund.traderWallets.slice(0, 2).map((wallet, index) => (
            <span 
              key={index}
              className="inline-flex items-center px-2 py-1 rounded bg-dark-800/50 text-xs text-gray-300 font-mono border border-dark-700/50"
            >
              {wallet.slice(0, 6)}...{wallet.slice(-4)}
            </span>
          ))}
          {fund.traderWallets.length > 2 && (
            <span className="inline-flex items-center px-2 py-1 rounded bg-dark-800/50 text-xs text-gray-400 border border-dark-700/50">
              +{fund.traderWallets.length - 2} more
            </span>
          )}
        </div>
      </div>

      {/* Action Button */}
      <button
        onClick={onInvest}
        disabled={!fund.isActive}
        className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-semibold text-sm transition-all duration-200 ${
          fund.isActive
            ? 'btn-primary group-hover:scale-105'
            : 'bg-gray-600 text-gray-400 cursor-not-allowed'
        }`}
      >
        <DollarSign className="w-4 h-4" />
        {fund.isActive ? 'Invest Now' : 'Inactive'}
        {fund.isActive && <ArrowUpRight className="w-4 h-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />}
      </button>
    </div>
  );
};

export default FundCard; 