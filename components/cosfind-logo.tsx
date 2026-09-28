import Image from "next/image";

export function CosFindLogo({ priority = false }: { priority?: boolean }) {
  return <Image className="cosfind-wordmark" src="/brand/cosfind-logo.png" alt="CosFind" width={328} height={104} priority={priority}/>;
}
