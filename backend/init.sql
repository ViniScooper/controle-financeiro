-- ============================================================
-- init.sql — Inicialização do Banco de Dados no Docker
-- ============================================================

CREATE DATABASE IF NOT EXISTS restaurante;
USE restaurante;

-- 1. Tabela de Usuários
CREATE TABLE IF NOT EXISTS usuario (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    senha VARCHAR(255) NOT NULL,
    role ENUM('admin', 'user') DEFAULT 'user',
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabela de Categorias
CREATE TABLE IF NOT EXISTS categoria (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL UNIQUE,
    icone VARCHAR(10) NOT NULL DEFAULT '🍴',
    imagem VARCHAR(255) DEFAULT NULL,
    ordem INT DEFAULT 0,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Tabela de Pratos
CREATE TABLE IF NOT EXISTS prato (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    descricao TEXT,
    preco DECIMAL(10, 2) NOT NULL,
    categoria VARCHAR(50) DEFAULT 'Cardápio',
    categoria_secundaria VARCHAR(100) DEFAULT NULL,
    happy_hour TINYINT(1) DEFAULT 0,
    imagem VARCHAR(255) DEFAULT NULL,
    taxa_embalagem DECIMAL(10, 2) DEFAULT NULL,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Tabela de Configurações (Happy Hour, etc)
CREATE TABLE IF NOT EXISTS configuracao (
    id INT PRIMARY KEY DEFAULT 1,
    hh_ativo TINYINT(1) DEFAULT 1,
    hh_dias VARCHAR(255) DEFAULT 'Segunda, Terça e Quarta',
    hh_inicio VARCHAR(10) DEFAULT '19:00',
    hh_fim VARCHAR(10) DEFAULT '22:00',
    hh_apenas_local TINYINT(1) DEFAULT 1,
    delivery_taxa_embalagem DECIMAL(10,2) DEFAULT 0.00,
    delivery_embalagem_tipo VARCHAR(20) DEFAULT 'pedido',
    instagram_url VARCHAR(255) DEFAULT 'https://www.instagram.com/botecodosivirino/',
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Inserção das Configurações padrão
INSERT INTO configuracao (id, hh_ativo, hh_dias, hh_inicio, hh_fim)
VALUES (1, 1, 'Segunda, Terça e Quarta', '19:00', '22:00')
ON DUPLICATE KEY UPDATE id=1;

-- Inserção das Categorias padrão
INSERT INTO categoria (nome, icone, ordem) VALUES
    ('Almoço', '🍽️', 1),
    ('Petiscos', '🍟', 2),
    ('Pizzas', '🍕', 3),
    ('Happy Hour', '🍺', 4),
    ('Bebidas', '🥤', 5),
    ('Sobremesas', '🍰', 6),
    ('Cardápio', '🍴', 7)
ON DUPLICATE KEY UPDATE nome = VALUES(nome);

-- Inserção do Usuário Admin padrão (Senha: admin123)
INSERT INTO usuario (nome, email, senha, role) VALUES
    ('Administrador', 'admin@boteco.com', '$2a$10$vI8aWBnW3fID.ZQ4/ZOIj.qU5vY3K5x1hT.0aY844hXq9E3l9Geq6', 'admin')
ON DUPLICATE KEY UPDATE email = VALUES(email);

-- Inserção dos 20 pratos do Boteco do Sivirino
INSERT INTO prato (nome, descricao, preco, categoria, happy_hour, imagem) VALUES
    ('Cozido de Carne na Panela', 'Carne bovina cozida no molho especial da casa, arroz e feijão', 38.90, 'Almoço', 0, '/uploads/cozido.png'),
    ('Carne Desfiada com Fritas', 'Carne desfiada ao molho com batata frita crocante', 34.90, 'Almoço', 0, '/uploads/carne-desfiada.png'),
    ('Frango Assado Completo', 'Frango assado na brasa com arroz, feijão e farofa', 32.00, 'Almoço', 0, NULL),
    ('Baião de Dois', 'Arroz com feijão-verde, queijo coalho e carne de sol', 29.90, 'Almoço', 0, NULL),
    ('Carne de Sol com Macaxeira', 'Carne de sol grelhada com macaxeira cozida e manteiga', 36.00, 'Almoço', 0, NULL),
    ('Torresmo da Casa', 'Torresmo crocante frito na hora, porção generosa', 28.00, 'Petiscos', 0, '/uploads/torresmo.png'),
    ('Bolinho de Bacalhau', '6 unidades crocantes com molho de coentro', 24.90, 'Petiscos', 0, NULL),
    ('Isca de Frango Temperada', 'Frango empanado com temperos nordestinos e molho barbecue', 22.00, 'Petiscos', 0, NULL),
    ('Macaxeira Frita', 'Macaxeira frita crocante por fora e macia por dentro', 16.00, 'Petiscos', 0, NULL),
    ('Queijo Coalho na Brasa', 'Espetinho de queijo coalho grelhado com mel de engenho', 14.00, 'Petiscos', 0, NULL),
    ('Pizza Calabresa', 'Calabresa fatiada, cebola e azeitona sobre molho da casa', 42.00, 'Pizzas', 0, NULL),
    ('Pizza Frango com Catupiry', 'Frango desfiado com catupiry cremoso e milho', 45.00, 'Pizzas', 0, NULL),
    ('Pizza Nordestina', 'Carne de sol, queijo coalho, cebola e pimenta', 48.00, 'Pizzas', 0, NULL),
    ('Pizza 4 Queijos', 'Mussarela, coalho, prato e parmesão', 44.00, 'Pizzas', 0, NULL),
    ('Cerveja Brahma 600ml', 'Geladíssima, direto do barril', 12.00, 'Happy Hour', 1, NULL),
    ('Cerveja Skol Lata 350ml', 'Lata gelada com desconto especial no happy hour', 7.00, 'Happy Hour', 1, NULL),
    ('Caipirinha da Casa', 'Limão, cachaça artesanal e açúcar mascavo', 15.00, 'Happy Hour', 1, NULL),
    ('Promoção Torresmo + 2 Cervejas', 'Porção de torresmo com 2 Brahmas 600ml por preço especial', 45.00, 'Happy Hour', 1, '/uploads/torresmo.png'),
    ('Combo Petisco + Cerveja', 'Escolha 1 petisco + 1 cerveja 600ml com 20% OFF', 34.00, 'Happy Hour', 1, NULL),
    ('Caldinho de Feijão', 'Caldinho quente temperado, ideal pra acompanhar a cerveja', 8.00, 'Happy Hour', 1, NULL)
ON DUPLICATE KEY UPDATE nome = VALUES(nome);
