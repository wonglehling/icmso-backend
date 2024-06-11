const Project = require('../models/project')
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
      project_created_by_user_id: userId,
      status: "active"
    }

    // const project = await Project.find(query).populate({ path: "project_created_by_user_id", select: 'user_first_name user_last_name'});
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
      }
    ]);
    if (!project)
      throw new DataNotExistError("No project found!")
    else
      res.status(200).json(project);
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

    let project = await Project.findOne(query)
    // get comments for this project, sort by createdAt in descending order, populate user commented
    const comments = await Comment.find
      ({ comment_project_id: new mongoose.Types.ObjectId(req.params.id), status: "active" })
      .populate({ path: "comment_created_by_user_id", select: 'user_first_name user_last_name' })
      .sort({ createdAt: -1 });
    project = project.toObject()
    project = { ...project, comments: comments }

    if (!project)
      throw new DataNotExistError("No project found!")
    else
      res.status(200).json(project);

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

    const projectAvailableGroups = payload.project_groups.map(id => new mongoose.Types.ObjectId(id));
    const { userId, user_first_name, user_last_name } = getUserInfo(res)

    const newProject = new Project({
      ...payload,
      project_available_groups: projectAvailableGroups,
      project_created_by_user_id: userId
    })
    await newProject.save();
    // Create feed
    const feedBody = {
      feed_type: 'project',
      feed_message: user_first_name+ " " + user_last_name + ' created new project: ' + newProject.project_name,
      feed_activity: 'create',
      feed_type_id: newProject._id,
      feed_created_by_user_id: userId,
    }
    await createFeed(feedBody)
    res.status(200).json({ message: 'Project registered successfully', project: newProject });

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

    const { userId, user_first_name, user_last_name, type } = getUserInfo(res)

    const project = await Project.findOneAndUpdate(query, req.body, { new: true });
    // Create feed
    const feedBody = {
      feed_message: user_first_name+ " " + user_last_name + ' updated the project: ' + project.project_name,
      feed_type: 'project',
      feed_activity: 'update',
      feed_type_id: project._id,
      feed_created_by_user_id: userId,
    }
    await createFeed(feedBody)

    if (!project)
      throw new ServerError("Something went wrong. No project was updated!")
    else
      res.status(200).json(project);

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

    const project = await Project.findOneAndUpdate(query, { status: "archived" }, { new: true });
    // Create feed
    const feedBody = {
      feed_message: user_first_name+ " " + user_last_name + ' deleted project: ' + project.project_name,
      feed_type: 'project',
      feed_activity: 'delete',
      feed_type_id: project._id,
      feed_created_by_user_id: userId,
    }
    await createFeed(feedBody)
    if (!project)
      throw new DataNotExistError("No project found!")
    else
      res.status(200).json(project);
  } catch (error) {
    res.status(422).json({
      error: error.name,
      message: error.message
    })
  }
}

module.exports = { listDoc, readDoc, createDoc, updateDoc, deleteDoc }