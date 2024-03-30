const Group = require('../models/group')
const { UnauthorizedAccessError, DataNotExistError, ServerError } = require('../helpers/exceptions');
const { checkAccess } = require('../helpers/auth')
const getUserInfo = require('../helpers/getUserInfo')
const { hashPassword, comparePassword } = require('../helpers/auth')
const jwt = require('jsonwebtoken');

const listDoc = async (req, res) => {
  try {
    const query = {
      ...req.query,
      status: "active"
    }

    const group = await Group.find(query);
    if (!group)
      throw new DataNotExistError("No group found!")
    else
      res.status(200).json(group);
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

    const group = await Group.findOne(query)
    .populate({ path: "group_members.group_member_id", select: ' -user_password'})


    if (!group)
      throw new DataNotExistError("No group found!")
    else
      res.status(200).json(group);

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

    const newGroup = new Group({
      ...payload,
      group_members: payload.group_members ? payload.group_members.push(
        {
          group_member_id: userId,
          group_member_type: 'admin',
          group_member_research_interests: [],
          group_member_join_date: new Date().toISOString()
        }
      ) : [{
        group_member_id: userId,
        group_member_type: 'admin',
        group_member_research_interests: [],
        group_member_join_date: new Date().toISOString()
      }],
      group_created_by_user_id: userId
    })
    await newGroup.save();
    res.status(200).json({ message: 'Group registered successfully', group: newGroup });

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

    const { groupId, type } = getUserInfo(res)

    const group = await Group.findOneAndUpdate(query, req.body, { new: true });

    if (!group)
      throw new ServerError("Something went wrong. No group was updated!")
    else
      res.status(200).json(group);

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

    const group = await Group.findOneAndUpdate(query, { status: "archived" }, { new: true });
    if (!group)
      throw new DataNotExistError("No group found!")
    else
      res.status(200).json(group);
  } catch (error) {
    res.status(422).json({
      error: error.name,
      message: error.message
    })
  }
}

module.exports = { listDoc, readDoc, createDoc, updateDoc, deleteDoc }