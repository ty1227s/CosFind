/* eslint-disable @typescript-eslint/no-unused-vars -- Strip Next-only props before creating an anchor. */
import {forwardRef,type AnchorHTMLAttributes} from "react";
type Props=AnchorHTMLAttributes<HTMLAnchorElement>&{href:string;prefetch?:boolean;replace?:boolean;scroll?:boolean};
export default forwardRef<HTMLAnchorElement,Props>(function Link({prefetch:_prefetch,replace,scroll, ...props},ref){return <a {...props} ref={ref} data-mobile-replace={replace||undefined} data-mobile-scroll={scroll===false?"false":undefined}/>;});
