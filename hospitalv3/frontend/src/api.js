import axios from "axios";

const baseURL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

const api = axios.create({
  baseURL,
  timeout: 15000,
});

const authState = {
  getAccessToken: () => null,
  getRefreshToken: () => null,
  setTokens: () => {},
  onSessionExpired: () => {},
};

export function configureApiAuth(config) {
  authState.getAccessToken = config.getAccessToken;
  authState.getRefreshToken = config.getRefreshToken;
  authState.setTokens = config.setTokens;
  authState.onSessionExpired = config.onSessionExpired;
}

api.interceptors.request.use((config) => {
  const token = authState.getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let refreshPromise = null;
const AUTH_ENDPOINTS_WITHOUT_AUTO_REFRESH = ["/auth/login", "/auth/refresh", "/auth/logout"];

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;
    const requestUrl = originalRequest?.url || "";
    const isAuthEndpoint = AUTH_ENDPOINTS_WITHOUT_AUTO_REFRESH.some((path) =>
      requestUrl.includes(path)
    );

    if (status !== 401 || originalRequest?._retry || isAuthEndpoint) {
      return Promise.reject(error);
    }

    const refreshToken = authState.getRefreshToken();
    if (!refreshToken) {
      authState.onSessionExpired();
      return Promise.reject(error);
    }

    try {
      if (!refreshPromise) {
        refreshPromise = api
          .post("/auth/refresh", { refreshToken: refreshToken })
          .then((res) => {
            authState.setTokens(res.data);
            return res.data;
          })
          .finally(() => {
            refreshPromise = null;
          });
      }

      const refreshed = await refreshPromise;
      originalRequest._retry = true;
      originalRequest.headers.Authorization = `Bearer ${refreshed.accessToken}`;
      return api(originalRequest);
    } catch (refreshError) {
      if (!window.__sessionExpiredFired) {
        window.__sessionExpiredFired = true;
        authState.onSessionExpired();
        setTimeout(() => { window.__sessionExpiredFired = false; }, 2000);
      }
      return Promise.reject(refreshError);
    }
  }
);

export default api;
