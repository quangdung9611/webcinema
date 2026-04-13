const checkAuth = useCallback(async () => {
    setLoading(true);

    const hostname = window.location.hostname;
    const isAdminDomain = hostname === 'admin.quangdungcinema.id.vn';

    try {
        if (isAdminDomain) {
    // 🔥 ADMIN → PHẢI GỌI ĐÚNG API ADMIN
    const res = await axios.get(`${BASE_URL}/admin/api/auth/me`, {
        withCredentials: true
    });

    if (res.data?.user?.role === 'admin') {
        setAdmin(res.data.user);
    } else {
        setAdmin(null);
    }

    setUser(null);

} else {
    // 🔥 USER
    const res = await axios.get(`${BASE_URL}/api/auth/me`, {
        withCredentials: true
    });

    if (res.data?.user) {
        setUser(res.data.user);
    } else {
        setUser(null);
    }

    setAdmin(null);
}

    } catch (err) {
        console.log("Auth error:", err);
    } finally {
        setLoading(false);
    }

}, []);