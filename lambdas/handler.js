'use strict';

const AWS = require('aws-sdk');
const fileType = require('file-type');

const s3 = new AWS.S3({apiVersion: '2006-03-01'});
const pg = require("pg");


module.exports.hello = (event, context, callback) => {
  callback(null, { Message: 'Hello World!', Info:{
    env: process.env
  }});
};

module.exports.goodNight = (event, context, callback) => {
  callback(null, { Message: 'Good Night World!'});
};

module.exports.upload = (event, context, callback) => {
  context.callbackWaitsForEmptyEventLoop = false;

  // const username = context.authorizer.claims.preferred_username;
  const username = "manual_user";

  const title = event.body.title ? event.body.title.replace(/\W/g,'') : 'uploaded_image';

  //get the image data from upload
  const body = event.body;

  const fileBuffer = new Buffer(body['image'].replace(/^data:image\/\w+;base64,/, ""), 'base64');
  const fileMime = fileType(fileBuffer);
  const mime = fileMime.mime;
  const ext = fileMime.ext;

  //validate image is on right type
  if (fileBuffer.length < 500000 ) {

    // upload it to s3 with unix timestamp as a file name
    const timestamp = Math.floor(new Date() / 1000);
    const fileName = `${title}-${timestamp}.${ext}`;

    const bucket = process.env.BUCKET;
    const bucket_url = process.env.BUCKET_URL;
    const connectionString = process.env.PG_CONNECTION_STRING;
    const tableName = process.env.PG_TABLE;
    const staticurl = `${BUCKET_URL}/${fileName}`;

    const params = {
        Body: fileBuffer,
        Key: fileName,
        Bucket: bucket,
        ContentEncoding: 'base64',
        ContentType: mime,
        Metadata:{
          ContentType: mime,
          "user": username,
          "description":  event.body.description
        }
    };

    const insert_query = `INSERT INTO ${tableName}(Timestamp, BucketKey, Username, Description, FileName, StaticLink) values($1, $2, $3, $4, $5, $6)`

    s3.putObject(params, (err, data) => {
        if (err) callback(new Error([err.statusCode], [err.message]));

        pg.connect(connectionString, (err, client, done) => {
          if(err) callback(new Error([err.statusCode], res.status(500).json({success: false, data: err} )));

          client.query(insert_query,[timestamp, bucket, username, description, filename, staticurl], (err, result) => {

            if(err) callback(new Error([err.statusCode], [err.message]));

            client.end();

            done();

            callback(null, {
                  statusCode: '200',
                  headers: {'Access-Control-Allow-Origin': '*'},
                  body: JSON.stringify({'data': data})
              });

            });

        });
    });
  } else {
      callback(null, {
          statusCode: '402',
          headers: {'Access-Control-Allow-Origin': '*'},
          body: JSON.stringify({"message": "Not a valid file type or file too big."})
      });
  }
};

module.exports.list = (event, context, callback) => {

  context.callbackWaitsForEmptyEventLoop = false;

  // const listQuery = `SELECT * FROM ${process.env.PG_TABLE} ORDER BY timestamp DESC LIMIT 20;`;
  // const client = new pg.Client(process.env.PG_CONNECTION_STRING);
  // console.log(process.env.PG_CONNECTION_STRING);
  // console.log('connected?');
  // client.connect((err, res) => {
  //   console.log(err);
  //   console.log(res);
  // });
  // console.log('connected!');
  // const query = client.query('SELECT NOW();', (err, results) => {
  //    client.end();
  //    console.log(results);
  //    console.log(err);
  //   //  callback(null, {
  //   //   statusCode: '200',
  //   //   headers: {'Access-Control-Allow-Origin': '*'},
  //   //   body: JSON.stringify({"message": results})
  //   // });

  //   context.succeeded(results);
    // callback(null, {
    //   statusCode: '200',
    //   headers: {'Access-Control-Allow-Origin': '*'},
    //   body: JSON.stringify({"message": "OK"})
    // });


  // });

  // context.callbackWaitsForEmptyEventLoop = false;

  const connectionString ='postgresql://hackers:hackers_password@hackday-pg-template.ckthmwbknecx.eu-west-1.rds.amazonaws.com:5432/hackers_db';
  const pg = require('pg')
  const client = new pg.Client(connectionString);
  client.connect();
  const query = client.query('SELECT NOW();', (err, results) => {
       client.end();
       console.log("RESULTS HEEEEREEEEEE");
       console.log(results);
       console.log(err);
       callback(null, {
        statusCode: '200',
        headers: {'Access-Control-Allow-Origin': '*'},
        body: JSON.stringify({"message": results})
      });
  });
  
  
}