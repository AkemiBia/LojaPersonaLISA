const express = require('express');
const router = express.Router();
const getDatabase = require('../database/database');

// Visualizar carrinho
router.get('/', async (req, res) => {
  try {
    const cart = req.session.cart || [];
    const db = getDatabase();
    
    // Enriquecer dados do carrinho com informações do produto
    const enrichedCart = [];
    let subtotal = 0;

    for (const item of cart) {
      const product = await db.get('SELECT * FROM products WHERE id = ?', [item.productId]);
      if (product) {
        let variant = null;
        if (item.variantId) {
          variant = await db.get('SELECT * FROM product_variants WHERE id = ?', [item.variantId]);
        }

        // Buscar imagem do produto
        const image = { filename: product.image || '/images/products/placeholder.jpg' };

        const itemPrice = variant ? (product.price + (variant.price_adjustment || 0)) : product.price;
        const itemTotal = itemPrice * item.quantity;
        subtotal += itemTotal;

        enrichedCart.push({
          ...item,
          product,
          variant,
          price: itemPrice,
          total: itemTotal,
          image: image ? image.filename : null
        });
      }
    }

    // Simular opções de frete
    const shippingOptions = [
      { name: 'PAC', price: 15.90, days: '8-12 dias úteis' },
      { name: 'SEDEX', price: 25.90, days: '3-5 dias úteis' },
      { name: 'Retirada', price: 0, days: 'Agendamento necessário' }
    ];

    const selectedShipping = req.session.selectedShipping || shippingOptions[0];
    const total = subtotal + selectedShipping.price;

    res.render('cart/index', {
      title: 'Carrinho - PersonaLISA',
      cart: enrichedCart,
      subtotal: subtotal.toFixed(2),
      shippingOptions,
      selectedShipping,
      total: total.toFixed(2),
      isEmpty: enrichedCart.length === 0,
      meta_description: 'Carrinho de compras da PersonaLISA'
    });

  } catch (error) {
    console.error('Erro ao visualizar carrinho:', error);
    res.status(500).render('error', { 
      title: 'Erro - PersonaLISA',
      error: 'Erro interno do servidor' 
    });
  }
});

// Adicionar item ao carrinho
router.post('/adicionar', async (req, res) => {
  try {
    const { productId, variantId, quantity = 1 } = req.body;
    const db = getDatabase();

    // Verificar se produto existe e está ativo
    const product = await db.get('SELECT * FROM products WHERE id = ? AND active = 1', [productId]);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Produto não encontrado' });
    }

    // Verificar variação se especificada
    let variant = null;
    if (variantId) {
      variant = await db.get('SELECT * FROM product_variants WHERE id = ? AND product_id = ? AND active = 1', [variantId, productId]);
      if (!variant) {
        return res.status(404).json({ success: false, message: 'Variação não encontrada' });
      }
    }

    // Verificar estoque
    const availableStock = variant ? variant.stock : product.stock;
    if (availableStock < quantity) {
      return res.status(400).json({ 
        success: false, 
        message: `Estoque insuficiente. Disponível: ${availableStock}` 
      });
    }

    // Inicializar carrinho se não existir
    if (!req.session.cart) {
      req.session.cart = [];
    }

    // Verificar se item já existe no carrinho
    const existingItemIndex = req.session.cart.findIndex(item => 
      item.productId == productId && item.variantId == (variantId || null)
    );

    if (existingItemIndex > -1) {
      // Atualizar quantidade do item existente
      const newQuantity = req.session.cart[existingItemIndex].quantity + parseInt(quantity);
      
      if (newQuantity > availableStock) {
        return res.status(400).json({ 
          success: false, 
          message: `Estoque insuficiente. Disponível: ${availableStock}` 
        });
      }

      req.session.cart[existingItemIndex].quantity = newQuantity;
    } else {
      // Adicionar novo item
      req.session.cart.push({
        productId: parseInt(productId),
        variantId: variantId ? parseInt(variantId) : null,
        quantity: parseInt(quantity),
        addedAt: new Date()
      });
    }

    // Calcular total de itens no carrinho
    const cartCount = req.session.cart.reduce((sum, item) => sum + item.quantity, 0);

    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
      res.json({ 
        success: true, 
        message: 'Produto adicionado ao carrinho!',
        cartCount 
      });
    } else {
      req.flash('success', 'Produto adicionado ao carrinho!');
      res.redirect('/carrinho');
    }

  } catch (error) {
    console.error('Erro ao adicionar ao carrinho:', error);
    
    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
      res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    } else {
      req.flash('error', 'Erro ao adicionar produto ao carrinho');
      res.redirect('back');
    }
  }
});

// Atualizar quantidade no carrinho
router.post('/atualizar', (req, res) => {
  try {
    const { productId, variantId, quantity } = req.body;
    const newQuantity = parseInt(quantity);

    if (!req.session.cart) {
      return res.status(400).json({ success: false, message: 'Carrinho vazio' });
    }

    const itemIndex = req.session.cart.findIndex(item => 
      item.productId == productId && item.variantId == (variantId || null)
    );

    if (itemIndex === -1) {
      return res.status(404).json({ success: false, message: 'Item não encontrado no carrinho' });
    }

    if (newQuantity <= 0) {
      // Remover item se quantidade for 0 ou negativa
      req.session.cart.splice(itemIndex, 1);
    } else {
      // Atualizar quantidade
      req.session.cart[itemIndex].quantity = newQuantity;
    }

    const cartCount = req.session.cart.reduce((sum, item) => sum + item.quantity, 0);

    res.json({ 
      success: true, 
      message: 'Carrinho atualizado!',
      cartCount 
    });

  } catch (error) {
    console.error('Erro ao atualizar carrinho:', error);
    res.status(500).json({ success: false, message: 'Erro interno do servidor' });
  }
});

// Remover item do carrinho
router.post('/remover', (req, res) => {
  try {
    const { productId, variantId } = req.body;

    if (!req.session.cart) {
      return res.status(400).json({ success: false, message: 'Carrinho vazio' });
    }

    const itemIndex = req.session.cart.findIndex(item => 
      item.productId == productId && item.variantId == (variantId || null)
    );

    if (itemIndex === -1) {
      return res.status(404).json({ success: false, message: 'Item não encontrado no carrinho' });
    }

    req.session.cart.splice(itemIndex, 1);

    const cartCount = req.session.cart.reduce((sum, item) => sum + item.quantity, 0);

    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
      res.json({ 
        success: true, 
        message: 'Item removido do carrinho!',
        cartCount 
      });
    } else {
      req.flash('success', 'Item removido do carrinho!');
      res.redirect('/carrinho');
    }

  } catch (error) {
    console.error('Erro ao remover do carrinho:', error);
    
    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
      res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    } else {
      req.flash('error', 'Erro ao remover item do carrinho');
      res.redirect('/carrinho');
    }
  }
});

// Limpar carrinho
router.post('/limpar', (req, res) => {
  try {
    req.session.cart = [];

    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
      res.json({ 
        success: true, 
        message: 'Carrinho limpo!',
        cartCount: 0 
      });
    } else {
      req.flash('success', 'Carrinho limpo!');
      res.redirect('/carrinho');
    }

  } catch (error) {
    console.error('Erro ao limpar carrinho:', error);
    
    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
      res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    } else {
      req.flash('error', 'Erro ao limpar carrinho');
      res.redirect('/carrinho');
    }
  }
});

// Calcular frete (simulado)
router.post('/frete', (req, res) => {
  try {
    const { cep } = req.body;
    
    // Simular cálculo de frete baseado no CEP
    const cleanCep = cep.replace(/\D/g, '');
    
    if (cleanCep.length !== 8) {
      return res.status(400).json({ 
        success: false, 
        message: 'CEP inválido. Digite um CEP válido com 8 dígitos.' 
      });
    }

    // Simular diferentes preços baseado na região (primeiro dígito do CEP)
    const region = parseInt(cleanCep[0]);
    let shippingOptions = [];

    switch (region) {
      case 0: // RS
      case 1: // SP, região metropolitana
      case 2: // RJ, ES
        shippingOptions = [
          { name: 'PAC', price: 12.90, days: '5-8 dias úteis' },
          { name: 'SEDEX', price: 22.90, days: '2-4 dias úteis' }
        ];
        break;
      case 3: // MG, GO, TO, MT, MS, DF
      case 4: // BA, SE, AL, PE, PB, RN, CE, PI, MA
        shippingOptions = [
          { name: 'PAC', price: 18.90, days: '7-12 dias úteis' },
          { name: 'SEDEX', price: 28.90, days: '4-6 dias úteis' }
        ];
        break;
      case 5: // PR, SC, RS interior
        shippingOptions = [
          { name: 'PAC', price: 15.90, days: '6-10 dias úteis' },
          { name: 'SEDEX', price: 25.90, days: '3-5 dias úteis' }
        ];
        break;
      default: // Norte/Nordeste
        shippingOptions = [
          { name: 'PAC', price: 22.90, days: '10-15 dias úteis' },
          { name: 'SEDEX', price: 35.90, days: '5-8 dias úteis' }
        ];
    }

    // Sempre incluir opção de retirada
    shippingOptions.push({ name: 'Retirada', price: 0, days: 'Agendamento necessário' });

    res.json({ 
      success: true, 
      cep: cleanCep,
      options: shippingOptions 
    });

  } catch (error) {
    console.error('Erro ao calcular frete:', error);
    res.status(500).json({ success: false, message: 'Erro interno do servidor' });
  }
});

// Selecionar opção de frete
router.post('/frete/selecionar', (req, res) => {
  try {
    const { name, price, days } = req.body;

    req.session.selectedShipping = {
      name,
      price: parseFloat(price),
      days
    };

    res.json({ success: true, message: 'Opção de frete selecionada!' });

  } catch (error) {
    console.error('Erro ao selecionar frete:', error);
    res.status(500).json({ success: false, message: 'Erro interno do servidor' });
  }
});

module.exports = router;
