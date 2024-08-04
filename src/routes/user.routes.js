import { Router } from "express";
import {changeCurrentPassword, loginUser, logoutUser, refreshAccesstoken, registerUser ,getCurrentUser, updateAccountDetails, updateUserAvatar, updateUserCoverImage, getUserChannelProfile, getWatchHistory} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import {ApiError} from '../utils/ApiError.js'
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

// here when we are applying request in register route this registerUser gets executed so to 
// we have to specify before executing the funcion

router.route("/register").post(
    upload.fields([
        {
            name : "avatar", // here we gave information about avatar
            maxCount : 1
        },{
            name : "coverImage", // here we gave information about cover image
            maxCount : 1
        }
    ]),//fields array accept karta hai
    registerUser
)

router.route("/login").post(loginUser)


//here verifyJwt is a middleware which gets executed before logout user
router.route("/logout").post(verifyJWT,logoutUser)

router.route("/refreshToken").post(refreshAccesstoken)

router.route("/changePassword").post(verifyJWT,changeCurrentPassword)

router.route("/current-user").get(verifyJWT,getCurrentUser)

router.route("/update-account").patch(verifyJWT,updateAccountDetails)

router.route("/avatar").patch(verifyJWT,upload.single("avatar"),updateUserAvatar)

router.route("/cover-image").patch(verifyJWT,upload.single("coverImage"),updateUserCoverImage)

router.route("/c/:username").get(verifyJWT,getUserChannelProfile)

router.route("/history").get(verifyJWT,getWatchHistory)




export default router