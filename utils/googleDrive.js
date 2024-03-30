// utils/googleDrive.js
const fs = require('fs');
const { load } = require('@pspdfkit/nodejs');
const { google } = require('googleapis');

const apikeys = require('../config/gdrive_api_keys.json');
const SCOPE = ['https://www.googleapis.com/auth/drive'];

const options = {
  density: 100,
  saveFilename: 'untitled',
  format: 'png',
  width: 600,
  height: 600,
};

// Function to provide access to the Google Drive API
async function authorize() {
  const jwtClient = new google.auth.JWT(
    apikeys.client_email,
    null,
    apikeys.private_key,
    SCOPE
  );

  await jwtClient.authorize();

  return jwtClient;
}

// Function to upload a file to Google Drive
async function uploadFile(authClient, fileToUpload) {
  return new Promise((resolve, rejected) => {
    const drive = google.drive({ version: 'v3', auth: authClient });
    const fileMetaData = {
      name: fileToUpload.originalname,
      parents: ['1DOPkDe69NwW3Y4-JFRTk7MJmToGO0igW'],
    };

    drive.files.create(
      {
        includePermissionsForView: "published",
        resource: fileMetaData,
        media: {
          body: fs.createReadStream(fileToUpload.path),
          mimeType: 'application/pdf',
        },
        fields:'id, thumbnailLink',
      },
      (error, file) => {
        console.log(file);
        if (error) {
          console.log("error", error);
          return rejected(error);
        }
        resolve(file);
      }
    );
  });
}

async function deleteFile(authClient, fileIdToBeDeleted) {
  return new Promise((resolve, rejected) => {
    const drive = google.drive({ version: 'v3', auth: authClient });

    drive.files.delete(
      {
        fileId: fileIdToBeDeleted
      },
      (error, file) => {
        if (error) {
          return rejected(error);
        }
        resolve(file);
      }
    );
  });
}

module.exports = { authorize, uploadFile, deleteFile };
