'use client';
import Image from "next/image";
import { useState } from "react";
export function ImageUploadClient({salonSlug}:{salonSlug:string}) {
 const [file,setFile]=useState<File|null>(null),[url,setUrl]=useState(""),[busy,setBusy]=useState(false),[message,setMessage]=useState("");
 async function upload(){if(!file)return;setBusy(true);setMessage("");try{
  if(!["image/jpeg","image/png","image/webp","image/avif"].includes(file.type))throw new Error("Choose a JPG, PNG, WebP or AVIF image.");
  if(file.size>8*1024*1024)throw new Error("Image must be 8 MB or smaller.");
  const sig=await fetch("/api/admin/uploads/signature",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({salonSlug})});const s=await sig.json();if(!sig.ok)throw new Error(s.error);
  const form=new FormData();form.append("file",file);form.append("api_key",s.apiKey);form.append("timestamp",String(s.timestamp));form.append("folder",s.folder);form.append("allowed_formats",s.allowedFormats);form.append("signature",s.signature);
  const response=await fetch("https://api.cloudinary.com/v1_1/"+s.cloudName+"/image/upload",{method:"POST",body:form});const data=await response.json();if(!response.ok)throw new Error(data.error?.message||"Image upload failed.");
  setUrl(data.secure_url);setMessage("Upload complete. Copy the secure URL into the relevant service or staff image field.");
 }catch(e){setMessage(e instanceof Error?e.message:"Upload failed.");}finally{setBusy(false);}}
 return <div className="max-w-3xl space-y-5"><div><p className="eyebrow">SALON MEDIA LIBRARY</p><h2 className="serif mt-2 text-3xl">Image uploads</h2><p className="mt-2 text-sm text-[#999]">Images are uploaded directly to Cloudinary using a short-lived server signature. The API secret never reaches the browser.</p></div><div className="border border-white/10 bg-[#151515] p-6"><label className="block text-sm">Choose image<input type="file" accept="image/jpeg,image/png,image/webp,image/avif" onChange={e=>setFile(e.target.files?.[0]||null)} className="mt-3 block w-full text-sm"/></label><p className="mt-2 text-xs text-[#888]">JPG, PNG, WebP or AVIF · maximum 8 MB</p><button disabled={!file||busy} onClick={upload} className="gold-button mt-5 px-6 py-3 text-xs">{busy?"UPLOADING…":"UPLOAD IMAGE"}</button>{message&&<p role="status" className="mt-4 text-sm text-[#c6a15b]">{message}</p>}{url&&<div className="mt-5 space-y-3"><Image src={url} alt="Uploaded salon asset" width={1200} height={800} unoptimized className="max-h-64 rounded object-contain"/><input readOnly value={url} className="w-full bg-[#0b0b0b] p-3 text-xs"/><button onClick={()=>navigator.clipboard.writeText(url)} className="outline-gold px-4 py-2 text-xs">COPY SECURE URL</button></div>}</div></div>;
}
