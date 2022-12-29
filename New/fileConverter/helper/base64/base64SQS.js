const path = require("path");
const config = require("../../config.json");
const AWS = require("aws-sdk");
const s3 = new AWS.S3();
const fs = require("graceful-fs");
const { S3ReadStream } = require("s3-readstream");
const publisher = require("../../src/publisher");

let base64Main = async (fileName) => {
  let file = fileName;
  // let file = "test.csv";
  const extName = path.extname(file);
  const filename = path.parse(file).name;

  file = filename + extName.toLowerCase();
  if (file !== undefined || file !== null || file !== "") {
    const filename = path.parse(file).name;
    let fileBase64;

    const downloadOriginalParams = {
      Bucket: config.S3_BUCKET_NAME,
      Key: `original/${file}`,
    };
    const downloadBase64Params = {
      Bucket: config.S3_BUCKET_NAME,
      Key: `base64/${filename}.base64`,
    };
    const returnObject = {};
    try {
      const response = await s3.getObject(downloadOriginalParams).promise(); // await the promise
      // if (response.ContentLength > config.FILE_SIZE) {
      //   console.error("File size is greater than ", config.FILE_SIZE_STRING);
      //   return {
      //     error: `File size is greater than ${config.FILE_SIZE_STRING}`,
      //   };
      // }
      fileBase64 = response.Body.toString("base64");
    } catch (e) {
      console.log(e);
      console.log("download error", e);
      return {
        error: e,
      };
    }

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
        returnObject.fileName = `${filename}.base64`;
        returnObject.location = returnUrl;
        returnObject.base64 = fileBase64;
      }
      // if (fileBase64.length < FILE_SIZE_UNDER5GB) {
      //   await s3.getSignedUrl("putObject", uploadParams).promise();
      //   console.log(
      //     `${file} is converted to Base64 and has been uploaded to ${config.S3_BUCKET_NAME}`
      //   );
      //   const returnUrl = `https://${config.S3_BUCKET_NAME}.s3.us-east-2.amazonaws.com/base64/${filename}.base64`;
      // return {
      //   fileName: `${filename}.base64`,
      //   location: returnUrl,
      //   base64: fileBase64,
      // };
      // }
    } catch (e) {
      console.log(e);
      console.log("upload error", e);
      return {
        error: e,
      };
    }

    try {
      const chunkSize = 250 * 1024;
      const uploadPartsPromise = new Promise((resolve, reject) => {
        s3.headObject(downloadBase64Params, (error, data) => {
          const options = {
            parameters: downloadBase64Params,
            s3,
            maxLength: data.ContentLength,
            byteRange: chunkSize, //240 KB
          };

          const readStream = new S3ReadStream(options);
          let partNumber = 0;
          readStream.on("data", async (chunk) => {
            console.log("Chunk Length: " + chunk.toString().length);
            partNumber++;
            const sqsResponse = await publisher.handler({
              fileContent: chunk.toString(),
              fileName: `${filename}_${partNumber}.base64`,
            });
          });
          readStream.on("end", () => {
            resolve();
            console.log("end");
            returnObject.sqsResponse = true;
          });
        });
      });

      const multipartMap = await uploadPartsPromise;
      return returnObject;
    } catch (e) {
      console.error(e);
      console.error("SQS Error", e);
      return {
        error: e,
      };
    }
  } else {
    console.error("Please give valid fileName to convert the File");
    return {
      error: `Please give valid fileName to convert the File`,
    };
  }
};

module.exports = base64Main;
