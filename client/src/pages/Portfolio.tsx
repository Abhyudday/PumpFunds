import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Calendar, DollarSign, Activity, Clock, Pause, Play, Trash2 } from 'lucide-react';
import { Investment, TradeReplication, Portfolio as PortfolioType } from '../types';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';

const Portfolio: React.FC = () => {
  const [portfolio, setPortfolio] = useState<PortfolioType | null>(null);
  const [trades, setTrades] = useState<TradeReplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'investments' | 'activity'>('overview');

  useEffect(() => {
    fetchPortfolioData();
    fetchTradeHistory();
  }, []);

  const fetchPortfolioData = async () => {
    try {
      const response = await axios.get('/portfolio');
      setPortfolio(response.data);
    } catch (error: any) {
      toast.error('Failed to load portfolio data');
      console.error('Error fetching portfolio:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTradeHistory = async () => {
    try {
      const response = await axios.get('/portfolio/trades');
      setTrades(response.data);
    } catch (error: any) {
      console.error('Error fetching trade history:', error);
    }
  };

  const handlePauseSIP = async (investmentId: number) => {
    try {
      await axios.patch(`/investments/${investmentId}/pause`);
      toast.success('SIP paused successfully');
      fetchPortfolioData();
    } catch (error: any) {
      toast.error('Failed to pause SIP');
    }
  };

  const handleResumeSIP = async (investmentId: number) => {
    try {
      await axios.patch(`/investments/${investmentId}/resume`);
      toast.success('SIP resumed successfully');
      fetchPortfolioData();
    } catch (error: any) {
      toast.error('Failed to resume SIP');
    }
  };

  const handleCancelInvestment = async (investmentId: number) => {
    if (!confirm('Are you sure you want to cancel this investment?')) return;
    
    try {
      await axios.delete(`/investments/${investmentId}`);
      toast.success('Investment cancelled successfully');
      fetchPortfolioData();
    } catch (error: any) {
      toast.error('Failed to cancel investment');
    }
  };

  if (loading) {
    return (
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="animate-pulse">
          <div className="h-8 bg-dark-800 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-dark-800 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Portfolio</h1>
        <p className="text-gray-400 mt-1">
          Track your investments and performance
        </p>
      </div>

      {/* Portfolio Overview Cards */}
      {portfolio && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="card-gradient rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Invested</p>
                <p className="text-2xl font-bold text-white">{portfolio.totalInvested.toFixed(2)} SOL</p>
              </div>
              <div className="w-12 h-12 bg-primary-500/20 rounded-lg flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-primary-400" />
              </div>
            </div>
          </div>

          <div className="card-gradient rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Current Value</p>
                <p className="text-2xl font-bold text-white">{portfolio.currentValue.toFixed(2)} SOL</p>
              </div>
              <div className="w-12 h-12 bg-accent-500/20 rounded-lg flex items-center justify-center">
                <Activity className="w-6 h-6 text-accent-400" />
              </div>
            </div>
          </div>

          <div className="card-gradient rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Returns</p>
                <p className={`text-2xl font-bold ${portfolio.totalReturns >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {portfolio.totalReturns >= 0 ? '+' : ''}{portfolio.totalReturns.toFixed(2)} SOL
                </p>
              </div>
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                portfolio.totalReturns >= 0 ? 'bg-green-500/20' : 'bg-red-500/20'
              }`}>
                {portfolio.totalReturns >= 0 ? (
                  <TrendingUp className="w-6 h-6 text-green-400" />
                ) : (
                  <TrendingDown className="w-6 h-6 text-red-400" />
                )}
              </div>
            </div>
          </div>

          <div className="card-gradient rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Active SIPs</p>
                <p className="text-2xl font-bold text-white">{portfolio.activeSIPs}</p>
              </div>
              <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <Calendar className="w-6 h-6 text-blue-400" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="mb-6">
        <div className="flex bg-dark-800 rounded-lg p-1">
          {[
            { key: 'overview', label: 'Overview', icon: Activity },
            { key: 'investments', label: 'Investments', icon: DollarSign },
            { key: 'activity', label: 'Activity', icon: Clock }
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key as any)}
              className={`flex-1 py-3 px-4 rounded-md text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
                activeTab === key
                  ? 'bg-primary-600 text-white shadow-lg'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && portfolio && (
        <div className="space-y-6">
          {/* Performance Chart Placeholder */}
          <div className="card-gradient rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Performance Overview</h3>
            <div className="h-64 bg-dark-800/50 rounded-lg flex items-center justify-center border border-dark-700/50">
              <div className="text-center">
                <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-400">Performance chart coming soon</p>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="card-gradient rounded-xl p-6">
              <h4 className="text-lg font-semibold text-white mb-4">Returns Breakdown</h4>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-400">Percentage Return:</span>
                  <span className={`font-semibold ${portfolio.returnsPercentage >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {portfolio.returnsPercentage >= 0 ? '+' : ''}{portfolio.returnsPercentage.toFixed(2)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Total Investments:</span>
                  <span className="text-white">{portfolio.investments.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Active SIPs:</span>
                  <span className="text-white">{portfolio.activeSIPs}</span>
                </div>
              </div>
            </div>

            <div className="card-gradient rounded-xl p-6">
              <h4 className="text-lg font-semibold text-white mb-4">Recent Activity</h4>
              <div className="space-y-3">
                {trades.slice(0, 3).map((trade) => (
                  <div key={trade.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${
                        trade.status === 'completed' ? 'bg-green-400' : 
                        trade.status === 'pending' ? 'bg-yellow-400' : 'bg-red-400'
                      }`} />
                      <span className="text-gray-300 text-sm">Trade Execution</span>
                    </div>
                    <span className="text-gray-400 text-xs">
                      {format(new Date(trade.executedAt), 'MMM dd')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'investments' && portfolio && (
        <div className="space-y-4">
          {portfolio.investments.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-dark-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <DollarSign className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-white mb-2">No investments yet</h3>
              <p className="text-gray-400">Start investing in funds to see them here.</p>
            </div>
          ) : (
            portfolio.investments.map((investment) => (
              <div key={investment.id} className="card-gradient rounded-xl p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-white">{investment.fund?.name}</h3>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        investment.type === 'SIP' 
                          ? 'bg-blue-500/20 text-blue-400' 
                          : 'bg-green-500/20 text-green-400'
                      }`}>
                        {investment.type}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-400 block">Amount</span>
                        <span className="text-white font-medium">{investment.amount} SOL</span>
                      </div>
                      {investment.interval && (
                        <div>
                          <span className="text-gray-400 block">Frequency</span>
                          <span className="text-white font-medium capitalize">{investment.interval}</span>
                        </div>
                      )}
                      {investment.nextExecution && (
                        <div>
                          <span className="text-gray-400 block">Next Execution</span>
                          <span className="text-white font-medium">
                            {format(new Date(investment.nextExecution), 'MMM dd, yyyy')}
                          </span>
                        </div>
                      )}
                      <div>
                        <span className="text-gray-400 block">Created</span>
                        <span className="text-white font-medium">
                          {format(new Date(investment.createdAt), 'MMM dd, yyyy')}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    {investment.type === 'SIP' && (
                      <>
                        <button
                          onClick={() => handlePauseSIP(investment.id)}
                          className="p-2 text-gray-400 hover:text-yellow-400 transition-colors"
                          title="Pause SIP"
                        >
                          <Pause className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleResumeSIP(investment.id)}
                          className="p-2 text-gray-400 hover:text-green-400 transition-colors"
                          title="Resume SIP"
                        >
                          <Play className="w-4 h-4" />
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => handleCancelInvestment(investment.id)}
                      className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                      title="Cancel Investment"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'activity' && (
        <div className="space-y-4">
          {trades.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-dark-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <Activity className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-white mb-2">No activity yet</h3>
              <p className="text-gray-400">Your trade executions will appear here.</p>
            </div>
          ) : (
            trades.map((trade) => (
              <div key={trade.id} className="card-gradient rounded-xl p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-3 h-3 rounded-full ${
                      trade.status === 'completed' ? 'bg-green-400' : 
                      trade.status === 'pending' ? 'bg-yellow-400' : 'bg-red-400'
                    }`} />
                    <div>
                      <h4 className="font-medium text-white">Trade Execution</h4>
                      <p className="text-sm text-gray-400">
                        Fund: {trade.investment?.fund?.name}
                      </p>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <p className="text-sm font-medium text-white">
                      {trade.amount && `${trade.amount} SOL`}
                    </p>
                    <p className="text-xs text-gray-400">
                      {format(new Date(trade.executedAt), 'MMM dd, yyyy HH:mm')}
                    </p>
                  </div>
                </div>
                
                {trade.txSignature && (
                  <div className="mt-3 pt-3 border-t border-dark-700">
                    <p className="text-xs text-gray-400">Transaction:</p>
                    <p className="text-xs text-gray-300 font-mono break-all">
                      {trade.txSignature}
                    </p>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default Portfolio; 