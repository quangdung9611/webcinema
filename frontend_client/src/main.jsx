import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext' 

createRoot(document.getElementById('root')).render(
  // Tắt StrictMode bằng cách comment lại để tránh gửi 2-3 mã OTP khi đang Dev
  // <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  // </StrictMode>,
)