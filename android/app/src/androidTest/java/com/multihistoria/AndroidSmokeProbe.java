package com.multihistoria;

import android.app.Activity;
import android.app.Instrumentation;
import android.content.Intent;
import android.content.pm.ActivityInfo;
import android.content.res.Configuration;
import android.os.Bundle;
import android.webkit.WebView;
import androidx.activity.ComponentActivity;
import org.json.JSONObject;
import org.json.JSONArray;
import android.view.View;
import android.view.ViewGroup;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;

/** Dedicated emulator probe: actual packaged UI, WebView and IndexedDB, never a production phone. */
public final class AndroidSmokeProbe extends Instrumentation {
    private String phase;
    private WebView web;
    private static final String ROOT="document.querySelector('#game')?.shadowRoot";
    @Override public void onCreate(Bundle args) { super.onCreate(args);phase=args.getString("phase","create");start(); }
    private String js(String source) throws Exception {
        CountDownLatch done=new CountDownLatch(1);AtomicReference<String> value=new AtomicReference<>();
        runOnMainSync(() -> web.evaluateJavascript(source,result -> {value.set(result);done.countDown();}));
        if(!done.await(60,TimeUnit.SECONDS))throw new Exception("JavaScript timeout: "+source.substring(0,Math.min(180,source.length())));return value.get();
    }
    private void until(String expression) throws Exception {
        long end=System.currentTimeMillis()+(expression.equals("window.__career!==null")?600_000:30_000);
        while(System.currentTimeMillis()<end){if("true".equals(js("Boolean("+expression+")")))return;Thread.sleep(200);}
        throw new Exception("UI condition timed out: "+expression+" UI="+js(ROOT+"?.querySelector('main h1')?.textContent"));
    }
    private String snapshot() throws Exception {
        js("window.__snapshot=null;(async()=>{try{const {createIndexedSaveStore}=await import('https://appassets.androidplatform.net/assets/web/indexed-save-store.js');const s=createIndexedSaveStore({storage:localStorage,indexedDB,key:'historia-jugador.android.offline.session.v1',validate:()=>{}});window.__snapshot=await s.readRaw();await s.close();}catch(e){window.__snapshot='ERROR:'+e.message;}})()");
        until("window.__snapshot!==null");String encoded=js("window.__snapshot");String text=new JSONArray("["+encoded+"]").getString(0);
        if(text.startsWith("ERROR:"))throw new Exception(text);new JSONObject(text);return text;
    }
    private void click(String text) throws Exception {
        String expr="[..."+ROOT+".querySelectorAll('button:not(:disabled)')].find(b=>b.textContent.trim()==="+JSONObject.quote(text)+")";
        until(expr);js(expr+".click()");
    }
    private WebView findWeb(View view) {
        if(view instanceof WebView)return (WebView)view;
        if(view instanceof ViewGroup){ViewGroup group=(ViewGroup)view;for(int i=0;i<group.getChildCount();i++){WebView found=findWeb(group.getChildAt(i));if(found!=null)return found;}}
        return null;
    }
    @Override public void onStart() {
        Bundle report=new Bundle();long start=System.nanoTime();
        try {
            getTargetContext().getSharedPreferences("elevenfate.privacy",0).edit().putString("ageGroup","under16").commit();
            Activity activity=startActivitySync(new Intent(getTargetContext(),MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
            runOnMainSync(() -> web=findWeb(activity.getWindow().getDecorView()));
            if(web==null)throw new Exception("Game WebView missing");
            until(ROOT+"?.querySelector('.save-status')?.textContent.includes('Guardado automático')");
            report.putLong("startupMs",TimeUnit.NANOSECONDS.toMillis(System.nanoTime()-start));
            if(!"true".equals(js("isSecureContext && !!crypto.subtle && !!indexedDB")))throw new Exception("Missing secure WebView APIs");
            if(!"\"ELEVENFATE\"".equals(js("document.title")))throw new Exception("Brand title missing");
            JSONObject ads=new JSONObject(new JSONArray("["+js("AndroidBridge.getAdStatus()")+"]").getString(0));
            if(!ads.getBoolean("ageEligible") || !ads.getBoolean("protectedFormat") || !ads.getBoolean("nonPersonalized") || !"CHILD".equals(ads.getString("ageTreatment")) || ads.getBoolean("interstitialReady") || ads.getBoolean("rewardedReady"))throw new Exception("Protected advertising treatment failed");
            if(com.google.android.gms.ads.MobileAds.getRequestConfiguration().getAgeRestrictedTreatment()!=com.google.android.gms.ads.AgeRestrictedTreatment.CHILD)throw new Exception("SDK age treatment missing");
            report.putString("protectedAdTreatment","PASS: ads enabled with SDK CHILD treatment, contextual banner only");
            click("Tu partida");until(ROOT+"?.querySelector('main h1')?.textContent==='Tu partida'");
            if(!"true".equals(js("Boolean("+ROOT+".querySelector('input[type=file][accept*=json]'))")))throw new Exception("Import control missing");
            if(!"true".equals(js("[..."+ROOT+".querySelectorAll('button')].some(b=>b.textContent==='Descargar copia')")))throw new Exception("Export control missing");
            if(!"true".equals(js("[..."+ROOT+".querySelectorAll('button')].some(b=>b.textContent==='Grupo de edad')")))throw new Exception("Age/privacy options missing");
            report.putString("fileAndPrivacyControls","PASS");
            runOnMainSync(() -> ((ComponentActivity)activity).getOnBackPressedDispatcher().onBackPressed());
            until(ROOT+"?.querySelector('main h1')?.textContent!=='Tu partida'");report.putString("nativeBack","PASS");
            getTargetContext().getSharedPreferences("android-smoke",0);
            if("create".equals(phase)) {
                String initial=snapshot();
                js("window.__fixture=null;(async()=>{try{const {GameSession}=await import('https://appassets.androidplatform.net/assets/dist/session/game-session.js');const {createIndexedSaveStore}=await import('https://appassets.androidplatform.net/assets/web/indexed-save-store.js');const s=await GameSession.migrateFromSave("+JSONObject.quote(initial)+",{commit:async()=>{}});for(let i=0;i<30;i++){const v=s.getView();if(v.screen==='decision')break;await s.dispatch({type:v.screen==='result'?'acknowledge':'continue',commandId:'smoke-'+Date.now()+'-'+i,expectedRevision:v.revision});}if(s.getView().screen!=='decision')throw Error('No decision fixture');const store=createIndexedSaveStore({storage:localStorage,indexedDB,key:'historia-jugador.android.offline.session.v1',validate:()=>{}});const old=await store.readRaw();await store.write(s.exportSnapshot(),old);await store.close();window.__fixture='PASS';}catch(e){window.__fixture='ERROR:'+e.message;}})()");
                until("window.__fixture!==null");if(!"\"PASS\"".equals(js("window.__fixture")))throw new Exception(js("window.__fixture"));
                js("location.reload()");until(ROOT+"?.querySelector('.choice:not(:disabled)')");
                String before=snapshot();
                js(ROOT+".querySelector('.choice:not(:disabled)').click()");until(ROOT+"?.querySelector('[data-result-continue]')");
                String after=snapshot();if(before.equals(after))throw new Exception("Choice did not commit save");
                getTargetContext().getSharedPreferences("android-smoke",0).edit().putString("expected",after).commit();
                report.putString("actualChoiceSaved","PASS");
            } else if("career".equals(phase)) {
                String initial=snapshot();
                js("window.__career=null;(async()=>{try{const {GameSession}=await import('https://appassets.androidplatform.net/assets/dist/session/game-session.js');const {createIndexedSaveStore}=await import('https://appassets.androidplatform.net/assets/web/indexed-save-store.js');const s=await GameSession.migrateFromSave("+JSONObject.quote(initial)+",{commit:async()=>{}});for(let i=0;i<600&&s.getView().age<21;i++){const v=s.getView();let c={commandId:'career-'+Date.now()+'-'+i,expectedRevision:v.revision};if(v.screen==='decision')Object.assign(c,{type:'choose',pendingInstanceId:v.decision.instanceId,choiceId:v.decision.choices[0].id});else if(v.screen==='result')c.type='acknowledge';else if(v.screen==='offer')Object.assign(c,{type:'offer',offerId:v.offer.id,action:'accept'});else Object.assign(c,{type:'continue',maxDays:366});if(i%10===0)console.info('ELEVENFATE_QA_CAREER step='+i+' age='+v.age+' screen='+v.screen+' type='+c.type);await s.dispatch(c);await new Promise(r=>setTimeout(r,0));}if(s.getView().age<21)throw Error('Career did not reach age 21');const store=createIndexedSaveStore({storage:localStorage,indexedDB,key:'historia-jugador.android.offline.session.v1',validate:()=>{}});const old=await store.readRaw();await store.write(s.exportSnapshot(),old);await store.close();window.__career='PASS';}catch(e){window.__career='ERROR:'+e.message;}})()");
                until("window.__career!==null");if(!"\"PASS\"".equals(js("window.__career")))throw new Exception(js("window.__career"));
                String after=snapshot();
                getTargetContext().getSharedPreferences("android-smoke",0).edit().putString("expected",after).commit();
                report.putString("multiYearCareerSaved","PASS: reached age 21 with canonical GameSession commands");
            } else if("resume".equals(phase)) {
                String expected=getTargetContext().getSharedPreferences("android-smoke",0).getString("expected",null);
                if(expected==null || !expected.equals(snapshot()))throw new Exception("Save changed across process death");
                report.putString("recoveredAfterForceStop","PASS");
                runOnMainSync(() -> activity.setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_LANDSCAPE));
                long rotationEnd=System.currentTimeMillis()+10_000;
                while(activity.getResources().getConfiguration().orientation!=Configuration.ORIENTATION_LANDSCAPE && System.currentTimeMillis()<rotationEnd)Thread.sleep(100);
                if(activity.getResources().getConfiguration().orientation!=Configuration.ORIENTATION_LANDSCAPE)throw new Exception("Landscape rotation failed");
                until(ROOT+"?.querySelector('main')");
                if(!expected.equals(snapshot()))throw new Exception("Rotation changed save");
                runOnMainSync(() -> activity.setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_PORTRAIT));
                report.putString("rotationKeepsSave","PASS");
            } else throw new Exception("Unknown phase "+phase);
            report.putString("result","PASS "+phase+": packaged game, saves, controls, back and protected advertising treatment");
            finish(Activity.RESULT_OK,report);
        } catch(Exception error) {report.putString("result","FAIL "+phase+": "+error.getMessage());finish(Activity.RESULT_CANCELED,report);}
    }
}
