import { app } from './app.js'
import { config } from 'dotenv';
import { connectDb } from './config/databse.js';
import cloudinary from "cloudinary"  

config({
    path: "./config/config.env"
});

cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.CLOUD_API_KEY,
    api_secret: process.env.CLOUD_API_SECRET,
});

connectDb();

app.listen(process.env.PORT, () => {
    console.log("Server is running on Port :" + process.env.PORT);
})