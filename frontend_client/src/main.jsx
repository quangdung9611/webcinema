import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';

import './index.css';
import App from './App.jsx';

// ============================================================
// 🔇 TẮT CONSOLE.LOG — CHỈ GIỮ CONSOLE.ERROR
// ============================================================
// Từ giờ, mọi console.log / info / warn / debug đều bị ẩn
// CHỈ console.error mới hiện ra (dùng cho lỗi thật)

console.log = () => {};
console.info = () => {};
console.warn = () => {};
console.debug = () => {};

// console.error GIỮ NGUYÊN — không tắt
// ============================================================

const router = createBrowserRouter([
    {
        path: '*',
        element: <App />,
    }
]);

createRoot(document.getElementById('root')).render(
    <StrictMode>
        <RouterProvider router={router} />
    </StrictMode>
);