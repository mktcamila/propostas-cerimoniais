/* Rastreio de prévias e propostas (Feito por Camila).
   Grava em Supabase (tabela public.rastreio_eventos, só INSERT para o público):
   abriu · clique (texto do botão/link) · consultor (respostas e conclusão) · tempo (segundos na página).
   Para não contar as próprias visitas: abrir qualquer página com ?eu=1 uma vez em cada aparelho
   (?eu=0 volta a contar). */
(function () {
  var URL_API = 'https://jjisvnvmzcwnekscitxa.supabase.co/rest/v1/rastreio_eventos';
  var KEY = 'sb_publishable_JgD6skpdXppJS4K-WQJrtA_wbZX7z3j';
  var ls = {};
  try { ls = window.localStorage || {}; } catch (e) {}
  try {
    var q = new URLSearchParams(location.search);
    if (q.get('eu') === '1') ls.setItem('fpc_eu', '1');
    if (q.get('eu') === '0') ls.removeItem('fpc_eu');
    if (ls.getItem && ls.getItem('fpc_eu') === '1') return;
  } catch (e) {}
  var parts = location.pathname.split('/').filter(Boolean);
  var i = parts.indexOf('propostas-cerimoniais');
  var slug = (i >= 0 && parts[i + 1]) ? parts[i + 1] : (parts[parts.length - 1] || 'raiz');
  var pagina = parts.indexOf('proposta') >= 0 ? 'proposta' : 'previa';
  var vis = '';
  try { vis = ls.getItem('fpc_vis') || ''; if (!vis) { vis = Math.random().toString(36).slice(2, 10); ls.setItem('fpc_vis', vis); } } catch (e) { vis = 'anon'; }
  var origem = '';
  try { origem = new URLSearchParams(location.search).get('o') || ''; } catch (e) {}
  function send(evento, detalhe) {
    var body = JSON.stringify({ slug: slug.slice(0, 60), pagina: pagina, evento: evento, detalhe: (detalhe || '').slice(0, 200),
      visitante: vis, origem: (origem || document.referrer || '').slice(0, 200), dispositivo: /Mobi|Android|iPhone/i.test(navigator.userAgent) ? 'celular' : 'computador' });
    try {
      fetch(URL_API, { method: 'POST', keepalive: true, headers: { 'apikey': KEY, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' }, body: body });
    } catch (e) {}
  }
  send('abriu', document.title);
  var t0 = Date.now(), enviadoTempo = false;
  function tempo() { if (enviadoTempo) return; enviadoTempo = true; send('tempo', String(Math.round((Date.now() - t0) / 1000))); }
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') tempo(); });
  window.addEventListener('pagehide', tempo);
  document.addEventListener('click', function (ev) {
    var el = ev.target.closest && ev.target.closest('a,button,summary');
    if (!el) return;
    var txt = (el.getAttribute('aria-label') || el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 80);
    var href = el.getAttribute('href') || '';
    var tipo = /wa\.me/.test(href) ? 'whatsapp' : /^tel:/.test(href) ? 'telefone' : /maps/.test(href) ? 'mapa' : href.charAt(0) === '#' ? 'ancora' : href ? 'link' : 'botao';
    if (el.closest('.pl')) {
      send('consultor', txt + (el.classList.contains('pl-btn') ? ' [final]' : ''));
      if (tipo === 'whatsapp' || el.hasAttribute('data-copy')) send('clique', 'consultor → ' + txt);
      return;
    }
    send('clique', tipo + ': ' + txt);
  }, true);
})();
