import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';

import './index.css';
import App from './App.jsx';

// ============================================================
// CONSOLE — GIỮ NGUYÊN TẤT CẢ
// ============================================================
// Đã BỎ đoạn tắt console.log/warn/info/debug
// Tất cả log sẽ hiện ra bình thường để debug
// ============================================================

// ✅ Google Client ID từ biến môi trường
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

if (!GOOGLE_CLIENT_ID) {
    console.warn('⚠️ [MAIN] VITE_GOOGLE_CLIENT_ID chưa được cấu hình trong .env');
}

const router = createBrowserRouter([
    {
        path: '*',
        element: <App />,
    }
]);

createRoot(document.getElementById('root')).render(
    <StrictMode>
        <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
            <RouterProvider router={router} />
        </GoogleOAuthProvider>
    </StrictMode>
);