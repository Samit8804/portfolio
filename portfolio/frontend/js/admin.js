/* ========================================
   ADMIN DASHBOARD JS
   ======================================== */

const API_URL = '';
const TOKEN = localStorage.getItem('adminToken');

// Auth check
if (!TOKEN) {
  window.location.href = 'login.html';
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  initTabs();
  initSidebar();
  initLogout();
  loadProjects();
  loadCertificates();
  loadResumeStats();
  loadMessages();
  initFilePreviews();
  initForms();
  if (typeof lucide !== 'undefined') lucide.createIcons();

  const name = localStorage.getItem('adminName') || 'Admin';
  document.getElementById('userName').textContent = name;
  document.getElementById('userInitial').textContent = name.charAt(0).toUpperCase();
});

// ===== TABS =====
function initTabs() {
  document.querySelectorAll('.sidebar-link').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.sidebar-link').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
      document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');

      document.getElementById('pageTitle').textContent = {
        projects: 'Manage Projects',
        certificates: 'Manage Certificates',
        resume: 'Upload Resume',
        messages: 'Contact Messages',
        theme: 'Theme Settings'
      }[btn.dataset.tab];

      // Close mobile sidebar
      document.getElementById('sidebar').classList.remove('open');
    });
  });
}

// ===== SIDEBAR =====
function initSidebar() {
  document.getElementById('sidebarToggle').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('open');
  });
}

// ===== LOGOUT =====
function initLogout() {
  document.getElementById('logoutBtn').addEventListener('click', () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminName');
    window.location.href = 'login.html';
  });
}

// ===== FILE PREVIEWS =====
function initFilePreviews() {
  document.getElementById('projectFileInput').addEventListener('change', (e) => {
    const container = document.getElementById('projectPreviews');
    container.innerHTML = '';
    Array.from(e.target.files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const div = document.createElement('div');
        div.className = 'image-preview';
        div.innerHTML = `<img src="${ev.target.result}" alt="Preview">`;
        container.appendChild(div);
      };
      reader.readAsDataURL(file);
    });
  });

  document.getElementById('certFileInput').addEventListener('change', (e) => {
    const container = document.getElementById('certPreviews');
    container.innerHTML = '';
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const div = document.createElement('div');
        div.className = 'image-preview';
        div.innerHTML = `<img src="${ev.target.result}" alt="Preview">`;
        container.appendChild(div);
      };
      reader.readAsDataURL(file);
    }
  });
}

// ===== FORMS =====
function initForms() {
  // Project form
  document.getElementById('projectForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const projectId = document.getElementById('projectId').value;
    const isEdit = !!projectId;

    try {
      const url = isEdit ? `${API_URL}/api/projects/${projectId}` : `${API_URL}/api/projects`;
      const res = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Authorization': `Bearer ${TOKEN}` },
        body: formData
      });

      const data = await res.json();
      if (data.success) {
        showToast(isEdit ? 'Project updated!' : 'Project added!', 'success');
        e.target.reset();
        document.getElementById('projectPreviews').innerHTML = '';
        document.getElementById('existingImages').innerHTML = '';
        document.getElementById('keepImages').value = '';
        hideAddProjectForm();
        loadProjects();
      } else {
        showToast(data.message || 'Failed to save project', 'error');
      }
    } catch (err) {
      showToast('Network error', 'error');
    }
  });

  // Certificate form
  document.getElementById('certForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);

    try {
      const res = await fetch(`${API_URL}/api/certificates`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${TOKEN}` },
        body: formData
      });

      const data = await res.json();
      if (data.success) {
        showToast('Certificate added!', 'success');
        e.target.reset();
        document.getElementById('certPreviews').innerHTML = '';
        hideAddCertForm();
        loadCertificates();
      } else {
        showToast(data.message || 'Failed', 'error');
      }
    } catch (err) {
      showToast('Network error', 'error');
    }
  });

  // Resume form
  document.getElementById('resumeForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);

    try {
      const res = await fetch(`${API_URL}/api/resume/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${TOKEN}` },
        body: formData
      });

      const data = await res.json();
      if (data.success) {
        showToast('Resume uploaded!', 'success');
        e.target.reset();
        loadResumeStats();
      } else {
        showToast(data.message || 'Failed', 'error');
      }
    } catch (err) {
      showToast('Network error', 'error');
    }
  });
}

// ===== SHOW/HIDE FORMS =====
function showAddProjectForm() {
  document.getElementById('formTitle').textContent = 'Add New Project';
  document.getElementById('projectId').value = '';
  document.getElementById('projectForm').reset();
  document.getElementById('projectPreviews').innerHTML = '';
  document.getElementById('existingImages').innerHTML = '';
  document.getElementById('addProjectForm').classList.remove('hidden');
}
function hideAddProjectForm() {
  document.getElementById('addProjectForm').classList.add('hidden');
}
function showAddCertForm() {
  document.getElementById('addCertForm').classList.remove('hidden');
}
function hideAddCertForm() {
  document.getElementById('addCertForm').classList.add('hidden');
}

// ===== LOAD PROJECTS =====
async function loadProjects() {
  const tbody = document.getElementById('projectsTableBody');

  try {
    const res = await fetch(`${API_URL}/api/projects?limit=100`);
    const data = await res.json();

    if (data.success && data.projects.length > 0) {
      tbody.innerHTML = data.projects.map(p => `
        <tr>
          <td>${p.images && p.images.length > 0
            ? `<img src="${API_URL}${p.images[0]}" class="table-thumb" alt="">`
            : `<div class="table-thumb-placeholder"><i data-lucide="image"></i></div>`
          }</td>
          <td class="table-title">${p.title}</td>
          <td><span class="tag">${p.category}</span></td>
          <td>${p.techStack.slice(0, 3).map(t => `<span class="tag" style="font-size:0.6875rem;padding:2px 8px">${t}</span>`).join(' ')}</td>
          <td>
            <div class="table-actions">
              <button class="table-action-btn view" onclick="editProject('${p._id}')">
                <i data-lucide="pencil"></i>
              </button>
              <button class="table-action-btn delete" onclick="deleteProject('${p._id}', '${p.title.replace(/'/g, "\\'")}')">
                <i data-lucide="trash-2"></i>
              </button>
            </div>
          </td>
        </tr>
      `).join('');
    } else {
      tbody.innerHTML = '<tr><td colspan="5" class="table-empty">No projects yet. Add your first project!</td></tr>';
    }
  } catch (err) {
    tbody.innerHTML = '<tr><td colspan="5" class="table-empty">Failed to load projects</td></tr>';
  }
  lucide.createIcons();
}

async function editProject(id) {
  try {
    const res = await fetch(`${API_URL}/api/projects/${id}`);
    const data = await res.json();
    if (!data.success) { showToast('Failed to load project', 'error'); return; }

    const p = data.project;
    document.getElementById('formTitle').textContent = 'Edit Project';
    document.getElementById('projectId').value = p._id;
    document.getElementById('projectTitle').value = p.title;
    document.getElementById('projectDescription').value = p.description;
    document.getElementById('projectTechStack').value = (p.techStack || []).join(', ');
    document.getElementById('projectCategory').value = p.category;
    document.getElementById('projectFeatured').value = p.featured ? 'true' : 'false';
    document.getElementById('projectGithubUrl').value = p.githubUrl || '';
    document.getElementById('projectLiveUrl').value = p.liveUrl || '';

    // Show existing images
    const container = document.getElementById('existingImages');
    container.innerHTML = '';
    if (p.images && p.images.length > 0) {
      const keepInput = document.getElementById('keepImages');
      keepInput.value = JSON.stringify(p.images);
      p.images.forEach(img => {
        const div = document.createElement('div');
        div.className = 'image-preview';
        div.innerHTML = `<img src="${API_URL}${img}" alt=""><button type="button" class="remove-img" data-img="${img}">&times;</button>`;
        container.appendChild(div);
      });
      // Add remove handlers
      container.querySelectorAll('.remove-img').forEach(btn => {
        btn.addEventListener('click', () => {
          const img = btn.dataset.img;
          const keep = JSON.parse(document.getElementById('keepImages').value || '[]');
          document.getElementById('keepImages').value = JSON.stringify(keep.filter(i => i !== img));
          btn.parentElement.remove();
        });
      });
    }

    document.getElementById('projectPreviews').innerHTML = '';
    document.getElementById('addProjectForm').classList.remove('hidden');
  } catch (err) {
    showToast('Network error', 'error');
  }
}

async function deleteProject(id, title) {
  if (!confirm(`Delete "${title}"?`)) return;

  try {
    const res = await fetch(`${API_URL}/api/projects/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${TOKEN}` }
    });

    const data = await res.json();
    if (data.success) {
      showToast('Project deleted', 'success');
      loadProjects();
    } else {
      showToast(data.message || 'Failed to delete', 'error');
    }
  } catch (err) {
    showToast('Network error', 'error');
  }
}

// ===== LOAD CERTIFICATES =====
async function loadCertificates() {
  const tbody = document.getElementById('certsTableBody');

  try {
    const res = await fetch(`${API_URL}/api/certificates`);
    const data = await res.json();

    if (data.success && data.certificates.length > 0) {
      tbody.innerHTML = data.certificates.map(c => `
        <tr>
          <td><img src="${API_URL}${c.image}" class="table-thumb" alt=""></td>
          <td class="table-title">${c.title}</td>
          <td>${c.issuer || '-'}</td>
          <td>${new Date(c.createdAt).toLocaleDateString()}</td>
          <td>
            <div class="table-actions">
              <button class="table-action-btn delete" onclick="deleteCert('${c._id}', '${c.title.replace(/'/g, "\\'")}')">
                <i data-lucide="trash-2"></i>
              </button>
            </div>
          </td>
        </tr>
      `).join('');
    } else {
      tbody.innerHTML = '<tr><td colspan="5" class="table-empty">No certificates yet</td></tr>';
    }
  } catch (err) {
    tbody.innerHTML = '<tr><td colspan="5" class="table-empty">Failed to load</td></tr>';
  }
  lucide.createIcons();
}

async function deleteCert(id, title) {
  if (!confirm(`Delete "${title}"?`)) return;

  try {
    const res = await fetch(`${API_URL}/api/certificates/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${TOKEN}` }
    });

    const data = await res.json();
    if (data.success) {
      showToast('Certificate deleted', 'success');
      loadCertificates();
    } else {
      showToast(data.message || 'Failed', 'error');
    }
  } catch (err) {
    showToast('Network error', 'error');
  }
}

// ===== RESUME STATS =====
async function loadResumeStats() {
  const container = document.getElementById('resumeStats');

  try {
    const res = await fetch(`${API_URL}/api/resume/stats`, {
      headers: { 'Authorization': `Bearer ${TOKEN}` }
    });
    const data = await res.json();

    if (data.success) {
      container.innerHTML = `
        <div class="resume-stat">
          <strong>${data.downloadCount}</strong>
          <span>Downloads</span>
        </div>
        <div class="resume-stat">
          <strong>${data.hasResume ? data.filename : 'None'}</strong>
          <span>Current File</span>
        </div>
      `;
    }
  } catch (err) {
    container.innerHTML = '<p style="color:var(--text-muted);font-size:0.875rem">Could not load stats</p>';
  }
}

// ===== MESSAGES =====
async function loadMessages() {
  const tbody = document.getElementById('messagesTableBody');

  try {
    const res = await fetch(`${API_URL}/api/contact`, {
      headers: { 'Authorization': `Bearer ${TOKEN}` }
    });
    const data = await res.json();

    if (data.success && data.messages.length > 0) {
      tbody.innerHTML = data.messages.map(m => `
        <tr style="${m.read ? '' : 'background:rgba(var(--accent-blue-rgb),0.03)'}">
          <td class="table-title">${m.name}</td>
          <td>${m.email}</td>
          <td>${m.subject || '-'}</td>
          <td>${new Date(m.createdAt).toLocaleDateString()}</td>
          <td>
            <div class="table-actions">
              <button class="table-action-btn view" onclick='viewMessage(${JSON.stringify(m).replace(/'/g, "&#39;")})'>
                <i data-lucide="eye"></i>
              </button>
              <button class="table-action-btn delete" onclick="deleteMessage('${m._id}')">
                <i data-lucide="trash-2"></i>
              </button>
            </div>
          </td>
        </tr>
      `).join('');
    } else {
      tbody.innerHTML = '<tr><td colspan="5" class="table-empty">No messages yet</td></tr>';
    }
  } catch (err) {
    tbody.innerHTML = '<tr><td colspan="5" class="table-empty">Failed to load messages</td></tr>';
  }
  lucide.createIcons();
}

function viewMessage(msg) {
  const modal = document.getElementById('messageModal');
  document.getElementById('messageDetail').innerHTML = `
    <div class="msg-header">
      <h3>${msg.subject || 'No Subject'}</h3>
      <div class="msg-meta">
        <span><strong>${msg.name}</strong></span>
        <span>${msg.email}</span>
        <span>${new Date(msg.createdAt).toLocaleString()}</span>
      </div>
    </div>
    <div class="msg-body">${msg.message}</div>
  `;
  modal.classList.add('active');

  // Mark as read
  fetch(`${API_URL}/api/contact/${msg._id}/read`, {
    method: 'PUT',
    headers: { 'Authorization': `Bearer ${TOKEN}` }
  });
}

function closeMessageModal() {
  document.getElementById('messageModal').classList.remove('active');
}

async function deleteMessage(id) {
  if (!confirm('Delete this message?')) return;

  try {
    const res = await fetch(`${API_URL}/api/contact/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${TOKEN}` }
    });

    const data = await res.json();
    if (data.success) {
      showToast('Message deleted', 'success');
      loadMessages();
    } else {
      showToast(data.message || 'Failed', 'error');
    }
  } catch (err) {
    showToast('Network error', 'error');
  }
}

// ===== TOAST =====
// ===== THEME PREVIEW =====
function previewTheme(theme) {
  document.documentElement.setAttribute('data-accent-theme', theme);
  document.documentElement.classList.add('theme-transitioning');
  setTimeout(function() {
    document.documentElement.classList.remove('theme-transitioning');
  }, 1000);
  showToast('Theme switched to ' + theme, 'success');

  document.querySelectorAll('.theme-preview').forEach(function(el) {
    el.style.borderColor = el.dataset.accentTheme === theme
      ? 'var(--accent-blue)'
      : 'transparent';
  });
}

function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  const icon = type === 'success' ? '&#10003;' : '&#10007;';
  toast.innerHTML = `<span>${icon}</span> ${message}`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('removing');
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}
