import { prisma } from "./prisma.js";

async function main() {
  const user = await prisma.user.upsert({
    where: {
      email: "test@reachinbox.local",
    },
    update: {},
    create: {
      googleId: "development-google-id",
      name: "Test User",
      email: "test@reachinbox.local",
      avatar: "https://ui-avatars.com/api/?name=Test+User",
    },
  });

  console.log("Test user created:");
  console.log(user);
}

main()
  .catch((error) => {
    console.error("Failed to create test user:");
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });