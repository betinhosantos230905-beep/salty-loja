-- Execute no MySQL (banco salty). O sistema funciona sem isso, mas recomendo os dois ajustes.
USE salty;

-- 1) Cabe o hash da senha (o hash usa ~100 caracteres). Sem isso, senhas antigas em texto puro
--    continuam funcionando, mas não são convertidas para hash no login.
ALTER TABLE usuarios MODIFY senha VARCHAR(255) NOT NULL;

-- 2) Guarda o endereço usado em CADA pedido (hoje pedidos não tem ligação com enderecos).
--    Sem isso, o painel mostra o endereço mais recente do cliente. Ajuste o tipo INT se id_enderecos for diferente.
ALTER TABLE pedidos ADD COLUMN id_endereco INT NULL;
ALTER TABLE pedidos ADD CONSTRAINT fk_pedidos_endereco FOREIGN KEY (id_endereco) REFERENCES enderecos(id_enderecos);
