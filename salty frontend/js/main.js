/* Utilidades e layout compartilhado (header, rodapé, validação) */
const ROOT = document.body.dataset.root || '';
const PAGES = ROOT === '' ? 'pages/' : ROOT === '../' ? '' : '../';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const money = v => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const Store = {
  get(k, seed) {
    try { const v = localStorage.getItem('salty_' + k); if (v) return JSON.parse(v); } catch {}
    if (seed !== undefined) this.set(k, seed);
    return seed;
  },
  set(k, v) { localStorage.setItem('salty_' + k, JSON.stringify(v)); },
  remove(k) { localStorage.removeItem('salty_' + k); }
};

function toast(msg) {
  $('.toast')?.remove();
  const t = Object.assign(document.createElement('div'), { className: 'toast', textContent: msg, role: 'status' });
  document.body.append(t);
  setTimeout(() => t.remove(), 2500);
}

function logout() { Store.remove('user'); location.href = ROOT + 'index.html'; }

function renderHeader() {
  const el = $('#site-header'); if (!el) return;
  const user = Store.get('user');
  el.innerHTML = `<header class="header"><div class="container header__inner">
    <a class="logo" href="${ROOT}index.html">SALTY</a>
    <nav class="nav" id="nav" aria-label="Principal">
      <a href="${ROOT}index.html">Início</a><a href="${PAGES}cardapio.html">Cardápio</a><a href="${ROOT}index.html#sobre">Sobre</a>
    </nav>
    <div class="header__actions">
      <a class="cart-link" href="${PAGES}carrinho.html" aria-label="Carrinho">🛒<span class="cart-count" data-cart-count>0</span></a>
      ${user ? `<button class="btn btn--ghost btn--sm" id="btnAuth">Sair (${esc(user.nome.split(' ')[0])})</button>`
             : `<a class="btn btn--primary btn--sm" id="btnAuth" href="${PAGES}login.html">Entrar</a>`}
      <button class="hamburger" id="menuToggle" aria-label="Abrir menu" aria-expanded="false">☰</button>
    </div></div></header>`;
  $('#menuToggle').onclick = e => {
    const open = $('#nav').classList.toggle('is-open');
    e.currentTarget.setAttribute('aria-expanded', open);
  };
  if (user) $('#btnAuth').onclick = logout;
}

function renderFooter() {
  const el = $('#site-footer'); if (!el) return;
  el.innerHTML = `<footer class="footer"><div class="container"><div class="footer__grid">
    <div><a class="logo" href="${ROOT}index.html">SALTY</a><p>Salgados feitos no dia, entregues quentinhos.</p></div>
    <div><h4>Fale com a gente</h4><a href="https://instagram.com/" target="_blank" rel="noopener">Instagram @salty</a><a href="https://wa.me/5500000000000" target="_blank" rel="noopener">WhatsApp (00) 00000-0000</a></div>
    <div><h4>Onde estamos</h4><p>Rua das Palmeiras, 123<br>Centro, Sua Cidade - UF</p><p>Seg a Sáb, 10h às 21h<br>Dom, 10h às 15h</p></div>
    <div><h4>Links úteis</h4><a href="${PAGES}cardapio.html">Cardápio</a><a href="${PAGES}carrinho.html">Carrinho</a><a href="${PAGES}login.html">Minha conta</a></div>
  </div><p class="footer__copy">© ${new Date().getFullYear()} Salty. Todos os direitos reservados.</p></div></footer>`;
}

/* Máscaras simples */
const masks = {
  cep: v => v.replace(/\D/g, '').slice(0, 8).replace(/(\d{5})(\d)/, '$1-$2'),
  tel: v => v.replace(/\D/g, '').slice(0, 11).replace(/^(\d{2})(\d)/, '($1) $2').replace(/(\d{4,5})(\d{4})$/, '$1-$2')
};
document.addEventListener('input', e => {
  const m = masks[e.target.dataset?.mask]; if (m) e.target.value = m(e.target.value);
});

/* Validação genérica: usa required, minlength, type=email, data-validate, data-match */
function validateForm(form) {
  let ok = true;
  $$('input,select,textarea', form).forEach(inp => {
    const v = inp.value.trim(); let msg = '';
    if (inp.required && !v) msg = 'Preencha este campo.';
    else if (v && inp.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) msg = 'Informe um e-mail válido.';
    else if (v && inp.dataset.validate === 'tel' && v.replace(/\D/g, '').length < 10) msg = 'Informe DDD e telefone.';
    else if (v && inp.dataset.validate === 'cep' && v.replace(/\D/g, '').length !== 8) msg = 'CEP deve ter 8 dígitos.';
    else if (v && inp.minLength > 0 && v.length < inp.minLength) msg = `Use ao menos ${inp.minLength} caracteres.`;
    else if (inp.dataset.match && v !== form.elements[inp.dataset.match].value) msg = 'As senhas não conferem.';
    inp.setAttribute('aria-invalid', !!msg);
    const err = inp.closest('.field')?.querySelector('.field__error'); if (err) err.textContent = msg;
    if (msg) ok = false;
  });
  if (!ok) $('[aria-invalid=true]', form)?.focus();
  return ok;
}

document.addEventListener('DOMContentLoaded', () => { renderHeader(); renderFooter(); Cart?.updateBadge?.(); });
