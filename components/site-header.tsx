import Link from "next/link";
import { HeaderNav } from "./header-nav";
import { HeaderProductSearch } from "./header-product-search";
import { CosFindLogo } from "./cosfind-logo";
export function SiteHeader(){return <header className="topbar"><Link href="/" className="brandmark" aria-label="CosFind ホーム"><CosFindLogo priority/></Link><HeaderProductSearch/><HeaderNav/></header>}
