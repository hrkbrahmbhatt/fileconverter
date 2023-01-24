// src/publisher.js
const AWS = require("aws-sdk");
const config = require("../config.json");
const sqs = new AWS.SQS({
  apiVersion: "latest",
  region: "us-east-2",
});

exports.handler = async function ({ fileContent, fileName, parquet = false }) {
  try {
    return await sqs
      .sendMessage({
        QueueUrl:
          "https://sqs.us-east-2.amazonaws.com/545717050082/fileconverter-dev-jobs",
        // Any message data we want to send
        MessageBody: JSON.stringify({
          fileContent: fileContent,
          fileName: fileName,
          parquet: parquet,
        }),
      })
      .promise();
  } catch (e) {
    console.error(e);
    console.error("SQS message not sent", e);
    return {
      error: e,
    };
  }
};
