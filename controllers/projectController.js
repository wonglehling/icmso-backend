const Project = require('../models/project')
const { DataNotExistError, ServerError } = require('../helpers/exceptions');
const getUserInfo = require('../helpers/getUserInfo')
const mongoose = require('mongoose');

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
            { 'groups.group_members.group_member_id':  new mongoose.Types.ObjectId(userId) },
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

    const project = await Project.findOne(query)

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
    const { userId } = getUserInfo(res)

    const newProject = new Project({
      ...payload,
      project_available_groups: projectAvailableGroups,
      project_created_by_user_id: userId
    })
    await newProject.save();
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

    const { projectId, type } = getUserInfo(res)

    const project = await Project.findOneAndUpdate(query, req.body, { new: true });

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