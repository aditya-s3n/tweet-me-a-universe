require('dotenv').config(); //start reading .env files
//node modules
const { TwitterApi } = require('twitter-api-v2');
const mongoose = require('mongoose');
const fs = require("fs");
const axios = require('axios').default;
const schedule = require("node-schedule");


/**************************** Scheduler ****************************/
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
    const apodImageURL = apodData.url; //get the url of the image
    const apodImageTitle = apodData.title; //get the title of the image
    
    //get database APOD data
    const databaseAPOD = await findAllData();
    const days = databaseAPOD[0].day + 1; //get day
    const apodTweetCount = databaseAPOD[0].apodTweets + 1; //get APOD tweet count

    //create the twitter text template
    const tweetText = `\
Tweet me a Universe
---

Everday my bot tweets a new NASA image or factoid.

Day: ${days}
APOD Tweet Count: ${apodTweetCount}

${apodImageTitle}`;

    //get image and save it
    const localImageURL = "./apodImage.jpg";
    // GET request for remote image in node.js using Axios
    const imageData = await axios({
        method: 'get',
        url: apodImageURL,
        responseType: 'stream'
    })
    const imageUpload = imageData.data.pipe(fs.createWriteStream(localImageURL)); //make image in local machine

    //when finish downloading image
    imageUpload.on("finish", async () => {
        const imageUploadId = await client.v1.uploadMedia(localImageURL); //attach image to tweet

        //tweet
        const successfulTweet = await client.v1.tweet(tweetText, { media_ids: imageUploadId }); //make post request to Twitter to post tweet
        //check if tweet is sucessful
        if (successfulTweet) {
            console.log("Sucessfully Posted APOD Tweet");
        }

        //delete image
        fs.rm(localImageURL, (err) => {
            //check for error
            if (err) {
                console.log(err)
            }
            //no error
            else {
                console.log("Deleted Apod Image Successfully");

                //update day and APOD number for Database
                //updateApodData();
            }
        });
    });
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
        day: 1,
        apodTweets: 1,
    });

    await document.save().then(() => console.log("Reset Tweet me a Universe Database")); //saves to mongo database
}

//update APOD tweets w/ Days
async function updateApodData() {
    const data = findAllData();

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
const rule = new schedule.RecurrenceRule(); //start the scheduler to recur to the rule
rule.hour = 14; //recur at 7am everday
rule.minute = 0; //should only recur at 7:00am 
rule.tz = "EST"; //change timezone to eastern standard time

//run the job with the recursion rule
schedule.scheduleJob(rule, () => {
    console.log("Beginning APOD Tweet Process"); //terminal feedback

    let data = getAPOD(); //get the apod data
    data.then(data => postAPODTweet(data)); //resolve the promise, and post the tweet
});