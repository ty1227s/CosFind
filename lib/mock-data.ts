import type { Product, StoreResult } from "@/types/domain";

const brands = ["ルミナス", "Mellow", "セルフィユ", "nue", "澄肌研究所"];
const names = ["グロウフィット クッション", "カラーステイ リップ", "シルキーアイパレット", "モイストバリア化粧水", "UVエアリージェル", "ピュアドロップ美容液", "ロングカールマスカラ", "クリームチーク", "スキンフィット下地", "リペアミルク", "ナイトフェイスマスク", "グロッシーネイル", "ソフトマットリップ", "ニュアンスアイカラー", "ラスティングファンデ"];
const categories = ["ファンデーション", "リップ", "アイシャドウ", "化粧水", "日焼け止め", "美容液", "マスカラ", "チーク", "化粧下地", "乳液", "フェイスマスク", "ネイルカラー"] as const;
export const products: Product[] = names.map((name, i) => ({ id: `p${i+1}`, brand: brands[i%brands.length], name, category: categories[i%categories.length], janCode: `49012345${String(i).padStart(5,"0")}`, variants: Array.from({length: 2+(i%4)}, (_,v)=>({id:`p${i+1}v${v+1}`,name:["01 ピンク", "02 ベージュ", "03 ローズ", "04 コーラル", "05 ブラウン"][v], colorCode:`0${v+1}`, janCode:`49098765${i}${v}`})) }));
const chains = ["コスモドラッグ", "スマイルドラッグ", "ライフマート", "カラフルプラザ", "まちのホーム"];
const areas = ["新宿東口", "西新宿", "歌舞伎町", "新宿南口", "大久保", "代々木", "新宿御苑", "都庁前", "北新宿", "西武新宿"];
export const stores: StoreResult[] = Array.from({length:20}, (_,i)=>({id:`s${i+1}`,name:`${chains[i%5]} ${areas[i%10]}店`,chain:chains[i%5],type:["ドラッグストア","バラエティショップ（総合）","総合スーパー","ホームセンター"][i%4],address:`東京都新宿区西新宿${1+i%7}-${2+i%8}-${1+i%9}`,latitude:35.6896+((i%5)-2)*.004,longitude:139.7006+(Math.floor(i/5)-2)*.005,lastReportedAt:`2026-08-${String(9-(i%8)).padStart(2,"0")}T${String(9+i%10).padStart(2,"0")}:20:00+09:00`,variants:["01 ピンク",...(i%2?["03 ローズ"]:[])],reportCount:1+i%4,distanceKm:.2+i*.17}));
