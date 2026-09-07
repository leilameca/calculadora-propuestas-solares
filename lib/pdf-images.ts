import { createCanvas } from "@napi-rs/canvas";

export async function renderPdfPages(bytes:Uint8Array,maxPages=3,scale=2.2):Promise<Buffer[]>{
  const pdfjs=await import("pdfjs-dist/legacy/build/pdf.mjs");
  const loadingTask=pdfjs.getDocument({data:bytes,disableFontFace:false,useSystemFonts:true,verbosity:0});
  const pdf=await loadingTask.promise;
  try{
    const images:Buffer[]=[];
    const pages=Math.min(pdf.numPages,maxPages);
    for(let pageNumber=1;pageNumber<=pages;pageNumber+=1){
      const page=await pdf.getPage(pageNumber);
      const viewport=page.getViewport({scale});
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
