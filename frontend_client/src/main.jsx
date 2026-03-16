import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext' // 1. Thêm dòng import này

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {/* 2. Bọc AuthProvider quanh App để useAuth() có dữ liệu để chạy */}
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
)