const fs = require("graceful-fs");
const path = require("path");
const parquet = require("parquetjs");
const config = require("../../config.json");
const AWS = require("aws-sdk");
const s3 = new AWS.S3();

const parquetFolder = "/tmp/";

let parquetMain = async (fileName) => {
  let file = fileName;
  if (file !== undefined || file !== null || file !== "") {
    const extName = path.extname(file);
    const filename = path.parse(file).name;
    let textContent;

    if (extName.toLowerCase() === ".csv") {
      file = filename + extName.toLowerCase();
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
        textContent = response.Body.toString();
      } catch (e) {
        console.error(e);
        console.error("download error", e);
        return {
          error: e,
        };
      }

      try {
        const schemaObj = {};
        for (let headerRow of textContent.split("\n")) {
          const headerRowItems = headerRow.split(",");
          for (let elem of headerRowItems) {
            schemaObj[elem] = { type: "UTF8" };
          }
          break;
        }
        let schema = new parquet.ParquetSchema(schemaObj);
        const schemaKeys = Object.keys(schemaObj);
        let writer = await parquet.ParquetWriter.openFile(
          schema,
          `${parquetFolder}${filename}.parquet`
        );

        for (let row of textContent.split("\n")) {
          const rowItems = row.split(",");
          if (rowItems === schemaKeys) {
            continue;
          }

          const appendObj = {};
          for (let elem = 0; elem < rowItems.length; elem++) {
            appendObj[schemaKeys[elem]] = rowItems[elem];
          }

          if (Object.keys(appendObj).length > 1) {
            await writer.appendRow(appendObj);
          }
        }
        await writer.close();
      } catch (e) {
        console.error(e);
        console.error("parquet file creation error", e);
        return {
          error: e,
        };
      }

      try {
        const res = await fs.readFileSync(
          `${parquetFolder}${filename}.parquet`,
          { encoding: "utf8", flag: "r" }
        );

        const uploadParams = {
          Bucket: config.S3_BUCKET_NAME,
          Key: `parquet/${filename}.parquet`,
          Body: res,
          ContentType: "text/plain; charset=utf-8",
        };
        await s3.putObject(uploadParams).promise();
        console.log(
          `${file} is converted to parquet and has been uploaded to ${config.S3_BUCKET_NAME}`
        );
      } catch (e) {
        console.error(e);
        console.error("upload error", e);
        return {
          error: e,
        };
      }
      try {
        await fs.unlinkSync(`${parquetFolder}${filename}.parquet`);

        console.log(`${filename}.parquet has been deleted from LambdaFunction`);
      } catch (e) {
        console.error(e);
        console.error("upload error", e);
        return {
          error: e,
        };
      }
      const returnUrl = `https://${config.S3_BUCKET_NAME}.s3.us-east-2.amazonaws.com/parquet/${filename}.parquet`;
      return {
        fileName: `${filename}.parquet`,
        location: returnUrl,
      };
    } else {
      console.error("File format is not feasible to convert into parquet file");
      return {
        error: `File format is not feasible to convert into parquet file`,
      };
    }
  } else {
    console.error("Please give valid fileName to convert the File");
    return {
      error: `Please give valid fileName to convert the File`,
    };
  }
};
module.exports = parquetMain;
