const webpush = require('web-push');
const crypto = require('crypto');

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
console.log(`VAPID_EMAIL="mailto:hola@beshy.es"`);
console.log(`WEBHOOK_SECRET="${crypto.randomBytes(32).toString('hex')}"`);
console.log(`INTERNAL_API_KEY="${crypto.randomBytes(32).toString('hex')}"`);
