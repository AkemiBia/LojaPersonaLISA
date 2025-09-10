const express = require('express');
const router = express.Router();
const getDatabase = require('../database/database');
const ejs = require('ejs');
const path = require('path');

// Middleware para verificar se usuário é admin
const requireAdmin = (req, res, next) => {
  if (!req.session.user || !req.session.user.is_admin) {
    return res.status(403).render('error', {
      title: 'Acesso Negado - PersonaLISA',
      error: 'Acesso restrito a administradores'
    });
  }
  next();
};

// Middleware removido - usando renderização direta

// Dashboard admin
router.get('/', requireAdmin, async (req, res) => {
  try {
    const db = getDatabase();

    // Estatísticas básicas
    const stats = {
      totalProducts: (await db.get('SELECT COUNT(*) as count FROM products WHERE active = 1')).count,
      totalUsers: (await db.get('SELECT COUNT(*) as count FROM users WHERE is_admin = 0')).count,
      totalOrders: (await db.get('SELECT COUNT(*) as count FROM orders')).count,
      totalRevenue: (await db.get('SELECT COALESCE(SUM(total), 0) as total FROM orders WHERE payment_status = "paid"')).total
    };

    // Produtos com estoque baixo
    const lowStockProducts = await db.all(`
      SELECT * FROM products 
      WHERE active = 1 AND stock <= 5
      ORDER BY stock ASC
      LIMIT 10
    `);

    // Pedidos recentes
    const recentOrders = await db.all(`
      SELECT o.*, u.name as user_name
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      ORDER BY o.created_at DESC
      LIMIT 10
    `);

    // Renderizar diretamente sem layout
    const templatePath = path.join(__dirname, '../views/admin/dashboard.ejs');
    const html = await ejs.renderFile(templatePath, {
      title: 'Painel Admin - PersonaLISA',
      stats,
      lowStockProducts,
      recentOrders,
      user: req.session.user,
      req: req
    });
    res.send(html);

  } catch (error) {
    console.error('Erro no dashboard admin:', error);
    res.status(500).render('error', { 
      title: 'Erro - PersonaLISA',
      error: 'Erro interno do servidor' 
    });
  }
});

// Listar produtos
router.get('/produtos', requireAdmin, async (req, res) => {
  try {
    const db = getDatabase();
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const offset = (page - 1) * limit;

    const products = await db.all(`
      SELECT p.*, 
             GROUP_CONCAT(c.name) as categories,
             p.image
      FROM products p
      LEFT JOIN product_categories pc ON p.id = pc.product_id
      LEFT JOIN categories c ON pc.category_id = c.id
      GROUP BY p.id
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
    `, [limit, offset]);

    const totalResult = await db.get('SELECT COUNT(*) as total FROM products');
    const total = totalResult.total;
    const totalPages = Math.ceil(total / limit);

    // Renderizar diretamente sem layout
    const templatePath = path.join(__dirname, '../views/admin/products/index.ejs');
    const html = await ejs.renderFile(templatePath, {
      title: 'Produtos - Admin PersonaLISA',
      products,
      pagination: {
        current: page,
        total: totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
        next: page + 1,
        prev: page - 1
      },
      user: req.session.user,
      req: req
    });
    res.send(html);

  } catch (error) {
    console.error('Erro ao listar produtos admin:', error);
    res.status(500).render('error', { 
      title: 'Erro - PersonaLISA',
      error: 'Erro interno do servidor' 
    });
  }
});

// Criar produto
router.get('/produtos/novo', requireAdmin, async (req, res) => {
  try {
    const db = getDatabase();
    const categories = await db.all('SELECT * FROM categories ORDER BY name ASC');

    // Renderizar diretamente sem layout
    const templatePath = path.join(__dirname, '../views/admin/products/form.ejs');
    const html = await ejs.renderFile(templatePath, {
      title: 'Novo Produto - Admin PersonaLISA',
      product: null,
      categories,
      isEdit: false,
      user: req.session.user,
      req: req
    });
    res.send(html);

  } catch (error) {
    console.error('Erro ao carregar form produto:', error);
    res.status(500).render('error', { 
      title: 'Erro - PersonaLISA',
      error: 'Erro interno do servidor' 
    });
  }
});

// Salvar produto
router.post('/produtos', requireAdmin, async (req, res) => {
  try {
    const {
      name, slug, description, price, compare_price,
      sku, stock, weight, active, featured,
      meta_title, meta_description, categories
    } = req.body;

    const db = getDatabase();

    // Inserir produto
    const result = await db.run(`
      INSERT INTO products 
      (name, slug, description, price, compare_price, sku, stock, weight, active, featured, meta_title, meta_description)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      name, slug, description, parseFloat(price), 
      compare_price ? parseFloat(compare_price) : null,
      sku || null, parseInt(stock) || 0, 
      weight ? parseFloat(weight) : null,
      active === 'on', featured === 'on',
      meta_title || null, meta_description || null
    ]);

    const productId = result.id;

    // Associar categorias
    if (categories) {
      const categoryIds = Array.isArray(categories) ? categories : [categories];
      for (const categoryId of categoryIds) {
        await db.run(
          'INSERT INTO product_categories (product_id, category_id) VALUES (?, ?)',
          [productId, categoryId]
        );
      }
    }

    res.redirect('/admin/produtos');

  } catch (error) {
    console.error('Erro ao criar produto:', error);
    res.status(500).render('error', { 
      title: 'Erro - PersonaLISA',
      error: 'Erro interno do servidor' 
    });
  }
});

// Editar produto
router.get('/produtos/:id/editar', requireAdmin, async (req, res) => {
  try {
    const db = getDatabase();
    const productId = req.params.id;

    const product = await db.get('SELECT * FROM products WHERE id = ?', [productId]);
    if (!product) {
      return res.status(404).render('404', { 
        title: 'Produto não encontrado - PersonaLISA',
        error: 'Produto não encontrado' 
      });
    }

    const categories = await db.all('SELECT * FROM categories ORDER BY name ASC');
    const productCategories = await db.all(
      'SELECT category_id FROM product_categories WHERE product_id = ?',
      [productId]
    );

    const selectedCategories = productCategories.map(pc => pc.category_id);

    // Renderizar diretamente sem layout
    const templatePath = path.join(__dirname, '../views/admin/products/form.ejs');
    const html = await ejs.renderFile(templatePath, {
      title: `Editar ${product.name} - Admin PersonaLISA`,
      product,
      categories,
      selectedCategories,
      isEdit: true,
      user: req.session.user,
      req: req
    });
    res.send(html);

  } catch (error) {
    console.error('Erro ao carregar produto para edição:', error);
    res.status(500).render('error', { 
      title: 'Erro - PersonaLISA',
      error: 'Erro interno do servidor' 
    });
  }
});

// Atualizar produto
router.post('/produtos/:id', requireAdmin, async (req, res) => {
  try {
    const productId = req.params.id;
    const {
      name, slug, description, price, compare_price,
      sku, stock, weight, active, featured,
      meta_title, meta_description, categories
    } = req.body;

    const db = getDatabase();

    // Atualizar produto
    await db.run(`
      UPDATE products SET 
        name = ?, slug = ?, description = ?, price = ?, compare_price = ?,
        sku = ?, stock = ?, weight = ?, active = ?, featured = ?,
        meta_title = ?, meta_description = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [
      name, slug, description, parseFloat(price), 
      compare_price ? parseFloat(compare_price) : null,
      sku || null, parseInt(stock) || 0, 
      weight ? parseFloat(weight) : null,
      active === 'on', featured === 'on',
      meta_title || null, meta_description || null,
      productId
    ]);

    // Remover categorias existentes
    await db.run('DELETE FROM product_categories WHERE product_id = ?', [productId]);

    // Associar novas categorias
    if (categories) {
      const categoryIds = Array.isArray(categories) ? categories : [categories];
      for (const categoryId of categoryIds) {
        await db.run(
          'INSERT INTO product_categories (product_id, category_id) VALUES (?, ?)',
          [productId, categoryId]
        );
      }
    }

    res.redirect('/admin/produtos');

  } catch (error) {
    console.error('Erro ao atualizar produto:', error);
    res.status(500).render('error', { 
      title: 'Erro - PersonaLISA',
      error: 'Erro interno do servidor' 
    });
  }
});

// Deletar produto
router.post('/produtos/:id/deletar', requireAdmin, async (req, res) => {
  try {
    const productId = req.params.id;
    const db = getDatabase();

    // Marcar como inativo ao invés de deletar (preserva histórico)
    await db.run('UPDATE products SET active = 0 WHERE id = ?', [productId]);

    res.redirect('/admin/produtos');

  } catch (error) {
    console.error('Erro ao deletar produto:', error);
    res.status(500).render('error', { 
      title: 'Erro - PersonaLISA',
      error: 'Erro interno do servidor' 
    });
  }
});

// Listar pedidos
router.get('/pedidos', requireAdmin, async (req, res) => {
  try {
    const db = getDatabase();
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const offset = (page - 1) * limit;
    const status = req.query.status || 'all';

    let whereClause = '';
    let params = [];

    if (status !== 'all') {
      whereClause = 'WHERE o.status = ?';
      params.push(status);
    }

    const orders = await db.all(`
      SELECT o.*, u.name as user_name, u.email as user_email,
             COUNT(oi.id) as items_count
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      LEFT JOIN order_items oi ON o.id = oi.order_id
      ${whereClause}
      GROUP BY o.id
      ORDER BY o.created_at DESC
      LIMIT ? OFFSET ?
    `, [...params, limit, offset]);

    const totalResult = await db.get(`
      SELECT COUNT(*) as total FROM orders o ${whereClause}
    `, params);

    const total = totalResult.total;
    const totalPages = Math.ceil(total / limit);

    // Renderizar diretamente sem layout
    const templatePath = path.join(__dirname, '../views/admin/orders/index.ejs');
    const html = await ejs.renderFile(templatePath, {
      title: 'Pedidos - Admin PersonaLISA',
      orders,
      selectedStatus: status,
      pagination: {
        current: page,
        total: totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
        next: page + 1,
        prev: page - 1
      },
      user: req.session.user,
      req: req
    });
    res.send(html);

  } catch (error) {
    console.error('Erro ao listar pedidos admin:', error);
    res.status(500).render('error', { 
      title: 'Erro - PersonaLISA',
      error: 'Erro interno do servidor' 
    });
  }
});

// Ver detalhes do pedido
router.get('/pedidos/:id', requireAdmin, async (req, res) => {
  try {
    const db = getDatabase();
    const orderId = req.params.id;

    // Buscar pedido
    const order = await db.get(`
      SELECT o.*, u.name as user_name, u.email as user_email, u.phone as user_phone
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      WHERE o.id = ?
    `, [orderId]);

    if (!order) {
      return res.status(404).render('404', { 
        title: 'Pedido não encontrado - PersonaLISA',
        error: 'Pedido não encontrado' 
      });
    }

    // Buscar itens do pedido
    const items = await db.all(`
      SELECT oi.*, p.slug as product_slug
      FROM order_items oi
      LEFT JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id = ?
    `, [orderId]);

    // Renderizar diretamente sem layout
    const templatePath = path.join(__dirname, '../views/admin/orders/show.ejs');
    const html = await ejs.renderFile(templatePath, {
      title: `Pedido #${order.order_number} - Admin PersonaLISA`,
      order,
      items,
      user: req.session.user,
      req: req
    });
    res.send(html);

  } catch (error) {
    console.error('Erro ao ver pedido admin:', error);
    res.status(500).render('error', { 
      title: 'Erro - PersonaLISA',
      error: 'Erro interno do servidor' 
    });
  }
});

// Atualizar status do pedido
router.post('/pedidos/:id/status', requireAdmin, async (req, res) => {
  try {
    const orderId = req.params.id;
    const { status } = req.body;
    const db = getDatabase();

    await db.run('UPDATE orders SET status = ? WHERE id = ?', [status, orderId]);

    res.redirect(`/admin/pedidos/${orderId}`);

  } catch (error) {
    console.error('Erro ao atualizar status do pedido:', error);
    res.status(500).render('error', { 
      title: 'Erro - PersonaLISA',
      error: 'Erro interno do servidor' 
    });
  }
});

// ROTAS DE CATEGORIAS
// Lista categorias
router.get('/categorias', requireAdmin, async (req, res) => {
  try {
    const db = getDatabase();
    
    const categories = await db.all(`
      SELECT c.*, 
             COUNT(pc.product_id) as product_count
      FROM categories c
      LEFT JOIN product_categories pc ON c.id = pc.category_id
      GROUP BY c.id
      ORDER BY c.name ASC
    `);

    // Renderizar diretamente sem layout
    const templatePath = path.join(__dirname, '../views/admin/categories/index.ejs');
    const html = await ejs.renderFile(templatePath, {
      title: 'Categorias - Admin PersonaLISA',
      categories,
      user: req.session.user,
      req: req
    });
    res.send(html);

  } catch (error) {
    console.error('Erro ao listar categorias admin:', error);
    res.status(500).render('error', { 
      title: 'Erro - PersonaLISA',
      error: 'Erro interno do servidor' 
    });
  }
});

// Formulário nova categoria
router.get('/categorias/nova', requireAdmin, async (req, res) => {
  try {
    // Renderizar diretamente sem layout
    const templatePath = path.join(__dirname, '../views/admin/categories/form.ejs');
    const html = await ejs.renderFile(templatePath, {
      title: 'Nova Categoria - Admin PersonaLISA',
      category: null,
      isEdit: false,
      user: req.session.user,
      req: req
    });
    res.send(html);

  } catch (error) {
    console.error('Erro ao carregar form categoria:', error);
    res.status(500).render('error', { 
      title: 'Erro - PersonaLISA',
      error: 'Erro interno do servidor' 
    });
  }
});

// Criar categoria
router.post('/categorias', requireAdmin, async (req, res) => {
  try {
    const { name, slug, description } = req.body;
    const db = getDatabase();

    // Criar slug se não fornecido
    const finalSlug = slug || name.toLowerCase()
      .replace(/[áàâãä]/g, 'a')
      .replace(/[éèêë]/g, 'e')
      .replace(/[íìîï]/g, 'i')
      .replace(/[óòôõö]/g, 'o')
      .replace(/[úùûü]/g, 'u')
      .replace(/[ç]/g, 'c')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-');

    await db.run(
      'INSERT INTO categories (name, slug, description, active) VALUES (?, ?, ?, ?)',
      [name, finalSlug, description || null, 1]
    );

    req.session.success = 'Categoria criada com sucesso!';
    res.redirect('/admin/categorias');

  } catch (error) {
    console.error('Erro ao criar categoria:', error);
    req.session.error = 'Erro ao criar categoria.';
    res.redirect('/admin/categorias/nova');
  }
});

// Formulário editar categoria
router.get('/categorias/:id/editar', requireAdmin, async (req, res) => {
  try {
    const categoryId = req.params.id;
    const db = getDatabase();

    const category = await db.get('SELECT * FROM categories WHERE id = ?', [categoryId]);
    
    if (!category) {
      req.session.error = 'Categoria não encontrada.';
      return res.redirect('/admin/categorias');
    }

    // Renderizar diretamente sem layout
    const templatePath = path.join(__dirname, '../views/admin/categories/form.ejs');
    const html = await ejs.renderFile(templatePath, {
      title: `Editar ${category.name} - Admin PersonaLISA`,
      category,
      isEdit: true,
      user: req.session.user,
      req: req
    });
    res.send(html);

  } catch (error) {
    console.error('Erro ao carregar categoria para edição:', error);
    res.status(500).render('error', { 
      title: 'Erro - PersonaLISA',
      error: 'Erro interno do servidor' 
    });
  }
});

// Atualizar categoria
router.post('/categorias/:id', requireAdmin, async (req, res) => {
  try {
    const categoryId = req.params.id;
    const { name, slug, description, active } = req.body;
    const db = getDatabase();

    await db.run(
      'UPDATE categories SET name = ?, slug = ?, description = ?, active = ? WHERE id = ?',
      [name, slug, description || null, active ? 1 : 0, categoryId]
    );

    req.session.success = 'Categoria atualizada com sucesso!';
    res.redirect('/admin/categorias');

  } catch (error) {
    console.error('Erro ao atualizar categoria:', error);
    req.session.error = 'Erro ao atualizar categoria.';
    res.redirect(`/admin/categorias/${categoryId}/editar`);
  }
});

// Deletar categoria
router.post('/categorias/:id/deletar', requireAdmin, async (req, res) => {
  try {
    const categoryId = req.params.id;
    const db = getDatabase();

    // Verificar se há produtos usando esta categoria
    const productCount = await db.get(
      'SELECT COUNT(*) as count FROM product_categories WHERE category_id = ?',
      [categoryId]
    );

    if (productCount.count > 0) {
      req.session.error = 'Não é possível deletar categoria que possui produtos associados.';
      return res.redirect('/admin/categorias');
    }

    await db.run('DELETE FROM categories WHERE id = ?', [categoryId]);
    req.session.success = 'Categoria deletada com sucesso!';
    res.redirect('/admin/categorias');

  } catch (error) {
    console.error('Erro ao deletar categoria:', error);
    req.session.error = 'Erro ao deletar categoria.';
    res.redirect('/admin/categorias');
  }
});

module.exports = router;
