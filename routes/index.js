const express = require('express');
const router = express.Router();
const getDatabase = require('../database/database');

// Página inicial
router.get('/', async (req, res) => {
  try {
    const db = getDatabase();
    
    // Buscar produtos em destaque
    const featuredProducts = await db.all(`
      SELECT p.*, 
             p.image,
             CASE WHEN p.compare_price > p.price 
                  THEN ROUND(((p.compare_price - p.price) / p.compare_price) * 100) 
                  ELSE NULL 
             END as discount_percent
      FROM products p
      WHERE p.active = 1 AND p.featured = 1 AND p.stock > 0
      ORDER BY p.created_at DESC
      LIMIT 12
    `);

    // Buscar novidades (produtos mais recentes)
    const newProducts = await db.all(`
      SELECT p.*, 
             p.image,
             CASE WHEN p.compare_price > p.price 
                  THEN ROUND(((p.compare_price - p.price) / p.compare_price) * 100) 
                  ELSE NULL 
             END as discount_percent
      FROM products p
      WHERE p.active = 1 AND p.stock > 0
      ORDER BY p.created_at DESC
      LIMIT 8
    `);

    // Buscar mais vendidos (simulado por produtos com menor estoque)
    const bestSellers = await db.all(`
      SELECT p.*, 
             p.image,
             CASE WHEN p.compare_price > p.price 
                  THEN ROUND(((p.compare_price - p.price) / p.compare_price) * 100) 
                  ELSE NULL 
             END as discount_percent
      FROM products p
      WHERE p.active = 1 AND p.stock > 0
      ORDER BY p.stock ASC, p.created_at DESC
      LIMIT 8
    `);

    // Buscar produtos TWICE
    const twiceProducts = await db.all(`
      SELECT p.*, 
             p.image,
             CASE WHEN p.compare_price > p.price 
                  THEN ROUND(((p.compare_price - p.price) / p.compare_price) * 100) 
                  ELSE NULL 
             END as discount_percent
      FROM products p
      LEFT JOIN product_categories pc ON p.id = pc.product_id
      LEFT JOIN categories c ON pc.category_id = c.id
      WHERE p.active = 1 AND c.slug = 'twice'
      ORDER BY p.created_at DESC
      LIMIT 6
    `);

    // Buscar produtos K-pop (TWICE + BLACKPINK + SKZ)
    const kpopProducts = await db.all(`
      SELECT p.*, 
             p.image,
             CASE WHEN p.compare_price > p.price 
                  THEN ROUND(((p.compare_price - p.price) / p.compare_price) * 100) 
                  ELSE NULL 
             END as discount_percent
      FROM products p
      LEFT JOIN product_categories pc ON p.id = pc.product_id
      LEFT JOIN categories c ON pc.category_id = c.id
      WHERE p.active = 1 AND c.slug IN ('twice', 'blackpink', 'skz')
      ORDER BY p.created_at DESC
      LIMIT 4
    `);

    res.render('index', {
      title: 'PersonaLISA - Produtos K-pop e Anime',
      featuredProducts,
      newProducts,
      bestSellers,
      chaveiros: twiceProducts, // manter compatibilidade com template
      receitas: kpopProducts, // manter compatibilidade com template  
      twiceProducts,
      kpopProducts,
      meta_description: 'PersonaLISA - Produtos K-pop, anime e cultura pop! Camisetas TWICE, Pokémon, Studio Ghibli, BLACKPINK, Stray Kids e muito mais!'
    });

  } catch (error) {
    console.error('Erro na página inicial:', error);
    res.status(500).render('error', { 
      title: 'Erro - PersonaLISA',
      error: 'Erro interno do servidor' 
    });
  }
});

// Página de contato
router.get('/contato', (req, res) => {
  res.render('contact', {
    title: 'Contato - PersonaLISA',
    meta_description: 'Entre em contato com a PersonaLISA. Tire suas dúvidas sobre nossos produtos artesanais!'
  });
});

// Página de dúvidas frequentes
router.get('/duvidas-frequentes', (req, res) => {
  const faqs = [
    {
      question: 'Como faço um pedido?',
      answer: 'É simples! Navegue pelos nossos produtos, escolha o que deseja, adicione ao carrinho e finalize a compra.'
    },
    {
      question: 'Quais formas de pagamento vocês aceitam?',
      answer: 'Aceitamos pagamento via PIX (com desconto), cartão de crédito (até 6x sem juros) e boleto bancário.'
    },
    {
      question: 'Como é calculado o frete?',
      answer: 'O frete é calculado automaticamente no carrinho baseado no seu CEP e nos produtos escolhidos.'
    },
    {
      question: 'Vocês fazem produtos sob encomenda?',
      answer: 'Sim! Muitos dos nossos produtos podem ser feitos sob encomenda. Entre em contato para mais informações.'
    },
    {
      question: 'Qual o prazo de entrega?',
      answer: 'O prazo varia de acordo com a sua localização e método de envio escolhido. Produtos em estoque são enviados em até 2 dias úteis.'
    },
    {
      question: 'As receitas são detalhadas?',
      answer: 'Sim! Nossas receitas vêm com passo a passo detalhado, lista de materiais e dicas especiais para o sucesso do seu projeto.'
    }
  ];

  res.render('faq', {
    title: 'Dúvidas Frequentes - PersonaLISA',
    faqs,
    meta_description: 'Dúvidas frequentes sobre compras, entregas e produtos da PersonaLISA.'
  });
});

// Página de busca
router.get('/buscar', async (req, res) => {
  try {
    const query = req.query.q || '';
    const db = getDatabase();
    
    let products = [];
    
    if (query.length >= 2) {
      products = await db.all(`
        SELECT p.*, 
               p.image,
               CASE WHEN p.compare_price > p.price 
                    THEN ROUND(((p.compare_price - p.price) / p.compare_price) * 100) 
                    ELSE NULL 
               END as discount_percent
        FROM products p
        WHERE p.active = 1 AND (
          p.name LIKE ? OR 
          p.description LIKE ? OR
          p.slug LIKE ?
        )
        ORDER BY p.name ASC
      `, [`%${query}%`, `%${query}%`, `%${query}%`]);
    }

    res.render('search', {
      title: `Busca por "${query}" - PersonaLISA`,
      products,
      query,
      resultsCount: products.length,
      meta_description: `Resultados da busca por "${query}" na PersonaLISA`
    });

  } catch (error) {
    console.error('Erro na busca:', error);
    res.status(500).render('error', { 
      title: 'Erro - PersonaLISA',
      error: 'Erro interno do servidor' 
    });
  }
});

module.exports = router;
