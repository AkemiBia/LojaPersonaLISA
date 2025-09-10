const express = require('express');
const router = express.Router();
const getDatabase = require('../database/database');

// Listar todos os produtos ou por categoria
router.get('/', async (req, res) => {
  try {
    const db = getDatabase();
    const page = parseInt(req.query.page) || 1;
    const limit = 12;
    const offset = (page - 1) * limit;
    const category = req.query.categoria;
    const sort = req.query.sort || 'newest';

    let whereClause = 'WHERE p.active = 1';
    let params = [];

    // Filtro por categoria
    if (category) {
      whereClause += ` AND c.slug = ?`;
      params.push(category);
    }

    // Ordenação
    let orderClause = 'ORDER BY p.created_at DESC';
    switch (sort) {
      case 'price_asc':
        orderClause = 'ORDER BY p.price ASC';
        break;
      case 'price_desc':
        orderClause = 'ORDER BY p.price DESC';
        break;
      case 'name_asc':
        orderClause = 'ORDER BY p.name ASC';
        break;
      case 'featured':
        orderClause = 'ORDER BY p.featured DESC, p.created_at DESC';
        break;
      default:
        orderClause = 'ORDER BY p.created_at DESC';
    }

    // Buscar produtos
    const products = await db.all(`
      SELECT p.*, 
             p.image,
             c.name as category_name,
             c.slug as category_slug,
             CASE WHEN p.compare_price > p.price 
                  THEN ROUND(((p.compare_price - p.price) / p.compare_price) * 100) 
                  ELSE NULL 
             END as discount_percent
      FROM products p
      LEFT JOIN product_categories pc ON p.id = pc.product_id
      LEFT JOIN categories c ON pc.category_id = c.id
      ${whereClause}
      GROUP BY p.id
      ${orderClause}
      LIMIT ? OFFSET ?
    `, [...params, limit, offset]);

    // Contar total para paginação
    const totalResult = await db.get(`
      SELECT COUNT(DISTINCT p.id) as total
      FROM products p
      LEFT JOIN product_categories pc ON p.id = pc.product_id
      LEFT JOIN categories c ON pc.category_id = c.id
      ${whereClause}
    `, params);

    const total = totalResult.total;
    const totalPages = Math.ceil(total / limit);

    // Buscar categoria atual se filtrado
    let currentCategory = null;
    if (category) {
      currentCategory = await db.get('SELECT * FROM categories WHERE slug = ?', [category]);
    }

    // Buscar todas as categorias para o menu
    const categories = await db.all(`
      SELECT c.*, 
             COUNT(DISTINCT p.id) as product_count
      FROM categories c
      LEFT JOIN product_categories pc ON c.id = pc.category_id
      LEFT JOIN products p ON pc.product_id = p.id AND p.active = 1
      WHERE c.active = 1
      GROUP BY c.id
      ORDER BY c.name ASC
    `);

    res.render('products/index', {
      title: currentCategory ? `${currentCategory.name} - PersonaLISA` : 'Produtos - PersonaLISA',
      products,
      categories,
      currentCategory,
      pagination: {
        current: page,
        total: totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
        next: page + 1,
        prev: page - 1
      },
      filters: {
        category,
        sort
      },
      resultsCount: total,
      meta_description: currentCategory ? 
        `${currentCategory.description || currentCategory.name} - PersonaLISA` : 
        'Todos os produtos da PersonaLISA - Pelúcias artesanais, chaveiros, receitas e muito mais!'
    });

  } catch (error) {
    console.error('Erro ao listar produtos:', error);
    res.status(500).render('error', { 
      title: 'Erro - PersonaLISA',
      error: 'Erro interno do servidor' 
    });
  }
});

// Ver produto específico
router.get('/:slug', async (req, res) => {
  try {
    const db = getDatabase();
    const slug = req.params.slug;

    // Buscar produto
    const product = await db.get(`
      SELECT p.*,
             CASE WHEN p.compare_price > p.price 
                  THEN ROUND(((p.compare_price - p.price) / p.compare_price) * 100) 
                  ELSE NULL 
             END as discount_percent
      FROM products p
      WHERE p.slug = ? AND p.active = 1
    `, [slug]);

    if (!product) {
      return res.status(404).render('404', { 
        title: 'Produto não encontrado - PersonaLISA',
        error: 'Produto não encontrado' 
      });
    }

    // Buscar imagens do produto
    let images = await db.all(`
      SELECT * FROM product_images 
      WHERE product_id = ? 
      ORDER BY is_primary DESC, sort_order ASC
    `, [product.id]);

    // Se não há imagens na tabela product_images, usar campo image do produto como fallback
    if (images.length === 0 && product.image) {
      images = [{ 
        id: null, 
        filename: product.image,
        is_primary: true,
        alt_text: product.name 
      }];
    } else if (images.length === 0) {
      // Placeholder se não há nenhuma imagem
      images = [{ 
        id: null, 
        filename: 'placeholder.svg',
        is_primary: true,
        alt_text: product.name 
      }];
    }

    // Buscar variações do produto
    const variants = await db.all(`
      SELECT * FROM product_variants 
      WHERE product_id = ? AND active = 1
      ORDER BY name ASC, value ASC
    `, [product.id]);

    // Agrupar variações por nome (ex: Cor, Tamanho)
    const variantGroups = {};
    variants.forEach(variant => {
      if (!variantGroups[variant.name]) {
        variantGroups[variant.name] = [];
      }
      variantGroups[variant.name].push(variant);
    });

    // Buscar categorias do produto
    const categories = await db.all(`
      SELECT c.* FROM categories c
      JOIN product_categories pc ON c.id = pc.category_id
      WHERE pc.product_id = ?
    `, [product.id]);

    // Buscar produtos relacionados (mesma categoria)
    const relatedProducts = await db.all(`
      SELECT DISTINCT p.*, 
             p.image,
             CASE WHEN p.compare_price > p.price 
                  THEN ROUND(((p.compare_price - p.price) / p.compare_price) * 100) 
                  ELSE NULL 
             END as discount_percent
      FROM products p
      JOIN product_categories pc ON p.id = pc.product_id
      WHERE p.active = 1 AND p.id != ? 
        AND pc.category_id IN (
          SELECT category_id FROM product_categories WHERE product_id = ?
        )
      ORDER BY p.featured DESC, p.created_at DESC
      LIMIT 4
    `, [product.id, product.id]);

    res.render('products/show', {
      title: `${product.name} - PersonaLISA`,
      product,
      images,
      variantGroups,
      categories,
      relatedProducts,
      meta_description: product.description || `${product.name} - PersonaLISA`,
      meta_image: images.length > 0 ? images[0].filename : null,
      jsonLd: {
        "@context": "https://schema.org/",
        "@type": "Product",
        "name": product.name,
        "description": product.description,
        "sku": product.sku,
        "image": images.map(img => `/images/products/${img.filename}`),
        "offers": {
          "@type": "Offer",
          "url": `${req.protocol}://${req.get('host')}/produtos/${product.slug}`,
          "priceCurrency": "BRL",
          "price": product.price,
          "availability": product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
          "seller": {
            "@type": "Organization",
            "name": "PersonaLISA"
          }
        }
      }
    });

  } catch (error) {
    console.error('Erro ao buscar produto:', error);
    res.status(500).render('error', { 
      title: 'Erro - PersonaLISA',
      error: 'Erro interno do servidor' 
    });
  }
});

// API para buscar variações de produto (AJAX)
router.get('/:slug/variants', async (req, res) => {
  try {
    const db = getDatabase();
    const slug = req.params.slug;

    const product = await db.get('SELECT id FROM products WHERE slug = ?', [slug]);
    if (!product) {
      return res.status(404).json({ error: 'Produto não encontrado' });
    }

    const variants = await db.all(`
      SELECT * FROM product_variants 
      WHERE product_id = ? AND active = 1
      ORDER BY name ASC, value ASC
    `, [product.id]);

    res.json(variants);

  } catch (error) {
    console.error('Erro ao buscar variações:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;
