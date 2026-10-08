import "server-only";
import {
  getRailwayCompanyDirectory,
  getRailwayLineDirectory,
} from "@/lib/area-directory";
import { isPrefectureInRailwayRegion, RAILWAY_REGIONS } from "@/lib/railway-regions";

type PageProps = { searchParams: Promise<{ region?: string; company?: string }> };
const UNASSIGNED_REGION = "__unassigned_region__";
const UNASSIGNED_COMPANY = "__unassigned__";


export async function loadPage({ searchParams }: PageProps) {
  const [sourceLines, companyDirectory, params] = await Promise.all([getRailwayLineDirectory(), getRailwayCompanyDirectory(), searchParams]);
  const lines = sourceLines.map((line) => ({ name: line.name, companies: line.companies, visualType: line.visualType, imageUrl: line.imageUrl, lineColor: line.lineColor, stationCount: line.stations.length, stationNames: line.stations.map((station) => station.name), stationPrefectures: [...new Set(line.stations.map((station) => station.prefecture).filter(Boolean))] }));
  const requestedRegion = params.region?.trim() ?? "";
  const requestedCompany = params.company?.trim() ?? "";
  const unassignedCompanies = companyDirectory.filter((company) => company.regions.length === 0);
  const selectedRegion = RAILWAY_REGIONS.includes(requestedRegion as (typeof RAILWAY_REGIONS)[number]) || (requestedRegion === UNASSIGNED_REGION && unassignedCompanies.length > 0) ? requestedRegion : "";
  const lineRunsThroughSelectedRegion = (line: (typeof lines)[number]) => selectedRegion === UNASSIGNED_REGION || !selectedRegion || line.stationPrefectures.some((prefecture) => isPrefectureInRailwayRegion(prefecture, selectedRegion));
  const companiesInRegion = (selectedRegion === UNASSIGNED_REGION ? unassignedCompanies : selectedRegion ? companyDirectory.filter((company) => company.regions.includes(selectedRegion)) : [])
    .map((company) => ({ ...company, lineCount: lines.filter((line) => line.companies.includes(company.name) && lineRunsThroughSelectedRegion(line)).length }));
  const companyNames = companyDirectory.map((company) => company.name);
  const unassignedLines = lines.filter((line) => line.companies.length === 0);
  const selectedCompany = companyNames.includes(requestedCompany) || (requestedCompany === UNASSIGNED_COMPANY && unassignedLines.length > 0) ? requestedCompany : "";
  const visibleLines = (selectedCompany === UNASSIGNED_COMPANY ? unassignedLines : selectedCompany ? lines.filter((line) => line.companies.includes(selectedCompany)) : []).filter(lineRunsThroughSelectedRegion);
  const selectedCompanyLabel = selectedCompany === UNASSIGNED_COMPANY ? "鉄道会社未登録" : selectedCompany;
  const selectedRegionLabel = selectedRegion === UNASSIGNED_REGION ? "地域未登録" : selectedRegion;
  const stationCount = new Set(lines.flatMap((line) => line.stationNames)).size;
  
  return {
    lines, companyDirectory, unassignedCompanies,
    selectedRegion, companiesInRegion, unassignedLines,
    selectedCompany, visibleLines, selectedCompanyLabel,
    selectedRegionLabel, stationCount
  };
}
