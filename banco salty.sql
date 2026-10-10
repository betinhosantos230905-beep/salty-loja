create database salty;
use salty;
create table usuarios ( 
id_usuario int primary key auto_increment,
nome varchar (50)not null,
email varchar (60)not null unique,
telefone varchar (20)not null ,
senha varchar(150)not null ,
perfil varchar (50)

);

create table enderecos (
id_enderecos int primary key auto_increment,
id_usuario int not null,
cep varchar (20)not null,
rua varchar (150)not null,
numero varchar (15) not null ,
complemento varchar (100),
bairro varchar (60)not null,
estado varchar (60)not null,
foreign key (id_usuario) references usuarios (id_usuario)

);


create table categorias (
id_categoria int primary key auto_increment, 
nome varchar(70) not null
);

create table produtos (
id_produtos int primary key auto_increment,
id_categoria int not null ,
nome varchar(60) not null ,
descricao varchar(100),
preco decimal (10,2)not null,
imagem varchar (250),
ativo boolean not null default true ,
foreign key (id_categoria) references categorias (id_categoria)
);

create table pedidos (
id_pedidos int primary key auto_increment,
id_usuario int not null ,
status varchar (60),
total decimal (10,2)not null, 
forma_pagamento varchar(40) not null,
observacoes varchar (200),
data_pedido datetime default current_timestamp,
foreign key (id_usuario) references usuarios (id_usuario)


);

create table itens_pedido (
id_itens_pedido int primary key auto_increment, 
id_pedido int not null,
id_produto int not null, 
quantidade int not null,
preco_unitario decimal (10,2) not null,
foreign key (id_pedido) references pedidos (id_pedidos),
foreign key (id_produto) references produtos(id_produtos)

);