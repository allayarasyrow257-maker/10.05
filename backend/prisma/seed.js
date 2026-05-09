const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

function getAllImages(dirPath, arrayOfFiles) {
  try {
    const files = fs.readdirSync(dirPath);

    arrayOfFiles = arrayOfFiles || [];

    files.forEach(function(file) {
      if (fs.statSync(dirPath + "/" + file).isDirectory()) {
        arrayOfFiles = getAllImages(dirPath + "/" + file, arrayOfFiles);
      } else {
        if (file.match(/\.(jpg|jpeg|png|webp|gif)$/i)) {
          arrayOfFiles.push(path.join(dirPath, file));
        }
      }
    });
  } catch (e) {
    console.warn("Could not read images directory:", e.message);
  }

  return arrayOfFiles || [];
}

async function main() {
  // Create admin
  const hashedPassword = await bcrypt.hash('admin123', 12);
  await prisma.admin.upsert({
    where: { email: 'admin@restaurant.com' },
    update: {},
    create: {
      email: 'admin@restaurant.com',
      password: hashedPassword,
      name: 'Admin',
    },
  });

  // Helper to generate table codes
  function generateTableCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  // Create tables
  for (let i = 1; i <= 12; i++) {
    await prisma.table.upsert({
      where: { number: i },
      update: {},
      create: { 
        number: i, 
        name: `Table ${i}`,
        tableCode: generateTableCode()
      },
    });
  }

  // Create categories
  const categories = [
    { name: { en: 'Starters', tr: 'Başlangıçlar', tk: 'Başlangyçlar', ru: 'Закуски' }, sortOrder: 1 },
    { name: { en: 'Main Course', tr: 'Ana Yemekler', tk: 'Esasy naharlar', ru: 'Основные блюда' }, sortOrder: 2 },
    { name: { en: 'Burgers', tr: 'Burgerler', tk: 'Burgerler', ru: 'Бургеры' }, sortOrder: 3 },
    { name: { en: 'Pizza', tr: 'Pizza', tk: 'Pizza', ru: 'Пицца' }, sortOrder: 4 },
    { name: { en: 'Salads', tr: 'Salatalar', tk: 'Salatlar', ru: 'Салаты' }, sortOrder: 5 },
    { name: { en: 'Desserts', tr: 'Tatlılar', tk: 'Süýjülikler', ru: 'Десерты' }, sortOrder: 6 },
    { name: { en: 'Drinks', tr: 'İçecekler', tk: 'Içgiler', ru: 'Напитки' }, sortOrder: 7 },
  ];

  const imagesPath = path.join(__dirname, '../../frontend/public/meal images');
  const allImagesFull = getAllImages(imagesPath);
  const allImages = allImagesFull.map(p => {
    // Make relative to public directory
    const frontendPublicPath = path.join(__dirname, '../../frontend/public');
    return p.replace(frontendPublicPath, '').replace(/\\/g, '/');
  });

  const createdCategories = [];
  for (const cat of categories) {
    const randomImage = allImages.length > 0 ? allImages[Math.floor(Math.random() * allImages.length)] : null;
    const created = await prisma.category.upsert({
      where: { id: categories.indexOf(cat) + 1 },
      update: { name: cat.name, sortOrder: cat.sortOrder, image: randomImage },
      create: { name: cat.name, sortOrder: cat.sortOrder, image: randomImage },
    });
    createdCategories.push(created);
  }

  // Create products
  const products = [
    // Starters
    { name: { en: 'Bruschetta', tr: 'Bruschetta', tk: 'Bruşetta', ru: 'Брускетта' }, price: 12.99, categoryId: createdCategories[0].id },
    { name: { en: 'Soup of the Day', tr: 'Günün Çorbası', tk: 'Günüň çorbasy', ru: 'Суп дня' }, price: 8.99, categoryId: createdCategories[0].id },
    { name: { en: 'Garlic Bread', tr: 'Sarımsaklı Ekmek', tk: 'Sarymsak çöregi', ru: 'Чесночный хлеб' }, price: 6.99, categoryId: createdCategories[0].id },
    // Main Course
    { name: { en: 'Grilled Salmon', tr: 'Izgara Somon', tk: 'Gowrulan losos', ru: 'Лосось на гриле' }, price: 28.99, categoryId: createdCategories[1].id },
    { name: { en: 'Beef Steak', tr: 'Biftek', tk: 'Bifştek', ru: 'Стейк из говядины' }, price: 34.99, categoryId: createdCategories[1].id },
    { name: { en: 'Chicken Parmesan', tr: 'Tavuk Parmesan', tk: 'Towuk parmezan', ru: 'Курица пармезан' }, price: 22.99, categoryId: createdCategories[1].id },
    // Burgers
    { name: { en: 'Classic Burger', tr: 'Klasik Burger', tk: 'Klassik burger', ru: 'Классический бургер' }, price: 16.99, categoryId: createdCategories[2].id },
    { name: { en: 'Cheese Burger', tr: 'Peynirli Burger', tk: 'Peýnirli burger', ru: 'Чизбургер' }, price: 18.99, categoryId: createdCategories[2].id },
    { name: { en: 'BBQ Burger', tr: 'BBQ Burger', tk: 'BBQ burger', ru: 'BBQ бургер' }, price: 19.99, categoryId: createdCategories[2].id },
    // Pizza
    { name: { en: 'Margherita', tr: 'Margarita', tk: 'Margarita', ru: 'Маргарита' }, price: 14.99, categoryId: createdCategories[3].id },
    { name: { en: 'Pepperoni', tr: 'Pepperoni', tk: 'Pepperoni', ru: 'Пепперони' }, price: 17.99, categoryId: createdCategories[3].id },
    { name: { en: 'Four Cheese', tr: 'Dört Peynirli', tk: 'Dört peýnirli', ru: 'Четыре сыра' }, price: 19.99, categoryId: createdCategories[3].id },
    // Salads
    { name: { en: 'Caesar Salad', tr: 'Sezar Salata', tk: 'Sezar salady', ru: 'Салат Цезарь' }, price: 13.99, categoryId: createdCategories[4].id },
    { name: { en: 'Greek Salad', tr: 'Yunan Salatası', tk: 'Grek salady', ru: 'Греческий салат' }, price: 12.99, categoryId: createdCategories[4].id },
    // Desserts
    { name: { en: 'Tiramisu', tr: 'Tiramisu', tk: 'Tiramisu', ru: 'Тирамису' }, price: 11.99, categoryId: createdCategories[5].id },
    { name: { en: 'Chocolate Cake', tr: 'Çikolatalı Pasta', tk: 'Şokoladly tort', ru: 'Шоколадный торт' }, price: 10.99, categoryId: createdCategories[5].id },
    { name: { en: 'Ice Cream', tr: 'Dondurma', tk: 'Doňdurma', ru: 'Мороженое' }, price: 7.99, categoryId: createdCategories[5].id },
    // Drinks
    { name: { en: 'Cola', tr: 'Kola', tk: 'Kola', ru: 'Кола' }, price: 4.99, categoryId: createdCategories[6].id },
    { name: { en: 'Fresh Orange Juice', tr: 'Taze Portakal Suyu', tk: 'Täze apelsin suwy', ru: 'Свежий апельсиновый сок' }, price: 6.99, categoryId: createdCategories[6].id },
    { name: { en: 'Lemonade', tr: 'Limonata', tk: 'Limonad', ru: 'Лимонад' }, price: 5.99, categoryId: createdCategories[6].id },
    { name: { en: 'Coffee', tr: 'Kahve', tk: 'Kofe', ru: 'Кофе' }, price: 5.99, categoryId: createdCategories[6].id },
    { name: { en: 'Tea', tr: 'Çay', tk: 'Çaý', ru: 'Чай' }, price: 3.99, categoryId: createdCategories[6].id },
  ];

  for (let i = 0; i < products.length; i++) {
    const randomImage = allImages.length > 0 ? allImages[Math.floor(Math.random() * allImages.length)] : null;
    await prisma.product.upsert({
      where: { id: i + 1 },
      update: { ...products[i], image: randomImage },
      create: { ...products[i], sortOrder: i, image: randomImage },
    });
  }

  console.log('Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
