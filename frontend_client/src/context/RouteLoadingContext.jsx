import React, {
    createContext,
    useContext,
    useState,
    useCallback
} from "react";

const RouteLoadingContext = createContext(null);

export const RouteLoadingProvider = ({ children }) => {

    const [loading, setLoading] = useState(false);

    // ==========================================================
    // START LOADING
    // ==========================================================

    const startLoading = useCallback(() => {

        setLoading(true);

    }, []);

    // ==========================================================
    // STOP LOADING
    // ==========================================================

    const stopLoading = useCallback(() => {

        setLoading(false);

    }, []);

    // ==========================================================
    // VALUE
    // ==========================================================

    const value = {

        loading,

        startLoading,

        stopLoading

    };

    return (

        <RouteLoadingContext.Provider value={value}>

            {children}

        </RouteLoadingContext.Provider>

    );

};

// ==========================================================
// CUSTOM HOOK
// ==========================================================

export const useRouteLoading = () => {

    const context = useContext(RouteLoadingContext);

    if (!context) {

        throw new Error(
            "useRouteLoading phải được sử dụng bên trong RouteLoadingProvider."
        );

    }

    return context;

};