package com.watchlr.app;

import android.os.Bundle;
import android.webkit.CookieManager;
import android.webkit.WebView;

import androidx.webkit.UserAgentMetadata;
import androidx.webkit.WebSettingsCompat;
import androidx.webkit.WebViewFeature;

import com.getcapacitor.BridgeActivity;

import java.util.Arrays;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        applyChromeUserAgentMetadata();
        allowThirdPartyCookies();
    }

    // The player iframes (2embed/vidsrc/flixer) are cross-origin, and Android
    // WebView blocks third-party cookies by default — many stream hosts need
    // them to hand out the video, which otherwise fails as a black player.
    private void allowThirdPartyCookies() {
        WebView webView = getBridge() != null ? getBridge().getWebView() : null;
        if (webView != null) {
            CookieManager.getInstance().setAcceptThirdPartyCookies(webView, true);
        }
    }

    // The overrideUserAgent in capacitor.config.ts only changes the UA *string*.
    // The WebView still identifies itself as "Android WebView" through UA Client
    // Hints (Sec-CH-UA headers and navigator.userAgentData), which embed
    // providers (2embed/vidsrc/flixer) use to detect an in-app browser and
    // refuse to play. Rewrite the metadata to match the mobile-Chrome UA string.
    private void applyChromeUserAgentMetadata() {
        WebView webView = getBridge() != null ? getBridge().getWebView() : null;
        if (webView == null || !WebViewFeature.isFeatureSupported(WebViewFeature.USER_AGENT_METADATA)) {
            return;
        }
        UserAgentMetadata metadata = new UserAgentMetadata.Builder()
            .setBrandVersionList(Arrays.asList(
                new UserAgentMetadata.BrandVersion.Builder()
                    .setBrand("Chromium").setMajorVersion("126").setFullVersion("126.0.0.0").build(),
                new UserAgentMetadata.BrandVersion.Builder()
                    .setBrand("Google Chrome").setMajorVersion("126").setFullVersion("126.0.0.0").build(),
                new UserAgentMetadata.BrandVersion.Builder()
                    .setBrand("Not/A)Brand").setMajorVersion("8").setFullVersion("8.0.0.0").build()))
            .setFullVersion("126.0.0.0")
            .setPlatform("Android")
            .setPlatformVersion("14.0.0")
            .setModel("Pixel 7")
            .setMobile(true)
            .build();
        WebSettingsCompat.setUserAgentMetadata(webView.getSettings(), metadata);
    }

    // Make the back button / edge-swipe gesture navigate the WebView's history
    // (Next.js client-side routes) instead of immediately finishing the activity.
    // Only exit the app when there is no page left to go back to.
    @Override
    public void onBackPressed() {
        WebView webView = getBridge() != null ? getBridge().getWebView() : null;
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }
}
