(() => {
  let applications = [];
  let selected = null;
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  async function load() {
    const r = await window.authManager.apiRequest('/api/mentor-applications');
    const data = await r.json();
    if (!r.ok) return window.authManager.showMessage(data.message || 'Could not load applications', 'error');
    applications = Array.isArray(data) ? data : (data.data || []);
    render();
  }

  function render() {
    const status = (document.getElementById('statusFilter')?.value || 'all').toLowerCase();
    const specialization = (document.getElementById('specializationFilter')?.value || 'all').toLowerCase();
    const filtered = applications.filter(a => {
      const current = String(a.mentorApplicationStatus || a.status || '').toLowerCase();
      const specs = (a.specialization || []).join(' ').toLowerCase();
      return (status === 'all' || current === status) && (specialization === 'all' || specs.includes(specialization));
    });

    document.getElementById('totalApplications').textContent = applications.length;
    document.getElementById('pendingApplications').textContent = applications.filter(a => (a.status || a.mentorApplicationStatus) === 'Pending').length;
    document.getElementById('approvedApplications').textContent = applications.filter(a => (a.status || a.mentorApplicationStatus) === 'Approved').length;
    document.getElementById('rejectedApplications').textContent = applications.filter(a => (a.status || a.mentorApplicationStatus) === 'Rejected').length;

    const grid = document.getElementById('applicationsGrid');
    grid.innerHTML = filtered.length ? filtered.map(a => `
      <article class="application-card" data-id="${a._id}">
        <h3>${esc(a.fullName || a.email || 'Applicant')}</h3>
        <p>${esc(a.email || '')}</p>
        <p><strong>Specialization:</strong> ${esc((a.specialization || []).join(', ') || 'Not specified')}</p>
        <p><strong>Experience:</strong> ${esc(a.experience || 0)} years</p>
        <span class="status-badge status-${String(a.status || '').toLowerCase()}">${esc(a.status || 'Pending')}</span>
        <button class="btn btn-primary view-application" data-id="${a._id}">Review</button>
      </article>`).join('') : '<p>No mentor applications found.</p>';

    grid.querySelectorAll('.view-application').forEach(btn => btn.addEventListener('click', () => openApplication(btn.dataset.id)));
  }

  function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value || '—';
  }

  function openApplication(id) {
    selected = applications.find(a => a._id === id);
    if (!selected) return;
    setText('modalFullName', selected.fullName);
    setText('modalEmail', selected.email);
    setText('modalPhone', selected.phone);
    setText('modalLocation', selected.location);
    setText('modalSpecialization', (selected.specialization || []).join(', '));
    setText('modalExperience', selected.experience ? selected.experience + ' years' : '—');
    setText('modalCertifications', selected.certifications);
    setText('modalEducation', selected.education);
    setText('modalAppDate', selected.createdAt ? new Date(selected.createdAt).toLocaleDateString() : '—');
    setText('modalStatus', selected.status);
    setText('modalStatement', selected.statement);
    setText('modalLinks', (selected.links || []).join(', '));
    document.getElementById('applicationModal').style.display = 'flex';
  }

  async function decide(status) {
    if (!selected) return;
    const r = await window.authManager.apiRequest('/api/mentor-applications/' + selected._id, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    const data = await r.json();
    if (!r.ok) return window.authManager.showMessage(data.message || 'Could not update application', 'error');
    document.getElementById('applicationModal').style.display = 'none';
    window.authManager.showMessage('Application ' + status.toLowerCase(), 'success');
    load();
  }

  document.addEventListener('DOMContentLoaded', () => {
    if (!window.authManager.requireAuth('Admin')) return;
    document.getElementById('statusFilter')?.addEventListener('change', render);
    document.getElementById('specializationFilter')?.addEventListener('change', render);
    document.querySelector('#applicationModal .close-modal')?.addEventListener('click', () => { document.getElementById('applicationModal').style.display = 'none'; });
    document.getElementById('approveBtn')?.addEventListener('click', () => decide('Approved'));
    document.getElementById('rejectBtn')?.addEventListener('click', () => decide('Rejected'));
    load();
  });
})();
