import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { ApiResponse } from "../utils/ApiResponse";
import mongoose, {isValidObjectId} from "mongoose";
import { Subscription } from "../models/subscription.models";

const checkSubscriber = asyncHandler(async (req,res)=>{
    const userId = req.user?._id
    const {channelId} = req.params 

    if(!isValidObjectId(userId)){
        throw new ApiError(400 , "Invalid User id")
    }

    try {
        const subsribedChannel = await Subscription.findOne({
            subscriber : userId,
            channel : channelId
        })

        if(!subsribedChannel){
            return res.status(200).json(
                new ApiResponse(200,{
                    subscribed : false,
                    message : `${userId} has not been subscribed to ${channelId}`
                })
            )
        }

        return res.status(200).json(
            new ApiResponse(200,{
                subscribed : true,
                message : `${userId} has been subscribed to ${channelId}`,
                subsribedChannel
            })
        )
    } catch (error) {
        throw new ApiError(500,"Server error")
    }
})

const toggleSubscription = asyncHandler(async (req,res)=>{
    const {channelId} = req.params
    if(!isValidObjectId(channelId)){
        throw new ApiError(400,"Invalid Channel Id")
    }

    const subscription = await Subscription.findOne({
        channel : channelId,
        subscriber : req.user?._id
    })

    if(subscription){
        await Subscription.findByIdAndDelete(subscription._id);
        return res.status(200).json(
            new ApiResponse(200,"Unsubscribed successfully",{
                subscription : null
            })
        )
    }else{
        const newSubscription = await Subscription.create({
            subscriber : req.user?._id,
            channel : channelId
        })
        return res.status(200).json(
            new ApiResponse(200,"Subscribed Successfully",{
                newSubscription
            })
        )
    }
})

const getChannelSubscriber = asyncHandler(async(req,res)=>{
    const {channelId} = req.params

    if(!isValidObjectId(channelId)){
        throw new ApiError(400, "Channel Id is Invalid")
    }

    try {
        const subscriber = await Subscription.aggregate([
            {
                $match : {
                    channel : new mongoose.Types.ObjectId(channelId)
                }
            },
            {
                $lookup : {
                    from : 'users',
                    localField : "subscriber",
                    foreignField : "_id",
                    as : "subscribercount"
                }
            },
            {
                $addFields : {
                    subs : {
                        $size : '$subscribercount'
                    }
                }
            },
            {
                $project : {
                    subs : 1,
                    subscribercount: {
                        _id : 1,
                        fullname :1,
                        username : 1
                    }
                }
            }
        ])

        if(!subscriber || subscriber.length === 0){
            return res.status(200).json(new ApiResponse(200,{subscriber},{
                numberOfSubscriber : 0,
                message : '0 Subscribers'
            }))
        }
        
        return res.status(200).json(new ApiResponse(200,"All subscriber fetched successfully ",{
            subsriber
        }))
    } catch (error) {
        throw new ApiError(500, "Something went wrong")
    }
})

const getSubscribedChannel = asyncHandler(async (req,res)=>{
    const { subscriberId } = req.params
    if(!isValidObjectId(subscriberId)){
        throw new ApiError(400, "Invalid Subscriber Id")
    }

    const subscribed = await Subscription.aggregate([
        {
            $match : {
                subscriber : new mongoose.Types.ObjectId(subscriberId)
            }
        },
        {
            $lookup : {
                from : "users",
                localField : "channel",
                foreignField : "_id",
                as : "subscribed"
            }
        },
        {
            $addFields : {
                totalChannelSubscribed :{
                    $size : "$subscribed"
                }
            }
        },
        {
            $project : {
                totalChannelSubscribed : 1,
                subscribed : {
                    username : 1,
                    fullname : 1,
                }
            }
        }
    ])

    if(!subscribed || Object.entries(subscribed).length === 0){
        throw new ApiError(404 , "No channel subscribed")
    }

    return res.status(200).json(
        new ApiResponse(200,"All subscribed channel are fetched successfully",{
            subscribed,
        })
    )
})

export {
    toggleSubscription,
    getChannelSubscriber,
    getSubscribedChannel,
    checkSubscriber
}