import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {User} from '../models/user.models.js'
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js"
import jwt from 'jsonwebtoken'
import { mongo } from "mongoose";

const generateAccessAndRefreshToken =async(userId)=>{
    try {
        const user = await User.findById(userId);
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken;
        user.save({validateBeforeSave : false})

        return {refreshToken , accessToken}


    } catch (error) {
        throw new ApiError(500,"Something went wrong while generating refresh and access token")
    }
}

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
    const existedUser = await User.findOne({
        $or : [{ username } , { email }]
    })

    if(existedUser){
        throw new ApiError(409 , "User with email and password already exists");
    }

    //this will get the files from local storage req.files used is multer function

    const avatarLocalPath = req.files?.avatar[0]?.path;
    // const coverImageLocalPath = req.files?.coverImage[0]?.path;
    let coverImageLocalPath;
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0){
        coverImageLocalPath = req.files?.coverImage[0]?.path;
    }

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

const loginUser = asyncHandler(async (req,res)=>{

    //taking data from the user
    const {username ,email, password} = req.body;


    //checking if the username or email is entered
    if(!email && !username){
        throw new ApiError(400 , "Username or email is required");  
    }

    //finding if the user exists in db
    const user = await User.findOne({
        $or: [{username}, {email}]
    })

    if(!user){
        throw new ApiError(404,"User does not exist")
    }

    //checking if the password is valid the function is called from users.models.js
    const isPasswordValid = await user.isPasswordCorrect(password);

    if(!isPasswordValid){
        throw new ApiError(401,"Invalid user credentials");
    }

    //generating access and refresh token 
    const {accessToken , refreshToken} = await generateAccessAndRefreshToken(user._id);

    //exluding the password and refresh token 
    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    //making secure options by giving access to modification to cookies in server side only not in frontend
    const options ={
        httpOnly : true,
        secure : true,
    }

    //sending response through api response token
    return res.status(200)
    .cookie("accessToken", accessToken,options)
    .cookie("refreshToken",refreshToken,options)
    .json(
        new ApiResponse(
            200,
            {
                user : loggedInUser,accessToken,refreshToken
            },
            "User Logged in successfully"
        )
    )
})

const logoutUser = asyncHandler(async(req ,res)=>{
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $unset: {
                refreshToken : 1,
            }
        },
        {
            new : true
        }
    )

    const options = {
        httpOnly : true,
        secure : true,
    }

    return res
    .status(200)
    .clearCookie("accessToken",accessToken,options)
    .clearCookie("refreshToken",refreshToken,options)
    .json(
        new ApiResponse(
            200,
            {},
            "User Loggin Out Successfully"
        )
    )
})

const refreshAccesstoken = asyncHandler(async (req,res)=>{

    //get the refresh token from the body or from the cookies
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if(!incomingRefreshToken){
        throw new ApiError(401,"Unauthorized request")
    }

    try {
        //here we decode the token 
        const decodedToken = await jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET 
        )
    
        //here we find the user from the db using the decoded token
    
        const user = await User.findById(decodedToken?._id)
    
        if(!user){
            throw new ApiError(401, "Unauthorized requrest")
        }

        //here we are checking whether the icoming refresh token is same as user refresh token which was saved earlier
        //if not same we return an error
        if(incomingRefreshToken !== user?.refreshToken){
            throw new ApiError(401,"Refresh token is expired or used")
        }
    
        const options = {
            httpOnly : true,
            secure : true
        }
    
        const {accessToken , newRefreshToken } = await generateAccessAndRefreshToken(user._id)
        
    
        return res.
        status(200)
        .cookie("accessToken", accessToken , options)
        .cookie("refreshToken",newRefreshToken , options    )
        .json(
            new ApiResponse(200,
                {accessToken,refreshToken : newRefreshToken},
                "Access token refreshed successfully"
            )
        )
    } catch (error) {
        throw new ApiError("Invalid refresh token")
    }
})

const changeCurrentPassword = asyncHandler(async (req,res)=>{
    const {oldPassword , newPassword} = req.body

    const user = await User.findById(req.user?._id)
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if(!isPasswordCorrect){
        throw new ApiError(400 , "Invalid password error")
    }

    user.password = newPassword
    await user.save({validateBeforeSave : false})

    return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed successfully"))
})

const getCurrentUser = asyncHandler(async (req,res)=>{
    return res.status(200)
    .json(new ApiResponse(200, req.user , "Current user fetched successfully"));
})

const updateAccountDetails = asyncHandler(async (req,res)=>{
    const {fullName , email } = req.body

    if(!fullName || !email){
        throw new ApiError(400, "All fields are required")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set : {
                fullName,   
                email : email
            }
        },
        {new : true}
    ).select("-password")

    return res
    .status(200)
    .json(new ApiResponse(200, user , "Account details updated successfully"))
})

const updateUserAvatar = asyncHandler(async (req,res)=>{
    const avatarLocalPath = req.file?.path

    if(!avatarLocalPath){
        throw new ApiError(400, "Avatar file is missing")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)

    if(!avatar.url){
        throw new ApiError(400 ,"Error while uploading on avatar")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                avatar : avatar.url
            }
        },
        {new : true}
    ).select("-password")

    return res.
    status(200).
    json(new ApiResponse(200,user , "Avatar has been uploaded successfully!"));
    
})

const updateUserCoverImage = asyncHandler(async (req,res)=>{
    const coverImageLocalPath = req.file?.path

    if(!coverImageLocalPath){
        throw new ApiError(400, "Cover Image file is missing")
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if(!coverImage.url){
        throw new ApiError(400 ,"Error while uploading on cover image")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                coverImage : coverImage.url
            }
        },
        {new : true}
    ).select("-password")

    return res.
    status(200).
    json(new ApiResponse(200,user , "cover Image has been uploaded successfully!"));
})

const getUserChannelProfile = asyncHandler(async (req,res)=>{
    const {username} = req.params //get the username from the url

    if(!username){
        throw new ApiError(400,"Username is missing")
    }

    const channel = await User.aggregate([
        {
            $match:{
                username : username?.toLowerCase
            },

            //here we count the subsriber through its channel 
            $lookup:{
                from : "subscriptions",
                localField : "_id",
                foreignField : "channel",
                as : "subscriber"

            },

            //here we count the subscriber to through the subscriber
            $lookup:{
                rom : "subscriptions",
                localField : "_id",
                foreignField : "subscriber",
                as : "subscribedTo"
            },

            //here we added additional values to user 
            $addFields:{
                subscribersCount : {
                    $size : "subscribers"
                },
                channelsSubscribedToCount:{
                    $size : "$subscribedTo"
                },
                isSubscribed:{
                    $cond: {
                        if: {$in : [req.user?._id, "$subscribers.subsriber"]},
                        then : true,
                        else : false
                    }
                }
            }
        },
        {
            //specifies what we fields we want to send or project
            $project: {
                fullName : 1,
                username : 1,
                subscribersCount : 1,
                channelsSubscribedToCount :1,
                avatar : 1,
                coverImage : 1,
                email : 1
            }
        }
    ])

    if(!channel?.length){
        throw new ApiError(404 , "Channel does not exists")
    }

    return res.status(200)
    .json(new ApiResponse(200,channel[0],"User channel fetched successfully"))
})

const getWatchHistory = asyncHandler(async(req,res)=>{
    const user = User.aggregate([
        {
            $match: {
                _id : new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup : {
                from : "videos",
                localField : "watchHistory",
                foreignField : "_id",
                as : "watchHistory",
                pipeline : [
                    {
                        $lookup: {
                            from : "users",
                            localField: "owner",
                            foreignField : "_id",
                            as : "owner",
                            pipeline: [
                                {
                                    $project : {
                                        fullName : 1,
                                        username : 1,
                                        avatar : 1,
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields : {
                            owner:{
                                $first : '$owner'
                            }
                        }
                    }
                ]
            }
        }
    ])

    return res.status(200).json(new ApiResponse(200,user[0].watchHistory,"Watch history fetched successfully"))
})


export {registerUser,
    loginUser,
    logoutUser,
    refreshAccesstoken,
    changeCurrentPassword , 
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile,
    getWatchHistory
}