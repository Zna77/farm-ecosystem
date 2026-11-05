// Things you can buy in the barn shop.
// Names and descriptions are translated: see translations → shop.<id> and animals.<id>
import { localize } from '../translations/index.js';

export const SHOP = [
  {
    id: 'hive', emoji: '🐝', price: 35, level: 1,
  },
  {
    id: 'ladybugs', emoji: '🐞', price: 15, level: 1,
  },
  {
    id: 'chicken', emoji: '🐔', price: 30, level: 1,
  },
  {
    id: 'cow', emoji: '🐄', price: 80, level: 3,
  },
  {
    id: 'irrigation', emoji: '🚿', price: 60, level: 2,
  },
];

export const ANIMALS = {
  chicken: {
    id: 'chicken', emoji: '🐔', productEmoji: '🥚',
    productPrice: 6, productTime: 30, hungerRate: 0.5, manureEvery: 25, max: 4,
    eats: ['wheat', 'bean', 'carrot', 'tomato', 'strawberry', 'sunflower', 'pumpkin'],
  },
  cow: {
    id: 'cow', emoji: '🐄', productEmoji: '🥛',
    productPrice: 14, productTime: 45, hungerRate: 0.4, manureEvery: 15, max: 2,
    eats: ['wheat', 'carrot', 'pumpkin', 'bean'],
  },
};

SHOP.forEach((item) => localize(item, `shop.${item.id}`, ['name', 'desc']));
Object.values(ANIMALS).forEach((a) => localize(a, `animals.${a.id}`, ['name', 'product']));
