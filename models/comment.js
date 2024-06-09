const mongoose = require('mongoose');
const { Schema } = mongoose

// Schema
const commentSchema = new Schema({

  status: {
    type: String,
    enum: ["active", "archived"],
    default: "active",
  },
  comment_message: {
    type: String,
    default: ''
  },
  comment_project_id: {
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Project',
  },
  comment_created_by_user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { timestamps: true })

// Model
const CommentModel = mongoose.model('Comment', commentSchema);

module.exports = CommentModel  