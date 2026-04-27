const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI =
  process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/todoapp';
const todoRoutes = require('./routes/todoRoutes');

function requireDb(req, res, next) {
  if (mongoose.connection.readyState === 1) return next();
  res.status(503).json({
    error: '데이터베이스에 연결되지 않았습니다.',
    hint:
      'Heroku Settings → Config Vars에 MONGODB_URI를 설정하고, MongoDB Atlas Network Access에서 IP 허용(예: 0.0.0.0/0)을 확인하세요.',
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

// Mongo URI의 DB 이름(todoapp)과 헷갈리는 경우 대비 — 실제 API는 /todos
app.get('/todoapp', (_req, res) => {
  res.redirect(302, '/todos');
});

app.use('/todos', requireDb, todoRoutes);

app.get('/health', (_req, res) => {
  res.json({
    ok: mongoose.connection.readyState === 1,
    mongoReadyState: mongoose.connection.readyState,
    hasMongodbUriEnv: Boolean(process.env.MONGODB_URI),
  });
});

if (process.env.DYNO && !process.env.MONGODB_URI) {
  console.warn(
    '[Heroku] MONGODB_URI Config Var가 없습니다. Atlas 연결 문자열을 추가하세요.',
  );
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});

mongoose
  .connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log('연결성공');
  })
  .catch((error) => {
    console.error('MongoDB 연결 실패:', error.message);
    console.error(error);
  });
