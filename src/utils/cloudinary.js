import {v2 as cloudinary} from 'cloudinary'
import fs from 'fs' //fs is file sytem

cloudinary.config({
    cloud_name : process.env.cloud_name,
    api_key : process.env.api_key,
    api_secret : process.env.api_secret,
})

const uploadOnCloudinary = async (localFilePath)=> {
    try{
        if(!localFilePath){
            return null
        }
        const response = await cloudinary.uploader.upload(localFilePath,{
            resource_type : "auto"
        })
        //file has been uploaded successfully
        console.log("file is uploaded on cloudinary", response.url);
        return response;
    }catch(error){
        fs.unlinkSync(localFilePath) // remove the locally saved temporary file as the upload operation gets failed
        return null;
    }
}

export {uploadOnCloudinary}

const uploadResult = await cloudinary.uploader
       .upload(
           'https://res.cloudinary.com/demo/image/upload/getting-started/shoes.jpg', {
               public_id: 'shoes',
           }
       )
       .catch((error) => {
           console.log(error);
       });