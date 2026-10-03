/* eslint-disable @next/next/no-img-element, @typescript-eslint/no-unused-vars -- Native images do not use the Next image server. */
import type {ImgHTMLAttributes} from "react";
type Props=Omit<ImgHTMLAttributes<HTMLImageElement>,"src">&{src:string|{src:string};priority?:boolean;fill?:boolean;unoptimized?:boolean;quality?:number;placeholder?:string;blurDataURL?:string};
export default function Image({src,priority,fill,unoptimized:_u,quality:_q,placeholder:_p,blurDataURL:_b,style,alt="",...props}:Props){return <img {...props} alt={alt} src={typeof src==="string"?src:src.src} loading={priority?"eager":props.loading??"lazy"} style={fill?{position:"absolute",inset:0,width:"100%",height:"100%",...style}:style}/>;}
