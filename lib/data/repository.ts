import type { Product, StoreResult } from "@/types/domain";
export interface CatalogRepository { searchProducts(query:string):Promise<Product[]>; getStoresForProduct(productId:string):Promise<StoreResult[]>; }
