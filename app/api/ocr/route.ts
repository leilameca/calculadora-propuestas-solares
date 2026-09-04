import { NextRequest, NextResponse } from "next/server";
import { createWorker } from "tesseract.js";
import { GetDocumentTextDetectionCommand, StartDocumentTextDetectionCommand, TextractClient } from "@aws-sdk/client-textract";
import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { parseElectricInvoice } from "@/lib/ocr";
import { extractEmbeddedPdfText } from "@/lib/pdf-text";
export const runtime="nodejs"; export const maxDuration=60;
async function recognizeImage(bytes:Uint8Array){ const worker=await createWorker("spa"); try{ return (await worker.recognize(Buffer.from(bytes))).data.text; } finally { await worker.terminate(); } }
async function recognizePdf(bytes:Uint8Array,fileName:string){
  const embeddedText=await extractEmbeddedPdfText(bytes).catch(()=>"");
  if(embeddedText.trim().length>=80) return embeddedText;
  const bucket=process.env.AWS_TEXTRACT_S3_BUCKET; if(!bucket) throw new Error("Para procesar PDF configure AWS_TEXTRACT_S3_BUCKET; las imágenes usan Tesseract.js localmente.");
  const region=process.env.AWS_REGION||"us-east-1", key=`invoices/${crypto.randomUUID()}-${fileName.replace(/[^a-zA-Z0-9.-]/g,"-")}`;
  const s3=new S3Client({region});
  await s3.send(new PutObjectCommand({Bucket:bucket,Key:key,Body:bytes,ContentType:"application/pdf"}));
  const textract=new TextractClient({region}); const started=await textract.send(new StartDocumentTextDetectionCommand({DocumentLocation:{S3Object:{Bucket:bucket,Name:key}}}));
  if(!started.JobId) throw new Error("AWS Textract no inició el análisis.");
  try{
    for(let attempt=0;attempt<30;attempt++){ await new Promise((resolve)=>setTimeout(resolve,1500)); const result=await textract.send(new GetDocumentTextDetectionCommand({JobId:started.JobId})); if(result.JobStatus==="FAILED") throw new Error(result.StatusMessage||"AWS Textract no pudo leer el PDF."); if(result.JobStatus==="SUCCEEDED") return (result.Blocks||[]).filter((block)=>block.BlockType==="LINE").map((block)=>block.Text).filter(Boolean).join("\n"); }
    throw new Error("El OCR del PDF excedió el tiempo de espera.");
  } finally {
    await s3.send(new DeleteObjectCommand({Bucket:bucket,Key:key})).catch(()=>undefined);
  }
}
export async function POST(request:NextRequest){ try{ const form=await request.formData(),file=form.get("file"); if(!(file instanceof File)) return NextResponse.json({error:"Adjunte una factura."},{status:400}); if(file.size>10*1024*1024) return NextResponse.json({error:"El archivo excede 10 MB."},{status:413}); const bytes=new Uint8Array(await file.arrayBuffer()); const text=file.type==="application/pdf"?await recognizePdf(bytes,file.name):await recognizeImage(bytes); return NextResponse.json(parseElectricInvoice(text)); }catch(error){ return NextResponse.json({error:error instanceof Error?error.message:"OCR no disponible"},{status:422}); } }
