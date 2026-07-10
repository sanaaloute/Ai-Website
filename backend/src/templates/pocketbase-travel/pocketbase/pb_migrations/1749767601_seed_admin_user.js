// Seed the default admin user so the generated admin dashboard can log in
// immediately with the same credentials as the PocketBase admin UI.
// Email: {{PB_ADMIN_EMAIL}}
// Password: {{PB_ADMIN_PASSWORD}}

migrate(
  (db) => {
    const dao = new Dao(db);
    const users = dao.findCollectionByNameOrId("users");
    const adminEmail = "{{PB_ADMIN_EMAIL}}";
    const adminUsername = "admin";

    let adminUser;
    try {
      adminUser = dao.findAuthRecordByEmail("users", adminEmail);
    } catch (_) {
      adminUser = new Record(users);
    }

    adminUser.setEmail(adminEmail);
    adminUser.setUsername(adminUsername);
    adminUser.setPassword("{{PB_ADMIN_PASSWORD}}");
    adminUser.setVerified(true);
    adminUser.setEmailVisibility(true);
    adminUser.set("role", "admin");

    return dao.saveRecord(adminUser);
  },
  (db) => {
    const dao = new Dao(db);
    try {
      const adminUser = dao.findAuthRecordByEmail("users", "{{PB_ADMIN_EMAIL}}");
      dao.deleteRecord(adminUser);
    } catch (_) {
      /* ignore */
    }
  },
);
