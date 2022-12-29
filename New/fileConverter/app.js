"use strict";
const parquetConvertSQS = require("./helper/parquet/parquetConvertSQS");
const base64Convert = require("./helper/base64/base64Convert");
const base64SQS = require("./helper/base64/base64SQS");
const base64MultiPart = require("./helper/base64/base64MultiPart");
const { EventBridge } = require("aws-sdk");

module.exports.handler = async (event) => {
  try {
    // const fileName = "test.csv";
    // return await base64SQS(fileName);
    // Appsync Call
    if (Object.prototype.hasOwnProperty.call(event, "arguments")) {
      const isParquet = event.arguments.parquet;
      const fileName = event.arguments.fileName;
      if (
        fileName === null ||
        fileName === "" ||
        fileName.length === 0 ||
        fileName === undefined
      ) {
        return {
          error: `Please give a value to fileName`,
        };
      }
      if (isParquet !== undefined && isParquet === true) {
        return await parquetConvertSQS(fileName);
      }
      return await base64MultiPart(fileName);
    }

    // API Gateway Call
    if (Object.prototype.hasOwnProperty.call(event, "queryStringParameters")) {
      const isParquet = event.queryStringParameters.parquet;
      const fileName = event.queryStringParameters.fileName;
      if (
        fileName === null ||
        fileName === "" ||
        fileName.length === 0 ||
        fileName === undefined
      ) {
        return {
          error: `Please give a value to fileName`,
        };
      }
      if (isParquet !== undefined && isParquet === "true") {
        return await parquetConvertSQS(fileName);
      }
      // return await base64MultiPart(fileName);
      // return await base64Convert(fileName);
      return await base64MultiPart(fileName);
    }
  } catch (err) {
    console.log(err);
  }
};
