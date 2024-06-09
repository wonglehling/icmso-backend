const mongoose = require('mongoose');
const { Schema } = mongoose

// Schema
const feedSchema = new Schema({
  status: {
    type: String,
    enum: ["active", "archived"],
    default: "active",
  },
  feed_message: {
    type: String,
    default: ''
  },
  feed_type: {
    type: String,
    enum: ["comment", "project", "group"],
    default: "comment",
  },
  feed_activity: {
    type: String,
    enum: ["create", "update", "delete", "add", "remove"],
    default: "create",
  },
  feed_type_id: {
    id: String,
  },
  feed_created_by_user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  feed_created_to_user_ids: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }]
}, { timestamps: true })

// Model
const FeedModel = mongoose.model('Feed', feedSchema);

module.exports = FeedModel  