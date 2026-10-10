/* Login e cadastro: Api.login (POST /api/login) e Api.cadastro (POST /api/cadastro) */
(function () {
  const login = $('#loginForm'), cad = $('#cadastroForm');
  if (login) {
    login.addEventListener('submit', async e => {
      e.preventDefault(); if (!validateForm(login)) return;
      try {
        const r = await Api.login({ email: login.email.value.trim(), senha: login.senha.value, lembrar: login.lembrar.checked });
        Store.set('user', { ...r.usuario, token: r.token });
        const next = new URLSearchParams(location.search).get('next');
        location.href = r.usuario.perfil === 'admin' ? 'admin/dashboard.html' : /^[\w-]+\.html$/.test(next || '') ? next : '../index.html';
      } catch (err) { toast(err.message); }
    });
    $('#esqueci').addEventListener('click', e => {
      e.preventDefault();
      if (!login.email.value.trim()) { login.email.focus(); return toast('Digite seu e-mail para recuperar a senha.'); }
      toast('Se o e-mail existir, enviaremos as instruções (simulado).'); // futuro: POST /api/recuperar-senha
    });
  }
  if (cad) cad.addEventListener('submit', async e => {
    e.preventDefault(); if (!validateForm(cad)) return;
    const f = cad.elements;
    try {
      await Api.cadastro({ nome: f.nome.value.trim(), email: f.email.value.trim(), telefone: f.telefone.value, senha: f.senha.value });
      toast('Conta criada! Entre para continuar.'); setTimeout(() => location.href = 'login.html', 900);
    } catch (err) { toast(err.message); }
  });
})();
