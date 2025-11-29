const webpush = require('web-push');

// Generate VAPID keys
const vapidKeys = webpush.generateVAPIDKeys();

console.log('VAPID Keys generated:');
console.log('');
console.log('Public Key (NEXT_PUBLIC_VAPID_PUBLIC_KEY):');
console.log(vapidKeys.publicKey);
console.log('');
console.log('Private Key (VAPID_PRIVATE_KEY):');
console.log(vapidKeys.privateKey);
console.log('');
console.log('Add these to your .env.local file:');
console.log('');
console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY="${vapidKeys.publicKey}"`);
console.log(`VAPID_PRIVATE_KEY="${vapidKeys.privateKey}"`);
console.log(`VAPID_EMAIL="mailto:your@email.com"`);
console.log(`WEBHOOK_SECRET="${Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)}"`);
console.log(`INTERNAL_API_KEY="${Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)}"`);