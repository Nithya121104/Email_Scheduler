console.log("TEST FILE STARTED");

import { prisma } from "./prisma.js";

console.log("PRISMA IMPORTED");

async function main() {
  console.log("TRYING DATABASE CONNECTION...");

  const users = await prisma.user.findMany();

  console.log("DATABASE CONNECTION SUCCESSFUL!");
  console.log("USERS:", users);
}

main()
  .catch((error) => {
    console.error("DATABASE CONNECTION FAILED!");
    console.error(error);
  })
  .finally(async () => {
    console.log("DISCONNECTING...");
    await prisma.$disconnect();
    console.log("DONE!");
  });