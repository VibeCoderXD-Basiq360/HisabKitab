require('dotenv').config();
const admin = require('../src/config/firebase');
const { PrismaClient } = require('@prisma/client');

const p = new PrismaClient();

async function main() {
  const users = await p.user.findMany({ select: { name: true, email: true, firebaseUid: true } });

  for (const user of users) {
    try {
      const fbUser = await admin.auth().getUser(user.firebaseUid);
      const providers = fbUser.providerData.map(pd => pd.providerId).join(', ');
      console.log(`${user.name} (${user.email}) => ${providers}`);
    } catch (e) {
      console.log(`${user.name} (${user.email}) => Firebase error: ${e.message}`);
    }
  }

  await p.$disconnect();
}

main();
