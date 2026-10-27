import type { Product, StoreResult } from "@/types/domain";
export interface CatalogRepository { searchProducts(query:string):Promise<Product[]>; getStores(onCoreRows?:(stores:StoreResult[])=>void):Promise<StoreResult[]>; getStoresForProduct(productId:string):Promise<StoreResult[]>; }
