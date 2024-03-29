require('dotenv').config(); //start reading .env files
//node modules
const { TwitterApi } = require('twitter-api-v2');
const mongoose = require('mongoose');
const fs = require("fs");
const os = require("node:os");
const axios = require('axios').default;
const express = require('express');


/**************************** NASA API Functions ****************************/
//get NASA API Key
const apiKeyNasa = process.env.NASA_API_KEY;

//get NASA APOD data
async function getAPOD() {
    const apodURL = `https://api.nasa.gov/planetary/apod?api_key=${apiKeyNasa}`;

    //make https request
    const response = await axios.get(apodURL);
    
    //send data back 
    return response.data;
}


/**************************** Twitter API Functions ****************************/
// create client with OAuth1 credientials
const client = new TwitterApi({
    appKey: process.env.TWITTER_API_KEY,
    appSecret: process.env.TWITTER_KEY_SECRET,
    accessToken: process.env.TWITTER_ACCESS_TOKEN,
    accessSecret: process.env.TWITTER_TOKEN_SECRET,
});

//send APOD Image + Tweet
async function postAPODTweet(apodData) {
    const apodMediaURL = apodData.url; //get the url of the image
    const apodMediaTitle = apodData.title; //get the title of the image

    //get database APOD data
    const databaseAPOD = await findAllData();
    const days = databaseAPOD[0].day + 1; //get day
    const apodTweetCount = databaseAPOD[0].apodTweets + 1; //get APOD tweet count

    //get image and save it
    const mediaType = apodMediaURL.split(".").at(-1) //get type of media that is going to get streamed)
    const localMediaURL = `${os.tmpdir()}/apodMedia.${mediaType}`; //pictures, audio, video
    
    //get the boolean value of the supported media types
    const supportedMedia = mediaType === "mov" || mediaType === "mp4" || mediaType === "jpg" || mediaType === "png" || mediaType === "gif" || mediaType === "webp";
    //decide if media can be uploaded, or must be put into a link
    //only .mov, .mp4, .jpg, .png, .webp are allowed in tweets
    if (supportedMedia) {
        //create the twitter text template
        const tweetText = `\
Tweet me a Universe
---

Everday a new NASA image or factoid.

Day: ${days}
APOD Tweet Count: ${apodTweetCount}

${apodMediaTitle}`;

        console.log(localMediaURL);

        // GET request for remote image in node.js using Axios
        const mediaData = await axios({
            method: 'get',
            url: apodMediaURL,
            responseType: 'stream'
        })
        const imageUpload = mediaData.data.pipe(fs.createWriteStream(localMediaURL)); //make image in local machine

        //when finish downloading media
        imageUpload.on("finish", async () => {
            const mediaUploadID = await client.v1.uploadMedia(localMediaURL, { type: mediaType }); //attach media to tweet, specify type of media being added to not default to .jpg

            //tweet
            const successfulTweet = await client.v2.tweet({ text: tweetText, media: { media_ids: [mediaUploadID] } }); //make post request to Twitter to post tweet
            //check if tweet is sucessful
            if (successfulTweet) {
                console.log("Sucessfully Posted APOD Tweet"); //terminal feedback

                //update day and APOD number for Database
                //updateApodData();
            }

            //delete media
            fs.rm(localMediaURL, (err) => {
                //check for error
                if (err) {
                    console.log(err)
                }
                //no error
                else {
                    console.log("Deleted Apod Image Successfully");
                }
            });
        });
    }
    
    //no media type supported
    else {
        //create the twitter text template
        const tweetText = `\
Tweet me a Universe
---

Everday a new NASA image or factoid.

Day: ${days}
APOD Tweet Count: ${apodTweetCount}

${apodMediaTitle}
${apodMediaURL}`;

        //tweet without image
        const successfulTweet = await client.v2.tweet(tweetText); //make post request to Twitter to post tweet
        //check if tweet is sucessful
        if (successfulTweet) {
            console.log("Sucessfully Posted APOD Tweet"); //terminal feedback

            //update day and APOD number for Database
            //updateApodData();
        }

    }
}


/**************************** MongoDB Database ****************************/
//get mongoDB password
const mongoPassword = process.env.MONGODB_PASSWORD;
//connect to mongoDB Database
mongoose.connect(`mongodb+srv://admin:${mongoPassword}@cluster0.ycayp.mongodb.net/?retryWrites=true&w=majority`)

//make Schema
const mainSchema = new mongoose.Schema({
    day: Number,
    apodTweets: Number
});

//create model
const Main = new mongoose.model("Main", mainSchema);

//create document
async function resetMainDocument() {
    //delete all documents
    await Main.deleteMany({});

    //reset and create n
    const document = new Main({
        day: 10,
        apodTweets: 10
    });

    await document.save().then(() => console.log("Reset Tweet me a Universe Database")); //saves to mongo database
}

//update APOD tweets w/ Days
async function updateApodData() {
    const data = findAllData();

    //resolve data promise
    data.then(async res => {
        //create updated values
        const updatedDays = res[0].day + 1;
        const updatedApodTweets = res[0].apodTweets + 1;

        //update the data
        await Main.updateMany({}, { $set: { day: updatedDays, apodTweets: updatedApodTweets } });
        console.log("Successfully Updated APOD Database Values");
    });
}

//find all the information
async function findAllData() {
    return await Main.find({});
}


/**************************** RUN SERVER + SCHEDULER ****************************/
const app = express();

app.get("/", (req, res) => {
    let message = req.query.key; //check for key to run function

    if (message === process.env.HTTP_KEY) {
        let data = getAPOD(); //get apod data
        data.then(data => postAPODTweet(data)); //resolve promise, post the tweet
        res.send("VALID, starting tweet process");
    }
    else {
        res.send("Not Valid");
    }
});

app.listen(3000);
// exports.runTweet = (req, res) => {
//     let message = req.query.key; //check for key to run function

//     if (message === process.env.HTTP_KEY) {
//         let data = getAPOD(); //get apod data
//         data.then(data => postAPODTweet(data)); //resolve promise, post the tweet
//     }
//     else {
//         res.send("Not Valid");
//     }
// };