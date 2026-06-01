import { useState, useEffect, useCallback, useRef } from "react";

// ─── UI Translations ──────────────────────────────────────────────────────────
const UI = {
  zh: {
    study:"学习", manage:"管理",
    langName:{ "de-zh":"德语", "es-zh":"西班牙语" },
    flipHint:"点击翻转",
    swipeLeft:"← 再看看", swipeRight:"认识 →",
    btnReview:"再看看", btnKnew:"我认识",
    noCards:"暂无卡片", noCardsSub:"请前往管理页面添加",
    noLevel:"没有符合所选级别的卡片", noLevelSub:"请更换级别或在管理中添加",
    doneTitle:"完成！", doneSub:"本轮结束！",
    doneStats:(k,t)=>`答对 ${k} 张，共 ${t} 张`,
    onlyFails:"只练错误", restart:"再来一次",
    addTitle:"添加卡片",
    hanzi:"汉字", pinyin:"拼音", lvl:"级别", notes:"备注（选填）",
    langField:(d)=>d==="de-zh"?"德文":"西班牙文",
    addBtn:"添加",
    cardsTitle:"全部卡片", allFilter:"全部",
    statusNew:"新", statusLearning:"学习中", statusFail:"待巩固", statusMaster:"已掌握",
    zhDir:(l)=>`中文 → ${l}`, lDir:(l)=>`${l} → 中文`,
  },
  es: {
    study:"Estudiar", manage:"Gestionar",
    langName:{ "de-zh":"Alemán", "es-zh":"Español" },
    flipHint:"toca para revelar",
    swipeLeft:"← Repasar", swipeRight:"Sabía →",
    btnReview:"✗ Repasar", btnKnew:"✓ Lo sabía",
    noCards:"Sin tarjetas", noCardsSub:"Ve a Gestionar para añadir",
    noLevel:"Ninguna tarjeta con esos niveles", noLevelSub:"Activa otros niveles o añade en Gestionar",
    doneTitle:"完成！", doneSub:"¡Sesión completada!",
    doneStats:(k,t)=>`${k} de ${t} superadas`,
    onlyFails:"Solo errores", restart:"再来一次",
    addTitle:"Añadir tarjeta",
    hanzi:"汉字", pinyin:"Pīnyīn", lvl:"Nivel", notes:"Notas (opcional)",
    langField:(d)=>d==="de-zh"?"Alemán":"Español",
    addBtn:"+ Añadir",
    cardsTitle:"Tarjetas", allFilter:"Todas",
    statusNew:"Nueva", statusLearning:"Aprendiendo", statusFail:"Repasar", statusMaster:"Dominada",
    zhDir:(l)=>`中文 → ${l}`, lDir:(l)=>`${l} → 中文`,
  },
};

// ─── Config ───────────────────────────────────────────────────────────────────
const DECKS = [
  { id:"de-zh", flag:"🇩🇪", placeholder:"Hallo",  defaultLevels:["B1","B2","Custom"] },
  { id:"es-zh", flag:"🇪🇸", placeholder:"Hola",   defaultLevels:["A1","A2","Custom"] },
];
const ALL_LEVELS = ["A1","A2","B1","B2","Custom"];
const SWIPE_THRESHOLD = 65;

// ─── SRS helpers ──────────────────────────────────────────────────────────────
const getCardStatus = (id, stats) => {
  const s = stats[id];
  if (!s || (s.fails === 0 && s.successes === 0)) return "new";
  if (s.fails > s.successes) return "fail";
  if (s.successes >= 3 && s.streak >= 2) return "master";
  return "learning";
};

const buildQueue = (deckCards, selectedLevels, stats) => {
  const filtered = deckCards.filter(c => selectedLevels.includes(c.level || "A1"));
  const priority = (c) => {
    const st = getCardStatus(c.id, stats);
    return { fail:0, learning:1, new:2, master:3 }[st];
  };
  const shuffle = (arr) => [...arr].sort(() => Math.random() - 0.5);
  return [0,1,2,3].flatMap(p => shuffle(filtered.filter(c => priority(c) === p)));
};

// Merge newly shipped SEED cards into the user's stored cards without losing
// their own additions or progress. New seed cards (by id) are appended; if a
// stored card shares an id with a seed, the seed's level is refreshed so that
// re-tagged cards (e.g. moved to "Custom") update for existing users too.
const mergeSeeds = (stored) => {
  const out = { ...stored };
  for (const deck of Object.keys(SEEDS)) {
    const existing = Array.isArray(out[deck]) ? out[deck] : [];
    const seedById = new Map(SEEDS[deck].map(c => [c.id, c]));
    const existingIds = new Set(existing.map(c => c.id));
    const refreshed = existing.map(c => {
      const seed = seedById.get(c.id);
      return seed ? { ...c, level: seed.level } : c;
    });
    const missing = SEEDS[deck].filter(c => !existingIds.has(c.id));
    out[deck] = [...refreshed, ...missing];
  }
  return out;
};

// ─── Seeds ────────────────────────────────────────────────────────────────────
const SEEDS = {
  "de-zh": [
    { id:"d-a1-01",level:"A1",chinese:"你好",    pinyin:"nǐ hǎo",        translation:"Hallo",                     notes:"" },
    { id:"d-a1-02",level:"A1",chinese:"谢谢",    pinyin:"xiè xiè",       translation:"Danke",                     notes:"" },
    { id:"d-a1-03",level:"A1",chinese:"再见",    pinyin:"zài jiàn",      translation:"Auf Wiedersehen",            notes:"Informal: Tschüss" },
    { id:"d-a1-04",level:"A1",chinese:"对不起",  pinyin:"duì bu qǐ",     translation:"Entschuldigung",             notes:"" },
    { id:"d-a1-05",level:"A1",chinese:"请",      pinyin:"qǐng",          translation:"Bitte",                     notes:"" },
    { id:"d-a1-06",level:"A1",chinese:"朋友",    pinyin:"péng yǒu",      translation:"der Freund / die Freundin", notes:"" },
    { id:"d-a1-07",level:"A1",chinese:"吃饭",    pinyin:"chī fàn",       translation:"essen / Essen gehen",       notes:"" },
    { id:"d-a1-08",level:"A1",chinese:"我爱你",  pinyin:"wǒ ài nǐ",      translation:"Ich liebe dich",             notes:"" },
    { id:"d-a1-09",level:"A1",chinese:"水",      pinyin:"shuǐ",          translation:"das Wasser",                notes:"" },
    { id:"d-a1-10",level:"A1",chinese:"爸爸",    pinyin:"bà ba",         translation:"der Vater / Papa",          notes:"" },
    { id:"d-a1-11",level:"A1",chinese:"妈妈",    pinyin:"mā ma",         translation:"die Mutter / Mama",         notes:"" },
    { id:"d-a1-12",level:"A1",chinese:"什么",    pinyin:"shén me",       translation:"was",                       notes:"Was ist das? = 这是什么？" },
    { id:"d-a1-13",level:"A1",chinese:"哪里",    pinyin:"nǎ lǐ",         translation:"wo / wohin",                notes:"" },
    { id:"d-a1-14",level:"A1",chinese:"为什么",  pinyin:"wèi shén me",   translation:"warum",                     notes:"" },
    { id:"d-a1-15",level:"A1",chinese:"谁",      pinyin:"shéi",          translation:"wer",                       notes:"" },
    { id:"d-a1-16",level:"A1",chinese:"好",      pinyin:"hǎo",           translation:"gut / okay",                notes:"" },
    { id:"d-a1-17",level:"A1",chinese:"现在",    pinyin:"xiàn zài",      translation:"jetzt / gerade",            notes:"" },
    { id:"d-a1-18",level:"A1",chinese:"今天",    pinyin:"jīn tiān",      translation:"heute",                     notes:"" },
    { id:"d-a1-19",level:"A1",chinese:"明天",    pinyin:"míng tiān",     translation:"morgen",                    notes:"" },
    { id:"d-a1-20",level:"A1",chinese:"多少钱",  pinyin:"duō shǎo qián", translation:"Wie viel kostet das?",      notes:"" },
    { id:"d-a2-01",level:"A2",chinese:"星期一",  pinyin:"xīng qī yī",    translation:"Montag",                    notes:"" },
    { id:"d-a2-02",level:"A2",chinese:"星期二",  pinyin:"xīng qī èr",    translation:"Dienstag",                  notes:"" },
    { id:"d-a2-03",level:"A2",chinese:"星期三",  pinyin:"xīng qī sān",   translation:"Mittwoch",                  notes:"" },
    { id:"d-a2-04",level:"A2",chinese:"星期四",  pinyin:"xīng qī sì",    translation:"Donnerstag",                notes:"" },
    { id:"d-a2-05",level:"A2",chinese:"星期五",  pinyin:"xīng qī wǔ",    translation:"Freitag",                   notes:"" },
    { id:"d-a2-06",level:"A2",chinese:"星期六",  pinyin:"xīng qī liù",   translation:"Samstag",                   notes:"" },
    { id:"d-a2-07",level:"A2",chinese:"星期日",  pinyin:"xīng qī rì",    translation:"Sonntag",                   notes:"" },
    { id:"d-a2-08",level:"A2",chinese:"春天",    pinyin:"chūn tiān",     translation:"der Frühling",              notes:"" },
    { id:"d-a2-09",level:"A2",chinese:"夏天",    pinyin:"xià tiān",      translation:"der Sommer",                notes:"" },
    { id:"d-a2-10",level:"A2",chinese:"秋天",    pinyin:"qiū tiān",      translation:"der Herbst",                notes:"" },
    { id:"d-a2-11",level:"A2",chinese:"冬天",    pinyin:"dōng tiān",     translation:"der Winter",                notes:"" },
    { id:"d-a2-12",level:"A2",chinese:"哥哥/弟弟",pinyin:"gē ge / dì di", translation:"der Bruder",               notes:"哥哥=mayor; 弟弟=menor" },
    { id:"d-a2-13",level:"A2",chinese:"姐姐/妹妹",pinyin:"jiě jie / mèi mei",translation:"die Schwester",         notes:"姐姐=mayor; 妹妹=menor" },
    { id:"d-a2-14",level:"A2",chinese:"好看",    pinyin:"hǎo kàn",       translation:"schön / hübsch",            notes:"" },
    { id:"d-a2-15",level:"A2",chinese:"有趣",    pinyin:"yǒu qù",        translation:"interessant / spannend",    notes:"" },
    { id:"d-a2-16",level:"A2",chinese:"无聊",    pinyin:"wú liáo",       translation:"langweilig",                notes:"" },
    { id:"d-a2-17",level:"A2",chinese:"今年",    pinyin:"jīn nián",      translation:"dieses Jahr",               notes:"" },
    { id:"d-a2-18",level:"A2",chinese:"去年",    pinyin:"qù nián",       translation:"letztes Jahr",              notes:"" },
    { id:"d-b1-01",level:"B1",chinese:"建议",    pinyin:"jiàn yì",       translation:"der Vorschlag / vorschlagen",notes:"" },
    { id:"d-b1-02",level:"B1",chinese:"决定",    pinyin:"jué dìng",      translation:"die Entscheidung / entscheiden",notes:"" },
    { id:"d-b1-03",level:"B1",chinese:"解释",    pinyin:"jiě shì",       translation:"erklären",                  notes:"" },
    { id:"d-b1-04",level:"B1",chinese:"理解",    pinyin:"lǐ jiě",        translation:"verstehen",                 notes:"" },
    { id:"d-b1-05",level:"B1",chinese:"认为",    pinyin:"rèn wéi",       translation:"meinen / der Meinung sein", notes:"Ich bin der Meinung, dass…" },
    { id:"d-b1-06",level:"B1",chinese:"同意",    pinyin:"tóng yì",       translation:"zustimmen / einverstanden", notes:"" },
    { id:"d-b1-07",level:"B1",chinese:"担心",    pinyin:"dān xīn",       translation:"sich Sorgen machen",        notes:"Ich mache mir Sorgen um…" },
    { id:"d-b1-08",level:"B1",chinese:"希望",    pinyin:"xī wàng",       translation:"hoffen / die Hoffnung",     notes:"Ich hoffe, dass…" },
    { id:"d-b1-09",level:"B1",chinese:"习惯",    pinyin:"xí guàn",       translation:"die Gewohnheit / sich gewöhnen",notes:"sich an etw. gewöhnen" },
    { id:"d-b1-10",level:"B1",chinese:"突然",    pinyin:"tū rán",        translation:"plötzlich",                 notes:"" },
    { id:"d-b1-11",level:"B1",chinese:"虽然",    pinyin:"suī rán",       translation:"obwohl / zwar…aber",        notes:"虽然A但是B = Zwar A, aber B" },
    { id:"d-b1-12",level:"B1",chinese:"因为",    pinyin:"yīn wèi",       translation:"weil / denn",               notes:"weil → verbo al final" },
    { id:"d-b1-13",level:"B1",chinese:"如果",    pinyin:"rú guǒ",        translation:"wenn / falls",              notes:"" },
    { id:"d-b1-14",level:"B1",chinese:"准时",    pinyin:"zhǔn shí",      translation:"pünktlich",                 notes:"¡Muy importante en Alemania!" },
    { id:"d-b1-15",level:"B1",chinese:"工资",    pinyin:"gōng zī",       translation:"das Gehalt / der Lohn",     notes:"Gehalt=mensual; Lohn=por horas" },
    { id:"d-b1-16",level:"B1",chinese:"约好了",  pinyin:"yuē hǎo le",    translation:"verabredet / ausgemacht",   notes:"Wir sind verabredet." },
    { id:"d-b1-17",level:"B1",chinese:"请假",    pinyin:"qǐng jià",      translation:"Urlaub nehmen / krankmelden",notes:"" },
    { id:"d-b1-18",level:"B1",chinese:"越来越",  pinyin:"yuè lái yuè",   translation:"immer + Komparativ",        notes:"越来越好 = immer besser" },
    { id:"d-b1-19",level:"B1",chinese:"打电话",  pinyin:"dǎ diàn huà",   translation:"telefonieren / anrufen",    notes:"" },
    { id:"d-b1-20",level:"B1",chinese:"回来",    pinyin:"huí lái",       translation:"zurückkommen",              notes:"" },
    { id:"d-b1-21",level:"B1",chinese:"出发",    pinyin:"chū fā",        translation:"abfahren / losfahren",      notes:"" },
    { id:"d-b1-22",level:"B1",chinese:"换乘",    pinyin:"huàn chéng",    translation:"umsteigen",                 notes:"Am Hauptbahnhof umsteigen" },
    { id:"d-b1-23",level:"B1",chinese:"预订",    pinyin:"yù dìng",       translation:"reservieren / buchen",      notes:"" },
    { id:"d-b1-24",level:"B1",chinese:"取消",    pinyin:"qǔ xiāo",       translation:"absagen / stornieren",      notes:"" },
    { id:"d-b1-25",level:"B1",chinese:"迟到",    pinyin:"chí dào",       translation:"zu spät kommen",            notes:"" },
    { id:"d-b1-26",level:"B1",chinese:"帮助",    pinyin:"bāng zhù",      translation:"helfen / die Hilfe",        notes:"" },
    { id:"d-b1-27",level:"B1",chinese:"搬家",    pinyin:"bān jiā",       translation:"umziehen",                  notes:"" },
    { id:"d-b1-28",level:"B1",chinese:"看病",    pinyin:"kàn bìng",      translation:"zum Arzt gehen",            notes:"" },
    { id:"d-b1-29",level:"B1",chinese:"预约",    pinyin:"yù yuē",        translation:"einen Termin vereinbaren",  notes:"" },
    { id:"d-b1-30",level:"B1",chinese:"感冒",    pinyin:"gǎn mào",       translation:"erkältet sein / die Erkältung",notes:"" },
    { id:"d-b1-31",level:"B1",chinese:"头疼",    pinyin:"tóu téng",      translation:"Kopfschmerzen haben",       notes:"" },
    { id:"d-b1-32",level:"B1",chinese:"疲惫",    pinyin:"pí bèi",        translation:"erschöpft / müde",          notes:"" },
    { id:"d-b1-33",level:"B1",chinese:"压力",    pinyin:"yā lì",         translation:"der Stress / der Druck",    notes:"" },
    { id:"d-b1-34",level:"B1",chinese:"加班",    pinyin:"jiā bān",       translation:"Überstunden machen",        notes:"" },
    { id:"d-b1-35",level:"B1",chinese:"面试",    pinyin:"miàn shì",      translation:"das Vorstellungsgespräch",  notes:"" },
    { id:"d-b1-36",level:"B1",chinese:"简历",    pinyin:"jiǎn lì",       translation:"der Lebenslauf",            notes:"" },
    { id:"d-b1-37",level:"B1",chinese:"申请",    pinyin:"shēn qǐng",     translation:"sich bewerben / beantragen",notes:"" },
    { id:"d-b1-38",level:"B1",chinese:"所以",    pinyin:"suǒ yǐ",        translation:"deshalb / also",            notes:"" },
    { id:"d-b1-39",level:"B1",chinese:"另外",    pinyin:"lìng wài",      translation:"außerdem / darüber hinaus", notes:"" },
    { id:"d-b1-40",level:"B1",chinese:"反正",    pinyin:"fǎn zhèng",     translation:"sowieso / jedenfalls",      notes:"" },
    { id:"d-b1-41",level:"B1",chinese:"不得不",  pinyin:"bù dé bù",      translation:"nicht anders können / müssen",notes:"" },
    { id:"d-b1-42",level:"B1",chinese:"高兴",    pinyin:"gāo xìng",      translation:"froh / glücklich",          notes:"" },
    { id:"d-b1-43",level:"B1",chinese:"生气",    pinyin:"shēng qì",      translation:"wütend / sich ärgern",      notes:"" },
    { id:"d-b1-44",level:"B1",chinese:"难过",    pinyin:"nán guò",       translation:"traurig / betrübt",         notes:"" },
    { id:"d-b1-45",level:"B1",chinese:"紧张",    pinyin:"jǐn zhāng",     translation:"nervös / angespannt",       notes:"" },
    { id:"d-b1-46",level:"B1",chinese:"满意",    pinyin:"mǎn yì",        translation:"zufrieden",                 notes:"" },
    { id:"d-b1-47",level:"B1",chinese:"公寓",    pinyin:"gōng yù",       translation:"die Wohnung / das Apartment",notes:"" },
    { id:"d-b1-48",level:"B1",chinese:"租房",    pinyin:"zū fáng",       translation:"eine Wohnung mieten",       notes:"" },
    { id:"d-b1-49",level:"B1",chinese:"护照",    pinyin:"hù zhào",       translation:"der Reisepass",             notes:"" },
    { id:"d-b1-50",level:"B1",chinese:"签证",    pinyin:"qiān zhèng",    translation:"das Visum",                 notes:"" },
    { id:"d-b1-51",level:"B1",chinese:"行李",    pinyin:"xíng li",       translation:"das Gepäck",                notes:"" },
    { id:"d-b1-52",level:"B1",chinese:"登机",    pinyin:"dēng jī",       translation:"einsteigen / einchecken",   notes:"Boarding-Karte = 登机牌" },
    { id:"d-b1-53",level:"B1",chinese:"延误",    pinyin:"yán wù",        translation:"die Verspätung",            notes:"Der Zug hat Verspätung." },
    { id:"d-b1-54",level:"B1",chinese:"售票机",  pinyin:"shòu piào jī",  translation:"der Fahrkartenautomat",     notes:"" },
    { id:"d-b1-55",level:"B1",chinese:"单程",    pinyin:"dān chéng",     translation:"einfach / Einzelfahrt",     notes:"" },
    { id:"d-b1-56",level:"B1",chinese:"往返",    pinyin:"wǎng fǎn",      translation:"hin und zurück",            notes:"" },
    { id:"d-b1-57",level:"B1",chinese:"站台",    pinyin:"zhàn tái",      translation:"der Bahnsteig / das Gleis", notes:"" },
    { id:"d-b1-58",level:"B1",chinese:"住宿",    pinyin:"zhù sù",        translation:"die Unterkunft / übernachten",notes:"" },
    { id:"d-b1-59",level:"B1",chinese:"入住",    pinyin:"rù zhù",        translation:"einchecken (Hotel)",        notes:"" },
    { id:"d-b1-60",level:"B1",chinese:"退房",    pinyin:"tuì fáng",      translation:"auschecken (Hotel)",        notes:"" },
    { id:"d-b1-61",level:"B1",chinese:"菜单",    pinyin:"cài dān",       translation:"die Speisekarte",           notes:"" },
    { id:"d-b1-62",level:"B1",chinese:"点菜",    pinyin:"diǎn cài",      translation:"bestellen",                 notes:"" },
    { id:"d-b1-63",level:"B1",chinese:"账单",    pinyin:"zhàng dān",     translation:"die Rechnung",              notes:"Getrennt zahlen = 分开付" },
    { id:"d-b1-64",level:"B1",chinese:"素食",    pinyin:"sù shí",        translation:"vegetarisch / das Gemüsegericht",notes:"" },
    { id:"d-b1-65",level:"B1",chinese:"过敏",    pinyin:"guò mǐn",       translation:"allergisch / die Allergie", notes:"" },
    { id:"d-b1-66",level:"B1",chinese:"收据",    pinyin:"shōu jù",       translation:"der Kassenbon / die Quittung",notes:"" },
    { id:"d-b1-67",level:"B1",chinese:"退货",    pinyin:"tuì huò",       translation:"zurückgeben / umtauschen",  notes:"" },
    { id:"d-b1-68",level:"B1",chinese:"打折",    pinyin:"dǎ zhé",        translation:"Rabatt / im Angebot",       notes:"20% Rabatt = 八折" },
    { id:"d-b1-69",level:"B1",chinese:"现金",    pinyin:"xiàn jīn",      translation:"das Bargeld",               notes:"" },
    { id:"d-b1-70",level:"B1",chinese:"刷卡",    pinyin:"shuā kǎ",       translation:"mit Karte zahlen",          notes:"" },
    { id:"d-b1-71",level:"B1",chinese:"房东",    pinyin:"fáng dōng",     translation:"der Vermieter / die Vermieterin",notes:"" },
    { id:"d-b1-72",level:"B1",chinese:"租金",    pinyin:"zū jīn",        translation:"die Miete",                 notes:"" },
    { id:"d-b1-73",level:"B1",chinese:"押金",    pinyin:"yā jīn",        translation:"die Kaution",               notes:"" },
    { id:"d-b1-74",level:"B1",chinese:"电费",    pinyin:"diàn fèi",      translation:"die Stromrechnung",         notes:"" },
    { id:"d-b1-75",level:"B1",chinese:"网速",    pinyin:"wǎng sù",       translation:"die Internetgeschwindigkeit",notes:"" },
    { id:"d-b1-76",level:"B1",chinese:"修理",    pinyin:"xiū lǐ",        translation:"reparieren",                notes:"" },
    { id:"d-b1-77",level:"B1",chinese:"邻居",    pinyin:"lín jū",        translation:"der Nachbar / die Nachbarin",notes:"" },
    { id:"d-b1-78",level:"B1",chinese:"噪音",    pinyin:"zào yīn",       translation:"der Lärm",                  notes:"" },
    { id:"d-b1-79",level:"B1",chinese:"垃圾",    pinyin:"lā jī",         translation:"der Müll",                  notes:"Müll trennen = 垃圾分类" },
    { id:"d-b1-80",level:"B1",chinese:"误会",    pinyin:"wù huì",        translation:"das Missverständnis / missverstehen",notes:"" },
    { id:"d-b1-81",level:"B1",chinese:"道歉",    pinyin:"dào qiàn",      translation:"sich entschuldigen",        notes:"" },
    { id:"d-b1-82",level:"B1",chinese:"抱怨",    pinyin:"bào yuàn",      translation:"sich beschweren",           notes:"" },
    { id:"d-b1-83",level:"B1",chinese:"表扬",    pinyin:"biǎo yáng",     translation:"loben / das Lob",           notes:"" },
    { id:"d-b1-84",level:"B1",chinese:"提醒",    pinyin:"tí xǐng",       translation:"erinnern / hinweisen",      notes:"" },
    { id:"d-b1-85",level:"B1",chinese:"确认",    pinyin:"què rèn",       translation:"bestätigen / überprüfen",   notes:"" },
    { id:"d-b1-86",level:"B1",chinese:"拒绝",    pinyin:"jù jué",        translation:"ablehnen / verweigern",     notes:"" },
    { id:"d-b1-87",level:"B1",chinese:"接受",    pinyin:"jiē shòu",      translation:"akzeptieren / annehmen",    notes:"" },
    { id:"d-b1-088",level:"Custom",chinese:"适应",       pinyin:"shì yìng",          translation:"sich einleben / anpassen",           notes:"" },
    { id:"d-b1-089",level:"Custom",chinese:"广播节目",   pinyin:"guǎng bō jié mù",   translation:"die Radiosendung",                   notes:"" },
    { id:"d-b1-090",level:"Custom",chinese:"吸烟",       pinyin:"xī yān",            translation:"rauchen / das Rauchen",              notes:"" },
    { id:"d-b1-091",level:"Custom",chinese:"活动",       pinyin:"huó dòng",          translation:"sich bewegen / die Aktivität",       notes:"" },
    { id:"d-b1-092",level:"Custom",chinese:"注意到",     pinyin:"zhù yì dào",        translation:"auffallen / bemerken",               notes:"" },
    { id:"d-b1-093",level:"Custom",chinese:"实际上",     pinyin:"shí jì shàng",      translation:"tatsächlich / eigentlich",           notes:"" },
    { id:"d-b1-094",level:"Custom",chinese:"例外",       pinyin:"lì wài",            translation:"die Ausnahme",                       notes:"" },
    { id:"d-b1-095",level:"Custom",chinese:"侄子",       pinyin:"zhí zi",            translation:"der Neffe",                          notes:"" },
    { id:"d-b1-096",level:"Custom",chinese:"郊游",       pinyin:"jiāo yóu",          translation:"der Ausflug",                        notes:"" },
    { id:"d-b1-097",level:"Custom",chinese:"保持健康",   pinyin:"bǎo chí jiàn kāng", translation:"fit halten / fit bleiben",           notes:"" },
    { id:"d-b1-098",level:"Custom",chinese:"办公楼",     pinyin:"bàn gōng lóu",      translation:"das Bürogebäude",                    notes:"" },
    { id:"d-b1-099",level:"Custom",chinese:"有意识的",   pinyin:"yǒu yì shí de",     translation:"bewusst",                            notes:"" },
    { id:"d-b1-100",level:"Custom",chinese:"电梯",       pinyin:"diàn tī",           translation:"der Aufzug / der Lift",              notes:"" },
    { id:"d-b1-101",level:"Custom",chinese:"楼梯",       pinyin:"lóu tī",            translation:"die Treppe / die Stiege",            notes:"" },
    { id:"d-b1-102",level:"Custom",chinese:"不舒服的",   pinyin:"bù shū fú de",      translation:"ungemütlich / unangenehm",           notes:"" },
    { id:"d-b1-103",level:"Custom",chinese:"奇怪的",     pinyin:"qí guài de",        translation:"eigenartig / seltsam",               notes:"" },
    { id:"d-b1-104",level:"Custom",chinese:"员工",       pinyin:"yuán gōng",         translation:"der Mitarbeiter / die Mitarbeiterin",notes:"" },
    { id:"d-b1-105",level:"Custom",chinese:"介绍",       pinyin:"jiè shào",          translation:"vermitteln / vorstellen",            notes:"" },
    { id:"d-b1-106",level:"Custom",chinese:"承担",       pinyin:"chéng dān",         translation:"übernehmen",                         notes:"" },
    { id:"d-b1-107",level:"Custom",chinese:"义务",       pinyin:"yì wù",             translation:"die Pflicht",                        notes:"" },
    { id:"d-b1-108",level:"Custom",chinese:"陪伴",       pinyin:"péi bàn",           translation:"Gesellschaft leisten",               notes:"" },
    { id:"d-b1-109",level:"Custom",chinese:"单亲父母",   pinyin:"dān qīn fù mǔ",     translation:"Alleinerziehende(r)",                notes:"" },
    { id:"d-b1-110",level:"Custom",chinese:"合租房",     pinyin:"hé zū fáng",        translation:"die Wohngemeinschaft (WG)",          notes:"" },
    { id:"d-b1-111",level:"Custom",chinese:"争吵",       pinyin:"zhēng chǎo",        translation:"der Streit / streiten",              notes:"" },
    { id:"d-b1-112",level:"Custom",chinese:"必要的",     pinyin:"bì yào de",         translation:"nötig / notwendig",                  notes:"" },
    { id:"d-b1-113",level:"Custom",chinese:"如今",       pinyin:"rú jīn",            translation:"inzwischen / mittlerweile",          notes:"" },
    { id:"d-b1-114",level:"Custom",chinese:"成功",       pinyin:"chéng gōng",        translation:"erfolgreich / der Erfolg",           notes:"" },
    { id:"d-b1-115",level:"Custom",chinese:"生活质量",   pinyin:"shēng huó zhì liàng",translation:"die Lebensqualität",               notes:"" },
    { id:"d-b1-116",level:"Custom",chinese:"评估",       pinyin:"píng gū",           translation:"einschätzen / beurteilen",           notes:"" },
    { id:"d-b1-117",level:"Custom",chinese:"使惊讶",     pinyin:"shǐ jīng yà",       translation:"überraschen",                        notes:"" },
    { id:"d-b1-118",level:"Custom",chinese:"低谷",       pinyin:"dī gǔ",             translation:"das Tief / der Tiefpunkt",           notes:"" },
    { id:"d-b1-119",level:"Custom",chinese:"子女",       pinyin:"zǐ nǚ",             translation:"der Nachwuchs / die Kinder",         notes:"" },
    { id:"d-b1-120",level:"Custom",chinese:"意识到",     pinyin:"yì shí dào",        translation:"realisieren / erkennen",             notes:"" },
    { id:"d-b1-121",level:"Custom",chinese:"提高",       pinyin:"tí gāo",            translation:"erhöhen / verbessern",               notes:"" },
    { id:"d-b1-122",level:"Custom",chinese:"因素",       pinyin:"yīn sù",            translation:"der Faktor",                         notes:"" },
    { id:"d-b1-123",level:"Custom",chinese:"社交生活",   pinyin:"shè jiāo shēng huó",translation:"das Sozialleben",                   notes:"" },
    { id:"d-b1-124",level:"Custom",chinese:"支持",       pinyin:"zhī chí",           translation:"die Unterstützung / unterstützen",   notes:"" },
    { id:"d-b1-125",level:"Custom",chinese:"体力劳动",   pinyin:"tǐ lì láo dòng",    translation:"körperliche Arbeit",                 notes:"" },
    { id:"d-b1-126",level:"Custom",chinese:"维修车间",   pinyin:"wéi xiū chē jiān",  translation:"die Werkstatt",                      notes:"" },
    { id:"d-b1-127",level:"Custom",chinese:"兼职",       pinyin:"jiān zhí",          translation:"die Teilzeitarbeit / Teilzeit",      notes:"" },
    { id:"d-b1-128",level:"Custom",chinese:"驾照",       pinyin:"jià zhào",          translation:"der Führerschein",                   notes:"" },
    { id:"d-b1-129",level:"Custom",chinese:"托儿所",     pinyin:"tuō ér suǒ",        translation:"die Kinderkrippe / die Kita",        notes:"" },
    { id:"d-b1-130",level:"Custom",chinese:"工作环境",   pinyin:"gōng zuò huán jìng",translation:"das Arbeitsumfeld",                 notes:"" },
    { id:"d-b1-131",level:"Custom",chinese:"书店",       pinyin:"shū diàn",          translation:"die Buchhandlung",                   notes:"" },
    { id:"d-b1-132",level:"Custom",chinese:"前提条件",   pinyin:"qián tí tiáo jiàn", translation:"die Voraussetzung",                  notes:"" },
    { id:"d-b1-133",level:"Custom",chinese:"主动性",     pinyin:"zhǔ dòng xìng",     translation:"die Eigeninitiative",                notes:"" },
    { id:"d-b1-134",level:"Custom",chinese:"灵活性",     pinyin:"líng huó xìng",     translation:"die Flexibilität",                   notes:"" },
    { id:"d-b1-135",level:"Custom",chinese:"行业知识",   pinyin:"háng yè zhī shì",   translation:"die Branchenkenntnisse",             notes:"" },
    { id:"d-b1-136",level:"Custom",chinese:"善交际的",   pinyin:"shàn jiāo jì de",   translation:"kontaktfreudig",                     notes:"" },
    { id:"d-b1-137",level:"Custom",chinese:"语言天赋",   pinyin:"yǔ yán tiān fù",    translation:"das Sprachtalent",                   notes:"" },
    { id:"d-b1-138",level:"Custom",chinese:"限速",       pinyin:"xiàn sù",           translation:"die Geschwindigkeitsbeschränkung",   notes:"" },
    { id:"d-b1-139",level:"Custom",chinese:"最高速度",   pinyin:"zuì gāo sù dù",     translation:"die Höchstgeschwindigkeit",          notes:"" },
    { id:"d-b1-140",level:"Custom",chinese:"乡村公路",   pinyin:"xiāng cūn gōng lù", translation:"die Landstraße",                     notes:"" },
    { id:"d-b1-141",level:"Custom",chinese:"事故",       pinyin:"shì gù",            translation:"der Unfall",                         notes:"" },
    { id:"d-b1-142",level:"Custom",chinese:"路程",       pinyin:"lù chéng",          translation:"die Strecke / der Weg",              notes:"" },
    { id:"d-b1-143",level:"Custom",chinese:"专注的",     pinyin:"zhuān zhù de",      translation:"aufmerksam",                         notes:"" },
    { id:"d-b1-144",level:"Custom",chinese:"论点",       pinyin:"lùn diǎn",          translation:"das Argument",                       notes:"" },
    { id:"d-b1-145",level:"Custom",chinese:"危及",       pinyin:"wēi jí",            translation:"gefährden",                          notes:"" },
    { id:"d-b1-146",level:"Custom",chinese:"堵车",       pinyin:"dǔ chē",            translation:"der Stau",                           notes:"" },
    { id:"d-b1-147",level:"Custom",chinese:"超车",       pinyin:"chāo chē",          translation:"überholen",                          notes:"" },
    { id:"d-b1-148",level:"Custom",chinese:"从容的",     pinyin:"cóng róng de",      translation:"gelassen / ruhig",                   notes:"" },
    { id:"d-b1-149",level:"Custom",chinese:"限制",       pinyin:"xiàn zhì",          translation:"die Beschränkung / beschränken",     notes:"" },
    { id:"d-b1-150",level:"Custom",chinese:"规章制度",   pinyin:"guī zhāng zhì dù",  translation:"die Hausordnung / das Regelwerk",    notes:"" },
    { id:"d-b1-151",level:"Custom",chinese:"有约束力的", pinyin:"yǒu yuē shù lì de", translation:"verbindlich",                        notes:"" },
    { id:"d-b1-152",level:"Custom",chinese:"有义务做",   pinyin:"yǒu yì wù zuò",     translation:"verpflichtet sein, zu tun",          notes:"" },
    { id:"d-b1-153",level:"Custom",chinese:"证件",       pinyin:"zhèng jiàn",        translation:"der Ausweis / das Dokument",         notes:"" },
    { id:"d-b1-154",level:"Custom",chinese:"禁烟令",     pinyin:"jìn yān lìng",      translation:"das Rauchverbot",                    notes:"" },
    { id:"d-b1-155",level:"Custom",chinese:"提供",       pinyin:"tí gōng",           translation:"zur Verfügung stellen / bereitstellen",notes:"" },
    { id:"d-b1-156",level:"Custom",chinese:"个人物品",   pinyin:"gè rén wù pǐn",     translation:"persönliche Gegenstände",            notes:"" },
    { id:"d-b1-157",level:"Custom",chinese:"法律责任",   pinyin:"fǎ lǜ zé rèn",      translation:"die Haftung / haften",               notes:"" },
    { id:"d-b1-158",level:"Custom",chinese:"阶段",       pinyin:"jiē duàn",          translation:"die Etappe / die Phase",             notes:"" },
    { id:"d-b1-159",level:"Custom",chinese:"放慢节奏",   pinyin:"fàng màn jié zòu",  translation:"die Entschleunigung",                notes:"" },
    { id:"d-b1-160",level:"Custom",chinese:"大都市",     pinyin:"dà dū shì",         translation:"die Metropole / die Großstadt",      notes:"" },
    { id:"d-b1-161",level:"Custom",chinese:"乡村的",     pinyin:"xiāng cūn de",      translation:"ländlich",                           notes:"" },
    { id:"d-b1-162",level:"Custom",chinese:"回忆",       pinyin:"huí yì",            translation:"die Erinnerung / sich erinnern",     notes:"" },
    { id:"d-b1-163",level:"Custom",chinese:"方言",       pinyin:"fāng yán",          translation:"der Dialekt / die Mundart",          notes:"" },
    { id:"d-b1-164",level:"Custom",chinese:"徒步旅行",   pinyin:"tú bù lǚ xíng",     translation:"die Wanderung / wandern",            notes:"" },
    { id:"d-b1-165",level:"Custom",chinese:"务实的",     pinyin:"wù shí de",         translation:"pragmatisch / praktisch",            notes:"" },
    { id:"d-b1-166",level:"Custom",chinese:"有机产品",   pinyin:"yǒu jī chǎn pǐn",   translation:"das Bio-Produkt",                    notes:"" },
    { id:"d-b1-167",level:"Custom",chinese:"传统的",     pinyin:"chuán tǒng de",     translation:"konventionell / traditionell",       notes:"" },
    { id:"d-b1-168",level:"Custom",chinese:"可持续性",   pinyin:"kě chí xù xìng",    translation:"die Nachhaltigkeit",                 notes:"" },
    { id:"d-b1-169",level:"Custom",chinese:"生产",       pinyin:"shēng chǎn",        translation:"herstellen / produzieren",           notes:"" },
    { id:"d-b1-170",level:"Custom",chinese:"导致",       pinyin:"dǎo zhì",           translation:"verursachen / führen zu",            notes:"" },
    { id:"d-b1-171",level:"Custom",chinese:"饮食",       pinyin:"yǐn shí",           translation:"die Ernährung",                      notes:"" },
    { id:"d-b1-172",level:"Custom",chinese:"均衡的",     pinyin:"jūn héng de",       translation:"ausgewogen",                         notes:"" },
    { id:"d-b1-173",level:"Custom",chinese:"标准",       pinyin:"biāo zhǔn",         translation:"das Kriterium / der Standard",       notes:"" },
    { id:"d-b1-174",level:"Custom",chinese:"拥挤",       pinyin:"yōng jǐ",           translation:"der Andrang / gedrängt",             notes:"" },
    { id:"d-b1-175",level:"Custom",chinese:"机会",       pinyin:"jī huì",            translation:"die Gelegenheit / die Chance",       notes:"" },
    { id:"d-b1-176",level:"Custom",chinese:"多样的",     pinyin:"duō yàng de",       translation:"vielfältig",                         notes:"" },
    { id:"d-b1-177",level:"Custom",chinese:"表演",       pinyin:"biǎo yǎn",          translation:"die Aufführung / aufführen",         notes:"" },
    { id:"d-b1-178",level:"Custom",chinese:"隆重地",     pinyin:"lóng zhòng de",     translation:"feierlich",                          notes:"" },
    { id:"d-b1-179",level:"Custom",chinese:"食堂",       pinyin:"shí táng",          translation:"die Mensa / die Kantine",            notes:"" },
    { id:"d-b1-180",level:"Custom",chinese:"不可预见的", pinyin:"bù kě yù jiàn de",  translation:"unvorhersehbar",                     notes:"" },
    { id:"d-b1-181",level:"Custom",chinese:"后果",       pinyin:"hòu guǒ",           translation:"die Folge / die Konsequenz",         notes:"" },
    { id:"d-b1-182",level:"Custom",chinese:"废除",       pinyin:"fèi chú",           translation:"abschaffen",                         notes:"" },
    { id:"d-b1-183",level:"Custom",chinese:"认识到",     pinyin:"rèn shí dào",       translation:"einsehen / erkennen",                notes:"" },
    { id:"d-b1-184",level:"Custom",chinese:"比赛",       pinyin:"bǐ sài",            translation:"der Wettkampf / der Wettbewerb",     notes:"" },
    { id:"d-b1-185",level:"Custom",chinese:"参与",       pinyin:"cān yù",            translation:"die Teilnahme / teilnehmen",         notes:"" },
    { id:"d-b1-186",level:"Custom",chinese:"灾难",       pinyin:"zāi nàn",           translation:"die Katastrophe",                    notes:"" },
    { id:"d-b1-187",level:"Custom",chinese:"避免",       pinyin:"bì miǎn",           translation:"vermeiden",                          notes:"" },
    { id:"d-b1-188",level:"Custom",chinese:"钦佩",       pinyin:"qīn pèi",           translation:"bewundern",                          notes:"" },
    { id:"d-b1-189",level:"Custom",chinese:"辩护",       pinyin:"biàn hù",           translation:"verteidigen",                        notes:"" },
    { id:"d-b1-190",level:"Custom",chinese:"能力",       pinyin:"néng lì",           translation:"die Fähigkeit / die Kompetenz",      notes:"" },
    { id:"d-b1-191",level:"Custom",chinese:"停止",       pinyin:"tíng zhǐ",          translation:"aufhören / stoppen",                 notes:"" },
    { id:"d-b1-192",level:"Custom",chinese:"挑战",       pinyin:"tiāo zhàn",         translation:"die Herausforderung",                notes:"" },
    { id:"d-b2-01",level:"B2",chinese:"影响",    pinyin:"yǐng xiǎng",    translation:"der Einfluss / beeinflussen",notes:"" },
    { id:"d-b2-02",level:"B2",chinese:"环境",    pinyin:"huán jìng",     translation:"die Umwelt / die Umgebung", notes:"Umwelt=medio ambiente; Umgebung=entorno" },
    { id:"d-b2-03",level:"B2",chinese:"挑战",    pinyin:"tiǎo zhàn",     translation:"die Herausforderung",       notes:"" },
    { id:"d-b2-04",level:"B2",chinese:"可持续",  pinyin:"kě chí xù",     translation:"nachhaltig / die Nachhaltigkeit",notes:"" },
    { id:"d-b2-05",level:"B2",chinese:"态度",    pinyin:"tài dù",        translation:"die Einstellung / die Haltung",notes:"" },
    { id:"d-b2-06",level:"B2",chinese:"观点",    pinyin:"guān diǎn",     translation:"der Standpunkt / die Ansicht",notes:"" },
    { id:"d-b2-07",level:"B2",chinese:"误解",    pinyin:"wù jiě",        translation:"das Missverständnis",       notes:"" },
    { id:"d-b2-08",level:"B2",chinese:"承认",    pinyin:"chéng rèn",     translation:"zugeben / anerkennen",      notes:"" },
    { id:"d-b2-09",level:"B2",chinese:"教育",    pinyin:"jiào yù",       translation:"die Bildung / die Erziehung",notes:"" },
    { id:"d-b2-10",level:"B2",chinese:"社会",    pinyin:"shè huì",       translation:"die Gesellschaft",          notes:"" },
    { id:"d-b2-11",level:"B2",chinese:"矛盾",    pinyin:"máo dùn",       translation:"der Widerspruch / widersprüchlich",notes:"" },
    { id:"d-b2-12",level:"B2",chinese:"尽管如此",pinyin:"jǐn guǎn rú cǐ",translation:"trotzdem / dennoch",        notes:"" },
    { id:"d-b2-13",level:"B2",chinese:"说服",    pinyin:"shuō fú",       translation:"überzeugen",                notes:"" },
    { id:"d-b2-14",level:"B2",chinese:"后果",    pinyin:"hòu guǒ",       translation:"die Konsequenz / die Folge",notes:"" },
    { id:"d-b2-15",level:"B2",chinese:"责任",    pinyin:"zé rèn",        translation:"die Verantwortung",         notes:"" },
    { id:"d-b2-16",level:"B2",chinese:"权利",    pinyin:"quán lì",       translation:"das Recht",                 notes:"" },
    { id:"d-b2-17",level:"B2",chinese:"义务",    pinyin:"yì wù",         translation:"die Pflicht / die Verpflichtung",notes:"" },
    { id:"d-b2-18",level:"B2",chinese:"规则",    pinyin:"guī zé",        translation:"die Regel / die Vorschrift",notes:"" },
    { id:"d-b2-19",level:"B2",chinese:"例外",    pinyin:"lì wài",        translation:"die Ausnahme",              notes:"Keine Regel ohne Ausnahme" },
    { id:"d-b2-20",level:"B2",chinese:"趋势",    pinyin:"qū shì",        translation:"der Trend / die Tendenz",   notes:"" },
    { id:"d-b2-21",level:"B2",chinese:"优先",    pinyin:"yōu xiān",      translation:"die Priorität / Vorrang",   notes:"" },
    { id:"d-b2-22",level:"B2",chinese:"妥协",    pinyin:"tuǒ xié",       translation:"der Kompromiss",            notes:"einen Kompromiss finden" },
    { id:"d-b2-23",level:"B2",chinese:"后悔",    pinyin:"hòu huǐ",       translation:"bereuen / die Reue",        notes:"" },
    { id:"d-b2-24",level:"B2",chinese:"期待",    pinyin:"qī dài",        translation:"erwarten / die Erwartung",  notes:"" },
    { id:"d-b2-25",level:"B2",chinese:"失望",    pinyin:"shī wàng",      translation:"enttäuscht / die Enttäuschung",notes:"" },
    { id:"d-b2-26",level:"B2",chinese:"克服",    pinyin:"kè fú",         translation:"überwinden / bewältigen",   notes:"" },
    { id:"d-b2-27",level:"B2",chinese:"批评",    pinyin:"pī píng",       translation:"kritisieren / die Kritik",  notes:"" },
    { id:"d-b2-28",level:"B2",chinese:"强调",    pinyin:"qiáng diào",    translation:"betonen / hervorheben",     notes:"" },
    { id:"d-b2-29",level:"B2",chinese:"依赖",    pinyin:"yī lài",        translation:"abhängen von / die Abhängigkeit",notes:"" },
    { id:"d-b2-30",level:"B2",chinese:"独立",    pinyin:"dú lì",         translation:"unabhängig / die Unabhängigkeit",notes:"" },
    { id:"d-b2-31",level:"B2",chinese:"全球化",  pinyin:"quán qiú huà",  translation:"die Globalisierung",        notes:"" },
    { id:"d-b2-32",level:"B2",chinese:"数字化",  pinyin:"shù zì huà",    translation:"die Digitalisierung",       notes:"" },
    { id:"d-b2-33",level:"B2",chinese:"人工智能",pinyin:"rén gōng zhì néng",translation:"die Künstliche Intelligenz (KI)",notes:"" },
    { id:"d-b2-34",level:"B2",chinese:"背景",    pinyin:"bèi jǐng",      translation:"der Hintergrund / der Kontext",notes:"" },
    { id:"d-b2-35",level:"B2",chinese:"分析",    pinyin:"fēn xī",        translation:"analysieren / die Analyse", notes:"" },
    { id:"d-b2-36",level:"B2",chinese:"争论",    pinyin:"zhēng lùn",     translation:"streiten / diskutieren",    notes:"" },
    { id:"d-b2-37",level:"B2",chinese:"主张",    pinyin:"zhǔ zhāng",     translation:"behaupten / der Standpunkt",notes:"" },
    { id:"d-b2-38",level:"B2",chinese:"尽管",    pinyin:"jǐn guǎn",      translation:"obwohl / auch wenn",        notes:"" },
    { id:"d-b2-39",level:"B2",chinese:"经济",    pinyin:"jīng jì",       translation:"die Wirtschaft / die Ökonomie",notes:"" },
    { id:"d-b2-40",level:"B2",chinese:"通货膨胀",pinyin:"tōng huò péng zhàng",translation:"die Inflation",         notes:"" },
    { id:"d-b2-41",level:"B2",chinese:"失业",    pinyin:"shī yè",        translation:"arbeitslos / die Arbeitslosigkeit",notes:"" },
    { id:"d-b2-42",level:"B2",chinese:"就业市场",pinyin:"jiù yè shì chǎng",translation:"der Arbeitsmarkt",        notes:"" },
    { id:"d-b2-43",level:"B2",chinese:"税收",    pinyin:"shuì shōu",     translation:"die Steuer / das Steueraufkommen",notes:"" },
    { id:"d-b2-44",level:"B2",chinese:"预算",    pinyin:"yù suàn",       translation:"das Budget / der Haushalt", notes:"" },
    { id:"d-b2-45",level:"B2",chinese:"投资",    pinyin:"tóu zī",        translation:"die Investition / investieren",notes:"" },
    { id:"d-b2-46",level:"B2",chinese:"创业",    pinyin:"chuàng yè",     translation:"ein Unternehmen gründen",   notes:"" },
    { id:"d-b2-47",level:"B2",chinese:"竞争",    pinyin:"jìng zhēng",    translation:"der Wettbewerb / konkurrieren",notes:"" },
    { id:"d-b2-48",level:"B2",chinese:"合作",    pinyin:"hé zuò",        translation:"die Zusammenarbeit / kooperieren",notes:"" },
    { id:"d-b2-49",level:"B2",chinese:"民主",    pinyin:"mín zhǔ",       translation:"die Demokratie",            notes:"" },
    { id:"d-b2-50",level:"B2",chinese:"政府",    pinyin:"zhèng fǔ",      translation:"die Regierung",             notes:"" },
    { id:"d-b2-51",level:"B2",chinese:"法律",    pinyin:"fǎ lǜ",         translation:"das Gesetz / das Recht",    notes:"" },
    { id:"d-b2-52",level:"B2",chinese:"平等",    pinyin:"píng děng",     translation:"die Gleichheit / gleich",   notes:"" },
    { id:"d-b2-53",level:"B2",chinese:"多样性",  pinyin:"duō yàng xìng", translation:"die Vielfalt / Diversität", notes:"" },
    { id:"d-b2-54",level:"B2",chinese:"移民",    pinyin:"yí mín",        translation:"die Migration / einwandern",notes:"" },
    { id:"d-b2-55",level:"B2",chinese:"融合",    pinyin:"róng hé",       translation:"die Integration",           notes:"" },
    { id:"d-b2-56",level:"B2",chinese:"偏见",    pinyin:"piān jiàn",     translation:"das Vorurteil",             notes:"" },
    { id:"d-b2-57",level:"B2",chinese:"气候变化",pinyin:"qì hòu biàn huà",translation:"der Klimawandel",          notes:"" },
    { id:"d-b2-58",level:"B2",chinese:"可再生",  pinyin:"kě zài shēng",  translation:"erneuerbar (Energie)",      notes:"" },
    { id:"d-b2-59",level:"B2",chinese:"碳排放",  pinyin:"tàn pái fàng",  translation:"der CO₂-Ausstoß",           notes:"" },
    { id:"d-b2-60",level:"B2",chinese:"生物多样性",pinyin:"shēng wù duō yàng xìng",translation:"die Artenvielfalt / Biodiversität",notes:"" },
    { id:"d-b2-61",level:"B2",chinese:"研究",    pinyin:"yán jiū",       translation:"die Forschung / forschen",  notes:"" },
    { id:"d-b2-62",level:"B2",chinese:"实验",    pinyin:"shí yàn",       translation:"das Experiment",            notes:"" },
    { id:"d-b2-63",level:"B2",chinese:"假设",    pinyin:"jiǎ shè",       translation:"die Hypothese / annehmen",  notes:"" },
    { id:"d-b2-64",level:"B2",chinese:"证明",    pinyin:"zhèng míng",    translation:"beweisen / nachweisen",     notes:"" },
    { id:"d-b2-65",level:"B2",chinese:"文化差异",pinyin:"wén huà chā yì",translation:"der Kulturunterschied",     notes:"" },
    { id:"d-b2-66",level:"B2",chinese:"刻板印象",pinyin:"kè bǎn yìn xiàng",translation:"das Klischee / das Vorurteil",notes:"" },
    { id:"d-b2-67",level:"B2",chinese:"风俗习惯",pinyin:"fēng sú xí guàn",translation:"Sitten und Gebräuche",     notes:"" },
    { id:"d-b2-68",level:"B2",chinese:"母语",    pinyin:"mǔ yǔ",         translation:"die Muttersprache",         notes:"" },
    { id:"d-b2-69",level:"B2",chinese:"双语",    pinyin:"shuāng yǔ",     translation:"zweisprachig / bilingual",  notes:"" },
    { id:"d-b2-70",level:"B2",chinese:"隐喻",    pinyin:"yǐn yù",        translation:"die Metapher",              notes:"" },
  ],
  "es-zh": [
    { id:"e-a1-01",level:"A1",chinese:"你好",    pinyin:"nǐ hǎo",        translation:"Hola",                      notes:"" },
    { id:"e-a1-02",level:"A1",chinese:"谢谢",    pinyin:"xiè xiè",       translation:"Gracias",                   notes:"" },
    { id:"e-a1-03",level:"A1",chinese:"再见",    pinyin:"zài jiàn",      translation:"Adiós / Hasta luego",       notes:"" },
    { id:"e-a1-04",level:"A1",chinese:"对不起",  pinyin:"duì bu qǐ",     translation:"Lo siento / Perdón",        notes:"" },
    { id:"e-a1-05",level:"A1",chinese:"请",      pinyin:"qǐng",          translation:"Por favor",                 notes:"" },
    { id:"e-a1-06",level:"A1",chinese:"我",      pinyin:"wǒ",            translation:"yo",                        notes:"El pronombre suele omitirse" },
    { id:"e-a1-07",level:"A1",chinese:"你",      pinyin:"nǐ",            translation:"tú",                        notes:"" },
    { id:"e-a1-08",level:"A1",chinese:"他 / 她", pinyin:"tā",            translation:"él / ella",                 notes:"En chino mismo sonido: tā" },
    { id:"e-a1-09",level:"A1",chinese:"我们",    pinyin:"wǒ men",        translation:"nosotros/as",               notes:"" },
    { id:"e-a1-10",level:"A1",chinese:"妈妈",    pinyin:"mā ma",         translation:"la madre / mamá",           notes:"" },
    { id:"e-a1-11",level:"A1",chinese:"爸爸",    pinyin:"bà ba",         translation:"el padre / papá",           notes:"" },
    { id:"e-a1-12",level:"A1",chinese:"朋友",    pinyin:"péng yǒu",      translation:"el amigo / la amiga",       notes:"" },
    { id:"e-a1-13",level:"A1",chinese:"家",      pinyin:"jiā",           translation:"la casa / el hogar",        notes:"También: la familia" },
    { id:"e-a1-14",level:"A1",chinese:"吃",      pinyin:"chī",           translation:"comer",                     notes:"" },
    { id:"e-a1-15",level:"A1",chinese:"喝",      pinyin:"hē",            translation:"beber",                     notes:"" },
    { id:"e-a1-16",level:"A1",chinese:"去",      pinyin:"qù",            translation:"ir",                        notes:"" },
    { id:"e-a1-17",level:"A1",chinese:"大",      pinyin:"dà",            translation:"grande",                    notes:"" },
    { id:"e-a1-18",level:"A1",chinese:"小",      pinyin:"xiǎo",          translation:"pequeño/a",                 notes:"" },
    { id:"e-a1-19",level:"A1",chinese:"贵",      pinyin:"guì",           translation:"caro/a",                    notes:"" },
    { id:"e-a1-20",level:"A1",chinese:"便宜",    pinyin:"pián yi",       translation:"barato/a",                  notes:"" },
    { id:"e-a1-21",level:"A1",chinese:"一",      pinyin:"yī",            translation:"uno / una",                 notes:"" },
    { id:"e-a1-22",level:"A1",chinese:"二",      pinyin:"èr",            translation:"dos",                       notes:"" },
    { id:"e-a1-23",level:"A1",chinese:"三",      pinyin:"sān",           translation:"tres",                      notes:"" },
    { id:"e-a1-24",level:"A1",chinese:"四",      pinyin:"sì",            translation:"cuatro",                    notes:"" },
    { id:"e-a1-25",level:"A1",chinese:"五",      pinyin:"wǔ",            translation:"cinco",                     notes:"" },
    { id:"e-a1-26",level:"A1",chinese:"六",      pinyin:"liù",           translation:"seis",                      notes:"" },
    { id:"e-a1-27",level:"A1",chinese:"七",      pinyin:"qī",            translation:"siete",                     notes:"" },
    { id:"e-a1-28",level:"A1",chinese:"八",      pinyin:"bā",            translation:"ocho",                      notes:"" },
    { id:"e-a1-29",level:"A1",chinese:"九",      pinyin:"jiǔ",           translation:"nueve",                     notes:"" },
    { id:"e-a1-30",level:"A1",chinese:"十",      pinyin:"shí",           translation:"diez",                      notes:"" },
    { id:"e-a1-31",level:"A1",chinese:"二十",    pinyin:"èr shí",        translation:"veinte",                    notes:"" },
    { id:"e-a1-32",level:"A1",chinese:"一百",    pinyin:"yī bǎi",        translation:"cien / ciento",             notes:"100 exacto=cien; 101+=ciento" },
    { id:"e-a1-33",level:"A1",chinese:"红色",    pinyin:"hóng sè",       translation:"rojo/a",                    notes:"" },
    { id:"e-a1-34",level:"A1",chinese:"蓝色",    pinyin:"lán sè",        translation:"azul",                      notes:"" },
    { id:"e-a1-35",level:"A1",chinese:"绿色",    pinyin:"lǜ sè",         translation:"verde",                     notes:"" },
    { id:"e-a1-36",level:"A1",chinese:"白色",    pinyin:"bái sè",        translation:"blanco/a",                  notes:"" },
    { id:"e-a1-37",level:"A1",chinese:"黑色",    pinyin:"hēi sè",        translation:"negro/a",                   notes:"" },
    { id:"e-a1-38",level:"A1",chinese:"黄色",    pinyin:"huáng sè",      translation:"amarillo/a",                notes:"" },
    { id:"e-a1-39",level:"A1",chinese:"是",      pinyin:"shì",           translation:"ser / estar",               notes:"'Ser' permanente; 'estar' temporal" },
    { id:"e-a1-40",level:"A1",chinese:"有",      pinyin:"yǒu",           translation:"tener / haber",             notes:"Tengo 20 años = 我二十岁" },
    { id:"e-a1-41",level:"A1",chinese:"说",      pinyin:"shuō",          translation:"hablar / decir",            notes:"" },
    { id:"e-a1-42",level:"A1",chinese:"看",      pinyin:"kàn",           translation:"ver / mirar",               notes:"" },
    { id:"e-a1-43",level:"A1",chinese:"听",      pinyin:"tīng",          translation:"escuchar / oír",            notes:"" },
    { id:"e-a1-44",level:"A1",chinese:"什么",    pinyin:"shén me",       translation:"¿qué?",                     notes:"" },
    { id:"e-a1-45",level:"A1",chinese:"谁",      pinyin:"shéi",          translation:"¿quién?",                   notes:"" },
    { id:"e-a1-46",level:"A1",chinese:"哪里",    pinyin:"nǎ lǐ",         translation:"¿dónde?",                   notes:"" },
    { id:"e-a1-47",level:"A1",chinese:"什么时候",pinyin:"shén me shí hòu",translation:"¿cuándo?",                 notes:"" },
    { id:"e-a1-48",level:"A1",chinese:"为什么",  pinyin:"wèi shén me",   translation:"¿por qué?",                 notes:"" },
    { id:"e-a1-49",level:"A1",chinese:"怎么",    pinyin:"zěn me",        translation:"¿cómo?",                    notes:"" },
    { id:"e-a1-50",level:"A1",chinese:"多少",    pinyin:"duō shǎo",      translation:"¿cuánto/s?",                notes:"" },
    { id:"e-a1-51",level:"A1",chinese:"好的",    pinyin:"hǎo de",        translation:"de acuerdo / vale",         notes:"" },
    { id:"e-a1-52",level:"A1",chinese:"不知道",  pinyin:"bù zhī dào",    translation:"no sé / no lo sé",          notes:"" },
    { id:"e-a1-53",level:"A1",chinese:"水",      pinyin:"shuǐ",          translation:"el agua",                   notes:"" },
    { id:"e-a1-54",level:"A1",chinese:"我爱你",  pinyin:"wǒ ài nǐ",      translation:"te quiero / te amo",        notes:"" },
    { id:"e-a1-55",level:"A1",chinese:"老师",    pinyin:"lǎo shī",       translation:"el/la profesor/a",          notes:"" },
    { id:"e-a1-56",level:"A1",chinese:"学生",    pinyin:"xué shēng",     translation:"el/la estudiante",          notes:"" },
    { id:"e-a1-57",level:"A1",chinese:"书",      pinyin:"shū",           translation:"el libro",                  notes:"" },
    { id:"e-a1-58",level:"A1",chinese:"钱",      pinyin:"qián",          translation:"el dinero",                 notes:"" },
    { id:"e-a2-01",level:"A2",chinese:"今天",    pinyin:"jīn tiān",      translation:"hoy",                       notes:"" },
    { id:"e-a2-02",level:"A2",chinese:"明天",    pinyin:"míng tiān",     translation:"mañana",                    notes:"" },
    { id:"e-a2-03",level:"A2",chinese:"昨天",    pinyin:"zuó tiān",      translation:"ayer",                      notes:"" },
    { id:"e-a2-04",level:"A2",chinese:"工作",    pinyin:"gōng zuò",      translation:"el trabajo / trabajar",     notes:"" },
    { id:"e-a2-05",level:"A2",chinese:"学习",    pinyin:"xué xí",        translation:"estudiar / aprender",       notes:"" },
    { id:"e-a2-06",level:"A2",chinese:"超市",    pinyin:"chāo shì",      translation:"el supermercado",           notes:"" },
    { id:"e-a2-07",level:"A2",chinese:"餐厅",    pinyin:"cān tīng",      translation:"el restaurante",            notes:"" },
    { id:"e-a2-08",level:"A2",chinese:"医院",    pinyin:"yī yuàn",       translation:"el hospital",               notes:"" },
    { id:"e-a2-09",level:"A2",chinese:"机场",    pinyin:"jī chǎng",      translation:"el aeropuerto",             notes:"" },
    { id:"e-a2-10",level:"A2",chinese:"地铁",    pinyin:"dì tiě",        translation:"el metro",                  notes:"" },
    { id:"e-a2-11",level:"A2",chinese:"出租车",  pinyin:"chū zū chē",    translation:"el taxi",                   notes:"" },
    { id:"e-a2-12",level:"A2",chinese:"左边",    pinyin:"zuǒ biān",      translation:"a la izquierda",            notes:"" },
    { id:"e-a2-13",level:"A2",chinese:"右边",    pinyin:"yòu biān",      translation:"a la derecha",              notes:"" },
    { id:"e-a2-14",level:"A2",chinese:"天气",    pinyin:"tiān qì",       translation:"el tiempo / el clima",      notes:"" },
    { id:"e-a2-15",level:"A2",chinese:"下雨",    pinyin:"xià yǔ",        translation:"llover / la lluvia",        notes:"" },
    { id:"e-a2-16",level:"A2",chinese:"喜欢",    pinyin:"xǐ huān",       translation:"gustar",                    notes:"" },
    { id:"e-a2-17",level:"A2",chinese:"需要",    pinyin:"xū yào",        translation:"necesitar",                 notes:"" },
    { id:"e-a2-18",level:"A2",chinese:"想",      pinyin:"xiǎng",         translation:"querer / tener ganas de",   notes:"" },
    { id:"e-a2-19",level:"A2",chinese:"一月",    pinyin:"yī yuè",        translation:"enero",                     notes:"" },
    { id:"e-a2-20",level:"A2",chinese:"二月",    pinyin:"èr yuè",        translation:"febrero",                   notes:"" },
    { id:"e-a2-21",level:"A2",chinese:"三月",    pinyin:"sān yuè",       translation:"marzo",                     notes:"" },
    { id:"e-a2-22",level:"A2",chinese:"四月",    pinyin:"sì yuè",        translation:"abril",                     notes:"" },
    { id:"e-a2-23",level:"A2",chinese:"五月",    pinyin:"wǔ yuè",        translation:"mayo",                      notes:"" },
    { id:"e-a2-24",level:"A2",chinese:"六月",    pinyin:"liù yuè",       translation:"junio",                     notes:"" },
    { id:"e-a2-25",level:"A2",chinese:"七月",    pinyin:"qī yuè",        translation:"julio",                     notes:"" },
    { id:"e-a2-26",level:"A2",chinese:"八月",    pinyin:"bā yuè",        translation:"agosto",                    notes:"" },
    { id:"e-a2-27",level:"A2",chinese:"九月",    pinyin:"jiǔ yuè",       translation:"septiembre",                notes:"" },
    { id:"e-a2-28",level:"A2",chinese:"十月",    pinyin:"shí yuè",       translation:"octubre",                   notes:"" },
    { id:"e-a2-29",level:"A2",chinese:"十一月",  pinyin:"shí yī yuè",    translation:"noviembre",                 notes:"" },
    { id:"e-a2-30",level:"A2",chinese:"十二月",  pinyin:"shí èr yuè",    translation:"diciembre",                 notes:"" },
    { id:"e-a2-31",level:"A2",chinese:"星期一",  pinyin:"xīng qī yī",    translation:"el lunes",                  notes:"" },
    { id:"e-a2-32",level:"A2",chinese:"星期二",  pinyin:"xīng qī èr",    translation:"el martes",                 notes:"" },
    { id:"e-a2-33",level:"A2",chinese:"星期三",  pinyin:"xīng qī sān",   translation:"el miércoles",              notes:"" },
    { id:"e-a2-34",level:"A2",chinese:"星期四",  pinyin:"xīng qī sì",    translation:"el jueves",                 notes:"" },
    { id:"e-a2-35",level:"A2",chinese:"星期五",  pinyin:"xīng qī wǔ",    translation:"el viernes",                notes:"" },
    { id:"e-a2-36",level:"A2",chinese:"星期六",  pinyin:"xīng qī liù",   translation:"el sábado",                 notes:"" },
    { id:"e-a2-37",level:"A2",chinese:"星期日",  pinyin:"xīng qī rì",    translation:"el domingo",                notes:"" },
    { id:"e-a2-38",level:"A2",chinese:"春天",    pinyin:"chūn tiān",     translation:"la primavera",              notes:"" },
    { id:"e-a2-39",level:"A2",chinese:"夏天",    pinyin:"xià tiān",      translation:"el verano",                 notes:"" },
    { id:"e-a2-40",level:"A2",chinese:"秋天",    pinyin:"qiū tiān",      translation:"el otoño",                  notes:"" },
    { id:"e-a2-41",level:"A2",chinese:"冬天",    pinyin:"dōng tiān",     translation:"el invierno",               notes:"" },
    { id:"e-a2-42",level:"A2",chinese:"起床",    pinyin:"qǐ chuáng",     translation:"levantarse",                notes:"" },
    { id:"e-a2-43",level:"A2",chinese:"睡觉",    pinyin:"shuì jiào",     translation:"dormir / acostarse",        notes:"" },
    { id:"e-a2-44",level:"A2",chinese:"洗澡",    pinyin:"xǐ zǎo",        translation:"ducharse / bañarse",        notes:"" },
    { id:"e-a2-45",level:"A2",chinese:"做饭",    pinyin:"zuò fàn",       translation:"cocinar",                   notes:"" },
    { id:"e-a2-46",level:"A2",chinese:"早饭",    pinyin:"zǎo fàn",       translation:"el desayuno",               notes:"" },
    { id:"e-a2-47",level:"A2",chinese:"午饭",    pinyin:"wǔ fàn",        translation:"el almuerzo / la comida",   notes:"" },
    { id:"e-a2-48",level:"A2",chinese:"晚饭",    pinyin:"wǎn fàn",       translation:"la cena",                   notes:"" },
    { id:"e-a2-49",level:"A2",chinese:"米饭",    pinyin:"mǐ fàn",        translation:"el arroz",                  notes:"" },
    { id:"e-a2-50",level:"A2",chinese:"面包",    pinyin:"miàn bāo",      translation:"el pan",                    notes:"" },
    { id:"e-a2-51",level:"A2",chinese:"鸡肉",    pinyin:"jī ròu",        translation:"el pollo",                  notes:"" },
    { id:"e-a2-52",level:"A2",chinese:"水果",    pinyin:"shuǐ guǒ",      translation:"la fruta",                  notes:"" },
    { id:"e-a2-53",level:"A2",chinese:"蔬菜",    pinyin:"shū cài",       translation:"las verduras",              notes:"" },
    { id:"e-a2-54",level:"A2",chinese:"咖啡",    pinyin:"kā fēi",        translation:"el café",                   notes:"" },
    { id:"e-a2-55",level:"A2",chinese:"牛奶",    pinyin:"niú nǎi",       translation:"la leche",                  notes:"" },
    { id:"e-b1-01",level:"B1",chinese:"虽然",    pinyin:"suī rán",       translation:"aunque / a pesar de que",   notes:"" },
    { id:"e-b1-02",level:"B1",chinese:"因为",    pinyin:"yīn wèi",       translation:"porque / ya que",           notes:"" },
    { id:"e-b1-03",level:"B1",chinese:"如果",    pinyin:"rú guǒ",        translation:"si / en caso de que",       notes:"" },
    { id:"e-b1-04",level:"B1",chinese:"而且",    pinyin:"ér qiě",        translation:"además / y también",        notes:"" },
    { id:"e-b1-05",level:"B1",chinese:"所以",    pinyin:"suǒ yǐ",        translation:"por eso / por lo tanto",    notes:"" },
    { id:"e-b1-06",level:"B1",chinese:"认为",    pinyin:"rèn wéi",       translation:"opinar / creer / considerar",notes:"" },
    { id:"e-b1-07",level:"B1",chinese:"同意",    pinyin:"tóng yì",       translation:"estar de acuerdo / acordar",notes:"" },
    { id:"e-b1-08",level:"B1",chinese:"担心",    pinyin:"dān xīn",       translation:"preocuparse / estar preocupado",notes:"" },
    { id:"e-b1-09",level:"B1",chinese:"决定",    pinyin:"jué dìng",      translation:"decidir / la decisión",     notes:"" },
    { id:"e-b1-10",level:"B1",chinese:"建议",    pinyin:"jiàn yì",       translation:"sugerir / aconsejar",       notes:"" },
    { id:"e-b1-11",level:"B1",chinese:"另外",    pinyin:"lìng wài",      translation:"además / por otro lado",    notes:"" },
    { id:"e-b1-12",level:"B1",chinese:"不过",    pinyin:"bù guò",        translation:"sin embargo / pero",        notes:"" },
    { id:"e-b1-13",level:"B1",chinese:"总之",    pinyin:"zǒng zhī",      translation:"en resumen / en definitiva",notes:"" },
    { id:"e-b1-14",level:"B1",chinese:"例如",    pinyin:"lì rú",         translation:"por ejemplo",               notes:"" },
    { id:"e-b1-15",level:"B1",chinese:"也就是说",pinyin:"yě jiù shì shuō",translation:"es decir / o sea",         notes:"" },
    { id:"e-b1-16",level:"B1",chinese:"事实上",  pinyin:"shì shí shàng", translation:"de hecho / en realidad",    notes:"" },
    { id:"e-b1-17",level:"B1",chinese:"一方面",  pinyin:"yī fāng miàn",  translation:"por un lado",               notes:"" },
    { id:"e-b1-18",level:"B1",chinese:"相反",    pinyin:"xiāng fǎn",     translation:"al contrario / por el contrario",notes:"" },
    { id:"e-b1-19",level:"B1",chinese:"最终",    pinyin:"zuì zhōng",     translation:"al final / por último",     notes:"" },
    { id:"e-b1-20",level:"B1",chinese:"显然",    pinyin:"xiǎn rán",      translation:"evidentemente / obviamente",notes:"" },
    { id:"e-b1-21",level:"B1",chinese:"面试",    pinyin:"miàn shì",      translation:"la entrevista de trabajo",  notes:"" },
    { id:"e-b1-22",level:"B1",chinese:"简历",    pinyin:"jiǎn lì",       translation:"el currículum",             notes:"" },
    { id:"e-b1-23",level:"B1",chinese:"申请",    pinyin:"shēn qǐng",     translation:"solicitar / la solicitud",  notes:"" },
    { id:"e-b1-24",level:"B1",chinese:"合同",    pinyin:"hé tóng",       translation:"el contrato",               notes:"" },
    { id:"e-b1-25",level:"B1",chinese:"薪水",    pinyin:"xīn shuǐ",      translation:"el sueldo / el salario",    notes:"" },
    { id:"e-b1-26",level:"B1",chinese:"加班",    pinyin:"jiā bān",       translation:"hacer horas extra",         notes:"" },
    { id:"e-b1-27",level:"B1",chinese:"辞职",    pinyin:"cí zhí",        translation:"dimitir / renunciar",       notes:"" },
    { id:"e-b1-28",level:"B1",chinese:"同事",    pinyin:"tóng shì",      translation:"el/la compañero/a de trabajo",notes:"" },
    { id:"e-b1-29",level:"B1",chinese:"老板",    pinyin:"lǎo bǎn",       translation:"el jefe / la jefa",         notes:"" },
    { id:"e-b1-30",level:"B1",chinese:"会议",    pinyin:"huì yì",        translation:"la reunión",                notes:"" },
    { id:"e-b1-31",level:"B1",chinese:"截止日期",pinyin:"jié zhǐ rì qī", translation:"la fecha límite / el plazo",notes:"" },
    { id:"e-b1-32",level:"B1",chinese:"目标",    pinyin:"mù biāo",       translation:"el objetivo / la meta",     notes:"" },
    { id:"e-b1-33",level:"B1",chinese:"成功",    pinyin:"chéng gōng",    translation:"el éxito / tener éxito",    notes:"" },
    { id:"e-b1-34",level:"B1",chinese:"医生",    pinyin:"yī shēng",      translation:"el médico / la médica",     notes:"" },
    { id:"e-b1-35",level:"B1",chinese:"病人",    pinyin:"bìng rén",      translation:"el/la paciente",            notes:"" },
    { id:"e-b1-36",level:"B1",chinese:"症状",    pinyin:"zhèng zhuàng",  translation:"el síntoma",                notes:"" },
    { id:"e-b1-37",level:"B1",chinese:"处方",    pinyin:"chǔ fāng",      translation:"la receta (médica)",        notes:"" },
    { id:"e-b1-38",level:"B1",chinese:"药",      pinyin:"yào",           translation:"el medicamento / la medicina",notes:"" },
    { id:"e-b1-39",level:"B1",chinese:"手术",    pinyin:"shǒu shù",      translation:"la operación / la cirugía", notes:"" },
    { id:"e-b1-40",level:"B1",chinese:"疼痛",    pinyin:"téng tòng",     translation:"el dolor / doler",          notes:"" },
    { id:"e-b1-41",level:"B1",chinese:"过敏",    pinyin:"guò mǐn",       translation:"la alergia / ser alérgico/a",notes:"" },
    { id:"e-b1-42",level:"B1",chinese:"恢复",    pinyin:"huī fù",        translation:"recuperarse / la recuperación",notes:"" },
    { id:"e-b1-43",level:"B1",chinese:"护照",    pinyin:"hù zhào",       translation:"el pasaporte",              notes:"" },
    { id:"e-b1-44",level:"B1",chinese:"签证",    pinyin:"qiān zhèng",    translation:"el visado",                 notes:"" },
    { id:"e-b1-45",level:"B1",chinese:"行李",    pinyin:"xíng li",       translation:"el equipaje",               notes:"" },
    { id:"e-b1-46",level:"B1",chinese:"延误",    pinyin:"yán wù",        translation:"el retraso",                notes:"" },
    { id:"e-b1-47",level:"B1",chinese:"预订",    pinyin:"yù dìng",       translation:"reservar",                  notes:"" },
    { id:"e-b1-48",level:"B1",chinese:"取消",    pinyin:"qǔ xiāo",       translation:"cancelar",                  notes:"" },
    { id:"e-b1-49",level:"B1",chinese:"景点",    pinyin:"jǐng diǎn",     translation:"el lugar de interés / el monumento",notes:"" },
    { id:"e-b1-50",level:"B1",chinese:"导游",    pinyin:"dǎo yóu",       translation:"el guía turístico",         notes:"" },
    { id:"e-b1-51",level:"B1",chinese:"关系",    pinyin:"guān xi",       translation:"la relación",               notes:"" },
    { id:"e-b1-52",level:"B1",chinese:"信任",    pinyin:"xìn rèn",       translation:"la confianza / confiar",    notes:"" },
    { id:"e-b1-53",level:"B1",chinese:"争吵",    pinyin:"zhēng chǎo",    translation:"discutir / la discusión",   notes:"" },
    { id:"e-b1-54",level:"B1",chinese:"误会",    pinyin:"wù huì",        translation:"el malentendido",           notes:"" },
    { id:"e-b1-55",level:"B1",chinese:"原谅",    pinyin:"yuán liàng",    translation:"perdonar",                  notes:"" },
    { id:"e-b1-56",level:"B1",chinese:"支持",    pinyin:"zhī chí",       translation:"apoyar / el apoyo",         notes:"" },
    { id:"e-b1-57",level:"B1",chinese:"拒绝",    pinyin:"jù jué",        translation:"rechazar / negarse a",      notes:"" },
    { id:"e-b1-58",level:"B1",chinese:"嫉妒",    pinyin:"jí dù",         translation:"tener celos / envidiar",    notes:"" },
    { id:"e-b1-59",level:"B1",chinese:"自豪",    pinyin:"zì háo",        translation:"estar orgulloso/a",         notes:"" },
    { id:"e-b1-60",level:"B1",chinese:"后悔",    pinyin:"hòu huǐ",       translation:"arrepentirse / lamentarse", notes:"" },
    { id:"e-b1-61",level:"B1",chinese:"紧张",    pinyin:"jǐn zhāng",     translation:"estar nervioso/a",          notes:"" },
    { id:"e-b1-62",level:"B1",chinese:"满意",    pinyin:"mǎn yì",        translation:"estar satisfecho/a",        notes:"" },
    { id:"e-b1-63",level:"B1",chinese:"失望",    pinyin:"shī wàng",      translation:"estar decepcionado/a",      notes:"" },
    { id:"e-b1-64",level:"B1",chinese:"期待",    pinyin:"qī dài",        translation:"esperar (algo positivo) / la ilusión",notes:"" },
    { id:"e-b1-65",level:"B1",chinese:"生气",    pinyin:"shēng qì",      translation:"estar enfadado/a",          notes:"" },
    { id:"e-b1-66",level:"B1",chinese:"希望",    pinyin:"xī wàng",       translation:"esperar / ojalá",           notes:"Espero que + subjuntivo" },
    { id:"e-b1-67",level:"B1",chinese:"要求",    pinyin:"yāo qiú",       translation:"pedir / exigir",            notes:"" },
    { id:"e-b1-68",level:"B1",chinese:"允许",    pinyin:"yǔn xǔ",        translation:"permitir",                  notes:"" },
    { id:"e-b1-69",level:"B1",chinese:"禁止",    pinyin:"jìn zhǐ",       translation:"prohibir",                  notes:"" },
    { id:"e-b1-70",level:"B1",chinese:"也许",    pinyin:"yě xǔ",         translation:"quizá(s) / tal vez",        notes:"" },
    { id:"e-b1-071",level:"Custom",chinese:"适应",       pinyin:"shì yìng",          translation:"adaptarse / acostumbrarse",          notes:"" },
    { id:"e-b1-072",level:"Custom",chinese:"广播节目",   pinyin:"guǎng bō jié mù",   translation:"el programa de radio",               notes:"" },
    { id:"e-b1-073",level:"Custom",chinese:"吸烟",       pinyin:"xī yān",            translation:"fumar",                              notes:"" },
    { id:"e-b1-074",level:"Custom",chinese:"活动",       pinyin:"huó dòng",          translation:"moverse / la actividad física",      notes:"" },
    { id:"e-b1-075",level:"Custom",chinese:"注意到",     pinyin:"zhù yì dào",        translation:"darse cuenta / notar",               notes:"" },
    { id:"e-b1-076",level:"Custom",chinese:"实际上",     pinyin:"shí jì shàng",      translation:"en realidad / de hecho",             notes:"" },
    { id:"e-b1-077",level:"Custom",chinese:"例外",       pinyin:"lì wài",            translation:"la excepción",                       notes:"" },
    { id:"e-b1-078",level:"Custom",chinese:"侄子",       pinyin:"zhí zi",            translation:"el sobrino",                         notes:"" },
    { id:"e-b1-079",level:"Custom",chinese:"郊游",       pinyin:"jiāo yóu",          translation:"la excursión",                       notes:"" },
    { id:"e-b1-080",level:"Custom",chinese:"保持健康",   pinyin:"bǎo chí jiàn kāng", translation:"mantenerse en forma",                notes:"" },
    { id:"e-b1-081",level:"Custom",chinese:"办公楼",     pinyin:"bàn gōng lóu",      translation:"el edificio de oficinas",            notes:"" },
    { id:"e-b1-082",level:"Custom",chinese:"有意识的",   pinyin:"yǒu yì shí de",     translation:"consciente / a propósito",           notes:"" },
    { id:"e-b1-083",level:"Custom",chinese:"电梯",       pinyin:"diàn tī",           translation:"el ascensor",                        notes:"" },
    { id:"e-b1-084",level:"Custom",chinese:"楼梯",       pinyin:"lóu tī",            translation:"las escaleras",                      notes:"" },
    { id:"e-b1-085",level:"Custom",chinese:"不舒服的",   pinyin:"bù shū fú de",      translation:"incómodo",                           notes:"" },
    { id:"e-b1-086",level:"Custom",chinese:"奇怪的",     pinyin:"qí guài de",        translation:"extraño / peculiar",                 notes:"" },
    { id:"e-b1-087",level:"Custom",chinese:"员工",       pinyin:"yuán gōng",         translation:"el empleado / la empleada",          notes:"" },
    { id:"e-b1-088",level:"Custom",chinese:"介绍",       pinyin:"jiè shào",          translation:"presentar / gestionar",              notes:"" },
    { id:"e-b1-089",level:"Custom",chinese:"承担",       pinyin:"chéng dān",         translation:"asumir / encargarse de",             notes:"" },
    { id:"e-b1-090",level:"Custom",chinese:"义务",       pinyin:"yì wù",             translation:"la obligación / el deber",           notes:"" },
    { id:"e-b1-091",level:"Custom",chinese:"陪伴",       pinyin:"péi bàn",           translation:"acompañar / la compañía",            notes:"" },
    { id:"e-b1-092",level:"Custom",chinese:"单亲父母",   pinyin:"dān qīn fù mǔ",     translation:"padre/madre soltero/a",              notes:"" },
    { id:"e-b1-093",level:"Custom",chinese:"合租房",     pinyin:"hé zū fáng",        translation:"el piso compartido",                 notes:"" },
    { id:"e-b1-094",level:"Custom",chinese:"争吵",       pinyin:"zhēng chǎo",        translation:"la discusión / pelearse",            notes:"" },
    { id:"e-b1-095",level:"Custom",chinese:"必要的",     pinyin:"bì yào de",         translation:"necesario",                          notes:"" },
    { id:"e-b1-096",level:"Custom",chinese:"如今",       pinyin:"rú jīn",            translation:"ahora / actualmente",                notes:"" },
    { id:"e-b1-097",level:"Custom",chinese:"成功",       pinyin:"chéng gōng",        translation:"el éxito / exitoso",                 notes:"" },
    { id:"e-b1-098",level:"Custom",chinese:"生活质量",   pinyin:"shēng huó zhì liàng",translation:"la calidad de vida",               notes:"" },
    { id:"e-b1-099",level:"Custom",chinese:"评估",       pinyin:"píng gū",           translation:"evaluar / valorar",                  notes:"" },
    { id:"e-b1-100",level:"Custom",chinese:"使惊讶",     pinyin:"shǐ jīng yà",       translation:"sorprender",                         notes:"" },
    { id:"e-b1-101",level:"Custom",chinese:"低谷",       pinyin:"dī gǔ",             translation:"el punto bajo / la crisis",          notes:"" },
    { id:"e-b1-102",level:"Custom",chinese:"子女",       pinyin:"zǐ nǚ",             translation:"los hijos / la descendencia",        notes:"" },
    { id:"e-b1-103",level:"Custom",chinese:"意识到",     pinyin:"yì shí dào",        translation:"darse cuenta / comprender",          notes:"" },
    { id:"e-b1-104",level:"Custom",chinese:"提高",       pinyin:"tí gāo",            translation:"aumentar / mejorar",                 notes:"" },
    { id:"e-b1-105",level:"Custom",chinese:"因素",       pinyin:"yīn sù",            translation:"el factor",                          notes:"" },
    { id:"e-b1-106",level:"Custom",chinese:"社交生活",   pinyin:"shè jiāo shēng huó",translation:"la vida social",                    notes:"" },
    { id:"e-b1-107",level:"Custom",chinese:"支持",       pinyin:"zhī chí",           translation:"el apoyo / apoyar",                  notes:"" },
    { id:"e-b1-108",level:"Custom",chinese:"体力劳动",   pinyin:"tǐ lì láo dòng",    translation:"el trabajo físico / manual",         notes:"" },
    { id:"e-b1-109",level:"Custom",chinese:"维修车间",   pinyin:"wéi xiū chē jiān",  translation:"el taller",                          notes:"" },
    { id:"e-b1-110",level:"Custom",chinese:"兼职",       pinyin:"jiān zhí",          translation:"el trabajo a tiempo parcial",        notes:"" },
    { id:"e-b1-111",level:"Custom",chinese:"驾照",       pinyin:"jià zhào",          translation:"el carnet de conducir",              notes:"" },
    { id:"e-b1-112",level:"Custom",chinese:"托儿所",     pinyin:"tuō ér suǒ",        translation:"la guardería",                       notes:"" },
    { id:"e-b1-113",level:"Custom",chinese:"工作环境",   pinyin:"gōng zuò huán jìng",translation:"el entorno laboral",                notes:"" },
    { id:"e-b1-114",level:"Custom",chinese:"书店",       pinyin:"shū diàn",          translation:"la librería",                        notes:"" },
    { id:"e-b1-115",level:"Custom",chinese:"前提条件",   pinyin:"qián tí tiáo jiàn", translation:"el requisito previo",                notes:"" },
    { id:"e-b1-116",level:"Custom",chinese:"主动性",     pinyin:"zhǔ dòng xìng",     translation:"la iniciativa propia",               notes:"" },
    { id:"e-b1-117",level:"Custom",chinese:"灵活性",     pinyin:"líng huó xìng",     translation:"la flexibilidad",                    notes:"" },
    { id:"e-b1-118",level:"Custom",chinese:"行业知识",   pinyin:"háng yè zhī shì",   translation:"los conocimientos del sector",       notes:"" },
    { id:"e-b1-119",level:"Custom",chinese:"善交际的",   pinyin:"shàn jiāo jì de",   translation:"sociable / extrovertido",            notes:"" },
    { id:"e-b1-120",level:"Custom",chinese:"语言天赋",   pinyin:"yǔ yán tiān fù",    translation:"el talento para los idiomas",        notes:"" },
    { id:"e-b1-121",level:"Custom",chinese:"限速",       pinyin:"xiàn sù",           translation:"la limitación de velocidad",         notes:"" },
    { id:"e-b1-122",level:"Custom",chinese:"最高速度",   pinyin:"zuì gāo sù dù",     translation:"la velocidad máxima",                notes:"" },
    { id:"e-b1-123",level:"Custom",chinese:"乡村公路",   pinyin:"xiāng cūn gōng lù", translation:"la carretera rural / secundaria",    notes:"" },
    { id:"e-b1-124",level:"Custom",chinese:"事故",       pinyin:"shì gù",            translation:"el accidente",                       notes:"" },
    { id:"e-b1-125",level:"Custom",chinese:"路程",       pinyin:"lù chéng",          translation:"el trayecto / la distancia",         notes:"" },
    { id:"e-b1-126",level:"Custom",chinese:"专注的",     pinyin:"zhuān zhù de",      translation:"atento / concentrado",               notes:"" },
    { id:"e-b1-127",level:"Custom",chinese:"论点",       pinyin:"lùn diǎn",          translation:"el argumento",                       notes:"" },
    { id:"e-b1-128",level:"Custom",chinese:"危及",       pinyin:"wēi jí",            translation:"poner en peligro",                   notes:"" },
    { id:"e-b1-129",level:"Custom",chinese:"堵车",       pinyin:"dǔ chē",            translation:"el atasco / el embotellamiento",     notes:"" },
    { id:"e-b1-130",level:"Custom",chinese:"超车",       pinyin:"chāo chē",          translation:"adelantar",                          notes:"" },
    { id:"e-b1-131",level:"Custom",chinese:"从容的",     pinyin:"cóng róng de",      translation:"tranquilo / sereno",                 notes:"" },
    { id:"e-b1-132",level:"Custom",chinese:"限制",       pinyin:"xiàn zhì",          translation:"la restricción / limitar",           notes:"" },
    { id:"e-b1-133",level:"Custom",chinese:"规章制度",   pinyin:"guī zhāng zhì dù",  translation:"el reglamento",                      notes:"" },
    { id:"e-b1-134",level:"Custom",chinese:"有约束力的", pinyin:"yǒu yuē shù lì de", translation:"vinculante / obligatorio",           notes:"" },
    { id:"e-b1-135",level:"Custom",chinese:"有义务做",   pinyin:"yǒu yì wù zuò",     translation:"estar obligado a hacer",             notes:"" },
    { id:"e-b1-136",level:"Custom",chinese:"证件",       pinyin:"zhèng jiàn",        translation:"el documento de identidad",          notes:"" },
    { id:"e-b1-137",level:"Custom",chinese:"禁烟令",     pinyin:"jìn yān lìng",      translation:"la prohibición de fumar",            notes:"" },
    { id:"e-b1-138",level:"Custom",chinese:"提供",       pinyin:"tí gōng",           translation:"poner a disposición / ofrecer",      notes:"" },
    { id:"e-b1-139",level:"Custom",chinese:"个人物品",   pinyin:"gè rén wù pǐn",     translation:"los objetos personales",             notes:"" },
    { id:"e-b1-140",level:"Custom",chinese:"法律责任",   pinyin:"fǎ lǜ zé rèn",      translation:"la responsabilidad / la garantía",   notes:"" },
    { id:"e-b1-141",level:"Custom",chinese:"阶段",       pinyin:"jiē duàn",          translation:"la etapa / la fase",                 notes:"" },
    { id:"e-b1-142",level:"Custom",chinese:"放慢节奏",   pinyin:"fàng màn jié zòu",  translation:"la desaceleración / el ritmo lento", notes:"" },
    { id:"e-b1-143",level:"Custom",chinese:"大都市",     pinyin:"dà dū shì",         translation:"la metrópoli / la gran ciudad",      notes:"" },
    { id:"e-b1-144",level:"Custom",chinese:"乡村的",     pinyin:"xiāng cūn de",      translation:"rural / del campo",                  notes:"" },
    { id:"e-b1-145",level:"Custom",chinese:"回忆",       pinyin:"huí yì",            translation:"el recuerdo / recordar",             notes:"" },
    { id:"e-b1-146",level:"Custom",chinese:"方言",       pinyin:"fāng yán",          translation:"el dialecto",                        notes:"" },
    { id:"e-b1-147",level:"Custom",chinese:"徒步旅行",   pinyin:"tú bù lǚ xíng",     translation:"el senderismo / la caminata",        notes:"" },
    { id:"e-b1-148",level:"Custom",chinese:"务实的",     pinyin:"wù shí de",         translation:"práctico / pragmático",              notes:"" },
    { id:"e-b1-149",level:"Custom",chinese:"有机产品",   pinyin:"yǒu jī chǎn pǐn",   translation:"el producto ecológico / orgánico",   notes:"" },
    { id:"e-b1-150",level:"Custom",chinese:"传统的",     pinyin:"chuán tǒng de",     translation:"convencional / tradicional",         notes:"" },
    { id:"e-b1-151",level:"Custom",chinese:"可持续性",   pinyin:"kě chí xù xìng",    translation:"la sostenibilidad",                  notes:"" },
    { id:"e-b1-152",level:"Custom",chinese:"生产",       pinyin:"shēng chǎn",        translation:"fabricar / producir",                notes:"" },
    { id:"e-b1-153",level:"Custom",chinese:"导致",       pinyin:"dǎo zhì",           translation:"causar / provocar",                  notes:"" },
    { id:"e-b1-154",level:"Custom",chinese:"饮食",       pinyin:"yǐn shí",           translation:"la alimentación / la dieta",         notes:"" },
    { id:"e-b1-155",level:"Custom",chinese:"均衡的",     pinyin:"jūn héng de",       translation:"equilibrado",                        notes:"" },
    { id:"e-b1-156",level:"Custom",chinese:"标准",       pinyin:"biāo zhǔn",         translation:"el criterio / el estándar",          notes:"" },
    { id:"e-b1-157",level:"Custom",chinese:"拥挤",       pinyin:"yōng jǐ",           translation:"la aglomeración / abarrotado",       notes:"" },
    { id:"e-b1-158",level:"Custom",chinese:"机会",       pinyin:"jī huì",            translation:"la oportunidad / la ocasión",        notes:"" },
    { id:"e-b1-159",level:"Custom",chinese:"多样的",     pinyin:"duō yàng de",       translation:"variado / diverso",                  notes:"" },
    { id:"e-b1-160",level:"Custom",chinese:"表演",       pinyin:"biǎo yǎn",          translation:"la representación / actuar",         notes:"" },
    { id:"e-b1-161",level:"Custom",chinese:"隆重地",     pinyin:"lóng zhòng de",     translation:"solemnemente / de manera solemne",   notes:"" },
    { id:"e-b1-162",level:"Custom",chinese:"食堂",       pinyin:"shí táng",          translation:"la cafetería / el comedor",          notes:"" },
    { id:"e-b1-163",level:"Custom",chinese:"不可预见的", pinyin:"bù kě yù jiàn de",  translation:"imprevisible",                       notes:"" },
    { id:"e-b1-164",level:"Custom",chinese:"后果",       pinyin:"hòu guǒ",           translation:"la consecuencia",                    notes:"" },
    { id:"e-b1-165",level:"Custom",chinese:"废除",       pinyin:"fèi chú",           translation:"abolir / suprimir",                  notes:"" },
    { id:"e-b1-166",level:"Custom",chinese:"认识到",     pinyin:"rèn shí dào",       translation:"comprender / aceptar la realidad",   notes:"" },
    { id:"e-b1-167",level:"Custom",chinese:"比赛",       pinyin:"bǐ sài",            translation:"la competición / el partido",        notes:"" },
    { id:"e-b1-168",level:"Custom",chinese:"参与",       pinyin:"cān yù",            translation:"la participación / participar",      notes:"" },
    { id:"e-b1-169",level:"Custom",chinese:"灾难",       pinyin:"zāi nàn",           translation:"la catástrofe / el desastre",        notes:"" },
    { id:"e-b1-170",level:"Custom",chinese:"避免",       pinyin:"bì miǎn",           translation:"evitar",                             notes:"" },
    { id:"e-b1-171",level:"Custom",chinese:"钦佩",       pinyin:"qīn pèi",           translation:"admirar",                            notes:"" },
    { id:"e-b1-172",level:"Custom",chinese:"辩护",       pinyin:"biàn hù",           translation:"defender / justificar",              notes:"" },
    { id:"e-b1-173",level:"Custom",chinese:"能力",       pinyin:"néng lì",           translation:"la habilidad / la capacidad",        notes:"" },
    { id:"e-b1-174",level:"Custom",chinese:"停止",       pinyin:"tíng zhǐ",          translation:"parar / dejar de",                   notes:"" },
    { id:"e-b1-175",level:"Custom",chinese:"挑战",       pinyin:"tiāo zhàn",         translation:"el reto / el desafío",               notes:"" },
    { id:"e-b2-01",level:"B2",chinese:"影响",    pinyin:"yǐng xiǎng",    translation:"la influencia / influir",   notes:"" },
    { id:"e-b2-02",level:"B2",chinese:"后果",    pinyin:"hòu guǒ",       translation:"la consecuencia",           notes:"" },
    { id:"e-b2-03",level:"B2",chinese:"责任",    pinyin:"zé rèn",        translation:"la responsabilidad",        notes:"" },
    { id:"e-b2-04",level:"B2",chinese:"挑战",    pinyin:"tiǎo zhàn",     translation:"el reto / el desafío",      notes:"" },
    { id:"e-b2-05",level:"B2",chinese:"观点",    pinyin:"guān diǎn",     translation:"el punto de vista",         notes:"" },
    { id:"e-b2-06",level:"B2",chinese:"争议",    pinyin:"zhēng yì",      translation:"la controversia / polémico",notes:"" },
    { id:"e-b2-07",level:"B2",chinese:"矛盾",    pinyin:"máo dùn",       translation:"la contradicción / contradictorio",notes:"" },
    { id:"e-b2-08",level:"B2",chinese:"偏见",    pinyin:"piān jiàn",     translation:"el prejuicio",              notes:"" },
    { id:"e-b2-09",level:"B2",chinese:"社会",    pinyin:"shè huì",       translation:"la sociedad",               notes:"" },
    { id:"e-b2-10",level:"B2",chinese:"平等",    pinyin:"píng děng",     translation:"la igualdad",               notes:"" },
    { id:"e-b2-11",level:"B2",chinese:"不平等",  pinyin:"bù píng děng",  translation:"la desigualdad",            notes:"" },
    { id:"e-b2-12",level:"B2",chinese:"权利",    pinyin:"quán lì",       translation:"el derecho (jurídico)",     notes:"" },
    { id:"e-b2-13",level:"B2",chinese:"义务",    pinyin:"yì wù",         translation:"la obligación / el deber",  notes:"" },
    { id:"e-b2-14",level:"B2",chinese:"规范",    pinyin:"guī fàn",       translation:"la norma",                  notes:"" },
    { id:"e-b2-15",level:"B2",chinese:"态度",    pinyin:"tài dù",        translation:"la actitud",                notes:"" },
    { id:"e-b2-16",level:"B2",chinese:"行为",    pinyin:"xíng wéi",      translation:"la conducta / el comportamiento",notes:"" },
    { id:"e-b2-17",level:"B2",chinese:"趋势",    pinyin:"qū shì",        translation:"la tendencia / la corriente",notes:"" },
    { id:"e-b2-18",level:"B2",chinese:"全球化",  pinyin:"quán qiú huà",  translation:"la globalización",          notes:"" },
    { id:"e-b2-19",level:"B2",chinese:"可持续",  pinyin:"kě chí xù",     translation:"sostenible",                notes:"" },
    { id:"e-b2-20",level:"B2",chinese:"气候变化",pinyin:"qì hòu biàn huà",translation:"el cambio climático",       notes:"" },
    { id:"e-b2-21",level:"B2",chinese:"说服",    pinyin:"shuō fú",       translation:"convencer / persuadir",     notes:"" },
    { id:"e-b2-22",level:"B2",chinese:"强调",    pinyin:"qiáng diào",    translation:"enfatizar / hacer hincapié",notes:"" },
    { id:"e-b2-23",level:"B2",chinese:"分析",    pinyin:"fēn xī",        translation:"analizar / el análisis",    notes:"" },
    { id:"e-b2-24",level:"B2",chinese:"批评",    pinyin:"pī píng",       translation:"criticar / la crítica",     notes:"" },
    { id:"e-b2-25",level:"B2",chinese:"承认",    pinyin:"chéng rèn",     translation:"reconocer / admitir",       notes:"" },
    { id:"e-b2-26",level:"B2",chinese:"克服",    pinyin:"kè fú",         translation:"superar / vencer",          notes:"" },
    { id:"e-b2-27",level:"B2",chinese:"依赖",    pinyin:"yī lài",        translation:"depender de / la dependencia",notes:"" },
    { id:"e-b2-28",level:"B2",chinese:"独立",    pinyin:"dú lì",         translation:"la independencia / independiente",notes:"" },
    { id:"e-b2-29",level:"B2",chinese:"背景",    pinyin:"bèi jǐng",      translation:"el contexto / el trasfondo",notes:"" },
    { id:"e-b2-30",level:"B2",chinese:"妥协",    pinyin:"tuǒ xié",       translation:"llegar a un acuerdo / ceder",notes:"" },
  ],
};

// ─── CSS ──────────────────────────────────────────────────────────────────────
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400&family=Noto+Serif+SC:wght@300;400;500&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  :root{
    --bg:#F4EDE3; --bg-card:#FDFAF5; --bg-back:#FEF6ED;
    --ink:#1C1510; --ink-mid:#4A3C31; --ink-muted:#907B6D;
    --red:#C03018; --red-h:#9E2614;
    --green:#3D5E35; --green-h:#2E4828;
    --border:#DDD0C3; --shadow:0 8px 36px rgba(28,21,16,.13);
    --radius:3px;
    --a1:#5B8C50; --a2:#3A7032; --b1:#3D6298; --b2:#6B46A0; --custom:#B8941C;
    --gold:#B8941C;
  }
  html,body{height:100%}
  body{
    background:var(--bg);color:var(--ink);
    font-family:'Cormorant Garamond',Georgia,serif;
    min-height:100vh;overscroll-behavior:none;
    background-image:
      radial-gradient(ellipse 70% 50% at 10% 0%,rgba(192,48,24,.05) 0%,transparent 100%),
      radial-gradient(ellipse 50% 40% at 90% 100%,rgba(61,94,53,.04) 0%,transparent 100%);
  }
  .app{max-width:540px;margin:0 auto;padding:22px 16px 80px;min-height:100vh}
  .header{display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;gap:8px}
  .logo-block{display:flex;align-items:baseline;gap:8px;flex:1}
  .logo{font-family:'Noto Serif SC',serif;font-size:2.2rem;font-weight:300;color:var(--red);line-height:1}
  .app-title{font-size:.66rem;text-transform:uppercase;letter-spacing:.22em;color:var(--ink-muted)}
  .header-right{display:flex;align-items:center;gap:8px}
  .lang-toggle{padding:5px 10px;background:transparent;border:1px solid var(--border);border-radius:var(--radius);font-family:'Cormorant Garamond',serif;font-size:.75rem;letter-spacing:.1em;cursor:pointer;color:var(--ink-muted);transition:all .18s;white-space:nowrap}
  .lang-toggle:hover{border-color:var(--ink-mid);color:var(--ink)}
  .mode-toggle{display:flex;border:1px solid var(--border);border-radius:var(--radius);overflow:hidden}
  .mode-btn{padding:6px 13px;background:transparent;color:var(--ink-muted);border:none;font-family:'Cormorant Garamond',serif;font-size:.74rem;letter-spacing:.12em;text-transform:uppercase;cursor:pointer;transition:all .18s}
  .mode-btn+.mode-btn{border-left:1px solid var(--border)}
  .mode-btn.active{background:var(--red);color:#fff}
  .mode-btn:not(.active):hover{background:rgba(192,48,24,.07);color:var(--ink)}
  .deck-tabs{display:flex;gap:8px;margin-bottom:16px}
  .deck-tab{flex:1;padding:10px 8px;border:1px solid var(--border);background:transparent;color:var(--ink-muted);font-family:'Cormorant Garamond',serif;font-size:.95rem;cursor:pointer;border-radius:var(--radius);transition:all .18s;text-align:center}
  .deck-tab:hover{border-color:var(--ink-mid);color:var(--ink)}
  .deck-tab.active{background:var(--ink);color:var(--bg);border-color:var(--ink)}
  .level-chips{display:flex;gap:6px;justify-content:center;margin-bottom:14px;flex-wrap:wrap}
  .lc{padding:5px 12px;border-radius:20px;font-size:.74rem;letter-spacing:.1em;cursor:pointer;border:1.5px solid;transition:all .15s;display:flex;align-items:center;gap:4px;opacity:.42;font-family:'Cormorant Garamond',serif}
  .lc.on{opacity:1;color:#fff!important}
  .lc-cnt{font-size:.62rem;opacity:.8}
  .lc[data-l="A1"]{border-color:var(--a1);color:var(--a1)} .lc[data-l="A1"].on{background:var(--a1)}
  .lc[data-l="A2"]{border-color:var(--a2);color:var(--a2)} .lc[data-l="A2"].on{background:var(--a2)}
  .lc[data-l="B1"]{border-color:var(--b1);color:var(--b1)} .lc[data-l="B1"].on{background:var(--b1)}
  .lc[data-l="B2"]{border-color:var(--b2);color:var(--b2)} .lc[data-l="B2"].on{background:var(--b2)}
  .lc[data-l="Custom"]{border-color:var(--custom);color:var(--custom)} .lc[data-l="Custom"].on{background:var(--custom)}
  .lvl-badge{display:inline-flex;align-items:center;justify-content:center;padding:1px 6px;border-radius:10px;font-size:.6rem;font-weight:500;letter-spacing:.06em;flex-shrink:0;color:#fff}
  .lvl-badge[data-l="A1"]{background:var(--a1)} .lvl-badge[data-l="A2"]{background:var(--a2)}
  .lvl-badge[data-l="B1"]{background:var(--b1)} .lvl-badge[data-l="B2"]{background:var(--b2)}
  .lvl-badge[data-l="Custom"]{background:var(--custom)}
  .status-badge{display:inline-flex;align-items:center;padding:1px 7px;border-radius:10px;font-size:.58rem;letter-spacing:.06em;flex-shrink:0;border:1px solid}
  .status-badge.new{border-color:var(--ink-muted);color:var(--ink-muted)}
  .status-badge.learning{border-color:var(--b1);color:var(--b1)}
  .status-badge.fail{border-color:var(--red);color:var(--red)}
  .status-badge.master{border-color:var(--gold);color:var(--gold)}
  .study-meta{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px}
  .progress-text{font-size:.78rem;color:var(--ink-muted);letter-spacing:.05em}
  .progress-known{font-size:.78rem;color:var(--green)}
  .progress-bar{width:100%;height:2px;background:var(--border);border-radius:1px;overflow:hidden;margin-bottom:14px}
  .progress-fill{height:100%;background:var(--red);border-radius:1px;transition:width .4s ease}
  .direction-toggle{display:flex;width:100%;margin-bottom:14px;border:1px solid var(--border);border-radius:var(--radius);overflow:hidden}
  .dir-btn{flex:1;padding:8px 6px;border:none;background:transparent;color:var(--ink-muted);font-family:'Cormorant Garamond',serif;font-size:.82rem;letter-spacing:.04em;cursor:pointer;transition:all .15s;text-align:center}
  .dir-btn+.dir-btn{border-left:1px solid var(--border)}
  .dir-btn.active{background:rgba(28,21,16,.06);color:var(--ink);font-style:italic}
  .card-scene{perspective:1200px;width:100%;touch-action:none;user-select:none;-webkit-user-select:none;margin-bottom:16px}
  .card-inner{width:100%;height:275px;transform-style:preserve-3d;position:relative;transition:transform .5s cubic-bezier(.4,0,.2,1);border-radius:5px}
  .card-inner.nt{transition:none}
  .card-inner.flipped{transform:rotateY(180deg)}
  .card-face{position:absolute;inset:0;backface-visibility:hidden;-webkit-backface-visibility:hidden;border-radius:5px;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px 28px;box-shadow:var(--shadow)}
  .card-front{background:var(--bg-card);border:1px solid var(--border)}
  .card-back{background:var(--bg-back);border:1px solid rgba(192,48,24,.18);transform:rotateY(180deg)}
  .card-back.dk{background:rgba(61,94,53,.1)!important}
  .card-back.dr{background:rgba(192,48,24,.1)!important}
  .card-label{position:absolute;top:14px;left:0;right:0;text-align:center;font-size:.6rem;text-transform:uppercase;letter-spacing:.22em;color:var(--ink-muted)}
  .card-top-right{position:absolute;top:11px;right:13px;display:flex;align-items:center;gap:5px}
  .diff-dot{width:7px;height:7px;border-radius:50%;display:inline-block}
  .diff-dot.fail{background:var(--red);opacity:.6}
  .diff-dot.master{background:var(--gold);opacity:.75}
  .diff-dot.learning{background:var(--b1);opacity:.4}
  .card-chinese{font-family:'Noto Serif SC','STSong',serif;font-size:3.8rem;font-weight:300;color:var(--ink);line-height:1;margin-bottom:10px;letter-spacing:.06em}
  .card-pinyin{font-size:1.1rem;color:var(--red);font-style:italic;letter-spacing:.04em}
  .card-translation{font-size:2.1rem;font-weight:400;color:var(--ink);text-align:center;line-height:1.3}
  .card-notes{position:absolute;bottom:36px;font-size:.76rem;color:var(--ink-muted);font-style:italic;text-align:center;padding:0 18px}
  .card-tap{position:absolute;bottom:13px;font-size:.6rem;text-transform:uppercase;letter-spacing:.2em;color:var(--ink-muted);opacity:.48}
  .swipe-hints{position:absolute;bottom:13px;left:0;right:0;display:flex;justify-content:space-between;padding:0 16px;pointer-events:none}
  .sh-l,.sh-r{font-size:.6rem;text-transform:uppercase;letter-spacing:.12em;opacity:.3;transition:opacity .12s,transform .12s}
  .sh-l{color:var(--red)} .sh-r{color:var(--green)}
  .sh-l.lit{opacity:1;transform:scale(1.08)} .sh-r.lit{opacity:1;transform:scale(1.08)}
  .action-buttons{display:flex;gap:10px;animation:fadeUp .18s ease}
  @keyframes fadeUp{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
  .btn-review,.btn-known{flex:1;padding:15px 10px;border-radius:var(--radius);font-family:'Cormorant Garamond',serif;font-size:1.05rem;cursor:pointer;border:1px solid;transition:all .18s;text-align:center;-webkit-tap-highlight-color:transparent}
  .btn-review{border-color:var(--border);background:transparent;color:var(--ink-mid)}
  .btn-review:active{background:rgba(28,21,16,.06)}
  .btn-known{border-color:var(--green);background:var(--green);color:#fff}
  .btn-known:active{background:var(--green-h)}
  .empty,.session-done{text-align:center;padding:44px 20px;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:320px}
  .empty-zh{font-family:'Noto Serif SC',serif;font-size:2.6rem;font-weight:300;margin-bottom:12px;opacity:.32}
  .empty-text{font-size:1rem;font-style:italic;margin-bottom:6px;color:var(--ink-muted)}
  .empty-sub{font-size:.82rem;color:var(--ink-muted);opacity:.7}
  .done-icon{font-size:2.8rem;margin-bottom:14px}
  .done-title{font-family:'Noto Serif SC',serif;font-size:1.6rem;font-weight:300;margin-bottom:4px}
  .done-sub{font-size:1.05rem;font-weight:300;margin-bottom:6px;color:var(--ink-mid)}
  .done-stats{font-size:.95rem;color:var(--ink-muted);margin-bottom:20px}
  .done-stats strong{color:var(--green)}
  .done-btns{display:flex;flex-direction:column;gap:9px;width:100%;max-width:280px}
  .btn-primary,.btn-secondary{padding:13px 24px;border-radius:var(--radius);font-family:'Cormorant Garamond',serif;font-size:1rem;cursor:pointer;letter-spacing:.08em;transition:all .18s;-webkit-tap-highlight-color:transparent;border:1px solid}
  .btn-primary{background:var(--ink);color:var(--bg);border-color:var(--ink)}
  .btn-primary:active{background:var(--red);border-color:var(--red)}
  .btn-secondary{background:transparent;color:var(--red);border-color:var(--red)}
  .btn-secondary:active{background:rgba(192,48,24,.08)}
  .btn-secondary:disabled{opacity:.3;cursor:not-allowed}
  .section{margin-bottom:28px}
  .section-title{font-size:.65rem;text-transform:uppercase;letter-spacing:.25em;color:var(--ink-muted);margin-bottom:14px;padding-bottom:8px;border-bottom:1px solid var(--border)}
  .mf-row{display:flex;gap:6px;margin-bottom:14px;flex-wrap:wrap}
  .mf-btn{padding:4px 12px;border-radius:20px;font-size:.72rem;letter-spacing:.08em;cursor:pointer;border:1.5px solid;font-family:'Cormorant Garamond',serif;transition:all .15s;opacity:.42}
  .mf-btn.on{opacity:1;color:#fff!important}
  .mf-btn[data-l="all"]{border-color:var(--ink-muted);color:var(--ink-muted)} .mf-btn[data-l="all"].on{background:var(--ink-mid);border-color:var(--ink-mid)}
  .mf-btn[data-l="A1"]{border-color:var(--a1);color:var(--a1)} .mf-btn[data-l="A1"].on{background:var(--a1)}
  .mf-btn[data-l="A2"]{border-color:var(--a2);color:var(--a2)} .mf-btn[data-l="A2"].on{background:var(--a2)}
  .mf-btn[data-l="B1"]{border-color:var(--b1);color:var(--b1)} .mf-btn[data-l="B1"].on{background:var(--b1)}
  .mf-btn[data-l="B2"]{border-color:var(--b2);color:var(--b2)} .mf-btn[data-l="B2"].on{background:var(--b2)}
  .mf-btn[data-l="Custom"]{border-color:var(--custom);color:var(--custom)} .mf-btn[data-l="Custom"].on{background:var(--custom)}
  .add-form{background:var(--bg-card);border:1px solid var(--border);border-radius:5px;padding:18px;display:flex;flex-direction:column;gap:12px}
  .form-row{display:flex;gap:10px}
  .fg{display:flex;flex-direction:column;gap:5px;flex:1}
  .fl{font-size:.64rem;text-transform:uppercase;letter-spacing:.15em;color:var(--ink-muted)}
  .fi{padding:10px 13px;border:1px solid var(--border);background:var(--bg);color:var(--ink);font-family:'Cormorant Garamond',serif;font-size:16px;border-radius:var(--radius);outline:none;transition:border-color .15s;width:100%;-webkit-appearance:none}
  .fi:focus{border-color:var(--ink-mid)}
  .fi.zh{font-family:'Noto Serif SC',serif}
  .fi::placeholder{color:var(--border)}
  .btn-add{padding:13px;background:var(--red);color:#fff;border:none;border-radius:var(--radius);font-family:'Cormorant Garamond',serif;font-size:1rem;cursor:pointer;letter-spacing:.08em;transition:background .18s;-webkit-tap-highlight-color:transparent}
  .btn-add:active{background:var(--red-h)}
  .btn-add:disabled{opacity:.38;cursor:not-allowed}
  .cards-list{display:flex;flex-direction:column;gap:7px}
  .card-item{display:flex;align-items:center;gap:10px;padding:11px 12px;background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius)}
  .ci-zh{font-family:'Noto Serif SC',serif;font-size:1.4rem;font-weight:300;color:var(--ink);min-width:50px;text-align:center}
  .ci-sep{width:1px;height:32px;background:var(--border);flex-shrink:0}
  .ci-body{flex:1;min-width:0}
  .ci-trans{font-size:.93rem;color:var(--ink);margin-bottom:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .ci-pin{font-size:.72rem;color:var(--red);font-style:italic}
  .ci-tags{display:flex;gap:4px;align-items:center;flex-shrink:0}
  .btn-del{background:none;border:none;color:var(--ink-muted);cursor:pointer;padding:7px 8px;font-size:.88rem;border-radius:2px;line-height:1;flex-shrink:0;-webkit-tap-highlight-color:transparent}
  .btn-del:active{color:var(--red);background:rgba(192,48,24,.07)}
  .loader{display:flex;align-items:center;justify-content:center;min-height:100vh;font-family:'Noto Serif SC',serif;color:var(--ink-muted);font-size:1.3rem;letter-spacing:.1em}
`;

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [loaded, setLoaded]         = useState(false);
  const [cards, setCards]           = useState({});
  const [stats, setStats]           = useState({});
  const [uiLang, setUiLang]         = useState("zh");
  const [activeDeck, setActiveDeck] = useState("es-zh");
  const [mode, setMode]             = useState("study");
  const [selectedLevels, setSelectedLevels] = useState(["A1","A2"]);

  const [queue, setQueue]               = useState([]);
  const [idx, setIdx]                   = useState(0);
  const [flipped, setFlipped]           = useState(false);
  const [known, setKnown]               = useState(0);
  const [direction, setDirection]       = useState("zh-to-lang");
  const [sessionFails, setSessionFails] = useState(new Set());

  const [drag, setDrag]             = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const touchStart    = useRef({ x:0, y:0 });
  const wasTouchEvent = useRef(false);
  const flippedRef    = useRef(flipped);
  const currentRef    = useRef(null);
  useEffect(() => { flippedRef.current = flipped; }, [flipped]);
  useEffect(() => { currentRef.current = queue[idx]; }, [queue, idx]);

  const [manageFilter, setManageFilter] = useState("all");
  const [form, setForm] = useState({ chinese:"", pinyin:"", translation:"", notes:"", level:"A1" });

  useEffect(() => {
    (async () => {
      try {
        const [cr, sr, lr] = await Promise.all([
          window.storage.get("lc-cards-v3"),
          window.storage.get("lc-stats-v1"),
          window.storage.get("lc-lang"),
        ]);
        setCards(cr ? mergeSeeds(JSON.parse(cr.value)) : SEEDS);
        setStats(sr ? JSON.parse(sr.value) : {});
        if (lr) setUiLang(lr.value);
      } catch { setCards(SEEDS); setStats({}); }
      setLoaded(true);
    })();
  }, []);

  useEffect(() => { if (loaded) window.storage.set("lc-cards-v3", JSON.stringify(cards)).catch(()=>{}); }, [cards, loaded]);
  useEffect(() => { if (loaded) window.storage.set("lc-stats-v1", JSON.stringify(stats)).catch(()=>{}); }, [stats, loaded]);
  useEffect(() => { if (loaded) window.storage.set("lc-lang", uiLang).catch(()=>{}); }, [uiLang, loaded]);

  const levelsKey = selectedLevels.slice().sort().join(",");
  useEffect(() => {
    if (!loaded) return;
    const q = buildQueue(cards[activeDeck] || [], selectedLevels, stats);
    setQueue(q); setIdx(0); setFlipped(false); setKnown(0); setSessionFails(new Set());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeDeck, levelsKey, loaded]);

  const switchDeck = (id) => {
    const d = DECKS.find(x => x.id === id);
    setActiveDeck(id); setSelectedLevels(d.defaultLevels);
    setManageFilter("all"); setForm(f => ({ ...f, level: d.defaultLevels[0] }));
  };

  const t          = UI[uiLang];
  const current    = queue[idx];
  const done       = idx >= queue.length && queue.length > 0;
  const deckInfo   = DECKS.find(d => d.id === activeDeck);
  const deckCards  = cards[activeDeck] || [];
  const levelCount = ALL_LEVELS.reduce((a,l) => ({ ...a, [l]: deckCards.filter(c=>(c.level||"A1")===l).length }), {});
  const availLevels = ALL_LEVELS.filter(l => levelCount[l] > 0);
  const managedCards = manageFilter === "all" ? deckCards : deckCards.filter(c=>(c.level||"A1")===manageFilter);
  const langName   = t.langName[activeDeck];
  const currentStatus = current ? getCardStatus(current.id, stats) : null;
  const failsThisSession = [...sessionFails].map(id => queue.find(c=>c.id===id)).filter(Boolean);

  const handleAnswer = useCallback((wasKnown) => {
    const card = currentRef.current;
    if (card) {
      setStats(prev => {
        const s = prev[card.id] || { fails:0, successes:0, streak:0 };
        return { ...prev, [card.id]: wasKnown
          ? { ...s, successes: s.successes+1, streak: s.streak+1 }
          : { ...s, fails: s.fails+1, streak: 0 }
        };
      });
      if (!wasKnown) setSessionFails(prev => new Set([...prev, card.id]));
    }
    setDrag(0); setIsDragging(false); setFlipped(false);
    if (wasKnown) setKnown(k => k+1);
    setIdx(i => i+1);
  }, []);

  const restart = (onlyFails = false) => {
    const base = onlyFails ? failsThisSession : (cards[activeDeck]||[]).filter(c=>selectedLevels.includes(c.level||"A1"));
    const q = buildQueue(base, onlyFails ? ALL_LEVELS : selectedLevels, stats);
    setQueue(q); setIdx(0); setFlipped(false); setKnown(0); setSessionFails(new Set());
  };

  const toggleLevel = (l) => setSelectedLevels(prev => {
    if (prev.includes(l)) return prev.length===1 ? prev : prev.filter(x=>x!==l);
    return [...prev, l];
  });

  const onTouchStart = (e) => {
    wasTouchEvent.current = true;
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    setDrag(0); setIsDragging(false);
  };
  const onTouchMove = (e) => {
    const dx = e.touches[0].clientX - touchStart.current.x;
    const dy = e.touches[0].clientY - touchStart.current.y;
    if (flippedRef.current && Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 8) {
      setIsDragging(true); setDrag(dx);
    }
  };
  const onTouchEnd = (e) => {
    const dx = e.changedTouches[0].clientX - touchStart.current.x;
    const dy = e.changedTouches[0].clientY - touchStart.current.y;
    if (isDragging && Math.abs(dx) > SWIPE_THRESHOLD && flippedRef.current) handleAnswer(dx > 0);
    else if (!isDragging && Math.abs(dx) < 8 && Math.abs(dy) < 8) setFlipped(f=>!f);
    else { setDrag(0); setIsDragging(false); }
  };
  const handleCardClick = () => {
    if (wasTouchEvent.current) { wasTouchEvent.current = false; return; }
    setFlipped(f=>!f);
  };

  const addCard = () => {
    if (!form.chinese.trim() || !form.translation.trim()) return;
    const card = { id:`${activeDeck}-${Date.now()}`, level:form.level, chinese:form.chinese.trim(), pinyin:form.pinyin.trim(), translation:form.translation.trim(), notes:form.notes.trim() };
    setCards(prev => ({ ...prev, [activeDeck]: [...(prev[activeDeck]||[]), card] }));
    setForm(f => ({ chinese:"", pinyin:"", translation:"", notes:"", level:f.level }));
  };
  const deleteCard = (id) => setCards(prev => ({ ...prev, [activeDeck]: prev[activeDeck].filter(c=>c.id!==id) }));

  const FrontContent = () => direction === "zh-to-lang" ? (
    <> <div className="card-chinese">{current?.chinese}</div> {current?.pinyin && <div className="card-pinyin">{current.pinyin}</div>} </>
  ) : ( <div className="card-translation">{current?.translation}</div> );

  const BackContent = () => direction === "zh-to-lang" ? (
    <> <div className="card-translation">{current?.translation}</div> {current?.notes && <div className="card-notes">{current.notes}</div>} </>
  ) : (
    <> <div className="card-chinese">{current?.chinese}</div> {current?.pinyin && <div className="card-pinyin">{current.pinyin}</div>} {current?.notes && <div className="card-notes">{current.notes}</div>} </>
  );

  const statusLabel = { new:t.statusNew, learning:t.statusLearning, fail:t.statusFail, master:t.statusMaster };

  if (!loaded) return (
    <> <style dangerouslySetInnerHTML={{ __html:CSS }} /> <div className="loader">载入中…</div> </>
  );

  const progress  = queue.length > 0 ? (idx / queue.length) * 100 : 0;
  const dragClass = isDragging ? (drag>15?"dk":drag<-15?"dr":"") : "";

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="app">
        <header className="header">
          <div className="logo-block">
            <span className="logo">語</span>
            <span className="app-title">词卡</span>
          </div>
          <div className="header-right">
            <button className="lang-toggle" onClick={() => setUiLang(l => l==="zh"?"es":"zh")}>
              {uiLang==="zh" ? "🇪🇸 ES" : "🇨🇳 中文"}
            </button>
            <div className="mode-toggle">
              <button className={`mode-btn${mode==="study"?" active":""}`} onClick={()=>setMode("study")}>{t.study}</button>
              <button className={`mode-btn${mode==="manage"?" active":""}`} onClick={()=>setMode("manage")}>{t.manage}</button>
            </div>
          </div>
        </header>

        <div className="deck-tabs">
          {DECKS.map(d => (
            <button key={d.id} className={`deck-tab${activeDeck===d.id?" active":""}`} onClick={()=>switchDeck(d.id)}>
              {d.flag} {t.langName[d.id]}
            </button>
          ))}
        </div>

        {mode === "study" && (
          <>
            <div className="level-chips">
              {availLevels.map(l => (
                <button key={l} className={`lc${selectedLevels.includes(l)?" on":""}`} data-l={l} onClick={()=>toggleLevel(l)}>
                  {l} <span className="lc-cnt">{levelCount[l]}</span>
                </button>
              ))}
            </div>

            {deckCards.length === 0 ? (
              <div className="empty"><div className="empty-zh">空</div><div className="empty-text">{t.noCards}</div><div className="empty-sub">{t.noCardsSub}</div></div>
            ) : queue.length === 0 ? (
              <div className="empty"><div className="empty-zh">∅</div><div className="empty-text">{t.noLevel}</div><div className="empty-sub">{t.noLevelSub}</div></div>
            ) : done ? (
              <div className="session-done">
                <div className="done-icon">🎋</div>
                <div className="done-title">{t.doneTitle}</div>
                <div className="done-sub">{t.doneSub}</div>
                <div className="done-stats">{t.doneStats(known, queue.length)}</div>
                <div className="done-btns">
                  <button className="btn-primary" onClick={()=>restart(false)}>{t.restart}</button>
                  <button className="btn-secondary" onClick={()=>restart(true)} disabled={failsThisSession.length===0}>
                    {t.onlyFails} {failsThisSession.length > 0 && `(${failsThisSession.length})`}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="study-meta">
                  <span className="progress-text">{idx+1} / {queue.length}</span>
                  <span className="progress-known">✓ {known}</span>
                </div>
                <div className="progress-bar"><div className="progress-fill" style={{width:`${progress}%`}} /></div>

                <div className="direction-toggle">
                  <button className={`dir-btn${direction==="zh-to-lang"?" active":""}`} onClick={()=>setDirection("zh-to-lang")}>{t.zhDir(langName)}</button>
                  <button className={`dir-btn${direction==="lang-to-zh"?" active":""}`} onClick={()=>setDirection("lang-to-zh")}>{t.lDir(langName)}</button>
                </div>

                <div
                  className="card-scene"
                  style={isDragging?{transform:`rotate(${drag*.03}deg) translateX(${drag*.18}px)`,transition:"none"}:{}}
                  onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
                  onClick={handleCardClick} role="button"
                >
                  <div className={`card-inner${flipped?" flipped":""}${isDragging?" nt":""}`}>
                    <div className="card-face card-front">
                      <span className="card-label">{direction==="zh-to-lang"?"中文":langName}</span>
                      <div className="card-top-right">
                        {currentStatus && currentStatus!=="new" && <span className={`diff-dot ${currentStatus}`}/>}
                        <span className="lvl-badge" data-l={current?.level}>{current?.level}</span>
                      </div>
                      <FrontContent />
                      {!flipped && <span className="card-tap">{t.flipHint}</span>}
                    </div>
                    <div className={`card-face card-back ${dragClass}`}>
                      <span className="card-label">{direction==="zh-to-lang"?langName:"中文"}</span>
                      <div className="card-top-right">
                        {currentStatus && currentStatus!=="new" && <span className={`diff-dot ${currentStatus}`}/>}
                        <span className="lvl-badge" data-l={current?.level}>{current?.level}</span>
                      </div>
                      <BackContent />
                      <div className="swipe-hints">
                        <span className={`sh-l${drag<-15?" lit":""}`}>{t.swipeLeft}</span>
                        <span className={`sh-r${drag>15?" lit":""}`}>{t.swipeRight}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {flipped && (
                  <div className="action-buttons">
                    <button className="btn-review" onClick={()=>handleAnswer(false)}>{t.btnReview}</button>
                    <button className="btn-known"  onClick={()=>handleAnswer(true)}>{t.btnKnew}</button>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {mode === "manage" && (
          <>
            <div className="section">
              <div className="section-title">{t.addTitle} · {deckInfo?.flag} {langName}</div>
              <div className="add-form">
                <div className="form-row">
                  <div className="fg"><label className="fl">{t.hanzi}</label>
                    <input className="fi zh" placeholder="你好" value={form.chinese} onChange={e=>setForm(f=>({...f,chinese:e.target.value}))} /></div>
                  <div className="fg"><label className="fl">{t.pinyin}</label>
                    <input className="fi" placeholder="nǐ hǎo" value={form.pinyin} onChange={e=>setForm(f=>({...f,pinyin:e.target.value}))} /></div>
                </div>
                <div className="form-row">
                  <div className="fg" style={{flex:2}}><label className="fl">{t.langField(activeDeck)}</label>
                    <input className="fi" placeholder={deckInfo?.placeholder} value={form.translation} onChange={e=>setForm(f=>({...f,translation:e.target.value}))} /></div>
                  <div className="fg" style={{flex:1}}><label className="fl">{t.lvl}</label>
                    <select className="fi" value={form.level} onChange={e=>setForm(f=>({...f,level:e.target.value}))}>
                      {ALL_LEVELS.map(l=><option key={l} value={l}>{l}</option>)}
                    </select></div>
                </div>
                <div className="fg"><label className="fl">{t.notes}</label>
                  <input className="fi" placeholder="…" value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} onKeyDown={e=>e.key==="Enter"&&addCard()} /></div>
                <button className="btn-add" onClick={addCard} disabled={!form.chinese.trim()||!form.translation.trim()}>{t.addBtn}</button>
              </div>
            </div>

            <div className="section">
              <div className="section-title">{t.cardsTitle} · {deckCards.length}</div>
              <div className="mf-row">
                <button className={`mf-btn${manageFilter==="all"?" on":""}`} data-l="all" onClick={()=>setManageFilter("all")}>{t.allFilter} ({deckCards.length})</button>
                {availLevels.map(l=>(
                  <button key={l} className={`mf-btn${manageFilter===l?" on":""}`} data-l={l} onClick={()=>setManageFilter(l)}>{l} ({levelCount[l]})</button>
                ))}
              </div>
              {managedCards.length === 0 ? (
                <div className="empty" style={{minHeight:"80px",padding:"16px"}}><div className="empty-text" style={{fontSize:".9rem"}}>{t.noCards}</div></div>
              ) : (
                <div className="cards-list">
                  {managedCards.map(card => {
                    const st = getCardStatus(card.id, stats);
                    return (
                      <div key={card.id} className="card-item">
                        <div className="ci-zh">{card.chinese}</div>
                        <div className="ci-sep" />
                        <div className="ci-body">
                          <div className="ci-trans">{card.translation}</div>
                          {card.pinyin && <div className="ci-pin">{card.pinyin}</div>}
                        </div>
                        <div className="ci-tags">
                          <span className={`status-badge ${st}`}>{statusLabel[st]}</span>
                          <span className="lvl-badge" data-l={card.level||"A1"}>{card.level||"A1"}</span>
                        </div>
                        <button className="btn-del" onClick={()=>deleteCard(card.id)}>✕</button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}
