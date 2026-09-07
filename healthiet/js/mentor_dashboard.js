(() => {
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  async function loadProfile() {
    const r = await window.authManager.apiRequest('/api/auth/profile');
    const data = await r.json();
    if (!r.ok) return;
    const u = data.user;
    const name = [u.firstName, u.lastName].filter(Boolean).join(' ') || u.email;
    const info = document.getElementById('profileInfo');
    if (info) {
      info.className = '';
      info.innerHTML = `<div><h3>${esc(name)}</h3><p>${esc(u.email)}</p><p><strong>Specialty:</strong> ${esc((u.specialty || []).join(', ') || 'Not set')}</p><p>${esc(u.bio || 'Add your professional bio.')}</p><button id="editMentorProfile" class="btn btn-primary">Edit Profile</button></div>`;
      document.getElementById('editMentorProfile')?.addEventListener('click', () => openProfileModal(u));
    }
    const userInfo = document.getElementById('userInfo');
    if (userInfo) userInfo.textContent = name;
  }

  async function loadMentees() {
    const r = await window.authManager.apiRequest('/api/users/my-mentees');
    const data = await r.json();
    const list = document.getElementById('menteesList');
    const mentees = data.mentees || [];
    document.getElementById('menteeCount').textContent = `(${mentees.length})`;
    document.getElementById('totalMentees').textContent = mentees.length;
    if (!list) return;
    list.className = '';
    list.innerHTML = mentees.length ? mentees.map(m => {
      const name = [m.firstName,m.lastName].filter(Boolean).join(' ') || m.email;
      return `<div class="mentee-card"><div class="mentee-details"><h3>${esc(name)}</h3><p>${esc(m.email)}</p><p>Goals: ${esc((m.goals || []).join(', ') || 'Not set')}</p><a href="mentee_profile_view.html?id=${m._id}" class="btn btn-primary">View Progress</a></div></div>`;
    }).join('') : '<p>No mentees assigned yet.</p>';
  }

  function openProfileModal(u) {
    const modal = document.getElementById('profileUpdateModal');
    if (!modal) return;
    const fields = ['firstName','lastName','email','phone','age','gender','experience','certifications','bio','location','timezone','availability','rates','linkedin','website','portfolio'];
    fields.forEach(key => {
      const el = document.getElementById(key);
      if (el) el.value = u[key] ?? '';
    });
    const specialty = document.getElementById('specialty');
    if (specialty) specialty.value = Array.isArray(u.specialty) ? (u.specialty[0] || '') : (u.specialty || '');
    const languages = document.getElementById('languages');
    if (languages) languages.value = (u.languages || []).join(', ');
    modal.style.display = 'flex';
  }

  async function saveProfile(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());
    data.specialty = data.specialty ? [data.specialty] : [];
    data.languages = data.languages ? data.languages.split(',').map(x => x.trim()).filter(Boolean) : [];
    const r = await window.authManager.apiRequest('/api/auth/profile', { method: 'PUT', body: JSON.stringify(data) });
    const body = await r.json();
    if (!r.ok) return window.authManager.showMessage(body.message || 'Could not update profile', 'error');
    window.authManager.setAuth(window.authManager.getToken(), body.user);
    document.getElementById('profileUpdateModal').style.display = 'none';
    window.authManager.showMessage('Profile updated', 'success');
    loadProfile();
  }

  window.openBulkMessageModal = () => { window.location.href = 'mentor_chat.html'; };
  window.openScheduleModal = () => window.authManager.showMessage('Session scheduling is planned for the next version.');
  window.generateReport = () => window.authManager.showMessage('Open a mentee profile to review progress data.');
  window.openResourcesModal = () => window.authManager.showMessage('Resource sharing is planned for the next version.');
  window.viewAllActivity = () => window.authManager.showMessage('Recent activity is generated from live user actions.');

  document.addEventListener('DOMContentLoaded', () => {
    if (!window.authManager.requireAuth('Mentor')) return;
    document.getElementById('logoutButton').style.display = '';
    document.getElementById('logoutButton').addEventListener('click', () => window.authManager.logout());
    document.getElementById('closeProfileModal')?.addEventListener('click', () => { document.getElementById('profileUpdateModal').style.display = 'none'; });
    document.getElementById('cancelProfileUpdate')?.addEventListener('click', () => { document.getElementById('profileUpdateModal').style.display = 'none'; });
    document.getElementById('profileUpdateForm')?.addEventListener('submit', saveProfile);
    loadProfile();
    loadMentees();
  });
})();
