import type { StoreBusinessDay, StoreBusinessHours, StoreBusinessPeriod } from "@/types/domain";
export const STORE_WEEKDAYS=[{key:"mon",label:"月"},{key:"tue",label:"火"},{key:"wed",label:"水"},{key:"thu",label:"木"},{key:"fri",label:"金"},{key:"sat",label:"土"},{key:"sun",label:"日"}] as const;
const weekdayIndex:Record<string,number>={Mon:0,Tue:1,Wed:2,Thu:3,Fri:4,Sat:5,Sun:6};
const minutes=(value:string)=>{const[hour,minute]=value.split(":").map(Number);return hour*60+minute};
export function formatStoreHoursRange(openingTime?:string,closingTime?:string){if(openingTime&&closingTime&&minutes(openingTime)===0&&minutes(closingTime)===0)return"24時間営業";return`${openingTime||"—"}〜${closingTime||"—"}`}
export function getStoreBusinessPeriods(day?:Partial<StoreBusinessDay>):StoreBusinessPeriod[]{
  if(!day)return[];
  const explicit=Array.isArray(day.periods)?day.periods.filter(period=>period&&(period.openingTime||period.closingTime)):[];
  if(explicit.length)return explicit;
  return day.openingTime||day.closingTime?[{openingTime:day.openingTime||"",closingTime:day.closingTime||""}]:[];
}
export function formatStoreBusinessDay(day?:Partial<StoreBusinessDay>){if(day?.closed)return"定休日";const periods=getStoreBusinessPeriods(day);return periods.length?periods.map(period=>formatStoreHoursRange(period.openingTime,period.closingTime)).join(" / "):"未登録"}
type LabeledStoreBusinessDay=Partial<StoreBusinessDay>&{key:string;label:string};
function formatGroupedDayLabels(days:readonly LabeledStoreBusinessDay[],positions:number[]){
  if(positions.length===days.length)return"";
  const parts:string[]=[];
  let start=positions[0];
  let end=start;
  const push=()=>{const length=end-start+1;if(length>=3)parts.push(`${days[start].label}〜${days[end].label}`);else for(let index=start;index<=end;index+=1)parts.push(days[index].label)};
  for(const position of positions.slice(1)){if(position===end+1){end=position;continue}push();start=position;end=position}
  push();
  return parts.join("・");
}
export function groupStoreBusinessDays<T extends LabeledStoreBusinessDay>(days:readonly T[]){
  const groups=new Map<string,{day:T;positions:number[]}>();
  days.forEach((day,index)=>{const signature=formatStoreBusinessDay(day);const existing=groups.get(signature);if(existing)existing.positions.push(index);else groups.set(signature,{day,positions:[index]})});
  return[...groups.entries()].map(([hours,{day,positions}])=>({...day,key:positions.map(position=>days[position].key).join("-"),label:formatGroupedDayLabels(days,positions),hours}));
}
export function formatStoreBusinessHours(hours?:StoreBusinessHours){if(!hours||!Object.keys(hours).length)return"未登録";return STORE_WEEKDAYS.map(({key,label})=>`${label}：${formatStoreBusinessDay(hours[key])}`).join("\n")}
export function formatTodayStoreBusinessHours(hours?:StoreBusinessHours,now=new Date()){if(!hours||!Object.keys(hours).length)return"未登録";const weekday=new Intl.DateTimeFormat("en-US",{timeZone:"Asia/Tokyo",weekday:"short"}).format(now);return formatStoreBusinessDay(hours[STORE_WEEKDAYS[weekdayIndex[weekday]??0].key])}
export function getStoreOpenStatus(hours?:StoreBusinessHours,now=new Date()){
  if(!hours||!Object.values(hours).some(item=>item?.closed||getStoreBusinessPeriods(item).length))return null;
  const parts=new Intl.DateTimeFormat("en-US",{timeZone:"Asia/Tokyo",weekday:"short",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).formatToParts(now);
  const day=weekdayIndex[parts.find(part=>part.type==="weekday")?.value||"Mon"];
  const current=Number(parts.find(part=>part.type==="hour")?.value||0)*60+Number(parts.find(part=>part.type==="minute")?.value||0);
  const previousPeriods=getStoreBusinessPeriods(hours[STORE_WEEKDAYS[(day+6)%7].key]);
  const previousOpen=previousPeriods.find(period=>period.openingTime&&period.closingTime&&minutes(period.closingTime)<=minutes(period.openingTime)&&current<minutes(period.closingTime));
  if(previousOpen){const untilClosing=minutes(previousOpen.closingTime)-current;return untilClosing<=60?{state:"closing-soon" as const,label:"まもなく営業終了"}:{state:"open" as const,label:"営業中"}}
  const today=hours[STORE_WEEKDAYS[day].key];
  if(today?.closed)return{state:"closed" as const,label:"本日定休日"};
  const periods=getStoreBusinessPeriods(today).filter(period=>period.openingTime&&period.closingTime);
  if(!periods.length)return null;
  const active=periods.find(period=>{const opening=minutes(period.openingTime),closing=minutes(period.closingTime);return closing<=opening?current>=opening:current>=opening&&current<closing});
  if(active){const opening=minutes(active.openingTime),closing=minutes(active.closingTime);const untilClosing=closing<=opening?1440-current+closing:closing-current;return untilClosing<=60?{state:"closing-soon" as const,label:"まもなく営業終了"}:{state:"open" as const,label:"営業中"}}
  const untilNext=Math.min(...periods.map(period=>minutes(period.openingTime)-current).filter(value=>value>=0),Infinity);
  if(untilNext<=60)return{state:"opening-soon" as const,label:"まもなく営業開始"};
  return{state:"closed" as const,label:"営業時間外"};
}
