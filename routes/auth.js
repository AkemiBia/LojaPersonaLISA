const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const router = express.Router();
const getDatabase = require('../database/database');

// Middleware para verificar se usuário já está logado
const redirectIfAuthenticated = (req, res, next) => {
  if (req.session.user) {
    return res.redirect('/');
  }
  next();
};

// Middleware para verificar se usuário está logado
const requireAuth = (req, res, next) => {
  if (!req.session.user) {
    req.session.returnTo = req.originalUrl;
    return res.redirect('/auth/login');
  }
  next();
};

// Página de login
router.get('/login', redirectIfAuthenticated, (req, res) => {
  res.render('auth/login', {
    title: 'Login - PersonaLISA',
    meta_description: 'Faça login na sua conta do PersonaLISA'
  });
});

// Processar login
router.post('/login', [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Digite um email válido'),
  body('password')
    .isLength({ min: 1 })
    .withMessage('Digite sua senha')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
      return res.render('auth/login', {
        title: 'Login - PersonaLISA',
        errors: errors.array(),
        formData: req.body,
        meta_description: 'Faça login na sua conta do PersonaLISA'
      });
    }

    const { email, password } = req.body;
    const db = getDatabase();

    // Buscar usuário por email
    const user = await db.get('SELECT * FROM users WHERE email = ?', [email]);

    if (!user) {
      return res.render('auth/login', {
        title: 'Login - PersonaLISA',
        errors: [{ msg: 'Email ou senha incorretos' }],
        formData: req.body,
        meta_description: 'Faça login na sua conta do PersonaLISA'
      });
    }

    // Verificar senha
    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.render('auth/login', {
        title: 'Login - PersonaLISA',
        errors: [{ msg: 'Email ou senha incorretos' }],
        formData: req.body,
        meta_description: 'Faça login na sua conta do PersonaLISA'
      });
    }

    // Criar sessão
    req.session.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      is_admin: user.is_admin
    };

    // Redirecionar para página anterior ou home
    const returnTo = req.session.returnTo || '/';
    delete req.session.returnTo;
    
    res.redirect(returnTo);

  } catch (error) {
    console.error('Erro no login:', error);
    res.render('auth/login', {
      title: 'Login - PersonaLISA',
      errors: [{ msg: 'Erro interno do servidor' }],
      formData: req.body,
      meta_description: 'Faça login na sua conta do PersonaLISA'
    });
  }
});

// Página de cadastro
router.get('/cadastro', redirectIfAuthenticated, (req, res) => {
  res.render('auth/register', {
    title: 'Cadastro - PersonaLISA',
    meta_description: 'Crie sua conta no PersonaLISA'
  });
});

// Processar cadastro
router.post('/cadastro', [
  body('name')
    .isLength({ min: 2, max: 50 })
    .withMessage('Nome deve ter entre 2 e 50 caracteres')
    .trim(),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Digite um email válido'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Senha deve ter pelo menos 6 caracteres'),
  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Confirmação de senha não confere');
      }
      return true;
    }),
  body('phone')
    .optional({ checkFalsy: true })
    .matches(/^\(\d{2}\)\s\d{4,5}-\d{4}$/)
    .withMessage('Telefone deve estar no formato (11) 99999-9999')
], async (req, res) => {
  try {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.render('auth/register', {
        title: 'Cadastro - PersonaLISA',
        errors: errors.array(),
        formData: req.body,
        meta_description: 'Crie sua conta no PersonaLISA'
      });
    }

    const { name, email, password, phone } = req.body;
    const db = getDatabase();

    // Verificar se email já existe
    const existingUser = await db.get('SELECT id FROM users WHERE email = ?', [email]);

    if (existingUser) {
      return res.render('auth/register', {
        title: 'Cadastro - PersonaLISA',
        errors: [{ msg: 'Este email já está cadastrado' }],
        formData: req.body,
        meta_description: 'Crie sua conta no PersonaLISA'
      });
    }

    // Criptografar senha
    const hashedPassword = await bcrypt.hash(password, 12);

    // Criar usuário
    const result = await db.run(
      'INSERT INTO users (name, email, password, phone) VALUES (?, ?, ?, ?)',
      [name, email, hashedPassword, phone || null]
    );

    // Criar sessão
    req.session.user = {
      id: result.id,
      name,
      email,
      is_admin: false
    };

    res.redirect('/');

  } catch (error) {
    console.error('Erro no cadastro:', error);
    res.render('auth/register', {
      title: 'Cadastro - PersonaLISA',
      errors: [{ msg: 'Erro interno do servidor' }],
      formData: req.body,
      meta_description: 'Crie sua conta no PersonaLISA'
    });
  }
});

// Logout
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Erro no logout:', err);
    }
    res.redirect('/');
  });
});

// Página de perfil
router.get('/perfil', requireAuth, async (req, res) => {
  try {
    const db = getDatabase();
    const userId = req.session.user.id;

    // Buscar dados completos do usuário
    const user = await db.get('SELECT * FROM users WHERE id = ?', [userId]);

    // Buscar pedidos do usuário
    const orders = await db.all(`
      SELECT o.*, 
             COUNT(oi.id) as items_count
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      WHERE o.user_id = ?
      GROUP BY o.id
      ORDER BY o.created_at DESC
    `, [userId]);

    res.render('auth/profile', {
      title: 'Meu Perfil - PersonaLISA',
      user,
      orders,
      meta_description: 'Área do cliente - PersonaLISA'
    });

  } catch (error) {
    console.error('Erro ao carregar perfil:', error);
    res.status(500).render('error', { 
      title: 'Erro - PersonaLISA',
      error: 'Erro interno do servidor' 
    });
  }
});

// Atualizar perfil
router.post('/perfil', [
  requireAuth,
  body('name')
    .isLength({ min: 2, max: 50 })
    .withMessage('Nome deve ter entre 2 e 50 caracteres')
    .trim(),
  body('phone')
    .optional({ checkFalsy: true })
    .matches(/^\(\d{2}\)\s\d{4,5}-\d{4}$/)
    .withMessage('Telefone deve estar no formato (11) 99999-9999')
], async (req, res) => {
  try {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      const db = getDatabase();
      const user = await db.get('SELECT * FROM users WHERE id = ?', [req.session.user.id]);
      const orders = await db.all(`
        SELECT o.*, 
               COUNT(oi.id) as items_count
        FROM orders o
        LEFT JOIN order_items oi ON o.id = oi.order_id
        WHERE o.user_id = ?
        GROUP BY o.id
        ORDER BY o.created_at DESC
      `, [req.session.user.id]);

      return res.render('auth/profile', {
        title: 'Meu Perfil - PersonaLISA',
        user,
        orders,
        errors: errors.array(),
        formData: req.body,
        meta_description: 'Área do cliente - PersonaLISA'
      });
    }

    const { name, phone } = req.body;
    const db = getDatabase();

    await db.run(
      'UPDATE users SET name = ?, phone = ? WHERE id = ?',
      [name, phone || null, req.session.user.id]
    );

    // Atualizar sessão
    req.session.user.name = name;

    res.redirect('/auth/perfil?success=1');

  } catch (error) {
    console.error('Erro ao atualizar perfil:', error);
    res.status(500).render('error', { 
      title: 'Erro - PersonaLISA',
      error: 'Erro interno do servidor' 
    });
  }
});

// Alterar senha
router.post('/alterar-senha', [
  requireAuth,
  body('currentPassword')
    .isLength({ min: 1 })
    .withMessage('Digite sua senha atual'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('Nova senha deve ter pelo menos 6 caracteres'),
  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('Confirmação de senha não confere');
      }
      return true;
    })
], async (req, res) => {
  try {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.json({ success: false, errors: errors.array() });
    }

    const { currentPassword, newPassword } = req.body;
    const db = getDatabase();

    // Buscar usuário atual
    const user = await db.get('SELECT * FROM users WHERE id = ?', [req.session.user.id]);

    // Verificar senha atual
    const passwordMatch = await bcrypt.compare(currentPassword, user.password);

    if (!passwordMatch) {
      return res.json({ 
        success: false, 
        errors: [{ msg: 'Senha atual incorreta' }] 
      });
    }

    // Criptografar nova senha
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Atualizar senha
    await db.run(
      'UPDATE users SET password = ? WHERE id = ?',
      [hashedPassword, req.session.user.id]
    );

    res.json({ success: true, message: 'Senha alterada com sucesso!' });

  } catch (error) {
    console.error('Erro ao alterar senha:', error);
    res.json({ success: false, errors: [{ msg: 'Erro interno do servidor' }] });
  }
});

module.exports = router;
