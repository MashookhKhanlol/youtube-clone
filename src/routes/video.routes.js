import {Router} from "express"
import {verifyJWT} from '../middlewares/auth.middleware'
import {upload} from '../middlewares/multer.middleware'
import { deleteVideo, getAllVideos , getVideoById, publishVideo, togglePublishedStatus, updateTitleAndDescription, updateVideoThumbnail, viewsInVideo} from "../controllers/video.controller";

const router = Router();

router.use(verifyJWT);

router.route("/")
.get(getAllVideos)
.post(
    upload.fields([
        {
            name : "videoFile",
            maxCount : 1,
        },
        {
            name : "thumbnail",
            maxCount : 1,
        }
    ]),
    publishVideo
);

router.route("/publishvideo").post(
    upload.fields([
        {
            name : "videoFile",
            maxCount : 1,
        },
        {
            name : 'thumbnail',
            maxCount : 1,
        }
    ]),
    publishVideo
);

router.route('/:videoId')
.get(getVideoById)
.delete(deleteVideo)
.patch(upload.single("thumbnail"), updateVideoThumbnail)
.patch(updateTitleAndDescription)

router.route('/toggle/publish/:videoId').patch(togglePublishedStatus)

router.route('/video').get(getAllVideos)

router.route("/views/:videoId").get(viewsInVideo)

export default router