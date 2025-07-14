import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Wallet, Mail, Lock, Loader2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useWallet } from '../hooks/useWallet';

interface LoginForm {
  email: string;
  password: string;
}

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login, loginWithWallet, loading } = useAuth();
  const { connect, connected, publicKey } = useWallet();
  const [loginMethod, setLoginMethod] = useState<'email' | 'wallet'>('email');
  
  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>();

  const onEmailLogin = async (data: LoginForm) => {
    try {
      await login(data.email, data.password);
      navigate('/');
    } catch (error) {
      // Error handled in auth hook
    }
  };

  const onWalletLogin = async () => {
    try {
      await connect();
      if (publicKey) {
        await loginWithWallet(publicKey);
        navigate('/');
      }
    } catch (error) {
      // Error handled in hooks
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

        {/* Login Card */}
        <div className="card-gradient rounded-2xl p-8 shadow-2xl">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-white mb-2">Welcome Back</h2>
            <p className="text-gray-400">Sign in to your account to continue</p>
          </div>

          {/* Login Method Toggle */}
          <div className="flex bg-dark-800 rounded-lg p-1 mb-6">
            <button
              onClick={() => setLoginMethod('email')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all duration-200 ${
                loginMethod === 'email'
                  ? 'bg-primary-600 text-white shadow-lg'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Mail className="w-4 h-4 inline mr-2" />
              Email
            </button>
            <button
              onClick={() => setLoginMethod('wallet')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all duration-200 ${
                loginMethod === 'wallet'
                  ? 'bg-primary-600 text-white shadow-lg'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Wallet className="w-4 h-4 inline mr-2" />
              Wallet
            </button>
          </div>

          {/* Email Login Form */}
          {loginMethod === 'email' && (
            <form onSubmit={handleSubmit(onEmailLogin)} className="space-y-4">
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
                    {...register('password', { required: 'Password is required' })}
                    type="password"
                    className="input-field pl-12 w-full"
                    placeholder="Enter your password"
                  />
                </div>
                {errors.password && (
                  <p className="text-red-400 text-sm mt-1">{errors.password.message}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                Sign In
              </button>
            </form>
          )}

          {/* Wallet Login */}
          {loginMethod === 'wallet' && (
            <div className="space-y-4">
              <div className="text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-primary-500 to-accent-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Wallet className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Connect Your Wallet</h3>
                <p className="text-gray-400 text-sm">
                  Use your Phantom or Backpack wallet to sign in
                </p>
              </div>

              <button
                onClick={onWalletLogin}
                disabled={loading}
                className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                <Wallet className="w-4 h-4" />
                Connect Wallet
              </button>

              <div className="text-center text-sm text-gray-400">
                <span>Don't have a wallet? </span>
                <a 
                  href="https://phantom.app/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary-400 hover:text-primary-300 underline"
                >
                  Get Phantom
                </a>
              </div>
            </div>
          )}

          {/* Register Link */}
          <div className="mt-6 text-center">
            <span className="text-gray-400">Don't have an account? </span>
            <Link 
              to="/register" 
              className="text-primary-400 hover:text-primary-300 font-medium transition-colors"
            >
              Sign up
            </Link>
          </div>
        </div>

        {/* Demo Credentials */}
        <div className="mt-6 p-4 bg-dark-800/50 rounded-lg border border-dark-700">
          <p className="text-sm text-gray-400 mb-2 font-medium">Demo Credentials:</p>
          <p className="text-xs text-gray-500">
            Email: demo@pumpfunds.com<br />
            Password: password123
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login; 