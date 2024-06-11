const Comment = require('../models/comment')
const Resource = require('../models/resource')
const Project = require('../models/project')
const Feed = require('../models/feed')
const { DataNotExistError, ServerError } = require('../helpers/exceptions');
const getUserInfo = require('../helpers/getUserInfo')
const mongoose = require('mongoose');

const listDoc = async (req, res) => {
  try {
    const { userId } = getUserInfo(res)
    const query = {
      ...req.query,
      comment_created_by_user_id: userId,
      status: "active"
    }

    // get amount of projects created in last 7 days
    const date = new Date();
    date.setHours(0, 0, 0, 0);

    const projectCounts = await Project.aggregate([
      {
        $lookup: {
          from: 'groups',
          localField: 'project_available_groups',
          foreignField: '_id',
          as: 'groups'
        }
      },
      {
        $unwind: {
          path: '$groups',
          preserveNullAndEmptyArrays: true // Preserves projects with no groups
        }
      },
      {
        $match: {
          $or: [
            { 'groups.group_members.group_member_id': new mongoose.Types.ObjectId(userId) },
            { 'project_available_groups': { $size: 0 } }
          ]
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'project_created_by_user_id',
          foreignField: '_id',
          as: 'created_by_user'
        }
      },
      {
        $unwind: {
          path: '$created_by_user',
          preserveNullAndEmptyArrays: false
        }
      },
      {
        $match: {
          createdAt: {
            $gte: new Date(date.getTime() - 30 * 24 * 60 * 60 * 1000) // 7 days range
          }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: {
          _id: -1 // Sort by date descending
        }
      },
      {
        $project: {
          _id: 0,
          date: "$_id",
          count: 1
        }
      }
    ]);

    const resourceCounts = await Resource.aggregate([
      {
        $lookup: {
          from: 'projects',
          localField: 'resource_project_id',
          foreignField: '_id',
          as: 'projects'
        }
      },
      {
        $unwind: {
          path: '$projects',
          preserveNullAndEmptyArrays: true // Preserves resources with no projects
        }
      },
      {
        $lookup: {
          from: 'groups',
          localField: 'projects.project_available_groups',
          foreignField: '_id',
          as: 'groups'
        }
      },
      {
        $unwind: {
          path: '$groups',
          preserveNullAndEmptyArrays: true // Preserves projects with no groups
        }
      },
      {
        $match: !req.query.resource_project_path ? {
          $or: [
            { 'groups.group_members.group_member_id': new mongoose.Types.ObjectId(userId) },
            { 'projects.project_available_groups': { $size: 0 } }
          ]

        } :
          {
            $and: [
              { 'resource_project_path': req.query.resource_project_path },
              {
                $or: [
                  { 'groups.group_members.group_member_id': new mongoose.Types.ObjectId(userId) },
                  { 'projects.project_available_groups': { $size: 0 } }
                ]
              }]
          }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'projects.project_created_by_user_id',
          foreignField: '_id',
          as: 'created_by_user'
        }
      },
      {
        $unwind: {
          path: '$created_by_user',
          preserveNullAndEmptyArrays: false
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id', // This is the resource _id
          foreignField: 'user_favourite_resources.resource_id',
          as: 'user_favourite_resources'
        }
      },
      {
        $match: {
          createdAt: {
            $gte: new Date(date.getTime() - 30 * 24 * 60 * 60 * 1000) // 7 days range
          }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: {
          _id: -1 // Sort by date descending
        }
      },
      {
        $project: {
          _id: 0,
          date: "$_id",
          count: 1
        }
      }
    ]);

    const resourceCatCounts = await Resource.aggregate([
      {
        $lookup: {
          from: 'projects',
          localField: 'resource_project_id',
          foreignField: '_id',
          as: 'projects'
        }
      },
      {
        $unwind: {
          path: '$projects',
          preserveNullAndEmptyArrays: true // Preserves resources with no projects
        }
      },
      {
        $lookup: {
          from: 'groups',
          localField: 'projects.project_available_groups',
          foreignField: '_id',
          as: 'groups'
        }
      },
      {
        $unwind: {
          path: '$groups',
          preserveNullAndEmptyArrays: true // Preserves projects with no groups
        }
      },
      {
        $match: !req.query.resource_project_path ? {
          $or: [
            { 'groups.group_members.group_member_id': new mongoose.Types.ObjectId(userId) },
            { 'projects.project_available_groups': { $size: 0 } }
          ]

        } :
          {
            $and: [
              { 'resource_project_path': req.query.resource_project_path },
              {
                $or: [
                  { 'groups.group_members.group_member_id': new mongoose.Types.ObjectId(userId) },
                  { 'projects.project_available_groups': { $size: 0 } }
                ]
              }]
          }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'projects.project_created_by_user_id',
          foreignField: '_id',
          as: 'created_by_user'
        }
      },
      {
        $unwind: {
          path: '$created_by_user',
          preserveNullAndEmptyArrays: false
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id', // This is the resource _id
          foreignField: 'user_favourite_resources.resource_id',
          as: 'user_favourite_resources'
        }
      },
      {
        $match: {
          createdAt: {
            $gte: new Date(date.getTime() - 30 * 24 * 60 * 60 * 1000) // 7 days range
          }
        }
      },
      {
        $group: {
          _id: "$resource_props.category",
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 0,
          category: "$_id",
          count: 1
        }
      }
    ]);

    const project = await Project.aggregate([
      {
        $lookup: {
          from: 'groups',
          localField: 'project_available_groups',
          foreignField: '_id',
          as: 'groups'
        }
      },
      {
        $unwind: {
          path: '$groups',
          preserveNullAndEmptyArrays: true // Preserves projects with no groups
        }
      },
      {
        $match: {
          $or: [
            { 'groups.group_members.group_member_id': new mongoose.Types.ObjectId(userId) },
            { 'project_available_groups': { $size: 0 } }
          ]
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'project_created_by_user_id',
          foreignField: '_id',
          as: 'created_by_user'
        }
      },
      {
        $unwind: {
          path: '$created_by_user',
          preserveNullAndEmptyArrays: false
        }
      },
      {
        $group: {
          _id: '$_id',
          status: { $first: '$status' },
          project_name: { $first: '$project_name' },
          project_description: { $first: '$project_description' },
          project_available_groups: { $first: '$project_available_groups' },
          createdAt: { $first: '$createdAt' },
          updatedAt: { $first: '$updatedAt' },
          project_created_by_user_id: {
            $first: {
              user_first_name: '$created_by_user.user_first_name',
              user_last_name: '$created_by_user.user_last_name'
            }
          }
        }
      },
      {
        $sort: {
          createdAt: -1 // Sort by createdAt field in descending order
        }
      },
      {
        $limit: 4
      }
    ]);

    const fiveDaysAgo = new Date();
    fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);

    const feeds = await Feed.aggregate([
      {
        $match: {
          $or: [
            { feed_created_by_user_id:  new mongoose.Types.ObjectId(userId)  },
            { feed_created_to_user_ids:  new mongoose.Types.ObjectId(userId)  }
          ],
          createdAt: { $gte: fiveDaysAgo }
        }
      },
      {
        $sort: { createdAt: -1 }
      }
    ]);

    if (!projectCounts)
      throw new DataNotExistError("No comment found!")
    else
      res.status(200).json({ projectCounts, resourceCounts, resourceCatCounts, feeds, project });
  } catch (error) {
    res.status(422).json({
      error: error.name,
      message: error.message
    })
  }
}

const readDoc = async (req, res) => {
  try {
    const query = {
      ...req.query,
      _id: req.params.id,
      status: "active"
    }

    const comment = await Comment.findOne(query)

    if (!comment)
      throw new DataNotExistError("No comment found!")
    else
      res.status(200).json(comment);

  } catch (error) {
    res.status(422).json({
      error: error.name,
      message: error.message
    })
  }
}

const createDoc = async (req, res) => {
  try {
    const payload = req.body;

    const { userId } = getUserInfo(res)

    const newComment = new Comment({
      ...payload,
      comment_created_by_user_id: userId
    })
    await newComment.save();
    res.status(200).json({ message: 'Comment registered successfully', comment: newComment });

  } catch (error) {
    res.status(401).json({
      error: error.name,
      message: error.message
    })
  }
}

const updateDoc = async (req, res) => {
  try {
    const query = {
      ...req.query,
      _id: req.params.id,
      status: "active"
    }

    const comment = await Comment.findOneAndUpdate(query, req.body, { new: true });

    if (!comment)
      throw new ServerError("Something went wrong. No comment was updated!")
    else
      res.status(200).json(comment);

  } catch (error) {
    res.status(422).json({
      error: error.name,
      message: error.message
    })
  }
}

const deleteDoc = async (req, res) => {
  try {
    const query = {
      ...req.query,
      _id: req.params.id,
      status: "active"
    }

    const comment = await Comment.findOneAndUpdate(query, { status: "archived" }, { new: true });
    if (!comment)
      throw new DataNotExistError("No comment found!")
    else
      res.status(200).json(comment);
  } catch (error) {
    res.status(422).json({
      error: error.name,
      message: error.message
    })
  }
}

module.exports = { listDoc }