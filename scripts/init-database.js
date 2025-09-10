const getDatabase = require('../database/database');
const bcrypt = require('bcryptjs');

async function initDatabase() {
  const db = getDatabase();
  
  try {
    console.log('🔄 Inicializando banco de dados...');
    
    // Criar usuário admin padrão
    const hashedPassword = await bcrypt.hash('admin123', 12);
    await db.run(
      'INSERT OR IGNORE INTO users (name, email, password, is_admin) VALUES (?, ?, ?, ?)',
      ['Administrador', 'admin@personalisa.com', hashedPassword, true]
    );

    // Criar categorias principais
    const categories = [
      { name: 'Pelúcias', slug: 'pelúcias', description: 'Pelúcias artesanais fofas e únicas' },
      { name: 'Coleção Bebezitos', slug: 'colecao-bebezitos', description: 'Pelúcias especiais da coleção bebê' },
      { name: 'Personagens', slug: 'personagens', description: 'Personagens de anime, games e filmes' },
      { name: 'Chaveiros', slug: 'chaveiros', description: 'Chaveiros de pelúcia e acessórios' },
      { name: 'Camisetas', slug: 'camisetas', description: 'Camisetas com estampas exclusivas' },
      { name: 'Receitas', slug: 'receitas', description: 'Receitas de crochê para fazer em casa' },
      { name: 'Acessórios', slug: 'acessórios', description: 'Bolsas, ecobags e outros acessórios' },
      { name: 'Ecobags', slug: 'ecobags', description: 'Sacolas sustentáveis e estilosas' },
      { name: 'Miseryswin', slug: 'miseryswin', description: 'Coleção especial Miseryswin' }
    ];

    for (const category of categories) {
      await db.run(
        'INSERT OR IGNORE INTO categories (name, slug, description) VALUES (?, ?, ?)',
        [category.name, category.slug, category.description]
      );
    }

    // Subcategorias de Personagens
    const personagensId = (await db.get('SELECT id FROM categories WHERE slug = ?', ['personagens'])).id;
    
    const subcategories = [
      { name: 'Ghibli', slug: 'ghibli', parent_id: personagensId },
      { name: 'Sanrio', slug: 'sanrio', parent_id: personagensId },
      { name: 'Hora de Aventura', slug: 'hora-de-aventura', parent_id: personagensId },
      { name: 'Super Mario', slug: 'super-mario', parent_id: personagensId },
      { name: 'Bee and Puppycat', slug: 'bee-and-puppycat', parent_id: personagensId },
      { name: 'Pokémon', slug: 'pokemon', parent_id: personagensId },
      { name: 'One Piece', slug: 'one-piece', parent_id: personagensId },
      { name: 'Hollow Knight', slug: 'hollow-knight', parent_id: personagensId }
    ];

    for (const subcat of subcategories) {
      await db.run(
        'INSERT OR IGNORE INTO categories (name, slug, parent_id) VALUES (?, ?, ?)',
        [subcat.name, subcat.slug, subcat.parent_id]
      );
    }

    // Produtos de exemplo baseados no site original
    const products = [
      // Pelúcias Ghibli
      {
        name: 'Pelúcias Ghibli - 3 modelos',
        slug: 'pelucias-ghibli-3-modelos',
        description: 'Escolha entre Totoro, No-face ou Ponyo. Pelúcias fofíssimas dos personagens do Studio Ghibli.',
        price: 75.00,
        stock: 3,
        featured: true,
        variants: [
          { name: 'Modelo', value: 'Totoro' },
          { name: 'Modelo', value: 'No Face' },
          { name: 'Modelo', value: 'Ponyo' }
        ]
      },
      // Gatinhos
      {
        name: 'Gatinhos pelúcia - escolha seu modelo',
        slug: 'gatinhos-pelucia-escolha-modelo',
        description: 'Gatinhos de pelúcia super fofinhos! Vários modelos disponíveis. Tamanho aproximado: 15cm de altura com o rabinho.',
        price: 105.00,
        compare_price: 130.00,
        stock: 6,
        featured: true,
        variants: [
          { name: 'Cor', value: 'Siamês' },
          { name: 'Cor', value: 'Malhado' },
          { name: 'Cor', value: 'Cinza' },
          { name: 'Cor', value: 'Branco' },
          { name: 'Cor', value: 'Preto' },
          { name: 'Cor', value: 'Laranja' },
          { name: 'Cor', value: 'Amarelo e branco' }
        ]
      },
      // Snoopy
      {
        name: 'Pelúcia Snoopy',
        slug: 'pelucia-snoopy',
        description: 'O famoso cachorrinho Snoopy em versão pelúcia! Super macio e fofinho.',
        price: 95.00,
        stock: 1,
        featured: true
      },
      {
        name: 'Chaveiro snoopy pelúcia',
        slug: 'chaveiro-snoopy-pelucia',
        description: 'Chaveiro do Snoopy em pelúcia, perfeito para levar seu personagem favorito sempre com você!',
        price: 55.00,
        stock: 1
      },
      // Pokémon
      {
        name: 'Pikachu Pelúcia',
        slug: 'pikachu-pelucia',
        description: 'O Pokémon mais famoso do mundo em versão pelúcia! Amarelinho e fofo.',
        price: 75.00,
        compare_price: 125.00,
        stock: 2,
        featured: true
      },
      {
        name: 'Ditto pelúcia',
        slug: 'ditto-pelucia',
        description: 'Ditto, o Pokémon que pode se transformar em qualquer outro! Rosa e sorridente.',
        price: 85.00,
        stock: 1
      },
      // Sanrio
      {
        name: 'Mini pelúcias Sanrio',
        slug: 'mini-pelucias-sanrio',
        description: 'Miniaturas fofas dos personagens Sanrio: Hello Kitty, My Melody, Cinnamoroll e mais!',
        price: 50.00,
        compare_price: 60.00,
        stock: 5,
        variants: [
          { name: 'Modelo', value: 'Hello Kitty' },
          { name: 'Modelo', value: 'My Melody' },
          { name: 'Modelo', value: 'Cinnamoroll' },
          { name: 'Modelo', value: 'Keroppi' },
          { name: 'Modelo', value: 'Pompompurin' }
        ]
      },
      // Outros produtos populares
      {
        name: 'Sapinho popozudo',
        slug: 'sapinho-popozudo',
        description: 'O sapinho mais fofo da internet! Com um popozinho irresistível.',
        price: 50.00,
        compare_price: 55.00,
        stock: 1,
        featured: true
      },
      {
        name: 'Capivara pelúcia',
        slug: 'capivara-pelucia',
        description: 'Capivara tranquilona em versão pelúcia. Perfeita para relaxar!',
        price: 55.00,
        stock: 3
      },
      {
        name: 'Axolote pelúcia - 3 cores',
        slug: 'axolote-pelucia-3-cores',
        description: 'Axolotes fofos em 3 cores diferentes! Escolha seu favorito.',
        price: 65.00,
        compare_price: 73.00,
        stock: 3,
        variants: [
          { name: 'Cor', value: 'Rosa' },
          { name: 'Cor', value: 'Azul' },
          { name: 'Cor', value: 'Roxo' }
        ]
      },
      // Chaveiros
      {
        name: 'Porta isqueiro - cogumelo',
        slug: 'porta-isqueiro-cogumelo',
        description: 'Porta isqueiro em formato de cogumelo, super útil e fofo!',
        price: 35.00,
        stock: 1
      },
      {
        name: 'Bolsinhas porta treco - 2 tamanhos',
        slug: 'bolsinhas-porta-treco-2-tamanhos',
        description: 'Bolsinhas práticas para guardar seus pertences com estilo!',
        price: 38.00,
        stock: 1,
        variants: [
          { name: 'Modelo', value: 'Estrela - P' },
          { name: 'Modelo', value: 'Estrela - M' },
          { name: 'Modelo', value: 'Morango - P' },
          { name: 'Modelo', value: 'Morango - M' }
        ]
      },
      // Receitas
      {
        name: '[Receita] Totoro e No-Face',
        slug: 'receita-totoro-no-face',
        description: 'Receita completa para fazer suas próprias pelúcias do Totoro e No-Face em crochê!',
        price: 9.50,
        compare_price: 12.00,
        stock: 10
      },
      {
        name: '[RECEITA] Sapinho pelúcia',
        slug: 'receita-sapinho-pelucia',
        description: 'Aprenda a fazer o famoso sapinho popozudo em crochê com nossa receita detalhada!',
        price: 6.50,
        compare_price: 15.00,
        stock: 10
      }
    ];

    // Inserir produtos
    for (const product of products) {
      const result = await db.run(
        `INSERT OR IGNORE INTO products 
         (name, slug, description, price, compare_price, stock, featured, active) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          product.name, 
          product.slug, 
          product.description, 
          product.price, 
          product.compare_price || null,
          product.stock,
          product.featured || false,
          true
        ]
      );

      if (result.id && product.variants) {
        // Inserir variações
        for (const variant of product.variants) {
          await db.run(
            'INSERT OR IGNORE INTO product_variants (product_id, name, value, stock) VALUES (?, ?, ?, ?)',
            [result.id, variant.name, variant.value, Math.floor(product.stock / product.variants.length)]
          );
        }
      }

      // Associar com categorias adequadas
      if (result.id) {
        let categorySlug = 'pelúcias'; // padrão
        
        if (product.name.toLowerCase().includes('chaveiro') || product.name.toLowerCase().includes('porta')) {
          categorySlug = 'chaveiros';
        } else if (product.name.toLowerCase().includes('receita')) {
          categorySlug = 'receitas';
        } else if (product.name.toLowerCase().includes('ghibli') || product.name.toLowerCase().includes('totoro')) {
          categorySlug = 'ghibli';
        } else if (product.name.toLowerCase().includes('sanrio') || product.name.toLowerCase().includes('hello kitty')) {
          categorySlug = 'sanrio';
        } else if (product.name.toLowerCase().includes('pokemon') || product.name.toLowerCase().includes('pikachu')) {
          categorySlug = 'pokemon';
        }

        const category = await db.get('SELECT id FROM categories WHERE slug = ?', [categorySlug]);
        if (category) {
          await db.run(
            'INSERT OR IGNORE INTO product_categories (product_id, category_id) VALUES (?, ?)',
            [result.id, category.id]
          );
        }
      }
    }

    console.log('✅ Banco de dados inicializado com sucesso!');
    console.log('📊 Dados criados:');
    console.log('  - Usuário admin: admin@personalisa.com / admin123');
    console.log('  - Categorias e subcategorias');
    console.log('  - Produtos de exemplo baseados no site original');
    
  } catch (error) {
    console.error('❌ Erro ao inicializar banco:', error);
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  initDatabase().then(() => {
    process.exit(0);
  }).catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = initDatabase;
