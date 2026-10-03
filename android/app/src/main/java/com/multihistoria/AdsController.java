package com.multihistoria;

import android.app.Activity;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.SystemClock;
import android.widget.Toast;
import com.google.android.gms.ads.*;
import com.google.android.gms.ads.interstitial.InterstitialAd;
import com.google.android.gms.ads.interstitial.InterstitialAdLoadCallback;
import com.google.android.gms.ads.rewarded.RewardedAd;
import com.google.android.gms.ads.rewarded.RewardedAdLoadCallback;
import com.google.ads.mediation.admob.AdMobAdapter;
import com.google.android.ump.*;
import org.json.JSONObject;

/** Families-listed SDK, protected banner for children/unknown, contextual requests for everyone. */
final class AdsController {
    interface Listener {void onStateChanged();void onFullScreenChanged(boolean showing);void onBannerChanged(AdView view);}
    private final Activity activity;
    private final Listener listener;
    private final ConsentInformation consent;
    private final AdPolicy policy=new AdPolicy(0);
    private final Handler handler=new Handler(Looper.getMainLooper());
    private boolean initialized,initializing,destroyed,foreground,showing,privacyBusy;
    private boolean loadingInterstitial,loadingRewarded,loadingBanner,bannerReady,bannerVisible;
    private int generation;
    private long lastLoadAttempt=-1,loadedAt;
    private String ageGroup="unknown",message="Comprobando privacidad…";
    private InterstitialAd interstitial;
    private RewardedAd rewarded;
    private AdView banner;
    private volatile String statusJson="{}";
    AdsController(Activity activity,Listener listener){this.activity=activity;this.listener=listener;consent=UserMessagingPlatform.getConsentInformation(activity);publish();}
    private void ui(Runnable task){activity.runOnUiThread(()->{if(!destroyed)task.run();});}
    String status(){return statusJson;}
    boolean isShowing(){return showing||privacyBusy;}
    private boolean protectedFormat(){return AdAudience.protectedFormat(ageGroup);}
    private void updateClock(){policy.foreground(SystemClock.elapsedRealtime(),foreground&&!showing&&!privacyBusy);}
    void foreground(boolean value){foreground=value;updateClock();if(banner!=null){if(value)banner.resume();else banner.pause();}if(!value&&bannerVisible)closeBanner();}
    private RequestConfiguration configuration(){
        AgeRestrictedTreatment treatment=AdAudience.treatment(ageGroup)==AdAudience.Treatment.CHILD?AgeRestrictedTreatment.CHILD:
            AdAudience.treatment(ageGroup)==AdAudience.Treatment.TEEN?AgeRestrictedTreatment.TEEN:AgeRestrictedTreatment.UNSPECIFIED;
        return new RequestConfiguration.Builder().setAgeRestrictedTreatment(treatment).setMaxAdContentRating(RequestConfiguration.MAX_AD_CONTENT_RATING_G).build();
    }
    void start(String group){
        int token=++generation;ageGroup=group;interstitial=null;rewarded=null;closeBanner();loadingInterstitial=false;loadingRewarded=false;loadingBanner=false;lastLoadAttempt=-1;
        if(!BuildConfig.ADS_ENABLED){message="Publicidad desactivada.";publish();return;}
        MobileAds.setRequestConfiguration(configuration());
        message="Comprobando opciones de privacidad…";publish();
        ConsentRequestParameters params=new ConsentRequestParameters.Builder().setTagForUnderAgeOfConsent(protectedFormat()).build();
        consent.requestConsentInfoUpdate(activity,params,()->ui(()->{
            if(token!=generation)return;
            if(protectedFormat()){message="Publicidad contextual con protección de edad.";initializeIfAllowed();publish();return;}
            privacyBusy=true;updateClock();listener.onFullScreenChanged(true);
            UserMessagingPlatform.loadAndShowConsentFormIfRequired(activity,error->ui(()->{
                privacyBusy=false;updateClock();listener.onFullScreenChanged(false);
                if(token!=generation)return;
                message=error==null?"Privacidad actualizada.":"Privacidad no disponible. Puedes seguir jugando.";initializeIfAllowed();publish();
            }));
        }),error->ui(()->{if(token!=generation)return;message="Sin conexión para actualizar privacidad. Puedes seguir jugando.";initializeIfAllowed();publish();}));
    }
    private boolean allowed(){return BuildConfig.ADS_ENABLED&&consent.canRequestAds();}
    private AdRequest request(){Bundle extras=new Bundle();extras.putString("npa","1");return new AdRequest.Builder().addNetworkExtrasBundle(AdMobAdapter.class,extras).build();}
    private void initializeIfAllowed(){
        if(!allowed()||initializing)return;
        MobileAds.setRequestConfiguration(configuration());
        if(initialized){preload();return;}
        initializing=true;
        new Thread(()->{try{MobileAds.initialize(activity.getApplicationContext(),result->ui(()->{
            initializing=false;initialized=true;MobileAds.setRequestConfiguration(configuration());preload();publish();
        }));}catch(RuntimeException error){ui(()->{initializing=false;message="Publicidad no disponible. Puedes seguir jugando.";publish();});}},"elevenfate-ads-init").start();
    }
    void preload(){
        if(!initialized||!allowed()||privacyBusy||destroyed)return;
        long now=SystemClock.elapsedRealtime();if(lastLoadAttempt>=0&&now-lastLoadAttempt<30000)return;lastLoadAttempt=now;
        final int token=generation;
        if(protectedFormat()){
            if(banner!=null||loadingBanner||BuildConfig.BANNER_ID.isEmpty())return;
            loadingBanner=true;AdView view=new AdView(activity);banner=view;view.setAdUnitId(BuildConfig.BANNER_ID);view.setAdSize(AdSize.BANNER);
            view.setAdListener(new AdListener(){
                @Override public void onAdLoaded(){ui(()->{if(token!=generation||banner!=view)return;loadingBanner=false;bannerReady=true;loadedAt=SystemClock.elapsedRealtime();message="Anuncio protegido preparado.";publish();});}
                @Override public void onAdFailedToLoad(LoadAdError error){ui(()->{if(token!=generation||banner!=view)return;loadingBanner=false;closeBanner();message="No hay anuncios disponibles. Puedes seguir jugando.";publish();});}
            });view.loadAd(request());return;
        }
        if(interstitial==null&&!loadingInterstitial){loadingInterstitial=true;InterstitialAd.load(activity,BuildConfig.INTERSTITIAL_ID,request(),new InterstitialAdLoadCallback(){
            @Override public void onAdLoaded(InterstitialAd ad){ui(()->{if(token!=generation)return;loadingInterstitial=false;if(allowed()){interstitial=ad;loadedAt=SystemClock.elapsedRealtime();message="Anuncio preparado.";}publish();});}
            @Override public void onAdFailedToLoad(LoadAdError error){ui(()->{if(token!=generation)return;loadingInterstitial=false;message="No hay anuncios disponibles. Puedes seguir jugando.";publish();});}
        });}
        if(BuildConfig.AD_DIAGNOSTICS&&rewarded==null&&!loadingRewarded&&!BuildConfig.REWARDED_ID.isEmpty()){
            loadingRewarded=true;RewardedAd.load(activity,BuildConfig.REWARDED_ID,request(),new RewardedAdLoadCallback(){
                @Override public void onAdLoaded(RewardedAd ad){ui(()->{if(token!=generation)return;loadingRewarded=false;if(allowed())rewarded=ad;publish();});}
                @Override public void onAdFailedToLoad(LoadAdError error){ui(()->{if(token!=generation)return;loadingRewarded=false;publish();});}
            });
        }
    }
    void naturalBreak(){policy.registerNaturalBreak();showInterstitial(false);}
    void showInterstitial(boolean diagnostic){
        boolean test=diagnostic&&BuildConfig.AD_DIAGNOSTICS;long now=SystemClock.elapsedRealtime();
        if(now-loadedAt>3300000&&!bannerVisible){interstitial=null;rewarded=null;if(banner!=null)closeBanner();}
        boolean ready=protectedFormat()?bannerReady:interstitial!=null;
        if(showing||bannerVisible||privacyBusy||!allowed()||!foreground||!ready||(!test&&!policy.canShow(now,true,consent.canRequestAds(),foreground,true))){
            if(test)Toast.makeText(activity,"Anuncio todavía no disponible. "+message,Toast.LENGTH_SHORT).show();preload();return;
        }
        if(protectedFormat()){
            bannerVisible=true;if(!test)policy.recordShown(now);listener.onBannerChanged(banner);publish();
            final AdView current=banner;handler.postDelayed(()->{if(banner==current){closeBanner();lastLoadAttempt=-1;preload();}},20000);return;
        }
        InterstitialAd ad=interstitial;interstitial=null;setShowing(true);
        ad.setFullScreenContentCallback(new FullScreenContentCallback(){
            @Override public void onAdShowedFullScreenContent(){ui(()->{if(!test)policy.recordShown(SystemClock.elapsedRealtime());});}
            @Override public void onAdDismissedFullScreenContent(){ui(()->completed());}
            @Override public void onAdFailedToShowFullScreenContent(AdError error){ui(()->completed());}
        });try{ad.show(activity);}catch(RuntimeException error){completed();}
    }
    void closeBanner(){
        listener.onBannerChanged(null);bannerVisible=false;bannerReady=false;loadingBanner=false;
        if(banner!=null){banner.destroy();banner=null;}publish();
    }
    void showRewardedDiagnostic(){
        if(!BuildConfig.AD_DIAGNOSTICS||protectedFormat()||showing||privacyBusy||!allowed()||!foreground||rewarded==null){Toast.makeText(activity,"Vídeo de prueba todavía no disponible para este perfil.",Toast.LENGTH_SHORT).show();preload();return;}
        RewardedAd ad=rewarded;rewarded=null;setShowing(true);ad.setFullScreenContentCallback(new FullScreenContentCallback(){
            @Override public void onAdDismissedFullScreenContent(){ui(()->completed());}
            @Override public void onAdFailedToShowFullScreenContent(AdError error){ui(()->completed());}
        });try{ad.show(activity,item->ui(()->{message="Recompensa de prueba confirmada. La partida no se modifica.";Toast.makeText(activity,message,Toast.LENGTH_LONG).show();publish();}));}catch(RuntimeException error){completed();}
    }
    private void setShowing(boolean value){showing=value;updateClock();listener.onFullScreenChanged(value);publish();}
    private void completed(){setShowing(false);lastLoadAttempt=-1;preload();}
    boolean privacyRequired(){return !protectedFormat()&&consent.getPrivacyOptionsRequirementStatus()==ConsentInformation.PrivacyOptionsRequirementStatus.REQUIRED;}
    void showPrivacyOptions(){
        if(!privacyRequired()||showing||privacyBusy)return;privacyBusy=true;updateClock();interstitial=null;rewarded=null;closeBanner();listener.onFullScreenChanged(true);
        UserMessagingPlatform.showPrivacyOptionsForm(activity,error->ui(()->{privacyBusy=false;updateClock();lastLoadAttempt=-1;listener.onFullScreenChanged(false);message="Opciones de privacidad actualizadas.";initializeIfAllowed();publish();}));
    }
    private void publish(){try{statusJson=new JSONObject().put("testMode",BuildConfig.AD_DIAGNOSTICS).put("ageEligible",BuildConfig.ADS_ENABLED)
        .put("protectedFormat",protectedFormat()).put("ageTreatment",AdAudience.treatment(ageGroup).name()).put("nonPersonalized",true)
        .put("privacyPolicyAvailable",BuildConfig.PRIVACY_POLICY_URL.startsWith("https://")).put("privacyRequired",privacyRequired())
        .put("bannerReady",bannerReady).put("interstitialReady",interstitial!=null).put("rewardedReady",rewarded!=null).put("message",message).toString();}catch(Exception ignored){statusJson="{}";}listener.onStateChanged();}
    void destroy(){destroyed=true;handler.removeCallbacksAndMessages(null);closeBanner();interstitial=null;rewarded=null;}
}
