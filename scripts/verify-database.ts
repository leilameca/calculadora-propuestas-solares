import { PrismaClient } from "@prisma/client";

const prisma=new PrismaClient();
async function main(){try{
  const [companies,users,migrations]=await Promise.all([
    prisma.company.count(),
    prisma.user.count(),
    prisma.$queryRaw<Array<{count:bigint}>>`SELECT COUNT(*)::bigint AS count FROM "_prisma_migrations" WHERE finished_at IS NOT NULL`,
  ]);
  console.log(JSON.stringify({connected:true,companies,users,appliedMigrations:Number(migrations[0]?.count||0)}));
}finally{await prisma.$disconnect();}}
main().catch((error)=>{console.error(error);process.exitCode=1});
