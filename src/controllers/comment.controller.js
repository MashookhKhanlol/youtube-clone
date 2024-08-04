import { ApiError } from "../utils/ApiError";
import { ApiResponse } from "../utils/ApiResponse";
import {Comment} from '../models/comment.models'
import mongoose,  {Schema , isValidObjectId} from "mongoose";
import { asyncHandler } from "../utils/asyncHandler";
import {Video} from '../models/video.models'

const addComment = asyncHandler(async (req,res)=>{
    const {videoId} = req.params
    const {content} = req.body
    const video = await Video.findById(videoId)
    if(!video){
        throw new ApiError(400,"Video not found")
    }
    const comment = await Comment.create({
        content : content,
        video : videoId,
        owner : req.user?._id
    })

    if(!comment){
        throw new ApiError(400, 'Couldnt comment')
    }

    return res.status(200)
    .json(new ApiResponse(200,"commented successfully",comment))
})

const updateComment = asyncHandler(async (req,res)=>{
    const {commentId} = req.params
    const {content} = req.body

    if(!content || content.trim().length === 0){
        throw new ApiError(400 , "Comment cannot be empty")
    }

    const verifyComment = await Comment.findById(commentId)
    if(!verifyComment){
        throw new ApiError(400 , "couldnt find the comment")
    }

    if(!verifyComment?.owner.toString() !==req.user?._id.toString()){
        throw new ApiError(400, "Only valid user can update comment")
    }

    const comment = await Comment.findByIdAndUpdate(
        commentId,
        {
            $set : {
                content : content
            }
        }, { new : true}
    )

    if(!comment){
        throw new ApiError(404 , "Couldnt update the comment")
    }
    return res.status(200).json(new ApiResponse(200,"Comment Updated Successfully", comment))
})

const deleteComment = asyncHandler(async (req,res)=>{
    const {commentId} = req.params
    const comment = await Comment.findById(commentId)

    if(!comment){
        throw new ApiError(402 ,"Couldn't find the comment")
    }  

    if(comment.owner?.toString() !== req.user?._id.toString()){
        throw new ApiError(400 , "Only the owner can delete the comment ")
    }

    const newcomment = Comment.findByIdAndDelete(commentId);

    if(!newcomment){
        throw new error(400,"The comment couldnt be deleted")
    }
    
    throw res.status(200).json(new ApiResponse(200,"Commented deleted successfully",newcomment))
})

const getVideoComments = asyncHandler(async (req,res)=>{
    const {videoId} = req.params
    const {page = 1,limit =10} = req.query

    if(!isValidObjectId(videoId)){
        throw new ApiError(400 , "Invalid video id")
    }

    const allCommentsInVideo = await Comment.aggregate([
        {
            $match : {
                video : new mongoose.Types.ObjectId(videoId)
            },

            $lookup: {
                from : "videos",
                localField : 'video',
                foreignField : '_id',
                as : "comment"
            },

            $addFields: {
                totalCommentsByUser:{
                    $size : "$comment"
                }
            },

            $project: {
                totalCommentsByUser : 1,
                video :1,
                comment :1,
            }
        }
    ])

    if(!allCommentsInVideo 
        || allCommentsInVideo.length === 0
    ){
        throw new ApiError(404 , "Couldnt find the comments for the video")
    }

    return res.status(200).json(ApiResponse(200,"All comments in videos are fetched", allCommentsInVideo))
})

export {addComment , updateComment, deleteComment, getVideoComments}