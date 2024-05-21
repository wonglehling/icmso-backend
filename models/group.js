const mongoose = require('mongoose');
const { Schema } = mongoose

// Schema
const groupSchema = new Schema({
	status: {
		type: String,
		enum: ["active", "archived"],
		default: "active",
	},
	group_resources: {
		type: [{
			resource_id: {
				type: mongoose.Schema.Types.ObjectId,
				ref: 'Resource'
			},
			resource_name: {
				type: String,
				default: ''
			},
			resource_uploaded_user_id: {
				type: mongoose.Schema.Types.ObjectId,
				ref: 'User'
			},
			resource_uploaded_date: {
				type: String,
				default: new Date().toISOString()
			},
		}],
		default: []
	},
	group_name: {
		type: String,
		required: true,
	},
	group_description: {
		type: String,
		default: ''
	},
	group_avatar_url: {
		type: String,
		default: ''
	},
	group_members: {
		type: [{
			group_member_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
			group_member_type: {
				type: String,
			},
			group_member_research_interests: {
				type: [String],
			},
			group_member_join_date: {
				type: String,
			}
		}],
		default: []
	},
	group_created_by_user_id: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'User'
	}
}, { timestamps: true })

// Model
const GroupModel = mongoose.model('Group', groupSchema);

module.exports = GroupModel  