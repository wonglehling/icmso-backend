const mongoose = require('mongoose');
const { Schema } = mongoose

// Schema
const resourceSchema = new Schema({
  resource_type: {
    type: String,
    enum: ["research paper", "journal", "other", "folder"],
    default: "other",
  },
  resource_title: {
    type: String,
    required: true,
  },
  resource_props: {
    type: Schema.Types.Mixed,
    /**
     * possible options: publication_date, author, keyword, category
     */
    default: {}
  },
  resource_description: {
    type: String,
    default: ''
  },
  resource_uploader_id:
  {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  resource_project_id:
  {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
  },
  resource_project_path: {
    type: String,
    required: true,
  },
  resource_group_id: {
    type: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Group'
    }],
    default: []
  },
  resource_file_info: {
    resource_avatar_url: {
      type: String,
      default: 'https://res.cloudinary.com/appnest/image/upload/v1711768257/icmso-icon-file.png'
    },
    resource_file_url1: {
      type: String,
      default: ''
    },
    resource_file_url2: {
      type: String,
      default: ''
    },
    resource_file_url_id: {
      type: String,
      default: ''
    },
    resource_file_size: {
      type: Number,
      default: ''
    },
    resource_file_name: {
      type: String,
      default: ''
    },
    resource_file_type: {
      type: String,
      default: ''
    },
    resource_uploaded_at: {
      type: String,
      default: ''
    },
    resource_updated_at: {
      type: String,
      default: ''
    },
  },
  resource_versions: [{
    resource_version_title: {
      type: String,
      default: ''
    },
    resource_version_description: {
      type: String,
      default: ''
    },
    resource_version_updated_userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    resource_update_details: [Object],
    resource_version_status: {
      type: String,
      enum: ["active", "archived"],
      default: "active",
    }
  }],
  status: {
    type: String,
    enum: ["active", "archived"],
    default: "active",
  }
}, { timestamps: true, })

// Model
const ResourceModel = mongoose.model('Resource', resourceSchema);

module.exports = ResourceModel  