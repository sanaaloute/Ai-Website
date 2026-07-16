migrate(
  (db) => {
    const dao = new Dao(db);

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

    const plans = new Collection({
      id: 'plans',
      name: 'plans',
      type: 'base',
      system: false,
      schema: [
        {
      "system": false,
      "id": "plans_name",
      "name": "name",
      "type": "text",
      "required": true,
      "presentable": true,
      "unique": false,
      "options": {
            "min": null,
            "max": null,
            "pattern": ""
      }
},
        {
      "system": false,
      "id": "plans_slug",
      "name": "slug",
      "type": "text",
      "required": true,
      "presentable": false,
      "unique": true,
      "options": {
            "min": null,
            "max": null,
            "pattern": ""
      }
},
        {
      "system": false,
      "id": "plans_price",
      "name": "price",
      "type": "number",
      "required": false,
      "presentable": false,
      "unique": false,
      "options": {
            "min": 0,
            "max": null,
            "noDecimal": false
      }
},
      ],
      indexes: ["CREATE UNIQUE INDEX `idx_plans_slug` ON `plans` (`slug`)"],
      listRule: "",
      viewRule: "",
      createRule: "@request.auth.role = \"admin\"",
      updateRule: "@request.auth.role = \"admin\"",
      deleteRule: "@request.auth.role = \"admin\"",
      options: {},
    });
    dao.saveCollection(plans);

    const features = new Collection({
      id: 'features',
      name: 'features',
      type: 'base',
      system: false,
      schema: [
        {
      "system": false,
      "id": "features_name",
      "name": "name",
      "type": "text",
      "required": true,
      "presentable": true,
      "unique": false,
      "options": {
            "min": null,
            "max": null,
            "pattern": ""
      }
},
        {
      "system": false,
      "id": "features_slug",
      "name": "slug",
      "type": "text",
      "required": true,
      "presentable": true,
      "unique": true,
      "options": {
            "min": null,
            "max": null,
            "pattern": ""
      }
},
        {
      "system": false,
      "id": "features_description",
      "name": "description",
      "type": "text",
      "required": false,
      "presentable": false,
      "unique": false,
      "options": {
            "min": null,
            "max": null,
            "pattern": ""
      }
},
        {
      "system": false,
      "id": "features_icon",
      "name": "icon",
      "type": "text",
      "required": false,
      "presentable": false,
      "unique": false,
      "options": {
            "min": null,
            "max": null,
            "pattern": ""
      }
},
        {
      "system": false,
      "id": "features_status",
      "name": "status",
      "type": "select",
      "required": true,
      "presentable": false,
      "unique": false,
      "options": {
            "maxSelect": 1,
            "values": [
                  "active",
                  "draft",
                  "archived"
            ]
      }
},
      ],
      indexes: ["CREATE UNIQUE INDEX `idx_features_slug` ON `features` (`slug`)"],
      listRule: "status = \"active\"",
      viewRule: "status = \"active\"",
      createRule: "@request.auth.role = \"admin\"",
      updateRule: "@request.auth.role = \"admin\"",
      deleteRule: "@request.auth.role = \"admin\"",
      options: {},
    });
    dao.saveCollection(features);

    const subscribers = new Collection({
      id: 'subscribers',
      name: 'subscribers',
      type: 'base',
      system: false,
      schema: [
        {
      "system": false,
      "id": "subscribers_user",
      "name": "user",
      "type": "relation",
      "required": false,
      "presentable": false,
      "unique": false,
      "options": {
            "collectionId": "users",
            "cascadeDelete": false,
            "minSelect": null,
            "maxSelect": 1,
            "displayFields": [
                  "email"
            ]
      }
},
        {
      "system": false,
      "id": "subscribers_email",
      "name": "email",
      "type": "text",
      "required": true,
      "presentable": false,
      "unique": false,
      "options": {
            "min": null,
            "max": null,
            "pattern": ""
      }
},
        {
      "system": false,
      "id": "subscribers_plan",
      "name": "plan",
      "type": "relation",
      "required": false,
      "presentable": false,
      "unique": false,
      "options": {
            "collectionId": "plans",
            "cascadeDelete": false,
            "minSelect": null,
            "maxSelect": 1,
            "displayFields": [
                  "name"
            ]
      }
},
        {
      "system": false,
      "id": "subscribers_status",
      "name": "status",
      "type": "select",
      "required": true,
      "presentable": false,
      "unique": false,
      "options": {
            "maxSelect": 1,
            "values": [
                  "active",
                  "cancelled",
                  "pending"
            ]
      }
},
      ],
      indexes: [],
      listRule: "user = @request.auth.id",
      viewRule: "user = @request.auth.id",
      createRule: "@request.auth.id != \"\"",
      updateRule: "@request.auth.role = \"admin\"",
      deleteRule: "@request.auth.role = \"admin\"",
      options: {},
    });
    dao.saveCollection(subscribers);

  },
  (db) => {
    const dao = new Dao(db);
    try {
      const users = dao.findCollectionByNameOrId('users');
      users.schema = users.schema.filter((f) => !['name', 'role', 'phone', 'address'].includes(f.name));
      dao.saveCollection(users);
    } catch (_) { /* ignore */ }

    const collections = ["subscribers", "features", "plans"];
    for (const name of collections) {
      try {
        const collection = dao.findCollectionByNameOrId(name);
        dao.deleteCollection(collection);
      } catch (_) { /* ignore */ }
    }
  },
);