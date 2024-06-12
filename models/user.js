const mongoose = require('mongoose')
const { Schema } = mongoose

const userSchema = new Schema({
  user_email: {
    type: String,
    required: true,
  },
  user_password: {
    type: String,
  },
  user_first_name: {
    type: String,
    default: "Unregistered User"
  },
  user_last_name: {
    type: String,
    default: ""
  },
  user_groups_id: [{
    type: {type: mongoose.Schema.Types.ObjectId, ref: 'Group'},
    /**
     * ref can do following things:
     * Pic.find({})
        .populate('uid')
        .exec(function(err, pic) {
          console.log(pic);
          // do something
        });
     */
    default: []
  }],
  user_setting: {
    type: Array,
    default: []
  },
  user_avatar_url: {
    type: String,
    default: ''
  },
  user_description: {
    type: String,
    default: ''
  },
  user_gender: {
    type: String,
    default: ''
  },
  user_phone_number: {
    type: String,
    default: ''
  },
  user_address: {
    type: String,
    default: ''
  },
  user_research_interests: {
    type: Array,
  },
  user_type: {
    type: String,
    enum: ["admin", "user", "system admin"],
    default: "user",
  },
  resource_updated_at: {
    type: String,
    default: ''
  },
  user_favourite_resources :[{
    resource_id: {
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Resource'
    },
    resource_added_to_favourite_at: {
      type: String,
    }
  }],
  status: {
    type: String,
    enum: ["active", "archived"],
    default: "active",
  }
}, { timestamps: true, })

const UserModel = mongoose.model('User', userSchema)

module.exports = UserModel;