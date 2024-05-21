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

const listDoc = async (req, res) => {
  try {
    console.log(req.query);
    const query = {
      ...req.query,
      status: "active"
    }

    const resource = await Resource.find(query)
      .populate({ path: "resource_uploader_id", select: ' -user_password' })
      // .populate({ path: "resource_versions.resource_version_updated_userId", })

      // console.log(resource);
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

const readDoc = async (req, res) => {
  try {
    const query = {
      ...req.query,
      _id: req.params.id,
      status: "active"
    }

    const resource = await Resource.findOne(query)
      .populate({ path: "resource_uploader_id", select: ' -user_password' })
      .populate({ path: "resource_versions.resource_version_updated_userId", })


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
    console.log(payload);
    let newResource;

    if (payload.resource_type === "folder") {
      newResource = new Resource({
        ...payload,
        resource_uploader_id: userId,
      })

    } else {

      const authClient = await googleDrive.authorize()
      const uploadedDoc = await googleDrive.uploadFile(authClient, req.file)
      const response = await axios.post(process.env.PYTHON_NLP_URL+'/classify-and-keywords', {
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
      console.log(uploadedDoc);
      await unlinkAsync(req.file.path)

      newResource = new Resource({
        ...payload,
        resource_uploader_id: userId,
        resource_props: {category: response.data.category, keywords: ['computer science', response.data.category, ...response.data.keywords]},
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