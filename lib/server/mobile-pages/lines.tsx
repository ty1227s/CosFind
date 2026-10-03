import "server-only";
import {
  getRailwayCompanyDirectory,
  getRailwayLineDirectory,
} from "@/lib/area-directory";
import { RAILWAY_REGIONS } from "@/lib/railway-regions";

type PageProps = { searchParams: Promise<{ region?: string; company?: string }> };
const UNASSIGNED_REGION = "__unassigned_region__";
const UNASSIGNED_COMPANY = "__unassigned__";


export async function loadPage({ searchParams }: PageProps) {
  const [lines, companyDirectory, params] = await Promise.all([getRailwayLineDirectory(), getRailwayCompanyDirectory(), searchParams]);
  const requestedRegion = params.region?.trim() ?? "";
  const requestedCompany = params.company?.trim() ?? "";
  const unassignedCompanies = companyDirectory.filter((company) => company.regions.length === 0);
  const selectedRegion = RAILWAY_REGIONS.includes(requestedRegion as (typeof RAILWAY_REGIONS)[number]) || (requestedRegion === UNASSIGNED_REGION && unassignedCompanies.length > 0) ? requestedRegion : "";
  const companiesInRegion = selectedRegion === UNASSIGNED_REGION ? unassignedCompanies : selectedRegion ? companyDirectory.filter((company) => company.regions.includes(selectedRegion)) : [];
  const companyNames = companyDirectory.map((company) => company.name);
  const unassignedLines = lines.filter((line) => line.companies.length === 0);
  const selectedCompany = companyNames.includes(requestedCompany) || (requestedCompany === UNASSIGNED_COMPANY && unassignedLines.length > 0) ? requestedCompany : "";
  const visibleLines = selectedCompany === UNASSIGNED_COMPANY ? unassignedLines : selectedCompany ? lines.filter((line) => line.companies.includes(selectedCompany)) : [];
  const selectedCompanyLabel = selectedCompany === UNASSIGNED_COMPANY ? "鉄道会社未登録" : selectedCompany;
  const selectedRegionLabel = selectedRegion === UNASSIGNED_REGION ? "地域未登録" : selectedRegion;
  const stationCount = new Set(lines.flatMap((line) => line.stations.map((station) => station.name))).size;
  
  return {
    lines, companyDirectory, unassignedCompanies,
    selectedRegion, companiesInRegion, unassignedLines,
    selectedCompany, visibleLines, selectedCompanyLabel,
    selectedRegionLabel, stationCount
  };
}
