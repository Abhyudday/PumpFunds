import { Routes, Route } from 'react-router-dom'
import { AuthProvider } from './hooks/useAuth'
import { WalletProvider } from './hooks/useWallet'
import Layout from './components/Layout'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Portfolio from './pages/Portfolio'
import ProtectedRoute from './components/ProtectedRoute'

function App() {
  return (
    <AuthProvider>
      <WalletProvider>
        <div className="min-h-screen bg-dark-950 text-white">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/" element={
              <ProtectedRoute>
                <Layout>
                  <Dashboard />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/portfolio" element={
              <ProtectedRoute>
                <Layout>
                  <Portfolio />
                </Layout>
              </ProtectedRoute>
            } />
          </Routes>
        </div>
      </WalletProvider>
    </AuthProvider>
  )
}

export default App 