const mongoose = require('mongoose');
const { Schema } = mongoose

// Schema
const activitySchema = new Schema({
	status: {
		type: String,
		enum: ["active", "archived"],
		default: "active",
	},
	activity_type: {
		type: String,
	},
	activity_rating_gained: {
		type: Number,
		default: 0
	},
	activity_by_user_id: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'User'
	},
	activity_to_resource_id: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Resource'
	},
	activity_to_resource_category: {
		type: String,
	},
	activity_to_project_id: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Project'
	}
}, { timestamps: true })

// Model
const activityModel = mongoose.model('activity', activitySchema);

module.exports = activityModel  