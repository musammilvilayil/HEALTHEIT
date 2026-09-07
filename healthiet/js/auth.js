(() => {
  class AuthManager {
    constructor() {
      this.token = localStorage.getItem('authToken') || localStorage.getItem('token') || '';
      this.user = this.readUser();
      if (this.token) {
        localStorage.setItem('authToken', this.token);
        localStorage.setItem('token', this.token);
      }
    }

    readUser() {
      try {
        return JSON.parse(localStorage.getItem('currentUser') || 'null');
      } catch {
        return null;
      }
    }

    setAuth(token, user) {
      this.token = token || '';
      this.user = user || null;
      if (this.token) {
        localStorage.setItem('authToken', this.token);
        localStorage.setItem('token', this.token);
      }
      if (this.user) {
        localStorage.setItem('currentUser', JSON.stringify(this.user));
        localStorage.setItem('userRole', this.user.role || 'Mentee');
      }
      window.dispatchEvent(new CustomEvent('authStateChanged', { detail: { user: this.user } }));
    }

    clearAuth() {
      this.token = '';
      this.user = null;
      ['authToken', 'token', 'currentUser', 'userRole'].forEach(key => localStorage.removeItem(key));
      window.dispatchEvent(new CustomEvent('authStateChanged', { detail: { user: null } }));
    }

    getToken() { return this.token || localStorage.getItem('authToken') || localStorage.getItem('token') || ''; }
    getUser() { return this.user || this.readUser(); }
    getUserRole() { return this.getUser()?.role || localStorage.getItem('userRole') || null; }
    isAuthenticated() { return Boolean(this.getToken() && this.getUser()); }

    async login(email, password) {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Login failed');
      this.setAuth(data.token, data.user);
      return data;
    }

    async register(email, password) {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Registration failed');
      this.setAuth(data.token, data.user);
      return data;
    }

    async apiRequest(url, options = {}) {
      const headers = new Headers(options.headers || {});
      const token = this.getToken();
      if (token) headers.set('Authorization', 'Bearer ' + token);
      if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
      }
      const response = await fetch(url, { ...options, headers });
      if (response.status === 401) {
        this.clearAuth();
      }
      return response;
    }

    requireAuth(requiredRole = null) {
      if (!this.isAuthenticated()) {
        window.location.href = 'auth.html';
        return false;
      }
      if (requiredRole && this.getUserRole() !== requiredRole) {
        this.redirectToDashboard();
        return false;
      }
      return true;
    }

    redirectToDashboard() {
      window.location.href = window.getDashboardUrl(this.getUserRole());
    }

    logout() {
      this.clearAuth();
      window.location.href = 'auth.html';
    }

    showMessage(message, type = 'info') {
      let box = document.getElementById('healthiet-global-message');
      if (!box) {
        box = document.createElement('div');
        box.id = 'healthiet-global-message';
        box.style.cssText = 'position:fixed;right:18px;bottom:18px;z-index:99999;max-width:360px;padding:12px 16px;border-radius:10px;color:#fff;font:600 14px system-ui;box-shadow:0 8px 30px rgba(0,0,0,.2)';
        document.body.appendChild(box);
      }
      box.textContent = message;
      box.style.background = type === 'error' ? '#dc3545' : type === 'success' ? '#198754' : '#126663';
      box.style.display = 'block';
      clearTimeout(box._timer);
      box._timer = setTimeout(() => { box.style.display = 'none'; }, 3200);
    }
  }

  window.authManager = window.authManager || new AuthManager();
  window.isLoggedIn = () => window.authManager.isAuthenticated();
  window.getUserRole = () => window.authManager.getUserRole();
  window.getUserId = () => window.authManager.getUser()?._id || window.authManager.getUser()?.id || null;
  window.getDashboardUrl = role => role === 'Admin'
    ? 'admin_portal.html'
    : role === 'Mentor'
      ? 'mentor_dashboard.html'
      : 'mentee_dashboard.html';
})();
