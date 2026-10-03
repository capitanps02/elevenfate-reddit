package com.multihistoria;

import androidx.activity.ComponentActivity;
import androidx.activity.OnBackPressedCallback;
import android.app.AlertDialog;
import android.annotation.SuppressLint;
import android.graphics.Color;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Button;
import android.view.Gravity;
import com.google.android.gms.ads.AdView;
import android.os.Build;
import android.view.WindowInsets;
import android.content.ClipData;
import android.content.Intent;
import android.os.Bundle;
import android.net.Uri;
import android.webkit.JavascriptInterface;
import android.webkit.WebResourceRequest;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebResourceResponse;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import androidx.webkit.WebViewAssetLoader;
import java.io.ByteArrayInputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

/** Minimal offline shell: every game byte is packaged under android_asset. */
public final class MainActivity extends ComponentActivity {
    private static final String ASSET_ORIGIN = "https://appassets.androidplatform.net/assets/";
    private static final int FILE_REQUEST = 4311;
    private static final int SAVE_REQUEST = 4312;
    private WebView game;
    private AdsController ads;
    private LinearLayout bannerPanel;
    private boolean agePrompt;
    private boolean resumed;
    private ValueCallback<Uri[]> fileCallback;
    private File pendingDownloadFile;

    // The packaged game requires JavaScript; CSP and origin checks reject external code.
    @SuppressLint("SetJavaScriptEnabled")
    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        if (state != null) {
            String pending = state.getString("elevenfate.pendingExport");
            if (pending != null && pending.matches("elevenfate-export-[a-zA-Z0-9_-]+\\.json")) {
                File file = new File(getCacheDir(), pending);
                if (file.isFile()) pendingDownloadFile = file;
            }
        }
        getOnBackPressedDispatcher().addCallback(this,new OnBackPressedCallback(true) {
            @Override public void handleOnBackPressed() { handleGameBack(); }
        });
        game = new WebView(this);
        WebView.setWebContentsDebuggingEnabled(BuildConfig.DEBUG);
        game.setBackgroundColor(Color.rgb(9,9,11));
        game.getSettings().setMixedContentMode(android.webkit.WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        game.getSettings().setJavaScriptEnabled(true);
        game.getSettings().setDomStorageEnabled(true);
        game.getSettings().setDatabaseEnabled(true);
        game.getSettings().setAllowFileAccess(false);
        game.getSettings().setAllowContentAccess(false);
        game.getSettings().setAllowFileAccessFromFileURLs(false);
        game.getSettings().setAllowUniversalAccessFromFileURLs(false);
        final WebViewAssetLoader assets = new WebViewAssetLoader.Builder()
            .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this)).build();
        game.setWebViewClient(new WebViewClient() {
            @Override public void onPageFinished(WebView view, String url) {
                if (!isGameUrl(url)) return;
                emitAdsState();
                if (!getSharedPreferences("elevenfate.privacy",MODE_PRIVATE).contains("ageGroup")) showAgeOptions();
            }
            @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                WebResourceResponse response = assets.shouldInterceptRequest(request.getUrl());
                return response != null ? response : new WebResourceResponse("text/plain", "UTF-8",
                    403, "Blocked", java.util.Collections.emptyMap(), new ByteArrayInputStream(new byte[0]));
            }
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return !isGameUrl(request.getUrl().toString());
            }
            @Override public boolean shouldOverrideUrlLoading(WebView view, String url) {
                return !isGameUrl(url);
            }
        });
        game.setWebChromeClient(new WebChromeClient() {
            @Override public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback,
                                                        FileChooserParams params) {
                if (fileCallback != null) fileCallback.onReceiveValue(null);
                fileCallback = callback;
                Intent intent;
                try {
                    intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
                    intent.addCategory(Intent.CATEGORY_OPENABLE);
                    String[] types = params.getAcceptTypes();
                    String type = "application/json";
                    if (types != null) {
                        for (String candidate : types) {
                            if (candidate != null && !candidate.trim().isEmpty()) { type = candidate; break; }
                        }
                    }
                    intent.setType(type);
                    intent.putExtra(Intent.EXTRA_ALLOW_MULTIPLE,
                        params.getMode() == FileChooserParams.MODE_OPEN_MULTIPLE);
                    startActivityForResult(intent, FILE_REQUEST);
                } catch (Exception error) {
                    fileCallback = null;
                    callback.onReceiveValue(null);
                    return false;
                }
                return true;
            }
        });
        game.addJavascriptInterface(new AndroidBridge(), "AndroidBridge");
        FrameLayout container=new FrameLayout(this);
        container.setBackgroundColor(Color.rgb(9,9,11));
        LinearLayout layout=new LinearLayout(this);layout.setOrientation(LinearLayout.VERTICAL);
        layout.addView(game,new LinearLayout.LayoutParams(-1,0,1));
        bannerPanel=new LinearLayout(this);bannerPanel.setOrientation(LinearLayout.VERTICAL);bannerPanel.setGravity(Gravity.CENTER);bannerPanel.setVisibility(android.view.View.GONE);
        layout.addView(bannerPanel,new LinearLayout.LayoutParams(-1,-2));
        container.addView(layout,new FrameLayout.LayoutParams(-1,-1));
        container.setOnApplyWindowInsetsListener((view,insets) -> {
            if(Build.VERSION.SDK_INT>=30) {
                android.graphics.Insets safe=insets.getInsets(WindowInsets.Type.systemBars() | WindowInsets.Type.displayCutout());
                view.setPadding(safe.left,safe.top,safe.right,safe.bottom);
            } else {
                view.setPadding(insets.getSystemWindowInsetLeft(),insets.getSystemWindowInsetTop(),
                    insets.getSystemWindowInsetRight(),insets.getSystemWindowInsetBottom());
            }
            return insets;
        });
        setContentView(container);
        container.requestApplyInsets();
        ads=new AdsController(this,new AdsController.Listener() {
            @Override public void onStateChanged() { emitAdsState(); }
            @Override public void onBannerChanged(AdView view) {
                bannerPanel.removeAllViews();
                bannerPanel.setVisibility(view==null?android.view.View.GONE:android.view.View.VISIBLE);
                if(view==null)return;
                LinearLayout header=new LinearLayout(MainActivity.this);
                TextView label=new TextView(MainActivity.this);label.setText(R.string.advertisement);label.setTextColor(Color.LTGRAY);
                header.addView(label,new LinearLayout.LayoutParams(0,-2,1));
                Button close=new Button(MainActivity.this);close.setText(R.string.close_advertisement);close.setOnClickListener(v -> ads.closeBanner());
                header.addView(close);bannerPanel.addView(header);bannerPanel.addView(view);
            }
            @Override public void onFullScreenChanged(boolean showing) {
                if(showing)signalPlatformPause();else signalPlatformResume();
            }
        });
        if(getSharedPreferences("elevenfate.privacy",MODE_PRIVATE).contains("ageGroup"))
            ads.start(getSharedPreferences("elevenfate.privacy",MODE_PRIVATE).getString("ageGroup","unknown"));
        game.loadUrl(ASSET_ORIGIN + "index.html");
    }

    private static boolean isGameUrl(String url) {
        Uri uri=Uri.parse(url);
        return "https".equals(uri.getScheme()) && "appassets.androidplatform.net".equals(uri.getHost())
            && (uri.getPort()==-1 || uri.getPort()==443) && uri.getPath()!=null && uri.getPath().startsWith("/assets/");
    }

    private void emitAdsState() {
        if(game!=null)game.post(() -> {
            if(game!=null)game.evaluateJavascript("window.dispatchEvent(new Event('elevenfate:ads-state'))",null);
        });
    }

    private void showAgeOptions() {
        if(agePrompt || isFinishing() || (ads!=null && ads.isShowing()))return;
        agePrompt=true;signalPlatformPause();
        new AlertDialog.Builder(this).setTitle("Tu grupo de edad")
            .setItems(new String[]{"Menos de 16 años","16 o 17 años","18 años o más","Prefiero no indicarlo"},(dialog,index) -> {
                String group=index==0?"under16":index==1?"16to17":index==2?"18plus":"unknown";
                getSharedPreferences("elevenfate.privacy",MODE_PRIVATE).edit().putString("ageGroup",group).apply();
                agePrompt=false;ads.start(group);signalPlatformResume();
            }).setOnCancelListener(dialog -> {
                getSharedPreferences("elevenfate.privacy",MODE_PRIVATE).edit().putString("ageGroup","unknown").apply();
                agePrompt=false;ads.start("unknown");signalPlatformResume();
            }).show();
    }

    private void signalPlatformPause() {
        if (game == null) return;
        game.evaluateJavascript("window.dispatchEvent(new Event('muir:platform-pause'))", null);
    }

    private void signalPlatformResume() {
        if (game == null || !resumed || agePrompt || (ads!=null && ads.isShowing())) return;
        game.post(() -> {
            if (game != null && resumed && !agePrompt && (ads==null || !ads.isShowing())) game.evaluateJavascript(
                "window.dispatchEvent(new Event('muir:platform-resume'))", null);
        });
    }

    @Override protected void onPause() {
        resumed=false;
        if(ads!=null)ads.foreground(false);
        signalPlatformPause();
        if(game!=null)game.onPause();
        super.onPause();
    }

    @Override protected void onResume() {
        super.onResume();
        resumed=true;
        if(game!=null)game.onResume();
        if(ads!=null)ads.foreground(true);
        signalPlatformResume();
    }

    @Override public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if(ads!=null)ads.foreground(hasFocus && resumed);
        if (hasFocus) signalPlatformResume();
    }

    private final class AndroidBridge {
        @JavascriptInterface public String getAdStatus() { return ads==null?"{}":ads.status(); }
        @JavascriptInterface public void naturalBreak() { runOnUiThread(() -> { if(ads!=null && !agePrompt)ads.naturalBreak(); }); }
        @JavascriptInterface public void showPrivacyOptions() { runOnUiThread(() -> { if(ads!=null)ads.showPrivacyOptions(); }); }
        @JavascriptInterface public void showAgeOptions() { runOnUiThread(() -> MainActivity.this.showAgeOptions()); }
        @JavascriptInterface public void testInterstitial() { runOnUiThread(() -> { if(ads!=null && BuildConfig.AD_DIAGNOSTICS)ads.showInterstitial(true); }); }
        @JavascriptInterface public void testRewarded() { runOnUiThread(() -> { if(ads!=null && BuildConfig.AD_DIAGNOSTICS)ads.showRewardedDiagnostic(); }); }
        @JavascriptInterface public void openPrivacyPolicy() { runOnUiThread(() -> {
            if(BuildConfig.PRIVACY_POLICY_URL.startsWith("https://")) {
                try { startActivity(new Intent(Intent.ACTION_VIEW,Uri.parse(BuildConfig.PRIVACY_POLICY_URL))); }
                catch(Exception ignored) { }
            }
        }); }

        @JavascriptInterface public void saveTextFile(final String filename, final String text) {
            runOnUiThread(() -> {
                if (pendingDownloadFile != null) return;
                if (text == null || text.isEmpty()) {
                    android.widget.Toast.makeText(MainActivity.this, R.string.export_failed, android.widget.Toast.LENGTH_LONG).show();
                    return;
                }
                String name = (filename == null || filename.trim().isEmpty())
                    ? "elevenfate-partida.json" : filename;
                Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
                intent.addCategory(Intent.CATEGORY_OPENABLE);
                intent.setType("application/json");
                intent.putExtra(Intent.EXTRA_TITLE, name);
                try {
                    // Keep JSON out of the state Bundle: long careers can exceed Binder limits.
                    pendingDownloadFile = File.createTempFile("elevenfate-export-", ".json", getCacheDir());
                    try (FileOutputStream output = new FileOutputStream(pendingDownloadFile)) {
                        output.write((text == null ? "" : text).getBytes(StandardCharsets.UTF_8));
                        output.getFD().sync();
                    }
                    startActivityForResult(intent, SAVE_REQUEST);
                } catch (Exception error) {
                    if (pendingDownloadFile != null) pendingDownloadFile.delete();
                    pendingDownloadFile = null;
                    android.widget.Toast.makeText(MainActivity.this, R.string.export_failed, android.widget.Toast.LENGTH_LONG).show();
                }
            });
        }
    }

    @Override protected void onSaveInstanceState(Bundle state) {
        if (pendingDownloadFile != null) state.putString("elevenfate.pendingExport", pendingDownloadFile.getName());
        super.onSaveInstanceState(state);
    }

    @Override protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == FILE_REQUEST) {
            ValueCallback<Uri[]> callback = fileCallback;
            fileCallback = null;
            if (callback == null) return;
            Uri[] result = null;
            if (resultCode == RESULT_OK && data != null) {
                ClipData clips = data.getClipData();
                if (clips != null && clips.getItemCount() > 0) {
                    result = new Uri[clips.getItemCount()];
                    for (int i = 0; i < clips.getItemCount(); i++) result[i] = clips.getItemAt(i).getUri();
                } else if (data.getData() != null) {
                    result = new Uri[] { data.getData() };
                }
            }
            callback.onReceiveValue(result);
        } else if (requestCode == SAVE_REQUEST) {
            File pending = pendingDownloadFile;
            pendingDownloadFile = null;
            if (resultCode != RESULT_OK || data == null || data.getData() == null) {
                if (pending != null) pending.delete();
                return;
            }
            if (pending == null || !pending.isFile()) {
                android.widget.Toast.makeText(this, R.string.export_failed, android.widget.Toast.LENGTH_LONG).show();
                return;
            }
            Uri destination = data.getData();
            // A document provider can perform network I/O; leave the UI responsive while copying.
            new Thread(() -> {
                try (InputStream input = new FileInputStream(pending);
                     OutputStream output = getContentResolver().openOutputStream(destination)) {
                    if (output == null) throw new IOException("Document provider returned no stream");
                    byte[] buffer = new byte[8192];
                    int length;
                    while ((length = input.read(buffer)) != -1) output.write(buffer, 0, length);
                } catch (Exception error) {
                    runOnUiThread(() -> android.widget.Toast.makeText(this, R.string.export_failed, android.widget.Toast.LENGTH_LONG).show());
                    return;
                } finally {
                    pending.delete();
                }
                runOnUiThread(() -> android.widget.Toast.makeText(this, R.string.export_saved, android.widget.Toast.LENGTH_SHORT).show());
            }, "elevenfate-export").start();
        }
    }

    private void exitFromBack() {
        finish();
    }

    private void handleGameBack() {
        if (game == null) {
            exitFromBack();
            return;
        }
        if (game.canGoBack()) {
            game.goBack();
            return;
        }
        game.evaluateJavascript("history.length > 1", value -> {
            if ("true".equals(value)) game.evaluateJavascript("history.back()", null);
            else exitFromBack();
        });
    }

    @Override protected void onDestroy() {
        if(ads!=null)ads.destroy();
        if (fileCallback != null) { fileCallback.onReceiveValue(null); fileCallback = null; }
        if (isFinishing() && pendingDownloadFile != null) pendingDownloadFile.delete();
        pendingDownloadFile = null;
        if (game != null) { game.loadUrl("about:blank"); game.destroy(); game = null; }
        super.onDestroy();
    }
}
