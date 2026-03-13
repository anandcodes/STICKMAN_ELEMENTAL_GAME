type AndroidBridgeApi = {
  isAdsDisabled?: () => boolean;
  requestPurchaseRemoveAds?: () => void;
  requestShowInterstitialAd?: () => void;
  requestShowRewardedAd?: (placement: string) => void;
  exitApp?: () => void;
};

declare global {
  interface Window {
    AndroidBridge?: AndroidBridgeApi;
    onAdsStatusChanged?: (adsDisabled: boolean) => void;
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
  if (typeof window === 'undefined') return;
  window.AndroidBridge?.requestPurchaseRemoveAds?.();
}

export function requestInterstitialAd(): void {
  if (typeof window === 'undefined') return;
  window.AndroidBridge?.requestShowInterstitialAd?.();
}

export function setupAdsStatusListener(onChange: (adsDisabled: boolean) => void): void {
  if (typeof window === 'undefined') return;
  window.onAdsStatusChanged = (adsDisabled: boolean) => {
    onChange(adsDisabled);
  };
  const initial = safeGetAdsDisabled();
  if (initial) onChange(true);
}

