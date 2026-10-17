const target=new URL(import.meta.env.VITE_API_ORIGIN||"https://cosfind.app");
export const apiOrigin=target.origin;
if(target.protocol!=="https:"&&!(target.protocol==="http:"&&["10.0.2.2","127.0.0.1","localhost"].includes(target.hostname)))throw new Error("API origin must use HTTPS");
