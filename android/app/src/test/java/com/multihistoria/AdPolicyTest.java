package com.multihistoria;
import org.junit.Test;
import static org.junit.Assert.*;
public class AdPolicyTest {
    private AdPolicy ready(){AdPolicy p=new AdPolicy(0);p.foreground(0,true);for(int i=0;i<6;i++)p.registerNaturalBreak();return p;}
    @Test public void consentForegroundAndInventoryAreRequired(){AdPolicy p=ready();assertFalse(p.canShow(480000,true,false,true,true));assertFalse(p.canShow(480000,true,true,false,true));assertFalse(p.canShow(480000,true,true,true,false));assertTrue(p.canShow(480000,true,true,true,true));}
    @Test public void requiresEightActiveMinutesAndSixResults(){AdPolicy p=new AdPolicy(0);p.foreground(0,true);for(int i=0;i<5;i++)p.registerNaturalBreak();assertFalse(p.canShow(600000,true,true,true,true));p.registerNaturalBreak();assertFalse(p.canShow(479999,true,true,true,true));assertTrue(p.canShow(480000,true,true,true,true));}
    @Test public void backgroundAndAdsDoNotCountAsPlaying(){AdPolicy p=ready();p.foreground(60000,false);p.foreground(3600000,true);assertFalse(p.canShow(3600000,true,true,true,true));assertTrue(p.canShow(4020000,true,true,true,true));p.recordShown(4020000);p.foreground(4020000,false);p.foreground(8000000,true);for(int i=0;i<6;i++)p.registerNaturalBreak();assertFalse(p.canShow(8000000,true,true,true,true));assertTrue(p.canShow(8480000,true,true,true,true));}
    @Test public void twoPerSessionAndEightMinutesBetweenAds(){AdPolicy p=ready();for(int ad=0;ad<2;ad++){long now=480000+ad*480000;assertTrue(p.canShow(now,true,true,true,true));p.recordShown(now);for(int i=0;i<6;i++)p.registerNaturalBreak();assertFalse(p.canShow(now+479999,true,true,true,true));}assertFalse(p.canShow(9999999,true,true,true,true));}
    @Test public void allAgeGroupsHaveTreatmentIncludingUnknown(){assertEquals(AdAudience.Treatment.CHILD,AdAudience.treatment("under16"));assertTrue(AdAudience.protectedFormat("unknown"));assertTrue(AdAudience.protectedFormat("invalid"));assertEquals(AdAudience.Treatment.TEEN,AdAudience.treatment("16plus"));assertEquals(AdAudience.Treatment.TEEN,AdAudience.treatment("16to17"));assertEquals(AdAudience.Treatment.ADULT,AdAudience.treatment("18plus"));}
}
