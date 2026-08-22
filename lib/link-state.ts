import { promises as fs } from 'node:fs';
import path from 'node:path';

export type LinkState = {
  paymentLinkId:string;
  paymentId:string;
  customer:string;
  amount:number;
  shortUrl:string;
  status:string;
  paid:boolean;
  paymentIdRazorpay?:string;
  updatedAt:string;
};

const filePath=path.join(process.cwd(),'data','runtime-links.json');

async function readAll():Promise<LinkState[]>{
  try { return JSON.parse(await fs.readFile(filePath,'utf8')); }
  catch { return []; }
}
async function writeAll(items:LinkState[]){
  await fs.mkdir(path.dirname(filePath),{recursive:true});
  await fs.writeFile(filePath,JSON.stringify(items,null,2),'utf8');
}

export async function registerLink(link:LinkState){
  const items=await readAll();
  const idx=items.findIndex(x=>x.paymentLinkId===link.paymentLinkId);
  if(idx>=0) items[idx]={...items[idx],...link}; else items.push(link);
  await writeAll(items);
  return link;
}

export async function markLinkPaid(paymentLinkId:string, razorpayPaymentId?:string){
  const items=await readAll();
  const item=items.find(x=>x.paymentLinkId===paymentLinkId);
  if(!item) return false;
  item.paid=true;
  item.status='paid';
  item.paymentIdRazorpay=razorpayPaymentId;
  item.updatedAt=new Date().toISOString();
  await writeAll(items);
  return true;
}

export async function getLinks(){
  const items=await readAll();
  return items.sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt));
}
