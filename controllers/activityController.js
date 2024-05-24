const Activity = require('../models/activity')
const Resource = require('../models/resource')
const Project = require('../models/project')
const Recommendation = require('../models/recommendation')
const { DataNotExistError, ServerError } = require('../helpers/exceptions');
const getUserInfo = require('../helpers/getUserInfo')
const mongoose = require('mongoose');
const fs = require('fs');
const axios = require('axios');
const path = require('path');
const User = require('../models/user');
const configPath = path.join(__dirname, '../config/nlp_config.json');

const listDoc = async (req, res) => {
  try {
    const { userId } = getUserInfo(res)
    const query = {
      ...req.query,
      activity_by_user_id: userId,
      status: "active"
    }

    const activity = await Activity.find(query).populate({ path: "activity_by_user_id", select: 'user_first_name user_last_name' });
    if (!activity)
      throw new DataNotExistError("No activity found!")
    else
      res.status(200).json(activity);
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

    const activity = await Activity.findOne(query)

    if (!activity)
      throw new DataNotExistError("No activity found!")
    else
      res.status(200).json(activity);

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
    let actReason = "", actRating = 0
    if (payload.duration > 10) {
      actReason += "browse>5seconds"
      actRating += 2.5
    } else if (payload.duration > 5) {
      actReason += "browse>5seconds"
      actRating += 1.5
    } else if (payload.duration > 3) {
      actReason += "browse>3seconds"
      actRating += 0.5
    }
    if (payload.is_fav) {
      if (payload.duration < 3) {
        actReason += "addToFavourite"
        actRating += 2.5
      } else {
        actReason += "+addToFavourite"
        actRating += 2.5
      }
    }
    // const newActivity = new Activity({
    //   ...payload,
    //   activity_type: actReason,
    //   activity_rating_gained: actRating,
    //   activity_by_user_id: userId
    // })

    const newActivity = await Activity.findOneAndUpdate(
      { activity_by_user_id: userId, activity_to_resource_id: payload.activity_to_resource_id },
      {
          ...payload,
          activity_type: actReason,
          activity_rating_gained: actRating,
          activity_by_user_id: userId
        },
      { upsert: true, new: true }
    )

    res.status(200).json({ message: 'Activity registered successfully', activity: newActivity });

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

    const activity = await Activity.findOneAndUpdate(query, req.body, { new: true });

    if (!activity)
      throw new ServerError("Something went wrong. No activity was updated!")
    else
      res.status(200).json(activity);

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

    const activity = await Activity.findOneAndUpdate(query, { status: "archived" }, { new: true });
    if (!activity)
      throw new DataNotExistError("No activity found!")
    else
      res.status(200).json(activity);
  } catch (error) {
    res.status(422).json({
      error: error.name,
      message: error.message
    })
  }
}

const recommendItem = async (req, res) => {
  try {
    let data = await readDataFromConfig()
    const { user_item_matrix, item_similarity_df } = data
    const { userId } = getUserInfo(res)

    const allUserAndRecommendations = {
      recommendation_to_user_id: userId,
      recommendation_of_resources: []
    }

    for (let cat in user_item_matrix) {
      const response = await axios.post(process.env.PYTHON_NLP_URL + '/recommend-document', { user_item_matrix: user_item_matrix[cat], item_similarity_df: item_similarity_df[cat], user_id: userId })

      for (let resourceId of response.data.recommended_items) {
        allUserAndRecommendations.recommendation_of_resources.push({
          recommendation_of_resource_id: resourceId,
          recommendation_of_resource_category: cat,
        })
      }
    }

    const recommendation = await Recommendation.findOneAndUpdate({ recommendation_to_user_id: userId }, allUserAndRecommendations, { upsert: true, new: true, setDefaultsOnInsert: true })
    res.status(200).json({ message: 'Recommendation registered successfully', recommendation });


    // await writeDataToConfig({ item_similarity_df })

    // data = await readDataFromConfig()
  } catch (error) {
    res.status(422).json({
      error: error.name,
      message: error.message
    })
  }
}

const updateUserItemMatrix = async (req, res) => {
  try {
    // get all activities
    const activities = await Activity.find();
    const userItemArray = activities.map(activity => {
      return {
        user_id: activity.activity_by_user_id,
        item_id: activity.activity_to_resource_id,
        rating: activity.activity_rating_gained,
        category: activity.activity_to_resource_category
      }
    })

    // convert to python api body
    const transformedData = userItemArray.reduce((acc, item) => {
      const { category } = item;
      if (!acc[category]) {
        acc[category] = {
          user_id: [],
          item_id: [],
          rating: [],
          category: []
        };
      }
      for (let x in item) {
        acc[category][x].push(item[x])
      }
      return acc;
    }, {});
    const userItemMatrix = {}
    for (let cat in transformedData) {
      const response = await axios.post(process.env.PYTHON_NLP_URL + '/get-user-item-matrix', { data: transformedData[cat], category: cat })
      userItemMatrix[cat] = response.data.user_item_matrix
    }

    await writeDataToConfig({ user_categories_resource_rating: transformedData, user_item_matrix: userItemMatrix })

    const data = await readDataFromConfig()
    res.status(200).json({ "data": data, "userItemMatrix": userItemMatrix });
  } catch (error) {
    res.status(422).json({
      error: error.name,
      message: error.message
    })
  }
}

const updateItemSimilarityDF = async (req, res) => {
  try {
    let data = await readDataFromConfig()
    const { user_item_matrix } = data

    const item_similarity_df = {}
    for (let cat in user_item_matrix) {
      const response = await axios.post(process.env.PYTHON_NLP_URL + '/get-item-similarity-df', { user_item_matrix: user_item_matrix[cat] })
      item_similarity_df[cat] = response.data.item_similarity_df
    }

    await writeDataToConfig({ item_similarity_df })

    data = await readDataFromConfig()
    res.status(200).json({ "data": item_similarity_df });
  } catch (error) {
    res.status(422).json({
      error: error.name,
      message: error.message
    })
  }
}

async function writeDataToConfig(newData) {
  fs.readFile(configPath, 'utf8', (err, data) => {
    if (err) {
      if (err.code === 'ENOENT') {
        // If the file does not exist, create it with the new data
        fs.writeFile(configPath, JSON.stringify(newData, null, 2), (err) => {
          if (err) {
            console.error('Error writing to config.json:', err);
          } else {
            console.log('Successfully created config.json');
          }
        });
      } else {
        console.error('Error reading config.json:', err);
      }
      return;
    }

    let existingData;
    try {
      existingData = JSON.parse(data);
    } catch (parseErr) {
      console.error('Error parsing config.json:', parseErr);
      return;
    }

    // Merge existing data with new data
    const mergedData = { ...existingData, ...newData };

    // Write the merged data back to config.json
    fs.writeFile(configPath, JSON.stringify(mergedData, null, 2), (err) => {
      if (err) {
        console.error('Error writing to config.json:', err);
      } else {
        console.log('Successfully updated config.json');
      }
    });
  });
}

function readDataFromConfig() {
  return new Promise((resolve, reject) => {
    if (fs.existsSync(configPath)) {
      fs.readFile(configPath, 'utf8', (err, data) => {
        if (err) {
          console.error('Error reading from config.json:', err);
          reject(err);
        } else {
          try {
            const jsonData = JSON.parse(data);
            console.log('Data read from config.json:', jsonData);
            resolve(jsonData);
          } catch (parseErr) {
            console.error('Error parsing config.json:', parseErr);
            reject(parseErr);
          }
        }
      });
    } else {
      console.log('config.json does not exist');
      reject(new Error('No Config file found!'));
    }
  });
}

const searchItem = async (req, res) => {
  const { query } = req.query;
  const { userId } = getUserInfo(res)

  try {
    // Search resources
    const resources = await Resource.find({
      $or: [
        { resource_title: { $regex: query, $options: 'i' } },
        { resource_description: { $regex: query, $options: 'i' } }
      ]
    });

    // Search projects
    // const projects = await Project.find({
    //   $or: [
    //     { project_name: { $regex: query, $options: 'i' } },
    //     { project_description: { $regex: query, $options: 'i' } }
    //   ]
    // });

    const projects = await Project.aggregate([
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
          $and: [{
            $or: [
              { 'groups.group_members.group_member_id': new mongoose.Types.ObjectId(userId) },
              { 'project_available_groups': { $size: 0 } }
            ]
          },
          {
            $or: [
              { project_name: { $regex: query, $options: 'i' } },
              { project_description: { $regex: query, $options: 'i' } }
            ]
          }
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

    res.json({ resources, projects });
  } catch (error) {
    res.status(422).json({
      error: error.name,
      message: error.message
    })
  }

}

module.exports = {
  listDoc,
  readDoc,
  createDoc,
  updateDoc,
  deleteDoc,
  updateUserItemMatrix,
  updateItemSimilarityDF,
  recommendItem,
  searchItem
}