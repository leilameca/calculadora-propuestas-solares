import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
const prisma=new PrismaClient();
async function main(){ const company=await prisma.company.upsert({where:{slug:"eilen-electric"},update:{},create:{name:"EILEN Electric Service",slug:"eilen-electric",rnc:"1-31-00000-1",email:"propuestas@eilen.do",phone:"809-555-0147",address:"Santiago, República Dominicana",slogan:"Ingeniería que transforma energía"}}); const email=(process.env.SUPERADMIN_EMAIL||"admin@solar.local").toLowerCase(),passwordHash=await bcrypt.hash(process.env.SUPERADMIN_PASSWORD||"ChangeMe123!",12); await prisma.user.upsert({where:{email},update:{passwordHash,role:"SUPERADMIN"},create:{name:"Super Administrador",email,passwordHash,role:"SUPERADMIN",companyId:company.id}}); }
main().finally(()=>prisma.$disconnect());
