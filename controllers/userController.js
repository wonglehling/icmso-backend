const User = require('../models/user')
const { UnauthorizedAccessError, DataNotExistError, ServerError } = require('../helpers/exceptions');
const { checkAccess } = require('../helpers/auth')
const getUserInfo = require('../helpers/getUserInfo')
const { hashPassword, comparePassword } = require('../helpers/auth')
const jwt = require('jsonwebtoken');
const { default: mongoose } = require('mongoose');

const listDoc = async (req, res) => {
  try {
    const query = {
      status: "active"
    }

    const user = await User.find(query);
    if (!user)
      throw new DataNotExistError("No user found!")
    else
      res.status(200).json(user);
  } catch (error) {
    res.status(422).json({
      error: error.name,
      message: error.message
    })
  }
}

const readDoc = async (req, res) => {
  try {
    const { userId, type } = getUserInfo(res)
    const query = {
      ...req.query,
      _id: req.params.id || userId,
      status: "active"
    }

    const user = await User.findOne(query)
      .populate({ path: "user_favourite_resources.resource_id", select: '' })

    if (!user)
      throw new DataNotExistError("No user found!")
    else
      res.status(200).json(user);

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
    // check empty value
    if (!payload.user_email) {
      return res.json({
        err: 'Email is required!'
      })
    }

    if (!payload.user_password || payload.user_password.length < 6) {
      return res.json({
        err: 'Password of at least 6 characters long is required!'
      })
    }

    else {
      const hashedPassword = await hashPassword(payload.user_password)
      // find user if exist in db
      // create user record in db
      const newUser = new User({ ...payload, user_password: hashedPassword })
      await newUser.save();
      res.status(201).json({ message: 'User registered successfully' });
    }
  } catch (error) {
    res.status(401).json({
      error: error.name,
      message: error.message
    })
  }
}

const updateDoc = async (req, res) => {
  try {
    const { userId, type } = getUserInfo(res)
    const query = req.params.id ? {
      ...req.query,
      _id: req.params.id,
      status: "active"
    } : {
      ...req.query,
      _id: userId,
      status: "active"
    }

    const user = await User.findOneAndUpdate(query, req.body, { new: true });

    if (!user)
      throw new ServerError("Something went wrong. No user was updated!")
    else
      res.status(200).json(user);

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

    const user = await User.findOneAndUpdate(query, { status: "archived" }, { new: true });
    if (!user)
      throw new DataNotExistError("No user found!")
    else
      res.status(200).json(user);
  } catch (error) {
    res.status(422).json({
      error: error.name,
      message: error.message
    })
  }
}

const addToFav = async (req, res) => {
  try {
    const { userId, type } = getUserInfo(res)
    const query = req.params.id ? {
      ...req.query,
      _id: req.params.id,
      status: "active"
    } : {
      ...req.query,
      _id: userId,
      status: "active"
    }

    console.log('doc_id', req.params.doc_id);

    const user = await User.updateOne(query, {
      $push: {
        user_favourite_resources: {
          resource_id: new mongoose.Types.ObjectId(req.params.doc_id),
          resource_added_to_favourite_at: new Date().toISOString()
        }
      },
    });

    if (!user)
      throw new ServerError("Something went wrong. No user was updated!")
    else
      res.status(200).json(user);

  } catch (error) {
    res.status(422).json({
      error: error.name,
      message: error.message
    })
  }
}

const removeFav = async (req, res) => {
  try {
    const { userId, type } = getUserInfo(res)
    const query = req.params.id ? {
      ...req.query,
      _id: req.params.id,
      status: "active"
    } : {
      ...req.query,
      _id: userId,
      status: "active"
    }

    const user = await User.updateOne(query, {
      $pull: {
        user_favourite_resources: {
          resource_id: new mongoose.Types.ObjectId(req.params.doc_id),
        }
      },
    });

    if (!user)
      throw new ServerError("Something went wrong. No user was updated!")
    else
      res.status(200).json(user);

  } catch (error) {
    res.status(422).json({
      error: error.name,
      message: error.message
    })
  }
}

module.exports = { listDoc, readDoc, createDoc, updateDoc, deleteDoc, addToFav, removeFav }