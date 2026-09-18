import type { Product, StoreResult } from "@/types/domain";
export interface CatalogRepository { searchProducts(query:string):Promise<Product[]>; getStores():Promise<StoreResult[]>; getStoresForProduct(productId:string):Promise<StoreResult[]>; }
