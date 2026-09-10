import { apiHandler, readForm } from "@/lib/api-handler";
import { NextRequest, NextResponse } from "next/server";
import { createWorker } from "tesseract.js";
import { GetDocumentTextDetectionCommand, StartDocumentTextDetectionCommand, TextractClient } from "@aws-sdk/client-textract";
import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { parseElectricInvoice } from "@/lib/ocr";
import { extractPdfTextLayers } from "@/lib/pdf-text";
import { readUtilityBill } from "@/lib/utility-bill/pipeline";
import { validateFile } from "@/lib/storage/validation";
import { sessionFromRequest } from "@/lib/auth";
import sharp from "sharp";
import { renderPdfPages } from "@/lib/pdf-images";
export const runtime="nodejs"; export const maxDuration=300;
async function prepareImage(bytes:Uint8Array){
  const source=sharp(Buffer.from(bytes),{limitInputPixels:20_000_000}).rotate();
  const metadata=await source.metadata();
  return source.resize({width:Math.min(3200,Math.max(1800,metadata.width||0)),withoutEnlargement:false}).grayscale().normalize().sharpen().png().toBuffer();
}
async function recognizeImage(bytes:Uint8Array){
  const prepared=await prepareImage(bytes);
  const worker=await createWorker("spa");
  try{ return (await worker.recognize(prepared)).data.text; } finally { await worker.terminate(); }
}
async function recognizeScannedPdf(bytes:Uint8Array){
  const pages=await renderPdfPages(bytes,12,1.8);
  const worker=await createWorker("spa");
  try{
    const texts:string[]=[];
    for(const page of pages)texts.push((await worker.recognize(await prepareImage(page))).data.text);
    return texts.join("\n\n");
  }finally{await worker.terminate();}
}
async function recognizeTextract(bytes:Uint8Array,companyId:string){
  const bucket=process.env.AWS_TEXTRACT_S3_BUCKET!;
  const region=process.env.AWS_REGION||"us-east-1",key=`invoices/${companyId}/${crypto.randomUUID()}`;
  const s3=new S3Client({region}),textract=new TextractClient({region});
  try {
    await s3.send(new PutObjectCommand({Bucket:bucket,Key:key,Body:bytes,ContentType:"application/pdf"}));
    const started=await textract.send(new StartDocumentTextDetectionCommand({DocumentLocation:{S3Object:{Bucket:bucket,Name:key}}}));
    if(!started.JobId)throw new Error("Textract no inici? el an?lisis.");
    for(let attempt=0;attempt<30;attempt++) {
      await new Promise(resolve=>setTimeout(resolve,1500));
      let result=await textract.send(new GetDocumentTextDetectionCommand({JobId:started.JobId}));
      if(result.JobStatus==="FAILED")throw new Error("Textract fall?.");
      if(result.JobStatus==="SUCCEEDED" || result.JobStatus==="PARTIAL_SUCCESS") {
        const lines:string[]=[];
        for(let page=0;page<100;page++) {
          lines.push(...(result.Blocks??[]).filter(block=>block.BlockType==="LINE").flatMap(block=>block.Text?[block.Text]:[]));
          if(!result.NextToken)return lines.join("\n");
          result=await textract.send(new GetDocumentTextDetectionCommand({JobId:started.JobId,NextToken:result.NextToken}));
        }
        throw new Error("Textract excede el l?mite de resultados.");
      }
    }
    throw new Error("Textract agot? el tiempo de espera.");
  } finally {
    await s3.send(new DeleteObjectCommand({Bucket:bucket,Key:key})).catch(()=>console.error("ocr.temp_cleanup_failed",{key}));
  }
}
async function handlePOST(request:NextRequest) {
  try {
    const session=await sessionFromRequest(request);
    if(!session?.companyId)return NextResponse.json({error:"No autorizado"},{status:401});
    if(Number(request.headers.get("content-length"))>4*1024*1024+65536)return NextResponse.json({error:"El archivo excede 4 MB."},{status:413});
    const form=await readForm(request),file=form.get("file");
    if(!(file instanceof File))return NextResponse.json({error:"Adjunte una factura."},{status:400});
    const bytes=new Uint8Array(await file.arrayBuffer());
    await validateFile(bytes,file.type);
    const bill=file.type==="application/pdf"?await readUtilityBill({textLayers:()=>extractPdfTextLayers(bytes),ocr:()=>recognizeScannedPdf(bytes),textract:process.env.AWS_TEXTRACT_S3_BUCKET?()=>recognizeTextract(bytes,session.companyId!):undefined}):{...parseElectricInvoice(await recognizeImage(bytes)),source:"ocr"};
    return NextResponse.json({...bill,recognized:bill.consumptionHistory.length>=3,requiresManualEntry:bill.consumptionHistory.length<3,consumption:bill.consumptionHistory},{headers:{"Cache-Control":"no-store"}});
  } catch(error) {
    console.error("ocr.failed",{type:error instanceof Error?error.name:"unknown"});
    return NextResponse.json({error:"No se pudo leer la factura. Verifique el formato y tama?o (m?ximo 4 MB) o complete los datos manualmente."},{status:422});
  }
}

export const POST = apiHandler(handlePOST);
