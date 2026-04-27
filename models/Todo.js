const mongoose = require('mongoose');
const todoSchema = require('./todoSchema');

module.exports = mongoose.model('Todo', todoSchema);
