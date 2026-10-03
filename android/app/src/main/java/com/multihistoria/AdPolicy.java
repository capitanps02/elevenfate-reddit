package com.multihistoria;

/** Foreground play time; background, dialogs and full-screen ads never advance this clock. */
final class AdPolicy {
    static final long FIRST_AD_DELAY_MS = 480_000;
    static final long COOLDOWN_MS = 480_000;
    static final int BREAKS_REQUIRED = 6;
    static final int MAX_PER_SESSION = 2;
    private long activeMs, activeSince=-1, lastShownAt=-1;
    private int completedBreaks, shown;
    AdPolicy(long ignoredStart) { }
    void foreground(long now, boolean value) {
        if(activeSince>=0){activeMs+=Math.max(0,now-activeSince);activeSince=-1;}
        if(value)activeSince=now;
    }
    private long played(long now) {return activeMs+(activeSince<0?0:Math.max(0,now-activeSince));}
    void registerNaturalBreak() { completedBreaks = Math.min(BREAKS_REQUIRED, completedBreaks + 1); }
    boolean canShow(long now, boolean enabled, boolean consent, boolean foreground, boolean ready) {
        long time=played(now);
        return enabled && consent && foreground && ready && shown<MAX_PER_SESSION
            && completedBreaks>=BREAKS_REQUIRED && time>=FIRST_AD_DELAY_MS
            && (lastShownAt<0 || time-lastShownAt>=COOLDOWN_MS);
    }
    void recordShown(long now) {lastShownAt=played(now);completedBreaks=0;shown++;}
}
