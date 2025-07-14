import React, { useState } from 'react';
import { Dialog } from '@headlessui/react';
import { X, DollarSign, Calendar, Zap, Info } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Fund } from '../types';
import axios from 'axios';
import { toast } from 'react-hot-toast';

interface InvestModalProps {
  fund: Fund;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface InvestmentForm {
  type: 'SIP' | 'Lumpsum';
  amount: number;
  interval?: 'daily' | 'weekly' | 'monthly';
}

const InvestModal: React.FC<InvestModalProps> = ({ fund, isOpen, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [investmentType, setInvestmentType] = useState<'SIP' | 'Lumpsum'>('SIP');
  
  const { register, handleSubmit, formState: { errors }, watch, setValue } = useForm<InvestmentForm>({
    defaultValues: {
      type: 'SIP',
      interval: 'weekly'
    }
  });

  const watchAmount = watch('amount');

  const onSubmit = async (data: InvestmentForm) => {
    try {
      setLoading(true);
      
      const payload = {
        fundId: fund.id,
        type: data.type,
        amount: data.amount,
        interval: data.type === 'SIP' ? data.interval : undefined
      };

      await axios.post('/investments', payload);
      toast.success(`${data.type} investment created successfully!`);
      onSuccess();
    } catch (error: any) {
      const message = error.response?.data?.message || 'Investment failed';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleTypeChange = (type: 'SIP' | 'Lumpsum') => {
    setInvestmentType(type);
    setValue('type', type);
    if (type === 'Lumpsum') {
      setValue('interval', undefined);
    } else {
      setValue('interval', 'weekly');
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/75 backdrop-blur-sm" aria-hidden="true" />
      
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="mx-auto max-w-lg w-full card-gradient rounded-2xl p-6 shadow-2xl border border-dark-700">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <Dialog.Title className="text-xl font-bold text-white">
                Invest in {fund.name}
              </Dialog.Title>
              <p className="text-gray-400 text-sm mt-1">
                Choose your investment strategy
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors p-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Investment Type Toggle */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-3">
                Investment Type
              </label>
              <div className="flex bg-dark-800 rounded-lg p-1">
                <button
                  type="button"
                  onClick={() => handleTypeChange('SIP')}
                  className={`flex-1 py-3 px-4 rounded-md text-sm font-medium transition-all duration-200 ${
                    investmentType === 'SIP'
                      ? 'bg-primary-600 text-white shadow-lg'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <Calendar className="w-4 h-4 inline mr-2" />
                  SIP (Recurring)
                </button>
                <button
                  type="button"
                  onClick={() => handleTypeChange('Lumpsum')}
                  className={`flex-1 py-3 px-4 rounded-md text-sm font-medium transition-all duration-200 ${
                    investmentType === 'Lumpsum'
                      ? 'bg-primary-600 text-white shadow-lg'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <Zap className="w-4 h-4 inline mr-2" />
                  Lumpsum (One-time)
                </button>
              </div>
            </div>

            {/* Amount Input */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Amount (SOL)
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  {...register('amount', { 
                    required: 'Amount is required',
                    min: { value: 0.01, message: 'Minimum amount is 0.01 SOL' },
                    max: { value: 1000, message: 'Maximum amount is 1000 SOL' }
                  })}
                  type="number"
                  step="0.01"
                  className="input-field pl-12 w-full"
                  placeholder={investmentType === 'SIP' ? '0.1' : '1.0'}
                />
              </div>
              {errors.amount && (
                <p className="text-red-400 text-sm mt-1">{errors.amount.message}</p>
              )}
            </div>

            {/* SIP Interval */}
            {investmentType === 'SIP' && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Investment Frequency
                </label>
                <select
                  {...register('interval', { required: investmentType === 'SIP' ? 'Interval is required' : false })}
                  className="input-field w-full"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
                {errors.interval && (
                  <p className="text-red-400 text-sm mt-1">{errors.interval.message}</p>
                )}
              </div>
            )}

            {/* Investment Summary */}
            <div className="bg-dark-800/50 rounded-lg p-4 border border-dark-700/50">
              <h4 className="text-sm font-semibold text-white mb-3">Investment Summary</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Type:</span>
                  <span className="text-white">{investmentType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Amount:</span>
                  <span className="text-white">{watchAmount || 0} SOL</span>
                </div>
                {investmentType === 'SIP' && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Frequency:</span>
                    <span className="text-white capitalize">{watch('interval')}</span>
                  </div>
                )}
                <div className="flex justify-between pt-2 border-t border-dark-700">
                  <span className="text-gray-400">Est. Monthly Cost:</span>
                  <span className="text-white font-semibold">
                    {investmentType === 'SIP' 
                      ? (() => {
                          const interval = watch('interval');
                          const amount = watchAmount || 0;
                          if (interval === 'daily') return (amount * 30).toFixed(2);
                          if (interval === 'weekly') return (amount * 4.33).toFixed(2);
                          return amount.toFixed(2);
                        })()
                      : '0'
                    } SOL
                  </span>
                </div>
              </div>
            </div>

            {/* Warning Note */}
            <div className="bg-yellow-900/20 border border-yellow-700/50 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-yellow-200">
                  <p className="font-medium mb-1">Important Information:</p>
                  <ul className="text-xs space-y-1 text-yellow-300">
                    <li>• Your investment will follow the fund's trader transactions</li>
                    <li>• {investmentType === 'SIP' ? 'Recurring investments will be processed automatically' : 'One-time investment will be processed immediately'}</li>
                    <li>• You can modify or cancel your investment anytime</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !watchAmount}
                className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                {investmentType === 'SIP' ? 'Start SIP' : 'Invest Now'}
              </button>
            </div>
          </form>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};

export default InvestModal; 