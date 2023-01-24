"use strict";
const parquetConvertSQS = require("./helper/parquet/parquetConvertSQS");
const base64SQS = require("./helper/base64/base64SQS");
const {validateData} = require("./helper/commonFiles/validateData.js")

module.exports.handler = async (event) => {
  try {
  
    // Appsync Call
    if (Object.prototype.hasOwnProperty.call(event, "arguments")) {
      const isParquet = event.arguments.parquet;
      const fileName = event.arguments.fileName;
      
      return await validateData(fileName);

      if (isParquet !== undefined && isParquet === true) {
        return await parquetConvertSQS(fileName);
      }
      return await base64SQS(fileName);
    }

    // API Gateway Call
    if (Object.prototype.hasOwnProperty.call(event, "queryStringParameters")) {
      const isParquet = event.queryStringParameters.parquet;
      const fileName = event.queryStringParameters.fileName;
      return await vaildationData(fileName);
      if (isParquet !== undefined && isParquet === "true") {
        return await parquetConvertSQS(fileName);
      }
      return await base64SQS(fileName);
    }
  } catch (err) {
    console.log(err);
  }
};
