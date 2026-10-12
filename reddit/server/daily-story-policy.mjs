// Same Daily eligibility policy as the original runner; no scheduling or RNG here.
const families=new Set(['family','social','medical','tactical','press','image','life','team']);
const safePath=/^(body\.|sport\.(form|roleScore|minutesShare|positionIdentity)|personality\.|reputation\.|control\.|professional\.(technique|composure|tacticalReading|motivationReserve|recoveryMargin)|finances\.)/;
const safeEffect=effect=>effect.kind==='numeric'&&safePath.test(effect.path);
export const isEligibleDailyStory=event=>families.has(event.family)&&!event.seedsRead?.length&&!event.seedsWrite?.length&&event.choices.length>=2&&event.choices.length<=3&&!/Valdoria|UDV|Nano|Vela/.test(event.text.body)&&event.outcomes.every(outcome=>!outcome.seedTransitions?.length&&outcome.effects.every(safeEffect))&&event.choices.every(choice=>[...(choice.immediateEffects??[]),...(choice.hiddenCosts??[])].every(safeEffect));
export const eligibleDailyStories=events=>events.filter(isEligibleDailyStory);
