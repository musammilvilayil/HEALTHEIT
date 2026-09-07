(() => {
  let mentors = [];

  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  async function loadProfile() {
    const target = document.getElementById('profileInfo');
    if (!target) return;
    const response = await window.authManager.apiRequest('/api/auth/profile');
    const data = await response.json();
    if (!response.ok) {
      target.innerHTML = '<p>Could not load profile.</p>';
      return;
    }
    const u = data.user;
    const name = [u.firstName, u.lastName].filter(Boolean).join(' ') || u.email;
    target.className = '';
    target.innerHTML = `
      <div class="profile-display">
        <h3>${esc(name)}</h3>
        <p>${esc(u.email)}</p>
        <p><strong>Age:</strong> ${esc(u.age || '—')} &nbsp; <strong>Gender:</strong> ${esc(u.gender || '—')}</p>
        <p><strong>Height:</strong> ${esc(u.height || '—')} cm &nbsp; <strong>Weight:</strong> ${esc(u.weight || '—')} kg</p>
        <p><strong>Goals:</strong> ${u.goals?.length ? u.goals.map(esc).join(', ') : 'Add your first goal'}</p>
      </div>`;
    const fields = ['firstName','lastName','age','gender','height','weight','activityLevel'];
    const complete = Math.round(fields.filter(k => u[k] !== undefined && u[k] !== null && u[k] !== '').length / fields.length * 100);
    const completion = document.getElementById('profileCompletion');
    if (completion) completion.innerHTML = `<small>Profile completion: ${complete}%</small>`;
  }

  async function loadMentor() {
    const container = document.getElementById('mentorInfo');
    if (!container) return;
    const response = await window.authManager.apiRequest('/api/users/my-mentor');
    const data = await response.json();
    const mentor = data.mentor;
    const chat = document.getElementById('chatBtn');
    const history = document.getElementById('historyBtn');
    const action = document.getElementById('mentorActionText');

    if (!mentor) {
      if (chat) chat.style.display = 'none';
      if (history) history.style.display = 'none';
      if (action) action.textContent = 'Find Mentor';
      container.innerHTML = '<div class="mentor-card"><div class="mentor-details"><h4>Looking for a mentor?</h4><p>Connect with a health professional to guide your journey.</p><button class="btn btn-primary" onclick="openMentorSelection()">Find a Mentor</button></div></div>';
      return;
    }

    if (chat) chat.style.display = '';
    if (history) history.style.display = '';
    if (action) action.textContent = 'Change Mentor';
    const name = [mentor.firstName, mentor.lastName].filter(Boolean).join(' ') || 'Your Mentor';
    container.innerHTML = `
      <div class="mentor-card connected">
        <div class="mentor-details">
          <h4>${esc(name)}</h4>
          <p>${esc(mentor.bio || 'Health & wellness mentor')}</p>
          <p><strong>Specialty:</strong> ${esc((mentor.specialty || []).join(', ') || 'General wellness')}</p>
          <p><strong>Experience:</strong> ${esc(mentor.experience || 0)} years</p>
          <button class="unassign-mentor-btn" id="unassignMentorBtn">Unassign Mentor</button>
        </div>
      </div>`;
    document.getElementById('unassignMentorBtn')?.addEventListener('click', async () => {
      if (!confirm('Unassign your current mentor?')) return;
      const r = await window.authManager.apiRequest('/api/users/my-mentor', { method: 'DELETE', body: JSON.stringify({ reason: 'Changed by mentee' }) });
      if (r.ok) {
        window.authManager.showMessage('Mentor unassigned', 'success');
        loadMentor();
      }
    });
  }

  async function loadMentors() {
    const list = document.getElementById('mentorsList');
    if (!list) return;
    list.innerHTML = '<p>Loading mentors…</p>';
    const response = await window.authManager.apiRequest('/api/users?role=Mentor');
    const data = await response.json();
    mentors = data.users || [];
    const specialties = [...new Set(mentors.flatMap(m => Array.isArray(m.specialty) ? m.specialty : []))].sort();
    const filter = document.getElementById('specialtyFilter');
    if (filter) {
      filter.innerHTML = '<option value="">All Specialties</option>' + specialties.map(s => `<option value="${esc(s)}">${esc(s)}</option>`).join('');
    }
    renderMentors();
  }

  function renderMentors() {
    const list = document.getElementById('mentorsList');
    if (!list) return;
    const query = (document.getElementById('mentorSearchInput')?.value || '').toLowerCase();
    const specialty = document.getElementById('specialtyFilter')?.value || '';
    const filtered = mentors.filter(m => {
      const text = `${m.firstName || ''} ${m.lastName || ''} ${(m.specialty || []).join(' ')}`.toLowerCase();
      return (!query || text.includes(query)) && (!specialty || (m.specialty || []).includes(specialty));
    });
    if (!filtered.length) {
      list.innerHTML = '<p>No mentors match your search.</p>';
      return;
    }
    list.innerHTML = filtered.map(m => {
      const name = [m.firstName, m.lastName].filter(Boolean).join(' ') || m.email;
      return `<div class="mentor-card">
        <div class="mentor-details">
          <h4>${esc(name)}</h4>
          <p>${esc((m.specialty || []).join(', ') || 'General wellness')}</p>
          <p>${esc(m.bio || '')}</p>
          <button class="select-mentor-btn" data-mentor-id="${m._id}">Select Mentor</button>
        </div>
      </div>`;
    }).join('');
    list.querySelectorAll('[data-mentor-id]').forEach(btn => btn.addEventListener('click', async () => {
      const response = await window.authManager.apiRequest('/api/users/my-mentor', {
        method: 'POST',
        body: JSON.stringify({ mentorId: btn.dataset.mentorId }),
      });
      const data = await response.json();
      if (!response.ok) return window.authManager.showMessage(data.message || 'Could not select mentor', 'error');
      window.authManager.showMessage('Mentor connected', 'success');
      closeMentorSelection();
      loadMentor();
    }));
  }

  window.openMentorSelection = () => {
    const modal = document.getElementById('mentorSelectionModal');
    if (modal) modal.style.display = 'flex';
    loadMentors();
  };
  window.closeMentorSelection = () => {
    const modal = document.getElementById('mentorSelectionModal');
    if (modal) modal.style.display = 'none';
  };
  window.filterMentors = renderMentors;
  window.openMentorChat = () => { window.location.href = 'mentee_chat.html'; };
  window.viewMentorHistory = async () => {
    const r = await window.authManager.apiRequest('/api/users/my-mentor/history');
    const data = await r.json();
    const lines = (data.history || []).map(h => {
      const name = [h.mentor?.firstName, h.mentor?.lastName].filter(Boolean).join(' ') || 'Mentor';
      return `${name} — ${new Date(h.assignedAt).toLocaleDateString()}${h.unassignedAt ? ' to ' + new Date(h.unassignedAt).toLocaleDateString() : ' (current)'}`;
    });
    alert(lines.length ? lines.join('\n') : 'No mentor history yet.');
  };
  window.openGoalModal = async () => {
    const goal = prompt('Add a health goal');
    if (!goal?.trim()) return;
    const p = await window.authManager.apiRequest('/api/auth/profile');
    const data = await p.json();
    const goals = [...(data.user?.goals || []), goal.trim()];
    const r = await window.authManager.apiRequest('/api/auth/profile', { method: 'PUT', body: JSON.stringify({ goals }) });
    if (r.ok) {
      window.authManager.showMessage('Goal added', 'success');
      loadProfile();
    }
  };

  document.addEventListener('DOMContentLoaded', () => {
    if (!window.authManager.requireAuth('Mentee')) return;
    loadProfile();
    loadMentor();
  });
})();
