type AndroidBridgeApi = {
  isAdsDisabled?: () => boolean;
  requestPurchaseRemoveAds?: () => void;
  requestShowInterstitialAd?: () => void;
  requestShowRewardedAd?: (placement: string) => void;
  exitApp?: () => void;
  notifyBridgeReady?: () => void;
};

declare global {
  interface Window {
    AndroidBridge?: AndroidBridgeApi;
    onAdsStatusChanged?: (adsDisabled: boolean) => void;
    onNativeBridgeInit?: () => void;
  }
}

let isBridgeReady = false;
const pendingCalls: (() => void)[] = [];

export function isNativeBridgeReady(): boolean {
  return isBridgeReady || (typeof window !== 'undefined' && !!window.AndroidBridge);
}

function callWhenReady(fn: () => void) {
  if (isNativeBridgeReady()) {
    fn();
  } else {
    pendingCalls.push(fn);
  }
}

if (typeof window !== 'undefined') {
  window.onNativeBridgeInit = () => {
    isBridgeReady = true;
    while (pendingCalls.length > 0) {
      pendingCalls.shift()?.();
    }
  };
  
  // Proactively check if bridge is already there
  if (window.AndroidBridge) {
    window.onNativeBridgeInit();
  }
}

function safeGetAdsDisabled(): boolean {
  try {
    if (typeof window !== 'undefined' && window.AndroidBridge?.isAdsDisabled) {
      return Boolean(window.AndroidBridge.isAdsDisabled());
    }
  } catch {
    // Native bridge unavailable or threw
  }
  return false;
}

export function getInitialAdsDisabled(): boolean {
  return safeGetAdsDisabled();
}

export function requestRemoveAdsPurchase(): void {
  callWhenReady(() => window.AndroidBridge?.requestPurchaseRemoveAds?.());
}

export function requestInterstitialAd(): void {
  callWhenReady(() => window.AndroidBridge?.requestShowInterstitialAd?.());
}

export function requestRewardedAd(placement: string): void {
  callWhenReady(() => window.AndroidBridge?.requestShowRewardedAd?.(placement));
}

export function exitApp(): void {
  callWhenReady(() => window.AndroidBridge?.exitApp?.());
}

export function setupAdsStatusListener(onChange: (adsDisabled: boolean) => void): void {
  if (typeof window === 'undefined') return;
  window.onAdsStatusChanged = (adsDisabled: boolean) => {
    onChange(adsDisabled);
  };
  const initial = safeGetAdsDisabled();
  if (initial) onChange(true);
}

