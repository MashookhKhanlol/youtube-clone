import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { ApiResponse } from "../utils/ApiResponse";
import { isValidObjectId } from "mongoose";
import {Playlist}  from '../models/playlist.models'

const createPlaylist = asyncHandler(async (req,res)=>{

    const {name , description} = req.body

    const playlist = await Playlist.create({
        name , 
        description ,
        owner : req.user?._id
    })

    if(!playlist){
        throw new ApiError(500, "Error ecoured while creating playlist ")
    }

    return res.status(200).json(new ApiResponse(200,"Playlist created successfully", playlist))
})

const updatePlaylist = asyncHandler(async (req,res)=>{
    const {name,description} = req.body
    const {playlistId} = req.params

    if(!isValidObjectId(playlistId)){
        throw new ApiError(404 , "Not a valid playlist id")
    }

    if(!description || description.length === 0){
        throw new ApiError(400, "Description cannot be empty")
    }

    if(!name || name.length === 0){
        throw new ApiError(400 , "Name cannot be empty")
    }

    const playlist = await Playlist.findById(playlistId);

    if(!playlist){
        throw new ApiError(400, "cant find the playlist")
    }

    if(playlist?.owner.toString() !== req.user?._id.toString()){
        throw new ApiError(400, "Only the valid user can update the playlist")
    }

    const updated = await Playlist.findByIdAndUpdate(
        playlistId,
        {
            $set: {
                name,
                description,
            }
        }, { new : true }
    )

    if(!updated){
        throw new ApiError(500 , "Playlist cannot be updated now please try again later")
    }
    return res.status(200).json(new ApiResponse(200,"playlist updated successfully", updated))
})
const deletePlaylist = asyncHandler(async (req,res)=>{
    const {playlistId} = req.params

    if(!isValidObjectId(playlistId)){
        throw new ApiError(400, "The playlist id is invalid")
    }

    const playlist =await Playlist.findById(playlistId)

    if(playlist.owner.toString() !== req.user?._id.toString()){
        throw new ApiError(400, "The owner can only delete the playlist")
    }

    const deleted = await Playlist.findByIdAndDelete(playlistId)
    
    if(!deleted){
        throw new ApiError(400,"cant delete the playlist. try again later")
    }
    return res.status(200).json(new ApiResponse(200,"Playlist deleted successfully", {}))
})
const getUserPlaylist = asyncHandler(async (req,res)=>{
    const {userId} = req.params

    if(!isValidObjectId(userId)){
        throw new ApiError(400, "It is not a valid user id")
    }

    const playlist = Playlist.find({
        owner : userId
    })

    if(!playlist || playlist.length === 0){
        throw new ApiError(400 , 'No playlist found')
    }

    return res.status(200).json(new ApiResponse(200 , "Playlists fetched successfully", playlist))
})
const getPlaylistById = asyncHandler(async (req,res)=>{
    const {playlistId} = req.params
    if(!isValidObjectId(playlistId)){
        throw new ApiError(400, "Invalid playlist id")
    }

    const playlist = await Playlist.findById(playlistId);
    if(!playlist){
        throw new ApiError(404, "Couldn't find the playlist")
    }
    return res.status(200).json(new ApiResponse(200, "Playlist found", playlist))
})


const removeVideoFromPlaylist = asyncHandler(async(req,res)=>{
    const {videoId , playlistId} = req.params
    
    if(!isValidObjectId(videoId)){
        throw new ApiError(400 , 
            "Video id is not valid"
        )
    }

    if(!isValidObjectId(playlistId)){
        throw new ApiError(400,
            "Playlist Id is not valid"
        )
    }

    const playlist = Playlist.findById(playlistId);

    if(!playlist.owner.toString() !== req.user?._id.toString()){
        throw new ApiError(400 , "you should be owner to remove the video from playlist")
    }

    const updatedPlaylist = await Playlist.findByIdAndUpdate(
        playlistId,
        {
            $pull: {
                videos : videoId
            }
        }, {new : true}
    )

    if(!updatedPlaylist){
        throw new ApiError(404 , "Video couldnt be removed from the playlist")
    }
    return res.status(200).json(new ApiResponse(200, "Video removed from the playlist successfully", updatedPlaylist))

})

export { createPlaylist , updatePlaylist , deletePlaylist , getUserPlaylist , getPlaylistById , removeVideoFromPlaylist}