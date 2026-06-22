(function() {
  var themes = ['purple', 'blue', 'red', 'green', 'gold', 'orange'];
  var theme = themes[Math.floor(Math.random() * themes.length)];

  document.documentElement.setAttribute('data-accent-theme', theme);

  function createParticles() {
    var container = document.createElement('div');
    container.className = 'theme-particles';
    container.id = 'themeParticles';
    for (var i = 0; i < 20; i++) {
      var p = document.createElement('div');
      p.className = 'theme-particle';
      var size = 3 + Math.random() * 6;
      p.style.width = size + 'px';
      p.style.height = size + 'px';
      p.style.left = Math.random() * 100 + '%';
      p.style.animationDelay = Math.random() * 10 + 's';
      p.style.animationDuration = (8 + Math.random() * 12) + 's';
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
