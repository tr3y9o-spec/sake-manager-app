import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Search, Calculator, Map, Wine, GlassWater, Camera, Upload, Loader, X, Utensils, Database, RefreshCw, Plus, Minus, BarChart3, Pencil, Trash2, Save, User, LogOut, Lightbulb, Sparkles, Fish, Beef, Calendar, AlertCircle, BookOpen, Thermometer, Droplets, Wheat, Sprout, FlaskConical, Leaf, Snowflake, Flame, Moon, Sun, Award } from 'lucide-react';
import { db, storage } from './firebase';
import { doc, setDoc, onSnapshot, collection, updateDoc, arrayUnion, addDoc, deleteDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

// ==========================================
// 1. Logic & Knowledge Base (知識の源泉)
// ==========================================

// ★ コラム（豆知識）マスターデータベース【優先度付き】
// priority: 3(特有/希少) > 2(分類/原料) > 1(傾向/飲み方) > 0(汎用)
const TRIVIA_MASTER_DB = [
  // ====================
  // 🍶 日本酒 (30件)
  // ====================
  // --- Lv.3 特有・マニアック（最優先） ---
  {
    id: 'rice_omachi',
    priority: 3,
    condition: (item) => item.type === 'Sake' && item.tags?.some(t => t.includes('雄町')),
    icon: <Sprout size={14}/>,
    title: 'オマチストを魅了する「雄町」',
    text: '栽培が難しく一度は幻となったお米。優等生な山田錦に対し、野性味あふれる複雑で太い旨味が特徴。「オマチスト」と呼ばれる熱狂的なファンを持ちます。'
  },
  {
    id: 'rice_aiyama',
    priority: 3,
    condition: (item) => item.type === 'Sake' && item.tags?.some(t => t.includes('愛山')),
    icon: <Award size={14}/>,
    title: '幻の酒米「愛山」',
    text: '「酒米のダイヤモンド」とも呼ばれる希少米。非常に溶けやすく、独特の濃厚な甘みと酸味を持つ、ジューシーで色気のあるお酒に仕上がります。'
  },
  {
    id: 'sake_yamahai',
    priority: 3,
    condition: (item) => item.type === 'Sake' && item.tags?.some(t => t.includes('山廃')),
    icon: <Database size={14}/>,
    title: '「山廃」のワイルドさ',
    text: '天然の乳酸菌を取り込んで発酵させる伝統製法。通常の倍の時間と手間がかかりますが、ヨーグルトのような酸と、腰の強い濃厚な旨味が生まれ、お燗で化けます。'
  },
  {
    id: 'sake_kimoto',
    priority: 3,
    condition: (item) => item.type === 'Sake' && item.tags?.some(t => t.includes('生酛')),
    icon: <Database size={14}/>,
    title: '原点回帰「生酛（きもと）」',
    text: '山廃のさらに原型となる、江戸時代の手法。米をすり潰す重労働を経て育てた強力な酵母は、複雑味がありながらも後切れの良い、力強いお酒を生みます。'
  },
  {
    id: 'sake_kijoshu',
    priority: 3,
    condition: (item) => item.type === 'Sake' && item.tags?.some(t => t.includes('貴醸酒')),
    icon: <Moon size={14}/>,
    title: 'お酒でお酒を仕込む？',
    text: '仕込み水の代わりに「日本酒」を使って仕込む贅沢なお酒。非常に濃厚で甘美な味わいになり、デザートワインのように食後酒として楽しむのがおすすめです。'
  },
  {
    id: 'sake_koshu',
    priority: 3,
    condition: (item) => item.type === 'Sake' && item.tags?.some(t => t.includes('古酒')),
    icon: <Calendar size={14}/>,
    title: '時が育てる「熟成古酒」',
    text: '日本酒もワイン同様、熟成します。数年寝かせることで色は琥珀色に、香りはナッツやドライフルーツのように変化し、中華料理やチーズとも渡り合える深みが生まれます。'
  },
  {
    id: 'sake_origarami',
    priority: 3,
    condition: (item) => item.type === 'Sake' && (item.tags?.some(t => t.includes('おりがらみ')) || item.tags?.some(t => t.includes('にごり'))),
    icon: <Droplets size={14}/>,
    title: '「おりがらみ」の愉しみ',
    text: '底に沈殿している白い「おり」は、米や酵母の細かい破片です。混ぜるとシルキーな口当たりと甘みがプラスされます。最初は上澄み、後半は混ぜて濃厚に。'
  },
  {
    id: 'sake_namazake',
    priority: 3,
    condition: (item) => item.type === 'Sake' && (item.tags?.some(t => t.includes('生酒')) || item.tags?.some(t => t.includes('新酒'))),
    icon: <Sparkles size={14}/>,
    title: '火入れなしのフレッシュ感',
    text: '通常は2回行う加熱殺菌（火入れ）を一切しない「すっぴん」のお酒。酵母が生み出した微炭酸（ガス感）や、青リンゴのようなフレッシュな香りがそのまま生きています。'
  },
  {
    id: 'sake_arabashiri',
    priority: 3,
    condition: (item) => item.type === 'Sake' && item.tags?.some(t => t.includes('荒走り')),
    icon: <GlassWater size={14}/>,
    title: '搾り始めの「荒走り」',
    text: 'お酒を搾る際、圧力をかけずに自然に出てくる最初の部分。少し薄にごりで、炭酸ガスを含んだ荒々しくフレッシュな香りが特徴です。'
  },
  {
    id: 'sake_nakadori',
    priority: 3,
    condition: (item) => item.type === 'Sake' && item.tags?.some(t => t.includes('中取り')),
    icon: <Award size={14}/>,
    title: '一番いい場所「中取り」',
    text: '搾りの中盤、最も香味のバランスが良く、雑味のない綺麗な部分。「中汲み」とも呼ばれ、鑑評会の出品酒にも使われる最高品質の部位です。'
  },
  {
    id: 'sake_seme',
    priority: 3,
    condition: (item) => item.type === 'Sake' && item.tags?.some(t => t.includes('責め')),
    icon: <Database size={14}/>,
    title: '通好みの「責め」',
    text: '搾りの最後、圧力をかけて搾り切った部分。雑味も出ますが、その分エキス分が濃く、パンチのある味わいに。通はこの複雑味を好みます。'
  },

  // --- Lv.2 分類・主要原料 ---
  {
    id: 'sake_daiginjo',
    priority: 2,
    condition: (item) => item.type === 'Sake' && (item.tags?.some(t => t.includes('大吟醸')) || item.category_rank.includes('Matsu')),
    icon: <Sparkles size={14}/>,
    title: '大吟醸の「50%」の意味',
    text: 'お米を半分以上削り、中心のデンプン質だけを贅沢に使います。雑味の元になる外側を削ぎ落とし、低温で発酵させることで、果実のような華やかな香りが生まれます。'
  },
  {
    id: 'sake_junmai',
    priority: 2,
    condition: (item) => item.type === 'Sake' && item.tags?.some(t => t.includes('純米')),
    icon: <Wheat size={14}/>,
    title: '「純米」はお米のジュース',
    text: '醸造アルコールを一切添加せず、お米と水と麹だけで造ったお酒です。炊き立てのご飯のような穀物の香りや、お米本来のふくよかな旨味をダイレクトに感じられます。'
  },
  {
    id: 'rice_yamada',
    priority: 2,
    condition: (item) => item.type === 'Sake' && item.tags?.some(t => t.includes('山田錦')),
    icon: <Sprout size={14}/>,
    title: '酒米の王様「山田錦」',
    text: '粒が大きく心白（中心のデンプン）が大きいため、綺麗で雑味のない、品格のある味わいに仕上がります。「迷ったら山田錦」と言われるほどの王道です。'
  },
  {
    id: 'rice_gohyakumangoku',
    priority: 2,
    condition: (item) => item.type === 'Sake' && item.tags?.some(t => t.includes('五百万石')),
    icon: <Sprout size={14}/>,
    title: 'スッキリ淡麗「五百万石」',
    text: '新潟県を中心に栽培される、淡麗辛口の代名詞的なお米。スッキリと軽快で、食事の邪魔をしない綺麗なお酒になりやすいのが特徴です。'
  },
  {
    id: 'rice_miyama',
    priority: 2,
    condition: (item) => item.type === 'Sake' && item.tags?.some(t => t.includes('美山錦')),
    icon: <Sprout size={14}/>,
    title: '冷涼な地の「美山錦」',
    text: '長野県で生まれた寒冷地に強いお米。五百万石に近いスッキリ系ですが、より硬質でキリッとした独特の渋みや酸味があり、通好みの食中酒になります。'
  },
  {
    id: 'sake_aki',
    priority: 2,
    condition: (item) => item.type === 'Sake' && item.tags?.some(t => t.includes('ひやおろし')),
    icon: <Leaf size={14}/>,
    title: '秋の風物詩「ひやおろし」',
    text: '春に搾ったお酒を一度火入れし、夏の間蔵で寝かせ、秋にそのまま詰めたお酒。夏を超えて熟成が進み、角が取れてまろやかになった「秋あがり」の味わいです。'
  },

  // --- Lv.1 傾向・飲み方・製法（細部） ---
  {
    id: 'sake_honjozo',
    priority: 1,
    condition: (item) => item.type === 'Sake' && item.tags?.some(t => t.includes('本醸造')),
    icon: <FlaskConical size={14}/>,
    title: '「アル添」は技術の証',
    text: '醸造アルコールの添加は、香り成分を引き出し、後味を軽快にする伝統技術です。本醸造はキレが良く飲み飽きしないため、実は晩酌の最強のパートナーと言われます。'
  },
  {
    id: 'sake_genshu',
    priority: 1,
    condition: (item) => item.type === 'Sake' && item.tags?.some(t => t.includes('原酒')),
    icon: <Droplets size={14}/>,
    title: '「原酒」＝ロック推奨？',
    text: '加水調整をしていない搾ったままのお酒。アルコール度数が高く濃厚なため、氷を浮かべて「オンザロック」にすると、溶けゆく味わいの変化を楽しめます。'
  },
  {
    id: 'water_hard',
    priority: 1,
    condition: (item) => item.type === 'Sake' && (item.tags?.some(t => t.includes('灘')) || item.axisX > 65),
    icon: <Droplets size={14}/>,
    title: '硬水が生む「男酒」',
    text: 'ミネラル豊富な「硬水」で仕込むと、酵母が活発になり発酵が力強く進みます。その結果、酸が効いたキリッと辛口の、いわゆる「男酒（灘の酒など）」になります。'
  },
  {
    id: 'water_soft',
    priority: 1,
    condition: (item) => item.type === 'Sake' && (item.tags?.some(t => t.includes('伏見')) || (item.axisX < 40 && item.axisY > 40)),
    icon: <Droplets size={14}/>,
    title: '軟水が生む「女酒」',
    text: 'ミネラルの少ない「軟水」で仕込むと、発酵が穏やかに進みます。結果、きめ細やかで口当たりの柔らかい、優しい「女酒（京都伏見の酒など）」に仕上がります。'
  },
  {
    id: 'sake_karakuchi',
    priority: 1,
    condition: (item) => item.type === 'Sake' && item.axisX > 65,
    icon: <Wine size={14}/>,
    title: '日本酒度「＋」は辛口',
    text: '「日本酒度」は糖分の少なさを示す数値。プラスが高いほど糖分が少なく、キレのある辛口になります。食事の脂を流す「ウォッシュ効果」が高いのが特徴です。'
  },
  {
    id: 'sake_acid',
    priority: 1,
    condition: (item) => item.type === 'Sake' && (item.tags?.some(t => t.includes('酸')) || (item.axisX < 40 && item.axisY < 40)),
    icon: <FlaskConical size={14}/>,
    title: '日本酒の「酸」は旨味の輪郭',
    text: '日本酒の酸度は、単に酸っぱいだけでなく、味の輪郭を引き締め「キレ」を生みます。酸が高いお酒は白ワインのように、油を使った料理や肉料理とよく合います。'
  },
  {
    id: 'sake_pair_cheese',
    priority: 1,
    condition: (item) => item.type === 'Sake' && (item.tags?.some(t => t.includes('山廃')) || item.axisX < 30),
    icon: <Utensils size={14}/>,
    title: '発酵×発酵＝最強',
    text: '旨味の強い日本酒（山廃や熟成酒）は、同じ発酵食品である「チーズ」と相性抜群。ブルーチーズや味噌漬けチーズと一緒に飲むと、口の中で旨味が爆発します。'
  },
  {
    id: 'sake_pair_soba',
    priority: 1,
    condition: (item) => item.type === 'Sake' && item.axisX > 55 && item.axisY < 55,
    icon: <Utensils size={14}/>,
    title: '「蕎麦前」の粋',
    text: '蕎麦の繊細な香りを邪魔しない、スッキリとした辛口酒は「蕎麦屋酒」の王道。わさび、焼き海苔、出汁巻き卵をつまみに、ちびちびやるのが粋です。'
  },
  {
    id: 'sake_vessel',
    priority: 1,
    condition: (item) => item.type === 'Sake' && item.axisY > 60,
    icon: <GlassWater size={14}/>,
    title: 'ワイングラスの魔法',
    text: '香り高い吟醸系は、口の広いワイングラスで飲むと香りが内側にこもってより華やかに感じられます。逆にお猪口だとスッキリした味に。器で味は変わります。'
  },
  {
    id: 'sake_kan_nuru',
    priority: 1,
    condition: (item) => item.type === 'Sake' && item.axisX < 50 && item.axisY < 45,
    icon: <Thermometer size={14}/>,
    title: '魔法の温度「ぬる燗」',
    text: '「人肌（35℃）」〜「ぬる燗（40℃）」に温めると、お米の甘みと旨味がふわっと開き、冷酒とは別人のような優しさを見せます。寒い日だけでなく、胃を休めたい時にも最適。'
  },
  {
    id: 'sake_kan_atsu',
    priority: 1,
    condition: (item) => item.type === 'Sake' && (item.tags?.some(t => t.includes('本醸造')) || (item.axisX > 60 && item.axisY < 40)),
    icon: <Flame size={14}/>,
    title: 'キレ味鋭い「熱燗」',
    text: '50℃前後の「熱燗」にすると、香りはシャープになり、アルコールの刺激で辛さが引き立ちます。脂っこい料理の脂をスパッと切るには熱燗が一番です。'
  },
  {
    id: 'sake_amino',
    priority: 1,
    condition: (item) => item.type === 'Sake' && item.axisX < 30,
    icon: <Database size={14}/>,
    title: 'アミノ酸は「コク」の正体',
    text: '日本酒のアミノ酸度は「旨味・コク」の指標です。多いと濃厚で複雑な味に、少ないとスッキリ淡麗に。このお酒はアミノ酸が豊富で、飲みごたえ抜群です。'
  },
  {
    id: 'sake_label',
    priority: 1,
    condition: (item) => item.type === 'Sake' && item.tags?.some(t => t.includes('BY')),
    icon: <Calendar size={14}/>,
    title: '「BY」って何？',
    text: 'Brewery Year（酒造年度）の略。7月1日から翌年6月30日までを1年とします。「R5BY」なら令和5年の秋〜冬に造られたお酒という意味です。'
  },

  // ====================
  // 🥔 焼酎 (15件)
  // ====================
  // --- Lv.3 特有（最優先） ---
  {
    id: 'shochu_kokuto',
    priority: 3,
    condition: (item) => item.type === 'Shochu' && item.tags?.some(t => t.includes('黒糖')),
    icon: <Sun size={14}/>,
    title: '黒糖焼酎は「奄美」だけ',
    text: '黒糖を原料に出来るのは、法律で奄美群島の蔵元だけと決まっています。ラム酒と同じ原料ですが、米麹を使うため食事に合うスッキリした甘い香りが特徴です。'
  },
  {
    id: 'shochu_soba',
    priority: 3,
    condition: (item) => item.type === 'Shochu' && item.tags?.some(t => t.includes('そば')),
    icon: <Leaf size={14}/>,
    title: 'そば焼酎と「そば湯」',
    text: 'そば独特の清涼感と香ばしさがある焼酎。これをお湯ではなく「そば湯」で割ると、とろみと風味が増して絶品です。発祥の地、宮崎県の定番スタイルです。'
  },
  {
    id: 'shochu_maewari',
    priority: 3,
    condition: (item) => item.type === 'Shochu' && item.category_rank === 'Shochu_Imo',
    icon: <Droplets size={14}/>,
    title: '究極のまろやかさ「前割り」',
    text: '飲む数日前から焼酎と水を好みの割合で割って寝かせておく方法。水とアルコールが分子レベルで馴染み、カドが取れて驚くほど口当たりが優しくなります。'
  },
  {
    id: 'shochu_partial',
    priority: 3,
    condition: (item) => item.type === 'Shochu' && (item.tags?.some(t => t.includes('原酒')) || item.tags?.some(t => t.includes('40度'))),
    icon: <Snowflake size={14}/>,
    title: 'とろり濃厚「パーシャルショット」',
    text: '度数の高い原酒を瓶ごと冷凍庫へ。アルコールのおかげで凍らず、とろりとしたシロップ状になります。濃厚な味と冷たさが同時に押し寄せる大人の楽しみ方です。'
  },

  // --- Lv.2 原料・主要ジャンル ---
  {
    id: 'shochu_imo_aroma',
    priority: 2,
    condition: (item) => item.category_rank === 'Shochu_Imo',
    icon: <Sparkles size={14}/>,
    title: '芋の香りは「花」と同じ',
    text: '芋焼酎の香り成分（モノテルペンアルコール）は、実はマスカットやバラの香り成分と同じ仲間。「芋臭い」ではなく「フルーティ」と感じるのは科学的に正しいのです。'
  },
  {
    id: 'shochu_mugi_choco',
    priority: 2,
    condition: (item) => item.category_rank === 'Shochu_Mugi',
    icon: <Utensils size={14}/>,
    title: '麦焼酎とチョコの関係',
    text: '大麦を原料とする麦焼酎の香ばしさは、焙煎したカカオやナッツと驚くほど合います。食後にビターチョコレートをかじりながら、麦焼酎のロックを流し込む。知る人ぞ知る大人のデザートタイムです。'
  },
  {
    id: 'shochu_rice_ginjo',
    priority: 2,
    condition: (item) => item.type === 'Shochu' && (item.tags?.some(t => t.includes('米')) || item.name.includes('米')),
    icon: <Wheat size={14}/>,
    title: '米焼酎は「和製ウォッカ」',
    text: '日本酒と同じ米が原料ですが、蒸留することで糖分が抜け、お米の甘い香りだけが純粋に抽出されます。そのクリアでスムースな飲み口は、まさに和製ウォッカやジンです。'
  },
  {
    id: 'shochu_koji_black',
    priority: 2,
    condition: (item) => item.type === 'Shochu' && item.tags?.some(t => t.includes('黒麹')),
    icon: <Database size={14}/>,
    title: 'どっしり「黒麹」',
    text: '沖縄の泡盛から伝わった菌。クエン酸を多く作り腐敗に強いだけでなく、味わいに「どっしりとしたコク」と「キレ」を与えます。飲みごたえ重視派に。'
  },
  {
    id: 'shochu_koji_white',
    priority: 2,
    condition: (item) => item.type === 'Shochu' && (item.category_rank === 'Shochu_Imo' && !item.tags?.some(t => t.includes('黒麹'))),
    icon: <Database size={14}/>,
    title: 'マイルド「白麹」',
    text: '黒麹から突然変異で生まれた菌。黒麹よりも優しく、マイルドで軽快な味わいに仕上がります。どんな料理にも合わせやすい優等生です。'
  },

  // --- Lv.1 飲み方・一般知識 ---
  {
    id: 'shochu_hot_order',
    priority: 1,
    condition: (item) => item.type === 'Shochu' && (item.category_rank === 'Shochu_Imo' || item.axisX < 50),
    icon: <Flame size={14}/>,
    title: 'お湯割りの黄金律「お湯が先」',
    text: 'お湯割りのコツは「グラスにお湯を先に入れる」こと。後から焼酎を注ぐと、対流で自然に混ざり、温度差で香りがふわっと立ち上がります。マドラー不要です。'
  },
  {
    id: 'shochu_soda',
    priority: 1,
    condition: (item) => item.type === 'Shochu' && (item.axisY < 50 || item.category_rank === 'Shochu_Mugi'),
    icon: <GlassWater size={14}/>,
    title: 'ソーダ割りが合う理由',
    text: '焼酎の香りは炭酸ガスと一緒に弾けることでより華やかに感じられます。特に麦焼酎や香り高い芋焼酎は、ハイボールにすることで食中酒としてのポテンシャルが最大化します。'
  },
  {
    id: 'shochu_rock',
    priority: 1,
    condition: (item) => item.type === 'Shochu' && item.axisX < 50,
    icon: <Database size={14}/>,
    title: 'ロックで味わう「時間」',
    text: 'ロックの醍醐味は、氷が溶けることによる「加水」の変化。最初はガツンと濃厚に、徐々に水と馴染んでまろやかに。一杯で二度も三度も美味しい飲み方です。'
  },
  {
    id: 'shochu_distill_atm',
    priority: 1,
    condition: (item) => item.type === 'Shochu' && !item.tags?.some(t => t.includes('減圧')),
    icon: <FlaskConical size={14}/>,
    title: '濃厚な「常圧蒸留」',
    text: '昔ながらの蒸留法。高い温度で沸騰させるため、原料の複雑な香りや雑味（個性）まで一緒に抽出されます。芋や麦の個性をガツンと感じたいなら常圧です。'
  },
  {
    id: 'shochu_distill_vac',
    priority: 1,
    condition: (item) => item.type === 'Shochu' && item.tags?.some(t => t.includes('減圧')),
    icon: <FlaskConical size={14}/>,
    title: 'クリアな「減圧蒸留」',
    text: '気圧を下げて低い温度（40-50℃）で沸騰させる方法。雑味が出にくく、華やかでクセのないクリアな味わいになります。焼酎初心者にもおすすめです。'
  },
  {
    id: 'shochu_health',
    priority: 1,
    condition: (item) => item.type === 'Shochu',
    icon: <Leaf size={14}/>,
    title: '実はヘルシー？「糖質ゼロ」',
    text: '焼酎は蒸留酒であるため、製造過程で糖分が残りません。「糖質ゼロ・プリン体ゼロ」。ダイエット中の方も心置きなく楽しめるお酒です。'
  },
  {
    id: 'shochu_dareyame',
    priority: 1,
    condition: (item) => item.type === 'Shochu', // 全焼酎
    icon: <Wine size={14}/>,
    title: '南九州の文化「だれやめ」',
    text: '「だれ（疲れ）」を「やめる（止める）」という意味で、晩酌のこと。1日の疲れを焼酎で洗い流し、明日への活力を養う。焼酎は生活のリセットボタンなのです。'
  },

  // ====================
  // 🌟 汎用 (5件)
  // ====================
  // --- Lv.0 最も一般的（他に出るものが少ない時に表示） ---
  {
    id: 'liqueur_base',
    priority: 3, // 果実酒にとっては重要なのでLv3
    condition: (item) => item.type === 'Liqueur',
    icon: <GlassWater size={14}/>,
    title: 'ベースのお酒で味が変わる',
    text: '果実酒は「何のお酒に漬けたか」が重要です。ホワイトリカーなら果実の香りがストレートに、日本酒ベースならまろやかに、ブランデーベースなら濃厚な仕上がりになります。'
  },
  {
    id: 'general_water',
    priority: 0,
    condition: (item) => true, // 全商品対象
    icon: <GlassWater size={14}/>,
    title: '和らぎ水（やわらぎみず）',
    text: 'お酒を飲む際は、同量の水を飲むのがマナーであり健康の秘訣。アルコール濃度を下げ、口の中をリセットし、次の一杯をより美味しく感じさせてくれます。'
  },
  {
    id: 'general_light',
    priority: 0,
    condition: (item) => true,
    icon: <Sun size={14}/>,
    title: 'お酒は「日光」が苦手',
    text: '日本酒や焼酎は紫外線に非常に弱く、日光に当たると数時間で「日光臭」という不快な臭いがつきます。茶色や緑の瓶が多いのは、光を遮断するためです。'
  },
  {
    id: 'general_air',
    priority: 0,
    condition: (item) => true,
    icon: <GlassWater size={14}/>,
    title: '開栓後の味の変化',
    text: 'お酒は空気に触れると酸化が進みます。日本酒なら味がまろやかに（または老ねる）、焼酎なら香りが開くことも。開けたてと数日後の味の違いを楽しむのも一興です。'
  },
  {
    id: 'general_store',
    priority: 0,
    condition: (item) => item.type === 'Sake',
    icon: <Thermometer size={14}/>,
    title: '冷蔵庫には「縦置き」で',
    text: 'お酒を保管する際、横にするとお酒が空気に触れる面積が増え、キャップの金属臭が移るリスクもあります。基本は冷蔵庫のドアポケットなどに「縦置き」が正解です。'
  },
  {
    id: 'general_date',
    priority: 0,
    condition: (item) => true,
    icon: <Calendar size={14} />,
    title: '製造年月≠賞味期限',
    text: 'お酒のラベルの日付は「瓶詰めした日」です。アルコール度数が高いため腐ることはありませんが、美味しく飲める目安はあります（生酒なら冷蔵で半年、火入れなら冷暗所で1年程度）。'
  }
];

// 商品ごとのコラム抽出ロジック（最大3つ、優先度順）
const getTriviaList = (item) => {
  // 条件に合うものを全て抽出
  const matches = TRIVIA_MASTER_DB.filter(trivia => trivia.condition(item));
  
  // ★優先度(priority)が高い順にソート
  matches.sort((a, b) => b.priority - a.priority);

  // 上位3つを返す
  return matches.slice(0, 3);
};

// ... (以下、getCurrentSeasonTheme、PROPOSAL_THEMES、analyzeHistory、getRankColor 等は変更なし) ...
const getCurrentSeasonTheme = () => {
  const month = new Date().getMonth() + 1;
  if (month >= 3 && month <= 5) {
    return { id: 'spring', label: '春・花見酒', icon: <Calendar size={14} />, color: 'bg-pink-100 text-pink-700 border-pink-200', filter: (item) => item.tags?.some(t => t.includes('花見') || t.includes('春')) || (item.axisX < 60 && item.axisY > 40), guide: (<><span className="font-bold block mb-1">🌸 アプローチ：春の陽気に合わせる</span>「苦味のある山菜などには、とげのない『優しい甘み』と『華やかな香り』を持つお酒（マップ右上）が相性抜群です」と提案しましょう。</>) };
  } else if (month >= 6 && month <= 8) {
    return { id: 'summer', label: '夏・涼み酒', icon: <Calendar size={14} />, color: 'bg-cyan-100 text-cyan-700 border-cyan-200', filter: (item) => item.tags?.some(t => t.includes('夏')) || (item.axisX > 70), guide: (<><span className="font-bold block mb-1">🎐 アプローチ：清涼感でリフレッシュ</span>「暑い日には、後味がスパッと切れる『超辛口』のお酒（マップ右端）が体に染み渡ります。よく冷やしてどうぞ」と提案しましょう。</>) };
  } else if (month >= 9 && month <= 11) {
    return { id: 'autumn', label: '秋・ひやおろし', icon: <Calendar size={14} />, color: 'bg-orange-100 text-orange-700 border-orange-200', filter: (item) => item.tags?.some(t => t.includes('秋') || t.includes('ひやおろし')) || (item.axisX < 40 && item.axisY < 50), guide: (<><span className="font-bold block mb-1">🍁 アプローチ：食材の濃さに負けない</span>「秋の味覚には、熟成感やお米のコクがある『芳醇・旨口』タイプ（マップ左下）を選ぶと、料理の味が引き立ちます」と提案しましょう。</>) };
  } else {
    return { id: 'winter', label: '冬・料理との対比', icon: <Calendar size={14} />, color: 'bg-gray-100 text-gray-700 border-gray-200', filter: (item) => item.tags?.some(t => t.includes('新酒') || t.includes('しぼりたて')) || (item.axisY > 65 && item.axisX > 40), guide: (<><span className="font-bold block mb-1">⛄️ アプローチ：濃厚な味のリセット</span>「冬の濃厚な料理には、口の中をリセットしてくれる『華やかで香り高い』お酒（マップ上部）が合います。冷酒と温かい料理の温度差を楽しむのも粋ですよ」と提案しましょう。</>) };
  }
};

const PROPOSAL_THEMES_SAKE = [
  getCurrentSeasonTheme(),
  { id: 'sashimi', label: '刺身・さっぱり', icon: <Fish size={14} />, color: 'bg-blue-100 text-blue-700 border-blue-200', filter: (item) => item.axisX > 60 || item.axisY < 40, guide: (<><span className="font-bold block mb-1">🐟 アプローチ：素材を引き立てる</span>白身魚や繊細な出汁の料理には、後味がスパッと切れる「辛口」や「スッキリ系」が合います。口の中をリセットしてくれます。</>) },
  { id: 'meat', label: '肉・しっかり味', icon: <Beef size={14} />, color: 'bg-orange-100 text-orange-700 border-orange-200', filter: (item) => item.axisX < 40 || (item.axisX < 60 && item.axisY < 40), guide: (<><span className="font-bold block mb-1">🥩 アプローチ：旨味の相乗効果</span>濃い料理には、負けない「お米の旨味」があるタイプを選びます。「山廃」や「純米酒」など、常温〜ぬる燗で美味しいお酒もおすすめです。</>) },
  { id: 'starter', label: '乾杯・華やか', icon: <Sparkles size={14} />, color: 'bg-yellow-100 text-yellow-700 border-yellow-200', filter: (item) => item.axisY > 60, guide: (<><span className="font-bold block mb-1">🥂 アプローチ：香りで高揚感を</span>最初の一杯は、フルーツのような香りがする「華やか」タイプ（大吟醸など）が喜ばれます。ワイングラスでの提供もおすすめです。</>) }
];

const PROPOSAL_THEMES_SHOCHU = [
  { id: 'soda', label: 'ソーダ割り・爽快', icon: <GlassWater size={14} />, color: 'bg-cyan-100 text-cyan-700 border-cyan-200', filter: (item) => item.axisY < 50 || item.category_rank === 'Shochu_Mugi', guide: (<><span className="font-bold block mb-1">🫧 アプローチ：揚げ物・脂と合わせる</span>「唐揚げや脂の乗った料理には、炭酸で割った『焼酎ハイボール』が最高に合います」と提案しましょう。麦焼酎などは特に相性が良いです。</>) },
  { id: 'rock', label: 'ロック・素材感', icon: <Database size={14} />, color: 'bg-purple-100 text-purple-700 border-purple-200', filter: (item) => item.axisX < 50 || item.category_rank === 'Shochu_Imo', guide: (<><span className="font-bold block mb-1">🧊 アプローチ：香りをゆっくり楽しむ</span>「素材の香りをダイレクトに楽しむならロックがおすすめです」と伝えます。特に芋焼酎は、氷が溶けるごとの味の変化も楽しめます。</>) },
  { id: 'warm', label: 'お湯割り・食中', icon: <Utensils size={14} />, color: 'bg-orange-100 text-orange-700 border-orange-200', filter: (item) => item.category_rank === 'Shochu_Imo', guide: (<><span className="font-bold block mb-1">♨️ アプローチ：甘みを引き出す</span>「お湯割りにすると、芋の甘みと香りが一気に広がります。和食や煮込み料理には、ぬるめのお湯割りが一番の相棒です」と提案します。</>) },
];

const analyzeHistory = (history = []) => {
  if (!Array.isArray(history) || history.length === 0) return { lastOrder: '記録なし', total: 0, cycle: '---', monthly: [] };
  const validDates = history.map(d => new Date(d)).filter(d => !isNaN(d.getTime())).sort((a, b) => a - b);
  if (validDates.length === 0) return { lastOrder: '記録なし', total: 0, cycle: '---', monthly: [] };
  const lastOrder = validDates[validDates.length - 1].toLocaleDateString('ja-JP');
  let cycle = 'データ不足';
  if (validDates.length > 1) {
    const diffTime = Math.abs(validDates[validDates.length - 1] - validDates[0]);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
    cycle = Math.round(diffDays / Math.max(1, validDates.length - 1)) + '日';
  }
  const monthlyCounts = {}; const months = [];
  for (let i = 5; i >= 0; i--) { const d = new Date(); d.setMonth(d.getMonth() - i); const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; monthlyCounts[key] = 0; months.push({ key, label: `${d.getMonth() + 1}月` }); }
  validDates.forEach(date => { const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`; if (monthlyCounts[key] !== undefined) monthlyCounts[key]++; });
  return { lastOrder, total: history.length, cycle, monthly: months.map(m => ({ label: m.label, count: monthlyCounts[m.key] })) };
};

const getRankColor = (rank) => {
  const colors = { 'Matsu': 'bg-yellow-100 text-yellow-800 border-yellow-200', 'Take': 'bg-green-100 text-green-800 border-green-200', 'Ume': 'bg-blue-100 text-blue-800 border-blue-200', 'Shochu_Imo': 'bg-purple-100 text-purple-800 border-purple-200', 'Shochu_Mugi': 'bg-amber-100 text-amber-800 border-amber-200', };
  return colors[rank] || 'bg-gray-100 text-gray-800 border-gray-200';
};
// ==========================================
// 2. Sub Components (Views)
// ==========================================

const TabNav = ({ activeTab, setActiveTab, isSommelierMode }) => (
  <div className="flex border-b border-gray-200 bg-white sticky top-0 z-10 shadow-sm overflow-x-auto no-scrollbar">
    <button onClick={() => setActiveTab('sake')} className={`flex-1 min-w-[70px] py-3 flex flex-col md:flex-row justify-center items-center gap-1 text-xs font-medium transition-colors ${activeTab === 'sake' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:bg-gray-50'}`}><Wine size={18} /> 日本酒</button>
    <button onClick={() => setActiveTab('shochu')} className={`flex-1 min-w-[70px] py-3 flex flex-col md:flex-row justify-center items-center gap-1 text-xs font-medium transition-colors ${activeTab === 'shochu' ? 'text-amber-600 border-b-2 border-amber-600' : 'text-gray-500 hover:bg-gray-50'}`}><GlassWater size={18} /> 焼酎、他</button>
    <button onClick={() => setActiveTab('map')} className={`flex-1 min-w-[70px] py-3 flex flex-col md:flex-row justify-center items-center gap-1 text-xs font-medium transition-colors ${activeTab === 'map' ? 'text-purple-600 border-b-2 border-purple-600' : 'text-gray-500 hover:bg-gray-50'}`}><Map size={18} /> マップ</button>
    {!isSommelierMode && (<>
      <button onClick={() => setActiveTab('stock')} className={`flex-1 min-w-[70px] py-3 flex flex-col md:flex-row justify-center items-center gap-1 text-xs font-medium transition-colors ${activeTab === 'stock' ? 'text-red-600 border-b-2 border-red-600' : 'text-gray-500 hover:bg-gray-50'}`}><Database size={18} /> 資産</button>
      <button onClick={() => setActiveTab('calc')} className={`flex-1 min-w-[70px] py-3 flex flex-col md:flex-row justify-center items-center gap-1 text-xs font-medium transition-colors ${activeTab === 'calc' ? 'text-green-600 border-b-2 border-green-600' : 'text-gray-500 hover:bg-gray-50'}`}><Calculator size={18} /> 計算</button>
    </>)}
  </div>
);

const StockView = ({ data }) => {
  const totalAssetValue = data.reduce((sum, item) => sum + (item.stock_bottles || 0) * item.price_cost + Math.round(item.price_cost * ((item.stock_level ?? 100) / 100)), 0);
  const [restockModalItem, setRestockModalItem] = useState(null);
  const [restockDate, setRestockDate] = useState('');

  const updateStock = async (id, field, val) => {
    if (!id) { console.error("ID不正", { id, field, val }); return; }
    try { await updateDoc(doc(db, "sakeList", id), { [field]: val, stock_updated_at: new Date().toISOString() }); } catch (e) { console.error("Update failed", e); alert("更新失敗"); }
  };
  const openRestockModal = (item) => { setRestockModalItem(item); setRestockDate(new Date().toISOString().split('T')[0]); };
  const handleRestockSubmit = async () => {
    if (!restockModalItem || !restockDate) return;
    try {
      const recordDate = new Date(restockDate); recordDate.setHours(12, 0, 0);
      await updateDoc(doc(db, "sakeList", restockModalItem.id), { stock_bottles: (restockModalItem.stock_bottles || 0) + 1, stock_updated_at: new Date().toISOString(), order_history: arrayUnion(recordDate.toISOString()) });
      setRestockModalItem(null);
    } catch (e) { alert("納品処理に失敗しました"); }
  };

  return (
    <div className="p-4 bg-gray-50 min-h-screen pb-24 animate-in fade-in duration-500">
      <div className="bg-gradient-to-r from-gray-800 to-gray-700 rounded-xl p-6 text-white shadow-lg mb-6"><p className="text-gray-300 text-xs font-bold uppercase tracking-wider mb-1">現在の棚卸し資産総額</p><p className="text-3xl font-bold">¥ {totalAssetValue.toLocaleString()}</p><div className="text-right text-[10px] text-gray-400 mt-2">※未開封ボトル ＋ 開封済み残量(％)の合算</div></div>
      <div className="space-y-4">{data.map(item => (<div key={item.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-200"><div className="flex justify-between items-start mb-4"><div><h3 className="font-bold text-gray-800">{item.name}</h3><span className="text-xs text-gray-500">原価: ¥{item.price_cost.toLocaleString()}</span></div><button onClick={() => openRestockModal(item)} className="flex flex-col items-center justify-center bg-green-50 text-green-700 px-3 py-2 rounded-lg border border-green-200 hover:bg-green-100 active:scale-95 transition-transform"><RefreshCw size={16} /><span className="text-[10px] font-bold mt-1">納品 (+1)</span></button></div><div className="space-y-4"><div className="flex items-center justify-between bg-gray-50 p-2 rounded-lg"><span className="text-xs font-bold text-gray-600">未開封在庫</span><div className="flex items-center gap-3"><button onClick={() => updateStock(item.id, 'stock_bottles', Math.max(0, (item.stock_bottles||0)-1))} className="w-8 h-8 flex items-center justify-center bg-white border rounded-full shadow-sm active:bg-gray-200"><Minus size={16}/></button><span className="font-bold text-lg w-6 text-center">{item.stock_bottles || 0}</span><button onClick={() => updateStock(item.id, 'stock_bottles', (item.stock_bottles||0)+1)} className="w-8 h-8 flex items-center justify-center bg-white border rounded-full shadow-sm active:bg-gray-200"><Plus size={16}/></button></div></div><div><div className="flex justify-between text-xs mb-1 px-1"><span className="text-gray-500">開封済み残量</span><span className={`font-bold ${item.stock_level < 20 ? 'text-red-600' : 'text-blue-600'}`}>{item.stock_level ?? 100}%</span></div><input type="range" min="0" max="100" step="10" value={item.stock_level ?? 100} onChange={(e) => updateStock(item.id, 'stock_level', Number(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600" /></div></div></div>))}</div>
      {restockModalItem && (<div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setRestockModalItem(null)}><div className="bg-white w-full max-w-xs rounded-xl p-6 shadow-2xl" onClick={e => e.stopPropagation()}><h3 className="font-bold text-lg mb-2 text-gray-800">納品登録</h3><p className="text-sm text-gray-500 mb-4">{restockModalItem.name} を1本追加します。<br/>いつ届きましたか？</p><label className="block text-xs font-bold text-gray-500 mb-1">納品日</label><input type="date" className="w-full border border-gray-300 rounded-lg p-3 mb-6 font-bold text-gray-700 bg-gray-50 focus:ring-2 focus:ring-green-500 outline-none" value={restockDate} onChange={(e) => setRestockDate(e.target.value)} /><div className="flex gap-2"><button onClick={() => setRestockModalItem(null)} className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-lg font-bold text-sm">キャンセル</button><button onClick={handleRestockSubmit} className="flex-[2] py-3 bg-green-600 text-white rounded-lg font-bold text-sm shadow-md hover:bg-green-700">確定 (+1本)</button></div></div></div>)}
    </div>
  );
};

const CalculatorView = ({ data }) => {
  const [selectedId, setSelectedId] = useState(data[0]?.id);
  const [targetCostRate, setTargetCostRate] = useState(30);
  const [servingSize, setServingSize] = useState(90);
  if (!data || data.length === 0) return <div className="p-10 text-center text-gray-500">データ読込中...</div>;
  const selectedItem = data.find(i => i.id === selectedId) || data[0];
  const mlCost = selectedItem.price_cost / selectedItem.capacity_ml;
  const idealPrice = Math.round(Math.round(mlCost * servingSize) / (targetCostRate / 100));
  return (
    <div className="p-4 bg-gray-50 min-h-screen animate-in fade-in duration-500">
       <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-6"><h2 className="text-gray-500 text-sm font-bold mb-4 uppercase tracking-wider">Parameters</h2><div className="mb-4"><label className="block text-sm font-medium text-gray-700 mb-1">対象商品</label><select className="w-full p-2 border border-gray-300 rounded-md bg-white" value={selectedItem.id} onChange={(e) => setSelectedId(e.target.value)}>{data.map(item => (<option key={item.id} value={item.id}>{item.name}</option>))}</select></div><div className="mb-6"><div className="flex justify-between mb-1"><label className="text-sm font-medium text-gray-700">提供量</label><span className="text-sm font-bold text-blue-600">{servingSize} ml</span></div><input type="range" min="30" max="360" step="10" value={servingSize} onChange={(e) => setServingSize(Number(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer" /></div><div className="mb-2"><div className="flex justify-between mb-1"><label className="text-sm font-medium text-gray-700">目標原価率</label><span className="text-sm font-bold text-green-600">{targetCostRate}%</span></div><input type="range" min="10" max="100" step="5" value={targetCostRate} onChange={(e) => setTargetCostRate(Number(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer" /></div></div>
       <div className="bg-white p-6 rounded-xl shadow-lg border-t-4 border-green-500 text-center"><p className="text-sm text-gray-500">推奨売価 (税抜)</p><p className="text-4xl font-bold text-gray-800">¥{idealPrice.toLocaleString()}</p></div>
       <div className="mt-6 p-3 bg-yellow-50 rounded text-xs text-yellow-800 border border-yellow-200"><p className="mb-1">💡 <strong>Manager's Note:</strong></p>{selectedItem.category_rank.includes('Matsu') ? (<p>この商品は高単価（松）です。原価率を40%程度まで上げて、お得感を出しつつ粗利額（円）を稼ぐ戦略も有効です。</p>) : selectedItem.category_rank.includes('Ume') ? (<p>この商品は回転重視（梅）です。原価率を20-25%に抑え、利益の柱に設定することを推奨します。</p>) : (<p>標準的な原価率設定です。季節のおすすめとしてメニューの目立つ位置に配置しましょう。</p>)}</div>
    </div>
  );
};

const MapView = ({ data, cloudImages, onSelect }) => {
  const [mapType, setMapType] = useState('Sake'); 
  const [activeThemeId, setActiveThemeId] = useState(null);
  const currentThemes = mapType === 'Sake' ? PROPOSAL_THEMES_SAKE : PROPOSAL_THEMES_SHOCHU;
  const activeTheme = currentThemes.find(t => t.id === activeThemeId);
  useEffect(() => { setActiveThemeId(null); }, [mapType]);

  return (
    <div className="p-4 bg-gray-50 min-h-screen flex flex-col pb-32 animate-in fade-in duration-500">
       <div className="flex justify-center mb-4"><div className="bg-gray-200 p-1 rounded-lg flex"><button onClick={() => setMapType('Sake')} className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${mapType === 'Sake' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>日本酒</button><button onClick={() => setMapType('Shochu')} className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${mapType === 'Shochu' ? 'bg-white text-amber-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>焼酎</button></div></div>
       <div className="bg-white rounded-xl shadow-sm border border-gray-200 relative overflow-hidden p-4 min-h-[400px] mb-4">
        <div className="absolute top-2 left-1/2 transform -translate-x-1/2 text-xs font-bold text-gray-400">華やか・香り高</div>
        <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 text-xs font-bold text-gray-400">穏やか・スッキリ</div>
        <div className="absolute left-2 top-1/2 transform -translate-y-1/2 -rotate-90 text-xs font-bold text-gray-400">甘口・芳醇</div>
        <div className="absolute right-2 top-1/2 transform -translate-y-1/2 rotate-90 text-xs font-bold text-gray-400">辛口・キレ</div>
        <div className="absolute top-1/2 left-4 right-4 h-px bg-gray-100"></div>
        <div className="absolute left-1/2 top-4 bottom-4 w-px bg-gray-100"></div>
        {data.filter(d => d.type === mapType).map(item => {
          const displayImage = cloudImages[item.id] || item.image;
          const isDimmed = activeTheme && !activeTheme.filter(item);
          return (
            <div key={item.id} onClick={() => onSelect(item)} className={`absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center group cursor-pointer transition-all duration-500 ${isDimmed ? 'opacity-20 grayscale scale-75' : 'hover:z-50 hover:scale-110'}`} style={{ left: `${item.axisX || 50}%`, top: `${100 - (item.axisY || 50)}%` }}>
              <div className={`w-8 h-8 md:w-10 md:h-10 rounded-full border-2 overflow-hidden shadow-md bg-white ${item.category_rank.includes('Matsu') ? 'border-yellow-500' : item.category_rank.includes('Take') ? 'border-green-500' : item.category_rank.includes('Shochu') ? 'border-amber-500' : 'border-blue-500'}`}>
                {displayImage ? (<img src={displayImage} alt={item.name} className="w-full h-full object-cover" />) : (<div className="w-full h-full bg-gray-100"></div>)}
              </div>
              <span className="text-[9px] md:text-[10px] font-bold text-gray-700 bg-white/90 px-1 rounded shadow-sm mt-1 whitespace-nowrap z-20">{item.name}</span>
            </div>
          );
        })}
       </div>
       <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
         <div className="bg-gray-50 px-4 py-2 flex items-center gap-2 border-b border-gray-100"><Lightbulb className="text-yellow-500" size={16} /><span className="text-xs font-bold text-gray-600">提案の切り口（スタッフ用ガイド）</span></div>
         <div className="p-3 flex gap-2 overflow-x-auto pb-4 no-scrollbar">
           {currentThemes.map(theme => (<button key={theme.id} onClick={() => setActiveThemeId(activeThemeId === theme.id ? null : theme.id)} className={`flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-bold transition-all ${activeThemeId === theme.id ? theme.color : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}>{theme.icon}{theme.label}</button>))}
         </div>
         {activeTheme && (<div className={`mx-3 mb-3 p-3 rounded-lg text-xs leading-relaxed animate-in slide-in-from-top-2 duration-300 ${activeTheme.color.replace('text-', 'bg-').replace('border-', '').split(' ')[0]} bg-opacity-20`}>{activeTheme.guide}</div>)}
       </div>
    </div>
  );
};

// ==========================================
// 3. Main Views & Application Container
// ==========================================

// ★ タグ入力支援用定数
const TAG_SUGGESTIONS = {
  '原料・米': ['山田錦', '雄町', '五百万石', '美山錦', '愛山'],
  'スペック': ['大吟醸', '純米', '本醸造', '原酒', '生酒', '新酒', '古酒', '貴醸酒'],
  '製法詳細': ['山廃', '生酛', 'おりがらみ', '荒走り', '中取り', '責め', 'ひやおろし'],
  '焼酎・他': ['芋', '麦', '米', '黒糖', 'そば', '黒麹', '白麹', '減圧', '常圧'],
  '味わい': ['辛口', '甘口', '酸', 'BY']
};

const MenuView = ({ data, onSelect, cloudImages, placeholder, onAdd, isSommelierMode, activeTab }) => {
  const [searchTerm, setSearchTerm] = useState('');
  
  const filteredData = useMemo(() => {
    const searched = data.filter(item => item.name.toLowerCase().includes(searchTerm.toLowerCase()) || item.kana.includes(searchTerm) || item.tags.some(tag => tag.includes(searchTerm)));
    if (activeTab === 'shochu') {
      return searched.sort((a, b) => {
        const isAShochu = a.type === 'Shochu';
        const isBShochu = b.type === 'Shochu';
        if (isAShochu && !isBShochu) return -1;
        if (!isAShochu && isBShochu) return 1;
        return 0;
      });
    }
    return searched;
  }, [data, searchTerm, activeTab]);

  return (
    <div className="p-4 bg-gray-50 min-h-screen pb-24 relative animate-in fade-in duration-500">
      <div className="relative mb-4">
        <Search className="absolute left-3 top-3 text-gray-400" size={20} />
        <input type="text" placeholder={placeholder} className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
      </div>

      {filteredData.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <AlertCircle size={48} className="mb-2 opacity-20"/>
          <p>該当する商品がありません</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredData.map(item => {
            const displayImage = cloudImages[item.id] || item.image;
            const bottles = item.stock_bottles || 0;
            const level = item.stock_level ?? 100;
            const isSoldOut = bottles === 0 && level === 0;

            return (
              <div key={item.id} onClick={() => onSelect(item)} className={`bg-white p-3 rounded-xl shadow-sm border border-gray-100 active:scale-[0.99] transition-transform cursor-pointer flex gap-4 ${isSoldOut && isSommelierMode ? 'opacity-60 grayscale' : ''}`}>
                <div className="w-20 h-20 bg-gray-100 rounded-lg flex-shrink-0 overflow-hidden border border-gray-200 relative">
                  {displayImage ? (<img src={displayImage} alt={item.name} className="w-full h-full object-cover" />) : (<div className="w-full h-full flex items-center justify-center text-gray-300"><Camera size={24} /></div>)}
                  {!isSommelierMode ? (
                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] text-center py-0.5">残: {bottles > 0 ? `${bottles}本+${level}%` : `${level}%`}</div>
                  ) : isSoldOut && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white font-bold text-xs">SOLD OUT</div>
                  )}
                </div>
                <div className="flex-grow min-w-0">
                  <div><span className={`text-[10px] px-2 py-0.5 rounded-full border ${getRankColor(item.category_rank)} mr-2`}>{item.category_rank.replace('Shochu_', '')}</span><h3 className="text-base font-bold text-gray-800 mt-1 truncate">{item.name}</h3></div>
                  <div className="flex flex-wrap gap-1 mb-2">{item.tags.slice(0, 3).map(tag => (<span key={tag} className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">#{tag}</span>))}</div>
                  <div className="text-xs text-blue-900 bg-blue-50 p-2 rounded border-l-2 border-blue-400"><p className="leading-relaxed break-words">{item.sales_talk}</p></div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {!isSommelierMode && (
        <button onClick={onAdd} className="fixed bottom-24 right-4 bg-blue-600 text-white p-4 rounded-full shadow-lg hover:bg-blue-700 active:scale-90 transition-transform z-30"><Plus size={24} /></button>
      )}
    </div>
  );
};

export default function SakeManagerApp() {
  const [activeTab, setActiveTab] = useState('sake');
  const [modalItem, setModalItem] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [cloudImages, setCloudImages] = useState({});
  const [isUploading, setIsUploading] = useState(false);
  const [sakeList, setSakeList] = useState([]);
  const [isSommelierMode, setIsSommelierMode] = useState(false);
  
  // Ref
  const fileInputRef = useRef(null); 
  const specInputRef = useRef(null); 

  // ★ 新機能: JSON一括取込用のState
  const [jsonInput, setJsonInput] = useState('');
  const [showJsonInput, setShowJsonInput] = useState(false);

  useEffect(() => {
    if (!db) return;
    const unsubList = onSnapshot(collection(db, "sakeList"), (snapshot) => {
      setSakeList(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    const unsubImages = onSnapshot(doc(db, "sakeImages", "main"), (doc) => {
      if (doc.exists()) setCloudImages(doc.data());
    });
    return () => { unsubList(); unsubImages(); };
  }, []);

  const handleAddNew = () => {
    const newItem = { id: '', name: '', kana: '', category_rank: 'Take', type: 'Sake', price_cost: 0, capacity_ml: 1800, tags: [], sales_talk: '', pairing_hint: '', source_text: '', spec_image: '', stock_level: 100, stock_bottles: 0, order_history: [], axisX: 50, axisY: 50 };
    setEditForm(newItem); setIsEditMode(true); setModalItem(newItem); setJsonInput(''); setShowJsonInput(false);
  };
  const handleOpenDetail = (item) => { setEditForm(item); setIsEditMode(false); setModalItem(item); setJsonInput(''); setShowJsonInput(false); };
  const startEdit = () => { setEditForm({ ...modalItem }); setIsEditMode(true); };
  
  const toggleTag = (tag) => {
    const currentTags = editForm.tags || [];
    if (currentTags.includes(tag)) {
      setEditForm({ ...editForm, tags: currentTags.filter(t => t !== tag) });
    } else {
      setEditForm({ ...editForm, tags: [...currentTags, tag] });
    }
  };

  // ★ AI生成JSONのパース処理（一括入力）
  const handleJsonImport = () => {
    try {
      // 入力されたJSONテキストをパース
      // 前後の余計な文字（```json ... ```など）を削除して解析
      const cleanJson = jsonInput.replace(/```json/g, '').replace(/```/g, '').trim();
      const data = JSON.parse(cleanJson);

      setEditForm(prev => ({
        ...prev,
        name: data.name || prev.name,
        kana: data.kana || prev.kana,
        type: data.type || prev.type,
        category_rank: data.category_rank || prev.category_rank,
        price_cost: Number(data.price_cost) || prev.price_cost,
        capacity_ml: Number(data.capacity_ml) || prev.capacity_ml,
        sales_talk: data.sales_talk || prev.sales_talk,
        pairing_hint: data.pairing_hint || prev.pairing_hint,
        tags: data.tags || prev.tags,
        axisX: Number(data.axisX) || prev.axisX,
        axisY: Number(data.axisY) || prev.axisY,
        source_text: data.source_text || prev.source_text
      }));
      
      alert("AIデータの取り込みに成功しました！");
      setShowJsonInput(false);
    } catch (e) {
      alert("データの形式が正しくありません。\nNotebookLMの出力をそのまま貼り付けてください。");
      console.error(e);
    }
  };

  const handleSave = async () => {
    if (!editForm.name) return alert("商品名は必須です");
    try {
      if (modalItem.id) { await updateDoc(doc(db, "sakeList", modalItem.id), editForm); alert("更新しました！"); } 
      else { await addDoc(collection(db, "sakeList"), editForm); alert("新規登録しました！"); }
      setModalItem(null); setIsEditMode(false);
    } catch (e) { console.error(e); alert("保存エラー: " + e.message); }
  };
  const handleDelete = async () => {
    if (!confirm("本当にこの商品を削除しますか？")) return;
    try { await deleteDoc(doc(db, "sakeList", modalItem.id)); alert("削除しました"); setModalItem(null); } catch (e) { alert("削除エラー: " + e.message); }
  };
  const handleFileUpload = async (event, type = 'main') => {
    const file = event.target.files[0];
    if (!file || !modalItem.id) { if(!modalItem.id) alert("先に商品を保存してください"); return; }
    try {
      setIsUploading(true);
      const fileName = type === 'main' ? `${modalItem.id}_main.jpg` : `${modalItem.id}_spec.jpg`;
      const storageRef = ref(storage, `images/${fileName}`);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);
      if (type === 'main') {
        await setDoc(doc(db, "sakeImages", "main"), { [modalItem.id]: downloadURL }, { merge: true });
        setCloudImages(prev => ({ ...prev, [modalItem.id]: downloadURL }));
      } else {
        setEditForm(prev => ({ ...prev, spec_image: downloadURL }));
        alert("スペック画像を読み込みました。「保存」を押して確定してください。");
      }
    } catch (error) { alert("アップロード失敗"); } finally { setIsUploading(false); }
  };

  const stats = modalItem ? analyzeHistory(modalItem.order_history) : null;
  const triviaList = modalItem ? getTriviaList(modalItem) : [];

  return (
    <div className="w-full md:max-w-4xl mx-auto bg-white min-h-screen shadow-2xl overflow-hidden relative font-sans">
      <div className={`flex justify-between items-center p-3 border-b ${isSommelierMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'} transition-colors duration-300`}>
        <h1 className="font-bold text-lg flex items-center gap-2">{isSommelierMode ? <><User size={20}/> Sommelier Mode</> : 'Sake Manager'}</h1>
        <button onClick={() => setIsSommelierMode(!isSommelierMode)} className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${isSommelierMode ? 'bg-white text-gray-900' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{isSommelierMode ? <><LogOut size={14}/> Exit</> : <><User size={14}/> 接客モード</>}</button>
      </div>
      <TabNav activeTab={activeTab} setActiveTab={setActiveTab} isSommelierMode={isSommelierMode} />
      
      <div className="h-full">
        {activeTab === 'sake' && <MenuView data={sakeList.filter(d => d.type === 'Sake')} onSelect={handleOpenDetail} onAdd={handleAddNew} cloudImages={cloudImages} placeholder="日本酒..." isSommelierMode={isSommelierMode} activeTab="sake" />}
        {activeTab === 'shochu' && <MenuView data={sakeList.filter(d => d.type !== 'Sake')} onSelect={handleOpenDetail} onAdd={handleAddNew} cloudImages={cloudImages} placeholder="焼酎・果実酒..." isSommelierMode={isSommelierMode} activeTab="shochu" />}
        {activeTab === 'stock' && !isSommelierMode && <StockView data={sakeList} />}
        {activeTab === 'calc' && !isSommelierMode && <CalculatorView data={sakeList} />}
        {activeTab === 'map' && <MapView data={sakeList} cloudImages={cloudImages} onSelect={handleOpenDetail} />}
      </div>

      {modalItem && (
        <div className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setModalItem(null)}>
          <div className="bg-white w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <div className="relative h-48 bg-gray-200 cursor-pointer group flex-shrink-0">
               {!isEditMode ? (
                 <div onClick={() => !isSommelierMode && !isUploading && fileInputRef.current?.click()} className="w-full h-full relative">
                   {cloudImages[modalItem.id] || modalItem.image ? (<img src={cloudImages[modalItem.id] || modalItem.image} className={`w-full h-full object-cover transition-opacity ${isUploading ? 'opacity-50' : ''}`} alt={modalItem.name} />) : (<div className="w-full h-full flex flex-col items-center justify-center text-gray-400 gap-2"><Camera size={48}/><span className="text-xs font-bold bg-white/80 px-2 py-1 rounded">写真登録</span></div>)}
                   {isUploading && <div className="absolute inset-0 flex items-center justify-center bg-black/30"><Loader className="animate-spin text-white" size={32} /></div>}
                 </div>
               ) : ( <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400 text-sm">※画像は保存後に変更可能</div> )}
               <input type="file" accept="image/*" ref={fileInputRef} className="hidden" onChange={(e) => handleFileUpload(e, 'main')} />
               <button onClick={() => setModalItem(null)} className="absolute top-2 right-2 bg-black/50 text-white p-1 rounded-full z-10 hover:bg-black/70"><X size={20}/></button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              {!isEditMode ? (
                <>
                  <div className="flex justify-between items-start mb-2"><div><h2 className="text-xl font-bold text-gray-800">{modalItem.name}</h2><p className="text-sm text-gray-500">{modalItem.kana}</p></div>{!isSommelierMode && (<button onClick={startEdit} className="text-gray-400 hover:text-blue-600 p-2"><Pencil size={20}/></button>)}</div>
                  <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-500 mb-4"><p className="text-blue-900 font-medium text-sm leading-relaxed">"{modalItem.sales_talk}"</p></div>
                  {modalItem.pairing_hint && (<div className="flex items-start gap-3 bg-orange-50 p-3 rounded-lg border border-orange-100 mb-6"><Utensils className="text-orange-500 mt-0.5" size={18} /><div><span className="block text-xs font-bold text-orange-800 mb-0.5">おすすめペアリング</span><p className="text-sm text-orange-900">{modalItem.pairing_hint}</p></div></div>)}
                  
                  {triviaList.length > 0 && (
                    <div className="mb-6 space-y-3">
                      <div className="flex items-center gap-2 text-gray-800 font-bold text-xs uppercase tracking-wider"><BookOpen size={14} className="text-gray-500"/> 豆知識 (Trivia)</div>
                      {triviaList.map((trivia, index) => (
                        <div key={trivia.id || index} className="bg-gradient-to-br from-gray-50 to-gray-100 p-3 rounded-xl border border-gray-200 relative overflow-hidden">
                           <div className="flex items-center gap-2 mb-1"><span className="text-gray-500">{trivia.icon}</span><h4 className="font-bold text-xs text-gray-800">{trivia.title}</h4></div>
                           <p className="text-xs text-gray-600 leading-relaxed pl-6">{trivia.text}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {!isSommelierMode && (
                    <div className="border-t pt-6">
                      <div className="flex items-center gap-2 mb-4"><BarChart3 className="text-gray-400" size={20}/><h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Analysis</h3></div>
                      <div className="grid grid-cols-3 gap-2 mb-4">
                         <div className="bg-gray-50 p-2 rounded-lg text-center"><span className="block text-[10px] text-gray-500">最終納品</span><span className="block font-bold text-sm">{stats.lastOrder}</span></div>
                         <div className="bg-gray-50 p-2 rounded-lg text-center"><span className="block text-[10px] text-gray-500">累計</span><span className="block font-bold text-sm">{stats.total}回</span></div>
                         <div className="bg-gray-50 p-2 rounded-lg text-center"><span className="block text-[10px] text-gray-500">サイクル</span><span className="block font-bold text-sm text-blue-600">{stats.cycle}</span></div>
                      </div>
                      <div className="bg-white border border-gray-100 p-4 rounded-lg shadow-inner mb-4">
                        <div className="flex items-end justify-between h-24 gap-1">
                          {stats.monthly.map((m, i) => { const max = Math.max(...stats.monthly.map(d => d.count)) || 1; return (<div key={i} className="flex-1 flex flex-col items-center group"><div className={`w-full max-w-[20px] rounded-t-sm transition-all duration-500 ${m.count > 0 ? 'bg-blue-400 group-hover:bg-blue-500' : 'bg-gray-100'}`} style={{ height: `${(m.count/max)*100}%`, minHeight: m.count>0?'4px':'2px' }}></div><span className="text-[9px] text-gray-400 mt-1">{m.label.replace('月','')}</span></div>); })}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm border-t pt-4"><div><span className="block text-gray-400 text-xs">Capacity</span><span className="font-bold">{modalItem.capacity_ml}ml</span></div><div><span className="block text-gray-400 text-xs">Cost</span><span className="font-bold">¥{modalItem.price_cost.toLocaleString()}</span></div></div>
                      
                      {(modalItem.source_text || modalItem.spec_image) && (
                        <div className="mt-4 p-3 bg-gray-100 rounded text-xs text-gray-600">
                          <p className="font-bold mb-1">Source Info:</p>
                          {modalItem.spec_image && <a href={modalItem.spec_image} target="_blank" rel="noreferrer" className="text-blue-600 underline block mb-1">スペック画像を確認</a>}
                          {modalItem.source_text && <p className="truncate opacity-50">{modalItem.source_text}</p>}
                        </div>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <div className="space-y-4">
                  {/* ★ AI一括取込ボタンエリア */}
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-xs font-bold text-gray-500">商品編集</label>
                    <button onClick={() => setShowJsonInput(!showJsonInput)} className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-md hover:opacity-90 flex items-center gap-1 animate-pulse">
                      <Sparkles size={12}/> NotebookLMから一括入力
                    </button>
                  </div>

                  {/* AIデータ入力エリア（表示時のみ） */}
                  {showJsonInput && (
                    <div className="bg-purple-50 p-3 rounded-lg border border-purple-200 mb-4 animate-in slide-in-from-top-2">
                      <p className="text-[10px] text-purple-800 mb-1 font-bold">NotebookLMの出力を貼り付けて「取込」を押してください</p>
                      <textarea 
                        className="w-full border border-purple-200 rounded p-2 text-xs h-24 mb-2 bg-white" 
                        placeholder={'例: {"name": "獺祭", "tags": ["純米大吟醸", "山田錦"] ... }'}
                        value={jsonInput}
                        onChange={e => setJsonInput(e.target.value)}
                      />
                      <button onClick={handleJsonImport} className="w-full bg-purple-600 text-white py-2 rounded font-bold text-xs shadow hover:bg-purple-700">データを反映する</button>
                    </div>
                  )}

                  <div><label className="text-xs font-bold text-gray-500">商品名</label><input className="w-full border p-2 rounded" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} /></div>
                  <div><label className="text-xs font-bold text-gray-500">ふりがな</label><input className="w-full border p-2 rounded" value={editForm.kana} onChange={e => setEditForm({...editForm, kana: e.target.value})} /></div>
                  
                  {/* スペック画像など */}
                  <div className="bg-gray-50 p-3 rounded border border-gray-100">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-gray-500">スペック画像</span>
                      <div className="flex items-center gap-2">
                        {editForm.spec_image && <span className="text-[10px] text-green-600">登録済</span>}
                        <input type="file" accept="image/*" ref={specInputRef} className="hidden" onChange={(e) => handleFileUpload(e, 'spec')} />
                        <button onClick={() => specInputRef.current?.click()} className="text-[10px] bg-white border border-gray-300 text-gray-600 px-2 py-1 rounded flex items-center gap-1 hover:bg-gray-100"><Upload size={10}/> アップロード</button>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2"><div><label className="text-xs font-bold text-gray-500">種別</label><select className="w-full border p-2 rounded" value={editForm.type} onChange={e => setEditForm({...editForm, type: e.target.value})}><option value="Sake">日本酒</option><option value="Shochu">焼酎</option><option value="Liqueur">リキュール</option></select></div><div><label className="text-xs font-bold text-gray-500">ランク</label><select className="w-full border p-2 rounded" value={editForm.category_rank} onChange={e => setEditForm({...editForm, category_rank: e.target.value})}><option value="Matsu">松</option><option value="Take">竹</option><option value="Ume">梅</option><option value="Shochu_Imo">芋焼酎</option><option value="Shochu_Mugi">麦焼酎</option></select></div></div>
                  <div className="grid grid-cols-2 gap-2"><div><label className="text-xs font-bold text-gray-500">仕入価格</label><input type="number" className="w-full border p-2 rounded" value={editForm.price_cost} onChange={e => setEditForm({...editForm, price_cost: Number(e.target.value)})} /></div><div><label className="text-xs font-bold text-gray-500">容量(ml)</label><input type="number" className="w-full border p-2 rounded" value={editForm.capacity_ml} onChange={e => setEditForm({...editForm, capacity_ml: Number(e.target.value)})} /></div></div>
                  <div><label className="text-xs font-bold text-gray-500">セールストーク</label><textarea className="w-full border p-2 rounded h-20" value={editForm.sales_talk} onChange={e => setEditForm({...editForm, sales_talk: e.target.value})} /></div>
                  <div><label className="text-xs font-bold text-gray-500">ペアリング</label><input className="w-full border p-2 rounded" value={editForm.pairing_hint} onChange={e => setEditForm({...editForm, pairing_hint: e.target.value})} /></div>
                  
                  {/* タグ選択パレット */}
                  <div>
                    <label className="text-xs font-bold text-gray-500">タグ (カンマ区切り)</label>
                    <input className="w-full border p-2 rounded mb-2" value={editForm.tags?.join(',')} onChange={e => setEditForm({...editForm, tags: e.target.value.split(',')})} placeholder="手入力も可" />
                    <div className="bg-gray-50 p-2 rounded border border-gray-100">
                      {Object.entries(TAG_SUGGESTIONS).map(([category, tags]) => (
                        <div key={category} className="mb-2 last:mb-0">
                          <span className="text-[10px] text-gray-500 block mb-1">{category}</span>
                          <div className="flex flex-wrap gap-1">
                            {tags.map(tag => {
                              const isSelected = editForm.tags?.includes(tag);
                              return ( <button key={tag} onClick={() => toggleTag(tag)} className={`text-[10px] px-2 py-1 rounded border transition-colors ${isSelected ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-100'}`}>{tag}</button> );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-gray-50 p-3 rounded"><p className="text-xs font-bold mb-2">マップ位置調整</p><div className="flex gap-2 text-xs items-center mb-2"><span>甘</span><input type="range" className="flex-grow" value={editForm.axisX || 50} onChange={e => setEditForm({...editForm, axisX: Number(e.target.value)})} /><span>辛</span></div><div className="flex gap-2 text-xs items-center"><span>穏</span><input type="range" className="flex-grow" value={editForm.axisY || 50} onChange={e => setEditForm({...editForm, axisY: Number(e.target.value)})} /><span>華</span></div></div>
                  <div className="flex gap-2 pt-4 border-t">{modalItem.id && <button onClick={handleDelete} className="flex-1 bg-red-100 text-red-600 py-3 rounded-lg font-bold flex items-center justify-center gap-2"><Trash2 size={18}/> 削除</button>}<button onClick={handleSave} className="flex-[2] bg-blue-600 text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2"><Save size={18}/> 保存</button></div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}