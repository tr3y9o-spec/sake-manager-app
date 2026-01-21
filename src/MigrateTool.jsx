import React, { useState } from 'react';
import { db } from './firebase';
import { doc, setDoc } from "firebase/firestore";
import sakeData from './sakeData';

export default function MigrateTool() {
  const [status, setStatus] = useState("待機中");
  const [progress, setProgress] = useState(0);

  const handleMigrate = async () => {
    if (!confirm("手元のデータをクラウド（Firestore）にアップロードしますか？\n※既存のデータは上書きされます。")) return;

    setStatus("アップロード開始...");
    let count = 0;

    try {
      for (const item of sakeData) {
        // IDをキーにして保存（なければ新規作成、あれば上書き）
        // 在庫管理用の初期値（stock: 100%, history: []）もこの時についでに追加します
        await setDoc(doc(db, "sakeList", item.id), {
          ...item,
          stock_level: 100, // 在庫残量（%）
          stock_updated_at: new Date().toISOString(),
          order_history: [] // 発注履歴
        });
        
        count++;
        setProgress(Math.round((count / sakeData.length) * 100));
      }
      setStatus(`完了！全${count}件のデータを移行しました。`);
      alert("データの移行が完了しました！");
    } catch (e) {
      console.error(e);
      setStatus(`エラー発生: ${e.message}`);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-800 text-white p-4">
      <div className="bg-gray-700 p-8 rounded-xl shadow-2xl max-w-md w-full text-center">
        <h1 className="text-2xl font-bold mb-4">📦 データ引越しツール</h1>
        <p className="mb-6 text-gray-300">
          localのsakeData.jsを<br/>Firebase Firestoreに転送します。
        </p>
        
        <div className="mb-6">
          <div className="w-full bg-gray-600 rounded-full h-4 mb-2 overflow-hidden">
            <div 
              className="bg-blue-500 h-4 transition-all duration-300" 
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <p className="text-right text-sm">{progress}%</p>
        </div>

        <button 
          onClick={handleMigrate}
          disabled={progress > 0 && progress < 100}
          className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-4 rounded-lg transition-colors disabled:opacity-50"
        >
          アップロード開始
        </button>
        
        <p className="mt-4 text-yellow-400 font-bold">{status}</p>
      </div>
    </div>
  );
}