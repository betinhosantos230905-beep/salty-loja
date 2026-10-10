/* Pedidos do cliente logado: GET /api/pedidos (o servidor devolve só os pedidos dele) */
(async function () {
  const box = $('#meusPedidos'); if (!box) return;
  if (!Store.get('user')) { box.innerHTML = `<p class="empty">Entre na sua conta para ver seus pedidos. <a class="link" href="login.html?next=meus-pedidos.html">Entrar</a></p>`; return; }
  try {
    const os = await Api.listarPedidos();
    box.innerHTML = os.length ? os.map(o => `<article class="panel" style="margin-bottom:14px"><div class="row"><strong>Pedido #${o.numero}</strong><span class="tag">${esc(o.status)}</span></div>
      <div class="muted">${new Date(o.data).toLocaleString('pt-BR')} · ${esc(o.pagamento)}</div>
      <ul style="padding-left:18px;margin:8px 0">${o.itens.map(i => `<li>${i.quantidade}× ${esc(i.nome)}</li>`).join('')}</ul>
      <div class="row row--total"><span>Total</span><span>${money(o.total)}</span></div></article>`).join('')
      : `<p class="empty">Você ainda não fez pedidos. <a class="link" href="cardapio.html">Ver cardápio</a></p>`;
  } catch (err) { box.innerHTML = `<p class="empty">${esc(err.message)}</p>`; }
})();
