const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

async function resetDatabase() {
    return new Promise(async (resolve, reject) => {
        try {
            const dbPath = path.join(__dirname, '../database/saturn_atelie.db');
            
            // Delete existing database
            if (fs.existsSync(dbPath)) {
                fs.unlinkSync(dbPath);
                console.log('🗑️  Banco de dados anterior removido');
            }
            
            // Create new database connection
            const db = new sqlite3.Database(dbPath, (err) => {
                if (err) {
                    console.error('Erro ao conectar com o banco:', err);
                    return reject(err);
                }
                console.log('🚀 Criando novo banco de dados...');
            });
            
            // Enable foreign keys
            db.run('PRAGMA foreign_keys = ON', (err) => {
                if (err) {
                    console.error('Erro ao ativar foreign keys:', err);
                    return reject(err);
                }
            });
            
            // Create tables
            const createTablesSQL = `
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    email TEXT UNIQUE NOT NULL,
                    password TEXT NOT NULL,
                    is_admin BOOLEAN DEFAULT FALSE,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );
                
                CREATE TABLE IF NOT EXISTS categories (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL UNIQUE,
                    slug TEXT NOT NULL UNIQUE,
                    description TEXT,
                    active BOOLEAN DEFAULT TRUE,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );
                
                CREATE TABLE IF NOT EXISTS products (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    slug TEXT NOT NULL UNIQUE,
                    description TEXT,
                    price DECIMAL(10,2) NOT NULL,
                    compare_price DECIMAL(10,2),
                    sku TEXT UNIQUE,
                    stock INTEGER DEFAULT 0,
                    weight DECIMAL(8,3),
                    image TEXT,
                    active BOOLEAN DEFAULT TRUE,
                    featured BOOLEAN DEFAULT FALSE,
                    meta_title TEXT,
                    meta_description TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );
                
                CREATE TABLE IF NOT EXISTS product_categories (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    product_id INTEGER NOT NULL,
                    category_id INTEGER NOT NULL,
                    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
                    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
                    UNIQUE(product_id, category_id)
                );
                
                CREATE TABLE IF NOT EXISTS orders (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER,
                    total DECIMAL(10,2) NOT NULL,
                    status TEXT DEFAULT 'pending',
                    customer_name TEXT NOT NULL,
                    customer_email TEXT NOT NULL,
                    customer_phone TEXT,
                    shipping_address TEXT,
                    payment_method TEXT,
                    payment_status TEXT DEFAULT 'pending',
                    notes TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id)
                );
                
                CREATE TABLE IF NOT EXISTS order_items (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    order_id INTEGER NOT NULL,
                    product_id INTEGER NOT NULL,
                    quantity INTEGER NOT NULL,
                    price DECIMAL(10,2) NOT NULL,
                    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
                    FOREIGN KEY (product_id) REFERENCES products(id)
                );
            `;
            
            db.exec(createTablesSQL, async (err) => {
                if (err) {
                    console.error('Erro ao criar tabelas:', err);
                    return reject(err);
                }
                console.log('✅ Tabelas criadas com sucesso');
                
                try {
                    // Create admin user
                    const hashedPassword = await bcrypt.hash('admin123', 10);
                    
                    db.run(`
                        INSERT INTO users (name, email, password, is_admin)
                        VALUES (?, ?, ?, ?)
                    `, ['Admin PersonaLISA', 'admin@personalisa.com', hashedPassword, true], (err) => {
                        if (err) {
                            console.error('Erro ao criar usuário admin:', err);
                            return reject(err);
                        }
                        console.log('👤 Usuário administrador criado: admin@personalisa.com / admin123');
                        
                        // Create new categories
                        const categories = [
                            {
                                name: 'TWICE',
                                slug: 'twice',
                                description: 'Produtos oficiais e inspirados no grupo K-pop TWICE',
                                active: 1
                            },
                            {
                                name: 'Pokémon',
                                slug: 'pokemon',
                                description: 'Camisetas, acessórios e produtos temáticos de Pokémon',
                                active: 1
                            },
                            {
                                name: 'Studio Ghibli',
                                slug: 'ghibli',
                                description: 'Produtos inspirados nos filmes do Studio Ghibli',
                                active: 1
                            },
                            {
                                name: 'BLACKPINK',
                                slug: 'blackpink',
                                description: 'Produtos oficiais e inspirados no grupo K-pop BLACKPINK',
                                active: 1
                            },
                            {
                                name: 'Stray Kids',
                                slug: 'skz',
                                description: 'Produtos oficiais e inspirados no grupo K-pop Stray Kids (SKZ)',
                                active: 1
                            }
                        ];
                        
                        // Insert categories sequentially
                        let categoriesInserted = 0;
                        categories.forEach((category, index) => {
                            db.run(`
                                INSERT INTO categories (name, slug, description, active)
                                VALUES (?, ?, ?, ?)
                            `, [category.name, category.slug, category.description, category.active], function(err) {
                                if (err) {
                                    console.error(`Erro ao criar categoria ${category.name}:`, err);
                                    return reject(err);
                                }
                                console.log(`🏷️  Categoria criada: ${category.name} (ID: ${this.lastID})`);
                                categoriesInserted++;
                                
                                // When all categories are inserted, create products
                                if (categoriesInserted === categories.length) {
                                    createProducts(db, resolve, reject);
                                }
                            });
                        });
                    });
                } catch (error) {
                    console.error('Erro ao processar dados:', error);
                    reject(error);
                }
            });
            
        } catch (error) {
            console.error('❌ Erro ao resetar banco de dados:', error);
            reject(error);
        }
    });
}

function createProducts(db, resolve, reject) {
    // Get TWICE category ID
    db.get('SELECT id FROM categories WHERE slug = ?', ['twice'], (err, twiceCategory) => {
        if (err) {
            console.error('Erro ao buscar categoria TWICE:', err);
            return reject(err);
        }
        
        const products = [
            {
                name: 'Camiseta TWICE "What Is Love?" Official',
                slug: 'camiseta-twice-what-is-love',
                description: 'Camiseta oficial do TWICE com design exclusivo da era "What Is Love?". Feita em 100% algodão premium, super confortável e com estampa de alta qualidade que não desbota. Perfeita para Once apaixonadas! 💖',
                price: 89.90,
                compare_price: 119.90,
                sku: 'TWICE-001',
                stock: 15,
                active: 1,
                featured: 1,
                meta_title: 'Camiseta TWICE What Is Love Official - PersonaLISA',
                meta_description: 'Camiseta oficial do TWICE era What Is Love. Algodão premium, alta qualidade. Para Once apaixonadas! Frete grátis.'
            },
            {
                name: 'Camiseta TWICE "Formula of Love" Comeback',
                slug: 'camiseta-twice-formula-of-love',
                description: 'Camiseta exclusiva da era "Formula of Love: O+T=<3" do TWICE! Design moderno com as cores icônicas do comeback. Material macio e durável, tamanhos P ao GG. Uma peça única para completar seu guarda-roupa Once! ✨',
                price: 79.90,
                compare_price: null,
                sku: 'TWICE-002',
                stock: 20,
                active: 1,
                featured: 0,
                meta_title: 'Camiseta TWICE Formula of Love - PersonaLISA',
                meta_description: 'Camiseta TWICE Formula of Love. Design exclusivo, material premium. P ao GG. Para Once verdadeiras!'
            }
        ];
        
        let productsInserted = 0;
        products.forEach((product, index) => {
            db.run(`
                INSERT INTO products (name, slug, description, price, compare_price, sku, stock, active, featured, meta_title, meta_description)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                product.name,
                product.slug,
                product.description,
                product.price,
                product.compare_price,
                product.sku,
                product.stock,
                product.active,
                product.featured,
                product.meta_title,
                product.meta_description
            ], function(err) {
                if (err) {
                    console.error(`Erro ao criar produto ${product.name}:`, err);
                    return reject(err);
                }
                
                const productId = this.lastID;
                console.log(`👕 Produto criado: ${product.name} (ID: ${productId})`);
                
                // Associate with TWICE category
                db.run(`
                    INSERT INTO product_categories (product_id, category_id)
                    VALUES (?, ?)
                `, [productId, twiceCategory.id], (err) => {
                    if (err) {
                        console.error(`Erro ao associar produto ${product.name} com categoria:`, err);
                        return reject(err);
                    }
                    
                    productsInserted++;
                    
                    // When all products are inserted, finish
                    if (productsInserted === products.length) {
                        console.log('\n🎉 Banco de dados resetado com sucesso!');
                        console.log('📋 Resumo:');
                        console.log('   • 5 categorias criadas (TWICE, Pokémon, Ghibli, BLACKPINK, SKZ)');
                        console.log('   • 2 camisetas do TWICE adicionadas');
                        console.log('   • 1 usuário admin criado');
                        console.log('\n💡 Use: admin@personalisa.com / admin123 para fazer login');
                        
                        db.close((err) => {
                            if (err) {
                                console.error('Erro ao fechar banco:', err);
                                return reject(err);
                            }
                            resolve();
                        });
                    }
                });
            });
        });
    });
}

resetDatabase()
    .then(() => {
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Erro fatal:', error);
        process.exit(1);
    });