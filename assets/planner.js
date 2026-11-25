/* Consultor de data e orçamento: questionário em etapas que termina num resumo,
   num mini-cronograma e numa mensagem pronta para o WhatsApp da empresa.
   Uso: <div id="planner"></div> + Planner.mount('#planner', config)
   config = {
     empresa, whatsapp ('5585...'|''), telefone ('(85) ...'), tipo: 'casamento'|'evento',
     titulo, subtitulo, cta, saudacao,
     theme: {accent, ink, bg, card, line, muted, onAccent, fontH},
     steps: [{id, q, hint?, type:'choice'|'multi'|'date', options:[label|{label,value}], noDate?}],
     recomendar(respostas, meses) -> string   (opcional)
     marcos: [{m: meses_antes, t: 'texto'}]   (opcional; cronograma)
   } */
(function () {
  const css = `
.pl{--a:#333;--i:#222;--b:#fff;--c:#fff;--l:#e5e5e5;--m:#666;--oa:#fff;--fh:inherit;background:var(--c);border:1px solid var(--l);border-radius:18px;padding:clamp(22px,4vw,44px);color:var(--i);max-width:860px;margin:0 auto;box-shadow:0 20px 60px rgba(0,0,0,.06)}
.pl *{box-sizing:border-box}
.pl-bar{height:4px;background:var(--l);border-radius:4px;overflow:hidden;margin-bottom:26px}.pl-bar i{display:block;height:100%;background:var(--a);transition:width .4s}
.pl-step{font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:var(--m);margin-bottom:8px}
.pl-q{font-family:var(--fh);font-size:clamp(24px,3vw,32px);line-height:1.2;margin:0 0 6px}
.pl-h{color:var(--m);font-size:15px;margin:0 0 22px}
.pl-opts{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px}
.pl-o{font:inherit;text-align:left;background:var(--b);color:var(--i);border:1.5px solid var(--l);border-radius:12px;padding:16px 18px;cursor:pointer;transition:.15s}
.pl-o:hover{border-color:var(--a)}.pl-o.on{border-color:var(--a);background:var(--a);color:var(--oa)}
.pl-date{display:flex;gap:10px;flex-wrap:wrap}.pl-date input{font:inherit;padding:14px 16px;border:1.5px solid var(--l);border-radius:12px;background:var(--b);color:var(--i)}
.pl-nav{display:flex;justify-content:space-between;align-items:center;margin-top:26px;gap:12px}
.pl-btn{font:inherit;font-weight:700;border:0;border-radius:40px;padding:14px 26px;cursor:pointer;background:var(--a);color:var(--oa);text-decoration:none;display:inline-flex;align-items:center;gap:8px}
.pl-btn[disabled]{opacity:.35;cursor:default}.pl-back{background:none;border:0;color:var(--m);cursor:pointer;font:inherit;text-decoration:underline}
.pl-res h3{font-family:var(--fh);font-size:clamp(26px,3.4vw,36px);margin:0 0 12px;line-height:1.15}
.pl-rec{background:var(--b);border-left:4px solid var(--a);padding:16px 18px;border-radius:0 12px 12px 0;margin:16px 0 24px}
.pl-sum{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:8px;margin-bottom:26px}
.pl-sum div{background:var(--b);border-radius:10px;padding:10px 14px;font-size:14px}.pl-sum b{display:block;color:var(--m);font-weight:400;font-size:12px;text-transform:uppercase;letter-spacing:.1em}
.pl-tl{list-style:none;padding:0;margin:0 0 28px;border-left:2px solid var(--l)}
.pl-tl li{position:relative;padding:0 0 14px 22px;font-size:15.5px}.pl-tl li:before{content:"";position:absolute;left:-7px;top:6px;width:12px;height:12px;border-radius:50%;background:var(--c);border:2px solid var(--a)}
.pl-tl li.now:before{background:var(--a)}.pl-tl small{display:block;color:var(--m);font-size:12px;letter-spacing:.08em;text-transform:uppercase}
.pl-act{display:flex;gap:12px;flex-wrap:wrap;align-items:center}.pl-note{font-size:13px;color:var(--m);margin-top:14px}`;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const lab = o => typeof o === 'string' ? o : o.label;
  const mesesAte = iso => { if (!iso) return null; const d = new Date(iso + 'T12:00'), n = new Date(); return Math.round((d - n) / (1000 * 60 * 60 * 24 * 30.44)); };
  const fmtData = iso => iso ? new Date(iso + 'T12:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }) : 'Ainda não definida';
  const marcosCasamento = [
    { m: 12, t: 'Definir data, local e contratar a assessoria' }, { m: 10, t: 'Fechar buffet, foto e vídeo' },
    { m: 8, t: 'Decoração, música e celebrante' }, { m: 6, t: 'Vestido, trajes e convites' },
    { m: 4, t: 'Lista de presentes, provas e lembrancinhas' }, { m: 2, t: 'Confirmação de presença e ensaio da cerimônia' },
    { m: 1, t: 'Cronograma final do dia com a equipe' }];
  function recPadrao(r, m) {
    if (m === null) return 'Sem data ainda? Esse é o melhor momento para conversar: a assessoria ajuda a escolher data e local pensando em clima, agenda dos fornecedores e orçamento.';
    if (m < 0) return 'Confira a data informada: ela parece já ter passado.';
    if (m >= 12) return 'Vocês estão com o tempo ideal: dá para escolher cada fornecedor com calma e boas condições. A assessoria completa aproveita melhor esse prazo.';
    if (m >= 6) return 'Ainda dá tempo, mas os fornecedores mais procurados fecham agenda cedo. Vale priorizar local, buffet e foto nas próximas semanas.';
    return 'Prazo curto: o ideal é falar hoje mesmo para confirmar a disponibilidade da equipe e dos fornecedores.';
  }
  window.Planner = {
    mount(sel, cfg) {
      const el = document.querySelector(sel); if (!el) return;
      const t = cfg.theme || {}; el.className = 'pl';
      [['--a', t.accent], ['--i', t.ink], ['--b', t.bg], ['--c', t.card], ['--l', t.line], ['--m', t.muted], ['--oa', t.onAccent], ['--fh', t.fontH]].forEach(([k, v]) => v && el.style.setProperty(k, v));
      const S = cfg.steps, R = {}; let i = 0;
      const render = () => i < S.length ? pergunta() : resultado();
      function pergunta() {
        const s = S[i], v = R[s.id];
        let body = '';
        if (s.type === 'date') body = `<div class="pl-date"><input type="date" value="${v && v !== 'sem' ? v : ''}"><button class="pl-o ${v === 'sem' ? 'on' : ''}" data-sem>${esc(s.noDate || 'Ainda não temos data')}</button></div>`;
        else body = `<div class="pl-opts">${s.options.map((o, k) => { const on = s.type === 'multi' ? (v || []).includes(lab(o)) : v === lab(o); return `<button class="pl-o ${on ? 'on' : ''}" data-k="${k}">${esc(lab(o))}</button>`; }).join('')}</div>`;
        const ok = s.type === 'multi' ? (v || []).length : !!v;
        el.innerHTML = `<div class="pl-bar"><i style="width:${(i / S.length) * 100}%"></i></div><div class="pl-step">Pergunta ${i + 1} de ${S.length}</div><h3 class="pl-q">${esc(s.q)}</h3>${s.hint ? `<p class="pl-h">${esc(s.hint)}</p>` : '<p class="pl-h"></p>'}${body}
          <div class="pl-nav">${i ? '<button class="pl-back">Voltar</button>' : '<span></span>'}${s.type === 'choice' ? '' : `<button class="pl-btn" data-next ${ok ? '' : 'disabled'}>Continuar</button>`}</div>`;
        el.querySelectorAll('[data-k]').forEach(b => b.onclick = () => {
          const o = lab(s.options[+b.dataset.k]);
          if (s.type === 'multi') { const a = R[s.id] || []; R[s.id] = a.includes(o) ? a.filter(x => x !== o) : [...a, o]; render(); }
          else { R[s.id] = o; i++; render(); }
        });
        const inp = el.querySelector('input[type=date]');
        if (inp) inp.onchange = () => { R[s.id] = inp.value || undefined; render(); };
        const sem = el.querySelector('[data-sem]'); if (sem) sem.onclick = () => { R[s.id] = 'sem'; i++; render(); };
        const nx = el.querySelector('[data-next]'); if (nx) nx.onclick = () => { i++; render(); };
        const bk = el.querySelector('.pl-back'); if (bk) bk.onclick = () => { i--; render(); };
      }
      function resultado() {
        const dateStep = S.find(s => s.type === 'date'); const iso = dateStep && R[dateStep.id] !== 'sem' ? R[dateStep.id] : null;
        const m = dateStep ? mesesAte(iso) : null;
        const rec = (cfg.recomendar || recPadrao)(R, m);
        const linhas = S.map(s => [s.resumo || s.q, s.type === 'date' ? fmtData(iso) : [].concat(R[s.id] || '—').join(', ')]);
        const marcos = cfg.marcos === false ? [] : (cfg.marcos || marcosCasamento);
        let tl = '';
        if (marcos.length && m !== null && m >= 0) {
          const atras = marcos.filter(x => x.m > m), prox = marcos.filter(x => x.m <= m);
          const itens = [];
          if (atras.length) itens.push(`<li class="now"><small>Agora</small>${atras.map(x => esc(x.t)).join(' · ')}</li>`);
          prox.forEach(x => itens.push(`<li><small>${x.m} ${x.m === 1 ? 'mês' : 'meses'} antes</small>${esc(x.t)}</li>`));
          tl = `<h4 style="margin:0 0 12px;font-size:15px;letter-spacing:.1em;text-transform:uppercase;color:var(--m)">Seu cronograma sugerido</h4><ul class="pl-tl">${itens.join('')}</ul>`;
        }
        const msg = `${cfg.saudacao || 'Olá!'} ${cfg.intro || `Fiz o planejamento pelo site da ${cfg.empresa}:`}\n` + linhas.map(([a, b]) => `• ${a}: ${b}`).join('\n') + `\n\n${cfg.fecho || 'Podem me ajudar?'}`;
        const acao = cfg.whatsapp
          ? `<a class="pl-btn" target="_blank" rel="noopener" href="https://wa.me/${cfg.whatsapp}?text=${encodeURIComponent(msg)}">${esc(cfg.cta || 'Enviar para o WhatsApp')}</a>`
          : `<button class="pl-btn" data-copy>${esc(cfg.cta || 'Copiar briefing')}</button>` + (cfg.alt
            ? `<a class="pl-btn" style="background:none;color:var(--a);border:1.5px solid var(--a)" target="_blank" rel="noopener" href="${esc(cfg.alt.href)}">${esc(cfg.alt.label)}</a>`
            : cfg.telefone ? `<a class="pl-btn" style="background:none;color:var(--a);border:1.5px solid var(--a)" href="tel:+55${cfg.telefone.replace(/\D/g, '')}">Ligar ${esc(cfg.telefone)}</a>` : '');
        el.innerHTML = `<div class="pl-bar"><i style="width:100%"></i></div><div class="pl-res"><div class="pl-step">Seu resumo</div><h3>${esc(cfg.tituloResultado || 'Aqui está o seu ponto de partida')}</h3>
          <div class="pl-rec">${esc(rec)}</div><div class="pl-sum">${linhas.map(([a, b]) => `<div><b>${esc(a)}</b>${esc(b)}</div>`).join('')}</div>${tl}
          <div class="pl-act">${acao}<button class="pl-back" data-restart>Refazer</button></div>
          <p class="pl-note">${cfg.whatsapp ? 'A mensagem já vai organizada com as suas respostas. É só enviar.' : 'O briefing é copiado com as suas respostas para você colar na conversa ou no e-mail.'}</p></div>`;
        el.querySelector('[data-restart]').onclick = () => { i = 0; Object.keys(R).forEach(k => delete R[k]); render(); };
        const cp = el.querySelector('[data-copy]');
        if (cp) cp.onclick = () => { (navigator.clipboard ? navigator.clipboard.writeText(msg) : Promise.reject()).then(() => cp.textContent = 'Briefing copiado ✓', () => { prompt('Copie o briefing:', msg); }); };
      }
      render();
    }
  };
})();
