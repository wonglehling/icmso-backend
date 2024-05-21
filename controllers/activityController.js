const Activity = require('../models/activity')
const { DataNotExistError, ServerError } = require('../helpers/exceptions');
const getUserInfo = require('../helpers/getUserInfo')
const mongoose = require('mongoose');
const fs = require('fs');
const axios = require('axios');
const path = require('path');
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

    const newActivity = new Activity({
      ...payload,
      activity_by_user_id: userId
    })
    await newActivity.save();
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

const recommendItem = (req, res) => {
  return
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
    // get all activities
    // const activities = await Activity.find();
    // const userItemArray = activities.map(activity => {
    //   return {
    //     user_id: activity.activity_by_user_id,
    //     item_id: activity.activity_to_resource_id,
    //     rating: activity.activity_rating_gained,
    //     category: activity.activity_to_resource_category
    //   }
    // })

    // // convert to python api body
    // const transformedData = userItemArray.reduce((acc, item) => {
    //   const { category } = item;
    //   if (!acc[category]) {
    //     acc[category] = {
    //       user_id: [],
    //       item_id: [],
    //       rating: [],
    //       category: []
    //     };
    //   }
    //   for (let x in item) {
    //     acc[category][x].push(item[x])
    //   }
    //   return acc;
    // }, {});
    let data = await readDataFromConfig()
    const { user_item_matrix } = data

    const item_similarity_df = {}
    for(let cat in user_item_matrix){
      const response = await axios.post(process.env.PYTHON_NLP_URL+'/get-item-similarity-df', {user_item_matrix: user_item_matrix[cat]})
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

module.exports = { listDoc, readDoc, createDoc, updateDoc, deleteDoc, updateUserItemMatrix, updateItemSimilarityDF }