/* Camada de dados. Para integrar o Flask: defina CONFIG.USE_MOCK = false.
   Cada método abaixo já indica o endpoint que substituirá o mock. */
const CONFIG = Store.get('config', { USE_MOCK: true, API_BASE: '/api', taxaEntrega: 6, freteGratisAcima: 80, descontoMinimo: 50, descontoPercentual: 10 });
const STATUS_PEDIDO = ['Recebido', 'Confirmado', 'Em preparo', 'Saiu para entrega', 'Entregue', 'Cancelado'];

const CATEGORIAS_MOCK = [
  { id: 'frituras', nome: 'Frituras', emoji: '🍤' }, { id: 'assados', nome: 'Assados', emoji: '🥐' },
  { id: 'combos', nome: 'Combos', emoji: '🎉' }, { id: 'doces', nome: 'Doces', emoji: '🍩' }, { id: 'bebidas', nome: 'Bebidas', emoji: '🥤' }
];
const p = (id, nome, descricao, preco, categoria, emoji, extra = {}) => ({ id, nome, descricao, preco, categoria, emoji, imagem: '', estoque: 40, disponivel: true, ativo: true, destaque: false, ...extra });
const PRODUTOS_MOCK = [
  p(1, 'Coxinha de Frango', 'Coxinha crocante recheada com frango temperado.', 6, 'frituras', '🍗', { destaque: true }),
  p(2, 'Pastel de Carne', 'Massa fina e sequinha com carne moída temperada.', 7.5, 'frituras', '🥟', { destaque: true }),
  p(3, 'Risole de Queijo', 'Risole dourado com queijo mussarela derretido.', 6.5, 'frituras', '🧀'),
  p(4, 'Bolinha de Queijo', 'Porção com 10 bolinhas bem cremosas.', 18, 'frituras', '🧆', { estoque: 0, disponivel: false }),
  p(5, 'Esfiha de Carne', 'Esfiha aberta assada no forno a lenha.', 5.5, 'assados', '🥙', { destaque: true }),
  p(6, 'Enroladinho de Salsicha', 'Massa macia dourada com salsicha inteira.', 5, 'assados', '🌭'),
  p(7, 'Pão de Queijo', 'Pão de queijo mineiro, quentinho e elástico.', 4, 'assados', '🧁'),
  p(8, 'Combo 25 Salgados', 'Coxinhas, risoles e pastéis variados para a festa.', 42, 'combos', '🎉', { destaque: true }),
  p(9, 'Combo Lanche', '2 salgados à escolha + refrigerante lata.', 16, 'combos', '🥪'),
  p(10, 'Brigadeiro', 'Caixa com 6 brigadeiros de chocolate belga.', 15, 'doces', '🍫'),
  p(11, 'Refrigerante Lata', 'Lata 350 ml gelada. Cola, guaraná ou laranja.', 6, 'bebidas', '🥤'),
  p(12, 'Suco Natural 500ml', 'Laranja, maracujá ou limão, sem açúcar.', 9, 'bebidas', '🍊')
];

const SEED_NOMES = ['Ana Lima', 'Bruno Souza', 'Carla Dias', 'Diego Alves', 'Elisa Rocha'];
function seedPedidos() {
  const pay = ['Pix', 'Dinheiro', 'Cartão na entrega'];
  return SEED_NOMES.map((nome, i) => {
    const prod = PRODUTOS_MOCK[i], qtd = i + 2, dt = new Date(Date.now() - i * 3.6e6 * (i < 3 ? 1 : 30));
    return { id: 1000 + i, numero: 1000 + i, cliente: nome, telefone: '(11) 90000-000' + i, data: dt.toISOString(),
      itens: [{ nome: prod.nome, quantidade: qtd, preco: prod.preco }], total: prod.preco * qtd + 6, pagamento: pay[i % 3],
      endereco: `Rua das Flores, ${10 + i}, Centro, Sua Cidade - UF`, status: STATUS_PEDIDO[i % 5] };
  });
}

const Api = {
  async _req(method, url, body) {
    const r = await fetch(CONFIG.API_BASE + url, { method, credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data.erro || 'Erro na requisição');
    return data;
  },
  /* GET /api/produtos */
  async listarProdutos() { return CONFIG.USE_MOCK ? Store.get('produtos', PRODUTOS_MOCK) : this._req('GET', '/produtos'); },
  /* POST /api/produtos  |  PUT /api/produtos/<id> */
  async salvarProduto(prod) {
    if (!CONFIG.USE_MOCK) return this._req(prod.id ? 'PUT' : 'POST', '/produtos' + (prod.id ? '/' + prod.id : ''), prod);
    const lista = await this.listarProdutos();
    if (prod.id) lista[lista.findIndex(x => x.id === prod.id)] = prod; else lista.push({ ...prod, id: Math.max(0, ...lista.map(x => x.id)) + 1 });
    Store.set('produtos', lista);
  },
  /* DELETE /api/produtos/<id> */
  async excluirProduto(id) {
    if (!CONFIG.USE_MOCK) return this._req('DELETE', '/produtos/' + id);
    Store.set('produtos', (await this.listarProdutos()).filter(x => x.id !== id));
  },
  /* GET /api/categorias */
  async listarCategorias() { return CONFIG.USE_MOCK ? CATEGORIAS_MOCK : this._req('GET', '/categorias'); },
  /* POST /api/pedidos */
  async criarPedido(dados) {
    if (!CONFIG.USE_MOCK) return this._req('POST', '/pedidos', dados);
    const lista = Store.get('pedidos', seedPedidos());
    const numero = Math.max(...lista.map(o => o.numero)) + 1;
    lista.unshift({ id: numero, numero, cliente: dados.cliente.nome, telefone: dados.cliente.telefone, email: dados.cliente.email, data: new Date().toISOString(),
      itens: dados.itens.map(i => ({ nome: i.nome, quantidade: i.quantidade, preco: i.preco_unitario })), total: dados.totais.total,
      pagamento: dados.pagamento, status: 'Recebido', observacoes: dados.observacoes,
      endereco: `${dados.endereco.rua}, ${dados.endereco.numero}, ${dados.endereco.bairro}, ${dados.endereco.cidade} - ${dados.endereco.estado}` });
    Store.set('pedidos', lista);
    return { numero };
  },
  /* GET /api/pedidos */
  async listarPedidos() { return CONFIG.USE_MOCK ? Store.get('pedidos', seedPedidos()) : this._req('GET', '/pedidos'); },
  /* PATCH /api/pedidos/<id>/status */
  async atualizarStatus(id, status) {
    if (!CONFIG.USE_MOCK) return this._req('PATCH', `/pedidos/${id}/status`, { status });
    const l = await this.listarPedidos(); l.find(o => o.id === id).status = status; Store.set('pedidos', l);
  },
  /* POST /api/login */
  async login({ email, senha, lembrar }) {
    if (!CONFIG.USE_MOCK) return this._req('POST', '/login', { email, senha, lembrar });
    const users = [{ nome: 'Administrador', email: 'admin@salty.com', senha: 'admin123', perfil: 'admin' }, ...Store.get('users', [])];
    const u = users.find(x => x.email === email.toLowerCase() && x.senha === senha);
    if (!u) throw new Error('E-mail ou senha incorretos.');
    return { usuario: { nome: u.nome, email: u.email, telefone: u.telefone, perfil: u.perfil || 'cliente' }, token: 'mock-token' };
  },
  /* POST /api/cadastro */
  async cadastro(dados) {
    if (!CONFIG.USE_MOCK) return this._req('POST', '/cadastro', dados);
    const users = Store.get('users', []);
    if (users.some(u => u.email === dados.email.toLowerCase())) throw new Error('Este e-mail já está cadastrado.');
    users.push({ nome: dados.nome, email: dados.email.toLowerCase(), telefone: dados.telefone, senha: dados.senha });
    Store.set('users', users);
  }
};

/* Somente produtos ativos aparecem para o cliente */
const vitrine = async () => (await Api.listarProdutos()).filter(x => x.ativo);
const imgHTML = x => x.imagem ? `<img src="${esc(x.imagem)}" alt="${esc(x.nome)}" loading="lazy">` : `<span aria-hidden="true">${x.emoji || '🥟'}</span>`;

function produtoCard(x) {
  return `<article class="card ${x.disponivel ? '' : 'is-off'}">
    <a class="card__img" href="${PAGES}produto.html?id=${x.id}" aria-label="Ver ${esc(x.nome)}">${imgHTML(x)}${x.disponivel ? '' : '<span class="badge">Indisponível</span>'}</a>
    <div class="card__body"><h3>${esc(x.nome)}</h3><p>${esc(x.descricao)}</p>
      <div class="card__foot"><span class="price">${money(x.preco)}</span>
      <button class="btn btn--primary btn--sm" data-add="${x.id}" ${x.disponivel ? '' : 'disabled'}>Adicionar ao carrinho</button></div></div></article>`;
}

/* ---------- Home ---------- */
async function initHome() {
  const cats = $('#categorias'); if (!cats) return;
  cats.innerHTML = (await Api.listarCategorias()).map(c => `<a class="cat" href="${PAGES}cardapio.html?cat=${c.id}"><span>${c.emoji}</span>${c.nome}</a>`).join('');
  $('#destaques').innerHTML = (await vitrine()).filter(x => x.destaque).slice(0, 4).map(produtoCard).join('');
}

/* ---------- Cardápio ---------- */
async function initCardapio() {
  const grid = $('#grid'); if (!grid || !$('#busca')) return;
  const [todos, cats] = await Promise.all([vitrine(), Api.listarCategorias()]);
  const st = { busca: '', cat: new URLSearchParams(location.search).get('cat') || '', ordem: '' };
  $('#filtros').innerHTML = [{ id: '', nome: 'Todos' }, ...cats].map(c => `<button class="chip" data-cat="${c.id}">${c.nome}</button>`).join('');
  const render = () => {
    $$('.chip').forEach(b => b.classList.toggle('is-active', b.dataset.cat === st.cat));
    let l = todos.filter(x => (!st.cat || x.categoria === st.cat) && (x.nome + x.descricao).toLowerCase().includes(st.busca));
    if (st.ordem === 'asc') l.sort((a, b) => a.preco - b.preco);
    if (st.ordem === 'desc') l.sort((a, b) => b.preco - a.preco);
    if (st.ordem === 'nome') l.sort((a, b) => a.nome.localeCompare(b.nome));
    grid.innerHTML = l.map(produtoCard).join(''); $('#vazio').hidden = l.length > 0;
  };
  $('#busca').oninput = e => { st.busca = e.target.value.trim().toLowerCase(); render(); };
  $('#ordem').onchange = e => { st.ordem = e.target.value; render(); };
  $('#filtros').onclick = e => { if (e.target.dataset.cat !== undefined) { st.cat = e.target.dataset.cat; render(); } };
  render();
}

/* ---------- Página do produto ---------- */
async function initProduto() {
  const box = $('#productDetail'); if (!box) return;
  const x = (await vitrine()).find(i => i.id === Number(new URLSearchParams(location.search).get('id')));
  if (!x) { box.innerHTML = `<p class="empty">Produto não encontrado. <a class="link" href="cardapio.html">Voltar ao cardápio</a></p>`; return; }
  let qtd = 1;
  box.innerHTML = `<div class="product"><div class="product__img">${imgHTML(x)}</div><div>
    <h1>${esc(x.nome)}</h1><div class="price">${money(x.preco)}</div><p>${esc(x.descricao)}</p>
    <!-- Futuro: sabores, tamanhos e adicionais entram aqui, renderizados a partir de x.opcoes -->
    <div id="opcoes" data-futuro="sabores,tamanhos,adicionais"></div>
    <div class="field"><label for="obs">Observações</label><textarea id="obs" rows="2" placeholder="Ex.: sem pimenta"></textarea></div>
    ${x.disponivel ? `<div class="product__buy"><div class="qty"><button id="menos" aria-label="Diminuir">−</button><span id="qtd" aria-live="polite">1</span><button id="mais" aria-label="Aumentar">+</button></div>
    <button class="btn btn--primary" id="add">Adicionar ao carrinho</button></div>` : '<p><span class="tag">Indisponível no momento</span></p>'}</div></div>`;
  if (!x.disponivel) return;
  const set = n => { qtd = Math.max(1, Math.min(99, n)); $('#qtd').textContent = qtd; };
  $('#menos').onclick = () => set(qtd - 1); $('#mais').onclick = () => set(qtd + 1);
  $('#add').onclick = () => Cart.add(x, qtd, $('#obs').value.trim());
}

document.addEventListener('DOMContentLoaded', () => { initHome(); initCardapio(); initProduto(); });
