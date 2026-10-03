package com.multihistoria;

/** Unknown and legacy ages receive protected advertising without disabling ads. */
final class AdAudience {
    enum Treatment { CHILD, TEEN, ADULT }
    static Treatment treatment(String group) {
        if("18plus".equals(group))return Treatment.ADULT;
        if("16to17".equals(group)||"16plus".equals(group))return Treatment.TEEN;
        return Treatment.CHILD;
    }
    static boolean protectedFormat(String group) { return treatment(group)==Treatment.CHILD; }
}
