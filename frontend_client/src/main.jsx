import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';

import './index.css';
import App from './App.jsx';

// ============================================================
// CONSOLE — GIỮ NGUYÊN TẤT CẢ
// ============================================================
// Đã BỎ đoạn tắt console.log/warn/info/debug
// Tất cả log sẽ hiện ra bình thường để debug
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