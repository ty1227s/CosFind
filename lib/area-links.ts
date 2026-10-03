export function areaHref(prefecture?: string, municipality?: string) {
  if (!prefecture) return "/areas";
  const prefecturePath = `/areas/${encodeURIComponent(prefecture)}`;
  return municipality ? `${prefecturePath}/${encodeURIComponent(municipality)}` : prefecturePath;
}

export function stationHref(stationName?: string) {
  return stationName ? `/stations/${encodeURIComponent(stationName)}` : "/stations";
}

export function railwayLineHref(lineName?: string) {
  return lineName ? `/lines/${encodeURIComponent(lineName)}` : "/lines";
}

export function decodeAreaSegment(segment: string) {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

export const publicSiteOrigin = (process.env.NEXT_PUBLIC_SITE_URL || "https://cosfind.ty1227s.workers.dev").replace(/\/$/, "");
