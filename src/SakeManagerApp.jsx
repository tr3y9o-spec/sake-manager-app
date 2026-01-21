import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Search, Calculator, Map, BookOpen, RotateCcw, Camera, Upload, Loader, X, Utensils } from 'lucide-react';
import sakeData from './sakeData';
import { db, storage } from './firebase';
import { doc, setDoc, onSnapshot } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

// ==========================================
// 1. UI Components
// ==========================================
const TabNav = ({ activeTab, setActiveTab }) => (
  <div className="flex border-b border-gray-200 bg-white sticky top-0 z-10 shadow-sm safe-top">
    <button onClick={() => setActiveTab('menu')} className={`flex-1 py-4 flex justify-center items-center gap-2 text-sm font-medium ${activeTab === 'menu' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}><BookOpen size={18} /> 図鑑</button>
    <button onClick={() => setActiveTab('calc')} className={`flex-1 py-4 flex justify-center items-center gap-2 text-sm font-medium ${activeTab === 'calc' ? 'text-green-600 border-b-2 border-green-600' : 'text-gray-500'}`}><Calculator size={18} /> 計算</button>
    <button onClick={() => setActiveTab('map')} className={`flex-1 py-4 flex justify-center items-center gap-2 text-sm font-medium ${activeTab === 'map' ? 'text-purple-600 border-b-2 border-purple-600' : 'text-gray-500'}`}><Map size={18} /> マップ</button>
  </div>
);

const getRankColor = (rank) => {
  switch (rank) {
    case 'Matsu': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'Take': return 'bg-green-100 text-green-800 border-green-200';
    case 'Ume': return 'bg-blue-100 text-blue-800 border-blue-200';
    default: return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

const MenuView = ({ data, onSelect, cloudImages }) => {
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
        <input type="text" placeholder="銘柄、特徴で検索..." className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
      </div>
      <div className="space-y-3">
        {filteredData.map(item => {
          const displayImage = cloudImages[item.id] || item.image;
          return (
            <div key={item.id} onClick={() => onSelect(item)} className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 active:scale-[0.99] transition-transform cursor-pointer flex gap-4">
              <div className="w-20 h-20 bg-gray-100 rounded-lg flex-shrink-0 overflow-hidden border border-gray-200 relative">
                {displayImage ? <img src={displayImage} alt={item.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-gray-300"><Camera size={24} /></div>}
              </div>
              <div className="flex-grow">
                <div><span className={`text-[10px] px-2 py-0.5 rounded-full border ${getRankColor(item.category_rank)} mr-2`}>{item.category_rank}</span><h3 className="text-base font-bold text-gray-800 mt-1">{item.name}</h3></div>
                <div className="flex flex-wrap gap-1 mb-2">{item.tags.slice(0, 3).map(tag => (<span key={tag} className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">#{tag}</span>))}</div>
                <p className="text-xs text-blue-900 bg-blue-50 p-1.5 rounded border-l-2 border-blue-400 truncate">{item.sales_talk}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const CalculatorView = ({ data }) => {
  const [selectedId, setSelectedId] = useState(data[0].id);
  const [targetCostRate, setTargetCostRate] = useState(30);
  const [servingSize, setServingSize] = useState(90);
  const selectedItem = data.find(i => i.id === selectedId) || data[0];
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
            {data.map(item => (<option key={item.id} value={item.id}>{item.name} (¥{item.price_cost.toLocaleString()})</option>))}
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
    </div>
  );
};

const MapView = ({ data, onClose, cloudImages }) => {
  return (
    <div className="fixed inset-0 bg-white z-50 overflow-hidden" style={{ width: '100vh', height: '100vw', transform: 'rotate(90deg)', transformOrigin: 'top left', left: '100%' }}>
      <div className="relative w-full h-full bg-gray-50 p-4">
        <button onClick={onClose} className="absolute top-4 right-4 z-50 bg-white p-2 rounded-full shadow-lg text-gray-600 border border-gray-200 flex items-center gap-2"><RotateCcw size={16} /> 戻る</button>
        <div className="w-full h-full bg-white rounded-xl shadow-inner border border-gray-200 relative overflow-hidden">
          <div className="absolute top-2 left-1/2 transform -translate-x-1/2 text-sm font-bold text-gray-400 bg-white/80 px-2 rounded z-10">華やか・香り高</div>
          <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 text-sm font-bold text-gray-400 bg-white/80 px-2 rounded z-10">穏やか・スッキリ</div>
          <div className="absolute left-2 top-1/2 transform -translate-y-1/2 text-sm font-bold text-gray-400 bg-white/80 px-2 rounded writing-vertical z-10" style={{writingMode: 'vertical-rl'}}>甘口・芳醇</div>
          <div className="absolute right-2 top-1/2 transform -translate-y-1/2 text-sm font-bold text-gray-400 bg-white/80 px-2 rounded writing-vertical z-10" style={{writingMode: 'vertical-rl'}}>辛口・キレ</div>
          <div className="absolute top-1/2 left-0 right-0 h-px bg-gray-200 dashed"></div>
          <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gray-200 dashed"></div>
          {data.filter(d => d.type === 'Sake' || d.type === 'Shochu').map(item => {
            const x = item.axisX || 50; const y = item.axisY || 50;
            const displayImage = cloudImages[item.id] || item.image;
            return (
              <div key={item.id} className="absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center group" style={{ left: `${x}%`, top: `${100 - y}%` }}>
                <div className={`w-10 h-10 rounded-full border-2 overflow-hidden shadow-md bg-white ${item.category_rank === 'Matsu' ? 'border-yellow-500' : item.category_rank === 'Take' ? 'border-green-500' : 'border-blue-500'}`}>
                  {displayImage ? (<img src={displayImage} alt={item.name} className="w-full h-full object-cover" />) : (<div className="w-full h-full bg-gray-100 flex items-center justify-center text-[8px] text-gray-500">No Img</div>)}
                </div>
                <span className="text-[10px] font-bold text-gray-700 bg-white/90 px-1 rounded shadow-sm mt-1 whitespace-nowrap z-20">{item.name}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 2. Main App Container
// ==========================================
export default function SakeManagerApp() {
  const [activeTab, setActiveTab] = useState('menu');
  const [modalItem, setModalItem] = useState(null);
  const [cloudImages, setCloudImages] = useState({});
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!db) { console.warn("Firebase is not initialized."); return; }
    try {
      const unsub = onSnapshot(doc(db, "sakeImages", "main"), (doc) => {
        if (doc.exists()) setCloudImages(doc.data());
      });
      return () => unsub();
    } catch (e) {
      console.log("Firebase Error:", e);
    }
  }, []);

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file || !modalItem || !storage) {
        if(!storage) alert("Firebase設定を確認してください");
        return;
    }
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

  const isMapMode = activeTab === 'map';

  return (
    <div className="max-w-md mx-auto bg-white min-h-screen shadow-2xl overflow-hidden relative">
      {!isMapMode && <TabNav activeTab={activeTab} setActiveTab={setActiveTab} />}
      <div className="h-full">
        {activeTab === 'menu' && <MenuView data={sakeData} onSelect={setModalItem} cloudImages={cloudImages} />}
        {activeTab === 'calc' && <CalculatorView data={sakeData} />}
        {isMapMode && <MapView data={sakeData} onClose={() => setActiveTab('menu')} cloudImages={cloudImages} />}
      </div>
      {modalItem && (
        <div className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4" onClick={() => setModalItem(null)}>
          <div className="bg-white w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="relative h-48 bg-gray-200 cursor-pointer group" onClick={() => !isUploading && fileInputRef.current?.click()}>
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

              {/* 新機能: ペアリングヒントの表示 */}
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