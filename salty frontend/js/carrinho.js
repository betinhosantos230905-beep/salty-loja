/* Carrinho com LocalStorage */
const Cart = {
  items: () => Store.get('carrinho', []),
  save(l) { Store.set('carrinho', l); this.updateBadge(); },
  add(prod, qtd = 1, obs = '') {
    const l = this.items(), it = l.find(i => i.id === prod.id);
    if (it) { it.qty += qtd; if (obs) it.obs = obs; }
    else l.push({ id: prod.id, nome: prod.nome, preco: prod.preco, emoji: prod.emoji, imagem: prod.imagem, qty: qtd, obs });
    this.save(l); toast(`${prod.nome} adicionado ao carrinho`);
  },
  setQty(id, qty) { qty < 1 ? this.remove(id) : this.save(this.items().map(i => i.id === id ? { ...i, qty: Math.min(99, qty) } : i)); },
  remove(id) { this.save(this.items().filter(i => i.id !== id)); },
  clear() { this.save([]); },
  count() { return this.items().reduce((s, i) => s + i.qty, 0); },
  totals() {
    const sub = this.items().reduce((s, i) => s + i.preco * i.qty, 0), c = CONFIG;
    const entrega = sub === 0 || sub >= c.freteGratisAcima ? 0 : c.taxaEntrega;
    const desconto = sub >= c.descontoMinimo ? +(sub * c.descontoPercentual / 100).toFixed(2) : 0;
    return { subtotal: sub, entrega, desconto, total: sub + entrega - desconto };
  },
  updateBadge() { $$('[data-cart-count]').forEach(e => { e.textContent = this.count(); }); }
};

function resumoHTML(t) {
  return `<div class="row"><span>Subtotal</span><span>${money(t.subtotal)}</span></div>
    <div class="row"><span>Taxa de entrega</span><span>${t.entrega ? money(t.entrega) : 'Grátis'}</span></div>
    <div class="row row--off"><span>Desconto</span><span>− ${money(t.desconto)}</span></div>
    <div class="row row--total"><span>Total</span><span>${money(t.total)}</span></div>`;
}

function renderCarrinho() {
  const box = $('#cartItems'); if (!box) return;
  const l = Cart.items(), t = Cart.totals();
  box.innerHTML = l.length ? l.map(i => `<div class="cart-item"><div class="cart-item__img">${imgHTML(i)}</div>
    <div><strong>${esc(i.nome)}</strong><div class="muted">${money(i.preco)}${i.obs ? ' · ' + esc(i.obs) : ''}</div>
    <div class="cart-item__ctrl"><div class="qty"><button data-act="dec" data-id="${i.id}" aria-label="Diminuir">−</button><span>${i.qty}</span><button data-act="inc" data-id="${i.id}" aria-label="Aumentar">+</button></div>
    <button class="remove" data-act="rm" data-id="${i.id}">Remover</button></div></div><strong>${money(i.preco * i.qty)}</strong></div>`).join('')
    : `<p class="empty">Seu carrinho está vazio.</p>`;
  $('#cartSummary').innerHTML = `<h2>Resumo</h2>${resumoHTML(t)}
    ${l.length ? `<a class="btn btn--primary btn--block" href="checkout.html">Finalizar pedido</a>` : ''}
    <a class="btn btn--ghost btn--block" href="cardapio.html">Continuar comprando</a>`;
}

document.addEventListener('click', async e => {
  const add = e.target.closest('[data-add]');
  if (add) { const x = (await vitrine()).find(i => i.id === Number(add.dataset.add)); if (x) Cart.add(x); return; }
  const a = e.target.closest('[data-act]'); if (!a || !$('#cartItems')) return;
  const id = Number(a.dataset.id), it = Cart.items().find(i => i.id === id);
  if (a.dataset.act === 'inc') Cart.setQty(id, it.qty + 1);
  if (a.dataset.act === 'dec') Cart.setQty(id, it.qty - 1);
  if (a.dataset.act === 'rm') Cart.remove(id);
  renderCarrinho();
});
document.addEventListener('DOMContentLoaded', renderCarrinho);
