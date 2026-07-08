(function() {
  var themes = [
    'monochrome', 'electric-blue', 'emerald', 'warm-brown',
    'purple', 'crimson', 'golden', 'rose', 'teal', 'platinum'
  ];

  var colors = {
    'monochrome':     { r: 200, g: 200, b: 200 },
    'electric-blue':  { r: 60,  g: 140, b: 255 },
    'emerald':        { r: 16,  g: 160, b: 100 },
    'warm-brown':     { r: 180, g: 150, b: 110 },
    'purple':         { r: 160, g: 100, b: 240 },
    'crimson':        { r: 200, g: 60,  b: 70  },
    'golden':         { r: 230, g: 190, b: 80  },
    'rose':           { r: 220, g: 120, b: 160 },
    'teal':           { r: 60,  g: 190, b: 210 },
    'platinum':       { r: 190, g: 190, b: 200 }
  };

  function getStored() { return sessionStorage.getItem('sf-theme'); }
  function setStored(t) { sessionStorage.setItem('sf-theme', t); }

  var current = getStored();
  if (!current) {
    current = themes[Math.floor(Math.random() * themes.length)];
    setStored(current);
  }

  applyTheme(current);

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-accent-theme', theme);
    setStored(theme);
    createParticles(theme);
  }

  function shuffleTheme() {
    var remaining = themes.filter(function(t) { return t !== current; });
    var next = remaining[Math.floor(Math.random() * remaining.length)];
    current = next;

    document.documentElement.classList.add('theme-transitioning');
    applyTheme(next);
    setTimeout(function() {
      document.documentElement.classList.remove('theme-transitioning');
    }, 700);
  }

  function createParticles(theme) {
    var existing = document.getElementById('themeParticles');
    if (existing) existing.remove();

    var c = colors[theme] || { r: 255, g: 255, b: 255 };
    var container = document.createElement('div');
    container.className = 'theme-particles';
    container.id = 'themeParticles';
    for (var i = 0; i < 16; i++) {
      var p = document.createElement('div');
      p.className = 'theme-particle';
      var size = 2 + Math.random() * 5;
      p.style.width = size + 'px';
      p.style.height = size + 'px';
      p.style.left = Math.random() * 100 + '%';
      p.style.animationDelay = Math.random() * 12 + 's';
      p.style.animationDuration = (10 + Math.random() * 14) + 's';
      p.style.background = 'rgba(' + c.r + ',' + c.g + ',' + c.b + ',0.3)';
      container.appendChild(p);
    }
    document.body.appendChild(container);
  }

  window.shuffleTheme = shuffleTheme;

  window.addEventListener('load', function() {
    document.documentElement.classList.add('theme-transitioning');
    setTimeout(function() {
      document.documentElement.classList.remove('theme-transitioning');
    }, 1000);
  });
})();
