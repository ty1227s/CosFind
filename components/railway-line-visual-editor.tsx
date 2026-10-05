"use client";

import { useState } from "react";
import { RailwayLineImageEditor } from "./railway-line-image-editor";

type VisualType = "image" | "color";
const HEX_COLOR = /^#[0-9a-f]{6}$/i;

export function RailwayLineVisualEditor({ initialType, initialImageUrl = "", initialLineColor = "" }: { initialType?: VisualType; initialImageUrl?: string; initialLineColor?: string }) {
  const [visualType, setVisualType] = useState<VisualType>(initialType ?? (initialImageUrl ? "image" : "color"));
  const [lineColor, setLineColor] = useState(HEX_COLOR.test(initialLineColor) ? initialLineColor.toLowerCase() : "");
  const pickerColor = HEX_COLOR.test(lineColor) ? lineColor : "#888888";
  return <fieldset className="railway-line-visual-editor">
    <legend>路線記号・ラインカラー（任意）</legend>
    <small>路線記号画像とラインカラーは両方登録できます。表示方法では、路線一覧などで優先する表示を選択します。</small>
    <input type="hidden" name="visualType" value={visualType}/>
    <div className="railway-visual-type-options">
      <label><input type="radio" checked={visualType === "image"} onChange={() => setVisualType("image")}/><span>路線記号画像を優先</span></label>
      <label><input type="radio" checked={visualType === "color"} onChange={() => setVisualType("color")}/><span>ラインカラーを優先</span></label>
    </div>
    <input type="hidden" name="lineColor" value={lineColor}/>
    <div className="railway-line-color-input">
      <input type="color" value={pickerColor} aria-label="ラインカラーを選択" onChange={(event) => setLineColor(event.target.value.toLowerCase())}/>
      <label><span>カラーコード</span><input value={lineColor} pattern="#[0-9a-fA-F]{6}" placeholder="#231ef4" onChange={(event) => setLineColor(event.target.value.trim())}/></label>
      <i style={{ backgroundColor: HEX_COLOR.test(lineColor) ? lineColor : "transparent" }}/>
    </div>
    <RailwayLineImageEditor initialUrl={initialImageUrl}/>
  </fieldset>;
}
