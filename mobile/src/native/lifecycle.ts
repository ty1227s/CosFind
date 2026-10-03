import {Capacitor} from "@capacitor/core";
import {App} from "@capacitor/app";
export function installLifecycle(){if(!Capacitor.isNativePlatform())return;
 void App.addListener("backButton",({canGoBack})=>{const close=document.querySelector<HTMLButtonElement>(".mobile-menu-layer.is-open .mobile-menu-close");if(close){close.click();return;}if(canGoBack)history.back();else void App.exitApp();});
 void App.addListener("appStateChange",({isActive})=>{if(isActive)window.dispatchEvent(new Event("focus"));});
}
