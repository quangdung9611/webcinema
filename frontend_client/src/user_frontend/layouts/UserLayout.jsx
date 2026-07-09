import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import UserHeader from '../components/UserHeader';
import UserFooter from '../components/UserFooter';
import axios from 'axios';
import '../styles/UserLayout.css'; 

const UserLayout = () => {
    const [user, setUser] = useState(null);

    const fetchUserData = async () => {
        try {
            // 🔥 THÊM withCredentials: true
            const res = await axios.get('/api/auth/me', {
                withCredentials: true
            });
            
            if (res.data && res.data.user) {
                setUser(res.data.user);
            }
        } catch (err) {
            setUser(null);
        }
    };

    useEffect(() => {
        fetchUserData();
        window.addEventListener('authChange', fetchUserData);
        return () => window.removeEventListener('authChange', fetchUserData);
    }, []);

    return (
        <div className="user-site-container">
            <header className="user-header-section">
                <UserHeader user={user} setUser={setUser} />
            </header>

            <main className="user-main-content">
                <Outlet context={{ fetchUserData, user }} />
            </main>

            <footer className="user-footer-section">
                <UserFooter />
            </footer>
        </div>
    );
};

export default UserLayout;