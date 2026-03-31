const prisma = require("../src/lib/prisma");
const bcrypt = require("bcrypt");

async function seedTestUser() {

 const password = await bcrypt.hash("password123", 10);

 return prisma.user.create({
   data: {
     email: "admin@test.com",
     password,
     role: "ADMIN"
   }
 });

}

module.exports = {
 seedTestUser
};