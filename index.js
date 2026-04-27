const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 5000;

function mongoUri() {
  return (
    process.env.MONGODB_URI ||
    process.env.DATABASE_URL ||
    'mongodb://127.0.0.1:27017/todoapp'
  );
}

const todoRoutes = require('./routes/todoRoutes');

function requireDb(req, res, next) {
  const s = mongoose.connection.readyState;
  // 1 = connected, 2 = connecting (mongoose가 명령을 버퍼링함)
  if (s === 1 || s === 2) return next();
  res.status(503).json({
    error: '데이터베이스에 연결되지 않았습니다.',
    hint:
      'Heroku Settings → Config Vars에 MONGODB_URI(또는 Mongo 애드온의 DATABASE_URL)를 넣고, Atlas면 Network Access에 0.0.0.0/0을 추가하세요. 비밀번호에 특수문자가 있으면 연결 문자열에서 URL 인코딩이 필요합니다.',
  });
}

// CORS 설정
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

app.use(express.json());

app.get('/', (req, res) => {
  res.send('Todo backend is running.');
});

app.get('/todoapp', (_req, res) => {
  res.redirect(302, '/todos');
});

app.use('/todos', requireDb, todoRoutes);

app.get('/health', (_req, res) => {
  res.json({
    ok: mongoose.connection.readyState === 1,
    mongoReadyState: mongoose.connection.readyState,
    hasMongodbUriEnv: Boolean(process.env.MONGODB_URI),
    hasDatabaseUrlEnv: Boolean(process.env.DATABASE_URL),
  });
});

if (
  process.env.DYNO &&
  !process.env.MONGODB_URI &&
  !process.env.DATABASE_URL
) {
  console.warn(
    '[Heroku] MONGODB_URI 또는 DATABASE_URL Config Var가 없습니다.',
  );
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});

const connectOpts = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 15000,
};

async function connectMongoWithRetry() {
  const uri = mongoUri();
  const maxAttempts = Number(process.env.MONGO_CONNECT_RETRIES || 10);
  const delayMs = Number(process.env.MONGO_CONNECT_RETRY_DELAY_MS || 3000);

  for (let i = 1; i <= maxAttempts; i++) {
    try {
      if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect().catch(() => {});
      }
      await mongoose.connect(uri, connectOpts);
      console.log('연결성공');
      return;
    } catch (err) {
      console.error(`MongoDB 연결 실패 (${i}/${maxAttempts}):`, err.message);
      if (i === maxAttempts) console.error(err);
      if (i < maxAttempts) {
        await new Promise((r) => setTimeout(r, delayMs));
      }
    }
  }
}

connectMongoWithRetry();
