import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Search, Calculator, Map, Wine, GlassWater, ChevronRight, Camera, Upload, Loader, X, Utensils, Database, RefreshCw, Plus, Minus, BarChart3, TrendingUp, Pencil, Trash2, Save } from 'lucide-react';
import { db, storage } from './firebase';
import { doc, setDoc, onSnapshot, collection, updateDoc, arrayUnion, addDoc, deleteDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

// ==========================================
// 1. Components
// ==========================================
const TabNav = ({ activeTab, setActiveTab }) => (
  <div className="flex border-b border-gray-200 bg-white sticky top-0 z-10 shadow-sm overflow-x-auto">
    <button onClick={() => setActiveTab('sake')} className={`flex-1 min-w-[70px] py-3 flex flex-col md:flex-row justify-center items-center gap-1 text-xs font-medium ${activeTab === 'sake' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}><Wine size={18} /> 日本酒</button>
    <button onClick={() => setActiveTab('shochu')} className={`flex-1 min-w-[70px] py-3 flex flex-col md:flex-row justify-center items-center gap-1 text-xs font-medium ${activeTab === 'shochu' ? 'text-amber-600 border-b-2 border-amber-600' : 'text-gray-500'}`}><GlassWater size={18} /> 焼酎</button>
    <button onClick={() => setActiveTab('stock')} className={`flex-1 min-w-[70px] py-3 flex flex-col md:flex-row justify-center items-center gap-1 text-xs font-medium ${activeTab === 'stock' ? 'text-red-600 border-b-2 border-red-600' : 'text-gray-500'}`}><Database size={18} /> 資産</button>
    <button onClick={() => setActiveTab('calc')} className={`flex-1 min-w-[70px] py-3 flex flex-col md:flex-row justify-center items-center gap-1 text-xs font-medium ${activeTab === 'calc' ? 'text-green-600 border-b-2 border-green-600' : 'text-gray-500'}`}><Calculator size={18} /> 計算</button>
    <button onClick={() => setActiveTab('map')} className={`flex-1 min-w-[70px] py-3 flex flex-col md:flex-row justify-center items-center gap-1 text-xs font-medium ${activeTab === 'map' ? 'text-purple-600 border-b-2 border-purple-600' : 'text-gray-500'}`}><Map size={18} /> マップ</button>
  </div>
);

const getRankColor = (rank) => {
  switch (rank) {
    case 'Matsu': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'Take': return 'bg-green-100 text-green-800 border-green-200';
    case 'Ume': return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'Shochu_Imo': return 'bg-purple-100 text-purple-800 border-purple-200';
    case 'Shochu_Mugi': return 'bg-amber-100 text-amber-800 border-amber-200';
    default: return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

const analyzeHistory = (history = []) => {
  if (!history || history.length === 0) return { lastOrder: 'なし', total: 0, cycle: 'データ不足', monthly: [] };
  const dates = history.map(d => new Date(d)).sort((a, b) => a - b);
  const lastOrder = dates[dates.length - 1].toLocaleDateString('ja-JP');
  let cycle = 'データ不足';
  if (dates.length > 1) {
    const diffDays = Math.ceil(Math.abs(dates[dates.length - 1] - dates[0]) / (1000 * 60 * 60 * 24)); 
    cycle = Math.round(diffDays / (dates.length - 1)) + '日';
  }
  const monthlyCounts = {};
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(); d.setMonth(d.getMonth() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    monthlyCounts[key] = 0; months.push({ key, label: `${d.getMonth() + 1}月` });
  }
  dates.forEach(date => {
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    if (monthlyCounts[key] !== undefined) monthlyCounts[key]++;
  });
  return { lastOrder, total: history.length, cycle, monthly: months.map(m => ({ label: m.label, count: monthlyCounts[m.key] })) };
};

// ==========================================
// 3. Views
// ==========================================

const MenuView = ({ data, onSelect, cloudImages, placeholder, onAdd }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const filteredData = useMemo(() => {
    return data.filter(item => item.name.toLowerCase().includes(searchTerm.toLowerCase()) || item.kana.includes(searchTerm) || item.tags.some(tag => tag.includes(searchTerm)));
  }, [data, searchTerm]);

  return (
    <div className="p-4 bg-gray-50 min-h-screen pb-24 relative">
      <div className="relative mb-4">
        <Search className="absolute left-3 top-3 text-gray-400" size={20} />
        <input type="text" placeholder={placeholder} className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredData.map(item => {
          const displayImage = cloudImages[item.id] || item.image;
          const bottles = item.stock_bottles || 0;
          const level = item.stock_level ?? 100;
          return (
            <div key={item.id} onClick={() => onSelect(item)} className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 active:scale-[0.99] transition-transform cursor-pointer flex gap-4">
              <div className="w-20 h-20 bg-gray-100 rounded-lg flex-shrink-0 overflow-hidden border border-gray-200 relative">
                {displayImage ? (<img src={displayImage} alt={item.name} className="w-full h-full object-cover" />) : (<div className="w-full h-full flex items-center justify-center text-gray-300"><Camera size={24} /></div>)}
                <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] text-center py-0.5">残: {bottles > 0 ? `${bottles}本+${level}%` : `${level}%`}</div>
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
      {/* 新規登録ボタン (FAB) */}
      <button onClick={onAdd} className="fixed bottom-24 right-4 bg-blue-600 text-white p-4 rounded-full shadow-lg hover:bg-blue-700 active:scale-90 transition-transform z-30">
        <Plus size={24} />
      </button>
    </div>
  );
};

const StockView = ({ data }) => {
  const totalAssetValue = data.reduce((sum, item) => sum + (item.stock_bottles || 0) * item.price_cost + Math.round(item.price_cost * ((item.stock_level ?? 100) / 100)), 0);
  const updateStock = async (id, field, val) => { await updateDoc(doc(db, "sakeList", id), { [field]: val, stock_updated_at: new Date().toISOString() }); };
  const handleRestock = async (id, count) => {
    if(!confirm("納品登録：在庫を1本追加しますか？")) return;
    await updateDoc(doc(db, "sakeList", id), { stock_bottles: (count || 0) + 1, stock_updated_at: new Date().toISOString(), order_history: arrayUnion(new Date().toISOString()) });
  };

  return (
    <div className="p-4 bg-gray-50 min-h-screen pb-24">
      <div className="bg-gradient-to-r from-gray-800 to-gray-700 rounded-xl p-6 text-white shadow-lg mb-6">
        <p className="text-gray-300 text-xs font-bold uppercase tracking-wider mb-1">現在の棚卸し資産総額</p>
        <p className="text-3xl font-bold">¥ {totalAssetValue.toLocaleString()}</p>
      </div>
      <div className="space-y-4">
        {data.map(item => (
          <div key={item.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
            <div className="flex justify-between items-start mb-4">
              <div><h3 className="font-bold text-gray-800">{item.name}</h3><span className="text-xs text-gray-500">原価: ¥{item.price_cost.toLocaleString()}</span></div>
              <button onClick={() => handleRestock(item.id, item.stock_bottles)} className="flex flex-col items-center justify-center bg-green-50 text-green-700 px-3 py-2 rounded-lg border border-green-200 hover:bg-green-100"><RefreshCw size={16} /><span className="text-[10px] font-bold mt-1">納品 (+1)</span></button>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-gray-50 p-2 rounded-lg"><span className="text-xs font-bold text-gray-600">未開封在庫</span><div className="flex items-center gap-3"><button onClick={() => updateStock(item.id, 'stock_bottles', Math.max(0, (item.stock_bottles||0)-1))} className="w-8 h-8 flex items-center justify-center bg-white border rounded-full shadow-sm"><Minus size={16}/></button><span className="font-bold text-lg w-6 text-center">{item.stock_bottles || 0}</span><button onClick={() => updateStock(item.id, 'stock_bottles', (item.stock_bottles||0)+1)} className="w-8 h-8 flex items-center justify-center bg-white border rounded-full shadow-sm"><Plus size={16}/></button></div></div>
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
  const selectedItem = data.find(i => i.id === selectedId) || data[0];
  if (!selectedItem) return <div className="p-10 text-center"><Loader className="animate-spin mx-auto"/></div>;
  const mlCost = selectedItem.price_cost / selectedItem.capacity_ml;
  const idealPrice = Math.round(Math.round(mlCost * servingSize) / (targetCostRate / 100));

  return (
    <div className="p-4 bg-gray-50 min-h-screen">
       <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-6">
        <h2 className="text-gray-500 text-sm font-bold mb-4 uppercase tracking-wider">Parameters</h2>
        <div className="mb-4"><label className="block text-sm font-medium text-gray-700 mb-1">対象商品</label><select className="w-full p-2 border border-gray-300 rounded-md" value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>{data.map(item => (<option key={item.id} value={item.id}>{item.name}</option>))}</select></div>
        <div className="mb-6"><div className="flex justify-between mb-1"><label className="text-sm font-medium text-gray-700">提供量</label><span className="text-sm font-bold text-blue-600">{servingSize} ml</span></div><input type="range" min="30" max="360" step="10" value={servingSize} onChange={(e) => setServingSize(Number(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer" /></div>
        <div className="mb-2"><div className="flex justify-between mb-1"><label className="text-sm font-medium text-gray-700">目標原価率</label><span className="text-sm font-bold text-green-600">{targetCostRate}%</span></div><input type="range" min="10" max="100" step="5" value={targetCostRate} onChange={(e) => setTargetCostRate(Number(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer" /></div>
       </div>
       <div className="bg-white p-6 rounded-xl shadow-lg border-t-4 border-green-500 text-center"><p className="text-sm text-gray-500">推奨売価 (税抜)</p><p className="text-4xl font-bold text-gray-800">¥{idealPrice.toLocaleString()}</p></div>
    </div>
  );
};

const MapView = ({ data, cloudImages, onSelect }) => {
  const [mapType, setMapType] = useState('Sake'); 
  return (
    <div className="p-4 bg-gray-50 min-h-screen flex flex-col">
       <div className="flex justify-center mb-4"><div className="bg-gray-200 p-1 rounded-lg flex"><button onClick={() => setMapType('Sake')} className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${mapType === 'Sake' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>日本酒</button><button onClick={() => setMapType('Shochu')} className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${mapType === 'Shochu' ? 'bg-white text-amber-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>焼酎</button></div></div>
       <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex-grow relative overflow-hidden p-4 min-h-[400px]">
        <div className="absolute top-2 left-1/2 transform -translate-x-1/2 text-xs font-bold text-gray-400">華やか・香り高</div>
        <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 text-xs font-bold text-gray-400">穏やか・スッキリ</div>
        <div className="absolute left-2 top-1/2 transform -translate-y-1/2 -rotate-90 text-xs font-bold text-gray-400">甘口・芳醇</div>
        <div className="absolute right-2 top-1/2 transform -translate-y-1/2 rotate-90 text-xs font-bold text-gray-400">辛口・キレ</div>
        <div className="absolute top-1/2 left-4 right-4 h-px bg-gray-100"></div>
        <div className="absolute left-1/2 top-4 bottom-4 w-px bg-gray-100"></div>
        {data.filter(d => d.type === mapType).map(item => {
          const displayImage = cloudImages[item.id] || item.image;
          return (
            <div key={item.id} onClick={() => onSelect(item)} className="absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center group cursor-pointer hover:z-50 hover:scale-110 transition-transform" style={{ left: `${item.axisX || 50}%`, top: `${100 - (item.axisY || 50)}%` }}>
              <div className={`w-8 h-8 md:w-10 md:h-10 rounded-full border-2 overflow-hidden shadow-md bg-white ${item.category_rank.includes('Matsu') ? 'border-yellow-500' : item.category_rank.includes('Take') ? 'border-green-500' : item.category_rank.includes('Shochu') ? 'border-amber-500' : 'border-blue-500'}`}>
                {displayImage ? (<img src={displayImage} alt={item.name} className="w-full h-full object-cover" />) : (<div className="w-full h-full bg-gray-100"></div>)}
              </div>
              <span className="text-[9px] md:text-[10px] font-bold text-gray-700 bg-white/90 px-1 rounded shadow-sm mt-1 whitespace-nowrap z-20">{item.name}</span>
            </div>
          );
        })}
       </div>
    </div>
  );
};

// ==========================================
// 4. Main App Container
// ==========================================
export default function SakeManagerApp() {
  const [activeTab, setActiveTab] = useState('sake');
  const [modalItem, setModalItem] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false); // 編集モードか閲覧モードか
  const [editForm, setEditForm] = useState({}); // 編集中のデータ
  const [cloudImages, setCloudImages] = useState({});
  const [isUploading, setIsUploading] = useState(false);
  const [sakeList, setSakeList] = useState([]);
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

  // 新規登録ボタンを押した時
  const handleAddNew = () => {
    const newItem = {
      id: '', // 新規なのでIDなし
      name: '', kana: '', category_rank: 'Take', type: 'Sake',
      price_cost: 0, capacity_ml: 1800, tags: [], sales_talk: '', pairing_hint: '',
      stock_level: 100, stock_bottles: 0, order_history: [],
      axisX: 50, axisY: 50
    };
    setEditForm(newItem);
    setIsEditMode(true);
    setModalItem(newItem); // モーダルを開く
  };

  // 詳細を開く時
  const handleOpenDetail = (item) => {
    setEditForm(item);
    setIsEditMode(false);
    setModalItem(item);
  };

  // 編集モード開始
  const startEdit = () => {
    setEditForm({ ...modalItem });
    setIsEditMode(true);
  };

  // 保存処理 (新規 or 更新)
  const handleSave = async () => {
    if (!editForm.name) return alert("商品名は必須です");
    
    try {
      if (modalItem.id) {
        // 更新
        const ref = doc(db, "sakeList", modalItem.id);
        await updateDoc(ref, editForm);
        alert("更新しました！");
      } else {
        // 新規作成
        const newRef = await addDoc(collection(db, "sakeList"), editForm);
        alert("新規登録しました！");
      }
      setModalItem(null);
      setIsEditMode(false);
    } catch (e) {
      console.error(e);
      alert("エラーが発生しました: " + e.message);
    }
  };

  // 削除処理
  const handleDelete = async () => {
    if (!confirm("本当にこの商品を削除しますか？")) return;
    try {
      await deleteDoc(doc(db, "sakeList", modalItem.id));
      alert("削除しました");
      setModalItem(null);
    } catch (e) {
      alert("削除エラー: " + e.message);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file || !modalItem.id) {
        if(!modalItem.id) alert("先に商品を保存してください（新規作成時は画像アップロードは保存後に行えます）");
        return;
    }
    try {
      setIsUploading(true);
      const storageRef = ref(storage, `images/${modalItem.id}_${Date.now()}.jpg`);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);
      await setDoc(doc(db, "sakeImages", "main"), { [modalItem.id]: downloadURL }, { merge: true });
      alert("画像保存完了！");
    } catch (error) {
      alert("アップロード失敗");
    } finally {
      setIsUploading(false);
    }
  };

  const stats = modalItem ? analyzeHistory(modalItem.order_history) : null;

  return (
    <div className="w-full md:max-w-4xl mx-auto bg-white min-h-screen shadow-2xl overflow-hidden relative">
      <TabNav activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <div className="h-full">
        {activeTab === 'sake' && <MenuView data={sakeList.filter(d => d.type === 'Sake' || d.type === 'Liqueur')} onSelect={handleOpenDetail} onAdd={handleAddNew} cloudImages={cloudImages} placeholder="日本酒・果実酒..." />}
        {activeTab === 'shochu' && <MenuView data={sakeList.filter(d => d.type === 'Shochu')} onSelect={handleOpenDetail} onAdd={handleAddNew} cloudImages={cloudImages} placeholder="焼酎..." />}
        {activeTab === 'stock' && <StockView data={sakeList} />}
        {activeTab === 'calc' && <CalculatorView data={sakeList} />}
        {activeTab === 'map' && <MapView data={sakeList} cloudImages={cloudImages} onSelect={handleOpenDetail} />}
      </div>

      {modalItem && (
        <div className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4" onClick={() => setModalItem(null)}>
          <div className="bg-white w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            {/* ヘッダー画像エリア */}
            <div className="relative h-48 bg-gray-200 cursor-pointer group">
               {!isEditMode && (
                 <div onClick={() => !isUploading && fileInputRef.current?.click()} className="w-full h-full">
                   {cloudImages[modalItem.id] || modalItem.image ? (
                     <img src={cloudImages[modalItem.id] || modalItem.image} className={`w-full h-full object-cover ${isUploading ? 'opacity-50' : ''}`} alt={modalItem.name} />
                   ) : (
                     <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 gap-2"><Camera size={48}/><span className="text-xs font-bold bg-white/80 px-2 py-1 rounded">写真登録</span></div>
                   )}
                 </div>
               )}
               {isEditMode && <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400 text-sm">※画像は保存後に変更可能</div>}
               
               <input type="file" accept="image/*" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
               <button onClick={() => setModalItem(null)} className="absolute top-2 right-2 bg-black/50 text-white p-1 rounded-full z-10"><X size={20}/></button>
            </div>

            <div className="p-6">
              {/* 閲覧モード vs 編集モード 切り替え */}
              {!isEditMode ? (
                <>
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className="text-xl font-bold text-gray-800">{modalItem.name}</h2>
                      <p className="text-sm text-gray-500 mb-4">{modalItem.kana}</p>
                    </div>
                    <button onClick={startEdit} className="text-gray-400 hover:text-blue-600"><Pencil size={20}/></button>
                  </div>
                  
                  <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-500 mb-4">
                    <p className="text-blue-900 font-medium text-sm leading-relaxed">"{modalItem.sales_talk}"</p>
                  </div>
                  {modalItem.pairing_hint && (
                    <div className="flex items-start gap-3 bg-orange-50 p-3 rounded-lg border border-orange-100 mb-6">
                       <Utensils className="text-orange-500 mt-0.5" size={18} />
                       <div><span className="block text-xs font-bold text-orange-800 mb-0.5">おすすめペアリング</span><p className="text-sm text-orange-900">{modalItem.pairing_hint}</p></div>
                    </div>
                  )}

                  {/* 分析エリア */}
                  <div className="border-t pt-6">
                    <div className="flex items-center gap-2 mb-4"><BarChart3 className="text-gray-400" size={20}/><h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Analysis</h3></div>
                    <div className="grid grid-cols-3 gap-2 mb-4">
                      <div className="bg-gray-50 p-2 rounded-lg text-center"><span className="block text-[10px] text-gray-500">最終納品</span><span className="block font-bold text-sm">{stats.lastOrder}</span></div>
                      <div className="bg-gray-50 p-2 rounded-lg text-center"><span className="block text-[10px] text-gray-500">累計</span><span className="block font-bold text-sm">{stats.total}回</span></div>
                      <div className="bg-gray-50 p-2 rounded-lg text-center"><span className="block text-[10px] text-gray-500">サイクル</span><span className="block font-bold text-sm text-blue-600">{stats.cycle}</span></div>
                    </div>
                    <div className="bg-white border border-gray-100 p-4 rounded-lg shadow-inner">
                      <div className="flex items-end justify-between h-24 gap-1">
                        {stats.monthly.map((m, i) => {
                          const max = Math.max(...stats.monthly.map(d => d.count)) || 1;
                          return (<div key={i} className="flex-1 flex flex-col items-center"><div className={`w-full max-w-[20px] rounded-t-sm ${m.count > 0 ? 'bg-blue-400' : 'bg-gray-100'}`} style={{ height: `${(m.count/max)*100}%`, minHeight: m.count>0?'4px':'2px' }}></div><span className="text-[9px] text-gray-400 mt-1">{m.label.replace('月','')}</span></div>);
                        })}
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                /* === 編集フォーム === */
                <div className="space-y-4">
                  <div><label className="text-xs font-bold text-gray-500">商品名</label><input className="w-full border p-2 rounded" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} /></div>
                  <div><label className="text-xs font-bold text-gray-500">ふりがな</label><input className="w-full border p-2 rounded" value={editForm.kana} onChange={e => setEditForm({...editForm, kana: e.target.value})} /></div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><label className="text-xs font-bold text-gray-500">種別</label><select className="w-full border p-2 rounded" value={editForm.type} onChange={e => setEditForm({...editForm, type: e.target.value})}><option value="Sake">日本酒</option><option value="Shochu">焼酎</option><option value="Liqueur">リキュール</option></select></div>
                    <div><label className="text-xs font-bold text-gray-500">ランク</label><select className="w-full border p-2 rounded" value={editForm.category_rank} onChange={e => setEditForm({...editForm, category_rank: e.target.value})}><option value="Matsu">松</option><option value="Take">竹</option><option value="Ume">梅</option><option value="Shochu_Imo">芋焼酎</option><option value="Shochu_Mugi">麦焼酎</option></select></div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><label className="text-xs font-bold text-gray-500">仕入価格</label><input type="number" className="w-full border p-2 rounded" value={editForm.price_cost} onChange={e => setEditForm({...editForm, price_cost: Number(e.target.value)})} /></div>
                    <div><label className="text-xs font-bold text-gray-500">容量(ml)</label><input type="number" className="w-full border p-2 rounded" value={editForm.capacity_ml} onChange={e => setEditForm({...editForm, capacity_ml: Number(e.target.value)})} /></div>
                  </div>
                  <div><label className="text-xs font-bold text-gray-500">セールストーク</label><textarea className="w-full border p-2 rounded h-20" value={editForm.sales_talk} onChange={e => setEditForm({...editForm, sales_talk: e.target.value})} /></div>
                  <div><label className="text-xs font-bold text-gray-500">ペアリング</label><input className="w-full border p-2 rounded" value={editForm.pairing_hint} onChange={e => setEditForm({...editForm, pairing_hint: e.target.value})} /></div>
                  <div><label className="text-xs font-bold text-gray-500">タグ (カンマ区切り)</label><input className="w-full border p-2 rounded" value={editForm.tags?.join(',')} onChange={e => setEditForm({...editForm, tags: e.target.value.split(',')})} /></div>
                  
                  {/* マップ座標調整 (簡易スライダー) */}
                  <div className="bg-gray-50 p-3 rounded">
                    <p className="text-xs font-bold mb-2">マップ位置調整</p>
                    <div className="flex gap-2 text-xs items-center mb-2"><span>甘</span><input type="range" className="flex-grow" value={editForm.axisX || 50} onChange={e => setEditForm({...editForm, axisX: Number(e.target.value)})} /><span>辛</span></div>
                    <div className="flex gap-2 text-xs items-center"><span>穏</span><input type="range" className="flex-grow" value={editForm.axisY || 50} onChange={e => setEditForm({...editForm, axisY: Number(e.target.value)})} /><span>華</span></div>
                  </div>

                  <div className="flex gap-2 pt-4 border-t">
                    {modalItem.id && <button onClick={handleDelete} className="flex-1 bg-red-100 text-red-600 py-3 rounded-lg font-bold flex items-center justify-center gap-2"><Trash2 size={18}/> 削除</button>}
                    <button onClick={handleSave} className="flex-[2] bg-blue-600 text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2"><Save size={18}/> 保存</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}