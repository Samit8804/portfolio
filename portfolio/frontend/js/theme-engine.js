(function() {
  var themes = ['brown', 'slate', 'cream', 'charcoal', 'burgundy', 'sage'];
  var theme = themes[Math.floor(Math.random() * themes.length)];

  document.documentElement.setAttribute('data-accent-theme', theme);

  var colors = {
    brown: { r: 139, g: 115, b: 85 },
    slate: { r: 74, g: 111, b: 165 },
    cream: { r: 232, g: 224, b: 213 },
    charcoal: { r: 120, g: 120, b: 120 },
    burgundy: { r: 114, g: 47, b: 55 },
    sage: { r: 123, g: 141, b: 110 }
  };

  function createParticles() {
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
      p.style.background = 'rgba(' + c.r + ',' + c.g + ',' + c.b + ',0.25)';
      container.appendChild(p);
    }
    document.body.appendChild(container);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createParticles);
  } else {
    createParticles();
  }

  window.addEventListener('load', function() {
    document.documentElement.classList.add('theme-transitioning');
    setTimeout(function() {
      document.documentElement.classList.remove('theme-transitioning');
    }, 1000);
  });
})();
