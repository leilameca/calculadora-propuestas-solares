export function imageToDataUrl(file:File,{maxWidth,maxHeight,outputType="image/jpeg",quality=.86}:{maxWidth:number;maxHeight:number;outputType?:"image/jpeg"|"image/png";quality?:number}):Promise<string>{
  return new Promise((resolve,reject)=>{
    const image=new Image(),reader=new FileReader();
    reader.onerror=()=>reject(new Error("No se pudo leer la imagen."));
    reader.onload=()=>{image.src=String(reader.result)};
    image.onerror=()=>reject(new Error("La imagen no es válida."));
    image.onload=()=>{
      const scale=Math.min(1,maxWidth/image.width,maxHeight/image.height),canvas=document.createElement("canvas");
      canvas.width=Math.max(1,Math.round(image.width*scale));canvas.height=Math.max(1,Math.round(image.height*scale));
      canvas.getContext("2d")?.drawImage(image,0,0,canvas.width,canvas.height);
      resolve(canvas.toDataURL(outputType,quality));
    };
    reader.readAsDataURL(file);
  });
}

export function fileToDataUrl(file:File):Promise<string>{
  return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onerror=()=>reject(new Error("No se pudo leer el archivo."));reader.onload=()=>resolve(String(reader.result));reader.readAsDataURL(file)});
}
