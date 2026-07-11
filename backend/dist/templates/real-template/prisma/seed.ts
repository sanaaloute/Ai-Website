import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

async function main() {
  const adminPassword = await hashPassword("Admin123!");
  const admin = await prisma.user.upsert({
    where: { email: "admin@daacoo.com" },
    update: {},
    create: {
      email: "admin@daacoo.com",
      password: adminPassword,
      name: "Admin User",
      role: "admin",
    },
  });

  const userPassword = await hashPassword("User123!");
  const demoUser = await prisma.user.upsert({
    where: { email: "user@example.com" },
    update: {},
    create: {
      email: "user@example.com",
      password: userPassword,
      name: "Demo User",
      role: "user",
      address: "123 Demo Street, Demo City, 10000",
      phone: "+86 138 0000 0000",
    },
  });

  const basic = await prisma.product.upsert({
    where: { id: "daacoo-basic-001" },
    update: {},
    create: {
      id: "daacoo-basic-001",
      name: "DaaCoo Basic",
      description:
        "The essential AI conversation companion. DaaCoo Basic offers natural voice interaction with 95% recognition accuracy, perfect for individuals seeking an intelligent daily assistant.",
      price: 199,
      stock: 20,
      imageUrl: "/images/product-basic.png",
      version: "Basic",
      specs: JSON.stringify({
        "Voice Recognition": "95% accuracy",
        "Response Speed": "< 1.2s",
        "Memory": "4GB RAM",
        "Battery": "8 hours",
        "Languages": "Chinese, English",
        "Connectivity": "Wi-Fi 5, Bluetooth 5.0",
      }),
      isAvailable: true,
      orderCount: 12,
    },
  });

  const pro = await prisma.product.upsert({
    where: { id: "daacoo-pro-001" },
    update: {},
    create: {
      id: "daacoo-pro-001",
      name: "DaaCoo Pro",
      description:
        "Elevate your AI conversations. DaaCoo Pro features 98% voice recognition accuracy, sub-second response times, and advanced memory for power users who demand the best.",
      price: 349,
      stock: 15,
      imageUrl: "/images/product-pro.png",
      version: "Pro",
      specs: JSON.stringify({
        "Voice Recognition": "98% accuracy",
        "Response Speed": "< 0.8s",
        "Memory": "8GB RAM",
        "Battery": "12 hours",
        "Languages": "Chinese, English, Japanese, Korean",
        "Connectivity": "Wi-Fi 6, Bluetooth 5.2",
      }),
      isAvailable: true,
      orderCount: 8,
    },
  });

  const family = await prisma.product.upsert({
    where: { id: "daacoo-family-001" },
    update: {},
    create: {
      id: "daacoo-family-001",
      name: "DaaCoo Family",
      description:
        "AI for the whole family. DaaCoo Family supports multi-user profiles, parental controls, and premium audio quality. The perfect centerpiece for a smart home.",
      price: 499,
      stock: 8,
      imageUrl: "/images/product-family.png",
      version: "Family",
      specs: JSON.stringify({
        "Voice Recognition": "99% accuracy",
        "Response Speed": "< 0.5s",
        "Memory": "16GB RAM",
        "Battery": "16 hours",
        "Languages": "Chinese, English, Japanese, Korean, Spanish, French",
        "Connectivity": "Wi-Fi 6E, Bluetooth 5.3",
        "Multi-user Profiles": "Up to 6 users",
      }),
      isAvailable: true,
      orderCount: 5,
    },
  });

  const order1 = await prisma.order.create({
    data: {
      userId: demoUser.id,
      guestEmail: demoUser.email,
      guestName: demoUser.name,
      guestPhone: demoUser.phone,
      shippingAddress: demoUser.address || "123 Demo Street",
      totalAmount: 199,
      status: "Delivered",
      paymentMethod: "stripe",
      items: {
        create: {
          productId: basic.id,
          name: basic.name,
          price: basic.price,
          quantity: 1,
          imageUrl: basic.imageUrl,
        },
      },
    },
  });

  await prisma.payment.create({
    data: {
      orderId: order1.id,
      amount: 199,
      method: "stripe",
      transactionId: "pi_demo_001",
      status: "success",
    },
  });

  const order2 = await prisma.order.create({
    data: {
      userId: demoUser.id,
      guestEmail: demoUser.email,
      guestName: demoUser.name,
      guestPhone: demoUser.phone,
      shippingAddress: demoUser.address || "123 Demo Street",
      totalAmount: 848,
      status: "Shipped",
      paymentMethod: "alipay",
      items: {
        create: [
          {
            productId: pro.id,
            name: pro.name,
            price: pro.price,
            quantity: 1,
            imageUrl: pro.imageUrl,
          },
          {
            productId: basic.id,
            name: basic.name,
            price: basic.price,
            quantity: 1,
            imageUrl: basic.imageUrl,
          },
        ],
      },
    },
  });

  await prisma.payment.create({
    data: {
      orderId: order2.id,
      amount: 848,
      method: "alipay",
      transactionId: "alipay_demo_002",
      status: "success",
    },
  });

  const order3 = await prisma.order.create({
    data: {
      guestEmail: "guest@example.com",
      guestName: "Guest User",
      guestPhone: "+86 139 0000 0000",
      shippingAddress: "456 Guest Ave, Guest City, 20000",
      totalAmount: 499,
      status: "Paid",
      paymentMethod: "wechatpay",
      items: {
        create: {
          productId: family.id,
          name: family.name,
          price: family.price,
          quantity: 1,
          imageUrl: family.imageUrl,
        },
      },
    },
  });

  await prisma.payment.create({
    data: {
      orderId: order3.id,
      amount: 499,
      method: "wechatpay",
      transactionId: "wx_demo_003",
      status: "success",
    },
  });

  console.log("Seed completed successfully!");
  console.log({ admin, demoUser, basic, pro, family });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
