(() => {
  async function logActivity(eventType, metadata = {}) {
    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token') || '';
      await fetch('/api/usage-logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: 'Bearer ' + token } : {}),
        },
        body: JSON.stringify({
          eventType,
          pageUrl: window.location.pathname,
          metadata,
        }),
      });
    } catch {}
  }
  window.logActivity = logActivity;
  document.addEventListener('DOMContentLoaded', () => logActivity('PAGE_VIEW'));
})();
