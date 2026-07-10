// Default new users to the "customer" role
onModelBeforeCreate((e) => {
  const user = e.model;
  if (!user.get('role')) {
    user.set('role', 'customer');
  }
}, 'users');
