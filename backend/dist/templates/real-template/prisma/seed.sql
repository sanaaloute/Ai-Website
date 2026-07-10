-- Seed script for DaaCoo database
-- Run: sqlite3 dev.db < prisma/seed.sql

-- Users (passwords are bcrypt hashed: Admin123! and User123!)
INSERT OR IGNORE INTO User (id, email, password, name, role, address, phone, createdAt, updatedAt)
VALUES 
  ('admin-001', 'admin@daacoo.com', '$2b$12$yFHYlceFcBn7GJLtLMW2oOkEAWdKeo.gGpdCpid5dfLd29h8fQ0sO', 'Admin User', 'admin', NULL, NULL, datetime('now'), datetime('now')),
  ('user-001', 'user@example.com', '$2b$12$Qga6ymRZNI6CqxlB5a0FsOP3l.8s4PRtLIy.29mddB5KDnAndbhzK', 'Demo User', 'user', '123 Demo Street, Demo City, 10000', '+86 138 0000 0000', datetime('now'), datetime('now'));

-- Products
INSERT OR IGNORE INTO Product (id, name, description, price, stock, imageUrl, specs, version, isAvailable, orderCount, createdAt, updatedAt)
VALUES 
  ('daacoo-basic-001', 'DaaCoo Basic', 'The essential AI conversation companion. DaaCoo Basic offers natural voice interaction with 95% recognition accuracy, perfect for individuals seeking an intelligent daily assistant.', 199, 20, '/images/product-basic.png', '{"Voice Recognition": "95% accuracy", "Response Speed": "< 1.2s", "Memory": "4GB RAM", "Battery": "8 hours", "Languages": "Chinese, English", "Connectivity": "Wi-Fi 5, Bluetooth 5.0"}', 'Basic', 1, 12, datetime('now'), datetime('now')),
  ('daacoo-pro-001', 'DaaCoo Pro', 'Elevate your AI conversations. DaaCoo Pro features 98% voice recognition accuracy, sub-second response times, and advanced memory for power users who demand the best.', 349, 15, '/images/product-pro.png', '{"Voice Recognition": "98% accuracy", "Response Speed": "< 0.8s", "Memory": "8GB RAM", "Battery": "12 hours", "Languages": "Chinese, English, Japanese, Korean", "Connectivity": "Wi-Fi 6, Bluetooth 5.2"}', 'Pro', 1, 8, datetime('now'), datetime('now')),
  ('daacoo-family-001', 'DaaCoo Family', 'AI for the whole family. DaaCoo Family supports multi-user profiles, parental controls, and premium audio quality. The perfect centerpiece for a smart home.', 499, 8, '/images/product-family.png', '{"Voice Recognition": "99% accuracy", "Response Speed": "< 0.5s", "Memory": "16GB RAM", "Battery": "16 hours", "Languages": "Chinese, English, Japanese, Korean, Spanish, French", "Connectivity": "Wi-Fi 6E, Bluetooth 5.3", "Multi-user Profiles": "Up to 6 users"}', 'Family', 1, 5, datetime('now'), datetime('now'));

-- Orders
INSERT INTO "Order" (id, userId, guestEmail, guestName, guestPhone, shippingAddress, totalAmount, status, paymentMethod, createdAt, updatedAt)
VALUES 
  ('order-001', 'user-001', 'user@example.com', 'Demo User', '+86 138 0000 0000', '123 Demo Street, Demo City, 10000', 199, 'Delivered', 'stripe', datetime('now'), datetime('now')),
  ('order-002', 'user-001', 'user@example.com', 'Demo User', '+86 138 0000 0000', '123 Demo Street, Demo City, 10000', 848, 'Shipped', 'alipay', datetime('now'), datetime('now')),
  ('order-003', NULL, 'guest@example.com', 'Guest User', '+86 139 0000 0000', '456 Guest Ave, Guest City, 20000', 499, 'Paid', 'wechatpay', datetime('now'), datetime('now'));

-- Order Items
INSERT INTO OrderItem (id, orderId, productId, name, price, quantity, imageUrl)
VALUES 
  ('oi-001', 'order-001', 'daacoo-basic-001', 'DaaCoo Basic', 199, 1, '/images/product-basic.png'),
  ('oi-002', 'order-002', 'daacoo-pro-001', 'DaaCoo Pro', 349, 1, '/images/product-pro.png'),
  ('oi-003', 'order-002', 'daacoo-basic-001', 'DaaCoo Basic', 199, 1, '/images/product-basic.png'),
  ('oi-004', 'order-003', 'daacoo-family-001', 'DaaCoo Family', 499, 1, '/images/product-family.png');

-- Payments
INSERT INTO Payment (id, orderId, amount, method, transactionId, status, createdAt, updatedAt)
VALUES 
  ('pay-001', 'order-001', 199, 'stripe', 'pi_demo_001', 'success', datetime('now'), datetime('now')),
  ('pay-002', 'order-002', 848, 'alipay', 'alipay_demo_002', 'success', datetime('now'), datetime('now')),
  ('pay-003', 'order-003', 499, 'wechatpay', 'wx_demo_003', 'success', datetime('now'), datetime('now'));
