import {HELP_PAGES,HELP_VERSION} from '../shared/help-content.mjs';

export const SOURCE_HELP_VERSION='2026-10-12';
export const SOURCE_HELP_HASH='c5142ab897931f682890d4c4a1de35bcd1406e07ddbcb5043dc766294a9c343b';
export const EN_HELP={
 privacy:{title:'ElevenFate for Reddit privacy policy',paragraphs:[
  'Edition dated 12 October 2026. The creator of ElevenFate, u/Accomplished-Race114, handles enquiries about this edition through r/ElevenFate modmail. Reddit operates the platform and Devvit storage under its own policies.',
  'We process your authenticated Reddit identifier, the name you choose for your character, choices, progress and scores. We store one career and its previous backup, Daily attempts, practice runs and a record index with a random session to recover data and avoid conflicts. We do not ask for your password or email address.',
  'Data is stored in Devvit Redis, separated by community. Your browser may keep a cache of your confirmed career and scene and language preferences. Your language preference is stored only in this browser, not in your save or leaderboard record. We do not send saves to external servers. This edition has no adverts or purchases. Usage statistics are optional and disabled until you accept them in Help and data. They record time, screens, progress and error counts, without names, story choices or saves. They are linked to your account in this installation to measure return visits and support export and deletion. The creator views aggregate reports only. Records expire no later than 90 days after your last activity; opting out deletes measurements and keeps a temporary disabled preference to reject pending uploads.',
  'Your career and its index are kept for as long as you wish to retain them. Daily runs expire seven days after the day changes; practice runs from v5 onwards expire one day later, and earlier practice runs seven days later. Leaderboard records expire eight days after their last entry. Indexes discard old Daily references when writing.',
  'Completing Daily automatically records your result on this community\'s leaderboard. The server stores your identifier and score; other players see ranks and points without your name or identifier. Practice is not ranked.',
  'In Help and data you can export records and delete all game data from this installation, including your career, backup, Daily runs, practice runs, leaderboard records and usage statistics. Deletion invalidates previous sessions. We retain only a marker linked to your account until the next 00:00 UTC to prevent another competitive attempt that day. It then expires automatically. Deleting only your career keeps other modes and a revision counter.',
  'Downloaded exports remain under your control. We cannot delete copies on other devices from this screen. For access, corrections, account deletion or questions, contact us through modmail; do not attach saves or identifiers unless needed. Deletion must be handled separately for each installation. Recovery depends on confirmed data and Reddit availability.'
 ]},
 terms:{title:'ElevenFate for Reddit terms',paragraphs:[
  'Edition dated 12 October 2026. ElevenFate is a narrative football game available in Spanish and English, created by u/Accomplished-Race114. Contact: r/ElevenFate modmail. Use is also subject to Reddit\'s terms and the rules of the community where you play.',
  'Free career keeps your story. Daily offers 30 choices and one competitive attempt per account per UTC day, resetting at 00:00 UTC. Practice can be repeated and is unranked. There are no cash prizes, purchases or promises of results.',
  'Do not manipulate requests or use multiple accounts or data deletion to gain a competitive advantage. After deleting all data, Daily is blocked until the next UTC reset. You can play free career and practice when you reopen the game.',
  'Rules may evolve; attempts already started keep their version. Scores and titles are game elements, not assessments of real footballers. Characters and clubs are fictional.',
  'The game is in development. We may fix bugs and change content; we do not guarantee continuous availability or recovery of deleted data. Export a copy to retain your career. These terms do not limit any rights you have under applicable law.',
  'Reporting a problem is voluntary. Opening the modmail form does not send a message: you decide what to write and whether to send it. You can keep playing without posting comments or providing additional data.'
 ]}
};

if(HELP_VERSION!==SOURCE_HELP_VERSION)throw Error('English help requires source review');
export const helpCatalog=Object.fromEntries(Object.entries(HELP_PAGES).flatMap(([page,source])=>{
 const translated=EN_HELP[page];
 if(!translated||translated.paragraphs.length!==source.paragraphs.length)throw Error('Incomplete English help');
 return [[source.title,translated.title],...source.paragraphs.map((paragraph,i)=>[paragraph,translated.paragraphs[i]])];
}));
