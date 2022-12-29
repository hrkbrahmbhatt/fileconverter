// src/worker.js
const { v4 } = require("uuid");
const AWS = require("aws-sdk");
const dynamodb = new AWS.DynamoDB.DocumentClient();
exports.handler = async function (event, context) {
  // SQS may invoke with multiple messages
  const id = v4();
  let fileName;
  let fileContent;
  let parquet;
  for (const message of event.Records) {
    const bodyData = JSON.parse(message.body);
    // console.log(bodyData);
    fileName = bodyData.fileName;
    fileContent = bodyData.fileContent;
    parquet = bodyData.parquet;

    const addFile = {
      id,
      fileName,
      fileContent,
    };
    try {
      if (parquet === true) {
        await dynamodb
          .put({
            TableName: "parquet",
            Item: addFile,
          })
          .promise();
        return {
          statusCode: 200,
          body: JSON.stringify(
            `Filename ${addFile.fileName} with id ${addFile.id} have been added to Database`
          ),
        };
      }
      await dynamodb
        .put({
          TableName: "Base64",
          Item: addFile,
        })
        .promise();
      return {
        statusCode: 200,
        body: JSON.stringify(
          `Filename ${addFile.fileName} with id ${addFile.id} have been added to Database`
        ),
      };
    } catch (e) {
      console.error(e);
      console.error("Database Error", e);
      return {
        error: e,
      };
    }
  }
};
