import type {CatalogRepository} from "./repository";import {mockRepository} from "./mock-repository";import {supabaseRepository} from "./supabase-repository";
export const usesSupabaseCatalog=Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL&&process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
export const catalogRepository:CatalogRepository=usesSupabaseCatalog?supabaseRepository:mockRepository;
