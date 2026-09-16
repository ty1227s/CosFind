export function formatStoreName(store: { name: string; chain?: string | null; customName?: boolean }) {
  const name = store.name.trim();
  const chain = store.chain?.trim();
  if (store.customName) return name;
  if (chain === "ロフト") return name;
  if (!chain || name.startsWith(chain)) return name;
  return `${chain} ${name}`;
}
