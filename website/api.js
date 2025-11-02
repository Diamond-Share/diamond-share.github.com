const ENCRYPTION_KEY = "o=Q2FBd1cIKoJP;,<^U;{,+ixn1k@?R+";

const IMGBB_API_KEY = "a6b6b72c5fa8d86d7cc4a27da5464e0f";

const AVATAR_UPLOAD_SIZE_LIMIT = 5 * 1024 * 1024;

const firebaseConfig = {
  apiKey: "AIzaSyB0ca3id5sWRk4a49s6OnYhpGQEtpi_h9Q",
  authDomain: "diamond-russia-8e454.firebaseapp.com",
  databaseURL: "https://diamond-russia-8e454-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "diamond-russia-8e454",
  storageBucket: "diamond-russia-8e454.appspot.com",
  messagingSenderId: "735387033487",
  appId: "1:735387033487:web:7ec3ff71a2aaed612775fa",
  measurementId: "G-5QQE8WH2SC"
};

const verifiedUsers = [
  '@support',
  '@NoGeto',
  '@hhh24_ll',
  '@mattakushi'
];

// Добавьте эти константы в начало файла api.js
const CACHE_KEYS = {
    AVATARS: 'cached_avatars',
    IMAGES: 'cached_images',
    STICKERS: 'cached_stickers'
};

const CACHE_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7 дней в миллисекундах