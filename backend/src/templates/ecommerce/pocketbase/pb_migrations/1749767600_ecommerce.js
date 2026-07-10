migrate(
  (db) => {
    const dao = new Dao(db);

    // ------------------------------------------------------------------
    // 1. Extend the built-in users collection
    // ------------------------------------------------------------------
    const users = dao.findCollectionByNameOrId('users');
    users.options.set('minPasswordLength', 4);
    users.schema.addField(new SchemaField({
      id: 'users_role',
      name: 'role',
      type: 'select',
      required: false,
      presentable: false,
      unique: false,
      options: { maxSelect: 1, values: ['customer', 'admin'] },
    }));
    users.schema.addField(new SchemaField({
      id: 'users_phone',
      name: 'phone',
      type: 'text',
      required: false,
      presentable: false,
      unique: false,
      options: { min: null, max: null, pattern: '' },
    }));
    users.schema.addField(new SchemaField({
      id: 'users_address',
      name: 'address',
      type: 'text',
      required: false,
      presentable: false,
      unique: false,
      options: { min: null, max: null, pattern: '' },
    }));
    dao.saveCollection(users);

    // ------------------------------------------------------------------
    // 2. Categories
    // ------------------------------------------------------------------
    const categories = new Collection({
      id: 'categories',
      name: 'categories',
      type: 'base',
      system: false,
      schema: [
        {
          system: false,
          id: 'cat_name',
          name: 'name',
          type: 'text',
          required: true,
          presentable: true,
          unique: false,
          options: { min: null, max: null, pattern: '' },
        },
        {
          system: false,
          id: 'cat_slug',
          name: 'slug',
          type: 'text',
          required: true,
          presentable: true,
          unique: true,
          options: { min: null, max: null, pattern: '^[a-z0-9-]+$' },
        },
        {
          system: false,
          id: 'cat_image',
          name: 'image',
          type: 'file',
          required: false,
          presentable: false,
          unique: false,
          options: { maxSelect: 1, maxSize: 5242880, mimeTypes: ['image/jpeg', 'image/png', 'image/webp'], thumbs: [] },
        },
      ],
      indexes: ['CREATE UNIQUE INDEX `idx_categories_slug` ON `categories` (`slug`)'],
      listRule: '',
      viewRule: '',
      createRule: '@request.auth.role = "admin"',
      updateRule: '@request.auth.role = "admin"',
      deleteRule: '@request.auth.role = "admin"',
      options: {},
    });
    dao.saveCollection(categories);

    const categoriesId = categories.id;

    // ------------------------------------------------------------------
    // 3. Products
    // ------------------------------------------------------------------
    const products = new Collection({
      id: 'products',
      name: 'products',
      type: 'base',
      system: false,
      schema: [
        {
          system: false,
          id: 'prod_name',
          name: 'name',
          type: 'text',
          required: true,
          presentable: true,
          unique: false,
          options: { min: null, max: null, pattern: '' },
        },
        {
          system: false,
          id: 'prod_slug',
          name: 'slug',
          type: 'text',
          required: true,
          presentable: true,
          unique: true,
          options: { min: null, max: null, pattern: '^[a-z0-9-]+$' },
        },
        {
          system: false,
          id: 'prod_price',
          name: 'price',
          type: 'number',
          required: true,
          presentable: true,
          unique: false,
          options: { min: 0, max: null, noDecimal: false },
        },
        {
          system: false,
          id: 'prod_stock',
          name: 'stock',
          type: 'number',
          required: true,
          presentable: false,
          unique: false,
          options: { min: 0, max: null, noDecimal: true },
        },
        {
          system: false,
          id: 'prod_description',
          name: 'description',
          type: 'text',
          required: false,
          presentable: false,
          unique: false,
          options: { min: null, max: null, pattern: '' },
        },
        {
          system: false,
          id: 'prod_images',
          name: 'images',
          type: 'file',
          required: false,
          presentable: false,
          unique: false,
          options: { maxSelect: 10, maxSize: 5242880, mimeTypes: ['image/jpeg', 'image/png', 'image/webp'], thumbs: [] },
        },
        {
          system: false,
          id: 'prod_category',
          name: 'category',
          type: 'relation',
          required: false,
          presentable: false,
          unique: false,
          options: { collectionId: categoriesId, cascadeDelete: false, minSelect: null, maxSelect: 1, displayFields: ['name'] },
        },
        {
          system: false,
          id: 'prod_status',
          name: 'status',
          type: 'select',
          required: true,
          presentable: false,
          unique: false,
          options: { maxSelect: 1, values: ['active', 'draft', 'archived'] },
        },
      ],
      indexes: ['CREATE UNIQUE INDEX `idx_products_slug` ON `products` (`slug`)'],
      listRule: 'status = "active"',
      viewRule: 'status = "active"',
      createRule: '@request.auth.role = "admin"',
      updateRule: '@request.auth.role = "admin"',
      deleteRule: '@request.auth.role = "admin"',
      options: {},
    });
    dao.saveCollection(products);

    const productsId = products.id;

    // ------------------------------------------------------------------
    // 4. Orders
    // ------------------------------------------------------------------
    const orders = new Collection({
      id: 'orders',
      name: 'orders',
      type: 'base',
      system: false,
      schema: [
        {
          system: false,
          id: 'ord_user',
          name: 'user',
          type: 'relation',
          required: true,
          presentable: false,
          unique: false,
          options: { collectionId: users.id, cascadeDelete: false, minSelect: null, maxSelect: 1, displayFields: ['email'] },
        },
        {
          system: false,
          id: 'ord_status',
          name: 'status',
          type: 'select',
          required: true,
          presentable: true,
          unique: false,
          options: { maxSelect: 1, values: ['pending', 'paid', 'shipped', 'cancelled'] },
        },
        {
          system: false,
          id: 'ord_total',
          name: 'total',
          type: 'number',
          required: true,
          presentable: true,
          unique: false,
          options: { min: 0, max: null, noDecimal: false },
        },
        {
          system: false,
          id: 'ord_stripe_payment_intent_id',
          name: 'stripe_payment_intent_id',
          type: 'text',
          required: false,
          presentable: false,
          unique: false,
          options: { min: null, max: null, pattern: '' },
        },
        {
          system: false,
          id: 'ord_items',
          name: 'items',
          type: 'json',
          required: true,
          presentable: false,
          unique: false,
          options: {},
        },
      ],
      indexes: [],
      listRule: 'user = @request.auth.id',
      viewRule: 'user = @request.auth.id',
      createRule: '@request.auth.id != ""',
      updateRule: '@request.auth.role = "admin"',
      deleteRule: '@request.auth.role = "admin"',
      options: {},
    });
    dao.saveCollection(orders);

    const ordersId = orders.id;

    // ------------------------------------------------------------------
    // 5. Order Items
    // ------------------------------------------------------------------
    const orderItems = new Collection({
      id: 'order_items',
      name: 'order_items',
      type: 'base',
      system: false,
      schema: [
        {
          system: false,
          id: 'oi_order',
          name: 'order',
          type: 'relation',
          required: true,
          presentable: false,
          unique: false,
          options: { collectionId: ordersId, cascadeDelete: true, minSelect: null, maxSelect: 1, displayFields: [] },
        },
        {
          system: false,
          id: 'oi_product',
          name: 'product',
          type: 'relation',
          required: true,
          presentable: false,
          unique: false,
          options: { collectionId: productsId, cascadeDelete: false, minSelect: null, maxSelect: 1, displayFields: ['name'] },
        },
        {
          system: false,
          id: 'oi_qty',
          name: 'qty',
          type: 'number',
          required: true,
          presentable: false,
          unique: false,
          options: { min: 1, max: null, noDecimal: true },
        },
        {
          system: false,
          id: 'oi_price',
          name: 'price',
          type: 'number',
          required: true,
          presentable: false,
          unique: false,
          options: { min: 0, max: null, noDecimal: false },
        },
      ],
      indexes: [],
      listRule: 'order.user = @request.auth.id',
      viewRule: 'order.user = @request.auth.id',
      createRule: '@request.auth.id != ""',
      updateRule: '@request.auth.role = "admin"',
      deleteRule: '@request.auth.role = "admin"',
      options: {},
    });
    dao.saveCollection(orderItems);

    // ------------------------------------------------------------------
    // 6. Reviews
    // ------------------------------------------------------------------
    const reviews = new Collection({
      id: 'reviews',
      name: 'reviews',
      type: 'base',
      system: false,
      schema: [
        {
          system: false,
          id: 'rev_product',
          name: 'product',
          type: 'relation',
          required: true,
          presentable: false,
          unique: false,
          options: { collectionId: productsId, cascadeDelete: false, minSelect: null, maxSelect: 1, displayFields: ['name'] },
        },
        {
          system: false,
          id: 'rev_user',
          name: 'user',
          type: 'relation',
          required: true,
          presentable: false,
          unique: false,
          options: { collectionId: users.id, cascadeDelete: false, minSelect: null, maxSelect: 1, displayFields: ['email'] },
        },
        {
          system: false,
          id: 'rev_rating',
          name: 'rating',
          type: 'number',
          required: true,
          presentable: false,
          unique: false,
          options: { min: 1, max: 5, noDecimal: true },
        },
        {
          system: false,
          id: 'rev_comment',
          name: 'comment',
          type: 'text',
          required: false,
          presentable: false,
          unique: false,
          options: { min: null, max: null, pattern: '' },
        },
      ],
      indexes: [],
      listRule: '',
      viewRule: '',
      createRule: '@request.auth.id != ""',
      updateRule: 'user = @request.auth.id',
      deleteRule: 'user = @request.auth.id || @request.auth.role = "admin"',
      options: {},
    });
    dao.saveCollection(reviews);
  },
  (db) => {
    const dao = new Dao(db);

    // Rollback: remove custom fields from users
    try {
      const users = dao.findCollectionByNameOrId('users');
      users.schema = users.schema.filter((f) => !['name', 'role', 'phone', 'address'].includes(f.name));
      dao.saveCollection(users);
    } catch (_) {
      /* ignore */
    }

    // Rollback: delete collections
    const collections = ['reviews', 'order_items', 'orders', 'products', 'categories'];
    for (const name of collections) {
      try {
        const collection = dao.findCollectionByNameOrId(name);
        dao.deleteCollection(collection);
      } catch (_) {
        /* ignore */
      }
    }
  },
);
