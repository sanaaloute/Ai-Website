// PocketBase JS hooks for the AI-Website e-commerce template.
// These hooks enforce business rules: stock management, default user role, etc.

// ------------------------------------------------------------------
// Default new users to the "customer" role
// ------------------------------------------------------------------
onModelBeforeCreate((e) => {
  const user = e.model;
  if (!user.get('role')) {
    user.set('role', 'customer');
  }
}, 'users');

// ------------------------------------------------------------------
// Prevent negative stock values
// ------------------------------------------------------------------
onModelBeforeUpdate((e) => {
  const product = e.model;
  const stock = product.getInt('stock');
  if (stock !== null && stock < 0) {
    throw new Error('Product stock cannot be negative');
  }
}, 'products');

// ------------------------------------------------------------------
// Decrement product stock when an order is created
// ------------------------------------------------------------------
onModelAfterCreate((e) => {
  const order = e.model;
  if (order.get('status') !== 'pending') return;

  const items = order.get('items') || [];
  if (!items.length) return;

  const dao = e.app.dao();

  for (const item of items) {
    if (!item.product) continue;

    try {
      const product = dao.findRecordById('products', item.product);
      const currentStock = product.getInt('stock') || 0;
      const qty = parseInt(item.qty, 10) || 1;
      const newStock = Math.max(0, currentStock - qty);

      product.set('stock', newStock);
      dao.saveRecord(product);
    } catch (err) {
      console.log('Failed to decrement stock for product', item.product, err);
    }
  }
}, 'orders');

// ------------------------------------------------------------------
// Optional: create normalized order_items records from the JSON items array
// ------------------------------------------------------------------
onModelAfterCreate((e) => {
  const order = e.model;
  const items = order.get('items') || [];
  if (!items.length) return;

  const dao = e.app.dao();

  for (const item of items) {
    if (!item.product) continue;

    try {
      const record = new Record(dao.findCollectionByNameOrId('order_items'), {
        order: order.id,
        product: item.product,
        qty: item.qty || 1,
        price: item.price || 0,
      });
      dao.saveRecord(record);
    } catch (err) {
      console.log('Failed to create order_item for product', item.product, err);
    }
  }
}, 'orders');
