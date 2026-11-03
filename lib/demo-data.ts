export type DemoStoreIdentity = { name?: string | null; address?: string | null };

const DEMO_NAME_PREFIX = "【デモ】";
const DEMO_ADDRESS_MARKERS = ["（架空店舗）", "(架空店舗)"];

export function isDemoStore(store: DemoStoreIdentity) {
  const name = store.name?.trim() ?? "";
  const address = store.address ?? "";
  return name.startsWith(DEMO_NAME_PREFIX)
    || DEMO_ADDRESS_MARKERS.some((marker) => address.includes(marker));
}

export function visibleStoresForViewer<T extends DemoStoreIdentity>(stores: T[], isAdmin: boolean) {
  return isAdmin ? stores : stores.filter((store) => !isDemoStore(store));
}
