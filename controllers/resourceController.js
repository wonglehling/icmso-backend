const Resource = require('../models/resource')
const fs = require('fs')
const { UnauthorizedAccessError, DataNotExistError, ServerError } = require('../helpers/exceptions');
const { checkAccess } = require('../helpers/auth')
const getUserInfo = require('../helpers/getUserInfo')
const { hashPassword, comparePassword } = require('../helpers/auth')
const jwt = require('jsonwebtoken');
const googleDrive = require('../utils/googleDrive'); // Import the new module
const { cloudinary } = require('../config/cloudinary');
const { promisify } = require('util')
const unlinkAsync = promisify(fs.unlink)
const sharp = require('sharp');
const axios = require('axios');
const User = require('../models/user');
const mongoose = require('mongoose');

const listDoc = async (req, res) => {
  try {
    const { userId } = getUserInfo(res)
    const query = {
      ...req.query,
      status: "active"
    }
    console.log(req.query);
    // const resources = await Resource.find(query)
    //   .populate({ path: "resource_uploader_id", select: ' -user_password' })
    // .populate({ path: "resource_versions.resource_version_updated_userId", })
    // const userFavResIds = await User.findById(userId).select('user_favourite_resources -_id')
    // for(let reso of resource){
    //   reso["faved"] = userFavResIds.user_favourite_resources.some(userFavResId => userFavResId._id === reso._id)
    // }
    // console.log(resource);

    const resource = await Resource.aggregate([
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
          $and: [
            { 'resource_type': {$ne : 'folder'} },
            {
              $or: [
                { 'groups.group_members.group_member_id': new mongoose.Types.ObjectId(userId) },
                { 'projects.project_available_groups': { $size: 0 } }
              ]
            }]

        } :
          {
            $and: [
              { 'resource_project_path': req.query.resource_project_path },
              {
                'resource_project_id': new mongoose.Types.ObjectId(req.query.resource_project_id)
              },
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
          localField: 'resource_uploader_id',
          foreignField: '_id',
          as: 'uploaded_by_user'
        }
      },
      {
        $unwind: {
          path: '$uploaded_by_user',
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
        $addFields: {
          is_favourite: {
            $in: [new mongoose.Types.ObjectId(userId), '$user_favourite_resources._id']
          }
        }
      },
      {
        $group: {
          _id: '$_id',
          status: { $first: '$status' },
          project_name: { $first: '$projects.project_name' },
          project_description: { $first: '$projects.project_description' },
          project_available_groups: { $first: '$projects.project_available_groups' },
          createdAt: { $first: '$createdAt' },
          updatedAt: { $first: '$updatedAt' },
          project_created_by_user_id: {
            $first: {
              user_first_name: '$created_by_user.user_first_name',
              user_last_name: '$created_by_user.user_last_name'
            }
          },
          is_favourite: { $first: '$is_favourite' },
          resource_type: { $first: '$resource_type' },
          resource_title: { $first: '$resource_title' },
          resource_props: { $first: '$resource_props' },
          resource_description: { $first: '$resource_description' },
          resource_uploader_id: { $first: '$resource_uploader_id' },
          resource_uploaded_by_user: {
            $first: {
              user_first_name: '$uploaded_by_user.user_first_name',
              user_last_name: '$uploaded_by_user.user_last_name'
            }
          },
          resource_project_id: { $first: '$resource_project_id' },
          resource_project_path: { $first: '$resource_project_path' },
          resource_group_id: { $first: '$resource_group_id' },
          resource_file_info: { $first: '$resource_file_info' },
          resource_versions: { $first: '$resource_versions' },
        }
      },
      {
        $sort: {
          createdAt: -1 // Sort by createdAt field in descending order
        }
      }
    ]);

    const recommended_resource = await Resource.aggregate([
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
        $match: {
          $or: [
            { 'groups.group_members.group_member_id': new mongoose.Types.ObjectId(userId) },
            { 'projects.project_available_groups': { $size: 0 } }
          ]
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
          localField: 'resource_uploader_id',
          foreignField: '_id',
          as: 'uploaded_by_user'
        }
      },
      {
        $unwind: {
          path: '$uploaded_by_user',
          preserveNullAndEmptyArrays: false
        }
      },
      {
        $lookup: {
          from: 'recommendations',
          localField: '_id', // This is the resource _id
          foreignField: 'recommendation_of_resources.recommendation_of_resource_id',
          as: 'user_recommendation_resources'
        }
      },
      {
        $unwind: {
          path: '$user_recommendation_resources',
          preserveNullAndEmptyArrays: false
        }
      },
      {
        $match: {
          'user_recommendation_resources.recommendation_to_user_id': new mongoose.Types.ObjectId(userId)
        },
      },
      {
        $group: {
          _id: '$_id',
          status: { $first: '$status' },
          project_name: { $first: '$projects.project_name' },
          project_description: { $first: '$projects.project_description' },
          project_available_groups: { $first: '$projects.project_available_groups' },
          createdAt: { $first: '$createdAt' },
          updatedAt: { $first: '$updatedAt' },
          project_created_by_user_id: {
            $first: {
              user_first_name: '$created_by_user.user_first_name',
              user_last_name: '$created_by_user.user_last_name'
            }
          },
          resource_type: { $first: '$resource_type' },
          resource_title: { $first: '$resource_title' },
          resource_props: { $first: '$resource_props' },
          resource_description: { $first: '$resource_description' },
          resource_uploader_id: { $first: '$resource_uploader_id' },
          resource_project_id: { $first: '$resource_project_id' },
          resource_project_path: { $first: '$resource_project_path' },
          resource_uploaded_by_user: {
            $first: {
              user_first_name: '$uploaded_by_user.user_first_name',
              user_last_name: '$uploaded_by_user.user_last_name'
            }
          },
          resource_group_id: { $first: '$resource_group_id' },
          resource_file_info: { $first: '$resource_file_info' },
          resource_versions: { $first: '$resource_versions' },
        }
      },
      {
        $sort: {
          createdAt: -1 // Sort by createdAt field in descending order
        }
      }
    ]);

    // console.log(resource);
    if (!resource)
      throw new DataNotExistError("No resource found!")
    else
      res.status(200).json({ resource, recommended_resource });
  } catch (error) {
    res.status(422).json({
      error: error.name,
      message: error.message
    })
  }
}

const readDoc = async (req, res) => {
  try {
    const { userId } = getUserInfo(res)
    const query = {
      ...req.query,
      _id: req.params.id,
      status: "active"
    }

    // const resource = await Resource.findOne(query)
    //   .populate({ path: "resource_uploader_id", select: ' -user_password' })
    //   .populate({ path: "resource_versions.resource_version_updated_userId", })
    const resources = await Resource.aggregate([
      {
        $match: {
          '_id': new mongoose.Types.ObjectId(req.params.id)
        }
      },
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
          localField: 'resource_uploader_id',
          foreignField: '_id',
          as: 'uploaded_by_user'
        }
      },
      {
        $unwind: {
          path: '$uploaded_by_user',
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
        $addFields: {
          is_favourite: {
            $in: [new mongoose.Types.ObjectId(userId), '$user_favourite_resources._id']
          }
        }
      },
      {
        $group: {
          _id: '$_id',
          status: { $first: '$status' },
          project_name: { $first: '$projects.project_name' },
          project_description: { $first: '$projects.project_description' },
          project_available_groups: { $first: '$projects.project_available_groups' },
          createdAt: { $first: '$createdAt' },
          updatedAt: { $first: '$updatedAt' },
          project_created_by_user_id: {
            $first: {
              user_first_name: '$created_by_user.user_first_name',
              user_last_name: '$created_by_user.user_last_name'
            }
          },
          is_favourite: { $first: '$is_favourite' },
          resource_type: { $first: '$resource_type' },
          resource_title: { $first: '$resource_title' },
          resource_props: { $first: '$resource_props' },
          resource_description: { $first: '$resource_description' },
          resource_uploader_id: { $first: '$resource_uploader_id' },
          resource_uploaded_by_user: {
            $first: {
              user_first_name: '$uploaded_by_user.user_first_name',
              user_last_name: '$uploaded_by_user.user_last_name'
            }
          },
          resource_project_id: { $first: '$resource_project_id' },
          resource_project_path: { $first: '$resource_project_path' },
          resource_group_id: { $first: '$resource_group_id' },
          resource_file_info: { $first: '$resource_file_info' },
          resource_versions: { $first: '$resource_versions' },
        }
      },
      {
        $sort: {
          createdAt: -1 // Sort by createdAt field in descending order
        }
      }
    ]);

    const resource = resources[0]

    if (!resource)
      throw new DataNotExistError("No resource found!")
    else
      res.status(200).json(resource);

  } catch (error) {
    res.status(422).json({
      error: error.name,
      message: error.message
    })
  }
}

const createDoc = async (req, res) => {
  try {
    const { userId } = getUserInfo(res)
    const payload = req.body;
    console.log("payload", payload);
    let resource_props = {}
    if (payload.resource_props) {
      resource_props = JSON.parse(payload.resource_props);
      // remove the uploaded file from the payload.resource_props
      delete resource_props.resource_file;
    }
    let newResource;

    if (payload.resource_type === "folder") {
      newResource = new Resource({
        ...payload,
        resource_uploader_id: userId,
      })
      console.log("payload", payload);

    } else {

      const authClient = await googleDrive.authorize()
      const uploadedDoc = await googleDrive.uploadFile(authClient, req.file)
      const response = await axios.post(process.env.PYTHON_NLP_URL + '/classify-and-keywords', {
        title: payload.resource_title,
        abstract: payload.resource_description
      });
      // const thumbnailBuffer = await sharp(req.file.path)
      //   .resize({ width: 100, height: 100 })
      //   .toBuffer();

      // const thumbnailPath = path.join(__dirname, '..', 'uploads', req.file.originalname);
      // fs.writeFileSync(thumbnailPath, thumbnailBuffer);

      // // Send the URL of the thumbnail to the frontend
      // const thumbnailUrl = `/uploads/${req.file.originalname}`;

      // const cloudinaryUploadedImage = await cloudinary.uploader.upload("uploads/plus.png");
      await unlinkAsync(req.file.path)

      newResource = new Resource({
        ...payload,
        resource_uploader_id: userId,
        resource_props: { category: response.data.category, keywords: ['computer science', response.data.category, ...response.data.keywords], ...resource_props },
        resource_file_info: {
          resource_file_url1: "http://docs.google.com/uc?export=open&id=" + uploadedDoc.data.id,
          resource_file_url2: "https://drive.google.com/file/d/" + uploadedDoc.data.id + "/view?usp=sharing",
          resource_file_url_id: uploadedDoc.data.id,
          resource_uploaded_at: new Date().toISOString(),
          resource_updated_at: new Date().toISOString(),
          resource_file_name: req.file.originalname,
          resource_file_type: req.file.mimetype,
          ...payload.resource_file_info
        },
      })
    }
    await newResource.save();
    res.status(200).json({ message: 'Resource registered successfully', resource: newResource });

  } catch (error) {
    res.status(401).json({
      error: error.name,
      message: error.message,
      errorD: error
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

    const { resourceId, type } = getUserInfo(res)

    const resource = await Resource.findOneAndUpdate(query, req.body, { new: true });

    if (!resource)
      throw new ServerError("Something went wrong. No resource was updated!")
    else
      res.status(200).json(resource);

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

    const resource = await Resource.findOneAndUpdate(query, { status: "archived" }, { new: true });
    if (!resource)
      throw new DataNotExistError("No resource found!")
    else
      res.status(200).json(resource);
  } catch (error) {
    res.status(422).json({
      error: error.name,
      message: error.message
    })
  }
}

module.exports = { listDoc, readDoc, createDoc, updateDoc, deleteDoc }