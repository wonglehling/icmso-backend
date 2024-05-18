const mongoose = require('mongoose');
const { Schema } = mongoose

// Schema
const projectSchema = new Schema({

	status: {
		type: String,
		enum: ["active", "archived"],
		default: "active",
	},
	project_name: {
		type: String,
		required: true,
	},
	project_description: {
		type: String,
		default: ''
	},
	project_available_groups: {
		type: [{
			project_group_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Group' },
		}],
		default: []
	},
	project_created_by_user_id: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'User'
	}
}, { timestamps: true })

// Model
const ProjectModel = mongoose.model('Project', projectSchema);

module.exports = ProjectModel  