import mongoose , {isValidObjectId} from "mongoose";
import {Tweeet, Tweet} from "../models/tweet.models"
import { User } from "../models/user.models";
import { ApiError } from "../utils/ApiError";
import { ApiResponse } from "../utils/ApiResponse";
import { asyncHandler } from "../utils/asyncHandler";

const createTweet = asyncHandler(async (req,res)=>{
    const content = req.body

    if(!content || content.trim().length === 0){
        throw new ApiError(400, "Content cant be empty")
    }

    const user = await User.findById(req.user?._id)

    if(!user){
        throw new ApiError(400, "Couldn't find the user")
    }

    const tweet = await Tweet.create({
        content,
        owner : req.user?._id
    })

    if(!tweet){
        throw new ApiError(500 , "Try again later")
    }

    res.status(200).json(new ApiResponse(200,"Tweeted successfully",tweet))
})
const updateTweet = asyncHandler(async (req,res)=>{
    const {tweetId} = req.params
    const {content} = req.body

    if(!isValidObjectId(tweetId)){
        throw new ApiError(400, "Invalid tweet id")
    }

    if(!content || content.trim().length === 0){
        throw new ApiError(400, "Content cant be empty")
    }

    const newTweet = await Tweet.findById(tweetId)

    if(!newTweet){
        throw new ApiError(400 , "tweet not found")
    }

    if(newTweet?.owner.toString() !== req.user?._id.toString()){
        throw new ApiError(400,"Only owner can update the tweet")
    } 

    const tweet = await Tweet.findByIdAndUpdate(
        tweetId,
        {
            $set : {
                content : content
            }
        }, {
             new : true
        }
    )

    if(!tweet){
        throw new ApiError(500 , "Please try again later")
    }

    return res.status(200)
    .json(new Apisuccess(200,"Tweet updated successfully",tweet))
})
const deleteTweet = asyncHandler(async (req,res)=>{
    const {tweetId} = req.params
    
    if(!isValidObjectId(tweetId)){
        throw new ApiError(400 ,  "Invalid tweet id")
    }

    const tweet = await Tweet.findById(tweetId)

    if(!tweet){
        throw new ApiError(400 , "Tweet not found")
    }

    if(tweet?.owner.toString() !== req.user?._id.toString()){
        throw new ApiError(400, "The owner can only update the file")
    }

    await Tweet.findByIdAndDelete(tweetId)

    if(!tweet){
        throw new Apierror(500,"Try again later")
    }
    return res.status(200)
    .json(new Apisuccess(200,"Tweet deleted successfully",{}))
})
const getUserTweet = asyncHandler(async (req,res)=>{

    const {userId} = req.params

    if(!isValidObjectId(userId)){
        throw new ApiError(400 , "It is not a valid user id")
    }

    const user = User.findById(userId)

    if(!user){
        throw new Apierror(400 , "cant find the user")
    }

    const allTweets = Tweet.find(
        {
            owner : userId
        }
    )

    if(allTweets.length === 0){
        throw new ApiError(400 , 
            "No tweets by the user"
        )
    }

    return res.status(200).json(200,"All tweets fetched successfully", {allTweets})
})
const getAllTweet = asyncHandler(async (req,res)=>{
    const allTweets = await Tweet.aggregate([
        {
            $lookup : {
                from : 'users',
                localField : 'owner',
                foreignField : '_id',
                as : 'user'
            }
        },
        {
            $unwind : '$user'
        },
        {
            $project : {
                _id : 1,
                content : 1,
                createdAt : 1,
                'user.username' : 1
            }
        }
    ])

    return res.status(200).json(new ApiResponse(200, "All tweets fetched succesfully"), {allTweets})
})
export { createTweet , updateTweet , deleteTweet , getUserTweet , getAllTweet}