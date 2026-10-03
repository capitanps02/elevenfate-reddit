# SDK request configuration is observed by the emulator probe.
-keep class com.google.android.gms.ads.RequestConfiguration { public *; }
-keep class com.google.android.gms.ads.MobileAds { public static com.google.android.gms.ads.RequestConfiguration getRequestConfiguration(); }
-keep enum com.google.android.gms.ads.AgeRestrictedTreatment { public *; }
# Invoke the registered back callback from instrumentation; API36 gestures do not dispatch BACK keys.
-keepclassmembers class androidx.activity.ComponentActivity {
    public androidx.activity.OnBackPressedDispatcher getOnBackPressedDispatcher();
}
-keepclassmembers class androidx.activity.OnBackPressedDispatcher {
    public void onBackPressed();
}
