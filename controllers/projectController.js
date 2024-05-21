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

    const project = await Project.find(query).populate({ path: "project_created_by_user_id", select: 'user_first_name user_last_name'});
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