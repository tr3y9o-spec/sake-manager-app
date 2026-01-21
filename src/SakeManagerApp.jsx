import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Search, Calculator, Map, Wine, GlassWater, Camera, Upload, Loader, X, Utensils, Database, RefreshCw, Plus, Minus, BarChart3, Pencil, Trash2, Save, User, LogOut, Lightbulb, Sparkles, Fish, Beef, Calendar, AlertCircle } from 'lucide-react';
import { db, storage } from './firebase';
import { doc, setDoc, onSnapshot, collection, updateDoc, arrayUnion, addDoc, deleteDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

// ==========================================
// 1. Logic & Constants (教育用コンテンツ・定数)
// ==========================================

const PROPOSAL_THEMES = [
  {
    id: 'season',
    label: '今の季節（冬〜早春）',
    icon: <Calendar size={14} />,
    color: 'bg-pink-100 text-pink-700 border-pink-200',
    filter: (item) => item.tags?.some(t => t.includes('新酒') || t.includes('しぼりたて')) || (item.axisX > 40 && item.axisY < 60),
    guide: (
      <>
        <span className="font-bold block mb-1">⛄️ アプローチ：旬を味わう</span>
        「今はちょうど新酒が出揃う時期です。加熱処理をしていない『生酒』や『しぼりたて』は、今しか飲めないフレッシュな味わいが特徴です」と提案しましょう。
      </>
    )
  },
  {
    id: 'sashimi',
    label: '刺身・さっぱり',
    icon: <Fish size={14} />,
    color: 'bg-blue-100 text-blue-700 border-blue-200',
    filter: (item) => item.axisX > 60 || item.axisY < 40,
    guide: (
      <>
        <span className="font-bold block mb-1">🐟 アプローチ：素材を引き立てる</span>
        白身魚や繊細な出汁の料理には、香りが強すぎず、後味がスパッと切れる「辛口」や「スッキリ系」が合います。口の中の脂を流してくれます。
      </>
    )
  },
  {
    id: 'meat',
    label: '肉・しっかり味',
    icon: <Beef size={14} />,
    color: 'bg-orange-100 text-orange-700 border-orange-200',
    filter: (item) => item.axisX < 40 || (item.axisX < 60 && item.axisY < 40),
    guide: (
      <>
        <span className="font-bold block mb-1">🥩 アプローチ：旨味の相乗効果</span>
        味の濃い料理に負けない「お米の旨味（ボディ）」があるタイプを選びます。「山廃」や「純米酒」など、少し常温〜ぬる燗で美味しいお酒もおすすめです。
      </>
    )
  },
  {
    id: 'starter',
    label: '乾杯・華やか',
    icon: <Sparkles size={14} />,
    color: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    filter: (item) => item.axisY > 60,
    guide: (
      <>
        <span className="font-bold block mb-1">🥂 アプローチ：香りで高揚感を</span>
        最初の一杯は、フルーツのような香りがする「華やか」タイプ（大吟醸など）が喜ばれます。ワイングラスで提供すると、より香りが立ちます。
      </>
    )
  }
];

// 履歴分析ロジック（エラーガード強化版）
const analyzeHistory = (history = []) => {
  if (!Array.isArray(history) || history.length === 0) {
    return { lastOrder: '記録なし', total: 0, cycle: '---', monthly: [] };
  }
  
  // 有効な日付のみフィルタリング
  const validDates = history
    .map(d => new Date(d))
    .filter(d => !isNaN(d.getTime()))
    .sort((a, b) => a - b);

  if (validDates.length === 0) return { lastOrder: '記録なし', total: 0, cycle: '---', monthly: [] };

  const lastOrder = validDates[validDates.length - 1].toLocaleDateString('ja-JP');
  
  let cycle = 'データ不足';
  if (validDates.length > 1) {
    const diffTime = Math.abs(validDates[validDates.length - 1] - validDates[0]);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
    // 0除算防止
    const intervalCount = Math.max(1, validDates.length - 1);
    cycle = Math.round(diffDays / intervalCount) + '日';
  }

  // 月別集計
  const monthlyCounts = {};
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    monthlyCounts[key] = 0;
    months.push({ key, label: `${d.getMonth() + 1}月` });
  }

  validDates.forEach(date => {
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    if (monthlyCounts[key] !== undefined) monthlyCounts[key]++;
  });

  return { lastOrder, total: history.length, cycle, monthly: months.map(m => ({ label: m.label, count: monthlyCounts[m.key] })) };
};

const getRankColor = (rank) => {
  const colors = {
    'Matsu': 'bg-yellow-100 text-yellow-800 border-yellow-200',
    'Take': 'bg-green-100 text-green-800 border-green-200',
    'Ume': 'bg-blue-100 text-blue-800 border-blue-200',
    'Shochu_Imo': 'bg-purple-100 text-purple-800 border-purple-200',
    'Shochu_Mugi': 'bg-amber-100 text-amber-800 border-amber-200',
  };
  return colors[rank] || 'bg-gray-100 text-gray-800 border-gray-200';
};

// ==========================================
// 2. Sub Components (Views)
// ==========================================

const TabNav = ({ activeTab, setActiveTab, isSommelierMode }) => (
  <div className="flex border-b border-gray-200 bg-white sticky top-0 z-10 shadow-sm overflow-x-auto no-scrollbar">
    <button onClick={() => setActiveTab('sake')} className={`flex-1 min-w-[70px] py-3 flex flex-col md:flex-row justify-center items-center gap-1 text-xs font-medium transition-colors ${activeTab === 'sake' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:bg-gray-50'}`}><Wine size={18} /> 日本酒</button>
    <button onClick={() => setActiveTab('shochu')} className={`flex-1 min-w-[70px] py-3 flex flex-col md:flex-row justify-center items-center gap-1 text-xs font-medium transition-colors ${activeTab === 'shochu' ? 'text-amber-600 border-b-2 border-amber-600' : 'text-gray-500 hover:bg-gray-50'}`}><GlassWater size={18} /> 焼酎</button>
    <button onClick={() => setActiveTab('map')} className={`flex-1 min-w-[70px] py-3 flex flex-col md:flex-row justify-center items-center gap-1 text-xs font-medium transition-colors ${activeTab === 'map' ? 'text-purple-600 border-b-2 border-purple-600' : 'text-gray-500 hover:bg-gray-50'}`}><Map size={18} /> マップ</button>
    {!isSommelierMode && (
      <>
        <button onClick={() => setActiveTab('stock')} className={`flex-1 min-w-[70px] py-3 flex flex-col md:flex-row justify-center items-center gap-1 text-xs font-medium transition-colors ${activeTab === 'stock' ? 'text-red-600 border-b-2 border-red-600' : 'text-gray-500 hover:bg-gray-50'}`}><Database size={18} /> 資産</button>
        <button onClick={() => setActiveTab('calc')} className={`flex-1 min-w-[70px] py-3 flex flex-col md:flex-row justify-center items-center gap-1 text-xs font-medium transition-colors ${activeTab === 'calc' ? 'text-green-600 border-b-2 border-green-600' : 'text-gray-500 hover:bg-gray-50'}`}><Calculator size={18} /> 計算</button>
      </>
    )}
  </div>
);

const StockView = ({ data }) => {
  const totalAssetValue = data.reduce((sum, item) => sum + (item.stock_bottles || 0) * item.price_cost + Math.round(item.price_cost * ((item.stock_level ?? 100) / 100)), 0);
  
  const updateStock = async (id, field, val) => {
    try {
      await updateDoc(doc(db, "sakeList", id), { [field]: val, stock_updated_at: new Date().toISOString() });
    } catch (e) { console.error("Update failed", e); alert("更新に失敗しました。通信環境を確認してください。"); }
  };
  
  const handleRestock = async (id, count) => {
    if(!confirm("納品登録：在庫を1本追加しますか？")) return;
    try {
      await updateDoc(doc(db, "sakeList", id), { stock_bottles: (count || 0) + 1, stock_updated_at: new Date().toISOString(), order_history: arrayUnion(new Date().toISOString()) });
    } catch (e) { alert("納品処理に失敗しました"); }
  };

  return (
    <div className="p-4 bg-gray-50 min-h-screen pb-24 animate-in fade-in duration-500">
      <div className="bg-gradient-to-r from-gray-800 to-gray-700 rounded-xl p-6 text-white shadow-lg mb-6">
        <p className="text-gray-300 text-xs font-bold uppercase tracking-wider mb-1">現在の棚卸し資産総額</p>
        <p className="text-3xl font-bold">¥ {totalAssetValue.toLocaleString()}</p>
        <div className="text-right text-[10px] text-gray-400 mt-2">※未開封ボトル ＋ 開封済み残量(％)の合算</div>
      </div>
      <div className="space-y-4">
        {data.map(item => (
          <div key={item.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
            <div className="flex justify-between items-start mb-4">
              <div><h3 className="font-bold text-gray-800">{item.name}</h3><span className="text-xs text-gray-500">原価: ¥{item.price_cost.toLocaleString()}</span></div>
              <button onClick={() => handleRestock(item.id, item.stock_bottles)} className="flex flex-col items-center justify-center bg-green-50 text-green-700 px-3 py-2 rounded-lg border border-green-200 hover:bg-green-100 active:scale-95 transition-transform"><RefreshCw size={16} /><span className="text-[10px] font-bold mt-1">納品 (+1)</span></button>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-gray-50 p-2 rounded-lg"><span className="text-xs font-bold text-gray-600">未開封在庫</span><div className="flex items-center gap-3"><button onClick={() => updateStock(item.id, 'stock_bottles', Math.max(0, (item.stock_bottles||0)-1))} className="w-8 h-8 flex items-center justify-center bg-white border rounded-full shadow-sm active:bg-gray-200"><Minus size={16}/></button><span className="font-bold text-lg w-6 text-center">{item.stock_bottles || 0}</span><button onClick={() => updateStock(item.id, 'stock_bottles', (item.stock_bottles||0)+1)} className="w-8 h-8 flex items-center justify-center bg-white border rounded-full shadow-sm active:bg-gray-200"><Plus size={16}/></button></div></div>
              <div><div className="flex justify-between text-xs mb-1 px-1"><span className="text-gray-500">開封済み残量</span><span className={`font-bold ${item.stock_level < 20 ? 'text-red-600' : 'text-blue-600'}`}>{item.stock_level ?? 100}%</span></div><input type="range" min="0" max="100" step="10" value={item.stock_level ?? 100} onChange={(e) => updateStock(item.id, 'stock_level', Number(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600" /></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const CalculatorView = ({ data }) => {
  const [selectedId, setSelectedId] = useState(data[0]?.id);
  const [targetCostRate, setTargetCostRate] = useState(30);
  const [servingSize, setServingSize] = useState(90);
  
  // データロード前ガード
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
  const activeTheme = PROPOSAL_THEMES.find(t => t.id === activeThemeId);

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
           {PROPOSAL_THEMES.map(theme => (
             <button key={theme.id} onClick={() => setActiveThemeId(activeThemeId === theme.id ? null : theme.id)} className={`flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-bold transition-all ${activeThemeId === theme.id ? theme.color : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}>{theme.icon}{theme.label}</button>
           ))}
         </div>
         {activeTheme && (<div className={`mx-3 mb-3 p-3 rounded-lg text-xs leading-relaxed animate-in slide-in-from-top-2 duration-300 ${activeTheme.color.replace('text-', 'bg-').replace('border-', '').split(' ')[0]} bg-opacity-20`}>{activeTheme.guide}</div>)}
       </div>
    </div>
  );
};
// ==========================================
// 3. Main Views & Application Container
// ==========================================

const MenuView = ({ data, onSelect, cloudImages, placeholder, onAdd, isSommelierMode }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const filteredData = useMemo(() => {
    return data.filter(item => item.name.toLowerCase().includes(searchTerm.toLowerCase()) || item.kana.includes(searchTerm) || item.tags.some(tag => tag.includes(searchTerm)));
  }, [data, searchTerm]);

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
  const fileInputRef = useRef(null);

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
    const newItem = { id: '', name: '', kana: '', category_rank: 'Take', type: 'Sake', price_cost: 0, capacity_ml: 1800, tags: [], sales_talk: '', pairing_hint: '', stock_level: 100, stock_bottles: 0, order_history: [], axisX: 50, axisY: 50 };
    setEditForm(newItem); setIsEditMode(true); setModalItem(newItem);
  };
  const handleOpenDetail = (item) => { setEditForm(item); setIsEditMode(false); setModalItem(item); };
  const startEdit = () => { setEditForm({ ...modalItem }); setIsEditMode(true); };
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
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file || !modalItem.id) { if(!modalItem.id) alert("先に商品を保存してください"); return; }
    try {
      setIsUploading(true);
      const storageRef = ref(storage, `images/${modalItem.id}_${Date.now()}.jpg`);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);
      await setDoc(doc(db, "sakeImages", "main"), { [modalItem.id]: downloadURL }, { merge: true });
      alert("画像保存完了！");
    } catch (error) { alert("アップロード失敗"); } finally { setIsUploading(false); }
  };

  const stats = modalItem ? analyzeHistory(modalItem.order_history) : null;

  return (
    <div className="w-full md:max-w-4xl mx-auto bg-white min-h-screen shadow-2xl overflow-hidden relative font-sans">
      <div className={`flex justify-between items-center p-3 border-b ${isSommelierMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'} transition-colors duration-300`}>
        <h1 className="font-bold text-lg flex items-center gap-2">{isSommelierMode ? <><User size={20}/> Sommelier Mode</> : 'Sake Manager'}</h1>
        <button onClick={() => setIsSommelierMode(!isSommelierMode)} className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${isSommelierMode ? 'bg-white text-gray-900' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{isSommelierMode ? <><LogOut size={14}/> Exit</> : <><User size={14}/> 接客モード</>}</button>
      </div>
      <TabNav activeTab={activeTab} setActiveTab={setActiveTab} isSommelierMode={isSommelierMode} />
      
      <div className="h-full">
        {activeTab === 'sake' && <MenuView data={sakeList.filter(d => d.type === 'Sake' || d.type === 'Liqueur')} onSelect={handleOpenDetail} onAdd={handleAddNew} cloudImages={cloudImages} placeholder="日本酒・果実酒..." isSommelierMode={isSommelierMode} />}
        {activeTab === 'shochu' && <MenuView data={sakeList.filter(d => d.type === 'Shochu')} onSelect={handleOpenDetail} onAdd={handleAddNew} cloudImages={cloudImages} placeholder="焼酎..." isSommelierMode={isSommelierMode} />}
        {activeTab === 'stock' && !isSommelierMode && <StockView data={sakeList} />}
        {activeTab === 'calc' && !isSommelierMode && <CalculatorView data={sakeList} />}
        {activeTab === 'map' && <MapView data={sakeList} cloudImages={cloudImages} onSelect={handleOpenDetail} />}
      </div>

      {/* Detail Modal */}
      {modalItem && (
        <div className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setModalItem(null)}>
          <div className="bg-white w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
            {/* Header / Image Area */}
            <div className="relative h-48 bg-gray-200 cursor-pointer group flex-shrink-0">
               {!isEditMode ? (
                 <div onClick={() => !isSommelierMode && !isUploading && fileInputRef.current?.click()} className="w-full h-full relative">
                   {cloudImages[modalItem.id] || modalItem.image ? (<img src={cloudImages[modalItem.id] || modalItem.image} className={`w-full h-full object-cover transition-opacity ${isUploading ? 'opacity-50' : ''}`} alt={modalItem.name} />) : (<div className="w-full h-full flex flex-col items-center justify-center text-gray-400 gap-2"><Camera size={48}/><span className="text-xs font-bold bg-white/80 px-2 py-1 rounded">写真登録</span></div>)}
                   {isUploading && <div className="absolute inset-0 flex items-center justify-center bg-black/30"><Loader className="animate-spin text-white" size={32} /></div>}
                 </div>
               ) : ( <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400 text-sm">※画像は保存後に変更可能</div> )}
               <input type="file" accept="image/*" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
               <button onClick={() => setModalItem(null)} className="absolute top-2 right-2 bg-black/50 text-white p-1 rounded-full z-10 hover:bg-black/70"><X size={20}/></button>
            </div>
            
            {/* Scrollable Content Area */}
            <div className="p-6 overflow-y-auto">
              {!isEditMode ? (
                <>
                  <div className="flex justify-between items-start mb-2"><div><h2 className="text-xl font-bold text-gray-800">{modalItem.name}</h2><p className="text-sm text-gray-500">{modalItem.kana}</p></div>{!isSommelierMode && (<button onClick={startEdit} className="text-gray-400 hover:text-blue-600 p-2"><Pencil size={20}/></button>)}</div>
                  <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-500 mb-4"><p className="text-blue-900 font-medium text-sm leading-relaxed">"{modalItem.sales_talk}"</p></div>
                  {modalItem.pairing_hint && (<div className="flex items-start gap-3 bg-orange-50 p-3 rounded-lg border border-orange-100 mb-6"><Utensils className="text-orange-500 mt-0.5" size={18} /><div><span className="block text-xs font-bold text-orange-800 mb-0.5">おすすめペアリング</span><p className="text-sm text-orange-900">{modalItem.pairing_hint}</p></div></div>)}
                  
                  {/* Analysis Dashboard (Admin Only) */}
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
                    </div>
                  )}
                </>
              ) : (
                <div className="space-y-4">
                  <div><label className="text-xs font-bold text-gray-500">商品名</label><input className="w-full border p-2 rounded" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} /></div>
                  <div><label className="text-xs font-bold text-gray-500">ふりがな</label><input className="w-full border p-2 rounded" value={editForm.kana} onChange={e => setEditForm({...editForm, kana: e.target.value})} /></div>
                  <div className="grid grid-cols-2 gap-2"><div><label className="text-xs font-bold text-gray-500">種別</label><select className="w-full border p-2 rounded" value={editForm.type} onChange={e => setEditForm({...editForm, type: e.target.value})}><option value="Sake">日本酒</option><option value="Shochu">焼酎</option><option value="Liqueur">リキュール</option></select></div><div><label className="text-xs font-bold text-gray-500">ランク</label><select className="w-full border p-2 rounded" value={editForm.category_rank} onChange={e => setEditForm({...editForm, category_rank: e.target.value})}><option value="Matsu">松</option><option value="Take">竹</option><option value="Ume">梅</option><option value="Shochu_Imo">芋焼酎</option><option value="Shochu_Mugi">麦焼酎</option></select></div></div>
                  <div className="grid grid-cols-2 gap-2"><div><label className="text-xs font-bold text-gray-500">仕入価格</label><input type="number" className="w-full border p-2 rounded" value={editForm.price_cost} onChange={e => setEditForm({...editForm, price_cost: Number(e.target.value)})} /></div><div><label className="text-xs font-bold text-gray-500">容量(ml)</label><input type="number" className="w-full border p-2 rounded" value={editForm.capacity_ml} onChange={e => setEditForm({...editForm, capacity_ml: Number(e.target.value)})} /></div></div>
                  <div><label className="text-xs font-bold text-gray-500">セールストーク</label><textarea className="w-full border p-2 rounded h-20" value={editForm.sales_talk} onChange={e => setEditForm({...editForm, sales_talk: e.target.value})} /></div>
                  <div><label className="text-xs font-bold text-gray-500">ペアリング</label><input className="w-full border p-2 rounded" value={editForm.pairing_hint} onChange={e => setEditForm({...editForm, pairing_hint: e.target.value})} /></div>
                  <div><label className="text-xs font-bold text-gray-500">タグ (カンマ区切り)</label><input className="w-full border p-2 rounded" value={editForm.tags?.join(',')} onChange={e => setEditForm({...editForm, tags: e.target.value.split(',')})} /></div>
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
