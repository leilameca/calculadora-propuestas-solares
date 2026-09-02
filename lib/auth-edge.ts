const encoder=new TextEncoder();
function decodeBase64Url(value:string){const base64=value.replace(/-/g,"+").replace(/_/g,"/").padEnd(Math.ceil(value.length/4)*4,"=");return Uint8Array.from(atob(base64),(c)=>c.charCodeAt(0));}
export async function verifyEdgeSession(token:string){
  const [header,payload,signature]=token.split("."); if(!header||!payload||!signature)return false;
  const key=await crypto.subtle.importKey("raw",encoder.encode(process.env.AUTH_SECRET||"development-only-secret-change-me"),{name:"HMAC",hash:"SHA-256"},false,["verify"]);
  const valid=await crypto.subtle.verify("HMAC",key,decodeBase64Url(signature),encoder.encode(`${header}.${payload}`)); if(!valid)return false;
  try{const data=JSON.parse(new TextDecoder().decode(decodeBase64Url(payload))) as {exp?:number};return !data.exp||data.exp>Date.now()/1000}catch{return false}
}
