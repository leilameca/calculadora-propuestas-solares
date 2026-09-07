import { describe,expect,it } from "vitest";
import { PDFDocument } from "pdf-lib";
import sharp from "sharp";
import { renderPdfPages } from "./pdf-images";

describe("renderizado de PDF escaneado",()=>{
  it("convierte una página compuesta solo por una imagen a PNG para el OCR",async()=>{
    const scan=await sharp({create:{width:600,height:800,channels:3,background:"white"}}).png().toBuffer();
    const document=await PDFDocument.create();
    const image=await document.embedPng(scan);
    const page=document.addPage([600,800]);
    page.drawImage(image,{x:0,y:0,width:600,height:800});
    const pdf=await document.save();
    const pages=await renderPdfPages(pdf,1,1);
    expect(pages).toHaveLength(1);
    expect((await sharp(pages[0]).metadata()).format).toBe("png");
  });
});
