import { Router } from "express";
import { registerUser } from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import {ApiError} from '../utils/ApiError.js'

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




export default router