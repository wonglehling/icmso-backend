const Feed = require('../models/feed')
const Project = require('../models/project')
const Group = require('../models/group')

const createFeed = async (feedBody) => {
  const { feed_type, feed_activity, feed_type_id } = feedBody
  // find the members in group or project
  let feed_created_to_user_ids = []
  if (feed_type === 'group') {
    const group = await Group
      .findById(feed_type_id)
      .populate({ path: "group_members.group_member_id", select: '_id' })
      .exec()
      console.log(group.group_members);
    feed_created_to_user_ids = group.group_members.map(member => member.group_member_id._id)
  } else if (feed_type === 'project' || feed_type === 'comment') {
    const project = await Project
      .findById(feed_type_id)
      .populate({ path: "project_available_groups", select: '_id' })
      .exec()

    console.log("project involved", project.project_available_groups);

    const groups = await Group
      .find({ _id: { $in: project.project_available_groups } })
      .populate({
        path: 'group_members.group_member_id', select: '_id'
      })
      .exec()

    feed_created_to_user_ids = groups.flatMap(group => group.group_members.map(member => member.group_member_id._id))
    console.log(feed_created_to_user_ids);
  }
  const newFeed = await Feed.create({...feedBody, feed_created_to_user_ids})
  console.log(newFeed);
  return newFeed
}

module.exports = {
  createFeed
}