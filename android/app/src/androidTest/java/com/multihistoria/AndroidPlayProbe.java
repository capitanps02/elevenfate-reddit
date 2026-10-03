package com.multihistoria;

import android.app.Activity;
import android.app.Instrumentation;
import android.content.Intent;
import android.content.IntentFilter;
import android.net.Uri;
import android.os.PatternMatcher;
import android.content.pm.ApplicationInfo;
import android.content.pm.ActivityInfo;
import android.content.res.Configuration;
import android.os.Bundle;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.WebView;
import android.graphics.Bitmap;
import android.view.accessibility.AccessibilityNodeInfo;
import java.io.File;
import java.io.FileOutputStream;
import org.json.JSONArray;
import org.json.JSONObject;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;

/** Test-only probe for the signed Play internal bundle; no dependency on obfuscated app classes. */
public final class AndroidPlayProbe extends Instrumentation {
    private WebView web;
    private String phase;
    private String privacyUrl;
    private static final String ROOT="document.querySelector('#game')?.shadowRoot";
    @Override public void onCreate(Bundle args){super.onCreate(args);phase=args.getString("phase","create");privacyUrl=args.getString("privacyUrl","");start();}
    private WebView findWeb(View view){
        if(view instanceof WebView)return (WebView)view;
        if(view instanceof ViewGroup){ViewGroup group=(ViewGroup)view;for(int i=0;i<group.getChildCount();i++){WebView child=findWeb(group.getChildAt(i));if(child!=null)return child;}}
        return null;
    }
    private String js(String source)throws Exception{
        CountDownLatch done=new CountDownLatch(1);AtomicReference<String> value=new AtomicReference<>();
        runOnMainSync(()->web.evaluateJavascript(source,result->{value.set(result);done.countDown();}));
        if(!done.await(60,TimeUnit.SECONDS))throw new Exception("WebView JavaScript timeout");return value.get();
    }
    private void until(String condition)throws Exception{
        long end=System.nanoTime()+TimeUnit.SECONDS.toNanos(90);
        while(System.nanoTime()<end){if("true".equals(js("Boolean("+condition+")")))return;Thread.sleep(150);}
        throw new Exception("UI timeout: "+condition);
    }
    private String snapshot()throws Exception{
        js("window.__playSnapshot=null;(async()=>{try{const {createIndexedSaveStore}=await import('https://appassets.androidplatform.net/assets/web/indexed-save-store.js');const s=createIndexedSaveStore({storage:localStorage,indexedDB,key:'historia-jugador.android.offline.session.v1',validate:()=>{}});window.__playSnapshot=await s.readRaw();await s.close();}catch(e){window.__playSnapshot='ERROR:'+e.message;}})()");
        until("window.__playSnapshot!==null");String raw=new JSONArray("["+js("window.__playSnapshot")+"]").getString(0);if(raw.startsWith("ERROR:"))throw new Exception(raw);new JSONObject(raw);return raw;
    }
    private void restore(String raw)throws Exception{
        js("window.__promoRestore=null;(async()=>{try{const {GameSession}=await import('https://appassets.androidplatform.net/assets/dist/session/game-session.js');const {createIndexedSaveStore}=await import('https://appassets.androidplatform.net/assets/web/indexed-save-store.js');await GameSession.migrateFromSave("+JSONObject.quote(raw)+",{commit:async()=>{}});const store=createIndexedSaveStore({storage:localStorage,indexedDB,key:'historia-jugador.android.offline.session.v1',validate:()=>{}});await store.write(JSON.parse("+JSONObject.quote(raw)+"),await store.readRaw());await store.close();window.__promoRestore='PASS';}catch(e){window.__promoRestore='ERROR:'+e.message;}})()");
        until("window.__promoRestore!==null");if(!"\"PASS\"".equals(js("window.__promoRestore")))throw new Exception(js("window.__promoRestore"));
        js("location.reload()");until("typeof window.__promoRestore==='undefined'");until(ROOT+"?.querySelector('.save-status')?.textContent.includes('Guardado automático')");
    }
    private void capture(File destination)throws Exception{
                    Thread.sleep(300);
                    AccessibilityNodeInfo active=null;
                    long surfaceDeadline=System.nanoTime()+TimeUnit.SECONDS.toNanos(15);
                    while(System.nanoTime()<surfaceDeadline){
                        active=getUiAutomation().getRootInActiveWindow();
                        if(active!=null&&getTargetContext().getPackageName().contentEquals(active.getPackageName()))break;
                        Thread.sleep(250);
                    }
                    if(active==null||!getTargetContext().getPackageName().contentEquals(active.getPackageName()))throw new Exception("Native screenshot is blocked by another app/system window: "+(active==null?"none":active.getPackageName()));
                    until("[..."+ROOT+".querySelectorAll('.brand-emblem,.brand-cover')].every(img=>img.complete&&img.naturalWidth>0)");
                    CountDownLatch drawn=new CountDownLatch(1);
                    runOnMainSync(()->web.postVisualStateCallback(System.nanoTime(),new WebView.VisualStateCallback(){@Override public void onComplete(long requestId){drawn.countDown();}}));
                    if(!drawn.await(10,TimeUnit.SECONDS)){if(!"promo".equals(phase))throw new Exception("Screenshot visual state timeout");android.util.Log.w("ELEVENFATE_PROMO","Visual callback timed out; native capture requires visual review");Thread.sleep(1500);}
                    Thread.sleep(1200);
                    Bitmap bitmap=getUiAutomation().takeScreenshot();
                    if(bitmap==null)throw new Exception("Screenshot unavailable");
                    try(FileOutputStream stream=new FileOutputStream(destination)){
                        if(!bitmap.compress(Bitmap.CompressFormat.PNG,100,stream))throw new Exception("Screenshot encoding failed");
                        stream.getFD().sync();
                    }finally{bitmap.recycle();}
    }
    @Override public void onStart(){
        Bundle report=new Bundle();
        try{
            String packageName=getTargetContext().getPackageName();
            if(!"com.elevenfate.game".equals(packageName))throw new Exception("Wrong Play package");
            if((getTargetContext().getApplicationInfo().flags&ApplicationInfo.FLAG_DEBUGGABLE)!=0)throw new Exception("App is debuggable");
            getTargetContext().getSharedPreferences("elevenfate.privacy",0).edit().putString("ageGroup","under16").commit();
            Intent intent=getTargetContext().getPackageManager().getLaunchIntentForPackage(packageName);
            if(intent==null)throw new Exception("Launcher missing");
            Activity activity=startActivitySync(intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
            runOnMainSync(()->web=findWeb(activity.getWindow().getDecorView()));
            if(web==null)throw new Exception("WebView missing");
            until(ROOT+"?.querySelector('.save-status')?.textContent.includes('Guardado automático')");
            if(!"true".equals(js("isSecureContext&&!!crypto.subtle&&!!indexedDB")))throw new Exception("Secure WebView APIs missing");
            JSONObject status=new JSONObject(new JSONArray("["+js("AndroidBridge.getAdStatus()")+"]").getString(0));
            if(status.getBoolean("ageEligible")||status.getBoolean("testMode")||status.getBoolean("interstitialReady")||status.getBoolean("rewardedReady")||status.getBoolean("bannerReady"))throw new Exception("Internal ad isolation failed");
            report.putString("nonDebuggableAndAdsDisabled","PASS");
            if("create".equals(phase)){
                if(!privacyUrl.startsWith("https://")||!status.getBoolean("privacyPolicyAvailable"))throw new Exception("Published privacy link unavailable");
                String tab="[..."+ROOT+".querySelectorAll('nav button')].find(b=>b.textContent.trim()==='Tu partida')";
                until(tab);js(tab+".click()");
                String button="[..."+ROOT+".querySelectorAll('button')].find(b=>b.textContent.trim()==='Política de privacidad')";
                until(button);
                Uri expected=Uri.parse(privacyUrl);
                IntentFilter filter=new IntentFilter(Intent.ACTION_VIEW);
                filter.addDataScheme("https");filter.addDataAuthority(expected.getHost(),null);
                filter.addDataPath(expected.getPath(),PatternMatcher.PATTERN_LITERAL);
                // Intercept only the expected browser intent: this probe remains offline.
                ActivityMonitor monitor=addMonitor(filter,new ActivityResult(Activity.RESULT_OK,null),true);
                try{
                    js(button+".click()");
                    long end=System.nanoTime()+TimeUnit.SECONDS.toNanos(10);
                    while(monitor.getHits()==0&&System.nanoTime()<end)Thread.sleep(100);
                    if(monitor.getHits()!=1)throw new Exception("Privacy button did not open expected HTTPS address");
                    report.putString("privacyPolicyButtonAndIntent","PASS "+privacyUrl);
                }finally{removeMonitor(monitor);}
                String home="[..."+ROOT+".querySelectorAll('nav button')].find(b=>b.textContent.trim()==='Inicio')";
                until(home);js(home+".click()");
            }
            if("create".equals(phase)){
                String initial=snapshot();
                js("window.__playFixture=null;(async()=>{try{const {GameSession}=await import('https://appassets.androidplatform.net/assets/dist/session/game-session.js');const {createIndexedSaveStore}=await import('https://appassets.androidplatform.net/assets/web/indexed-save-store.js');const s=await GameSession.migrateFromSave("+JSONObject.quote(initial)+",{commit:async()=>{}});const runId=crypto.randomUUID();for(let i=0;i<30;i++){const v=s.getView();if(v.screen==='decision')break;await s.dispatch({type:v.screen==='result'?'acknowledge':'continue',commandId:'play-fixture-'+runId+'-'+i,expectedRevision:v.revision});}if(s.getView().screen!=='decision')throw Error('No decision');const store=createIndexedSaveStore({storage:localStorage,indexedDB,key:'historia-jugador.android.offline.session.v1',validate:()=>{}});const old=await store.readRaw();await store.write(s.exportSnapshot(),old);await store.close();window.__playFixture='PASS';}catch(e){window.__playFixture='ERROR:'+e.message;}})()");
                until("window.__playFixture!==null");if(!"\"PASS\"".equals(js("window.__playFixture")))throw new Exception(js("window.__playFixture"));
                js("location.reload()");until(ROOT+"?.querySelector('.choice:not(:disabled)')");
                String before=snapshot();js(ROOT+".querySelector('.choice:not(:disabled)').click()");
                until(ROOT+"?.querySelector('[data-result-continue]')");String after=snapshot();
                if(before.equals(after))throw new Exception("Decision did not commit");
                getTargetContext().getSharedPreferences("android-play-probe",0).edit().putString("expected",after).commit();
                report.putString("actualChoiceSaved","PASS");
            }else if("resume".equals(phase)){
                String expected=getTargetContext().getSharedPreferences("android-play-probe",0).getString("expected",null);
                if(expected==null||!expected.equals(snapshot()))throw new Exception("Process death changed save");
                report.putString("exactForceStopRecovery","PASS");
                runOnMainSync(()->activity.setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_LANDSCAPE));
                long end=System.nanoTime()+TimeUnit.SECONDS.toNanos(15);
                while(activity.getResources().getConfiguration().orientation!=Configuration.ORIENTATION_LANDSCAPE&&System.nanoTime()<end)Thread.sleep(100);
                if(activity.getResources().getConfiguration().orientation!=Configuration.ORIENTATION_LANDSCAPE)throw new Exception("Rotation did not occur");
                until(ROOT+"?.querySelector('main')");if(!expected.equals(snapshot()))throw new Exception("Rotation changed save");
                runOnMainSync(()->activity.setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_PORTRAIT));
                report.putString("rotationKeepsSave","PASS");
            }else if("promo".equals(phase)){
                String backup=getTargetContext().getSharedPreferences("android-play-probe",0).getString("expected",null);if(backup==null)backup=snapshot();
                File directory=new File(getTargetContext().getExternalFilesDir(null),"play-promo");
                if(!directory.isDirectory()&&!directory.mkdirs())throw new Exception("Promo directory unavailable");
                String[] fixtures={"sport","decision","career","career"};
                String[] tabs={"","","Carrera","Relaciones"};
                String[] names={"01-decision-real.png","02-mercado-real.png","03-carrera-real.png","04-relaciones-real.png"};
                try{
                    for(int i=0;i<fixtures.length;i++){
                        String raw=new String(java.nio.file.Files.readAllBytes(new File(directory,fixtures[i]+".json").toPath()),java.nio.charset.StandardCharsets.UTF_8);
                        restore(raw);
                        until(ROOT+"?.querySelector('main')");
                        if(tabs[i].isEmpty()){until(ROOT+"?.querySelector('.decision-sheet')");js(ROOT+".querySelector('details.intel[open] summary')?.click()");js(ROOT+".querySelector('.decision-sheet').scrollIntoView({block:'start'})");}
                        else{
                            String nav="[..."+ROOT+".querySelectorAll('nav button')].find(b=>b.textContent.trim()==="+JSONObject.quote(tabs[i])+")";
                            until(nav);js(nav+".click()");
                            until(ROOT+"?.querySelector('nav [aria-current=page]')?.textContent.trim()==="+JSONObject.quote(tabs[i]));
                            if("Carrera".equals(tabs[i]))js(ROOT+".querySelector('.career-seasons-section').scrollIntoView({block:'start'})");
                        }
                        android.util.Log.i("ELEVENFATE_PROMO","capture "+names[i]);capture(new File(directory,names[i]));android.util.Log.i("ELEVENFATE_PROMO","captured "+names[i]);
                        report.putString(names[i],js(ROOT+".querySelector('main').innerText"));
                    }
                }finally{restore(backup);}
                report.putString("screenshots",directory.getAbsolutePath());
                report.putString("saveRestored",backup.equals(snapshot())?"PASS":"FAIL");
            }else if("screenshots".equals(phase)){
                File directory=new File(getTargetContext().getExternalFilesDir(null),"play-screenshots");
                if(!directory.isDirectory()&&!directory.mkdirs())throw new Exception("Screenshot directory unavailable");
                String[] labels={"Inicio","Carrera","Mundo","Tu partida"};
                String[] names={"01-inicio.png","02-carrera.png","03-mundo.png","04-partida.png"};
                for(int i=0;i<labels.length;i++){
                    String choice="[..."+ROOT+".querySelectorAll('nav button')].find(b=>b.textContent.trim()==="+JSONObject.quote(labels[i])+")";
                    until(choice);js(choice+".click()");
                    until(ROOT+"?.querySelector('nav [aria-current=page]')?.textContent.trim()==="+JSONObject.quote(labels[i]));
                    capture(new File(directory,names[i]));
                }
                report.putString("screenshots",directory.getAbsolutePath());
            }else throw new Exception("Unknown phase");
            report.putString("package",packageName);report.putString("phase",phase);report.putString("buildInfo",js("globalThis.ELEVENFATE_BUILD_INFO"));
            report.putString("result","PASS signed Play bundle "+phase);finish(Activity.RESULT_OK,report);
        }catch(Exception error){report.putString("result","FAIL signed Play bundle "+phase+": "+error.getMessage());finish(Activity.RESULT_CANCELED,report);}
    }
}
