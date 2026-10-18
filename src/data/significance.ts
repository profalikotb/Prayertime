import type { Bi, HijriDate } from '../lib/types';

/**
 * Recommended acts tied to the day — kept separate from historical events.
 * Only authentic (ṣaḥīḥ/ḥasan) references are cited; where scholars legitimately
 * differ, `diff` explains it instead of presenting one view as settled.
 * Where a hadith number is uncertain across editions, the book/chapter is cited instead.
 */
export interface SigItem {
  id: string;
  title: Bi;
  body: Bi;
  refs: string[];
  diff?: Bi;
  tone: 'fast' | 'prayer' | 'eid' | 'night' | 'month' | 'caution';
}

const FRIDAY: SigItem = {
  id: 'friday',
  tone: 'prayer',
  title: { ar: 'يوم الجمعة', en: 'Friday' },
  body: {
    ar: 'صلاة الجمعة فريضة، ويُستحب فيها الغسل والتبكير والإكثار من الصلاة على النبي ﷺ، وتحرّي ساعة الإجابة. ويُكره إفراد يوم الجمعة بالصيام.',
    en: 'Jumuʿa prayer is obligatory; recommended are ghusl, going early, abundant salawat on the Prophet ﷺ, and seeking the hour of response. Singling out Friday alone for fasting is disliked.',
  },
  refs: ['الجمعة ٩', 'صحيح البخاري ٨٧٧ (الغسل)', 'سنن أبي داود ١٠٤٧ (الصلاة على النبي ﷺ)', 'صحيح البخاري ٩٣٥ (ساعة الإجابة)', 'صحيح البخاري ١٩٨٥، صحيح مسلم ١١٤٤ (إفراد الجمعة بالصوم)'],
  diff: {
    ar: 'قراءة سورة الكهف يوم الجمعة: حديثها عند الحاكم والبيهقي، صحّحه بعض المحدثين مرفوعًا ورجّح آخرون وقفه.',
    en: 'Reciting Surat al-Kahf on Friday: reported by al-Hakim and al-Bayhaqi; some graded it authentic as the Prophet’s word, others as a Companion’s statement.',
  },
};

const MON_THU = (isMon: boolean): SigItem => ({
  id: 'monthu',
  tone: 'fast',
  title: { ar: isMon ? 'صيام الإثنين' : 'صيام الخميس', en: isMon ? 'Monday fast' : 'Thursday fast' },
  body: {
    ar: 'يُستحب صيام الإثنين والخميس؛ فيهما تُعرض الأعمال، والإثنين يوم وُلد فيه النبي ﷺ وأُنزل عليه فيه.',
    en: 'Fasting Mondays and Thursdays is recommended: deeds are presented on them, and Monday is the day the Prophet ﷺ was born and received revelation.',
  },
  refs: ['صحيح مسلم ١١٦٢', 'جامع الترمذي ٧٤٧ (حسن)'],
});

const WHITE: SigItem = {
  id: 'white',
  tone: 'fast',
  title: { ar: 'الأيام البيض (١٣، ١٤، ١٥)', en: 'The White Days (13th–15th)' },
  body: {
    ar: 'يُستحب صيام ثلاثة أيام من كل شهر، وأفضلها الأيام البيض.',
    en: 'Fasting three days every month is recommended, best of all the White Days.',
  },
  refs: ['صحيح البخاري ١٩٨١', 'جامع الترمذي ٧٦١، سنن النسائي ٢٤٢٤'],
};

export function significanceFor(h: HijriDate, weekday: number, isAfterMaghrib: boolean, tomorrow: HijriDate): SigItem[] {
  const out: SigItem[] = [];
  const { m, d } = h;
  const tashriq = m === 12 && d >= 11 && d <= 13;
  const eid = (m === 10 && d === 1) || (m === 12 && d === 10);

  // Day-specific occasions first
  if (m === 10 && d === 1) {
    out.push({
      id: 'eid-fitr',
      tone: 'eid',
      title: { ar: 'عيد الفطر المبارك', en: 'Eid al-Fitr' },
      body: {
        ar: 'تُصلّى صلاة العيد ويُكبَّر، ويُسنّ الأكل قبل الخروج (تمرات وترًا)، وتُخرج زكاة الفطر قبل الصلاة. ويحرم صوم يوم العيد.',
        en: 'Eid prayer and takbir; it is sunna to eat (an odd number of dates) before going out, and Zakat al-Fitr is due before the prayer. Fasting on Eid is forbidden.',
      },
      refs: ['صحيح البخاري ٩٥٣ (الأكل قبل الخروج)', 'صحيح البخاري ١٥٠٣ (زكاة الفطر)', 'صحيح البخاري، كتاب الصوم، باب صوم يوم الفطر'],
    });
  }
  if (m === 12 && d === 10) {
    out.push({
      id: 'eid-adha',
      tone: 'eid',
      title: { ar: 'عيد الأضحى المبارك – يوم النحر', en: 'Eid al-Adha – Day of Sacrifice' },
      body: {
        ar: 'صلاة العيد والتكبير، وذبح الأضحية بعد الصلاة لمن استطاع. ويحرم صوم يوم العيد.',
        en: 'Eid prayer and takbir; the sacrifice is offered after the prayer by those able. Fasting on Eid is forbidden.',
      },
      refs: ['الكوثر ٢', 'صحيح البخاري، كتاب الأضاحي', 'صحيح البخاري، كتاب الصوم، باب صوم يوم النحر'],
    });
  }
  if (tashriq) {
    out.push({
      id: 'tashriq',
      tone: 'eid',
      title: { ar: 'أيام التشريق', en: 'Days of Tashriq' },
      body: {
        ar: 'أيام أكل وشرب وذكر لله، يُكبَّر فيها، ولا يُصام فيها (ويجوز للحاج المتمتع والقارن الذي لم يجد الهدي).',
        en: 'Days of eating, drinking and remembrance of Allah, with takbir; fasting is not permitted (except for a pilgrim lacking a sacrificial animal).',
      },
      refs: ['البقرة ٢٠٣', 'صحيح مسلم ١١٤١', 'صحيح البخاري ١٩٩٧–١٩٩٨'],
    });
  }
  if (m === 12 && d === 9) {
    out.push({
      id: 'arafah',
      tone: 'fast',
      title: { ar: 'يوم عرفة', en: 'Day of ʿArafah' },
      body: {
        ar: 'يُستحب صيامه لغير الحاج، ويكفّر السنة الماضية والباقية، وخير الدعاء دعاء يوم عرفة.',
        en: 'Fasting it is recommended for non-pilgrims and expiates the previous and coming year; the best supplication is that of ʿArafah.',
      },
      refs: ['صحيح مسلم ١١٦٢', 'جامع الترمذي ٣٥٨٥ (حسن)'],
    });
  }
  if (m === 12 && d >= 1 && d <= 9) {
    out.push({
      id: 'dh-ten',
      tone: 'month',
      title: { ar: 'العشر الأوائل من ذي الحجة', en: 'First ten days of Dhu al-Hijjah' },
      body: {
        ar: 'أفضل أيام الدنيا للعمل الصالح، ويُستحب فيها الإكثار من التكبير والذكر. ومن أراد أن يضحّي فلا يأخذ من شعره ولا أظفاره حتى يذبح.',
        en: 'The best days for righteous deeds; increase takbir and dhikr. Whoever intends to sacrifice should not cut hair or nails until the sacrifice.',
      },
      refs: ['صحيح البخاري ٩٦٩', 'الحج ٢٨', 'صحيح مسلم ١٩٧٧'],
    });
  }
  if (m === 1 && d === 9) {
    out.push({
      id: 'tasua',
      tone: 'fast',
      title: { ar: 'يوم تاسوعاء', en: 'Tasuʿa (9 Muharram)' },
      body: { ar: 'يُستحب صيامه مع عاشوراء.', en: 'Recommended to fast together with ʿAshura.' },
      refs: ['صحيح مسلم ١١٣٤'],
    });
  }
  if (m === 1 && d === 10) {
    out.push({
      id: 'ashura',
      tone: 'fast',
      title: { ar: 'يوم عاشوراء', en: 'ʿAshura (10 Muharram)' },
      body: {
        ar: 'يوم نجّى الله فيه موسى عليه السلام، وصيامه يكفّر السنة الماضية، ويُستحب صيام يوم قبله.',
        en: 'The day Allah saved Musa; fasting it expiates the previous year, and fasting the day before is recommended.',
      },
      refs: ['صحيح البخاري ٢٠٠٤', 'صحيح مسلم ١١٦٢', 'صحيح مسلم ١١٣٤'],
    });
  }
  if (m === 9) {
    out.push({
      id: 'ramadan',
      tone: 'fast',
      title: { ar: 'شهر رمضان', en: 'Ramadan' },
      body: {
        ar: 'صيامه فريضة، ومن صامه وقامه إيمانًا واحتسابًا غُفر له ما تقدّم من ذنبه. ويُستحب الإكثار من تلاوة القرآن.',
        en: 'Fasting it is obligatory; whoever fasts and prays its nights out of faith and hope of reward is forgiven past sins. Increase Qurʾan recitation.',
      },
      refs: ['البقرة ١٨٣–١٨٥', 'صحيح البخاري ٣٨ (الصيام)', 'صحيح البخاري ٣٧ (القيام)'],
    });
    if (d >= 20) {
      out.push({
        id: 'last-ten',
        tone: 'night',
        title: { ar: 'العشر الأواخر وليلة القدر', en: 'Last ten nights & Laylat al-Qadr' },
        body: {
          ar: 'كان النبي ﷺ يجتهد فيها ويعتكف. ليلة القدر خير من ألف شهر، تُلتمس في الوتر من العشر الأواخر، ولم يثبت تعيينها.',
          en: 'The Prophet ﷺ strove hardest in them and made iʿtikaf. Laylat al-Qadr is better than a thousand months; seek it in the odd nights — its exact night is not fixed.',
        },
        refs: ['القدر ٣', 'صحيح البخاري ٢٠١٧', 'صحيح البخاري ٢٠٢٦ (الاعتكاف)'],
      });
    }
    if (d >= 28) {
      out.push({
        id: 'zakat-fitr',
        tone: 'month',
        title: { ar: 'زكاة الفطر', en: 'Zakat al-Fitr' },
        body: {
          ar: 'تجب قبل صلاة العيد، وكان الصحابة يعطونها قبل العيد بيوم أو يومين.',
          en: 'Due before the Eid prayer; the Companions used to give it a day or two before Eid.',
        },
        refs: ['صحيح البخاري ١٥٠٣', 'صحيح البخاري ١٥١١'],
      });
    }
  }
  if (m === 8) {
    out.push({
      id: 'shaban',
      tone: 'month',
      title: { ar: 'شهر شعبان', en: 'Shaʿban' },
      body: { ar: 'كان النبي ﷺ يُكثر الصيام في شعبان.', en: 'The Prophet ﷺ fasted much of Shaʿban.' },
      refs: ['صحيح البخاري ١٩٦٩', 'صحيح مسلم ١١٥٦'],
    });
    if (d >= 14 && d <= 15) {
      out.push({
        id: 'mid-shaban',
        tone: 'caution',
        title: { ar: 'ليلة النصف من شعبان', en: 'Mid-Shaʿban night' },
        body: {
          ar: 'لم يثبت تخصيصها بصلاة معيّنة، ويصومها من يصوم الأيام البيض على العموم.',
          en: 'No specific prayer for it is authentically established; the 15th may be fasted as one of the White Days.',
        },
        refs: ['سنن ابن ماجه ١٣٩٠'],
        diff: {
          ar: 'حديث اطّلاع الله على خلقه ليلة النصف حسّنه بعض المحدثين بمجموع طرقه وضعّفه آخرون.',
          en: 'The hadith of Allah’s attention to creation on that night was graded hasan by some via its routes and weak by others.',
        },
      });
    }
    if (d >= 29) {
      out.push({
        id: 'pre-ramadan',
        tone: 'caution',
        title: { ar: 'استقبال رمضان', en: 'Before Ramadan' },
        body: {
          ar: 'لا يُتقدَّم رمضان بصوم يوم أو يومين إلا لمن كان له صوم معتاد.',
          en: 'Do not precede Ramadan by fasting a day or two, unless it is a habitual fast.',
        },
        refs: ['صحيح البخاري ١٩١٤', 'صحيح مسلم ١٠٨٢'],
      });
    }
  }
  if (m === 10 && d >= 2) {
    out.push({
      id: 'six-shawwal',
      tone: 'fast',
      title: { ar: 'ست من شوال', en: 'Six days of Shawwal' },
      body: { ar: 'من صام رمضان ثم أتبعه ستًّا من شوال كان كصيام الدهر.', en: 'Whoever fasts Ramadan then follows it with six of Shawwal, it is as if he fasted for a lifetime.' },
      refs: ['صحيح مسلم ١١٦٤'],
    });
  }
  if (m === 1 && d !== 9 && d !== 10) {
    out.push({
      id: 'muharram',
      tone: 'month',
      title: { ar: 'شهر الله المحرم', en: 'Muharram' },
      body: { ar: 'أفضل الصيام بعد رمضان صيام شهر الله المحرم، وهو من الأشهر الحرم.', en: 'The best fasting after Ramadan is in Allah’s month of Muharram, one of the sacred months.' },
      refs: ['صحيح مسلم ١١٦٣', 'التوبة ٣٦'],
    });
  }
  if (m === 7) {
    out.push({
      id: 'rajab',
      tone: 'month',
      title: { ar: 'شهر رجب', en: 'Rajab' },
      body: {
        ar: 'من الأشهر الحرم التي يُعظَّم فيها اجتناب الظلم والمعاصي.',
        en: 'One of the sacred months, in which wrongdoing is graver.',
      },
      refs: ['التوبة ٣٦'],
      diff: {
        ar: 'لم يثبت حديث صحيح في تخصيص رجب بصيام أو صلاة معيّنة عند كثير من المحققين (ابن حجر، تبيين العجب).',
        en: 'Many verifying scholars hold that no authentic hadith singles out Rajab for a specific fast or prayer (Ibn Hajar, Tabyin al-ʿAjab).',
      },
    });
  }
  if (m === 11) {
    out.push({
      id: 'dhulqadah',
      tone: 'month',
      title: { ar: 'شهر ذي القعدة', en: 'Dhu al-Qaʿdah' },
      body: { ar: 'من الأشهر الحرم، ومن أشهر الحج.', en: 'A sacred month and one of the months of Hajj.' },
      refs: ['التوبة ٣٦', 'البقرة ١٩٧'],
    });
  }

  // Weekly & monthly voluntary acts (not on prohibited days, not as Ramadan duplicates)
  if (weekday === 5) out.push(FRIDAY);
  if (!eid && !tashriq && m !== 9 && (weekday === 1 || weekday === 4)) out.push(MON_THU(weekday === 1));
  if (d >= 13 && d <= 15 && m !== 9 && !tashriq && !(m === 8 && d >= 14)) out.push(WHITE);

  // After Maghrib the Islamic day of tomorrow has begun — surface night virtues
  if (isAfterMaghrib && tomorrow.m === 9 && tomorrow.d >= 21 && tomorrow.d % 2 === 1) {
    out.unshift({
      id: 'odd-night',
      tone: 'night',
      title: { ar: `الليلة ليلة ${tomorrow.d} من رمضان (وتر)`, en: `Tonight is night ${tomorrow.d} of Ramadan (odd)` },
      body: { ar: 'من الليالي التي تُلتمس فيها ليلة القدر.', en: 'One of the nights in which Laylat al-Qadr is sought.' },
      refs: ['صحيح البخاري ٢٠١٧'],
    });
  }
  if (isAfterMaghrib && weekday === 4) {
    out.push({
      id: 'friday-night',
      tone: 'night',
      title: { ar: 'ليلة الجمعة', en: 'Night of Friday' },
      body: { ar: 'يُستحب الإكثار من الصلاة على النبي ﷺ ليلة الجمعة ويومها.', en: 'Increase salawat on the Prophet ﷺ on the night and day of Friday.' },
      refs: ['سنن أبي داود ١٠٤٧'],
    });
  }
  return out;
}
