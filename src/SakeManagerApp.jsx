import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Search, Calculator, Map, Wine, GlassWater, ChevronRight, Camera, Upload, Loader, X, Utensils, Database, RefreshCw } from 'lucide-react';
import { db, storage } from './firebase';
import { doc, setDoc, onSnapshot, collection, updateDoc, arrayUnion } from "firebase/firestore";
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

// ==========================================
// 2. Views
// ==========================================

// 【Mode: Menu】共通メニュー
const MenuView = ({ data, onSelect, cloudImages, placeholder }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const filteredData = useMemo(() => {
    return data.filter(item => 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.kana.includes(searchTerm) ||
      item.tags.some(tag => tag.includes(searchTerm))
    );
  }, [data, searchTerm]);

  return (
    <div className="p-4 bg-gray-50 min-h-screen pb-24">
      <div className="relative mb-4">
        <Search className="absolute left-3 top-3 text-gray-400" size={20} />
        <input type="text" placeholder={placeholder} className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredData.map(item => {
          const displayImage = cloudImages[item.id] || item.image;
          return (
            <div key={item.id} onClick={() => onSelect(item)} className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 active:scale-[0.99] transition-transform cursor-pointer flex gap-4">
              <div className="w-20 h-20 bg-gray-100 rounded-lg flex-shrink-0 overflow-hidden border border-gray-200 relative">
                {displayImage ? (<img src={displayImage} alt={item.name} className="w-full h-full object-cover" />) : (<div className="w-full h-full flex items-center justify-center text-gray-300"><Camera size={24} /></div>)}
                {/* 在庫バッジ */}
                <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] text-center py-0.5">
                   残: {item.stock_level ?? 100}%
                </div>
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
    </div>
  );
};

// 【Mode: Stock】資産・在庫管理 (NEW!)
const StockView = ({ data }) => {
  // 資産総額計算 (現在の残量に基づく原価総額)
  const totalAssetValue = data.reduce((sum, item) => {
    const stockPercent = item.stock_level ?? 100;
    return sum + Math.round(item.price_cost * (stockPercent / 100));
  }, 0);

  const updateStock = async (id, newLevel) => {
    const ref = doc(db, "sakeList", id);
    await updateDoc(ref, { stock_level: newLevel, stock_updated_at: new Date().toISOString() });
  };

  const handleRestock = async (id) => {
    if(!confirm("納品登録：在庫を100%に戻し、履歴を記録しますか？")) return;
    const ref = doc(db, "sakeList", id);
    // 在庫を100にし、履歴配列に現在時刻を追加
    await updateDoc(ref, { 
      stock_level: 100, 
      stock_updated_at: new Date().toISOString(),
      order_history: arrayUnion(new Date().toISOString()) 
    });
  };

  return (
    <div className="p-4 bg-gray-50 min-h-screen pb-24">
      {/* 資産ダッシュボード */}
      <div className="bg-gradient-to-r from-gray-800 to-gray-700 rounded-xl p-6 text-white shadow-lg mb-6">
        <p className="text-gray-300 text-xs font-bold uppercase tracking-wider mb-1">現在の棚卸し資産総額 (推計)</p>
        <p className="text-3xl font-bold">¥ {totalAssetValue.toLocaleString()}</p>
        <p className="text-xs text-gray-400 mt-2 text-right">※開封済みボトルを含む原価合計</p>
      </div>

      <div className="space-y-4">
        {data.map(item => (
          <div key={item.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-bold text-gray-800">{item.name}</h3>
              <span className="text-xs text-gray-500">¥{item.price_cost.toLocaleString()}</span>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex-grow">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-500">残量</span>
                  <span className={`font-bold ${item.stock_level < 20 ? 'text-red-600' : 'text-blue-600'}`}>{item.stock_level ?? 100}%</span>
                </div>
                <input 
                  type="range" 
                  min="0" max="100" step="10" 
                  value={item.stock_level ?? 100} 
                  onChange={(e) => updateStock(item.id, Number(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
              </div>
              <button 
                onClick={() => handleRestock(item.id)}
                className="flex flex-col items-center justify-center bg-green-50 text-green-700 p-2 rounded-lg border border-green-200 hover:bg-green-100 active:scale-95 transition-transform"
              >
                <RefreshCw size={16} />
                <span className="text-[10px] font-bold mt-1">納品</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// 【Mode: Calculator】原価計算
const CalculatorView = ({ data }) => {
  const [selectedId, setSelectedId] = useState(data[0]?.id);
  const [targetCostRate, setTargetCostRate] = useState(30);
  const [servingSize, setServingSize] = useState(90);

  // データ読み込み前など、selectedIdが無い場合のガード
  const selectedItem = data.find(i => i.id === selectedId) || data[0];
  
  if (!selectedItem) return <div className="p-10 text-center"><Loader className="animate-spin mx-auto"/></div>;

  const mlCost = selectedItem.price_cost / selectedItem.capacity_ml;
  const servingCost = Math.round(mlCost * servingSize);
  const idealPrice = Math.round(servingCost / (targetCostRate / 100));

  return (
    <div className="p-4 bg-gray-50 min-h-screen">
       <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-6">
        <h2 className="text-gray-500 text-sm font-bold mb-4 uppercase tracking-wider">Parameters</h2>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">対象商品</label>
          <select className="w-full p-2 border border-gray-300 rounded-md" value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
            {data.map(item => (<option key={item.id} value={item.id}>{item.name}</option>))}
          </select>
        </div>
        <div className="mb-6"><div className="flex justify-between mb-1"><label className="text-sm font-medium text-gray-700">提供量</label><span className="text-sm font-bold text-blue-600">{servingSize} ml</span></div><input type="range" min="30" max="360" step="10" value={servingSize} onChange={(e) => setServingSize(Number(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer" /></div>
        <div className="mb-2"><div className="flex justify-between mb-1"><label className="text-sm font-medium text-gray-700">目標原価率</label><span className="text-sm font-bold text-green-600">{targetCostRate}%</span></div><input type="range" min="10" max="100" step="5" value={targetCostRate} onChange={(e) => setTargetCostRate(Number(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer" /></div>
       </div>
       <div className="bg-white p-6 rounded-xl shadow-lg border-t-4 border-green-500 text-center">
          <p className="text-sm text-gray-500">推奨売価 (税抜)</p>
          <p className="text-4xl font-bold text-gray-800">¥{idealPrice.toLocaleString()}</p>
          <div className="flex justify-center gap-4 text-sm mt-2"><span className="text-gray-500">原価: ¥{servingCost}</span><span className="text-gray-500">粗利: ¥{idealPrice - servingCost}</span></div>
       </div>
       <div className="mt-6 p-3 bg-yellow-50 rounded text-xs text-yellow-800 border border-yellow-200">
         <p className="mb-1">💡 <strong>Manager's Note:</strong></p>
         {selectedItem.category_rank === 'Matsu' ? <p>高単価商品です。原価率40%許容で満足度UPを狙いましょう。</p> : <p>標準的な設定でOKです。</p>}
       </div>
    </div>
  );
};

// 【Mode: Map】ポジショニングマップ
const MapView = ({ data, cloudImages, onSelect }) => {
  const [mapType, setMapType] = useState('Sake'); 

  return (
    <div className="p-4 bg-gray-50 min-h-screen flex flex-col">
       <div className="flex justify-center mb-4">
         <div className="bg-gray-200 p-1 rounded-lg flex">
           <button onClick={() => setMapType('Sake')} className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${mapType === 'Sake' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>日本酒</button>
           <button onClick={() => setMapType('Shochu')} className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${mapType === 'Shochu' ? 'bg-white text-amber-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>焼酎</button>
         </div>
       </div>
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
       <p className="text-center text-xs text-gray-400 mt-2">※アイコンをタップで詳細を表示</p>
    </div>
  );
};

// ==========================================
// 3. Main App Container
// ==========================================
export default function SakeManagerApp() {
  const [activeTab, setActiveTab] = useState('sake');
  const [modalItem, setModalItem] = useState(null);
  const [cloudImages, setCloudImages] = useState({});
  const [isUploading, setIsUploading] = useState(false);
  
  // ★重要：ここが「固定データ」から「Firestore」に変わりました！
  const [sakeList, setSakeList] = useState([]);
  
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!db) return;

    // 1. 商品データのリアルタイム同期
    const unsubList = onSnapshot(collection(db, "sakeList"), (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSakeList(list);
    });

    // 2. 画像URLのリアルタイム同期
    const unsubImages = onSnapshot(doc(db, "sakeImages", "main"), (doc) => {
      if (doc.exists()) setCloudImages(doc.data());
    });

    return () => {
      unsubList();
      unsubImages();
    };
  }, []);

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file || !modalItem || !storage) return;
    try {
      setIsUploading(true);
      const storageRef = ref(storage, `images/${modalItem.id}_${Date.now()}.jpg`);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);
      await setDoc(doc(db, "sakeImages", "main"), { [modalItem.id]: downloadURL }, { merge: true });
      alert("画像が保存されました！");
    } catch (error) {
      console.error("Upload Error:", error);
      alert("アップロード失敗");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="w-full md:max-w-4xl mx-auto bg-white min-h-screen shadow-2xl overflow-hidden relative">
      <TabNav activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <div className="h-full">
        {activeTab === 'sake' && (
          <MenuView 
            data={sakeList.filter(d => d.type === 'Sake' || d.type === 'Liqueur')} 
            onSelect={setModalItem} 
            cloudImages={cloudImages} 
            placeholder="日本酒・果実酒を検索..."
          />
        )}
        
        {activeTab === 'shochu' && (
          <MenuView 
            data={sakeList.filter(d => d.type === 'Shochu')} 
            onSelect={setModalItem} 
            cloudImages={cloudImages} 
            placeholder="焼酎を検索..."
          />
        )}

        {/* 新しい「資産・在庫」タブ */}
        {activeTab === 'stock' && <StockView data={sakeList} />}

        {activeTab === 'calc' && <CalculatorView data={sakeList} />}
        
        {activeTab === 'map' && <MapView data={sakeList} cloudImages={cloudImages} onSelect={setModalItem} />}
      </div>

      {/* 詳細モーダル */}
      {modalItem && (
        <div className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4" onClick={() => setModalItem(null)}>
          <div className="bg-white w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
            <div className="relative h-64 bg-gray-200 cursor-pointer group" onClick={() => !isUploading && fileInputRef.current?.click()}>
               {cloudImages[modalItem.id] || modalItem.image ? (
                 <img src={cloudImages[modalItem.id] || modalItem.image} className={`w-full h-full object-cover transition-opacity ${isUploading ? 'opacity-50' : ''}`} alt={modalItem.name} />
               ) : (
                 <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 gap-2"><Camera size={48}/><span className="text-xs font-bold bg-white/80 px-2 py-1 rounded">写真を登録</span></div>
               )}
               {isUploading && <div className="absolute inset-0 flex items-center justify-center bg-black/30"><Loader className="animate-spin text-white" size={32} /></div>}
               <input type="file" accept="image/*" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
               {!isUploading && <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white font-bold"><Upload size={24} className="mr-2"/> 写真を変更</div>}
               <button onClick={(e) => { e.stopPropagation(); setModalItem(null); }} className="absolute top-2 right-2 bg-black/50 text-white p-1 rounded-full hover:bg-black/70"><X size={20}/></button>
            </div>
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-800">{modalItem.name}</h2>
              <p className="text-sm text-gray-500 mb-4">{modalItem.kana}</p>
              
              <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-500 mb-4">
                <p className="text-blue-900 font-medium text-sm leading-relaxed">"{modalItem.sales_talk}"</p>
              </div>

              {modalItem.pairing_hint && (
                <div className="flex items-start gap-3 bg-orange-50 p-3 rounded-lg border border-orange-100 mb-4">
                   <Utensils className="text-orange-500 mt-0.5" size={18} />
                   <div>
                     <span className="block text-xs font-bold text-orange-800 mb-0.5">おすすめペアリング</span>
                     <p className="text-sm text-orange-900">{modalItem.pairing_hint}</p>
                   </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 text-sm border-t pt-4"><div><span className="block text-gray-400 text-xs">Capacity</span><span className="font-bold">{modalItem.capacity_ml}ml</span></div><div><span className="block text-gray-400 text-xs">Cost</span><span className="font-bold">¥{modalItem.price_cost.toLocaleString()}</span></div></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}