(function(d) {
  var config = { kitId: 'iqo1umm', scriptTimeout: 3000, async: true },
    h = d.documentElement,
    t = setTimeout(function() {
      h.className = h.className.replace(/\bwf-loading\b/g, '') + ' wf-inactive';
    }, config.scriptTimeout),
    tk = d.createElement('script'), f = false,
    s = d.getElementsByTagName('script')[0], a;
  h.className += ' wf-loading';
  tk.src = 'https://use.typekit.net/' + config.kitId + '.js';
  tk.async = true;
  if (d.currentScript && d.currentScript.nonce) tk.nonce = d.currentScript.nonce;
  tk.onload = tk.onreadystatechange = function() {
    a = this.readyState;
    if (f || a && a !== 'complete' && a !== 'loaded') return;
    f = true;
    clearTimeout(t);
    try { Typekit.load(config); } catch (e) {
      h.className = h.className.replace(/\bwf-loading\b/g, '') + ' wf-inactive';
    }
  };
  s.parentNode.insertBefore(tk, s);
})(document);
