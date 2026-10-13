import assert from "node:assert/strict";
import test from "node:test";
import {readFile} from "node:fs/promises";
import ts from "typescript";
const source = await readFile(new URL("../lib/store-metadata-cache.ts", import.meta.url), "utf8");
const js = ts.transpileModule(source, {compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {createStoreMetadataLoader} = await import("data:text/javascript;base64," + Buffer.from(js).toString("base64"));

test("deduplicates concurrent requests and caches reordered IDs for five minutes", async () => {
 let time=0,calls=0;
 const load=createStoreMetadataLoader(async()=>{calls++;return Response.json({stores:{a:{customName:true}}});},()=>time);
 const values=await Promise.all([load(["b","a"]),load(["a","b"])]);
 assert.equal(calls,1);assert.deepEqual(values[0],values[1]);
 time=299999;await load(["a","b"]);assert.equal(calls,1);
 time=300000;await load(["a","b"]);assert.equal(calls,2);
});

test("retains successful metadata on failure and waits before retry", async()=>{
 let time=0,calls=0;
 const load=createStoreMetadataLoader(async()=>{calls++;return calls===1?Response.json({stores:{a:{customName:true}}}):new Response("1102",{status:500});},()=>time);
 const initial=await load(["a"]);time=300000;
 assert.deepEqual(await load(["a"]),initial);assert.equal(calls,2);
 time=359999;assert.deepEqual(await load(["a"]),initial);assert.equal(calls,2);
 time=360000;await load(["a"]);assert.equal(calls,3);
});

test("limits one load to two simultaneous batches and returns every store", async()=>{
 let running=0,peak=0,calls=0;
 const load=createStoreMetadataLoader(async(_url,options)=>{
  calls++;running++;peak=Math.max(peak,running);
  await new Promise(resolve=>setTimeout(resolve,1));running--;
  return Response.json({stores:Object.fromEntries(JSON.parse(options.body).ids.map(id=>[id,{customName:true}]))});
 });
 const result=await load(Array.from({length:450},(_,i)=>String(i)));
 assert.equal(calls,5);assert.equal(peak,2);assert.equal(Object.keys(result.stores).length,450);
});
