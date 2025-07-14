import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Mail, Lock, Loader2, User, Wallet } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

interface RegisterForm {
  email: string;
  password: string;
  confirmPassword: string;
}

const Register: React.FC = () => {
  const navigate = useNavigate();
  const { register: registerUser, loading } = useAuth();
  
  const { register, handleSubmit, formState: { errors }, watch } = useForm<RegisterForm>();
  const password = watch('password');

  const onSubmit = async (data: RegisterForm) => {
    try {
      await registerUser(data.email, data.password);
      navigate('/');
    } catch (error) {
      // Error handled in auth hook
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-950 via-dark-900 to-dark-950 flex items-center justify-center p-4">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -right-1/2 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-1/2 -left-1/2 w-96 h-96 bg-accent-500/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo/Brand */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold gradient-text mb-2">PumpFunds</h1>
          <p className="text-gray-400">Solana Memecoin Fund Investing</p>
        </div>

        {/* Register Card */}
        <div className="card-gradient rounded-2xl p-8 shadow-2xl">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-white mb-2">Create Account</h2>
            <p className="text-gray-400">Join PumpFunds and start investing in memecoin funds</p>
          </div>

          {/* Features Preview */}
          <div className="bg-dark-800/50 rounded-lg p-4 mb-6 border border-dark-700/50">
            <h3 className="text-sm font-semibold text-white mb-3">What you get:</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-3 text-sm text-gray-300">
                <Wallet className="w-4 h-4 text-primary-400" />
                <span>Automatically generated Solana wallet</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-300">
                <User className="w-4 h-4 text-primary-400" />
                <span>Access to curated memecoin funds</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-300">
                <Loader2 className="w-4 h-4 text-primary-400" />
                <span>Automated trade replication</span>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  {...register('email', { 
                    required: 'Email is required',
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: 'Invalid email address'
                    }
                  })}
                  type="email"
                  className="input-field pl-12 w-full"
                  placeholder="Enter your email"
                />
              </div>
              {errors.email && (
                <p className="text-red-400 text-sm mt-1">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  {...register('password', { 
                    required: 'Password is required',
                    minLength: {
                      value: 8,
                      message: 'Password must be at least 8 characters'
                    },
                    pattern: {
                      value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
                      message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number'
                    }
                  })}
                  type="password"
                  className="input-field pl-12 w-full"
                  placeholder="Create a secure password"
                />
              </div>
              {errors.password && (
                <p className="text-red-400 text-sm mt-1">{errors.password.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  {...register('confirmPassword', { 
                    required: 'Please confirm your password',
                    validate: value => value === password || 'Passwords do not match'
                  })}
                  type="password"
                  className="input-field pl-12 w-full"
                  placeholder="Confirm your password"
                />
              </div>
              {errors.confirmPassword && (
                <p className="text-red-400 text-sm mt-1">{errors.confirmPassword.message}</p>
              )}
            </div>

            <div className="text-xs text-gray-400 bg-dark-800/30 p-3 rounded-lg border border-dark-700/50">
              <strong className="text-gray-300">Security Note:</strong> A Solana wallet will be automatically generated and secured for your account. You'll be able to view your wallet details and export if needed after registration.
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Create Account
            </button>
          </form>

          {/* Login Link */}
          <div className="mt-6 text-center">
            <span className="text-gray-400">Already have an account? </span>
            <Link 
              to="/login" 
              className="text-primary-400 hover:text-primary-300 font-medium transition-colors"
            >
              Sign in
            </Link>
          </div>
        </div>

        {/* Security Notice */}
        <div className="mt-6 p-4 bg-yellow-900/20 border border-yellow-700/50 rounded-lg">
          <p className="text-sm text-yellow-200">
            <strong>🔒 Security:</strong> Your private keys are encrypted and stored securely. 
            Always keep your login credentials safe and never share them with anyone.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register; 