(function() {
  var cleanElement = function(el) {
    if (el && el.removeAttribute) {
      el.removeAttribute('bis_skin_checked');
      el.removeAttribute('bis_register');
      el.removeAttribute('bis_size');
      el.removeAttribute('bis_id');
    }
  };

  var sweepAttributes = function() {
    try {
      if (document.body) cleanElement(document.body);
      if (document.documentElement) cleanElement(document.documentElement);
      var els = document.querySelectorAll('[bis_skin_checked], [bis_register], [bis_size], [bis_id]');
      for (var i = 0; i < els.length; i++) cleanElement(els[i]);
    } catch(e) {}
  };

  sweepAttributes();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', sweepAttributes);
  }

  try {
    var observer = new MutationObserver(function(mutations) {
      for (var i = 0; i < mutations.length; i++) {
        var m = mutations[i];
        if (m.type === 'attributes') cleanElement(m.target);
        if (m.addedNodes) {
          for (var j = 0; j < m.addedNodes.length; j++) {
            var node = m.addedNodes[j];
            if (node.nodeType === 1) {
              cleanElement(node);
              if (node.querySelectorAll) {
                var children = node.querySelectorAll('[bis_skin_checked], [bis_register], [bis_size], [bis_id]');
                for (var k = 0; k < children.length; k++) cleanElement(children[k]);
              }
            }
          }
        }
      }
    });
    if (document.documentElement) {
      observer.observe(document.documentElement, {
        attributes: true,
        subtree: true,
        childList: true,
        attributeFilter: ['bis_skin_checked', 'bis_register', 'bis_size', 'bis_id']
      });
    }
  } catch(e) {}

  var suppressKeywords = [
    'bis_skin_checked', 'bis_register', 'bis_size', 'bis_id',
    'A tree hydrated', 'hydration-mismatch', 'Hydration', 'hydration',
    'chrome-extension://', 'moz-extension://', 'M_ID'
  ];

  var shouldSuppress = function(args) {
    try {
      var fullText = '';
      for (var i = 0; i < args.length; i++) {
        var a = args[i];
        if (typeof a === 'string') fullText += ' ' + a;
        else if (a && typeof a === 'object') {
          try { fullText += ' ' + JSON.stringify(a); } catch(err) { fullText += ' ' + String(a); }
        } else {
          fullText += ' ' + String(a);
        }
      }
      for (var k = 0; k < suppressKeywords.length; k++) {
        if (fullText.indexOf(suppressKeywords[k]) !== -1) return true;
      }
    } catch(e) {}
    return false;
  };

  var origError = console.error;
  console.error = function() {
    if (shouldSuppress(arguments)) return;
    origError.apply(console, arguments);
  };

  var origWarn = console.warn;
  console.warn = function() {
    if (shouldSuppress(arguments)) return;
    origWarn.apply(console, arguments);
  };

  window.addEventListener('error', function(e) {
    if (
      (e.filename && (e.filename.indexOf('chrome-extension://') !== -1 || e.filename.indexOf('moz-extension://') !== -1)) ||
      (e.message && (e.message.indexOf('M_ID') !== -1 || e.message.indexOf('bis_skin_checked') !== -1 || e.message.indexOf('bis_register') !== -1))
    ) {
      e.preventDefault();
      e.stopImmediatePropagation();
      return true;
    }
  }, true);

  try {
    var rawTheme = localStorage.getItem('trizenai_user_theme');
    if (rawTheme) {
      var parsed = JSON.parse(rawTheme);
      if (parsed.accentColor) {
        document.documentElement.style.setProperty('--studio-accent', parsed.accentColor);
        document.documentElement.style.setProperty('--studio-accent-hover', parsed.accentHover || parsed.accentColor);
      }
      if (parsed.fontFamily) {
        document.documentElement.style.setProperty('--studio-font-family', parsed.fontFamily);
      }
      if (parsed.fontScale) {
        document.documentElement.style.setProperty('--studio-font-scale', parsed.fontScale);
        document.documentElement.style.fontSize = parsed.fontScale;
      }
    }
  } catch(e) {}
})();
