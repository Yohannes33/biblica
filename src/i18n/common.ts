import { defineStrings } from './define';

// Words used across the app. Amharic uses the polite form (እርስዎ: ይምረጡ,
// ይሞክሩ), which needs no gender. Glossary, keep it consistent:
//   verse ጥቅስ (pl. ጥቅሶች), verse number ቁጥር, chapter ምዕራፍ, book መጽሐፍ,
//   Bible መጽሐፍ ቅዱስ, Old/New Testament ብሉይ/አዲስ ኪዳን, memorise በቃል መያዝ,
//   practise መለማመድ, library ቤተ መጻሕፍት, settings ቅንብሮች, level ደረጃ,
//   XP ነጥብ, streak ተከታታይ ቀናት, review ክለሳ, card ካርድ.
export const common = defineStrings(
  {
    'common.tryAgain': 'Try again',
    'common.close': 'Close',
    'common.cancel': 'Cancel',
    'common.save': 'Save',

    'category.All': 'All',
    'category.Essential Classics': 'Essential Classics',
    'category.Peace & Anxiety': 'Peace & Anxiety',
    'category.Strength & Courage': 'Strength & Courage',
    'category.Love & Kindness': 'Love & Kindness',
    'category.Faith & Salvation': 'Faith & Salvation',
    'category.Wisdom & Guidance': 'Wisdom & Guidance',
    'category.Hope & Comfort': 'Hope & Comfort',
    'category.Custom': 'Custom',

    'mastery.New': 'New',
    'mastery.Learning': 'Learning',
    'mastery.Familiar': 'Familiar',
    'mastery.Mastered': 'Mastered',

    'level.pilgrim': 'Devoted Pilgrim',
    'level.seeker': 'Seeker of Truth',
    'level.memorizer': 'Faith Memorizer',
    'level.disciple': 'Scripture Disciple',
    'level.scholar': 'Theological Scholar',

    'translation.KJV.blurb': 'The classic 1611 wording',
    'translation.BSB.blurb': 'Modern and close to the original',
    'translation.WEB.blurb': 'Modern and easy to read',
    'translation.AMH.blurb': 'New Testament only',
    'translation.AMH.name': 'Amharic Bible (1962)',

    'verses_one': '{n} verse',
    'verses_other': '{n} verses',
  },
  {
    'common.tryAgain': 'እንደገና ይሞክሩ',
    'common.close': 'ይዝጉ',
    'common.cancel': 'ይቅር',
    'common.save': 'ያስቀምጡ',

    'category.All': 'ሁሉም',
    'category.Essential Classics': 'ዋና ዋና ጥቅሶች',
    'category.Peace & Anxiety': 'ሰላምና ጭንቀት',
    'category.Strength & Courage': 'ብርታትና ድፍረት',
    'category.Love & Kindness': 'ፍቅርና ደግነት',
    'category.Faith & Salvation': 'እምነትና መዳን',
    'category.Wisdom & Guidance': 'ጥበብና መመሪያ',
    'category.Hope & Comfort': 'ተስፋና መጽናናት',
    'category.Custom': 'የራሴ',

    'mastery.New': 'አዲስ',
    'mastery.Learning': 'በመማር ላይ',
    'mastery.Familiar': 'የተለመደ',
    'mastery.Mastered': 'በቃል የተያዘ',

    'level.pilgrim': 'ታማኝ መንገደኛ',
    'level.seeker': 'እውነትን ፈላጊ',
    'level.memorizer': 'ቃሉን በቃል የሚይዝ',
    'level.disciple': 'የቃሉ ደቀ መዝሙር',
    'level.scholar': 'የመጽሐፍ ቅዱስ ምሁር',

    'translation.KJV.blurb': 'የ1611 ጥንታዊው የእንግሊዝኛ ትርጉም',
    'translation.BSB.blurb': 'ዘመናዊና ለመጀመሪያው ጽሑፍ ቅርብ የሆነ የእንግሊዝኛ ትርጉም',
    'translation.WEB.blurb': 'ዘመናዊና ለማንበብ ቀላል የእንግሊዝኛ ትርጉም',
    'translation.AMH.blurb': 'አዲስ ኪዳን ብቻ',
    'translation.AMH.name': 'አማርኛ መጽሐፍ ቅዱስ (1962)',

    'verses_one': '{n} ጥቅስ',
    'verses_other': '{n} ጥቅሶች',
  }
);
