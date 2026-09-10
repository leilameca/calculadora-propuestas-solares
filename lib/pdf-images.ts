import { createRequire } from "node:module";
import { dirname } from "node:path";
import { createCanvas } from "@napi-rs/canvas";

export async function renderPdfPages(bytes:Uint8Array,maxPages=3,scale=2.2):Promise<Buffer[]>{
  const pdfjs=await import("pdfjs-dist/legacy/build/pdf.mjs");
  const loadingTask=pdfjs.getDocument({data:bytes.slice(),disableFontFace:true,useSystemFonts:false,standardFontDataUrl:dirname(createRequire(import.meta.url).resolve("pdfjs-dist/package.json")).replace(/\\/g,"/")+"/standard_fonts/",verbosity:0});
  try{
    const pdf=await loadingTask.promise;
    if(pdf.numPages>maxPages)throw new Error(`El documento excede ${maxPages} páginas.`);
    const images:Buffer[]=[];
    const pages=Math.min(pdf.numPages,maxPages);
    for(let pageNumber=1;pageNumber<=pages;pageNumber+=1){
      const page=await pdf.getPage(pageNumber);
      const viewport=page.getViewport({scale});
      if(viewport.width*viewport.height>20_000_000)throw new Error("Página demasiado grande para rasterizar.");
      const canvas=createCanvas(Math.ceil(viewport.width),Math.ceil(viewport.height));
      const context=canvas.getContext("2d");
      await page.render({canvas:canvas as never,canvasContext:context as never,viewport}).promise;
      images.push(canvas.toBuffer("image/png"));
      page.cleanup();
    }
    return images;
  }finally{
    await loadingTask.destroy();
  }
}
