import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { ApiResponse } from "../utils/ApiResponse";
import { Video } from "../models/video.models";
import { uploadOnCloudinary } from "../utils/cloudinary";
import { isValidObjectId } from "mongoose";

const getAllVideos = asyncHandler(async (req,res)=>{
    const {
        page = 1,
        limit =10,
        query,
        sortBy = 'createdAt',
        sortType = 'asc',
        userId,
    } = req.query

    const pageNumber = parseInt(page ,10)
    const limitNumber = parseInt(limit,10)
    const sortDirection = sortType === "asc" ? 1 : -1

    const filter ={}
    if(query){
        filter.title = { $regex : query, $options : "i"}
    }
    if(userId){
        filter.userId = userId
    }

    try {
        const videos = await Video.find(filter)
        .sort({[sortBy] : sortDirection})
        .skip((pageNumber-1)*limitNumber)
        .limit(limitNumber)

        const totalVideos = await Video.countDocuments(filter)

        res.status(200)
        .json(new ApiResponse(200, "Data sent successfully",{
            success : true,
            data : videos,
            totalVideos,
            totalPages : Math.ceil(totalVideos/limitNumber),
            currentPage : pageNumber
        }),
    );  
    } catch (error) {
        res.status(500).json(new ApiError(500, "error while fetchinng videos"))
    }
})

const publishVideo = asyncHandler(async(req,res)=>{
    const {title , description}  = req.body;

    if(!title || title.length === 0){
        throw new ApiError(400, "Title field cannot be empty")
    }
    if(!description || description.length === 0){
        throw  new ApiError(400 , "Description cannot be empty")
    }

    let videoFilePath = req.files?.videoFile[0].path;
    let thumbnailPath = req.files?.thumbnailFile[0].path;

    if(!videoFilePath){
        new ApiError(400, "No video uploaded")
    }if(!thumbnailPath){
        new ApiError(400,"No thumbnail found")
    } 

    const video = await uploadOnCloudinary(videoFilePath);
    const thumbnail = await uploadOnCloudinary(thumbnailPath);

    if(!video){
        throw new ApiError(400,"Video should be added compulsary")
    }
    if(!thumbnail){
        throw new ApiError(400,"Thumbnail should be added compulsary")
    }

    const uploadVideo = await Video.create({
        title : title,
        owner : req.user?._id,
        description : description,
        videoFile : video.url,
        thumbnail : thumbnail.url,
        duration : video.duration,
        isPublished : true,
    });
    if(!uploadVideo){
        throw new ApiError(400 , "couldnt upload the video")
    }

    return res.status(200).json(new ApiResponse(200,"Video uploaded successfully", {uploadVideo}))
})

const getVideoById = asyncHandler(async (req,res)=>{
    const {videoId} =req.params

    if(!isValidObjectId(videoId)){
        throw new ApiError(400 , 'Not a valid video id')
    }

    const video = await Video.findById(videoId)
    if(!video){
        throw new ApiError("Couldnt find the video or it does not exist")
    }

    return res.status(200).json(new ApiResponse(200, "Video found successfully", {video}))
})

const updateVideoThumbnail = asyncHandler(async (req,res)=>{
    const {videoId} = req.params;
    if(!isValidObjectId(videoId)){
        throw new ApiError(400, "Invalid video id")
    }

    const video = await Video.findById(videoId);
    if(video.owner.toString() !== req.user?._id.toString()){
        throw new ApiError(400, "only owner can update the thumbnail")
    }

    const thumbnailPath = req.file?.path;
    if(!thumbnailPath){
        throw new ApiError(400, "no thumbnail file is uploaded")
    }

    const thumbnail = await uploadOnCloudinary(thumbnailPath)
    const updateVideo = await Video.findByIdAndUpdate(
        videoId,
        {
            $set : {
                thumbnail : thumbnail.url,
            },
        },
        {new : true}
    );

    if(!updateVideo){
        throw new ApiError(404 , "Thumbnail could not be updated")
    }

    return res.status(200).json(new ApiResponse(200,"Thumbnail updated successfully"))
});

const updateTitleAndDescription = asyncHandler(async (req,res)=>{
    const {title ,description} = req.body;

    if(!title || title.length === 0){
        throw new ApiError(400,"Title is required")
    }
    if(!description || description.length === 0){
        throw new ApiError(400 , "Description is required")
    }

    const {videoId} = req.params;

    const video = await Video.findById(videoId);
    if(video.owner.toString() !== req.user?._id.toString()){
        throw new ApiError(400, "Only the owner of the video can update the title and description")
    }

    const updateTAD = await Video.findByIdAndUpdate(
        videoId,
        {
            $set : {
                title : title,
                descritpion : description
            },
        },
        {new : true}
    )

    if(!updateTAD){
        throw new ApiError(400 , "Title and description could not be updated")
    }
    return res.status(200).json(
        "Title and description are updated",
        updateTAD
    )
})

const deleteVideo = asyncHandler(async (req,res)=>{
    const {videoId} = req.params;
    if(!isValidObjectId(videoId)){
        throw new ApiError(400 , "Invalid video id")
    }

    const video = await Video.findById(videoId);

    if(video.owner.toString() !== req.user?._id.toString()){
        throw new ApiError(400 , "only the owner can delete the video")
    }

    const deleteVideo = await Video.findByIdAndDelete(videoId);
    if(!deleteVideo){
        throw new ApiError(400, "Video could not be deleted")
    }

    return res.status(200).json(200, "Video deleted successfully", {deleteVideo})
})

const viewsInVideo = asyncHandler(async(req,res)=>{
    const {videoId} = req.params
    const userId = req.user?._id

    if(!isValidObjectId(videoId)){
        throw new ApiError(400,"Video id is not valid")
    }

    try {
        const video = await Video.findById(videoId);

        if(!video){
            return res.status(400).json(new ApiError(404,"Video not found"))
        }

        if(!Array.isArray(video.views)){
            video.views = []
        }
        
        //increase the views if the user is neew
        if(!video.views.includes(userId)){
            video.views.push(userId);
            await video.save();
        }

        const totalViews = video.views.length;

        return res.status(200).json(200,"Total views fetched successfully", {totalViews})
    } catch (error) {
        return req.status(500).json(new ApiError(500, "Internal server error"))
    }
})

const togglePublishedStatus = asyncHandler(async (req,res)=>{
    const {videoId} = req.params
    if(!isValidObjectId(videoId)){
        throw new ApiError(400,"Video id is not valid")
    }

    const video = await Video.findById(videoId);
    if(video.owner.toString() !== req.user?._id.toString()){
        throw new ApiError(400, "Only the owner of the video can toggle published")
    }

    const toggle = await Video.findByIdAndUpdate(
        videoId,
        {
            $set : {
                isPublished : !video.isPublished,
            },
        },
        {new : true}
    )
    if(!toggle){
        throw new ApiError(404 , "Failed to toggle published")
    }
    return res.status(200).json(new ApiError(200,"Video published toggle successfully",{toggle}))
})


export {
    getAllVideos,
    publishVideo,
    getVideoById,
    updateVideoThumbnail,
    updateTitleAndDescription,
    deleteVideo,
    viewsInVideo,
    togglePublishedStatus
}