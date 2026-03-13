package com.yourstudio.elementalstickman;

import android.annotation.SuppressLint;
import android.content.Context;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import androidx.annotation.Nullable;
import androidx.appcompat.app.AppCompatActivity;

import com.android.billingclient.api.BillingClient;
import com.android.billingclient.api.BillingClientStateListener;
import com.android.billingclient.api.BillingFlowParams;
import com.android.billingclient.api.BillingResult;
import com.android.billingclient.api.ProductDetails;
import com.android.billingclient.api.Purchase;
import com.android.billingclient.api.PurchasesUpdatedListener;
import com.android.billingclient.api.QueryProductDetailsParams;
import com.google.android.gms.ads.AdRequest;
import com.google.android.gms.ads.InitializationStatus;
import com.google.android.gms.ads.MobileAds;
import com.google.android.gms.ads.interstitial.InterstitialAd;
import com.google.android.gms.ads.interstitial.InterstitialAdLoadCallback;

import java.lang.ref.WeakReference;
import java.util.ArrayList;
import java.util.List;

public class MainActivity extends AppCompatActivity implements PurchasesUpdatedListener {

    private static final String PREFS_NAME = "elemental_stickman_prefs";
    private static final String KEY_ADS_DISABLED = "ads_disabled";
    private static final String REMOVE_ADS_PRODUCT_ID = "remove_ads";

    private WebView webView;
    private InterstitialAd interstitialAd;
    private BillingClient billingClient;
    private boolean billingReady = false;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        requestWindowFeature(Window.FEATURE_NO_TITLE);
        getWindow().setFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN,
                WindowManager.LayoutParams.FLAG_FULLSCREEN);

        webView = new WebView(this);
        setContentView(webView);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setMediaPlaybackRequiresUserGesture(false);

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                view.evaluateJavascript("if (window.onNativeBridgeInit) { window.onNativeBridgeInit(); }", null);
            }
        });
        webView.setSystemUiVisibility(
                View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                        | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                        | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                        | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                        | View.SYSTEM_UI_FLAG_FULLSCREEN
                        | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
        );

        webView.addJavascriptInterface(new NativeBridge(this, webView), "AndroidBridge");

        initMobileAds();
        initBillingClient();

        webView.loadUrl("file:///android_asset/index.html");
    }

    @Override
    public void onBackPressed() {
        if (webView != null) {
            webView.evaluateJavascript(
                    "if (window.onAndroidBackPressed) { window.onAndroidBackPressed(); }",
                    null
            );
        } else {
            super.onBackPressed();
        }
    }

    @Override
    protected void onPause() {
        super.onPause();
        if (webView != null) {
            webView.onPause();
        }
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (webView != null) {
            webView.onResume();
        }
    }

    private SharedPreferences getPrefs() {
        return getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
    }

    private boolean isAdsDisabled() {
        return getPrefs().getBoolean(KEY_ADS_DISABLED, false);
    }

    private void setAdsDisabled(boolean disabled) {
        getPrefs().edit().putBoolean(KEY_ADS_DISABLED, disabled).apply();
        notifyAdsDisabledChanged(disabled);
    }

    private void notifyAdsDisabledChanged(boolean disabled) {
        if (webView == null) return;
        String js = "if (window.onAdsStatusChanged) { window.onAdsStatusChanged("
                + (disabled ? "true" : "false") + "); }";
        webView.evaluateJavascript(js, null);
    }

    private void initMobileAds() {
        MobileAds.initialize(this, InitializationStatus::toString);
        if (!isAdsDisabled()) {
            loadInterstitial();
        }
    }

    private void loadInterstitial() {
        if (isAdsDisabled()) return;
        AdRequest request = new AdRequest.Builder().build();
        // Test interstitial ad unit ID. Replace with your real ID before release.
        String adUnitId = "ca-app-pub-3940256099942544/1033173712";
        InterstitialAd.load(
                this,
                adUnitId,
                request,
                new InterstitialAdLoadCallback() {
                    @Override
                    public void onAdLoaded(InterstitialAd ad) {
                        interstitialAd = ad;
                    }

                    @Override
                    public void onAdFailedToLoad(com.google.android.gms.ads.LoadAdError loadAdError) {
                        interstitialAd = null;
                    }
                }
        );
    }

    private void maybeShowInterstitial() {
        if (isAdsDisabled()) return;
        if (interstitialAd != null) {
            interstitialAd.show(this);
            interstitialAd = null;
            loadInterstitial();
        }
    }

    private void initBillingClient() {
        billingClient = BillingClient.newBuilder(this)
                .enablePendingPurchases()
                .setListener(this)
                .build();

        billingClient.startConnection(new BillingClientStateListener() {
            @Override
            public void onBillingSetupFinished(BillingResult billingResult) {
                if (billingResult.getResponseCode() == BillingClient.BillingResponseCode.OK) {
                    billingReady = true;
                    restorePurchases();
                }
            }

            @Override
            public void onBillingServiceDisconnected() {
                billingReady = false;
            }
        });
    }

    private void restorePurchases() {
        if (!billingReady) return;
        billingClient.queryPurchasesAsync(
                BillingClient.ProductType.INAPP,
                (billingResult, purchases) -> handlePurchases(purchases)
        );
    }

    private void handlePurchases(List<Purchase> purchases) {
        if (purchases == null) return;
        for (Purchase purchase : purchases) {
            List<String> productIds = purchase.getProducts();
            if (productIds.contains(REMOVE_ADS_PRODUCT_ID)) {
                setAdsDisabled(true);
            }
        }
    }

    public void startRemoveAdsPurchase() {
        if (!billingReady) return;

        List<QueryProductDetailsParams.Product> productList = new ArrayList<>();
        productList.add(
                QueryProductDetailsParams.Product.newBuilder()
                        .setProductId(REMOVE_ADS_PRODUCT_ID)
                        .setProductType(BillingClient.ProductType.INAPP)
                        .build()
        );

        QueryProductDetailsParams params = QueryProductDetailsParams.newBuilder()
                .setProductList(productList)
                .build();

        billingClient.queryProductDetailsAsync(params, (billingResult, productDetailsList) -> {
            if (billingResult.getResponseCode() != BillingClient.BillingResponseCode.OK) return;
            if (productDetailsList == null || productDetailsList.isEmpty()) return;

            ProductDetails productDetails = productDetailsList.get(0);
            BillingFlowParams.ProductDetailsParams productDetailsParams =
                    BillingFlowParams.ProductDetailsParams.newBuilder()
                            .setProductDetails(productDetails)
                            .build();

            BillingFlowParams flowParams = BillingFlowParams.newBuilder()
                    .setProductDetailsParamsList(List.of(productDetailsParams))
                    .build();

            billingClient.launchBillingFlow(this, flowParams);
        });
    }

    public void requestInterstitialFromJs() {
        maybeShowInterstitial();
    }

    @Override
    public void onPurchasesUpdated(BillingResult billingResult, List<Purchase> purchases) {
        if (billingResult.getResponseCode() == BillingClient.BillingResponseCode.OK && purchases != null) {
            handlePurchases(purchases);
        }
    }

    public static class NativeBridge {
        private final WeakReference<MainActivity> activityRef;
        private final WebView webView;

        NativeBridge(MainActivity activity, WebView webView) {
            this.activityRef = new WeakReference<>(activity);
            this.webView = webView;
        }

        @JavascriptInterface
        public boolean isAdsDisabled() {
            MainActivity activity = activityRef.get();
            return activity != null && activity.isAdsDisabled();
        }

        @JavascriptInterface
        public void requestPurchaseRemoveAds() {
            MainActivity activity = activityRef.get();
            if (activity != null) {
                activity.startRemoveAdsPurchase();
            }
        }

        @JavascriptInterface
        public void requestShowInterstitialAd() {
            MainActivity activity = activityRef.get();
            if (activity != null) {
                activity.requestInterstitialFromJs();
            }
        }

        @JavascriptInterface
        public void exitApp() {
            MainActivity activity = activityRef.get();
            if (activity != null) {
                activity.finish();
            }
        }
    }
}

