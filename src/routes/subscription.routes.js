import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware";
import {checkSubscriber, getChannelSubscriber, getSubscribedChannel, toggleSubscription} from '../controllers/subscription.controller'


const router = Router()
router.use(verifyJWT);

router.route('/toggle/sub/:channelId').post(toggleSubscription)
router.route('/getChannel/sub/:channelId').post(getChannelSubscriber)
router.route('/getSubscribedChannel/sub/:subscriberId').get(getSubscribedChannel)
router.route('/checkSubscription/:channelId').get(checkSubscriber)

export default router
