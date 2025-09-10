const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const cors = require('cors');
const path = require('path');
const expressLayouts = require('express-ejs-layouts');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware de segurança
app.use(helmet({
  contentSecurityPolicy: false // Desabilitado para desenvolvimento
}));
app.use(cors());

// Configuração de sessão
app.use(session({
  secret: 'saturn-atelie-secret-key',
  resave: false,
  saveUninitialized: true,
  cookie: { 
    secure: false, // true apenas em HTTPS
    maxAge: 24 * 60 * 60 * 1000 // 24 horas
  }
}));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Arquivos estáticos
app.use(express.static(path.join(__dirname, 'public')));

// Engine de templates
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layout');

// Middleware para flash messages
app.use((req, res, next) => {
  res.locals.success = req.session.success;
  res.locals.error = req.session.error;
  delete req.session.success;
  delete req.session.error;
  next();
});

// Middleware para dados globais do template
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  res.locals.cart = req.session.cart || [];
  res.locals.cartCount = req.session.cart ? req.session.cart.reduce((sum, item) => sum + item.quantity, 0) : 0;
  
  // Variáveis para templates
  res.locals.currentUrl = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
  res.locals.baseUrl = `${req.protocol}://${req.get('host')}`;
  res.locals.req = req; // Disponibilizar req nos templates se necessário
  
  // Valores padrão para meta tags
  if (!res.locals.title) res.locals.title = 'PersonaLISA - Pelúcias Artesanais';
  if (!res.locals.meta_description) res.locals.meta_description = 'PersonaLISA - Pelúcias artesanais únicas, chaveiros fofos, receitas de crochê e muito mais! Produtos inspirados em anime, games e cultura pop.';
  
  next();
});

// Importar rotas
const indexRoutes = require('./routes/index');
const productRoutes = require('./routes/products');
const cartRoutes = require('./routes/cart');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');

// Usar rotas
app.use('/', indexRoutes);
app.use('/produtos', productRoutes);
app.use('/carrinho', cartRoutes);
app.use('/auth', authRoutes);
app.use('/admin', adminRoutes);

// Middleware de tratamento de erro 404
app.use((req, res, next) => {
  res.status(404).render('404', { 
    title: 'Página não encontrada - PersonaLISA',
    error: 'Página não encontrada'
  });
});

// Middleware de tratamento de erros
app.use((error, req, res, next) => {
  console.error(error);
  res.status(500).render('error', { 
    title: 'Erro - PersonaLISA',
    error: 'Erro interno do servidor'
  });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor PersonaLISA rodando em http://localhost:${PORT}`);
  console.log(`📱 Use bun run dev para desenvolvimento com auto-reload`);
});

module.exports = app;
