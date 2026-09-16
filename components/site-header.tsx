import Link from "next/link";
import Image from "next/image";
import { HeaderNav } from "./header-nav";
import { HeaderProductSearch } from "./header-product-search";
export function SiteHeader(){return <header className="topbar"><Link href="/" className="brandmark"><span className="logo"><Image src="/icons/cosfind-icon.png" alt="" width={40} height={40} priority/></span><span><b>CosFind</b></span></Link><HeaderProductSearch/><HeaderNav/></header>}
