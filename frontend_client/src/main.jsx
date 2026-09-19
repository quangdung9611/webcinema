import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import {
    createBrowserRouter,
    RouterProvider
} from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';

import './index.css';
import App from './App.jsx';

// ============================================================
// CONSOLE — GIỮ NGUYÊN TẤT CẢ
// ============================================================
// Không tắt console.log / warn / info / debug
// Tất cả log vẫn hiển thị bình thường để debug
// ============================================================

// ============================================================
// GOOGLE OAUTH
// ============================================================

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

if (!GOOGLE_CLIENT_ID) {
    console.warn(
        '⚠️ [MAIN] VITE_GOOGLE_CLIENT_ID chưa được cấu hình trong .env'
    );
}

// ============================================================
// ✅ DEBUG RECAPTCHA SITE KEY
// ============================================================
const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY;

console.log('🔑 [MAIN] RECAPTCHA Site Key:', RECAPTCHA_SITE_KEY);
console.log('🔑 [MAIN] Độ dài key:', RECAPTCHA_SITE_KEY?.length);
console.log('🔑 [MAIN] Domain:', window.location.hostname);
console.log('🔑 [MAIN] Env mode:', import.meta.env.MODE);

if (!RECAPTCHA_SITE_KEY) {
    console.error('❌ [MAIN] VITE_RECAPTCHA_SITE_KEY chưa được cấu hình!');
}

// ============================================================
// ROUTER
// ============================================================

const router = createBrowserRouter([
    {
        path: '*',
        element: <App />,
    },
]);

// ============================================================
// RENDER
// ============================================================

createRoot(document.getElementById('root')).render(
    <StrictMode>
        <GoogleOAuthProvider
            clientId={GOOGLE_CLIENT_ID || ''}
        >
            <RouterProvider router={router} />
        </GoogleOAuthProvider>
    </StrictMode>
);