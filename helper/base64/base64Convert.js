const path = require("path");
const config = require("../../config.json");
const AWS = require("aws-sdk");
const s3 = new AWS.S3();
const fs = require("graceful-fs");
// const publisher = require("../../src/publisher");

let base64Main = async (fileName) => {
  let file = fileName;
  // let file = "Data8277.csv";
  const extName = path.extname(file);
  const filename = path.parse(file).name;

  file = filename + extName.toLowerCase();
  if (file !== undefined || file !== null || file !== "") {
    const filename = path.parse(file).name;
    let fileBase64;

    try {
      const downloadParams = {
        Bucket: config.S3_BUCKET_NAME,
        Key: `original/${file}`,
      };
      const response = await s3.getObject(downloadParams).promise(); // await the promise
      if (response.ContentLength > config.FILE_SIZE) {
        console.error("File size is greater than ", config.FILE_SIZE_STRING);
        return {
          error: `File size is greater than ${config.FILE_SIZE_STRING}`,
        };
      }
      fileBase64 = response.Body.toString("base64");
    } catch (e) {
      console.log(e);
      console.log("download error", e);
      return {
        error: e,
      };
    }
    let isQueue = true;
    if (isQueue === true) {
      try {
        const sqsResponse = await publisher.handler(event, fileBase64);
      } catch (error) {}
    } else {
      try {
        const uploadParams = {
          Bucket: config.S3_BUCKET_NAME,
          Key: `base64/${filename}.base64`,
          Body: fileBase64,
          ContentType: "text/plain; charset=base64",
        };

        if (fileBase64.length < config.FILE_SIZE_UNDER20MB) {
          await s3.putObject(uploadParams).promise();
          console.log(
            `${file} is converted to Base64 and has been uploaded to ${config.S3_BUCKET_NAME}`
          );
          const returnUrl = `https://${config.S3_BUCKET_NAME}.s3.us-east-2.amazonaws.com/base64/${filename}.base64`;
          return {
            fileName: `${filename}.base64`,
            location: returnUrl,
            // base64: fileBase64,
          };
        }
        if (fileBase64.length < FILE_SIZE_UNDER5GB) {
          await s3.getSignedUrl("putObject", uploadParams).promise();
          console.log(
            `${file} is converted to Base64 and has been uploaded to ${config.S3_BUCKET_NAME}`
          );
          const returnUrl = `https://${config.S3_BUCKET_NAME}.s3.us-east-2.amazonaws.com/base64/${filename}.base64`;
          return {
            fileName: `${filename}.base64`,
            location: returnUrl,
            base64: fileBase64,
          };
        }
      } catch (e) {
        console.log(e);
        console.log("upload error", e);
        return {
          error: e,
        };
      }
    }
  } else {
    console.error("Please give valid fileName to convert the File");
    return {
      error: `Please give valid fileName to convert the File`,
    };
  }
};

module.exports = base64Main;
