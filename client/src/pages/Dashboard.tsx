import React, { useState, useEffect } from 'react';
import { Plus, TrendingUp, Users, DollarSign, ArrowUpRight, Filter } from 'lucide-react';
import { Fund } from '../types';
import FundCard from '../components/FundCard';
import InvestModal from '../components/InvestModal';
import axios from 'axios';
import { toast } from 'react-hot-toast';

const Dashboard: React.FC = () => {
  const [funds, setFunds] = useState<Fund[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFund, setSelectedFund] = useState<Fund | null>(null);
  const [investModalOpen, setInvestModalOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'active' | 'top-performing'>('all');

  useEffect(() => {
    fetchFunds();
  }, []);

  const fetchFunds = async () => {
    try {
      const response = await axios.get('/funds');
      setFunds(response.data);
    } catch (error: any) {
      toast.error('Failed to load funds');
      console.error('Error fetching funds:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInvest = (fund: Fund) => {
    setSelectedFund(fund);
    setInvestModalOpen(true);
  };

  const filteredFunds = funds.filter(fund => {
    if (filter === 'active') return fund.isActive;
    if (filter === 'top-performing') return (fund.roi30d || 0) > 0;
    return true;
  });

  if (loading) {
    return (
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="animate-pulse">
          <div className="h-8 bg-dark-800 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-64 bg-dark-800 rounded-xl"></div>
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Fund Dashboard</h1>
            <p className="text-gray-400 mt-1">
              Discover and invest in curated Solana memecoin funds
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Filter */}
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="input-field text-sm"
            >
              <option value="all">All Funds</option>
              <option value="active">Active Only</option>
              <option value="top-performing">Top Performing</option>
            </select>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
          <div className="card-gradient rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Funds</p>
                <p className="text-2xl font-bold text-white">{funds.length}</p>
              </div>
              <div className="w-12 h-12 bg-primary-500/20 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-primary-400" />
              </div>
            </div>
          </div>

          <div className="card-gradient rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Active Investments</p>
                <p className="text-2xl font-bold text-white">
                  {funds.reduce((acc, fund) => acc + (fund.investorCount || 0), 0)}
                </p>
              </div>
              <div className="w-12 h-12 bg-accent-500/20 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-accent-400" />
              </div>
            </div>
          </div>

          <div className="card-gradient rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Volume</p>
                <p className="text-2xl font-bold text-white">
                  {funds.reduce((acc, fund) => acc + (fund.totalInvested || 0), 0).toFixed(2)} SOL
                </p>
              </div>
              <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-green-400" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Featured Fund */}
      {filteredFunds.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">Featured Fund</h2>
          <div className="card-gradient rounded-xl p-6 border border-primary-500/30">
            <div className="flex flex-col lg:flex-row gap-6">
              <div className="flex-shrink-0">
                <img
                  src={filteredFunds[0].logoUrl || '/default-fund-logo.png'}
                  alt={filteredFunds[0].name}
                  className="w-24 h-24 rounded-xl object-cover"
                />
              </div>
              <div className="flex-1">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-white mb-2">{filteredFunds[0].name}</h3>
                    <p className="text-gray-400 mb-4">{filteredFunds[0].description}</p>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1">
                        <TrendingUp className="w-4 h-4 text-green-400" />
                        <span className="text-sm text-green-400 font-medium">
                          +{(filteredFunds[0].roi30d || 0).toFixed(1)}% (30d)
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-400">
                          {filteredFunds[0].investorCount || 0} investors
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleInvest(filteredFunds[0])}
                    className="btn-primary flex items-center gap-2"
                  >
                    <DollarSign className="w-4 h-4" />
                    Invest Now
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Fund Grid */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-white">All Funds</h2>
          <span className="text-sm text-gray-400">
            {filteredFunds.length} fund{filteredFunds.length !== 1 ? 's' : ''} available
          </span>
        </div>

        {filteredFunds.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-dark-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <TrendingUp className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-white mb-2">No funds found</h3>
            <p className="text-gray-400">Try adjusting your filter or check back later for new funds.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredFunds.map((fund) => (
              <FundCard
                key={fund.id}
                fund={fund}
                onInvest={() => handleInvest(fund)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Investment Modal */}
      {selectedFund && (
        <InvestModal
          fund={selectedFund}
          isOpen={investModalOpen}
          onClose={() => {
            setInvestModalOpen(false);
            setSelectedFund(null);
          }}
          onSuccess={() => {
            setInvestModalOpen(false);
            setSelectedFund(null);
            toast.success('Investment created successfully!');
          }}
        />
      )}
    </div>
  );
};

export default Dashboard; 