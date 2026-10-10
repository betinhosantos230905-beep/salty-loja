/* Painel administrativo: um arquivo, uma função de render por página (data-admin) */
(async function () {
  const key = document.body.dataset.admin, user = Store.get('user');
  if (!user || user.perfil !== 'admin') { location.href = `${ROOT}pages/login.html`; return; }
  const MENU = [['dashboard', 'Dashboard', '📊'], ['pedidos', 'Pedidos', '🧾'], ['produtos', 'Produtos', '🥟'], ['categorias', 'Categorias', '🏷️'], ['clientes', 'Clientes', '👥'], ['vendas', 'Vendas', '💰'], ['configuracoes', 'Configurações', '⚙️']];
  const title = MENU.find(m => m[0] === key)[1];
  $('#admin-root').innerHTML = `<aside class="sidebar" id="sidebar"><a class="logo" href="${ROOT}index.html">SALTY <small>admin</small></a>
    <nav>${MENU.map(([k, l, i]) => `<a href="${k}.html" class="${k === key ? 'is-active' : ''}">${i} ${l}</a>`).join('')}<button class="sidebar__out" id="out">🚪 Sair</button></nav></aside>
    <div class="admin-main"><header class="admin-top"><button class="hamburger" id="side" aria-label="Menu">☰</button><h1>${title}</h1><span>${esc(user.nome)}</span></header><section class="admin-content" id="adminContent"></section></div>`;
  $('#side').onclick = () => $('#sidebar').classList.toggle('is-open');
  $('#out').onclick = logout;
  const el = $('#adminContent');

  const fmtData = iso => { const d = new Date(iso); return `${d.toLocaleDateString('pt-BR')} ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`; };
  const stat = (l, v) => `<div class="stat"><strong>${v}</strong><span>${l}</span></div>`;
  const valid = os => os.filter(o => o.status !== 'Cancelado');
  const sum = os => valid(os).reduce((s, o) => s + o.total, 0);
  const isHoje = o => new Date(o.data).toDateString() === new Date().toDateString();

  const pages = {
    async dashboard() {
      const [ps, os] = await Promise.all([Api.listarProdutos(), Api.listarPedidos()]);
      const hoje = os.filter(isHoje), pend = os.filter(o => ['Recebido', 'Confirmado', 'Em preparo'].includes(o.status)).length;
      el.innerHTML = `<div class="stats">${stat('Pedidos hoje', hoje.length)}${stat('Vendas do dia', money(sum(hoje)))}${stat('Produtos cadastrados', ps.length)}${stat('Pedidos pendentes', pend)}</div>
        <h2>Últimos pedidos</h2><div class="table-wrap"><table><thead><tr><th>Nº</th><th>Cliente</th><th>Data</th><th>Total</th><th>Status</th></tr></thead><tbody>
        ${os.slice(0, 6).map(o => `<tr><td>#${o.numero}</td><td>${esc(o.cliente)}</td><td>${fmtData(o.data)}</td><td>${money(o.total)}</td><td><span class="tag">${o.status}</span></td></tr>`).join('')}</tbody></table></div>`;
    },
    async pedidos() {
      const os = await Api.listarPedidos();
      el.innerHTML = `<div class="filters"><select id="fStatus" aria-label="Filtrar por status"><option value="">Todos os status</option>${STATUS_PEDIDO.map(s => `<option>${s}</option>`).join('')}</select></div><div class="orders" id="lista"></div>`;
      const draw = () => {
        const s = $('#fStatus').value, l = os.filter(o => !s || o.status === s);
        $('#lista').innerHTML = l.map(o => `<article class="order"><h3><span>Pedido #${o.numero} · ${esc(o.cliente)}</span><span>${fmtData(o.data)}</span></h3>
          <div><ul>${o.itens.map(i => `<li>${i.quantidade}× ${esc(i.nome)}</li>`).join('')}</ul></div>
          <div><strong>${money(o.total)}</strong> · ${esc(o.pagamento)}<br><span class="muted">${esc(o.endereco)}</span></div>
          <label>Status <select data-id="${o.id}">${STATUS_PEDIDO.map(x => `<option ${x === o.status ? 'selected' : ''}>${x}</option>`).join('')}</select></label></article>`).join('') || '<p class="empty">Nenhum pedido.</p>';
      };
      $('#fStatus').onchange = draw;
      el.addEventListener('change', async e => {
        if (!e.target.dataset.id) return;
        await Api.atualizarStatus(Number(e.target.dataset.id), e.target.value);
        os.find(o => o.id === Number(e.target.dataset.id)).status = e.target.value; toast('Status atualizado');
      });
      draw();
    },
    async produtos() {
      const cats = await Api.listarCategorias();
      el.innerHTML = `<div class="filters"><input id="q" type="search" placeholder="Pesquisar produto" aria-label="Pesquisar"><select id="fc"><option value="">Todas as categorias</option>${cats.map(c => `<option value="${c.id}">${c.nome}</option>`).join('')}</select><button class="btn btn--primary" id="novo">+ Adicionar produto</button></div>
        <div class="table-wrap"><table><thead><tr><th>Produto</th><th>Categoria</th><th>Preço</th><th>Estoque</th><th>Disponível</th><th>Ativo</th><th>Ações</th></tr></thead><tbody id="tb"></tbody></table></div>
        <dialog id="dlg"><form id="pf" novalidate><h2 id="dt">Produto</h2><input type="hidden" name="id">
        <div class="field"><label for="pnome">Nome</label><input id="pnome" name="nome" required><small class="field__error"></small></div>
        <div class="field"><label for="pdesc">Descrição</label><textarea id="pdesc" name="descricao" rows="2" required></textarea><small class="field__error"></small></div>
        <div class="form-grid"><div class="field"><label for="ppreco">Preço (R$)</label><input id="ppreco" name="preco" type="number" step="0.01" min="0.01" required><small class="field__error"></small></div>
        <div class="field"><label for="pestoque">Estoque</label><input id="pestoque" name="estoque" type="number" min="0" required><small class="field__error"></small></div>
        <div class="field"><label for="pcat">Categoria</label><select id="pcat" name="categoria" required>${cats.map(c => `<option value="${c.id}">${c.nome}</option>`).join('')}</select></div>
        <div class="field"><label for="pimg">Imagem (URL)</label><input id="pimg" name="imagem" placeholder="https://..."></div></div>
        <label class="check"><input type="checkbox" name="disponivel"> Disponível para venda</label>
        <div class="actions"><button class="btn btn--primary" type="submit">Salvar</button><button class="btn btn--ghost" type="button" id="cancel">Cancelar</button></div></form></dialog>`;
      let lista = await Api.listarProdutos(); const dlg = $('#dlg'), pf = $('#pf');
      const draw = () => {
        const q = $('#q').value.toLowerCase(), c = $('#fc').value;
        $('#tb').innerHTML = lista.filter(x => (!c || x.categoria === c) && x.nome.toLowerCase().includes(q)).map(x => `<tr><td>${x.emoji} ${esc(x.nome)}</td><td>${x.categoria}</td><td>${money(x.preco)}</td><td>${x.estoque}</td>
          <td><span class="tag ${x.disponivel ? 'tag--ok' : 'tag--off'}">${x.disponivel ? 'Sim' : 'Não'}</span></td>
          <td><input type="checkbox" data-toggle="${x.id}" ${x.ativo ? 'checked' : ''} aria-label="Ativar ${esc(x.nome)}" style="width:auto"></td>
          <td class="actions"><button class="btn btn--ghost btn--sm" data-edit="${x.id}">Editar</button><button class="btn btn--danger btn--sm" data-del="${x.id}">Excluir</button></td></tr>`).join('');
      };
      const abrir = x => {
        pf.reset(); $$('[aria-invalid]', pf).forEach(i => i.removeAttribute('aria-invalid'));
        $('#dt').textContent = x ? 'Editar produto' : 'Novo produto';
        const d = x || { id: '', nome: '', descricao: '', preco: '', estoque: 0, categoria: cats[0].id, imagem: '', disponivel: true };
        for (const k of ['id', 'nome', 'descricao', 'preco', 'estoque', 'categoria', 'imagem']) pf.elements[k].value = d[k];
        pf.elements.disponivel.checked = d.disponivel; dlg.showModal();
      };
      $('#q').oninput = draw; $('#fc').onchange = draw; $('#novo').onclick = () => abrir(); $('#cancel').onclick = () => dlg.close();
      el.addEventListener('click', async e => {
        const ed = e.target.dataset.edit, del = e.target.dataset.del;
        if (ed) abrir(lista.find(x => x.id === Number(ed)));
        if (del && confirm('Excluir este produto?')) { await Api.excluirProduto(Number(del)); lista = await Api.listarProdutos(); draw(); toast('Produto excluído'); }
      });
      el.addEventListener('change', async e => {
        const id = e.target.dataset.toggle; if (!id) return;
        const x = lista.find(i => i.id === Number(id)); x.ativo = e.target.checked; await Api.salvarProduto(x); toast(x.ativo ? 'Produto ativado' : 'Produto desativado');
      });
      pf.onsubmit = async e => {
        e.preventDefault(); if (!validateForm(pf)) return;
        const f = pf.elements, old = lista.find(x => x.id === Number(f.id.value));
        const cat = cats.find(c => c.id === f.categoria.value);
        await Api.salvarProduto({ ...(old || { ativo: true, destaque: false, emoji: cat.emoji }), id: f.id.value ? Number(f.id.value) : undefined, nome: f.nome.value.trim(), descricao: f.descricao.value.trim(),
          preco: parseFloat(f.preco.value), estoque: parseInt(f.estoque.value, 10), categoria: f.categoria.value, imagem: f.imagem.value.trim(), disponivel: f.disponivel.checked });
        lista = await Api.listarProdutos(); dlg.close(); draw(); toast('Produto salvo');
      };
      draw();
    },
    async categorias() {
      const [cats, ps] = await Promise.all([Api.listarCategorias(), Api.listarProdutos()]);
      el.innerHTML = `<div class="table-wrap"><table><thead><tr><th>Categoria</th><th>Produtos</th></tr></thead><tbody>${cats.map(c => `<tr><td>${c.emoji} ${c.nome}</td><td>${ps.filter(p => p.categoria === c.id).length}</td></tr>`).join('')}</tbody></table></div>
        <p class="muted">Cadastro de categorias será habilitado com a API (GET/POST /api/categorias).</p>`;
    },
    async clientes() {
      const os = await Api.listarPedidos(), m = {};
      os.forEach(o => { const c = m[o.cliente] ||= { nome: o.cliente, tel: o.telefone, n: 0, total: 0 }; c.n++; c.total += o.status === 'Cancelado' ? 0 : o.total; });
      el.innerHTML = `<div class="table-wrap"><table><thead><tr><th>Cliente</th><th>Telefone</th><th>Pedidos</th><th>Total gasto</th></tr></thead><tbody>${Object.values(m).map(c => `<tr><td>${esc(c.nome)}</td><td>${esc(c.tel)}</td><td>${c.n}</td><td>${money(c.total)}</td></tr>`).join('')}</tbody></table></div>`;
    },
    async vendas() {
      const os = valid(await Api.listarPedidos()), dias = {}, pag = {};
      os.forEach(o => { const d = new Date(o.data).toLocaleDateString('pt-BR'); dias[d] = (dias[d] || 0) + o.total; pag[o.pagamento] = (pag[o.pagamento] || 0) + o.total; });
      const bars = obj => { const max = Math.max(1, ...Object.values(obj)); return `<div class="bars">${Object.entries(obj).map(([k, v]) => `<div class="bar"><span>${k}</span><i style="width:${v / max * 100}%"></i><strong>${money(v)}</strong></div>`).join('')}</div>`; };
      el.innerHTML = `<div class="stats">${stat('Faturamento total', money(sum(os)))}${stat('Pedidos válidos', os.length)}${stat('Ticket médio', money(os.length ? sum(os) / os.length : 0))}</div>
        <div class="panel"><h2>Vendas por dia</h2>${bars(dias)}</div><div class="panel"><h2>Por forma de pagamento</h2>${bars(pag)}</div>`;
    },
    async configuracoes() {
      const c = CONFIG;
      el.innerHTML = `<form class="panel" id="cf" novalidate><div class="form-grid">
        <div class="field"><label for="a">Taxa de entrega (R$)</label><input id="a" name="taxaEntrega" type="number" step="0.5" min="0" value="${c.taxaEntrega}" required><small class="field__error"></small></div>
        <div class="field"><label for="b">Frete grátis acima de (R$)</label><input id="b" name="freteGratisAcima" type="number" min="0" value="${c.freteGratisAcima}" required><small class="field__error"></small></div>
        <div class="field"><label for="c">Desconto a partir de (R$)</label><input id="c" name="descontoMinimo" type="number" min="0" value="${c.descontoMinimo}" required><small class="field__error"></small></div>
        <div class="field"><label for="d">Desconto (%)</label><input id="d" name="descontoPercentual" type="number" min="0" max="100" value="${c.descontoPercentual}" required><small class="field__error"></small></div></div>
        <button class="btn btn--primary">Salvar configurações</button></form>`;
      $('#cf').onsubmit = e => { e.preventDefault(); if (!validateForm(e.target)) return;
        const n = {}; for (const i of e.target.elements) if (i.name) n[i.name] = parseFloat(i.value);
        Store.set('config', { ...c, ...n }); toast('Configurações salvas'); };
    }
  };
  pages[key]();
})();
