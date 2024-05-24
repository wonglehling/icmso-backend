const mongoose = require('mongoose');
const { Schema } = mongoose

// Schema
const recommendationSchema = new Schema({
	status: {
		type: String,
		enum: ["active", "archived"],
		default: "active",
	},
	recommendation_to_user_id: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'User'
	},
	recommendation_of_resources: [
		{
			recommendation_of_resource_id: {
				type: mongoose.Schema.Types.ObjectId,
				ref: 'Resource'
			},
			recommendation_of_resource_category: {
				type: String,
			},
		}
	],
}, { timestamps: true })

// Model
const recommendationModel = mongoose.model('recommendation', recommendationSchema);

module.exports = recommendationModel  