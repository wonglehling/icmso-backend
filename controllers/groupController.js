const Group = require('../models/group')
const User = require('../models/user')
const { UnauthorizedAccessError, DataNotExistError, ServerError } = require('../helpers/exceptions');
const { checkAccess } = require('../helpers/auth')
const getUserInfo = require('../helpers/getUserInfo')
const { hashPassword, comparePassword } = require('../helpers/auth')
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
var nodemailer = require('nodemailer');
const { createFeed } = require('../helpers/feedHelper');


const listDoc = async (req, res) => {
  try {
    const { userId, type } = getUserInfo(res)
    // if (req.query.self) {
    //   req.query["group_members.group_member_id"] = new mongoose.Types.ObjectId(userId)
    // }
    const query = {
      ...req.query,
      "group_members.group_member_id": new mongoose.Types.ObjectId(userId),
      status: "active"
    }

    const group = await Group.aggregate([{
      $match: {
        status: "active",
        "group_members.group_member_id": new mongoose.Types.ObjectId(userId),
      }
    }]);
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
    const { userId, type } = getUserInfo(res)
    const query = {
      ...req.query,
      _id: req.params.id,
      status: "active"
    }

    // const group = await Group.findOne(query)
    //   .populate({ path: "group_members.group_member_id", select: ' -user_password' })
    const group = await Group.aggregate([{
      $match: {
        status: "active",
        _id: new mongoose.Types.ObjectId(req.params.id),
        "group_members.group_member_id": new mongoose.Types.ObjectId(userId),
      }
    },
    {
      $unwind: '$group_members'
    },
    // Lookup to join group_members.group_member_id with the users collection
    {
      $lookup: {
        from: 'users',
        localField: 'group_members.group_member_id',
        foreignField: '_id',
        as: 'group_member_user'
      }
    },
    // Unwind the group_member_user array
    {
      $unwind: '$group_member_user'
    },
    // Group to reconstruct the group with all members
    {
      $group: {
        _id: '$_id',
        status: { $first: '$status' },
        group_name: { $first: '$group_name' },
        group_description: { $first: '$group_description' },
        group_avatar_url: { $first: '$group_avatar_url' },
        createdAt: { $first: '$createdAt' },
        updatedAt: { $first: '$updatedAt' },
        group_created_by_user_id: { $first: '$group_created_by_user_id' },
        group_members: {
          $push: {
            group_member_id: '$group_members.group_member_id',
            group_member_type: '$group_members.group_member_type',
            user_first_name: '$group_member_user.user_first_name',
            user_last_name: '$group_member_user.user_last_name',
            group_member_email: '$group_member_user.user_email',
            group_member_research_interests: '$group_members.group_member_research_interests',
            group_member_join_date: '$group_members.group_member_join_date'
          }
        }
      }
    }

    ]);

    if (!group)
      throw new DataNotExistError("No group found!")
    else
      res.status(200).json(group[0]);

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

    // Create feed
    const feedBody = {
      feed_message: user_first_name + " " + user_last_name + ' created a group: ' + newGroup.group_name,
      feed_type: 'group',
      feed_activity: 'create',
      feed_type_id: newGroup._id,
      feed_created_by_user_id: userId,
    }
    await createFeed(feedBody)

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
    const { userId } = getUserInfo(res)
    const query = {
      ...req.query,
      _id: req.params.id,
      status: "active"
    }

    if (req.body.new_member && req.body.new_member != {}) {

      let result = '';
      const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
      const charactersLength = characters.length;
      let counter = 0;
      while (counter < 8) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
        counter += 1;
      }
      const hashedPassword = await hashPassword(result)

      const newMember = await User.findOneAndUpdate(
        { user_email: req.body.new_member.group_member_email },
        { $setOnInsert: { user_email: req.body.new_member.group_member_email, user_password: hashedPassword, user_type: 'user' } },
        { upsert: true, new: true, runValidators: true }
      )

      if (newMember.createdAt.valueOf() == newMember.updatedAt.valueOf()) {
        // send email
        var transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: process.env.SENDER_EMAIL,
            pass: process.env.SENDER_PASS
          }
        });

        var mailOptions = {
          from: process.env.SENDER_EMAIL,
          to: req.body.new_member.group_member_email,
          subject: 'Sending Email using Node.js',
          html: `<h1>Welcome to ICMSO</h1><p>Someone added you into the group as <b>${req.body.new_member.group_member_type}</b>: <b>${req.body.group_name}</b>. </p><p>Click <a href="${process.env.CLIENT_URL}/login">here</a> to login now, using the credentials as follow: <li>Email: ${req.body.new_member.group_member_email}</li><li>Password: ${result}</li></p>`
        };

        transporter.sendMail(mailOptions, function (error, info) {
          if (error) {
            throw error;
          }
        });
      }
      if (!req.body["group_members"].some(e => e.group_member_id == newMember._id)) {
        req.body["group_members"].push({
          group_member_id: newMember._id,
          group_member_type: req.body.new_member.group_member_type,
          group_member_research_interests: req.body.new_member.group_member_research_interests,
          group_member_join_date: new Date().toISOString()
        })
      }
    }

    const { groupId, type } = getUserInfo(res)

    const group = await Group.findOneAndUpdate(query, req.body, { new: true });
    const feedBody = (req.body.new_member && req.body.new_member != {}) ? (
      // Create feed
      {
        feed_message: user_first_name + " " + user_last_name + ' added a member to group: ' + group.group_name,
        feed_type: 'group',
        feed_activity: 'add',
        feed_type_id: req.params.id,
      }
    ) : (
      // Create feed
      {
        feed_message: user_first_name + " " + user_last_name + ' updated group details: ' + group.group_name,
        feed_type: 'group',
        feed_activity: 'update',
        feed_type_id: req.params.id,
      }
    )
    await createFeed(feedBody)

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

const sendEmail = (req, res) => {
  var transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.SENDER_EMAIL,
      pass: process.env.SENDER_PASS
    }
  });

  var mailOptions = {
    from: process.env.senderEmailAddress,
    to: 'hiaweiqi@gmail.com',
    subject: 'Sending Email using Node.js',
    html: '<h1>Welcome to ICMSO</h1><p>Someone added you into the group: ___. </p><p>Click here to login now, using the credentials as follow: <li>Email: ___</li><li>Password: ___</li></p>'
  };

  transporter.sendMail(mailOptions, function (error, info) {
    if (error) {
      console.log(error);
    } else {
      console.log('Email sent: ' + info.response);
    }
  });

}

const deleteDoc = async (req, res) => {
  try {
    const { userId, user_first_name, user_last_name } = getUserInfo(res)
    const query = {
      ...req.query,
      _id: req.params.id,
      status: "active"
    }

    const group = await Group.findOneAndUpdate(query, { status: "archived" }, { new: true });
    // Create feed
    const feedBody = {
      feed_message: user_first_name+ " " + user_last_name + ' deleted group: ' + group.group_name,
      feed_type: 'group',
      feed_activity: 'delete',
      feed_type_id: group._id,
      feed_created_by_user_id: userId,
    }
    await createFeed(feedBody)
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

module.exports = { listDoc, readDoc, createDoc, updateDoc, deleteDoc, sendEmail }