package com.watchlr.app;

import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
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
