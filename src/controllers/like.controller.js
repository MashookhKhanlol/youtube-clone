import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { ApiResponse } from "../utils/ApiResponse";
import {Like} from '../models/like.models.js'
import { isValidObjectId } from "mongoose";

const toggleVideoLiked = asyncHandler(async (req,res)=>{
    const {videoId} = req.params

    if(!isValidObjectId(videoId)){
        throw new ApiError(400, "Invalid VideoId")
    }

    const videoLikedAlready = await Like.findOne({
        $and : [
            {video : videoId},
            {likedBy : req.user?._id}
        ]
    })

    if(videoLikedAlready){
        await Like.findByIdAndDelete(
            videoLikedAlready?._id
        )
    }else{
        await Like.create({
            video : videoId,
            likedBy : req.user?._id
        })
    }

    return res.status(200).json(
        new ApiResponse(200,"Liked Already",{})
    )
})

const checkVideoLiked = asyncHandler(async (req,res)=>{
    const {videoId} = req.params

    if(!isValidObjectId(videoId)){
        throw new ApiError(400 , "Invalid Video Id")
    }

    const liked = await Liked.findOne({
        video : videoId,
        likedBy : req.user?._id
    })

    return res.status(200).json({liked : !!liked})
})

const toggleComment = asyncHandler(async (req,res)=>{
    const {commentId} =req.params

    if(!isValidObjectId(commentId)){
        throw new ApiError(404, "Comment id is invalid")
    }

    const comment = Like.findOne({
        $and : [
            {comment : commentId,},
            {likedBy : req.user._id}
        ]
    })

    if(comment){
        await Like.findByIdAndDelete(comment?._id)
    }else{
        await Like.create({
            comment : comment._id,
            likedBy : req.user?._id
        })
    }

    return res.status(200).json(new ApiResponse(200,"Comment Liked successfully",{}))
})

const toggleTweet = asyncHandler(async (req,res)=>{
    const {tweetId} = req.params
    if(!isValidObjectId(tweetId)){
        throw new ApiError(400, "Invalid Tweet Id")
    }

    const tweet = await Like.findOne({
        $and : [
            {tweet : tweetId},
            {likedBy : req.user?._id}
        ]
    })

    if(tweet){
        await Like.findByIdAndDelete(tweet._id)
    }else{
        await Like.create({
            tweet : tweetId,
            likedBy : req.user?._id
        })
    }

    return res.status(200)
    .json(new ApiResponse(200, "Tweet Liked Successfully",{}))
})

const getLikedVideos = asyncHandler(async (req,res)=>{
    const likedVideos = await Like.aggregate([
        {
            $match:{
                likedBy : req.user?._id
            }
        },
        {
            $lookup: {
                from : "videos",
                localField : "video",
                foreignField : "_id",
                as : "like"
            }
        },
        {
            $addFields:{
                totalLikedByUsers:{
                    $size : "$like"
                }
            }
        },
        {
            $project: {
                likedBy : 1,
                totalLikedByUsers : 1,
                like : 1
            }
        }
    ])

    if(!likedVideos ||  likedVideos.length === 0){
        throw new ApiError(404 , "Couldn't find the liked videos")
    }

    return res.status(200).json(new ApiResponse(200,"Fetched all the liked videos successfully", {likedVideos}))
})

export {
    getLikedVideos,
    toggleComment,
    toggleTweet,
    toggleVideoLiked,
    checkVideoLiked
}