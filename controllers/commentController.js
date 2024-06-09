const Comment = require('../models/comment')
const { DataNotExistError, ServerError } = require('../helpers/exceptions');
const getUserInfo = require('../helpers/getUserInfo')
const mongoose = require('mongoose');
const { createFeed } = require('../helpers/feedHelper');

const listDoc = async (req, res) => {
  try {
    const { userId } = getUserInfo(res)
    const query = {
      ...req.query,
      comment_created_by_user_id: userId,
      status: "active"
    }

    // const comment = await Comment.find(query).populate({ path: "comment_created_by_user_id", select: 'user_first_name user_last_name'});
    const comment = await Comment.aggregate([
      {
        $lookup: {
          from: 'groups',
          localField: 'comment_available_groups',
          foreignField: '_id',
          as: 'groups'
        }
      },
      {
        $unwind: {
          path: '$groups',
          preserveNullAndEmptyArrays: true // Preserves comments with no groups
        }
      },
      {
        $match: {
          $or: [
            { 'groups.group_members.group_member_id':  new mongoose.Types.ObjectId(userId) },
            { 'comment_available_groups': { $size: 0 } }
          ]
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'comment_created_by_user_id',
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
          comment_name: { $first: '$comment_name' },
          comment_description: { $first: '$comment_description' },
          comment_available_groups: { $first: '$comment_available_groups' },
          createdAt: { $first: '$createdAt' },
          updatedAt: { $first: '$updatedAt' },
          comment_created_by_user_id: {
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
      }
    ]);
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

    const { userId, user_first_name, user_last_name } = getUserInfo(res)

    const newComment = new Comment({
      ...payload,
      comment_created_by_user_id: userId
    })
    await newComment.save();

    // Create feed
    const feedBody = {
      feed_message: user_first_name+ " " + user_last_name + ' left a comment in project: ' + project.project_name,
      feed_type: 'comment',
      feed_activity: 'create',
      feed_type_id: payload.comment_project_id,
      feed_created_by_user_id: userId,
    }
    await createFeed(feedBody)
    
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

module.exports = { listDoc, readDoc, createDoc, updateDoc, deleteDoc }