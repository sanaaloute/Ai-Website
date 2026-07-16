export type Locale = "en" | "zh" | "fr" | "es" | "ar";

export const supportedLocales: Locale[] = ["en", "zh", "fr", "es", "ar"];

export const defaultLocale: Locale = "en";

export const localeNames: Record<Locale, string> = {
  en: "English",
  zh: "中文",
  fr: "Français",
  es: "Español",
  ar: "العربية",
};

export const rtlLocales: Locale[] = ["ar"];

export type Translations = {
  navbar: {
    home: string;
    products: string;
    contacts: string;
    about: string;
    cart: string;
    admin: string;
    login: string;
    signUp: string;
    logout: string;
    myAccount: string;
    adminPortal: string;
    language: string;
  };
  adminSidebar: {
    title: string;
    dashboard: string;
    products: string;
    orders: string;
    payments: string;
  };
  adminDashboard: {
    title: string;
    totalOrders: string;
    pending: string;
    paid: string;
    shipped: string;
    completed: string;
    salesOverview: string;
    topSellingProducts: string;
    totalPageViews: string;
    uniqueVisitors: string;
    recentOrders: string;
    orderId: string;
    customer: string;
    total: string;
    status: string;
    noRecentOrders: string;
    lowStockAlerts: string;
    product: string;
    version: string;
    stock: string;
    noLowStockAlerts: string;
    accessDenied: string;
    noPermission: string;
  };
  common: {
    accessDenied: string;
    noPermission: string;
    loading: string;
    cancel: string;
    save: string;
    delete: string;
    create: string;
    edit: string;
    add: string;
    back: string;
    browseProducts: string;
    shopNow: string;
    continueShopping: string;
    signIn: string;
    signUp: string;
    yes: string;
    no: string;
    search: string;
    filter: string;
    sort: string;
    all: string;
    actions: string;
    name: string;
    email: string;
    phone: string;
    address: string;
    quantity: string;
    price: string;
    stock: string;
    version: string;
    description: string;
    imageUrl: string;
    available: string;
    confirm: string;
    close: string;
    submit: string;
    processing: string;
    free: string;
    emptyCart: string;
    orderId: string;
    customer: string;
    date: string;
    method: string;
    payment: string;
    shipping: string;
    tax: string;
    subtotal: string;
    specs: string;
    emptyState: string;
    noOrders: string;
    noPayments: string;
    noProducts: string;
    orderSummary: string;
    shippingInfo: string;
    paymentMethod: string;
    fullName: string;
    password: string;
    dontHaveAccount: string;
    alreadyHaveAccount: string;
    welcomeBack: string;
    createAccount: string;
    myAccount: string;
    orderHistory: string;
    profile: string;
    success: string;
    failed: string;
    addedToCart: string;
    failedToLoad: string;
    failedToAddToCart: string;
    failedToUpdate: string;
    failedToRemove: string;
    failedToSave: string;
    failedToDelete: string;
    failedToCreate: string;
    availabilityUpdated: string;
    orderStatusUpdated: string;
    orderCancelled: string;
    areYouSure: string;
    cannotUndo: string;
    items: string;
    keep: string;
    from: string;
    to: string;
    export: string;
    transactionId: string;
    amount: string;
    timestamp: string;
    pending: string;
    paid: string;
    shipped: string;
    delivered: string;
    cancelled: string;
    inStock: string;
    outOfStock: string;
    addToCart: string;
    placeOrder: string;
    proceedToCheckout: string;
    qty: string;
    fillRequired: string;
    fillFields: string;
    notFound: string;
  };
  landing: {
    heroTitle: string;
    heroSubtitle: string;
    shopNow: string;
    exploreDevices: string;
    productImage: string;
    productName: string;
    whyChoose: string;
    whyChooseSubtitle: string;
    feature1Title: string;
    feature1Desc: string;
    feature2Title: string;
    feature2Desc: string;
    feature3Title: string;
    feature3Desc: string;
    feature4Title: string;
    feature4Desc: string;
    ctaTitle: string;
    ctaSubtitle: string;
    browseProducts: string;
  };
  products: {
    title: string;
    subtitle: string;
    versionFilter: string;
    sortByName: string;
    sortByPriceLow: string;
    sortByPriceHigh: string;
    sortByPopularity: string;
    add: string;
    noProducts: string;
    viewDetails: string;
    onlyNLeft: string;
  };
  productDetail: {
    backToProducts: string;
    inStock: string;
    outOfStock: string;
    quantity: string;
    addToCart: string;
    technicalSpecs: string;
    processor: string;
    connectivity: string;
    battery: string;
    audio: string;
    sampleConversation: string;
    demoMessage1: string;
    demoMessage2: string;
    demoMessage3: string;
    demoMessage4: string;
    addedToCart: string;
    failedToAddToCart: string;
    notFound: string;
    processorDefault: string;
    connectivityDefault: string;
    batteryDefault: string;
    audioDefault: string;
    initializing: string;
  };
  cart: {
    title: string;
    emptyTitle: string;
    emptyMessage: string;
    browseProducts: string;
    orderSummary: string;
    subtotal: string;
    tax: string;
    shipping: string;
    freeShippingHint: string;
    total: string;
    proceedToCheckout: string;
    failedToUpdate: string;
    failedToRemove: string;
    itemRemoved: string;
  };
  checkout: {
    title: string;
    backToCart: string;
    emptyCart: string;
    emptyCartMessage: string;
    shippingInfo: string;
    fullName: string;
    fullNamePlaceholder: string;
    email: string;
    emailPlaceholder: string;
    phone: string;
    phonePlaceholder: string;
    shippingAddress: string;
    addressPlaceholder: string;
    paymentMethod: string;
    stripeCard: string;
    alipay: string;
    wechatPay: string;
    unionPay: string;
    payWithCard: string;
    stripeInfo: string;
    testCard: string;
    simulatedAlipay: string;
    sandboxInfo: string;
    simulating: string;
    simulatedWechat: string;
    simulatedUnionPay: string;
    cardNumber: string;
    cardNumberPlaceholder: string;
    expiry: string;
    expiryPlaceholder: string;
    cvv: string;
    cvvPlaceholder: string;
    orderSummary: string;
    subtotal: string;
    tax: string;
    shipping: string;
    free: string;
    total: string;
    processing: string;
    placeOrder: string;
    fillRequired: string;
    orderCreationFailed: string;
    stripeSessionFailed: string;
    noCheckoutUrl: string;
  };
  checkoutSuccess: {
    thankYou: string;
    orderSuccess: string;
    orderId: string;
    orderSummary: string;
    qty: string;
    total: string;
    status: string;
    method: string;
    continueShopping: string;
  };
  login: {
    welcomeBack: string;
    signInSubtitle: string;
    email: string;
    emailPlaceholder: string;
    password: string;
    passwordPlaceholder: string;
    signIn: string;
    dontHaveAccount: string;
    signUpLink: string;
    fillFields: string;
    welcomeToast: string;
    loginFailed: string;
    showPassword: string;
    hidePassword: string;
  };
  register: {
    createAccount: string;
    joinCommunity: string;
    name: string;
    namePlaceholder: string;
    email: string;
    emailPlaceholder: string;
    password: string;
    passwordPlaceholder: string;
    createAccountBtn: string;
    alreadyHaveAccount: string;
    signInLink: string;
    fillRequired: string;
    accountCreated: string;
    registrationFailed: string;
    confirmPassword: string;
    confirmPasswordPlaceholder: string;
    passwordsDoNotMatch: string;
  };
  account: {
    myAccount: string;
    user: string;
    email: string;
    phone: string;
    orderHistory: string;
    noOrders: string;
    shopNow: string;
    failedToLoadOrders: string;
  };
  adminProducts: {
    title: string;
    addProduct: string;
    name: string;
    version: string;
    price: string;
    stock: string;
    available: string;
    actions: string;
    yes: string;
    no: string;
    noProducts: string;
    editProduct: string;
    addProductDialog: string;
    fillDetails: string;
    description: string;
    imageUrl: string;
    specsJson: string;
    specsPlaceholder: string;
    availableCheckbox: string;
    saveChanges: string;
    createProduct: string;
    deleteProduct: string;
    deleteConfirm: string;
    deleteWarning: string;
    deleteBtn: string;
    productUpdated: string;
    productCreated: string;
    productDeleted: string;
    failedToLoad: string;
    failedToSave: string;
    failedToDelete: string;
    availabilityUpdated: string;
    failedToUpdateAvailability: string;
  };
  adminOrders: {
    title: string;
    exportCsv: string;
    statusFilter: string;
    allStatuses: string;
    from: string;
    to: string;
    id: string;
    customer: string;
    email: string;
    total: string;
    status: string;
    payment: string;
    date: string;
    actions: string;
    na: string;
    noOrders: string;
    orderItems: string;
    itemsInOrder: string;
    noItems: string;
    cancelOrder: string;
    cancelConfirm: string;
    keepOrder: string;
    confirmCancel: string;
    statusUpdated: string;
    failedToUpdateStatus: string;
    orderCancelled: string;
    failedToCancel: string;
    failedToLoad: string;
  };
  adminPayments: {
    title: string;
    all: string;
    transactionId: string;
    orderId: string;
    amount: string;
    method: string;
    status: string;
    timestamp: string;
    na: string;
    noPayments: string;
  };
  aboutPage: {
    title: string;
    subtitle: string;
    ourStory: string;
    ourStoryText: string;
    mission: string;
    missionText: string;
    vision: string;
    visionText: string;
    values: string;
    value1Title: string;
    value1Desc: string;
    value2Title: string;
    value2Desc: string;
    value3Title: string;
    value3Desc: string;
    value4Title: string;
    value4Desc: string;
    team: string;
    teamSubtitle: string;
  };
  contactPage: {
    title: string;
    subtitle: string;
    getInTouch: string;
    getInTouchText: string;
    email: string;
    phone: string;
    address: string;
    addressValue: string;
    formName: string;
    formEmail: string;
    formSubject: string;
    formMessage: string;
    formSubmit: string;
    formSuccess: string;
    faq: string;
    faq1Q: string;
    faq1A: string;
    faq2Q: string;
    faq2A: string;
    faq3Q: string;
    faq3A: string;
  };
  productDescriptions: Record<string, string>;
};

const translations: Record<Locale, Translations> = {
  en: {
    navbar: {
      home: "Home",
      products: "Products",
      contacts: "Contacts",
      about: "About",
      cart: "Cart",
      admin: "Admin",
      login: "Login",
      signUp: "Sign Up",
      logout: "Logout",
      myAccount: "My Account",
      adminPortal: "Admin Portal",
      language: "Language",
    },
    adminSidebar: {
      title: "DaaCoo Admin",
      dashboard: "Dashboard",
      products: "Products",
      orders: "Orders",
      payments: "Payments",
    },
    adminDashboard: {
      title: "Dashboard",
      totalOrders: "Total Orders",
      pending: "Pending",
      paid: "Paid",
      shipped: "Shipped",
      completed: "Completed",
      salesOverview: "Sales Overview (Last 30 Days)",
      topSellingProducts: "Top Selling Products",
      totalPageViews: "Total Page Views",
      uniqueVisitors: "Unique Visitors",
      recentOrders: "Recent Orders",
      orderId: "Order ID",
      customer: "Customer",
      total: "Total",
      status: "Status",
      noRecentOrders: "No recent orders",
      lowStockAlerts: "Low Stock Alerts",
      product: "Product",
      version: "Version",
      stock: "Stock",
      noLowStockAlerts: "No low stock alerts",
      accessDenied: "Access Denied",
      noPermission: "You do not have permission to access this page.",
    },
    common: {
      accessDenied: "Access Denied",
      noPermission: "You do not have permission to access this page.",
      loading: "Loading...",
      cancel: "Cancel",
      save: "Save",
      delete: "Delete",
      create: "Create",
      edit: "Edit",
      add: "Add",
      back: "Back",
      browseProducts: "Browse Products",
      shopNow: "Shop Now",
      continueShopping: "Continue Shopping",
      signIn: "Sign In",
      signUp: "Sign Up",
      yes: "Yes",
      no: "No",
      search: "Search",
      filter: "Filter",
      sort: "Sort",
      all: "All",
      actions: "Actions",
      name: "Name",
      email: "Email",
      phone: "Phone",
      address: "Address",
      quantity: "Quantity",
      price: "Price",
      stock: "Stock",
      version: "Version",
      description: "Description",
      imageUrl: "Image URL",
      available: "Available",
      confirm: "Confirm",
      close: "Close",
      submit: "Submit",
      processing: "Processing...",
      free: "Free",
      emptyCart: "Your cart is empty",
      orderId: "Order ID",
      customer: "Customer",
      date: "Date",
      method: "Method",
      payment: "Payment",
      shipping: "Shipping",
      tax: "Tax (10%)",
      subtotal: "Subtotal",
      specs: "Specs (JSON)",
      emptyState: "Nothing here yet.",
      noOrders: "No orders yet",
      noPayments: "No payments found",
      noProducts: "No products found",
      orderSummary: "Order Summary",
      shippingInfo: "Shipping Information",
      paymentMethod: "Payment Method",
      fullName: "Full Name",
      password: "Password",
      dontHaveAccount: "Don't have an account?",
      alreadyHaveAccount: "Already have an account?",
      welcomeBack: "Welcome Back",
      createAccount: "Create Account",
      myAccount: "My Account",
      orderHistory: "Order History",
      profile: "Profile",
      success: "Success",
      failed: "Failed",
      addedToCart: "Added to cart",
      failedToLoad: "Failed to load",
      failedToAddToCart: "Failed to add to cart",
      failedToUpdate: "Failed to update",
      failedToRemove: "Failed to remove",
      failedToSave: "Failed to save",
      failedToDelete: "Failed to delete",
      failedToCreate: "Failed to create",
      availabilityUpdated: "Availability updated",
      orderStatusUpdated: "Order status updated",
      orderCancelled: "Order cancelled",
      areYouSure: "Are you sure?",
      cannotUndo: "This action cannot be undone.",
      items: "Items",
      keep: "Keep",
      from: "From",
      to: "To",
      export: "Export",
      transactionId: "Transaction ID",
      amount: "Amount",
      timestamp: "Timestamp",
      pending: "Pending",
      paid: "Paid",
      shipped: "Shipped",
      delivered: "Delivered",
      cancelled: "Cancelled",
      inStock: "In Stock",
      outOfStock: "Out of Stock",
      addToCart: "Add to Cart",
      placeOrder: "Place Order",
      proceedToCheckout: "Proceed to Checkout",
      qty: "Qty",
      fillRequired: "Please fill in all required fields",
      fillFields: "Please fill in all fields",
      notFound: "Not found",
    },
    landing: {
      heroTitle: "AI That Understands You",
      heroSubtitle:
        "Experience the future of conversation with DaaCoo — an intelligent AI companion device that learns your preferences, speaks your language, and keeps your conversations private and secure.",
      shopNow: "Shop Now",
      exploreDevices: "Explore Devices",
      productImage: "Product Image",
      productName: "DaaCoo AI Device",
      whyChoose: "Why Choose ",
      whyChooseSubtitle:
        "Built with cutting-edge AI technology to deliver a seamless conversation experience.",
      feature1Title: "Natural Conversations",
      feature1Desc:
        "Advanced NLP engine enables fluid, human-like dialogue that adapts to your speaking style.",
      feature2Title: "Smart Learning",
      feature2Desc:
        "DaaCoo learns your preferences over time, delivering increasingly personalized responses.",
      feature3Title: "Privacy First",
      feature3Desc:
        "End-to-end encryption and on-device processing keep your conversations completely private.",
      feature4Title: "Multi-language",
      feature4Desc:
        "Fluent in 40+ languages with real-time translation for seamless global communication.",
      ctaTitle: "Ready to Meet Your AI Companion?",
      ctaSubtitle:
        "Join thousands of users who have transformed their daily conversations with DaaCoo.",
      browseProducts: "Browse Products",
    },
    products: {
      title: "Products",
      subtitle: "Discover the perfect DaaCoo for your needs",
      versionFilter: "Version:",
      sortByName: "Sort by Name",
      sortByPriceLow: "Price: Low to High",
      sortByPriceHigh: "Price: High to Low",
      sortByPopularity: "Popularity",
      add: "Add",
      noProducts: "No products found",
      viewDetails: "View Details",
      onlyNLeft: "Only {count} left",
    },
    productDetail: {
      backToProducts: "Back to Products",
      inStock: "In Stock",
      outOfStock: "Out of Stock",
      quantity: "Quantity:",
      addToCart: "Add to Cart",
      technicalSpecs: "Technical Specifications",
      processor: "Processor",
      connectivity: "Connectivity",
      battery: "Battery",
      audio: "Audio",
      sampleConversation: "Sample Conversation",
      demoMessage1: "Hey DaaCoo, what's the weather like today?",
      demoMessage2:
        "Good morning! It's 72°F and sunny in your area. Perfect day for a walk!",
      demoMessage3: "Can you remind me to call Mom at 6pm?",
      demoMessage4:
        "Of course! I've set a reminder for 6:00 PM to call Mom.",
      addedToCart: "Added to cart",
      failedToAddToCart: "Failed to add to cart",
      notFound: "Product not found",
      processorDefault: "DaaCoo Neural Engine v2",
      connectivityDefault: "Wi-Fi 6 / Bluetooth 5.3",
      batteryDefault: "Up to 48 hours",
      audioDefault: "360° Spatial Audio",
      initializing: "Initializing...",
    },
    cart: {
      title: "Shopping Cart",
      emptyTitle: "Your cart is empty",
      emptyMessage: "Looks like you haven't added any items yet.",
      browseProducts: "Browse Products",
      orderSummary: "Order Summary",
      subtotal: "Subtotal",
      tax: "Tax (10%)",
      shipping: "Shipping",
      freeShippingHint: "Free shipping on orders over $50",
      total: "Total",
      proceedToCheckout: "Proceed to Checkout",
      failedToUpdate: "Failed to update quantity",
      failedToRemove: "Failed to remove item",
      itemRemoved: "Item removed",
    },
    checkout: {
      title: "Checkout",
      backToCart: "Back to Cart",
      emptyCart: "Your cart is empty",
      emptyCartMessage: "Add some items before checking out.",
      shippingInfo: "Shipping Information",
      fullName: "Full Name",
      fullNamePlaceholder: "John Doe",
      email: "Email",
      emailPlaceholder: "john@example.com",
      phone: "Phone",
      phonePlaceholder: "+1 234 567 890",
      shippingAddress: "Shipping Address",
      addressPlaceholder: "123 Main St, City, Country",
      paymentMethod: "Payment Method",
      stripeCard: "Stripe (Card)",
      alipay: "Alipay",
      wechatPay: "WeChat Pay",
      unionPay: "UnionPay",
      payWithCard: "Pay with Card",
      stripeInfo: "You will be redirected to Stripe Checkout. Use test card:",
      testCard: "4242 4242 4242 4242",
      simulatedAlipay: "Simulated Alipay",
      sandboxInfo: "Sandbox mode — payment will be auto-confirmed after 2 seconds.",
      simulating: "Simulating payment...",
      simulatedWechat: "Simulated WeChat Pay",
      simulatedUnionPay: "Simulated UnionPay",
      cardNumber: "Card Number",
      cardNumberPlaceholder: "6222 8888 8888 8888",
      expiry: "Expiry",
      expiryPlaceholder: "MM/YY",
      cvv: "CVV",
      cvvPlaceholder: "123",
      orderSummary: "Order Summary",
      subtotal: "Subtotal",
      tax: "Tax (10%)",
      shipping: "Shipping",
      free: "Free",
      total: "Total",
      processing: "Processing...",
      placeOrder: "Place Order",
      fillRequired: "Please fill in all required fields",
      orderCreationFailed: "Order creation failed",
      stripeSessionFailed: "Stripe session failed",
      noCheckoutUrl: "No checkout URL returned",
    },
    checkoutSuccess: {
      thankYou: "Thank You!",
      orderSuccess: "Your order has been placed successfully.",
      orderId: "Order ID",
      orderSummary: "Order Summary",
      qty: "Qty",
      total: "Total",
      status: "Status",
      method: "Method",
      continueShopping: "Continue Shopping",
    },
    login: {
      welcomeBack: "Welcome Back",
      signInSubtitle: "Sign in to your DaaCoo account",
      email: "Email",
      emailPlaceholder: "you@example.com",
      password: "Password",
      passwordPlaceholder: "••••••••",
      signIn: "Sign In",
      dontHaveAccount: "Don't have an account?",
      signUpLink: "Sign up",
      fillFields: "Please fill in all fields",
      welcomeToast: "Welcome back!",
      loginFailed: "Login failed",
      showPassword: "Show password",
      hidePassword: "Hide password",
    },
    register: {
      createAccount: "Create Account",
      joinCommunity: "Join the DaaCoo community",
      name: "Name",
      namePlaceholder: "John Doe",
      email: "Email",
      emailPlaceholder: "you@example.com",
      password: "Password",
      passwordPlaceholder: "••••••••",
      createAccountBtn: "Create Account",
      alreadyHaveAccount: "Already have an account?",
      signInLink: "Sign in",
      fillRequired: "Please fill in all required fields",
      accountCreated: "Account created successfully!",
      registrationFailed: "Registration failed",
      confirmPassword: "Confirm Password",
      confirmPasswordPlaceholder: "••••••••",
      passwordsDoNotMatch: "Passwords do not match",
    },
    account: {
      myAccount: "My Account",
      user: "User",
      email: "Email",
      phone: "Phone",
      orderHistory: "Order History",
      noOrders: "No orders yet",
      shopNow: "Shop Now",
      failedToLoadOrders: "Failed to load order history",
    },
    adminProducts: {
      title: "Products",
      addProduct: "Add Product",
      name: "Name",
      version: "Version",
      price: "Price",
      stock: "Stock",
      available: "Available",
      actions: "Actions",
      yes: "Yes",
      no: "No",
      noProducts: "No products found",
      editProduct: "Edit Product",
      addProductDialog: "Add Product",
      fillDetails: "Fill in the product details below.",
      description: "Description",
      imageUrl: "Image URL",
      specsJson: "Specs (JSON)",
      specsPlaceholder: '{"key": "value"}',
      availableCheckbox: "Available",
      saveChanges: "Save Changes",
      createProduct: "Create Product",
      deleteProduct: "Delete Product",
      deleteConfirm: "Are you sure you want to delete this product?",
      deleteWarning: "This action cannot be undone.",
      deleteBtn: "Delete",
      productUpdated: "Product updated",
      productCreated: "Product created",
      productDeleted: "Product deleted",
      failedToLoad: "Failed to load products",
      failedToSave: "Failed to save product",
      failedToDelete: "Failed to delete product",
      availabilityUpdated: "Availability updated",
      failedToUpdateAvailability: "Failed to update availability",
    },
    adminOrders: {
      title: "Orders",
      exportCsv: "Export CSV",
      statusFilter: "Status",
      allStatuses: "All statuses",
      from: "From",
      to: "To",
      id: "ID",
      customer: "Customer",
      email: "Email",
      total: "Total",
      status: "Status",
      payment: "Payment",
      date: "Date",
      actions: "Actions",
      na: "N/A",
      noOrders: "No orders found",
      orderItems: "Order Items",
      itemsInOrder: "Items in order",
      noItems: "No items in this order",
      cancelOrder: "Cancel Order",
      cancelConfirm: "Are you sure you want to cancel this order?",
      keepOrder: "No, keep it",
      confirmCancel: "Yes, cancel",
      statusUpdated: "Order status updated",
      failedToUpdateStatus: "Failed to update status",
      orderCancelled: "Order cancelled",
      failedToCancel: "Failed to cancel order",
      failedToLoad: "Failed to load orders",
    },
    adminPayments: {
      title: "Payments",
      all: "All",
      transactionId: "Transaction ID",
      orderId: "Order ID",
      amount: "Amount",
      method: "Method",
      status: "Status",
      timestamp: "Timestamp",
      na: "N/A",
      noPayments: "No payments found",
    },
    aboutPage: {
      title: "About DaaCoo",
      subtitle: "Pioneering the future of human-AI interaction",
      ourStory: "Our Story",
      ourStoryText: "Founded in 2023, DaaCoo was born from a simple belief: technology should feel natural. Our team of engineers, designers, and AI researchers came together with a shared vision—to create a device that doesn't just respond, but truly understands. From our first prototype to the latest generation, we've remained committed to pushing the boundaries of what's possible in conversational AI.",
      mission: "Our Mission",
      missionText: "To make intelligent, natural conversation accessible to everyone. We believe that AI should adapt to humans, not the other way around. Every feature we build, every line of code we write, serves this singular purpose.",
      vision: "Our Vision",
      visionText: "A world where language barriers dissolve, where everyone has a patient and knowledgeable companion, and where technology enhances human connection rather than replacing it.",
      values: "Our Values",
      value1Title: "Privacy First",
      value1Desc: "Your conversations belong to you. We design every product with end-to-end encryption and on-device processing as core principles.",
      value2Title: "User-Centric Design",
      value2Desc: "We obsess over the details that make interactions feel effortless. From voice recognition to response timing, every millisecond matters.",
      value3Title: "Continuous Innovation",
      value3Desc: "AI evolves rapidly, and so do we. Our team is constantly researching, testing, and deploying improvements to keep DaaCoo at the cutting edge.",
      value4Title: "Inclusive Accessibility",
      value4Desc: "We build for everyone. Our products support 40+ languages and are designed with accessibility features that empower users of all abilities.",
      team: "Meet the Team",
      teamSubtitle: "Passionate creators building the future of conversation",
    },
    contactPage: {
      title: "Contact Us",
      subtitle: "We'd love to hear from you",
      getInTouch: "Get in Touch",
      getInTouchText: "Have questions about DaaCoo? Want to partner with us? Or just want to say hello? Reach out and our team will get back to you within 24 hours.",
      email: "Email",
      phone: "Phone",
      address: "Address",
      addressValue: "123 Innovation Drive, Tech City, TC 90210",
      formName: "Your Name",
      formEmail: "Your Email",
      formSubject: "Subject",
      formMessage: "Your Message",
      formSubmit: "Send Message",
      formSuccess: "Message sent successfully! We'll get back to you soon.",
      faq: "Frequently Asked Questions",
      faq1Q: "What are your support hours?",
      faq1A: "Our customer support team is available Monday through Friday, 9 AM to 6 PM PST. We typically respond to all inquiries within 24 hours.",
      faq2Q: "Do you offer enterprise solutions?",
      faq2A: "Yes! We offer custom enterprise packages for businesses looking to integrate DaaCoo technology. Contact our sales team for more information.",
      faq3Q: "How can I track my order?",
      faq3A: "Once your order ships, you'll receive a tracking number via email. You can also view your order status in your account dashboard.",
    },
    productDescriptions: {
      "daacoo-basic-001": "The essential AI conversation companion. DaaCoo Basic offers natural voice interaction with 95% recognition accuracy, perfect for individuals seeking an intelligent daily assistant.",
      "daacoo-pro-001": "Elevate your AI conversations. DaaCoo Pro features 98% voice recognition accuracy, sub-second response times, and advanced memory for power users who demand the best.",
      "daacoo-family-001": "AI for the whole family. DaaCoo Family supports multi-user profiles, parental controls, and premium audio quality. The perfect centerpiece for a smart home.",
    },
  },
  zh: {
    navbar: {
      home: "首页",
      products: "产品",
      contacts: "联系我们",
      about: "关于",
      cart: "购物车",
      admin: "管理",
      login: "登录",
      signUp: "注册",
      logout: "退出",
      myAccount: "我的账户",
      adminPortal: "管理后台",
      language: "语言",
    },
    adminSidebar: {
      title: "DaaCoo 管理后台",
      dashboard: "仪表盘",
      products: "产品",
      orders: "订单",
      payments: "支付",
    },
    adminDashboard: {
      title: "仪表盘",
      totalOrders: "总订单",
      pending: "待处理",
      paid: "已付款",
      shipped: "已发货",
      completed: "已完成",
      salesOverview: "销售概览（最近30天）",
      topSellingProducts: "热销产品",
      totalPageViews: "总页面浏览量",
      uniqueVisitors: "独立访客",
      recentOrders: "最近订单",
      orderId: "订单编号",
      customer: "客户",
      total: "总计",
      status: "状态",
      noRecentOrders: "暂无最近订单",
      lowStockAlerts: "库存不足提醒",
      product: "产品",
      version: "版本",
      stock: "库存",
      noLowStockAlerts: "暂无库存不足提醒",
      accessDenied: "访问被拒绝",
      noPermission: "您没有权限访问此页面。",
    },
    common: {
      accessDenied: "访问被拒绝",
      noPermission: "您没有权限访问此页面。",
      loading: "加载中...",
      cancel: "取消",
      save: "保存",
      delete: "删除",
      create: "创建",
      edit: "编辑",
      add: "添加",
      back: "返回",
      browseProducts: "浏览产品",
      shopNow: "立即购买",
      continueShopping: "继续购物",
      signIn: "登录",
      signUp: "注册",
      yes: "是",
      no: "否",
      search: "搜索",
      filter: "筛选",
      sort: "排序",
      all: "全部",
      actions: "操作",
      name: "名称",
      email: "邮箱",
      phone: "电话",
      address: "地址",
      quantity: "数量",
      price: "价格",
      stock: "库存",
      version: "版本",
      description: "描述",
      imageUrl: "图片链接",
      available: "可售",
      confirm: "确认",
      close: "关闭",
      submit: "提交",
      processing: "处理中...",
      free: "免费",
      emptyCart: "您的购物车是空的",
      orderId: "订单编号",
      customer: "客户",
      date: "日期",
      method: "方式",
      payment: "支付",
      shipping: "运费",
      tax: "税费 (10%)",
      subtotal: "小计",
      specs: "规格 (JSON)",
      emptyState: "暂无内容。",
      noOrders: "暂无订单",
      noPayments: "暂无支付记录",
      noProducts: "暂无产品",
      orderSummary: "订单摘要",
      shippingInfo: "配送信息",
      paymentMethod: "支付方式",
      fullName: "全名",
      password: "密码",
      dontHaveAccount: "还没有账户？",
      alreadyHaveAccount: "已有账户？",
      welcomeBack: "欢迎回来",
      createAccount: "创建账户",
      myAccount: "我的账户",
      orderHistory: "订单历史",
      profile: "个人资料",
      success: "成功",
      failed: "失败",
      addedToCart: "已加入购物车",
      failedToLoad: "加载失败",
      failedToAddToCart: "加入购物车失败",
      failedToUpdate: "更新失败",
      failedToRemove: "移除失败",
      failedToSave: "保存失败",
      failedToDelete: "删除失败",
      failedToCreate: "创建失败",
      availabilityUpdated: "可售状态已更新",
      orderStatusUpdated: "订单状态已更新",
      orderCancelled: "订单已取消",
      areYouSure: "您确定吗？",
      cannotUndo: "此操作无法撤销。",
      items: "商品",
      keep: "保留",
      from: "开始",
      to: "结束",
      export: "导出",
      transactionId: "交易编号",
      amount: "金额",
      timestamp: "时间戳",
      pending: "待处理",
      paid: "已付款",
      shipped: "已发货",
      delivered: "已送达",
      cancelled: "已取消",
      inStock: "有库存",
      outOfStock: "缺货",
      addToCart: "加入购物车",
      placeOrder: "下单",
      proceedToCheckout: "去结算",
      qty: "数量",
      fillRequired: "请填写所有必填项",
      fillFields: "请填写所有字段",
      notFound: "未找到",
    },
    landing: {
      heroTitle: "懂你的AI",
      heroSubtitle:
        "体验DaaCoo带来的未来对话——一款智能AI伴侣设备，它能学习您的偏好、说您的语言，并确保您的对话私密安全。",
      shopNow: "立即购买",
      exploreDevices: "探索设备",
      productImage: "产品图片",
      productName: "DaaCoo AI设备",
      whyChoose: "为什么选择",
      whyChooseSubtitle:
        "采用前沿AI技术，为您带来无缝的对话体验。",
      feature1Title: "自然对话",
      feature1Desc:
        "先进的NLP引擎实现流畅、类人的对话，适应您的说话风格。",
      feature2Title: "智能学习",
      feature2Desc:
        "DaaCoo会随着时间的推移学习您的偏好，提供越来越个性化的回应。",
      feature3Title: "隐私优先",
      feature3Desc:
        "端到端加密和设备端处理确保您的对话完全私密。",
      feature4Title: "多语言",
      feature4Desc:
        "支持40多种语言，实时翻译，实现无缝的全球沟通。",
      ctaTitle: "准备好遇见您的AI伴侣了吗？",
      ctaSubtitle:
        "加入成千上万用户的行列，用DaaCoo改变您的日常对话。",
      browseProducts: "浏览产品",
    },
    products: {
      title: "产品",
      subtitle: "发现最适合您的DaaCoo",
      versionFilter: "版本：",
      sortByName: "按名称排序",
      sortByPriceLow: "价格：从低到高",
      sortByPriceHigh: "价格：从高到低",
      sortByPopularity: "按热度排序",
      add: "添加",
      noProducts: "暂无产品",
      viewDetails: "查看详情",
      onlyNLeft: "仅剩 {count} 件",
    },
    productDetail: {
      backToProducts: "返回产品列表",
      inStock: "有库存",
      outOfStock: "缺货",
      quantity: "数量：",
      addToCart: "加入购物车",
      technicalSpecs: "技术规格",
      processor: "处理器",
      connectivity: "连接",
      battery: "电池",
      audio: "音频",
      sampleConversation: "示例对话",
      demoMessage1: "嘿DaaCoo，今天天气怎么样？",
      demoMessage2: "早上好！您所在地区72°F，阳光明媚。非常适合散步！",
      demoMessage3: "你能提醒我在晚上6点给妈妈打电话吗？",
      demoMessage4: "当然！我已经设置了晚上6:00给妈妈打电话的提醒。",
      addedToCart: "已加入购物车",
      failedToAddToCart: "加入购物车失败",
      notFound: "未找到该产品",
      processorDefault: "DaaCoo 神经引擎 v2",
      connectivityDefault: "Wi-Fi 6 / 蓝牙 5.3",
      batteryDefault: "最长48小时",
      audioDefault: "360° 空间音频",
      initializing: "正在初始化...",
    },
    cart: {
      title: "购物车",
      emptyTitle: "您的购物车是空的",
      emptyMessage: "看起来您还没有添加任何商品。",
      browseProducts: "浏览产品",
      orderSummary: "订单摘要",
      subtotal: "小计",
      tax: "税费 (10%)",
      shipping: "运费",
      freeShippingHint: "订单满50美元免运费",
      total: "总计",
      proceedToCheckout: "去结算",
      failedToUpdate: "更新数量失败",
      failedToRemove: "移除商品失败",
      itemRemoved: "商品已移除",
    },
    checkout: {
      title: "结算",
      backToCart: "返回购物车",
      emptyCart: "您的购物车是空的",
      emptyCartMessage: "请先添加一些商品。",
      shippingInfo: "配送信息",
      fullName: "全名",
      fullNamePlaceholder: "张三",
      email: "邮箱",
      emailPlaceholder: "you@example.com",
      phone: "电话",
      phonePlaceholder: "+86 138 0000 0000",
      shippingAddress: "配送地址",
      addressPlaceholder: "某某路123号，城市，国家",
      paymentMethod: "支付方式",
      stripeCard: "Stripe (银行卡)",
      alipay: "支付宝",
      wechatPay: "微信支付",
      unionPay: "银联",
      payWithCard: "银行卡支付",
      stripeInfo: "您将被重定向到Stripe结算。使用测试卡：",
      testCard: "4242 4242 4242 4242",
      simulatedAlipay: "模拟支付宝",
      sandboxInfo: "沙盒模式——支付将在2秒后自动确认。",
      simulating: "正在模拟支付...",
      simulatedWechat: "模拟微信支付",
      simulatedUnionPay: "模拟银联",
      cardNumber: "卡号",
      cardNumberPlaceholder: "6222 8888 8888 8888",
      expiry: "有效期",
      expiryPlaceholder: "MM/YY",
      cvv: "CVV",
      cvvPlaceholder: "123",
      orderSummary: "订单摘要",
      subtotal: "小计",
      tax: "税费 (10%)",
      shipping: "运费",
      free: "免费",
      total: "总计",
      processing: "处理中...",
      placeOrder: "下单",
      fillRequired: "请填写所有必填项",
      orderCreationFailed: "订单创建失败",
      stripeSessionFailed: "Stripe会话失败",
      noCheckoutUrl: "未返回结算链接",
    },
    checkoutSuccess: {
      thankYou: "谢谢！",
      orderSuccess: "您的订单已成功下单。",
      orderId: "订单编号",
      orderSummary: "订单摘要",
      qty: "数量",
      total: "总计",
      status: "状态",
      method: "方式",
      continueShopping: "继续购物",
    },
    login: {
      welcomeBack: "欢迎回来",
      signInSubtitle: "登录您的DaaCoo账户",
      email: "邮箱",
      emailPlaceholder: "you@example.com",
      password: "密码",
      passwordPlaceholder: "••••••••",
      signIn: "登录",
      dontHaveAccount: "还没有账户？",
      signUpLink: "注册",
      fillFields: "请填写所有字段",
      welcomeToast: "欢迎回来！",
      loginFailed: "登录失败",
      showPassword: "显示密码",
      hidePassword: "隐藏密码",
    },
    register: {
      createAccount: "创建账户",
      joinCommunity: "加入DaaCoo社区",
      name: "姓名",
      namePlaceholder: "张三",
      email: "邮箱",
      emailPlaceholder: "you@example.com",
      password: "密码",
      passwordPlaceholder: "••••••••",
      createAccountBtn: "创建账户",
      alreadyHaveAccount: "已有账户？",
      signInLink: "登录",
      fillRequired: "请填写所有必填项",
      accountCreated: "账户创建成功！",
      registrationFailed: "注册失败",
      confirmPassword: "确认密码",
      confirmPasswordPlaceholder: "••••••••",
      passwordsDoNotMatch: "密码不一致",
    },
    account: {
      myAccount: "我的账户",
      user: "用户",
      email: "邮箱",
      phone: "电话",
      orderHistory: "订单历史",
      noOrders: "暂无订单",
      shopNow: "立即购买",
      failedToLoadOrders: "加载订单历史失败",
    },
    adminProducts: {
      title: "产品",
      addProduct: "添加产品",
      name: "名称",
      version: "版本",
      price: "价格",
      stock: "库存",
      available: "可售",
      actions: "操作",
      yes: "是",
      no: "否",
      noProducts: "暂无产品",
      editProduct: "编辑产品",
      addProductDialog: "添加产品",
      fillDetails: "请填写以下产品详情。",
      description: "描述",
      imageUrl: "图片链接",
      specsJson: "规格 (JSON)",
      specsPlaceholder: '{"key": "value"}',
      availableCheckbox: "可售",
      saveChanges: "保存更改",
      createProduct: "创建产品",
      deleteProduct: "删除产品",
      deleteConfirm: "您确定要删除此产品吗？",
      deleteWarning: "此操作无法撤销。",
      deleteBtn: "删除",
      productUpdated: "产品已更新",
      productCreated: "产品已创建",
      productDeleted: "产品已删除",
      failedToLoad: "加载产品失败",
      failedToSave: "保存产品失败",
      failedToDelete: "删除产品失败",
      availabilityUpdated: "可售状态已更新",
      failedToUpdateAvailability: "更新可售状态失败",
    },
    adminOrders: {
      title: "订单",
      exportCsv: "导出CSV",
      statusFilter: "状态",
      allStatuses: "全部状态",
      from: "开始",
      to: "结束",
      id: "编号",
      customer: "客户",
      email: "邮箱",
      total: "总计",
      status: "状态",
      payment: "支付",
      date: "日期",
      actions: "操作",
      na: "无",
      noOrders: "暂无订单",
      orderItems: "订单商品",
      itemsInOrder: "订单中的商品",
      noItems: "此订单中没有商品",
      cancelOrder: "取消订单",
      cancelConfirm: "您确定要取消此订单吗？",
      keepOrder: "不，保留订单",
      confirmCancel: "是的，取消",
      statusUpdated: "订单状态已更新",
      failedToUpdateStatus: "更新状态失败",
      orderCancelled: "订单已取消",
      failedToCancel: "取消订单失败",
      failedToLoad: "加载订单失败",
    },
    adminPayments: {
      title: "支付",
      all: "全部",
      transactionId: "交易编号",
      orderId: "订单编号",
      amount: "金额",
      method: "方式",
      status: "状态",
      timestamp: "时间戳",
      na: "无",
      noPayments: "暂无支付记录",
    },
    aboutPage: {
      title: "关于 DaaCoo",
      subtitle: "开拓人机交互的未来",
      ourStory: "我们的故事",
      ourStoryText: "DaaCoo 成立于2023年，源于一个简单的信念：科技应当让人感到自然。我们的工程师、设计师和AI研究人员团队怀揣共同的愿景走到一起——创造一款不仅能回应，更能真正理解的设备。从第一个原型到最新一代产品，我们始终致力于突破对话式AI的边界。",
      mission: "我们的使命",
      missionText: "让智能、自然的对话惠及每一个人。我们相信AI应该适应人类，而不是让人类去适应AI。我们构建的每一个功能、编写的每一行代码，都服务于这一唯一目标。",
      vision: "我们的愿景",
      visionText: "一个语言障碍消失的世界，每个人都能拥有一位耐心且博学的伙伴，技术增强人类连接而非取代它。",
      values: "我们的价值观",
      value1Title: "隐私至上",
      value1Desc: "您的对话只属于您。我们在设计每一款产品时，都将端到端加密和设备端处理作为核心原则。",
      value2Title: "以用户为中心的设计",
      value2Desc: "我们痴迷于让交互变得毫不费力的细节。从语音识别到响应时间，每一毫秒都至关重要。",
      value3Title: "持续创新",
      value3Desc: "AI在快速演进，我们也是如此。我们的团队不断研究、测试和部署改进，让DaaCoo始终处于技术前沿。",
      value4Title: "包容无障碍",
      value4Desc: "我们为所有人打造产品。我们的设备支持40多种语言，并配备了无障碍功能，赋能所有能力的用户。",
      team: "认识团队",
      teamSubtitle: "充满热情的创造者，共建对话的未来",
    },
    contactPage: {
      title: "联系我们",
      subtitle: "我们期待您的来信",
      getInTouch: "取得联系",
      getInTouchText: "对DaaCoo有疑问？想与我们合作？或者只是想打个招呼？请随时联系，我们的团队将在24小时内回复您。",
      email: "邮箱",
      phone: "电话",
      address: "地址",
      addressValue: "创新大道123号，科技市，TC 90210",
      formName: "您的姓名",
      formEmail: "您的邮箱",
      formSubject: "主题",
      formMessage: "您的留言",
      formSubmit: "发送留言",
      formSuccess: "留言发送成功！我们将尽快回复您。",
      faq: "常见问题",
      faq1Q: "你们的客服时间是什么？",
      faq1A: "我们的客服团队周一至周五，上午9点至下午6点（太平洋时间）在线。我们通常会在24小时内回复所有咨询。",
      faq2Q: "你们提供企业解决方案吗？",
      faq2A: "是的！我们为希望集成DaaCoo技术的企业提供定制企业套餐。请联系我们的销售团队了解更多信息。",
      faq3Q: "如何追踪我的订单？",
      faq3A: "订单发货后，您将通过电子邮件收到追踪号码。您也可以在账户仪表盘中查看订单状态。",
    },
    productDescriptions: {
      "daacoo-basic-001": "必备的AI对话伴侣。DaaCoo Basic提供自然的语音交互，识别准确率高达95%，是追求智能日常助手人士的理想之选。",
      "daacoo-pro-001": "提升您的AI对话体验。DaaCoo Pro拥有98%的语音识别准确率、亚秒级响应时间和更大的内存，专为追求极致体验的重度用户打造。",
      "daacoo-family-001": "全家人的AI伙伴。DaaCoo Family支持多用户档案、家长控制和优质音效，是智能家居的完美核心。",
    },
  },
  fr: {
    navbar: {
      home: "Accueil",
      products: "Produits",
      contacts: "Contacts",
      about: "À propos",
      cart: "Panier",
      admin: "Admin",
      login: "Connexion",
      signUp: "S'inscrire",
      logout: "Déconnexion",
      myAccount: "Mon Compte",
      adminPortal: "Portail Admin",
      language: "Langue",
    },
    adminSidebar: {
      title: "DaaCoo Admin",
      dashboard: "Tableau de Bord",
      products: "Produits",
      orders: "Commandes",
      payments: "Paiements",
    },
    adminDashboard: {
      title: "Tableau de Bord",
      totalOrders: "Total Commandes",
      pending: "En Attente",
      paid: "Payé",
      shipped: "Expédié",
      completed: "Terminé",
      salesOverview: "Aperçu des Ventes (30 Derniers Jours)",
      topSellingProducts: "Produits les Plus Vendus",
      totalPageViews: "Vues de Page Totales",
      uniqueVisitors: "Visiteurs Uniques",
      recentOrders: "Commandes Récentes",
      orderId: "N° Commande",
      customer: "Client",
      total: "Total",
      status: "Statut",
      noRecentOrders: "Aucune commande récente",
      lowStockAlerts: "Alertes de Stock Faible",
      product: "Produit",
      version: "Version",
      stock: "Stock",
      noLowStockAlerts: "Aucune alerte de stock faible",
      accessDenied: "Accès Refusé",
      noPermission: "Vous n'avez pas la permission d'accéder à cette page.",
    },
    common: {
      accessDenied: "Accès Refusé",
      noPermission: "Vous n'avez pas la permission d'accéder à cette page.",
      loading: "Chargement...",
      cancel: "Annuler",
      save: "Enregistrer",
      delete: "Supprimer",
      create: "Créer",
      edit: "Modifier",
      add: "Ajouter",
      back: "Retour",
      browseProducts: "Parcourir les Produits",
      shopNow: "Acheter",
      continueShopping: "Continuer les Achats",
      signIn: "Connexion",
      signUp: "Inscription",
      yes: "Oui",
      no: "Non",
      search: "Rechercher",
      filter: "Filtrer",
      sort: "Trier",
      all: "Tout",
      actions: "Actions",
      name: "Nom",
      email: "Email",
      phone: "Téléphone",
      address: "Adresse",
      quantity: "Quantité",
      price: "Prix",
      stock: "Stock",
      version: "Version",
      description: "Description",
      imageUrl: "URL de l'image",
      available: "Disponible",
      confirm: "Confirmer",
      close: "Fermer",
      submit: "Soumettre",
      processing: "Traitement...",
      free: "Gratuit",
      emptyCart: "Votre panier est vide",
      orderId: "N° Commande",
      customer: "Client",
      date: "Date",
      method: "Méthode",
      payment: "Paiement",
      shipping: "Livraison",
      tax: "TVA (10%)",
      subtotal: "Sous-total",
      specs: "Spécifications (JSON)",
      emptyState: "Rien ici pour l'instant.",
      noOrders: "Aucune commande",
      noPayments: "Aucun paiement trouvé",
      noProducts: "Aucun produit trouvé",
      orderSummary: "Récapitulatif",
      shippingInfo: "Informations de Livraison",
      paymentMethod: "Méthode de Paiement",
      fullName: "Nom Complet",
      password: "Mot de passe",
      dontHaveAccount: "Pas encore de compte ?",
      alreadyHaveAccount: "Déjà un compte ?",
      welcomeBack: "Bon Retour",
      createAccount: "Créer un Compte",
      myAccount: "Mon Compte",
      orderHistory: "Historique des Commandes",
      profile: "Profil",
      success: "Succès",
      failed: "Échec",
      addedToCart: "Ajouté au panier",
      failedToLoad: "Échec du chargement",
      failedToAddToCart: "Échec de l'ajout au panier",
      failedToUpdate: "Échec de la mise à jour",
      failedToRemove: "Échec de la suppression",
      failedToSave: "Échec de l'enregistrement",
      failedToDelete: "Échec de la suppression",
      failedToCreate: "Échec de la création",
      availabilityUpdated: "Disponibilité mise à jour",
      orderStatusUpdated: "Statut de la commande mis à jour",
      orderCancelled: "Commande annulée",
      areYouSure: "Êtes-vous sûr ?",
      cannotUndo: "Cette action ne peut pas être annulée.",
      items: "Articles",
      keep: "Garder",
      from: "Du",
      to: "Au",
      export: "Exporter",
      transactionId: "N° Transaction",
      amount: "Montant",
      timestamp: "Horodatage",
      pending: "En Attente",
      paid: "Payé",
      shipped: "Expédié",
      delivered: "Livré",
      cancelled: "Annulé",
      inStock: "En Stock",
      outOfStock: "Rupture de Stock",
      addToCart: "Ajouter au Panier",
      placeOrder: "Passer Commande",
      proceedToCheckout: "Procéder au Paiement",
      qty: "Qté",
      fillRequired: "Veuillez remplir tous les champs obligatoires",
      fillFields: "Veuillez remplir tous les champs",
      notFound: "Non trouvé",
    },
    landing: {
      heroTitle: "Une IA qui Vous Comprend",
      heroSubtitle:
        "Découvrez le futur de la conversation avec DaaCoo — un compagnon IA intelligent qui apprend vos préférences, parle votre langue et garde vos conversations privées et sécurisées.",
      shopNow: "Acheter",
      exploreDevices: "Explorer les Appareils",
      productImage: "Image du Produit",
      productName: "Appareil IA DaaCoo",
      whyChoose: "Pourquoi Choisir ",
      whyChooseSubtitle:
        "Conçu avec une technologie IA de pointe pour offrir une expérience de conversation fluide.",
      feature1Title: "Conversations Naturelles",
      feature1Desc:
        "Un moteur NLP avancé permet des dialogues fluides et humains qui s'adaptent à votre style de parole.",
      feature2Title: "Apprentissage Intelligent",
      feature2Desc:
        "DaaCoo apprend vos préférences au fil du temps, offrant des réponses de plus en plus personnalisées.",
      feature3Title: "Confidentialité d'Abord",
      feature3Desc:
        "Le chiffrement de bout en bout et le traitement sur l'appareil gardent vos conversations totalement privées.",
      feature4Title: "Multi-langue",
      feature4Desc:
        "Parle couramment plus de 40 langues avec traduction en temps réel pour une communication mondiale fluide.",
      ctaTitle: "Prêt à Rencontrer Votre Compagnon IA ?",
      ctaSubtitle:
        "Rejoignez des milliers d'utilisateurs qui ont transformé leurs conversations quotidiennes avec DaaCoo.",
      browseProducts: "Parcourir les Produits",
    },
    products: {
      title: "Produits",
      subtitle: "Découvrez le DaaCoo parfait pour vos besoins",
      versionFilter: "Version :",
      sortByName: "Trier par Nom",
      sortByPriceLow: "Prix : Croissant",
      sortByPriceHigh: "Prix : Décroissant",
      sortByPopularity: "Popularité",
      add: "Ajouter",
      noProducts: "Aucun produit trouvé",
      viewDetails: "Voir les Détails",
      onlyNLeft: "Plus que {count} en stock",
    },
    productDetail: {
      backToProducts: "Retour aux Produits",
      inStock: "En Stock",
      outOfStock: "Rupture de Stock",
      quantity: "Quantité :",
      addToCart: "Ajouter au Panier",
      technicalSpecs: "Spécifications Techniques",
      processor: "Processeur",
      connectivity: "Connectivité",
      battery: "Batterie",
      audio: "Audio",
      sampleConversation: "Exemple de Conversation",
      demoMessage1: "Hé DaaCoo, quel temps fait-il aujourd'hui ?",
      demoMessage2:
        "Bonjour ! Il fait 22°C et le soleil brille chez vous. Parfait pour une promenade !",
      demoMessage3: "Peux-tu me rappeler d'appeler Maman à 18h ?",
      demoMessage4:
        "Bien sûr ! J'ai défini un rappel pour 18h00 pour appeler Maman.",
      addedToCart: "Ajouté au panier",
      failedToAddToCart: "Échec de l'ajout au panier",
      notFound: "Produit non trouvé",
      processorDefault: "Moteur Neuronal DaaCoo v2",
      connectivityDefault: "Wi-Fi 6 / Bluetooth 5.3",
      batteryDefault: "Jusqu'à 48 heures",
      audioDefault: "Audio Spatial 360°",
      initializing: "Initialisation...",
    },
    cart: {
      title: "Panier",
      emptyTitle: "Votre panier est vide",
      emptyMessage: "Il semble que vous n'ayez encore rien ajouté.",
      browseProducts: "Parcourir les Produits",
      orderSummary: "Récapitulatif",
      subtotal: "Sous-total",
      tax: "TVA (10%)",
      shipping: "Livraison",
      freeShippingHint: "Livraison gratuite pour les commandes de plus de 50€",
      total: "Total",
      proceedToCheckout: "Procéder au Paiement",
      failedToUpdate: "Échec de la mise à jour de la quantité",
      failedToRemove: "Échec de la suppression de l'article",
      itemRemoved: "Article supprimé",
    },
    checkout: {
      title: "Paiement",
      backToCart: "Retour au Panier",
      emptyCart: "Votre panier est vide",
      emptyCartMessage: "Ajoutez des articles avant de payer.",
      shippingInfo: "Informations de Livraison",
      fullName: "Nom Complet",
      fullNamePlaceholder: "Jean Dupont",
      email: "Email",
      emailPlaceholder: "jean@example.com",
      phone: "Téléphone",
      phonePlaceholder: "+33 6 12 34 56 78",
      shippingAddress: "Adresse de Livraison",
      addressPlaceholder: "123 Rue Principale, Ville, Pays",
      paymentMethod: "Méthode de Paiement",
      stripeCard: "Stripe (Carte)",
      alipay: "Alipay",
      wechatPay: "WeChat Pay",
      unionPay: "UnionPay",
      payWithCard: "Payer par Carte",
      stripeInfo: "Vous serez redirigé vers Stripe Checkout. Utilisez la carte de test :",
      testCard: "4242 4242 4242 4242",
      simulatedAlipay: "Alipay Simulé",
      sandboxInfo: "Mode bac à sable — le paiement sera confirmé automatiquement après 2 secondes.",
      simulating: "Simulation du paiement...",
      simulatedWechat: "WeChat Pay Simulé",
      simulatedUnionPay: "UnionPay Simulé",
      cardNumber: "Numéro de Carte",
      cardNumberPlaceholder: "6222 8888 8888 8888",
      expiry: "Expiration",
      expiryPlaceholder: "MM/AA",
      cvv: "CVV",
      cvvPlaceholder: "123",
      orderSummary: "Récapitulatif",
      subtotal: "Sous-total",
      tax: "TVA (10%)",
      shipping: "Livraison",
      free: "Gratuit",
      total: "Total",
      processing: "Traitement...",
      placeOrder: "Passer Commande",
      fillRequired: "Veuillez remplir tous les champs obligatoires",
      orderCreationFailed: "Échec de la création de la commande",
      stripeSessionFailed: "Échec de la session Stripe",
      noCheckoutUrl: "Aucune URL de paiement retournée",
    },
    checkoutSuccess: {
      thankYou: "Merci !",
      orderSuccess: "Votre commande a été passée avec succès.",
      orderId: "N° Commande",
      orderSummary: "Récapitulatif",
      qty: "Qté",
      total: "Total",
      status: "Statut",
      method: "Méthode",
      continueShopping: "Continuer les Achats",
    },
    login: {
      welcomeBack: "Bon Retour",
      signInSubtitle: "Connectez-vous à votre compte DaaCoo",
      email: "Email",
      emailPlaceholder: "vous@example.com",
      password: "Mot de passe",
      passwordPlaceholder: "••••••••",
      signIn: "Connexion",
      dontHaveAccount: "Pas encore de compte ?",
      signUpLink: "Inscrivez-vous",
      fillFields: "Veuillez remplir tous les champs",
      welcomeToast: "Bon retour !",
      loginFailed: "Échec de la connexion",
      showPassword: "Afficher le mot de passe",
      hidePassword: "Masquer le mot de passe",
    },
    register: {
      createAccount: "Créer un Compte",
      joinCommunity: "Rejoignez la communauté DaaCoo",
      name: "Nom",
      namePlaceholder: "Jean Dupont",
      email: "Email",
      emailPlaceholder: "vous@example.com",
      password: "Mot de passe",
      passwordPlaceholder: "••••••••",
      createAccountBtn: "Créer le Compte",
      alreadyHaveAccount: "Déjà un compte ?",
      signInLink: "Connectez-vous",
      fillRequired: "Veuillez remplir tous les champs obligatoires",
      accountCreated: "Compte créé avec succès !",
      registrationFailed: "Échec de l'inscription",
      confirmPassword: "Confirmer le mot de passe",
      confirmPasswordPlaceholder: "••••••••",
      passwordsDoNotMatch: "Les mots de passe ne correspondent pas",
    },
    account: {
      myAccount: "Mon Compte",
      user: "Utilisateur",
      email: "Email",
      phone: "Téléphone",
      orderHistory: "Historique des Commandes",
      noOrders: "Aucune commande",
      shopNow: "Acheter",
      failedToLoadOrders: "Échec du chargement de l'historique",
    },
    adminProducts: {
      title: "Produits",
      addProduct: "Ajouter un Produit",
      name: "Nom",
      version: "Version",
      price: "Prix",
      stock: "Stock",
      available: "Disponible",
      actions: "Actions",
      yes: "Oui",
      no: "Non",
      noProducts: "Aucun produit trouvé",
      editProduct: "Modifier le Produit",
      addProductDialog: "Ajouter un Produit",
      fillDetails: "Remplissez les détails du produit ci-dessous.",
      description: "Description",
      imageUrl: "URL de l'image",
      specsJson: "Spécifications (JSON)",
      specsPlaceholder: '{"clé": "valeur"}',
      availableCheckbox: "Disponible",
      saveChanges: "Enregistrer",
      createProduct: "Créer",
      deleteProduct: "Supprimer le Produit",
      deleteConfirm: "Êtes-vous sûr de vouloir supprimer ce produit ?",
      deleteWarning: "Cette action ne peut pas être annulée.",
      deleteBtn: "Supprimer",
      productUpdated: "Produit mis à jour",
      productCreated: "Produit créé",
      productDeleted: "Produit supprimé",
      failedToLoad: "Échec du chargement des produits",
      failedToSave: "Échec de l'enregistrement",
      failedToDelete: "Échec de la suppression",
      availabilityUpdated: "Disponibilité mise à jour",
      failedToUpdateAvailability: "Échec de la mise à jour",
    },
    adminOrders: {
      title: "Commandes",
      exportCsv: "Exporter CSV",
      statusFilter: "Statut",
      allStatuses: "Tous les statuts",
      from: "Du",
      to: "Au",
      id: "ID",
      customer: "Client",
      email: "Email",
      total: "Total",
      status: "Statut",
      payment: "Paiement",
      date: "Date",
      actions: "Actions",
      na: "N/A",
      noOrders: "Aucune commande trouvée",
      orderItems: "Articles de la Commande",
      itemsInOrder: "Articles dans la commande",
      noItems: "Aucun article dans cette commande",
      cancelOrder: "Annuler la Commande",
      cancelConfirm: "Êtes-vous sûr de vouloir annuler cette commande ?",
      keepOrder: "Non, la garder",
      confirmCancel: "Oui, annuler",
      statusUpdated: "Statut mis à jour",
      failedToUpdateStatus: "Échec de la mise à jour",
      orderCancelled: "Commande annulée",
      failedToCancel: "Échec de l'annulation",
      failedToLoad: "Échec du chargement",
    },
    adminPayments: {
      title: "Paiements",
      all: "Tout",
      transactionId: "N° Transaction",
      orderId: "N° Commande",
      amount: "Montant",
      method: "Méthode",
      status: "Statut",
      timestamp: "Horodatage",
      na: "N/A",
      noPayments: "Aucun paiement trouvé",
    },
    aboutPage: {
      title: "À propos de DaaCoo",
      subtitle: "Pionnier de l'avenir de l'interaction homme-IA",
      ourStory: "Notre Histoire",
      ourStoryText: "Fondée en 2023, DaaCoo est née d'une conviction simple : la technologie doit se sentir naturelle. Notre équipe d'ingénieurs, de designers et de chercheurs en IA s'est réunie autour d'une vision commune — créer un appareil qui ne se contente pas de répondre, mais qui comprend réellement. De notre premier prototype à la dernière génération, nous sommes restés déterminés à repousser les limites de ce qui est possible en IA conversationnelle.",
      mission: "Notre Mission",
      missionText: "Rendre la conversation intelligente et naturelle accessible à tous. Nous croyons que l'IA doit s'adapter aux humains, et non l'inverse. Chaque fonctionnalité que nous construisons, chaque ligne de code que nous écrivons, sert cet objectif unique.",
      vision: "Notre Vision",
      visionText: "Un monde où les barrières linguistiques disparaissent, où chacun dispose d'un compagnon patient et savant, et où la technologie renforce le lien humain plutôt que de le remplacer.",
      values: "Nos Valeurs",
      value1Title: "La Vie Privée d'Abord",
      value1Desc: "Vos conversations vous appartiennent. Nous concevons chaque produit avec le chiffrement de bout en bout et le traitement sur l'appareil comme principes fondamentaux.",
      value2Title: "Conception Centrée sur l'Utilisateur",
      value2Desc: "Nous sommes obsédés par les détails qui rendent les interactions sans effort. De la reconnaissance vocale au timing des réponses, chaque milliseconde compte.",
      value3Title: "Innovation Continue",
      value3Desc: "L'IA évolue rapidement, et nous aussi. Notre équipe recherche, teste et déploie constamment des améliorations pour maintenir DaaCoo à la pointe.",
      value4Title: "Accessibilité Inclusive",
      value4Desc: "Nous construisons pour tout le monde. Nos produits supportent plus de 40 langues et sont conçus avec des fonctionnalités d'accessibilité qui autonomisent les utilisateurs de toutes capacités.",
      team: "Rencontrez l'Équipe",
      teamSubtitle: "Des créateurs passionnés qui construisent l'avenir de la conversation",
    },
    contactPage: {
      title: "Contactez-Nous",
      subtitle: "Nous serions ravis de vous entendre",
      getInTouch: "Prenez Contact",
      getInTouchText: "Vous avez des questions sur DaaCoo ? Vous souhaitez collaborer avec nous ? Ou simplement dire bonjour ? Contactez-nous et notre équipe vous répondra dans les 24 heures.",
      email: "Email",
      phone: "Téléphone",
      address: "Adresse",
      addressValue: "123 Innovation Drive, Tech City, TC 90210",
      formName: "Votre Nom",
      formEmail: "Votre Email",
      formSubject: "Sujet",
      formMessage: "Votre Message",
      formSubmit: "Envoyer le Message",
      formSuccess: "Message envoyé avec succès ! Nous vous répondrons bientôt.",
      faq: "Questions Fréquentes",
      faq1Q: "Quels sont vos horaires de support ?",
      faq1A: "Notre équipe de support client est disponible du lundi au vendredi, de 9h à 18h PST. Nous répondons généralement à toutes les demandes dans les 24 heures.",
      faq2Q: "Proposez-vous des solutions entreprise ?",
      faq2A: "Oui ! Nous proposons des forfaits entreprise personnalisés pour les entreprises souhaitant intégrer la technologie DaaCoo. Contactez notre équipe commerciale pour plus d'informations.",
      faq3Q: "Comment puis-je suivre ma commande ?",
      faq3A: "Une fois votre commande expédiée, vous recevrez un numéro de suivi par email. Vous pouvez également consulter l'état de votre commande dans votre tableau de bord.",
    },
    productDescriptions: {
      "daacoo-basic-001": "Le compagnon de conversation IA essentiel. DaaCoo Basic offre une interaction vocale naturelle avec 95 % de précision de reconnaissance, parfait pour les personnes recherçant un assistant quotidien intelligent.",
      "daacoo-pro-001": "Élevez vos conversations IA. DaaCoo Pro offre 98 % de précision de reconnaissance vocale, des temps de réponse inférieurs à la seconde et une mémoire avancée pour les utilisateurs exigeants.",
      "daacoo-family-001": "L'IA pour toute la famille. DaaCoo Family prend en charge les profils multi-utilisateurs, le contrôle parental et une qualité audio premium. Le centre idéal d'une maison intelligente.",
    },
  },
  es: {
    navbar: {
      home: "Inicio",
      products: "Productos",
      contacts: "Contactos",
      about: "Nosotros",
      cart: "Carrito",
      admin: "Admin",
      login: "Iniciar Sesión",
      signUp: "Registrarse",
      logout: "Cerrar Sesión",
      myAccount: "Mi Cuenta",
      adminPortal: "Portal Admin",
      language: "Idioma",
    },
    adminSidebar: {
      title: "DaaCoo Admin",
      dashboard: "Panel",
      products: "Productos",
      orders: "Pedidos",
      payments: "Pagos",
    },
    adminDashboard: {
      title: "Panel",
      totalOrders: "Total Pedidos",
      pending: "Pendiente",
      paid: "Pagado",
      shipped: "Enviado",
      completed: "Completado",
      salesOverview: "Resumen de Ventas (Últimos 30 Días)",
      topSellingProducts: "Productos Más Vendidos",
      totalPageViews: "Vistas de Página Totales",
      uniqueVisitors: "Visitantes Únicos",
      recentOrders: "Pedidos Recientes",
      orderId: "ID Pedido",
      customer: "Cliente",
      total: "Total",
      status: "Estado",
      noRecentOrders: "No hay pedidos recientes",
      lowStockAlerts: "Alertas de Bajo Stock",
      product: "Producto",
      version: "Versión",
      stock: "Stock",
      noLowStockAlerts: "No hay alertas de bajo stock",
      accessDenied: "Acceso Denegado",
      noPermission: "No tienes permiso para acceder a esta página.",
    },
    common: {
      accessDenied: "Acceso Denegado",
      noPermission: "No tienes permiso para acceder a esta página.",
      loading: "Cargando...",
      cancel: "Cancelar",
      save: "Guardar",
      delete: "Eliminar",
      create: "Crear",
      edit: "Editar",
      add: "Añadir",
      back: "Atrás",
      browseProducts: "Ver Productos",
      shopNow: "Comprar",
      continueShopping: "Seguir Comprando",
      signIn: "Iniciar Sesión",
      signUp: "Registrarse",
      yes: "Sí",
      no: "No",
      search: "Buscar",
      filter: "Filtrar",
      sort: "Ordenar",
      all: "Todos",
      actions: "Acciones",
      name: "Nombre",
      email: "Email",
      phone: "Teléfono",
      address: "Dirección",
      quantity: "Cantidad",
      price: "Precio",
      stock: "Stock",
      version: "Versión",
      description: "Descripción",
      imageUrl: "URL de Imagen",
      available: "Disponible",
      confirm: "Confirmar",
      close: "Cerrar",
      submit: "Enviar",
      processing: "Procesando...",
      free: "Gratis",
      emptyCart: "Tu carrito está vacío",
      orderId: "ID Pedido",
      customer: "Cliente",
      date: "Fecha",
      method: "Método",
      payment: "Pago",
      shipping: "Envío",
      tax: "Impuesto (10%)",
      subtotal: "Subtotal",
      specs: "Especificaciones (JSON)",
      emptyState: "Nada aquí todavía.",
      noOrders: "Sin pedidos",
      noPayments: "No se encontraron pagos",
      noProducts: "No se encontraron productos",
      orderSummary: "Resumen del Pedido",
      shippingInfo: "Información de Envío",
      paymentMethod: "Método de Pago",
      fullName: "Nombre Completo",
      password: "Contraseña",
      dontHaveAccount: "¿No tienes cuenta?",
      alreadyHaveAccount: "¿Ya tienes cuenta?",
      welcomeBack: "Bienvenido de Nuevo",
      createAccount: "Crear Cuenta",
      myAccount: "Mi Cuenta",
      orderHistory: "Historial de Pedidos",
      profile: "Perfil",
      success: "Éxito",
      failed: "Fallido",
      addedToCart: "Añadido al carrito",
      failedToLoad: "Error al cargar",
      failedToAddToCart: "Error al añadir al carrito",
      failedToUpdate: "Error al actualizar",
      failedToRemove: "Error al eliminar",
      failedToSave: "Error al guardar",
      failedToDelete: "Error al eliminar",
      failedToCreate: "Error al crear",
      availabilityUpdated: "Disponibilidad actualizada",
      orderStatusUpdated: "Estado del pedido actualizado",
      orderCancelled: "Pedido cancelado",
      areYouSure: "¿Estás seguro?",
      cannotUndo: "Esta acción no se puede deshacer.",
      items: "Artículos",
      keep: "Mantener",
      from: "Desde",
      to: "Hasta",
      export: "Exportar",
      transactionId: "ID Transacción",
      amount: "Monto",
      timestamp: "Marca de Tiempo",
      pending: "Pendiente",
      paid: "Pagado",
      shipped: "Enviado",
      delivered: "Entregado",
      cancelled: "Cancelado",
      inStock: "En Stock",
      outOfStock: "Agotado",
      addToCart: "Añadir al Carrito",
      placeOrder: "Realizar Pedido",
      proceedToCheckout: "Proceder al Pago",
      qty: "Cant",
      fillRequired: "Por favor complete todos los campos requeridos",
      fillFields: "Por favor complete todos los campos",
      notFound: "No encontrado",
    },
    landing: {
      heroTitle: "IA que te Entiende",
      heroSubtitle:
        "Experimenta el futuro de la conversación con DaaCoo — un dispositivo compañero de IA inteligente que aprende tus preferencias, habla tu idioma y mantiene tus conversaciones privadas y seguras.",
      shopNow: "Comprar",
      exploreDevices: "Explorar Dispositivos",
      productImage: "Imagen del Producto",
      productName: "Dispositivo IA DaaCoo",
      whyChoose: "¿Por qué Elegir ",
      whyChooseSubtitle:
        "Construido con tecnología de IA de vanguardia para ofrecer una experiencia de conversación fluida.",
      feature1Title: "Conversaciones Naturales",
      feature1Desc:
        "Un motor NLP avanzado permite diálogos fluidos y humanos que se adaptan a tu estilo de habla.",
      feature2Title: "Aprendizaje Inteligente",
      feature2Desc:
        "DaaCoo aprende tus preferencias con el tiempo, ofreciendo respuestas cada vez más personalizadas.",
      feature3Title: "Privacidad Primero",
      feature3Desc:
        "El cifrado de extremo a extremo y el procesamiento en el dispositivo mantienen tus conversaciones completamente privadas.",
      feature4Title: "Multi-idioma",
      feature4Desc:
        "Fluido en más de 40 idiomas con traducción en tiempo real para una comunicación global fluida.",
      ctaTitle: "¿Listo para Conocer tu Compañero de IA?",
      ctaSubtitle:
        "Únete a miles de usuarios que han transformado sus conversaciones diarias con DaaCoo.",
      browseProducts: "Ver Productos",
    },
    products: {
      title: "Productos",
      subtitle: "Descubre el DaaCoo perfecto para ti",
      versionFilter: "Versión:",
      sortByName: "Ordenar por Nombre",
      sortByPriceLow: "Precio: Menor a Mayor",
      sortByPriceHigh: "Precio: Mayor a Menor",
      sortByPopularity: "Popularidad",
      add: "Añadir",
      noProducts: "No se encontraron productos",
      viewDetails: "Ver Detalles",
      onlyNLeft: "Solo quedan {count}",
    },
    productDetail: {
      backToProducts: "Volver a Productos",
      inStock: "En Stock",
      outOfStock: "Agotado",
      quantity: "Cantidad:",
      addToCart: "Añadir al Carrito",
      technicalSpecs: "Especificaciones Técnicas",
      processor: "Procesador",
      connectivity: "Conectividad",
      battery: "Batería",
      audio: "Audio",
      sampleConversation: "Conversación de Ejemplo",
      demoMessage1: "Oye DaaCoo, ¿qué tiempo hace hoy?",
      demoMessage2:
        "¡Buenos días! Hace 22°C y está soleado en tu área. ¡Día perfecto para caminar!",
      demoMessage3: "¿Puedes recordarme que llame a Mamá a las 6pm?",
      demoMessage4:
        "¡Por supuesto! He establecido un recordatorio para las 6:00 PM para llamar a Mamá.",
      addedToCart: "Añadido al carrito",
      failedToAddToCart: "Error al añadir al carrito",
      notFound: "Producto no encontrado",
      processorDefault: "Motor Neural DaaCoo v2",
      connectivityDefault: "Wi-Fi 6 / Bluetooth 5.3",
      batteryDefault: "Hasta 48 horas",
      audioDefault: "Audio Espacial 360°",
      initializing: "Inicializando...",
    },
    cart: {
      title: "Carrito",
      emptyTitle: "Tu carrito está vacío",
      emptyMessage: "Parece que aún no has añadido ningún artículo.",
      browseProducts: "Ver Productos",
      orderSummary: "Resumen del Pedido",
      subtotal: "Subtotal",
      tax: "Impuesto (10%)",
      shipping: "Envío",
      freeShippingHint: "Envío gratis en pedidos superiores a $50",
      total: "Total",
      proceedToCheckout: "Proceder al Pago",
      failedToUpdate: "Error al actualizar cantidad",
      failedToRemove: "Error al eliminar artículo",
      itemRemoved: "Artículo eliminado",
    },
    checkout: {
      title: "Pago",
      backToCart: "Volver al Carrito",
      emptyCart: "Tu carrito está vacío",
      emptyCartMessage: "Añade algunos artículos antes de pagar.",
      shippingInfo: "Información de Envío",
      fullName: "Nombre Completo",
      fullNamePlaceholder: "Juan Pérez",
      email: "Email",
      emailPlaceholder: "juan@example.com",
      phone: "Teléfono",
      phonePlaceholder: "+34 612 345 678",
      shippingAddress: "Dirección de Envío",
      addressPlaceholder: "Calle Principal 123, Ciudad, País",
      paymentMethod: "Método de Pago",
      stripeCard: "Stripe (Tarjeta)",
      alipay: "Alipay",
      wechatPay: "WeChat Pay",
      unionPay: "UnionPay",
      payWithCard: "Pagar con Tarjeta",
      stripeInfo: "Serás redirigido a Stripe Checkout. Usa la tarjeta de prueba:",
      testCard: "4242 4242 4242 4242",
      simulatedAlipay: "Alipay Simulado",
      sandboxInfo: "Modo sandbox — el pago se confirmará automáticamente después de 2 segundos.",
      simulating: "Simulando pago...",
      simulatedWechat: "WeChat Pay Simulado",
      simulatedUnionPay: "UnionPay Simulado",
      cardNumber: "Número de Tarjeta",
      cardNumberPlaceholder: "6222 8888 8888 8888",
      expiry: "Caducidad",
      expiryPlaceholder: "MM/AA",
      cvv: "CVV",
      cvvPlaceholder: "123",
      orderSummary: "Resumen del Pedido",
      subtotal: "Subtotal",
      tax: "Impuesto (10%)",
      shipping: "Envío",
      free: "Gratis",
      total: "Total",
      processing: "Procesando...",
      placeOrder: "Realizar Pedido",
      fillRequired: "Por favor complete todos los campos requeridos",
      orderCreationFailed: "Error al crear el pedido",
      stripeSessionFailed: "Error en la sesión de Stripe",
      noCheckoutUrl: "No se devolvió URL de pago",
    },
    checkoutSuccess: {
      thankYou: "¡Gracias!",
      orderSuccess: "Tu pedido se ha realizado correctamente.",
      orderId: "ID Pedido",
      orderSummary: "Resumen del Pedido",
      qty: "Cant",
      total: "Total",
      status: "Estado",
      method: "Método",
      continueShopping: "Seguir Comprando",
    },
    login: {
      welcomeBack: "Bienvenido de Nuevo",
      signInSubtitle: "Inicia sesión en tu cuenta DaaCoo",
      email: "Email",
      emailPlaceholder: "tu@example.com",
      password: "Contraseña",
      passwordPlaceholder: "••••••••",
      signIn: "Iniciar Sesión",
      dontHaveAccount: "¿No tienes cuenta?",
      signUpLink: "Regístrate",
      fillFields: "Por favor complete todos los campos",
      welcomeToast: "¡Bienvenido de nuevo!",
      loginFailed: "Error al iniciar sesión",
      showPassword: "Mostrar contraseña",
      hidePassword: "Ocultar contraseña",
    },
    register: {
      createAccount: "Crear Cuenta",
      joinCommunity: "Únete a la comunidad DaaCoo",
      name: "Nombre",
      namePlaceholder: "Juan Pérez",
      email: "Email",
      emailPlaceholder: "tu@example.com",
      password: "Contraseña",
      passwordPlaceholder: "••••••••",
      createAccountBtn: "Crear Cuenta",
      alreadyHaveAccount: "¿Ya tienes cuenta?",
      signInLink: "Inicia sesión",
      fillRequired: "Por favor complete todos los campos requeridos",
      accountCreated: "¡Cuenta creada exitosamente!",
      registrationFailed: "Error en el registro",
      confirmPassword: "Confirmar contraseña",
      confirmPasswordPlaceholder: "••••••••",
      passwordsDoNotMatch: "Las contraseñas no coinciden",
    },
    account: {
      myAccount: "Mi Cuenta",
      user: "Usuario",
      email: "Email",
      phone: "Teléfono",
      orderHistory: "Historial de Pedidos",
      noOrders: "Sin pedidos",
      shopNow: "Comprar",
      failedToLoadOrders: "Error al cargar el historial",
    },
    adminProducts: {
      title: "Productos",
      addProduct: "Añadir Producto",
      name: "Nombre",
      version: "Versión",
      price: "Precio",
      stock: "Stock",
      available: "Disponible",
      actions: "Acciones",
      yes: "Sí",
      no: "No",
      noProducts: "No se encontraron productos",
      editProduct: "Editar Producto",
      addProductDialog: "Añadir Producto",
      fillDetails: "Completa los detalles del producto a continuación.",
      description: "Descripción",
      imageUrl: "URL de Imagen",
      specsJson: "Especificaciones (JSON)",
      specsPlaceholder: '{"clave": "valor"}',
      availableCheckbox: "Disponible",
      saveChanges: "Guardar Cambios",
      createProduct: "Crear Producto",
      deleteProduct: "Eliminar Producto",
      deleteConfirm: "¿Estás seguro de que quieres eliminar este producto?",
      deleteWarning: "Esta acción no se puede deshacer.",
      deleteBtn: "Eliminar",
      productUpdated: "Producto actualizado",
      productCreated: "Producto creado",
      productDeleted: "Producto eliminado",
      failedToLoad: "Error al cargar productos",
      failedToSave: "Error al guardar producto",
      failedToDelete: "Error al eliminar producto",
      availabilityUpdated: "Disponibilidad actualizada",
      failedToUpdateAvailability: "Error al actualizar disponibilidad",
    },
    adminOrders: {
      title: "Pedidos",
      exportCsv: "Exportar CSV",
      statusFilter: "Estado",
      allStatuses: "Todos los estados",
      from: "Desde",
      to: "Hasta",
      id: "ID",
      customer: "Cliente",
      email: "Email",
      total: "Total",
      status: "Estado",
      payment: "Pago",
      date: "Fecha",
      actions: "Acciones",
      na: "N/A",
      noOrders: "No se encontraron pedidos",
      orderItems: "Artículos del Pedido",
      itemsInOrder: "Artículos en el pedido",
      noItems: "No hay artículos en este pedido",
      cancelOrder: "Cancelar Pedido",
      cancelConfirm: "¿Estás seguro de que quieres cancelar este pedido?",
      keepOrder: "No, mantenerlo",
      confirmCancel: "Sí, cancelar",
      statusUpdated: "Estado actualizado",
      failedToUpdateStatus: "Error al actualizar estado",
      orderCancelled: "Pedido cancelado",
      failedToCancel: "Error al cancelar pedido",
      failedToLoad: "Error al cargar pedidos",
    },
    adminPayments: {
      title: "Pagos",
      all: "Todos",
      transactionId: "ID Transacción",
      orderId: "ID Pedido",
      amount: "Monto",
      method: "Método",
      status: "Estado",
      timestamp: "Marca de Tiempo",
      na: "N/A",
      noPayments: "No se encontraron pagos",
    },
    aboutPage: {
      title: "Sobre DaaCoo",
      subtitle: "Pioneros del futuro de la interacción humano-IA",
      ourStory: "Nuestra Historia",
      ourStoryText: "Fundada en 2023, DaaCoo nació de una creencia simple: la tecnología debe sentirse natural. Nuestro equipo de ingenieros, diseñadores e investigadores de IA se unió con una visión compartida: crear un dispositivo que no solo responda, sino que realmente comprenda. Desde nuestro primer prototipo hasta la última generación, nos hemos mantenido comprometidos con superar los límites de lo posible en IA conversacional.",
      mission: "Nuestra Misión",
      missionText: "Hacer que la conversación inteligente y natural sea accesible para todos. Creemos que la IA debe adaptarse a los humanos, no al revés. Cada función que construimos, cada línea de código que escribimos, sirve a este propósito único.",
      vision: "Nuestra Visión",
      visionText: "Un mundo donde las barreras lingüísticas se disuelvan, donde todos tengan un compañero paciente y conocedor, y donde la tecnología mejore la conexión humana en lugar de reemplazarla.",
      values: "Nuestros Valores",
      value1Title: "Privacidad Primero",
      value1Desc: "Tus conversaciones te pertenecen. Diseñamos cada producto con el cifrado de extremo a extremo y el procesamiento en el dispositivo como principios fundamentales.",
      value2Title: "Diseño Centrado en el Usuario",
      value2Desc: "Nos obsesionamos con los detalles que hacen que las interacciones sean fluidas. Desde el reconocimiento de voz hasta el tiempo de respuesta, cada milisegundo importa.",
      value3Title: "Innovación Continua",
      value3Desc: "La IA evoluciona rápidamente, y nosotros también. Nuestro equipo investiga, prueba e implementa constantemente mejoras para mantener a DaaCoo a la vanguardia.",
      value4Title: "Accesibilidad Inclusiva",
      value4Desc: "Construimos para todos. Nuestros productos admiten más de 40 idiomas y están diseñados con funciones de accesibilidad que empoderan a usuarios de todas las capacidades.",
      team: "Conoce al Equipo",
      teamSubtitle: "Creadores apasionados construyendo el futuro de la conversación",
    },
    contactPage: {
      title: "Contáctanos",
      subtitle: "Nos encantaría saber de ti",
      getInTouch: "Ponte en Contacto",
      getInTouchText: "¿Tienes preguntas sobre DaaCoo? ¿Quieres asociarte con nosotros? ¿O simplemente saludar? Ponte en contacto y nuestro equipo te responderá en un plazo de 24 horas.",
      email: "Correo Electrónico",
      phone: "Teléfono",
      address: "Dirección",
      addressValue: "123 Innovation Drive, Tech City, TC 90210",
      formName: "Tu Nombre",
      formEmail: "Tu Correo",
      formSubject: "Asunto",
      formMessage: "Tu Mensaje",
      formSubmit: "Enviar Mensaje",
      formSuccess: "¡Mensaje enviado con éxito! Te responderemos pronto.",
      faq: "Preguntas Frecuentes",
      faq1Q: "¿Cuáles son sus horarios de soporte?",
      faq1A: "Nuestro equipo de soporte está disponible de lunes a viernes, de 9 AM a 6 PM PST. Normalmente respondemos a todas las consultas dentro de las 24 horas.",
      faq2Q: "¿Ofrecen soluciones empresariales?",
      faq2A: "¡Sí! Ofrecemos paquetes empresariales personalizados para empresas que desean integrar la tecnología DaaCoo. Contacta a nuestro equipo de ventas para más información.",
      faq3Q: "¿Cómo puedo rastrear mi pedido?",
      faq3A: "Una vez que tu pedido sea enviado, recibirás un número de seguimiento por correo electrónico. También puedes ver el estado de tu pedido en tu panel de cuenta.",
    },
    productDescriptions: {
      "daacoo-basic-001": "El compañero de conversación con IA esencial. DaaCoo Basic ofrece interacción por voz natural con un 95 % de precisión de reconocimiento, perfecto para quienes buscan un asistente diario inteligente.",
      "daacoo-pro-001": "Eleva tus conversaciones con IA. DaaCoo Pro cuenta con un 98 % de precisión en el reconocimiento de voz, tiempos de respuesta inferiores al segundo y memoria avanzada para usuarios exigentes.",
      "daacoo-family-001": "IA para toda la familia. DaaCoo Family admite perfiles de usuario múltiples, controles parentales y calidad de audio premium. El centro perfecto para un hogar inteligente.",
    },
  },
  ar: {
    navbar: {
      home: "الرئيسية",
      products: "المنتجات",
      contacts: "اتصل بنا",
      about: "من نحن",
      cart: "عربة التسوق",
      admin: "المشرف",
      login: "تسجيل الدخول",
      signUp: "إنشاء حساب",
      logout: "تسجيل الخروج",
      myAccount: "حسابي",
      adminPortal: "بوابة المشرف",
      language: "اللغة",
    },
    adminSidebar: {
      title: "DaaCoo المشرف",
      dashboard: "لوحة التحكم",
      products: "المنتجات",
      orders: "الطلبات",
      payments: "المدفوعات",
    },
    adminDashboard: {
      title: "لوحة التحكم",
      totalOrders: "إجمالي الطلبات",
      pending: "معلق",
      paid: "مدفوع",
      shipped: "تم الشحن",
      completed: "مكتمل",
      salesOverview: "نظرة عامة على المبيعات (آخر 30 يومًا)",
      topSellingProducts: "المنتجات الأكثر مبيعًا",
      totalPageViews: "إجمالي مشاهدات الصفحة",
      uniqueVisitors: "زوار فريدون",
      recentOrders: "الطلبات الأخيرة",
      orderId: "رقم الطلب",
      customer: "العميل",
      total: "الإجمالي",
      status: "الحالة",
      noRecentOrders: "لا توجد طلبات حديثة",
      lowStockAlerts: "تنبيهات انخفاض المخزون",
      product: "المنتج",
      version: "الإصدار",
      stock: "المخزون",
      noLowStockAlerts: "لا توجد تنبيهات انخفاض المخزون",
      accessDenied: "تم رفض الوصول",
      noPermission: "ليس لديك إذن للوصول إلى هذه الصفحة.",
    },
    common: {
      accessDenied: "تم رفض الوصول",
      noPermission: "ليس لديك إذن للوصول إلى هذه الصفحة.",
      loading: "جارٍ التحميل...",
      cancel: "إلغاء",
      save: "حفظ",
      delete: "حذف",
      create: "إنشاء",
      edit: "تعديل",
      add: "إضافة",
      back: "رجوع",
      browseProducts: "تصفح المنتجات",
      shopNow: "تسوق الآن",
      continueShopping: "مواصلة التسوق",
      signIn: "تسجيل الدخول",
      signUp: "إنشاء حساب",
      yes: "نعم",
      no: "لا",
      search: "بحث",
      filter: "تصفية",
      sort: "ترتيب",
      all: "الكل",
      actions: "إجراءات",
      name: "الاسم",
      email: "البريد الإلكتروني",
      phone: "الهاتف",
      address: "العنوان",
      quantity: "الكمية",
      price: "السعر",
      stock: "المخزون",
      version: "الإصدار",
      description: "الوصف",
      imageUrl: "رابط الصورة",
      available: "متاح",
      confirm: "تأكيد",
      close: "إغلاق",
      submit: "إرسال",
      processing: "جارٍ المعالجة...",
      free: "مجاني",
      emptyCart: "عربة التسوق فارغة",
      orderId: "رقم الطلب",
      customer: "العميل",
      date: "التاريخ",
      method: "الطريقة",
      payment: "الدفع",
      shipping: "الشحن",
      tax: "الضريبة (10%)",
      subtotal: "المجموع الفرعي",
      specs: "المواصفات (JSON)",
      emptyState: "لا يوجد شيء هنا بعد.",
      noOrders: "لا توجد طلبات",
      noPayments: "لا توجد مدفوعات",
      noProducts: "لا توجد منتجات",
      orderSummary: "ملخص الطلب",
      shippingInfo: "معلومات الشحن",
      paymentMethod: "طريقة الدفع",
      fullName: "الاسم الكامل",
      password: "كلمة المرور",
      dontHaveAccount: "ليس لديك حساب؟",
      alreadyHaveAccount: "لديك حساب بالفعل؟",
      welcomeBack: "مرحبًا بعودتك",
      createAccount: "إنشاء حساب",
      myAccount: "حسابي",
      orderHistory: "تاريخ الطلبات",
      profile: "الملف الشخصي",
      success: "نجاح",
      failed: "فشل",
      addedToCart: "تمت الإضافة إلى العربة",
      failedToLoad: "فشل التحميل",
      failedToAddToCart: "فشل الإضافة إلى العربة",
      failedToUpdate: "فشل التحديث",
      failedToRemove: "فشل الإزالة",
      failedToSave: "فشل الحفظ",
      failedToDelete: "فشل الحذف",
      failedToCreate: "فشل الإنشاء",
      availabilityUpdated: "تم تحديث التوفر",
      orderStatusUpdated: "تم تحديث حالة الطلب",
      orderCancelled: "تم إلغاء الطلب",
      areYouSure: "هل أنت متأكد؟",
      cannotUndo: "لا يمكن التراجع عن هذا الإجراء.",
      items: "العناصر",
      keep: "احتفظ",
      from: "من",
      to: "إلى",
      export: "تصدير",
      transactionId: "رقم المعاملة",
      amount: "المبلغ",
      timestamp: "الطابع الزمني",
      pending: "معلق",
      paid: "مدفوع",
      shipped: "تم الشحن",
      delivered: "تم التوصيل",
      cancelled: "ملغى",
      inStock: "متوفر",
      outOfStock: "غير متوفر",
      addToCart: "أضف إلى العربة",
      placeOrder: "تقديم الطلب",
      proceedToCheckout: "الانتقال إلى الدفع",
      qty: "الكمية",
      fillRequired: "يرجى ملء جميع الحقول المطلوبة",
      fillFields: "يرجى ملء جميع الحقول",
      notFound: "غير موجود",
    },
    landing: {
      heroTitle: "ذكاء اصطناعي يفهمك",
      heroSubtitle:
        "جرب مستقبل المحادثة مع DaaCoo — جهاز رفيق ذكاء اصطناعي يتعلم تفضيلاتك ويتكلم لغتك ويحافظ على خصوصية محادثاتك وأمانها.",
      shopNow: "تسوق الآن",
      exploreDevices: "استكشف الأجهزة",
      productImage: "صورة المنتج",
      productName: "جهاز DaaCoo الذكي",
      whyChoose: "لماذا تختار ",
      whyChooseSubtitle:
        "بني بأحدث تقنيات الذكاء الاصطناعي لتقديم تجربة محادثة سلسة.",
      feature1Title: "محادثات طبيعية",
      feature1Desc:
        "محرك NLP متقدم يتيح حوارًا سلسًا شبيهًا بالبشر يتكيف مع أسلوبك في الكلام.",
      feature2Title: "تعلم ذكي",
      feature2Desc:
        "يتعلم DaaCoo تفضيلاتك مع الوقت، مقدمًا استجابات شخصية بشكل متزايد.",
      feature3Title: "الخصوصية أولاً",
      feature3Desc:
        "التشفير من طرف إلى طرف والمعالجة على الجهاز تحافظ على خصوصية محادثاتك بالكامل.",
      feature4Title: "متعدد اللغات",
      feature4Desc:
        "طلاقة في أكثر من 40 لغة مع ترجمة فورية لتواصل عالمي سلس.",
      ctaTitle: "مستعد لمقابلة رفيقك الذكي؟",
      ctaSubtitle:
        "انضم إلى آلاف المستخدمين الذين حولوا محادثاتهم اليومية مع DaaCoo.",
      browseProducts: "تصفح المنتجات",
    },
    products: {
      title: "المنتجات",
      subtitle: "اكتشف DaaCoo المثالي لاحتياجاتك",
      versionFilter: "الإصدار:",
      sortByName: "ترتيب حسب الاسم",
      sortByPriceLow: "السعر: من الأقل إلى الأعلى",
      sortByPriceHigh: "السعر: من الأعلى إلى الأقل",
      sortByPopularity: "الشعبية",
      add: "إضافة",
      noProducts: "لا توجد منتجات",
      viewDetails: "عرض التفاصيل",
      onlyNLeft: "تبقى {count} فقط",
    },
    productDetail: {
      backToProducts: "العودة إلى المنتجات",
      inStock: "متوفر",
      outOfStock: "غير متوفر",
      quantity: "الكمية:",
      addToCart: "أضف إلى العربة",
      technicalSpecs: "المواصفات التقنية",
      processor: "المعالج",
      connectivity: "الاتصال",
      battery: "البطارية",
      audio: "الصوت",
      sampleConversation: "محادثة نموذجية",
      demoMessage1: "مرحبًا DaaCoo، كيف هو الطقس اليوم؟",
      demoMessage2:
        "صباح الخير! درجة الحرارة 22 درجة مئوية والجو مشمس في منطقتك. يوم مثالي للمشي!",
      demoMessage3: "هل يمكنك تذكيري بالاتصال بأمي في الساعة 6 مساءً؟",
      demoMessage4:
        "بالطبع! لقد قمت بتعيين تذكير في الساعة 6:00 مساءً للاتصال بأمك.",
      addedToCart: "تمت الإضافة إلى العربة",
      failedToAddToCart: "فشل الإضافة إلى العربة",
      notFound: "المنتج غير موجود",
      processorDefault: "محرك DaaCoo العصبي v2",
      connectivityDefault: "Wi-Fi 6 / Bluetooth 5.3",
      batteryDefault: "حتى 48 ساعة",
      audioDefault: "صوت محيطي 360°",
      initializing: "جارٍ التهيئة...",
    },
    cart: {
      title: "عربة التسوق",
      emptyTitle: "عربة التسوق فارغة",
      emptyMessage: "يبدو أنك لم تضف أي عناصر بعد.",
      browseProducts: "تصفح المنتجات",
      orderSummary: "ملخص الطلب",
      subtotal: "المجموع الفرعي",
      tax: "الضريبة (10%)",
      shipping: "الشحن",
      freeShippingHint: "شحن مجاني للطلبات التي تزيد عن 50 دولارًا",
      total: "الإجمالي",
      proceedToCheckout: "الانتقال إلى الدفع",
      failedToUpdate: "فشل تحديث الكمية",
      failedToRemove: "فشل إزالة العنصر",
      itemRemoved: "تمت إزالة العنصر",
    },
    checkout: {
      title: "الدفع",
      backToCart: "العودة إلى العربة",
      emptyCart: "عربة التسوق فارغة",
      emptyCartMessage: "أضف بعض العناصر قبل الدفع.",
      shippingInfo: "معلومات الشحن",
      fullName: "الاسم الكامل",
      fullNamePlaceholder: "أحمد محمد",
      email: "البريد الإلكتروني",
      emailPlaceholder: "ahmed@example.com",
      phone: "الهاتف",
      phonePlaceholder: "+966 50 123 4567",
      shippingAddress: "عنوان الشحن",
      addressPlaceholder: "123 شارع الرئيسي، المدينة، الدولة",
      paymentMethod: "طريقة الدفع",
      stripeCard: "Stripe (بطاقة)",
      alipay: "Alipay",
      wechatPay: "WeChat Pay",
      unionPay: "UnionPay",
      payWithCard: "الدفع بالبطاقة",
      stripeInfo: "سيتم إعادة توجيهك إلى Stripe Checkout. استخدم بطاقة الاختبار:",
      testCard: "4242 4242 4242 4242",
      simulatedAlipay: "Alipay محاكى",
      sandboxInfo: "وضع الحماية — سيتم تأكيد الدفع تلقائيًا بعد 2 ثانية.",
      simulating: "جارٍ محاكاة الدفع...",
      simulatedWechat: "WeChat Pay محاكى",
      simulatedUnionPay: "UnionPay محاكى",
      cardNumber: "رقم البطاقة",
      cardNumberPlaceholder: "6222 8888 8888 8888",
      expiry: "تاريخ الانتهاء",
      expiryPlaceholder: "MM/YY",
      cvv: "CVV",
      cvvPlaceholder: "123",
      orderSummary: "ملخص الطلب",
      subtotal: "المجموع الفرعي",
      tax: "الضريبة (10%)",
      shipping: "الشحن",
      free: "مجاني",
      total: "الإجمالي",
      processing: "جارٍ المعالجة...",
      placeOrder: "تقديم الطلب",
      fillRequired: "يرجى ملء جميع الحقول المطلوبة",
      orderCreationFailed: "فشل إنشاء الطلب",
      stripeSessionFailed: "فشل جلسة Stripe",
      noCheckoutUrl: "لم يتم إرجاع رابط الدفع",
    },
    checkoutSuccess: {
      thankYou: "شكرًا لك!",
      orderSuccess: "تم تقديم طلبك بنجاح.",
      orderId: "رقم الطلب",
      orderSummary: "ملخص الطلب",
      qty: "الكمية",
      total: "الإجمالي",
      status: "الحالة",
      method: "الطريقة",
      continueShopping: "مواصلة التسوق",
    },
    login: {
      welcomeBack: "مرحبًا بعودتك",
      signInSubtitle: "تسجيل الدخول إلى حساب DaaCoo الخاص بك",
      email: "البريد الإلكتروني",
      emailPlaceholder: "أنت@example.com",
      password: "كلمة المرور",
      passwordPlaceholder: "••••••••",
      signIn: "تسجيل الدخول",
      dontHaveAccount: "ليس لديك حساب؟",
      signUpLink: "سجّل",
      fillFields: "يرجى ملء جميع الحقول",
      welcomeToast: "مرحبًا بعودتك!",
      loginFailed: "فشل تسجيل الدخول",
      showPassword: "إظهار كلمة المرور",
      hidePassword: "إخفاء كلمة المرور",
    },
    register: {
      createAccount: "إنشاء حساب",
      joinCommunity: "انضم إلى مجتمع DaaCoo",
      name: "الاسم",
      namePlaceholder: "أحمد محمد",
      email: "البريد الإلكتروني",
      emailPlaceholder: "أنت@example.com",
      password: "كلمة المرور",
      passwordPlaceholder: "••••••••",
      createAccountBtn: "إنشاء حساب",
      alreadyHaveAccount: "لديك حساب بالفعل؟",
      signInLink: "تسجيل الدخول",
      fillRequired: "يرجى ملء جميع الحقول المطلوبة",
      accountCreated: "تم إنشاء الحساب بنجاح!",
      registrationFailed: "فشل التسجيل",
      confirmPassword: "تأكيد كلمة المرور",
      confirmPasswordPlaceholder: "••••••••",
      passwordsDoNotMatch: "كلمات المرور غير متطابقة",
    },
    account: {
      myAccount: "حسابي",
      user: "المستخدم",
      email: "البريد الإلكتروني",
      phone: "الهاتف",
      orderHistory: "تاريخ الطلبات",
      noOrders: "لا توجد طلبات",
      shopNow: "تسوق الآن",
      failedToLoadOrders: "فشل تحميل تاريخ الطلبات",
    },
    adminProducts: {
      title: "المنتجات",
      addProduct: "إضافة منتج",
      name: "الاسم",
      version: "الإصدار",
      price: "السعر",
      stock: "المخزون",
      available: "متاح",
      actions: "إجراءات",
      yes: "نعم",
      no: "لا",
      noProducts: "لا توجد منتجات",
      editProduct: "تعديل المنتج",
      addProductDialog: "إضافة منتج",
      fillDetails: "يرجى ملء تفاصيل المنتج أدناه.",
      description: "الوصف",
      imageUrl: "رابط الصورة",
      specsJson: "المواصفات (JSON)",
      specsPlaceholder: '{"مفتاح": "قيمة"}',
      availableCheckbox: "متاح",
      saveChanges: "حفظ التغييرات",
      createProduct: "إنشاء منتج",
      deleteProduct: "حذف المنتج",
      deleteConfirm: "هل أنت متأكد أنك تريد حذف هذا المنتج؟",
      deleteWarning: "لا يمكن التراجع عن هذا الإجراء.",
      deleteBtn: "حذف",
      productUpdated: "تم تحديث المنتج",
      productCreated: "تم إنشاء المنتج",
      productDeleted: "تم حذف المنتج",
      failedToLoad: "فشل تحميل المنتجات",
      failedToSave: "فشل حفظ المنتج",
      failedToDelete: "فشل حذف المنتج",
      availabilityUpdated: "تم تحديث التوفر",
      failedToUpdateAvailability: "فشل تحديث التوفر",
    },
    adminOrders: {
      title: "الطلبات",
      exportCsv: "تصدير CSV",
      statusFilter: "الحالة",
      allStatuses: "جميع الحالات",
      from: "من",
      to: "إلى",
      id: "الرقم",
      customer: "العميل",
      email: "البريد الإلكتروني",
      total: "الإجمالي",
      status: "الحالة",
      payment: "الدفع",
      date: "التاريخ",
      actions: "إجراءات",
      na: "غير متوفر",
      noOrders: "لا توجد طلبات",
      orderItems: "عناصر الطلب",
      itemsInOrder: "عناصر في الطلب",
      noItems: "لا توجد عناصر في هذا الطلب",
      cancelOrder: "إلغاء الطلب",
      cancelConfirm: "هل أنت متأكد أنك تريد إلغاء هذا الطلب؟",
      keepOrder: "لا، احتفظ به",
      confirmCancel: "نعم، إلغاء",
      statusUpdated: "تم تحديث الحالة",
      failedToUpdateStatus: "فشل تحديث الحالة",
      orderCancelled: "تم إلغاء الطلب",
      failedToCancel: "فشل إلغاء الطلب",
      failedToLoad: "فشل تحميل الطلبات",
    },
    adminPayments: {
      title: "المدفوعات",
      all: "الكل",
      transactionId: "رقم المعاملة",
      orderId: "رقم الطلب",
      amount: "المبلغ",
      method: "الطريقة",
      status: "الحالة",
      timestamp: "الطابع الزمني",
      na: "غير متوفر",
      noPayments: "لا توجد مدفوعات",
    },
    aboutPage: {
      title: "عن DaaCoo",
      subtitle: "ريادة مستقبل التفاعل بين الإنسان والذكاء الاصطناعي",
      ourStory: "قصتنا",
      ourStoryText: "تأسست DaaCoo في عام 2023، من اعتقاد بسيط: يجب أن تشعر التكنولوجيا بالطبيعية. اجتمع فريقنا من المهندسين والمصممين وباحثي الذكاء الاصطناعي حول رؤية مشتركة — إنشاء جهاز لا يستجيب فحسب، بل يفهم حقًا. من نموذجنا الأول إلى الجيل الأحدث، ظللنا ملتزمين بدفع حدود ما هو ممكن في الذكاء الاصطناعي التفاعلي.",
      mission: "مهمتنا",
      missionText: "جعل المحادثة الذكية والطبيعية في متناول الجميع. نؤمن أن الذكاء الاصطناعي يجب أن يتكيف مع البشر، وليس العكس. كل ميزة نبنيها، وكل سطر كود نكتبه، يخدم هذا الهدف الوحيد.",
      vision: "رؤيتنا",
      visionText: "عالم تتلاشى فيه الحواجز اللغوية، يتمتع فيه الجميع برفيق صبور وعالم، وتعزز فيه التكنولوجيا التواصل البشري بدلاً من استبداله.",
      values: "قيمنا",
      value1Title: "الخصوصية أولاً",
      value1Desc: "محادثاتك ملك لك. نصمم كل منتج مع تشفير شامل ومعالجة على الجهاز كمبادئ أساسية.",
      value2Title: "تصميم يركز على المستخدم",
      value2Desc: "نحن مهووسون بالتفاصيل التي تجعل التفاعلات تبدو سهلة. من التعرف على الصوت إلى توقيت الاستجابة، كل ملي ثانية مهمة.",
      value3Title: "الابتكار المستمر",
      value3Desc: "يتطور الذكاء الاصطناعي بسرعة، ونحن كذلك. يقوم فريقنا باستمرار بالبحث والاختبار ونشر التحسينات للحفاظ على DaaCoo في طليعة التقدم.",
      value4Title: "إمكانية الوصول الشاملة",
      value4Desc: "نبني للجميع. تدعم منتجاتنا أكثر من 40 لغة ومصممة بميزات إمكانية الوصول التي تمكّن المستخدمين من جميع القدرات.",
      team: "تعرف على الفريق",
      teamSubtitle: "مبدعون شغوفون يبنون مستقبل المحادثة",
    },
    contactPage: {
      title: "اتصل بنا",
      subtitle: "نود أن نسمع منك",
      getInTouch: "تواصل معنا",
      getInTouchText: "لديك أسئلة حول DaaCoo؟ تريد الشراكة معنا؟ أو ترغب فقط في الترحيب؟ تواصل معنا وسيعود إليك فريقنا خلال 24 ساعة.",
      email: "البريد الإلكتروني",
      phone: "الهاتف",
      address: "العنوان",
      addressValue: "123 شارع الابتكار، مدينة التقنية، TC 90210",
      formName: "اسمك",
      formEmail: "بريدك الإلكتروني",
      formSubject: "الموضوع",
      formMessage: "رسالتك",
      formSubmit: "إرسال الرسالة",
      formSuccess: "تم إرسال الرسالة بنجاح! سنعود إليك قريبًا.",
      faq: "الأسئلة الشائعة",
      faq1Q: "ما هي ساعات الدعم لديكم؟",
      faq1A: "فريق دعم العملاء لدينا متاح من الاثنين إلى الجمعة، من 9 صباحًا إلى 6 مساءً بتوقيت المحيط الهادئ. نرد عادةً على جميع الاستفسارات خلال 24 ساعة.",
      faq2Q: "هل تقدمون حلولاً للشركات؟",
      faq2A: "نعم! نقدم حزم مخصصة للشركات التي تتطلع إلى دمج تقنية DaaCoo. تواصل مع فريق المبيعات لمزيد من المعلومات.",
      faq3Q: "كيف يمكنني تتبع طلبي؟",
      faq3A: "بمجرد شحن طلبك، ستتلقى رقم تتبع عبر البريد الإلكتروني. يمكنك أيضًا عرض حالة طلبك في لوحة تحكم حسابك.",
    },
    productDescriptions: {
      "daacoo-basic-001": "رفيق المحادثة الذكي الأساسي. يوفر DaaCoo Basic تفاعلًا صوتيًا طبيعيًا بدقة تعرف 95%، مثالي للأفراد الباحثين عن مساعد يومي ذكي.",
      "daacoo-pro-001": "ارتقِ بمحادثاتك الذكية. يتميز DaaCoo Pro بدقة تعرف صوتي 98%، وأوقات استجابة أقل من الثانية، وذاكرة متقدمة للمستخدمين المحترفين الذين يطلبون الأفضل.",
      "daacoo-family-001": "الذكاء الاصطناعي للعائلة بأكملها. يدعم DaaCoo Family ملفات تعريف متعددة للمستخدمين، وضوابط أبوية، وجودة صوت ممتازة. القطعة المركزية المثالية للمنزل الذكي.",
    },
  },
};

export function getTranslations(locale: Locale): Translations {
  return translations[locale] || translations[defaultLocale];
}

export function detectLocale(): Locale {
  if (typeof navigator === "undefined") return defaultLocale;
  const lang = navigator.language || (navigator as any).userLanguage;
  if (!lang) return defaultLocale;
  const normalized = lang.split("-")[0].toLowerCase() as Locale;
  if (supportedLocales.includes(normalized)) return normalized;
  return defaultLocale;
}
