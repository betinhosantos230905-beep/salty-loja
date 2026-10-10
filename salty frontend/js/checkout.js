/* Checkout: valida, monta o payload e envia por Api.criarPedido (POST /api/pedidos) */
(function () {
  const form = $('#checkoutForm'); if (!form) return;
  const area = $('#checkoutArea');
  const renderResumo = () => {
    const t = Cart.totals();
    $('#checkoutSummary').innerHTML = `<h2>Resumo do pedido</h2>${Cart.items().map(i =>
      `<div class="row"><span>${i.qty}× ${esc(i.nome)}</span><span>${money(i.preco * i.qty)}</span></div>`).join('')}<hr style="border:0;border-top:1px solid var(--line);margin:8px 0">${resumoHTML(t)}`;
  };
  if (!Cart.items().length) { area.innerHTML = `<p class="empty">Seu carrinho está vazio. <a class="link" href="cardapio.html">Ver cardápio</a></p>`; return; }
  renderResumo();
  const user = Store.get('user');
  if (user) { form.nome.value = user.nome || ''; form.email.value = user.email || ''; form.telefone.value = masks.tel(user.telefone || ''); }

  // Preenchimento por CEP (ViaCEP). Se falhar, o cliente digita manualmente.
  form.cep.addEventListener('blur', async () => {
    const cep = form.cep.value.replace(/\D/g, ''); if (cep.length !== 8) return;
    try {
      const d = await (await fetch(`https://viacep.com.br/ws/${cep}/json/`)).json();
      if (d.erro) return;
      Object.assign(form.rua, { value: d.logradouro }); form.bairro.value = d.bairro; form.cidade.value = d.localidade; form.estado.value = d.uf;
    } catch {}
  });

  form.addEventListener('submit', async e => {
    e.preventDefault(); if (!validateForm(form)) return;
    const t = Cart.totals(), f = form.elements, btn = form.querySelector('[type=submit]');
    const payload = {
      cliente: { nome: f.nome.value.trim(), telefone: f.telefone.value, email: f.email.value.trim() },
      endereco: { cep: f.cep.value, rua: f.rua.value, numero: f.numero.value, complemento: f.complemento.value, bairro: f.bairro.value, cidade: f.cidade.value, estado: f.estado.value },
      pagamento: f.pagamento.value, observacoes: f.observacoes.value.trim(),
      itens: Cart.items().map(i => ({ produto_id: i.id, nome: i.nome, quantidade: i.qty, preco_unitario: i.preco, observacao: i.obs })),
      totais: { subtotal: t.subtotal, entrega: t.entrega, desconto: t.desconto, total: t.total }
    };
    btn.disabled = true; btn.textContent = 'Enviando...';
    try {
      const { numero } = await Api.criarPedido(payload);
      Cart.clear(); area.hidden = true; $('#numeroPedido').textContent = '#' + numero; $('#pedidoOk').hidden = false;
      scrollTo({ top: 0 });
    } catch (err) { toast(err.message); btn.disabled = false; btn.textContent = 'Confirmar pedido'; }
  });
})();
