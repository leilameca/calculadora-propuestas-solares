import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
const prisma=new PrismaClient();
async function main(){ const email=process.env.SUPERADMIN_EMAIL?.trim().toLowerCase(),password=process.env.SUPERADMIN_PASSWORD;if(!email||!password||password.length<12)throw new Error("Configure SUPERADMIN_EMAIL y una SUPERADMIN_PASSWORD de al menos 12 caracteres.");const company=await prisma.company.upsert({where:{slug:"eilen-electric"},update:{},create:{name:"EILEN Electric Service",slug:"eilen-electric",rnc:"1-31-00000-1",email:"propuestas@eilen.do",phone:"809-555-0147",address:"Santiago, República Dominicana",slogan:"Ingeniería que transforma energía"}}); const passwordHash=await bcrypt.hash(password,12); await prisma.user.upsert({where:{email},update:{passwordHash,role:"SUPERADMIN",active:true},create:{name:"Super Administrador",email,passwordHash,role:"SUPERADMIN",companyId:company.id}}); }
main().finally(()=>prisma.$disconnect());
