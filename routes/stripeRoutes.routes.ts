import { Router } from "express"; 
export const stripeRoutes = Router();
import cors from 'cors';
import { Piece } from "../models/pieceModel";
const stripe = require("stripe")(process.env.STRIPE_SECRET_TEST)

stripeRoutes.post("/payment", cors(), async (req, res)=>{
    let {amount, id,listingId} = req.body

    try {
        const payment = await stripe.paymentIntents.create({
            amount,
            currency: "USD",
            description: "Payment",
            payment_method: id,
            confirm: true
        })


        await Piece.updateOne({id:listingId},{isCollected:true,paymentId:payment.id})
        res.json({
            message: "Payment was successful",
            success: true
        })
    } catch (error) {
        console.log("Error", error)
        res.json({
            message: "Payment Failed",
            success: false
        })
    }
})