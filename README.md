# PersonaLISA - 
E-commerce completo de pelúcias artesanais desenvolvido em Node.js, inspirado no conceito do PersonaLISA com identidade própria da PersonaLISA.

## 🎯 Sobre o Projeto

Este é um e-commerce completo desenvolvido em Node.js com as seguintes funcionalidades:

- **Catálogo de produtos** organizados por categorias
- **Sistema de carrinho** com variações de produtos
- **Cálculo de frete** simulado por região
- **Autenticação de usuários** (login/cadastro)
- **Painel administrativo** para gestão
- **Interface responsiva** fiel ao design original
- **Sistema de pagamento** simulado (PIX, cartão, boleto)

## 🚀 Tecnologias Utilizadas

- **Backend**: Node.js + Express
- **Banco de dados**: SQLite
- **Template Engine**: EJS
- **Frontend**: Bootstrap 5 + CSS customizado
- **Autenticação**: express-session + bcryptjs
- **Validação**: express-validator
- **Gerenciador**: Bun (ao invés de npm)

## 📦 Instalação e Execução

### Pré-requisitos
- Node.js (versão 18 ou superior)
- Bun (gerenciador de pacotes)

### Passos para execução:

1. **Clone/baixe o projeto**
   ```bash
   # Já está na pasta correta se você está vendo este README
   ```

2. **Instale as dependências**
   ```bash
   bun install
   ```

3. **Inicialize o banco de dados**
   ```bash
   bun run init-db
   ```

4. **Inicie o servidor**
   ```bash
   # Produção
   bun start
   
   # Desenvolvimento (auto-reload)
   bun run dev
   ```

5. **Acesse o site**
   - Site: http://localhost:3000
   - Admin: http://localhost:3000/admin
   - Login admin: `admin@personalisa.com` / `admin123`

## 📂 Estrutura do Projeto

```
saturn-atelie/
├── database/              # Configuração do banco SQLite
├── public/               # Arquivos estáticos
│   ├── css/             # Estilos customizados
│   ├── js/              # JavaScript do frontend
│   └── images/          # Imagens (produtos, logos, etc)
├── routes/              # Rotas do Express
│   ├── index.js         # Página inicial e busca
│   ├── products.js      # Catálogo de produtos
│   ├── cart.js          # Carrinho de compras
│   ├── auth.js          # Autenticação
│   └── admin.js         # Painel administrativo
├── scripts/             # Scripts utilitários
├── views/               # Templates EJS
│   ├── layout.ejs       # Layout principal
│   ├── index.ejs        # Página inicial
│   ├── products/        # Páginas de produtos
│   ├── cart/            # Página do carrinho
│   └── partials/        # Componentes reutilizáveis
├── package.json         # Dependências
└── server.js           # Servidor principal
```

## 🛍️ Funcionalidades Implementadas

### ✅ Frontend
- [x] Design fiel ao site original
- [x] Interface responsiva (mobile-first)
- [x] Animações e transições suaves
- [x] Sistema de navegação completo
- [x] Cards de produtos com badges de desconto
- [x] Carrinho de compras interativo
- [x] Calculadora de frete simulada

### ✅ Backend
- [x] Sistema de produtos com variações
- [x] Gestão de estoque automática
- [x] Autenticação segura de usuários
- [x] Sessões de carrinho persistentes
- [x] Cálculo de preços e descontos
- [x] API REST para funcionalidades AJAX

### ✅ Administração
- [x] Dashboard com estatísticas
- [x] CRUD completo de produtos
- [x] Gestão de categorias
- [x] Visualização de pedidos
- [x] Controle de usuários

### ✅ Banco de Dados
- [x] Estrutura relacional otimizada
- [x] Dados de exemplo do site original
- [x] Relacionamentos entre tabelas
- [x] Queries otimizadas

## 🎨 Design e UX

O projeto replica fielmente o design do site original, incluindo:

- **Cores**: Gradiente roxo/rosa característico
- **Typography**: Fonte Poppins para legibilidade
- **Componentes**: Cards, badges, botões e formulários
- **Navegação**: Menu dropdown com subcategorias
- **Responsividade**: Adaptação perfeita para mobile

## 🛒 Categorias de Produtos

Baseado na análise do site original:

- **Pelúcias**: Produtos artesanais principais
- **Coleção Bebezitos**: Linha especial para bebês
- **Personagens**:
  - Ghibli (Totoro, No-face, Ponyo)
  - Sanrio (Hello Kitty, My Melody)
  - Pokémon (Pikachu, Ditto, Eevee)
  - One Piece, Hollow Knight, etc.
- **Chaveiros**: Acessórios em miniatura
- **Receitas**: PDFs para crochê
- **Miseryswin**: Coleção especial

## 🔒 Segurança

- Senhas criptografadas com bcryptjs
- Validação de entrada de dados
- Proteção contra ataques comuns (XSS, CSRF)
- Headers de segurança com helmet
- Sessões seguras

## 📱 Compatibilidade

- **Navegadores**: Chrome, Firefox, Safari, Edge
- **Dispositivos**: Desktop, tablet, mobile
- **Sistemas**: Windows, macOS, Linux

## 🚧 Próximas Melhorias

- [ ] Integração com gateway de pagamento real
- [ ] Sistema de envio de emails
- [ ] Chat de atendimento
- [ ] Sistema de reviews/avaliações
- [ ] Integração com Correios para frete real
- [ ] Painel de analytics
- [ ] Sistema de cupons de desconto

## 📞 Suporte

Para dúvidas sobre o projeto:

- **Email**: admin@personalisa.com
- **WhatsApp**: (11) 94858-6369 (simulado)

## 📄 Licença

Este projeto foi criado para fins educacionais e demonstração técnica. 

---

**PersonaLISA** - Pelúcias artesanais feitas com amor ♡
