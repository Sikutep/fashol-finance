import axios from 'axios';
window.axios = axios;

window.axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';

// Auto-inject CSRF token and XMLHttpHeader into fetch requests
if (typeof document !== 'undefined') {
    const getCsrfToken = () => {
        const meta = document.querySelector('meta[name="csrf-token"]');
        if (meta && meta.content) return meta.content;
        const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
        if (match) return decodeURIComponent(match[1]);
        return '';
    };

    const originalFetch = window.fetch;
    window.fetch = async (url, options = {}) => {
        const headers = new Headers(options.headers || {});
        if (!headers.has('X-Requested-With')) {
            headers.set('X-Requested-With', 'XMLHttpRequest');
        }
        const token = getCsrfToken();
        if (token && !headers.has('X-CSRF-TOKEN')) {
            headers.set('X-CSRF-TOKEN', token);
        }
        return originalFetch(url, { ...options, headers });
    };
}

