const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, 'saturn_atelie.db');

class Database {
  constructor() {
    this.db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        console.error('❌ Erro ao conectar com o banco de dados:', err.message);
      } else {
        console.log('✅ Conectado ao banco de dados SQLite');
        this.init();
      }
    });
  }

  init() {
    // Habilitar foreign keys
    this.db.run('PRAGMA foreign_keys = ON');
    
    // Criar tabelas
    this.createTables();
  }

  createTables() {
    // Tabela de usuários
    this.db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        phone TEXT,
        is_admin BOOLEAN DEFAULT FALSE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabela de categorias
    this.db.run(`
      CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        parent_id INTEGER,
        description TEXT,
        image TEXT,
        active BOOLEAN DEFAULT TRUE,
        sort_order INTEGER DEFAULT 0,
        FOREIGN KEY (parent_id) REFERENCES categories (id)
      )
    `);

    // Tabela de produtos
    this.db.run(`
      CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        description TEXT,
        price DECIMAL(10,2) NOT NULL,
        compare_price DECIMAL(10,2),
        cost DECIMAL(10,2),
        sku TEXT,
        stock INTEGER DEFAULT 0,
        track_inventory BOOLEAN DEFAULT TRUE,
        allow_backorder BOOLEAN DEFAULT FALSE,
        weight DECIMAL(8,3),
        active BOOLEAN DEFAULT TRUE,
        featured BOOLEAN DEFAULT FALSE,
        meta_title TEXT,
        meta_description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabela de relacionamento produto-categoria
    this.db.run(`
      CREATE TABLE IF NOT EXISTS product_categories (
        product_id INTEGER,
        category_id INTEGER,
        PRIMARY KEY (product_id, category_id),
        FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE,
        FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE CASCADE
      )
    `);

    // Tabela de variações de produto
    this.db.run(`
      CREATE TABLE IF NOT EXISTS product_variants (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        value TEXT NOT NULL,
        price_adjustment DECIMAL(10,2) DEFAULT 0,
        stock INTEGER DEFAULT 0,
        sku TEXT,
        active BOOLEAN DEFAULT TRUE,
        FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE
      )
    `);

    // Tabela de imagens de produtos
    this.db.run(`
      CREATE TABLE IF NOT EXISTS product_images (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER NOT NULL,
        filename TEXT NOT NULL,
        alt_text TEXT,
        sort_order INTEGER DEFAULT 0,
        is_primary BOOLEAN DEFAULT FALSE,
        FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE
      )
    `);

    // Tabela de pedidos
    this.db.run(`
      CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        order_number TEXT UNIQUE NOT NULL,
        status TEXT DEFAULT 'pending',
        subtotal DECIMAL(10,2) NOT NULL,
        shipping_cost DECIMAL(10,2) DEFAULT 0,
        total DECIMAL(10,2) NOT NULL,
        payment_method TEXT,
        payment_status TEXT DEFAULT 'pending',
        shipping_address TEXT,
        billing_address TEXT,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )
    `);

    // Tabela de itens do pedido
    this.db.run(`
      CREATE TABLE IF NOT EXISTS order_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        variant_id INTEGER,
        quantity INTEGER NOT NULL,
        price DECIMAL(10,2) NOT NULL,
        product_name TEXT NOT NULL,
        variant_name TEXT,
        FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products (id),
        FOREIGN KEY (variant_id) REFERENCES product_variants (id)
      )
    `);

    console.log('✅ Tabelas do banco de dados criadas/verificadas');
  }

  // Métodos auxiliares
  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) reject(err);
        else resolve({ id: this.lastID, changes: this.changes });
      });
    });
  }

  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  all(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  close() {
    return new Promise((resolve, reject) => {
      this.db.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
}

// Singleton
let dbInstance = null;

function getDatabase() {
  if (!dbInstance) {
    dbInstance = new Database();
  }
  return dbInstance;
}

module.exports = getDatabase;
