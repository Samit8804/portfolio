const API_URL = '';
let allProjects = [];
let currentPage = 1;
let currentFilter = 'All';
let currentSearch = '';

document.addEventListener('DOMContentLoaded', () => {
  initLoader();
  initCursor();
  initNavbar();
  initThemeToggle();
  initScrollAnimations();
  initSkillBars();
  initMobileMenu();
  initContactForm();
  initDownloadResume();
  initModals();
  initMagneticButtons();
  initParallax();
  loadProjects();
  loadCertificates();

  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }
});

// ===== LOADER =====
function initLoader() {
  const loader = document.getElementById('loader');
  const fill = loader?.querySelector('.loader-bar-fill');
  if (fill) setTimeout(() => fill.style.width = '100%', 100);
  window.addEventListener('load', () => {
    setTimeout(() => loader?.classList.add('hidden'), 800);
  });
  setTimeout(() => loader?.classList.add('hidden'), 2500);
}

// ===== CUSTOM CURSOR =====
function initCursor() {
  const dot = document.createElement('div');
  dot.className = 'cursor-dot';
  const ring = document.createElement('div');
  ring.className = 'cursor-ring';
  document.body.appendChild(dot);
  document.body.appendChild(ring);

  let mx = 0, my = 0;
  let ringX = 0, ringY = 0;

  document.addEventListener('mousemove', (e) => {
    mx = e.clientX;
    my = e.clientY;
    dot.style.left = mx + 'px';
    dot.style.top = my + 'px';
  });

  function animateRing() {
    ringX += (mx - ringX) * 0.12;
    ringY += (my - ringY) * 0.12;
    ring.style.left = ringX + 'px';
    ring.style.top = ringY + 'px';
    requestAnimationFrame(animateRing);
  }
  animateRing();

  document.querySelectorAll('a, button, input, textarea, [data-magnetic]').forEach(el => {
    el.addEventListener('mouseenter', () => ring.classList.add('hover'));
    el.addEventListener('mouseleave', () => ring.classList.remove('hover'));
  });
}

// ===== NAVBAR =====
function initNavbar() {
  const navbar = document.getElementById('navbar');
  const navLinks = document.querySelectorAll('.nav-link');

  window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }

    const sections = document.querySelectorAll('section[id]');
    let current = '';
    sections.forEach(section => {
      const sectionTop = section.offsetTop - 100;
      if (window.scrollY >= sectionTop) {
        current = section.getAttribute('id');
      }
    });

    navLinks.forEach(link => {
      link.classList.remove('active');
      if (link.dataset.section === current) {
        link.classList.add('active');
      }
    });
  });
}

// ===== MOBILE MENU =====
function initMobileMenu() {
  const menuBtn = document.getElementById('menuBtn');
  const mobileMenu = document.getElementById('mobileMenu');
  const mobileLinks = mobileMenu?.querySelectorAll('.mobile-link');

  menuBtn?.addEventListener('click', () => {
    menuBtn.classList.toggle('active');
    mobileMenu.classList.toggle('active');
  });

  mobileLinks?.forEach(link => {
    link.addEventListener('click', () => {
      menuBtn.classList.remove('active');
      mobileMenu.classList.remove('active');
    });
  });
}

// ===== THEME TOGGLE =====
function initThemeToggle() {
  const toggle = document.getElementById('themeToggle');
  toggle?.addEventListener('click', () => {
    document.documentElement.classList.toggle('theme-transitioning');
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    setTimeout(() => document.documentElement.classList.remove('theme-transitioning'), 800);
  });
}

// ===== SCROLL ANIMATIONS =====
function initScrollAnimations() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

  document.querySelectorAll('[data-animate]').forEach(el => {
    observer.observe(el);
  });
}

// ===== SKILL BARS =====
function initSkillBars() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const fills = entry.target.querySelectorAll('.skill-fill');
        fills.forEach((fill, i) => {
          setTimeout(() => {
            fill.style.width = fill.dataset.width + '%';
          }, i * 100);
        });
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.2 });

  const skillsCard = document.querySelector('.skills-card');
  if (skillsCard) observer.observe(skillsCard);
}

// ===== MAGNETIC BUTTONS =====
function initMagneticButtons() {
  document.querySelectorAll('[data-magnetic]').forEach(btn => {
    btn.addEventListener('mousemove', (e) => {
      const rect = btn.getBoundingClientRect();
      const x = (e.clientX - rect.left - rect.width / 2) * 0.3;
      const y = (e.clientY - rect.top - rect.height / 2) * 0.3;
      btn.style.transform = `translate(${x}px, ${y}px)`;
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.transform = '';
    });
  });
}

// ===== PARALLAX =====
function initParallax() {
  window.addEventListener('scroll', () => {
    const scrolled = window.scrollY;
    document.querySelectorAll('[data-parallax]').forEach(el => {
      const speed = parseFloat(el.dataset.parallax) || 0.3;
      el.style.transform = `translateY(${scrolled * speed}px)`;
    });
  });
}

// ===== PROJECTS =====
async function loadProjects() {
  const grid = document.getElementById('projectsGrid');

  try {
    const res = await fetch(`${API_URL}/api/projects?limit=100`);
    const data = await res.json();

    if (data.success && data.projects.length > 0) {
      allProjects = data.projects;
      renderProjects();
    } else {
      grid.innerHTML = '<div class="empty-state"><i data-lucide="folder-open"></i><p>No projects found. Check back soon!</p></div>';
      lucide.createIcons();
    }
  } catch (err) {
    grid.innerHTML = '<div class="empty-state"><i data-lucide="alert-circle"></i><p>Could not load projects. Please try again later.</p></div>';
    lucide.createIcons();
  }

  document.querySelectorAll('.filter-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentFilter = tab.dataset.filter;
      currentPage = 1;
      renderProjects();
    });
  });

  const searchInput = document.getElementById('projectSearch');
  searchInput?.addEventListener('input', (e) => {
    currentSearch = e.target.value.toLowerCase();
    currentPage = 1;
    renderProjects();
  });
}

function renderProjects() {
  const grid = document.getElementById('projectsGrid');

  let filtered = allProjects;

  if (currentFilter !== 'All') {
    filtered = filtered.filter(p => p.category === currentFilter);
  }

  if (currentSearch) {
    filtered = filtered.filter(p =>
      p.title.toLowerCase().includes(currentSearch) ||
      p.description.toLowerCase().includes(currentSearch) ||
      p.techStack.some(t => t.toLowerCase().includes(currentSearch))
    );
  }

  if (filtered.length === 0) {
    grid.innerHTML = '<div class="empty-state"><i data-lucide="search-x"></i><p>No projects match your filter.</p></div>';
    lucide.createIcons();
    return;
  }

  grid.innerHTML = filtered.map(project => {
    const hasImage = project.images && project.images.length > 0;
    return `
      <div class="project-card" onclick="openProjectModal('${project._id}')">
        <div class="project-card-image">
          ${hasImage
            ? `<img src="${API_URL}${project.images[0]}" alt="${project.title}" loading="lazy">`
            : `<div class="placeholder-icon"><i data-lucide="image"></i></div>`
          }
          <span class="project-category-badge">${project.category}</span>
          <div class="project-card-overlay">
            ${project.githubUrl ? `<a href="${project.githubUrl}" target="_blank" class="overlay-btn" onclick="event.stopPropagation()" title="GitHub"><i data-lucide="github"></i></a>` : ''}
            ${project.liveUrl ? `<a href="${project.liveUrl}" target="_blank" class="overlay-btn" onclick="event.stopPropagation()" title="Live Demo"><i data-lucide="external-link"></i></a>` : ''}
            <button class="overlay-btn" title="View Details"><i data-lucide="eye"></i></button>
          </div>
        </div>
        <div class="project-card-body">
          <h3>${project.title}</h3>
          <p>${project.description}</p>
          <div class="project-tags">
            ${project.techStack.slice(0, 4).map(t => `<span class="project-tag">${t}</span>`).join('')}
            ${project.techStack.length > 4 ? `<span class="project-tag">+${project.techStack.length - 4}</span>` : ''}
          </div>
        </div>
      </div>
    `;
  }).join('');

  lucide.createIcons();
}

// ===== CERTIFICATES =====
async function loadCertificates() {
  const grid = document.getElementById('certificatesGrid');

  try {
    const res = await fetch(`${API_URL}/api/certificates`);
    const data = await res.json();

    if (data.success && data.certificates.length > 0) {
      grid.innerHTML = data.certificates.map(cert => `
        <div class="cert-card" onclick="openCertModal('${API_URL}${cert.image}', '${cert.title.replace(/'/g, "\\'")}', '${(cert.issuer || '').replace(/'/g, "\\'")}')">
          <div class="cert-card-image">
            <img src="${API_URL}${cert.image}" alt="${cert.title}" loading="lazy">
          </div>
          <div class="cert-card-body">
            <h4>${cert.title}</h4>
            ${cert.issuer ? `<p class="cert-issuer">${cert.issuer}</p>` : ''}
            <p class="cert-date">${new Date(cert.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short' })}</p>
          </div>
        </div>
      `).join('');
    } else {
      const empty = document.getElementById('certsEmpty');
      if (empty) empty.style.display = 'flex';
    }
  } catch (err) {
    const empty = document.getElementById('certsEmpty');
    if (empty) empty.style.display = 'flex';
  }
}

// ===== MODALS =====
function initModals() {
  document.getElementById('certModalClose')?.addEventListener('click', () => {
    document.getElementById('certModal')?.classList.remove('active');
  });

  document.getElementById('projectModalClose')?.addEventListener('click', () => {
    document.getElementById('projectModal')?.classList.remove('active');
  });

  document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
    backdrop.addEventListener('click', () => {
      backdrop.closest('.modal')?.classList.remove('active');
    });
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal.active').forEach(m => m.classList.remove('active'));
    }
  });
}

function openCertModal(imageSrc, title, issuer) {
  const modal = document.getElementById('certModal');
  document.getElementById('certModalImage').src = imageSrc;
  document.getElementById('certModalTitle').textContent = title;
  document.getElementById('certModalIssuer').textContent = issuer || '';
  modal?.classList.add('active');
}

function openProjectModal(projectId) {
  const project = allProjects.find(p => p._id === projectId);
  if (!project) return;

  const modal = document.getElementById('projectModal');
  const body = document.getElementById('projectModalBody');

  body.innerHTML = `
    <h2>${project.title}</h2>
    ${project.images && project.images.length > 0 ? `
      <div class="project-modal-images">
        ${project.images.map(img => `<img src="${API_URL}${img}" alt="${project.title}" loading="lazy">`).join('')}
      </div>
    ` : ''}
    <div class="project-modal-tags">
      ${project.techStack.map(t => `<span class="project-tag">${t}</span>`).join('')}
    </div>
    <p class="project-modal-desc">${project.description}</p>
    <div class="project-modal-links">
      ${project.githubUrl ? `<a href="${project.githubUrl}" target="_blank" class="btn"><i data-lucide="github"></i> GitHub</a>` : ''}
      ${project.liveUrl ? `<a href="${project.liveUrl}" target="_blank" class="btn btn-primary"><i data-lucide="external-link"></i> Live Demo</a>` : ''}
    </div>
  `;

  modal?.classList.add('active');
  lucide.createIcons();
}

// ===== CONTACT FORM =====
function initContactForm() {
  const form = document.getElementById('contactForm');
  const btn = document.getElementById('contactBtn');

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = document.getElementById('contactName').value.trim();
    const email = document.getElementById('contactEmail').value.trim();
    const subject = document.getElementById('contactSubject').value.trim();
    const message = document.getElementById('contactMessage').value.trim();

    if (!name || !email || !message) {
      showToast('Please fill in all required fields.', 'error');
      return;
    }

    btn.disabled = true;
    btn.innerHTML = '<span>Sending...</span>';

    try {
      const res = await fetch(`${API_URL}/api/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, subject, message })
      });

      const data = await res.json();

      if (data.success) {
        showToast('Message sent successfully! I will get back to you soon.', 'success');
        form.reset();
      } else {
        showToast(data.message || 'Failed to send message.', 'error');
      }
    } catch (err) {
      showToast('Network error. Please try again.', 'error');
    }

    btn.disabled = false;
    btn.innerHTML = '<span>Send Message</span>';
  });
}

// ===== DOWNLOAD RESUME =====
function initDownloadResume() {
  document.getElementById('downloadResumeBtn')?.addEventListener('click', async () => {
    try {
      const res = await fetch(`${API_URL}/api/resume/download`);
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'Samit_Fartyal_Resume.pdf';
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
        showToast('Resume downloaded!', 'success');
      } else {
        showToast('No resume available yet.', 'error');
      }
    } catch (err) {
      showToast('Could not download resume.', 'error');
    }
  });
}

// ===== TOAST =====
function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${type === 'success' ? '\u2713' : '\u2717'}</span> ${message}`;

  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('removing');
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}
