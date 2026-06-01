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
const VERSION = "1.6.0";
const DECKS = [
  { id:"de-zh", flag:"🇩🇪", placeholder:"Hallo",  defaultLevels:["B1","B2","自学"] },
  { id:"es-zh", flag:"🇪🇸", placeholder:"Hola",   defaultLevels:["A1","A2","自学"], hidden:true },
];
const ALL_LEVELS = ["A1","A2","B1","B2","自学"];
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
// re-tagged cards (e.g. moved to "自学") update for existing users too.
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
    { id:"d-zx-001",level:"自学",chinese:"动物收容所",         pinyin:"",translation:"das Tierheim",                            notes:"" },
    { id:"d-zx-002",level:"自学",chinese:"调查",               pinyin:"",translation:"die Umfrage",                              notes:"" },
    { id:"d-zx-003",level:"自学",chinese:"进行/开展",           pinyin:"",translation:"durchführen",                              notes:"" },
    { id:"d-zx-004",level:"自学",chinese:"动物交付",           pinyin:"",translation:"die Abgabe von Tieren",                    notes:"" },
    { id:"d-zx-005",level:"自学",chinese:"动物保护协会",       pinyin:"",translation:"der Tierschutzverein",                     notes:"" },
    { id:"d-zx-006",level:"自学",chinese:"赠送",               pinyin:"",translation:"verschenken",                              notes:"" },
    { id:"d-zx-007",level:"自学",chinese:"讨论",               pinyin:"",translation:"besprechen",                               notes:"" },
    { id:"d-zx-008",level:"自学",chinese:"澄清，讲清楚",       pinyin:"",translation:"klären",                                   notes:"" },
    { id:"d-zx-009",level:"自学",chinese:"兑现",               pinyin:"",translation:"einlösen",                                 notes:"" },
    { id:"d-zx-010",level:"自学",chinese:"购买/领养",           pinyin:"",translation:"die Anschaffung",                          notes:"" },
    { id:"d-zx-011",level:"自学",chinese:"邮政站",             pinyin:"",translation:"die Poststation",                          notes:"" },
    { id:"d-zx-012",level:"自学",chinese:"运送",               pinyin:"",translation:"befördern",                                notes:"" },
    { id:"d-zx-013",level:"自学",chinese:"邮政马车",           pinyin:"",translation:"die Postkutsche",                          notes:"" },
    { id:"d-zx-014",level:"自学",chinese:"垄断",               pinyin:"",translation:"das Monopol",                              notes:"" },
    { id:"d-zx-015",level:"自学",chinese:"长途交通",           pinyin:"",translation:"der Langstreckenverkehr",                  notes:"" },
    { id:"d-zx-016",level:"自学",chinese:"竞争对手",           pinyin:"",translation:"die Konkurrenz",                           notes:"" },
    { id:"d-zx-017",level:"自学",chinese:"邮局",               pinyin:"",translation:"das Postamt",                              notes:"" },
    { id:"d-zx-018",level:"自学",chinese:"邮票",               pinyin:"",translation:"die Briefmarke",                           notes:"" },
    { id:"d-zx-019",level:"自学",chinese:"车票",               pinyin:"",translation:"der Fahrschein",                           notes:"" },
    { id:"d-zx-020",level:"自学",chinese:"长途线路网",         pinyin:"",translation:"das Fernstreckennetz",                     notes:"" },
    { id:"d-zx-021",level:"自学",chinese:"长途线路",           pinyin:"",translation:"die Fernlinie",                            notes:"" },
    { id:"d-zx-022",level:"自学",chinese:"继承",               pinyin:"",translation:"erben",                                    notes:"" },
    { id:"d-zx-023",level:"自学",chinese:"让人翻修",           pinyin:"",translation:"renovieren lassen",                        notes:"" },
    { id:"d-zx-024",level:"自学",chinese:"办公室",             pinyin:"",translation:"der Büroraum",                             notes:"" },
    { id:"d-zx-025",level:"自学",chinese:"现代医学",           pinyin:"",translation:"die Schulmedizin",                         notes:"" },
    { id:"d-zx-026",level:"自学",chinese:"传播",               pinyin:"",translation:"verbreiten",                               notes:"" },
    { id:"d-zx-027",level:"自学",chinese:"传统的",             pinyin:"",translation:"herkömmlich",                              notes:"" },
    { id:"d-zx-028",level:"自学",chinese:"轻信",               pinyin:"",translation:"die Leichtgläubigkeit",                    notes:"" },
    { id:"d-zx-029",level:"自学",chinese:"护士",               pinyin:"",translation:"die Krankenschwester",                     notes:"" },
    { id:"d-zx-030",level:"自学",chinese:"怀疑者",             pinyin:"",translation:"der Zweifler",                             notes:"" },
    { id:"d-zx-031",level:"自学",chinese:"坚定支持的",         pinyin:"",translation:"überzeugt",                                notes:"" },
    { id:"d-zx-032",level:"自学",chinese:"铁轨区域",           pinyin:"",translation:"die Gleisanlage",                          notes:"" },
    { id:"d-zx-033",level:"自学",chinese:"严禁",               pinyin:"",translation:"streng verboten",                          notes:"" },
    { id:"d-zx-034",level:"自学",chinese:"损失",               pinyin:"",translation:"der Schaden",                              notes:"" },
    { id:"d-zx-035",level:"自学",chinese:"导致",               pinyin:"",translation:"verursachen",                              notes:"" },
    { id:"d-zx-036",level:"自学",chinese:"闯入",               pinyin:"",translation:"in etwas eindringen",                      notes:"" },
    { id:"d-zx-037",level:"自学",chinese:"规定日期",           pinyin:"",translation:"der Stichtag",                             notes:"" },
    { id:"d-zx-038",level:"自学",chinese:"长期持续影响",       pinyin:"",translation:"nachhaltig beeinträchtigen",                notes:"" },
    { id:"d-zx-039",level:"自学",chinese:"热爱、激情",         pinyin:"",translation:"die Leidenschaft",                         notes:"" },
    { id:"d-zx-040",level:"自学",chinese:"创造力",             pinyin:"",translation:"die Kreativität",                          notes:"" },
    { id:"d-zx-041",level:"自学",chinese:"讽刺",               pinyin:"",translation:"der Sarkasmus",                            notes:"" },
    { id:"d-zx-042",level:"自学",chinese:"经验法则",           pinyin:"",translation:"die Faustregel",                           notes:"" },
    { id:"d-zx-043",level:"自学",chinese:"结构、分段",         pinyin:"",translation:"die Gliederung",                           notes:"" },
    { id:"d-zx-044",level:"自学",chinese:"传达",               pinyin:"",translation:"mitteilen",                                notes:"" },
    { id:"d-zx-045",level:"自学",chinese:"发布",               pinyin:"",translation:"posten",                                   notes:"" },
    { id:"d-zx-046",level:"自学",chinese:"宫殿",               pinyin:"",translation:"der Palast",                               notes:"" },
    { id:"d-zx-047",level:"自学",chinese:"过满的、拥挤的",     pinyin:"",translation:"überfüllt",                                notes:"" },
    { id:"d-zx-048",level:"自学",chinese:"户型图、平面图",     pinyin:"",translation:"der Grundriss",                            notes:"" },
    { id:"d-zx-049",level:"自学",chinese:"创立、设立",         pinyin:"",translation:"ins Leben rufen",                          notes:"" },
    { id:"d-zx-050",level:"自学",chinese:"实现、落实",         pinyin:"",translation:"umsetzen",                                 notes:"" },
    { id:"d-zx-051",level:"自学",chinese:"车厢",               pinyin:"",translation:"der Waggon",                               notes:"" },
    { id:"d-zx-052",level:"自学",chinese:"火车头",             pinyin:"",translation:"die Lokomotive",                           notes:"" },
    { id:"d-zx-053",level:"自学",chinese:"进入",               pinyin:"",translation:"betreten",                                 notes:"" },
    { id:"d-zx-054",level:"自学",chinese:"脏污",               pinyin:"",translation:"der Schmutz",                              notes:"" },
    { id:"d-zx-055",level:"自学",chinese:"总之",               pinyin:"",translation:"jedenfalls",                               notes:"" },
    { id:"d-zx-056",level:"自学",chinese:"单亲父母",           pinyin:"",translation:"Alleinerziehende(r)",                      notes:"" },
    { id:"d-zx-057",level:"自学",chinese:"赛车",               pinyin:"",translation:"der Rennwagen",                            notes:"" },
    { id:"d-zx-058",level:"自学",chinese:"训练赛道",           pinyin:"",translation:"die Trainingsstrecke",                     notes:"" },
    { id:"d-zx-059",level:"自学",chinese:"错误决定",           pinyin:"",translation:"die Fehlentscheidung",                     notes:"" },
    { id:"d-zx-060",level:"自学",chinese:"时间损失",           pinyin:"",translation:"der Zeitverlust",                          notes:"" },
    { id:"d-zx-061",level:"自学",chinese:"过度管制欲",         pinyin:"",translation:"die Regulierungswut",                      notes:"" },
    { id:"d-zx-062",level:"自学",chinese:"规章制度",           pinyin:"",translation:"die Hausordnung",                          notes:"" },
    { id:"d-zx-063",level:"自学",chinese:"证件",               pinyin:"",translation:"der Ausweis",                              notes:"" },
    { id:"d-zx-064",level:"自学",chinese:"补办证件",           pinyin:"",translation:"der Ersatzausweis",                        notes:"" },
    { id:"d-zx-065",level:"自学",chinese:"记住",               pinyin:"",translation:"sich etwas merken",                        notes:"" },
    { id:"d-zx-066",level:"自学",chinese:"书店",               pinyin:"",translation:"die Buchhandlung",                         notes:"" },
    { id:"d-zx-067",level:"自学",chinese:"语言天赋",           pinyin:"",translation:"das Sprachtalent",                         notes:"" },
    { id:"d-zx-068",level:"自学",chinese:"乡村公路",           pinyin:"",translation:"die Landstraße",                           notes:"" },
    { id:"d-zx-069",level:"自学",chinese:"换时间（夏令时）",   pinyin:"",translation:"die Zeitumstellung",                       notes:"" },
    { id:"d-zx-070",level:"自学",chinese:"以……为口号举行",     pinyin:"",translation:"unter dem Motto … stattfinden",            notes:"" },
    { id:"d-zx-071",level:"自学",chinese:"众所周知……",         pinyin:"",translation:"es ist bekannt, dass …",                   notes:"" },
    { id:"d-zx-072",level:"自学",chinese:"应该被好好考虑",     pinyin:"",translation:"gut überlegt werden",                      notes:"" },
    { id:"d-zx-073",level:"自学",chinese:"兑现承诺",           pinyin:"",translation:"ein Versprechen einlösen",                  notes:"" },
    { id:"d-zx-074",level:"自学",chinese:"不仅……而且……",       pinyin:"",translation:"nicht nur …, sondern auch …",              notes:"" },
    { id:"d-zx-075",level:"自学",chinese:"给某人机会",         pinyin:"",translation:"jemandem eine Chance geben",                notes:"" },
    { id:"d-zx-076",level:"自学",chinese:"对某事负责",         pinyin:"",translation:"etwas zu vertreten haben",                  notes:"" },
    { id:"d-zx-077",level:"自学",chinese:"给某人提供某物",     pinyin:"",translation:"jemandem etwas zur Verfügung stellen",      notes:"" },
    { id:"d-zx-078",level:"自学",chinese:"绝对不行",           pinyin:"",translation:"auf keinen Fall",                          notes:"" },
    { id:"d-zx-079",level:"自学",chinese:"处理/对待某物",       pinyin:"",translation:"mit etwas umgehen",                        notes:"" },
    { id:"d-zx-080",level:"自学",chinese:"为了不要变得太……",   pinyin:"",translation:"damit es nicht zu … wird",                 notes:"" },
    { id:"d-zx-081",level:"自学",chinese:"节制使用……",         pinyin:"",translation:"sparsam umgehen mit + Dativ",               notes:"" },
    { id:"d-zx-082",level:"自学",chinese:"给某事提供合适的环境",pinyin:"",translation:"etwas den passenden Rahmen geben",         notes:"" },
    { id:"d-zx-083",level:"自学",chinese:"不论……还是……",       pinyin:"",translation:"ob … oder …",                             notes:"" },
    { id:"d-zx-084",level:"自学",chinese:"给……带来新气象",     pinyin:"",translation:"frischen Wind in etwas bringen",            notes:"" },
    { id:"d-zx-085",level:"自学",chinese:"这不能说明……",       pinyin:"",translation:"Das sagt nichts über … aus.",               notes:"" },
    { id:"d-zx-086",level:"自学",chinese:"这太过分了",         pinyin:"",translation:"Das geht zu weit.",                         notes:"" },
    { id:"d-zx-087",level:"自学",chinese:"专注于……",           pinyin:"",translation:"sich auf etwas konzentrieren",              notes:"" },
    { id:"d-zx-088",level:"自学",chinese:"对……感到惊讶",       pinyin:"",translation:"sich über etwas wundern",                  notes:"" },
    { id:"d-zx-089",level:"自学",chinese:"认为某事合理",       pinyin:"",translation:"etwas für legitim halten",                  notes:"" },
    { id:"d-zx-090",level:"自学",chinese:"应付某人",           pinyin:"",translation:"mit jemandem fertig werden",                notes:"" },
    { id:"d-zx-091",level:"自学",chinese:"认为某人有某种能力", pinyin:"",translation:"jemandem etwas zutrauen",                   notes:"" },
    { id:"d-zx-092",level:"自学",chinese:"被认为是对……有效的方法",pinyin:"",translation:"als Mittel gegen … gelten",             notes:"" },
    { id:"d-zx-093",level:"自学",chinese:"达成目标",           pinyin:"",translation:"am Ziel sein",                             notes:"" },
    { id:"d-zx-094",level:"自学",chinese:"带某人参观",         pinyin:"",translation:"jemanden durch + A führen",                 notes:"" },
    { id:"d-zx-095",level:"自学",chinese:"负责某人",           pinyin:"",translation:"für jemanden zuständig sein",               notes:"" },
    { id:"d-zx-096",level:"自学",chinese:"问某人很多问题",     pinyin:"",translation:"jemandem Löcher in den Bauch fragen",       notes:"" },
    { id:"d-zx-097",level:"自学",chinese:"对抗、应对某事",     pinyin:"",translation:"gegen etwas vorgehen",                     notes:"" },
    { id:"d-zx-098",level:"自学",chinese:"让某人认识到……",     pinyin:"",translation:"jemandem die Augen öffnen für + A",        notes:"" },
    { id:"d-zx-099",level:"自学",chinese:"说到重点",           pinyin:"",translation:"auf den Punkt bringen",                    notes:"" },
    { id:"d-zx-100",level:"自学",chinese:"简明扼要",           pinyin:"",translation:"sich kurz fassen",                         notes:"" },
    { id:"d-zx-101",level:"自学",chinese:"处于重点位置",       pinyin:"",translation:"im Vordergrund stehen",                    notes:"" },
    { id:"d-zx-102",level:"自学",chinese:"让……负责",           pinyin:"",translation:"verantwortlich machen für + A",            notes:"" },
    { id:"d-zx-103",level:"自学",chinese:"构成一种选择",       pinyin:"",translation:"eine Alternative darstellen",               notes:"" },
    { id:"d-zx-104",level:"自学",chinese:"竞争从不停歇",       pinyin:"",translation:"Die Konkurrenz schläft nicht.",             notes:"" },
    { id:"d-zx-105",level:"自学",chinese:"优先于……",           pinyin:"",translation:"Vorrang haben vor + D",                    notes:"" },
    { id:"d-zx-106",level:"自学",chinese:"体力劳动",             pinyin:"",translation:"körperliche Arbeit",                       notes:"" },
    { id:"d-zx-107",level:"自学",chinese:"维修车间",             pinyin:"",translation:"die Werkstatt",                             notes:"" },
    { id:"d-zx-108",level:"自学",chinese:"邮件主题",             pinyin:"",translation:"der Betreff",                               notes:"" },
    { id:"d-zx-109",level:"自学",chinese:"仓库工人",             pinyin:"",translation:"Lagerarbeiter/in",                          notes:"" },
    { id:"d-zx-110",level:"自学",chinese:"驾照",                 pinyin:"",translation:"der Führerschein",                          notes:"" },
    { id:"d-zx-111",level:"自学",chinese:"账目结算",             pinyin:"",translation:"die Abrechnung",                            notes:"" },
    { id:"d-zx-112",level:"自学",chinese:"车道",                 pinyin:"",translation:"die Spur",                                  notes:"" },
    { id:"d-zx-113",level:"自学",chinese:"节省时间",             pinyin:"",translation:"Zeit sparen",                               notes:"" },
    { id:"d-zx-114",level:"自学",chinese:"发现/确认",             pinyin:"",translation:"feststellen",                               notes:"" },
    { id:"d-zx-115",level:"自学",chinese:"导致某事",             pinyin:"",translation:"zu etwas führen",                           notes:"" },
    { id:"d-zx-116",level:"自学",chinese:"如有丢失",             pinyin:"",translation:"im Verlustfall",                            notes:"" },
    { id:"d-zx-117",level:"自学",chinese:"户外",                 pinyin:"",translation:"im Freien",                                 notes:"" },
    { id:"d-zx-118",level:"自学",chinese:"不承担责任",           pinyin:"",translation:"keine Haftung übernehmen",                  notes:"" },
    { id:"d-zx-119",level:"自学",chinese:"迷宫",                 pinyin:"",translation:"das Labyrinth",                             notes:"" },
    { id:"d-zx-120",level:"自学",chinese:"指南针",               pinyin:"",translation:"der Kompass",                               notes:"" },
    { id:"d-zx-121",level:"自学",chinese:"会计/账务",             pinyin:"",translation:"die Buchhaltung",                           notes:"" },
    { id:"d-zx-122",level:"自学",chinese:"独栋住宅",             pinyin:"",translation:"das Einfamilienhaus",                       notes:"" },
    { id:"d-zx-123",level:"自学",chinese:"考虑到",               pinyin:"",translation:"berücksichtigen",                           notes:"" },
    { id:"d-zx-124",level:"自学",chinese:"毛绒玩具",             pinyin:"",translation:"das Stofftier",                             notes:"" },
    { id:"d-zx-125",level:"自学",chinese:"对某人来说某事很重要", pinyin:"",translation:"jemandem ist etwas wichtig",                 notes:"" },
    { id:"d-zx-126",level:"自学",chinese:"对技术感兴趣",         pinyin:"",translation:"technisch interessiert sein",                notes:"" },
    { id:"d-zx-127",level:"自学",chinese:"房产中介",             pinyin:"",translation:"das Maklerbüro",                            notes:"" },
    { id:"d-zx-128",level:"自学",chinese:"附加费用",             pinyin:"",translation:"die Nebenkosten",                           notes:"" },
    { id:"d-zx-129",level:"自学",chinese:"医疗护理",             pinyin:"",translation:"ärztliche Betreuung",                        notes:"" },
    { id:"d-zx-130",level:"自学",chinese:"替代疗法",             pinyin:"",translation:"alternative Heilmethoden",                  notes:"" },
    { id:"d-zx-131",level:"自学",chinese:"自然疗法",             pinyin:"",translation:"die Naturmedizin",                          notes:"" },
    { id:"d-zx-132",level:"自学",chinese:"草药",                 pinyin:"",translation:"das Kraut",                                 notes:"" },
    { id:"d-zx-133",level:"自学",chinese:"治疗功效",             pinyin:"",translation:"heilende Wirkung",                          notes:"" },
    { id:"d-zx-134",level:"自学",chinese:"止咳糖浆",             pinyin:"",translation:"der Hustensaft",                            notes:"" },
    { id:"d-zx-135",level:"自学",chinese:"值得认真对待的",       pinyin:"",translation:"ernst zu nehmend",                          notes:"" },
    { id:"d-zx-136",level:"自学",chinese:"有科学依据证明",       pinyin:"",translation:"wissenschaftlich begründen",                 notes:"" },
    { id:"d-zx-137",level:"自学",chinese:"安慰剂效应",           pinyin:"",translation:"der Placebo-Effekt",                        notes:"" },
    { id:"d-zx-138",level:"自学",chinese:"不靠谱",               pinyin:"",translation:"unseriös",                                  notes:"" },
    { id:"d-zx-139",level:"自学",chinese:"无能为力",             pinyin:"",translation:"machtlos",                                  notes:"" },
    { id:"d-zx-140",level:"自学",chinese:"自然疗法师",           pinyin:"",translation:"der Heilpraktiker",                         notes:"" },
    { id:"d-zx-141",level:"自学",chinese:"经过专业培训的",       pinyin:"",translation:"ausgebildet",                               notes:"" },
    { id:"d-zx-142",level:"自学",chinese:"充满热情",             pinyin:"",translation:"begeistert sein",                           notes:"" },
    { id:"d-zx-143",level:"自学",chinese:"信念/确信",             pinyin:"",translation:"die Überzeugung",                           notes:"" },
    { id:"d-zx-144",level:"自学",chinese:"拒绝接受某事",         pinyin:"",translation:"sich verschließen vor + D",                  notes:"" },
    { id:"d-zx-145",level:"自学",chinese:"半真半假",             pinyin:"",translation:"die Halbwahrheit",                          notes:"" },
    { id:"d-zx-146",level:"自学",chinese:"业余/不专业",           pinyin:"",translation:"dilettantisch",                             notes:"" },
    { id:"d-zx-147",level:"自学",chinese:"失败/不起作用",         pinyin:"",translation:"versagen",                                  notes:"" },
    { id:"d-zx-148",level:"自学",chinese:"医学进步",             pinyin:"",translation:"medizinische Fortschritte",                 notes:"" },
    { id:"d-zx-149",level:"自学",chinese:"轨道",                 pinyin:"",translation:"die Schiene",                               notes:"" },
    { id:"d-zx-150",level:"自学",chinese:"燃煤驱动的",           pinyin:"",translation:"kohlebetrieben",                            notes:"" },
    { id:"d-zx-151",level:"自学",chinese:"居住空间",             pinyin:"",translation:"der Wohnraum",                              notes:"" },
    { id:"d-zx-152",level:"自学",chinese:"厨房兼起居室",         pinyin:"",translation:"die Wohnküche",                             notes:"" },
    { id:"d-zx-153",level:"自学",chinese:"设计/布置",             pinyin:"",translation:"die Gestaltung",                            notes:"" },
    { id:"d-zx-154",level:"自学",chinese:"使和谐协调",           pinyin:"",translation:"harmonisieren",                             notes:"" },
    { id:"d-zx-155",level:"自学",chinese:"氛围",                 pinyin:"",translation:"die Atmosphäre",                            notes:"" },
    { id:"d-zx-156",level:"自学",chinese:"时机成熟了",           pinyin:"",translation:"es ist soweit",                             notes:"" },
    { id:"d-zx-157",level:"自学",chinese:"搬迁时",               pinyin:"",translation:"zum Einzug",                                notes:"" },
    { id:"d-zx-158",level:"自学",chinese:"偶然发现某物",         pinyin:"",translation:"auf etwas stoßen",                          notes:"" },
    { id:"d-zx-159",level:"自学",chinese:"为……创造条件",         pinyin:"",translation:"die Voraussetzung für + A schaffen",        notes:"" },
    { id:"d-zx-160",level:"自学",chinese:"为此存钱",             pinyin:"",translation:"darauf sparen",                             notes:"" },
    { id:"d-zx-161",level:"自学",chinese:"开阔视野",             pinyin:"",translation:"der weite Blick",                           notes:"" },
    { id:"d-zx-162",level:"自学",chinese:"在脑海中",             pinyin:"",translation:"im Geist",                                  notes:"" },
    { id:"d-zx-163",level:"自学",chinese:"宣传活动",             pinyin:"",translation:"die Kampagne",                              notes:"" },
    { id:"d-zx-164",level:"自学",chinese:"新闻稿",               pinyin:"",translation:"die Pressemitteilung",                      notes:"" },
    { id:"d-zx-165",level:"自学",chinese:"生活乐趣",             pinyin:"",translation:"die Lebensfreude",                          notes:"" },
    { id:"d-zx-166",level:"自学",chinese:"让某人了解某事",       pinyin:"",translation:"jemandem etwas näherbringen",                notes:"" },
    { id:"d-zx-167",level:"自学",chinese:"顶级厨艺",             pinyin:"",translation:"die Spitzenküche",                          notes:"" },
    { id:"d-zx-168",level:"自学",chinese:"受到良好照顾",         pinyin:"",translation:"gut aufgehoben sein",                       notes:"" },
    { id:"d-zx-169",level:"自学",chinese:"冒风险押上某事",       pinyin:"",translation:"etwas aufs Spiel setzen",                   notes:"" },
    { id:"d-zx-170",level:"自学",chinese:"疗法/治疗方式",         pinyin:"",translation:"die Therapieform",                          notes:"" },
    { id:"d-zx-171",level:"自学",chinese:"脱离现实",             pinyin:"",translation:"Realität verlieren",                        notes:"" },
    { id:"d-zx-172",level:"自学",chinese:"心理负担",             pinyin:"",translation:"psychische Belastung",                      notes:"" },
    { id:"d-zx-173",level:"自学",chinese:"富有创造力",           pinyin:"",translation:"erfinderisch",                              notes:"" },
    { id:"d-zx-174",level:"自学",chinese:"毫无顾虑地",           pinyin:"",translation:"ohne Bedenken",                             notes:"" },
    { id:"d-zx-175",level:"自学",chinese:"帮助某人获得某事",     pinyin:"",translation:"jemandem zu etwas verhelfen",                notes:"" },
    { id:"d-zx-176",level:"自学",chinese:"抵制某事",             pinyin:"",translation:"sich gegen etwas wehren",                   notes:"" },
    { id:"d-zx-177",level:"自学",chinese:"恰恰相反",             pinyin:"",translation:"ganz im Gegenteil",                         notes:"" },
    { id:"d-zx-178",level:"自学",chinese:"网络礼仪",             pinyin:"",translation:"die Netiquette",                            notes:"" },
    { id:"d-zx-179",level:"自学",chinese:"收件人",               pinyin:"",translation:"der Adressat",                              notes:"" },
    { id:"d-zx-180",level:"自学",chinese:"当面说",               pinyin:"",translation:"ins Gesicht sagen",                         notes:"" },
    { id:"d-zx-181",level:"自学",chinese:"忽视",                 pinyin:"",translation:"vernachlässigen",                           notes:"" },
    { id:"d-zx-182",level:"自学",chinese:"版式/外观",             pinyin:"",translation:"die Aufmachung",                            notes:"" },
    { id:"d-zx-183",level:"自学",chinese:"版面设计",             pinyin:"",translation:"das Layout",                                notes:"" },
    { id:"d-zx-184",level:"自学",chinese:"法律规定",             pinyin:"",translation:"die gesetzliche Regelung",                  notes:"" },
    { id:"d-zx-185",level:"自学",chinese:"摘录/节选",             pinyin:"",translation:"der Auszug",                                notes:"" },
    { id:"d-zx-186",level:"自学",chinese:"操作说明",             pinyin:"",translation:"die Anleitung",                             notes:"" },
    { id:"d-zx-187",level:"自学",chinese:"约定俗成",             pinyin:"",translation:"sich einbürgern",                           notes:"" },
    { id:"d-zx-188",level:"自学",chinese:"用'du'称呼某人",      pinyin:"",translation:"jemanden mit du anreden",                   notes:"" },
    { id:"d-zx-189",level:"自学",chinese:"关注读者群",           pinyin:"",translation:"auf die Leserschaft achten",                 notes:"" },
    { id:"d-zx-190",level:"自学",chinese:"与……保持联系",         pinyin:"",translation:"Kontakt haben mit + D",                     notes:"" },
    { id:"d-zx-191",level:"自学",chinese:"仔细审视某事",         pinyin:"",translation:"sich etwas genauer anschauen",               notes:"" },
    { id:"d-zx-192",level:"自学",chinese:"……已成惯例",           pinyin:"",translation:"Es hat sich eingebürgert, … zu …",          notes:"" },
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
  .app-ver{font-size:.55rem;letter-spacing:.08em;color:var(--border);margin-left:2px;align-self:flex-end;padding-bottom:1px}
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
  .lc[data-l="自学"]{border-color:var(--custom);color:var(--custom)} .lc[data-l="自学"].on{background:var(--custom)}
  .lvl-badge{display:inline-flex;align-items:center;justify-content:center;padding:1px 6px;border-radius:10px;font-size:.6rem;font-weight:500;letter-spacing:.06em;flex-shrink:0;color:#fff}
  .lvl-badge[data-l="A1"]{background:var(--a1)} .lvl-badge[data-l="A2"]{background:var(--a2)}
  .lvl-badge[data-l="B1"]{background:var(--b1)} .lvl-badge[data-l="B2"]{background:var(--b2)}
  .lvl-badge[data-l="自学"]{background:var(--custom)}
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
  .mf-btn[data-l="自学"]{border-color:var(--custom);color:var(--custom)} .mf-btn[data-l="自学"].on{background:var(--custom)}
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
  const [activeDeck, setActiveDeck] = useState("de-zh");
  const [mode, setMode]             = useState("study");
  const [selectedLevels, setSelectedLevels] = useState(["A1","A2"]);

  const [queue, setQueue]               = useState([]);
  const [idx, setIdx]                   = useState(0);
  const [flipped, setFlipped]           = useState(false);
  const [known, setKnown]               = useState(0);
  const [direction, setDirection]       = useState("lang-to-zh");
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
      // If the previously active deck is now hidden, fall back to the first visible deck
      const visibleDecks = DECKS.filter(d => !d.hidden);
      setActiveDeck(prev => visibleDecks.find(d => d.id === prev) ? prev : (visibleDecks[0]?.id ?? prev));
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
    <div className="card-chinese">{current?.chinese}</div>
  ) : ( <div className="card-translation">{current?.translation}</div> );

  const BackContent = () => direction === "zh-to-lang" ? (
    <> <div className="card-translation">{current?.translation}</div> {current?.notes && <div className="card-notes">{current.notes}</div>} </>
  ) : (
    <> <div className="card-chinese">{current?.chinese}</div> {current?.notes && <div className="card-notes">{current.notes}</div>} </>
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
            <span className="app-ver">v{VERSION}</span>
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
          {DECKS.filter(d => !d.hidden).map(d => (
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
