import React, {
    createContext,
    useState,
    useEffect,
    useContext,
    useCallback
} from "react";

import axios from "axios";

const AuthContext = createContext();

const BASE_URL = "https://api.quangdungcinema.id.vn";

const api = axios.create({

    baseURL: BASE_URL,

    withCredentials: true

});

export const AuthProvider = ({ children }) => {

    const [user, setUser] = useState(null);

    const [admin, setAdmin] = useState(null);

    const [loading, setLoading] = useState(true);

    /*=====================================================
        CHECK AUTH
    =====================================================*/

    const checkAuth = useCallback(async () => {

        setLoading(true);

        const isAdminDomain =
            window.location.hostname.startsWith("admin.");

        try {

            const url = isAdminDomain

                ? "/admin/api/auth/me"

                : "/api/auth/me";

            const res = await api.get(url);

            const account = res.data.user;

            if (isAdminDomain) {

                setAdmin(account);

                setUser(null);

            }

            else {

                setUser(account);

                setAdmin(null);

            }

        }

        catch (error) {

            setUser(null);

            setAdmin(null);

        }

        finally {

            setLoading(false);

        }

    }, []);

    /*=====================================================
        CLEAR AUTH
    =====================================================*/

    const clearAuth = useCallback(() => {

        setUser(null);

        setAdmin(null);

    }, []);

    /*=====================================================
        LOGOUT
    =====================================================*/

    const logout = useCallback(async () => {

        const isAdminDomain =
            window.location.hostname.startsWith("admin.");

        try {

            const url = isAdminDomain

                ? "/admin/api/auth/logout"

                : "/api/auth/logout";

            await api.post(url);

        }

        catch (error) {

            console.error(error);

        }

        finally {

            clearAuth();

            window.dispatchEvent(

                new Event("authChange")

            );

        }

    }, [clearAuth]);

    /*=====================================================
        INIT
    =====================================================*/

    useEffect(() => {

        checkAuth();

        const handleAuthChange = () => {

            checkAuth();

        };

        window.addEventListener(

            "authChange",

            handleAuthChange

        );

        return () => {

            window.removeEventListener(

                "authChange",

                handleAuthChange

            );

        };

    }, [checkAuth]);

    return (

        <AuthContext.Provider

            value={{

                user,

                admin,

                setUser,

                setAdmin,

                loading,

                checkAuth,

                clearAuth,

                logout,

                api,

                BASE_URL

            }}

        >

            {children}

        </AuthContext.Provider>

    );

};

export const useAuth = () => useContext(AuthContext);