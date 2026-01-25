import React from 'react';

// ★重要：ここに「新しいアプリのURL」を貼り付けてください
const NEW_APP_URL = "https://vitejs-vite-y3u8haa6.vercel.app/";

export default function App() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-700">
      
      {/* アイコン装飾 */}
      <div className="bg-white p-6 rounded-full shadow-lg mb-8">
        <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12l14 0" />
          <path d="M13 18l6 -6" />
          <path d="M13 6l6 6" />
        </svg>
      </div>

      <h1 className="text-2xl font-bold text-gray-800 mb-4">
        システムが新しくなりました
      </h1>
      
      <p className="text-gray-600 mb-8 leading-relaxed max-w-sm mx-auto">
        Setsu-Phone (Sake Manager) は<br/>
        新バージョンへ移行しました。<br/>
        <span className="text-sm mt-2 block text-gray-400">
          ※旧バージョンのブックマークは削除し、<br/>
          移動先を「ホーム画面に追加」してください。
        </span>
      </p>

      {/* 移動ボタン */}
      <a 
        href={NEW_APP_URL}
        className="bg-blue-600 text-white font-bold py-4 px-10 rounded-full shadow-xl hover:bg-blue-700 hover:scale-105 transition-all duration-300 flex items-center gap-2"
      >
        新しいシステムを開く
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
          <polyline points="15 3 21 3 21 9" />
          <line x1="10" y1="14" x2="21" y2="3" />
        </svg>
      </a>

      <p className="mt-12 text-xs text-gray-400 font-mono">
        Setsu-Phone 2.0
      </p>
    </div>
  );
}