import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// ↓↓↓ あなたのキーに書き換えてください ↓↓↓
const firebaseConfig = {
  apiKey: "AIzaSyDwIwisBuYLMQ5cz7-TlJpSxB3s6NEoUbw",
  authDomain: "sake-data.firebaseapp.com",
  projectId: "sake-data",
  storageBucket: "sake-data.firebasestorage.app",
  messagingSenderId: "839810611873",
  appId: "1:839810611873:web:f162a88ceda62cb10ccee0"
};

// アプリの初期化
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

// 他のファイルで使えるように輸出（export）する
export { db, storage };