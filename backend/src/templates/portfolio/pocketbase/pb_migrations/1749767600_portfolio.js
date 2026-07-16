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

    const categories = new Collection({
      id: 'categories',
      name: 'categories',
      type: 'base',
      system: false,
      schema: [
        {
      "system": false,
      "id": "categories_name",
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
      "id": "categories_slug",
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
      ],
      indexes: ["CREATE UNIQUE INDEX `idx_categories_slug` ON `categories` (`slug`)"],
      listRule: "",
      viewRule: "",
      createRule: "@request.auth.role = \"admin\"",
      updateRule: "@request.auth.role = \"admin\"",
      deleteRule: "@request.auth.role = \"admin\"",
      options: {},
    });
    dao.saveCollection(categories);

    const projects = new Collection({
      id: 'projects',
      name: 'projects',
      type: 'base',
      system: false,
      schema: [
        {
      "system": false,
      "id": "projects_name",
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
      "id": "projects_slug",
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
      "id": "projects_client",
      "name": "client",
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
      "id": "projects_link",
      "name": "link",
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
      "id": "projects_description",
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
      "id": "projects_image",
      "name": "image",
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
      "id": "projects_status",
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
        {
      "system": false,
      "id": "projects_category",
      "name": "category",
      "type": "relation",
      "required": false,
      "presentable": false,
      "unique": false,
      "options": {
            "collectionId": "categories",
            "cascadeDelete": false,
            "minSelect": null,
            "maxSelect": 1,
            "displayFields": [
                  "name"
            ]
      }
},
      ],
      indexes: ["CREATE UNIQUE INDEX `idx_projects_slug` ON `projects` (`slug`)"],
      listRule: "status = \"active\"",
      viewRule: "status = \"active\"",
      createRule: "@request.auth.role = \"admin\"",
      updateRule: "@request.auth.role = \"admin\"",
      deleteRule: "@request.auth.role = \"admin\"",
      options: {},
    });
    dao.saveCollection(projects);

    const contacts = new Collection({
      id: 'contacts',
      name: 'contacts',
      type: 'base',
      system: false,
      schema: [
        {
      "system": false,
      "id": "contacts_user",
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
      "id": "contacts_name",
      "name": "name",
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
      "id": "contacts_email",
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
      "id": "contacts_message",
      "name": "message",
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
      "id": "contacts_status",
      "name": "status",
      "type": "select",
      "required": true,
      "presentable": false,
      "unique": false,
      "options": {
            "maxSelect": 1,
            "values": [
                  "new",
                  "replied",
                  "closed"
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
    dao.saveCollection(contacts);

  },
  (db) => {
    const dao = new Dao(db);
    try {
      const users = dao.findCollectionByNameOrId('users');
      users.schema = users.schema.filter((f) => !['name', 'role', 'phone', 'address'].includes(f.name));
      dao.saveCollection(users);
    } catch (_) { /* ignore */ }

    const collections = ["contacts", "projects", "categories"];
    for (const name of collections) {
      try {
        const collection = dao.findCollectionByNameOrId(name);
        dao.deleteCollection(collection);
      } catch (_) { /* ignore */ }
    }
  },
);