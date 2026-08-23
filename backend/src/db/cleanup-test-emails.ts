import { prisma } from "./prisma.js";

async function main() {
  const testSubjects = [
    "ReachInbox Test Email",
    "BullMQ Test Email",
    "Ethereal Test Email",
    "Rate Limit Test",
    "Restart Persistence Test",
    "Frontend Integration Test",
  ];

  // Delete test emails first
  const deletedEmails = await prisma.email.deleteMany({
    where: {
      subject: {
        in: testSubjects,
      },
    },
  });

  // Delete the corresponding empty test campaigns
  const deletedCampaigns =
    await prisma.emailCampaign.deleteMany({
      where: {
        subject: {
          in: testSubjects,
        },
        emails: {
          none: {},
        },
      },
    });

  console.log(
    `Deleted ${deletedEmails.count} test emails.`
  );

  console.log(
    `Deleted ${deletedCampaigns.count} test campaigns.`
  );
}

main()
  .catch((error) => {
    console.error("Cleanup failed:");
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });