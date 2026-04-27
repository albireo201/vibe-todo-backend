const express = require('express');
const Todo = require('../models/Todo');

const router = express.Router();

function serverError(res, logLabel, error, clientMessage) {
  console.error(logLabel, error);
  const body = { error: clientMessage };
  if (process.env.EXPOSE_API_ERRORS === '1') {
    body.details = error.message;
  }
  res.status(500).json(body);
}

router.post('/', async (req, res) => {
  try {
    const { content } = req.body;
    if (!content || typeof content !== 'string') {
      return res.status(400).json({ error: 'content은 문자열로 필수입니다.' });
    }

    const todo = new Todo({ content });
    await todo.save();

    res.status(201).json(todo);
  } catch (error) {
    serverError(res, '할일 저장 실패:', error, '할일 저장 중 오류가 발생했습니다.');
  }
});

router.get('/', async (req, res) => {
  try {
    const todos = await Todo.find().sort({ createdAt: -1 }).lean();
    res.json(todos);
  } catch (error) {
    serverError(res, '할일 조회 실패:', error, '할일 조회 중 오류가 발생했습니다.');
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { content, completed } = req.body;
    const updateData = {};

    if (content !== undefined) {
      if (!content || typeof content !== 'string') {
        return res.status(400).json({ error: 'content은 문자열이어야 합니다.' });
      }
      updateData.content = content;
    }

    if (completed !== undefined) {
      if (typeof completed !== 'boolean') {
        return res.status(400).json({ error: 'completed는 boolean이어야 합니다.' });
      }
      updateData.completed = completed;
    }

    const updatedTodo = await Todo.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!updatedTodo) {
      return res.status(404).json({ error: '할일을 찾을 수 없습니다.' });
    }

    res.json(updatedTodo);
  } catch (error) {
    serverError(res, '할일 수정 실패:', error, '할일 수정 중 오류가 발생했습니다.');
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deletedTodo = await Todo.findByIdAndDelete(id);

    if (!deletedTodo) {
      return res.status(404).json({ error: '할일을 찾을 수 없습니다.' });
    }

    res.json({ message: '할일이 삭제되었습니다.' });
  } catch (error) {
    serverError(res, '할일 삭제 실패:', error, '할일 삭제 중 오류가 발생했습니다.');
  }
});

module.exports = router;
