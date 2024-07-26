import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {User} from '../models/user.models.js'
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const registerUser = asyncHandler( async (req,res)=>{

    //req.body is used to get data from the body
    const {username ,email, password, fullName } = req.body

    console.log("email : " ,email);

    //here we will check whether the fields are empty or not 

    if(
        [fullName, email, username , password].some((field) => field?.trim() === "")
        
    ){
        throw new ApiError(400 , "All fields are required")
    }

    //this will check if a user exists with same username or emailf
    const existedUser = User.findOne({
        $or : [{ username } , { email }]
    })

    if(existedUser){
        throw new ApiError(409 , "User with email and password already exists");
    }

    //this will get the files from local storage req.files used is multer function

    const avatarLocalPath = req.files?.avatar[0]?.path;
    const coverImageLocalPath = req.files?.coverImage[0]?.path;

    if(!avatarLocalPath){
        throw new ApiError(400 , "Avatar file is required");
    }

    //this will upload to cloudinary from the local storage

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if(!avatar){
        throw new ApiError(400 , "Avatar file is required")
    }

    //yeh hamare liye user object create karke deta hai 
    const user = await User.create({
        fullName,
        avatar : avatar.url,
        coverImage : coverImage?.url || "",
        email,
        password,
        username : username.toLowerCase(),
    })

    //this will exclude the fields to send during response

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    //this check whether the user was created or not 

    if(!createdUser){
        throw new ApiError(500 , "Something went wrong while registering the user")
    }

    return res.status(201).json(
        new ApiResponse(200,createdUser,"User registered successfully") 
    )
} )

export {registerUser,}