import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { ApiResponse } from "../utils/ApiResponse";
import {Video} from '../models/video.models'
import {Subscription} from '../models/subscription.models'
import  mongoose , { isValidObjectId }  from "mongoose";

const getChannelStatsTotalLikes = asyncHandler(async (req,res)=>{
    const userId = req.user?._id

    if(!userId){
        throw new ApiError(400 ,"UserId is not required")
    }

    const videoLiked = await Video.aggregate([
        {
            $match : {
                owner : new mongoose.Types.ObjectId(userId),
            }
        },
        {
            $lookup : {
                from : 'likes',
                localField : "owner",
                foreignField : "_id",
                as : "likes"
            }
        },
        {
            $addFields : {
                Likes: {
                    $size : "$likes"
                }
            }
        },

        {
            $project:{
                Likes : 1
            }
        }
    ])

    if(!videoLiked || videoLiked.length === 0){
        throw new ApiError(404 ,"No videos found for the given user")
    }

    return res.status(200).json(new ApiResponse(200,"Videos Liked" , {videoLiked}))
})
const getChannelStatsTotalVideos = asyncHandler(async (req,res)=>{
    const userId = req.user?._id

    if(!isValidObjectId(userId)){
        throw new ApiError(400 , "Invalid User Id")
    }

    const totalVideos = await Video.aggregate([
        {
            $match : {
                owner : new mongoose.Types.ObjectId(userId),
            }
        },
        {
            $group : {
                _id : '$owner',
                totalVideos : { $sum : 1}
            }
        },
        {
            $lookup : {
                from : "users",
                localField : "_id",
                foreignField : "_id",
                as : "userDetails"
            }
        },
        {
            $unwind : "$userDetails"
        },
        {
            $project : {
                totalVideos : 1,
                userDetails : {
                    username : 1,
                    email :1,
                    fullname : 1
                }
            }
        }
    ])

    if(!totalVideos || totalVideos.length === 0){
        throw new ApiError(400, "No videos found for this user")
    }

    return res.status(200).json(
        new ApiResponse(200, "Total video count fetched successfully")
    )
})
const getChannelStatsTotalSubscriber = asyncHandler(async (req,res)=>{
    const userId = req.user?._id

    if(!userId){
        throw new ApiError(400 , "This user id is not valid")
    }

    const totalSubscriber = await Subscription.aggregate([
        {
            $match : {
                channel : new mongoose.Types.ObjectId(userId),
            }
        },
        {
            $group: {
                _id : "$channel",
                totalSubscriber : { $sum : 1}
            }
        },
        {
            $project : {
                totalSubscriber : 1
            }
        }
    ])

    if(!totalSubscriber || totalSubscriber.length === 0){
        throw new ApiError(400, "Cant fetch the total subscriber")
    }

    return res.status(200).json(
        new ApiResponse(200, "Total subscriber fetched successfully",{totalSubscriber})
    )
})
const getChannelVideos = asyncHandler(async (req,res)=>{
    try {
        const userId = req.user?._id

        if(!isValidObjectId(userId)){
            throw new ApiError(400 , "The user id is not valid")
        }
        const channelVideo = await Video.aggregate([
            {
                $match : {
                    owner : new mongoose.Types.ObjectId(userId),
                }
            },
            {
                $lookup: {
                    from: "users",
                    localField: "owner",
                    foreignField: "_id",
                    as: "allvideos",
                  },
            },
            {
                addField: {
                    totalVideos : {
                        $size : "$allvideos"
                    }
                }
            },
            {
                $project : {
                    allVideo : 1,
                    totalVideo : 1,
                    title : 1
                }
            }
        ])

        if (!channelVideo || channelVideo.length === 0) {
            throw new Apisuccess(410, {
              numberOfVideos: 0,
              message: "No videos uploaded by the user",
            });
          }
        return res
        .status(200)
        .json(
            new ApiResponse(200, "All videos fetched successfully", { channelVideo }),
        );
    } catch (error) {
        return res.status(200).json(new ApiResponse(200, "All videos are fetched successfully", error))
    }
})

export {
    getChannelStatsTotalLikes,
    getChannelStatsTotalVideos,
    getChannelVideos,
    getChannelStatsTotalSubscriber
}