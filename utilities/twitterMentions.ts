/** @format */

import request from "request";
import { TwitterApi } from "twitter-api-v2";
import { User } from "../models/userModel";
import https from "https";
import passport from "passport";

import { Piece } from "../models/pieceModel";
import { savePieceListingData } from "../controllers/piece.controller";
import { FlowLogicHandler } from "./FlowLogic";

const twitterClient = new TwitterApi({
  clientId: process.env.TWITTER_CLIENT_ID as string,
  clientSecret: process.env.TWITTER_CLIENT_SECRET as string,
});
const options = {
  hostname: "api.twitter.com",
  path: "/2/tweets/search/stream?tweet.fields=created_at,conversation_id&expansions=author_id,in_reply_to_user_id,referenced_tweets.id.author_id",
  headers: {
    Authorization: `Bearer ${process.env.BEARER_TOKEN}`,
  },
};
export const twitterMentions = async () => {
  const botUser = await User.findOne({
    username: process.env.TWITTER_BOT_USERNAME,
  });

  if (botUser) {
    const {
      client: refreshedClient,
      accessToken,
      refreshToken: newRefreshToken,
    } = await twitterClient.refreshOAuth2Token(botUser.refreshToken as string);
    console.log("client connected");

    //updating new tokens in db
    let update = await User.updateOne(
      { username: process.env.TWITTER_BOT_USERNAME },
      { accessToken: accessToken, refreshToken: newRefreshToken }
    );
    console.log("tokens updated");

    https.get(options, (res) => {
      res.on("data", async (chunk) => {
        let data = chunk.toString();

        if (data.length != 2) {
          console.log("User mentioned a Tweet");
          try {
            let dataJson = JSON.parse(data);
            //console.log(data)
            if (!dataJson.includes) return;

            let text =
              dataJson.includes.tweets.filter((e: any) => {
                return e.id == dataJson.data.conversation_id;
              }).length != 0
                ? dataJson.includes.tweets.filter((e: any) => {
                    return e.id == dataJson.data.conversation_id;
                  })[0].text
                : [];

            let authorName =
              dataJson.includes.users.filter((e: any) => {
                return e.id == dataJson.data.in_reply_to_user_id;
              }).length != 0
                ? dataJson.includes.users.filter((e: any) => {
                    return e.id == dataJson.data.in_reply_to_user_id;
                  })[0].username
                : [];

            //returning in case of same mentions as of reply
            if (typeof text != "string") return;

            //save the tweet data for listing page
            let listingId = await savePieceListingData(
              dataJson.data.id,
              "1",
              authorName,
              dataJson.data.created_at,
              text
            );

            //FLow nft minting logic
            FlowLogicHandler(dataJson.data.id,text)

            let imageLink = process.env.ORIGIN_URL + "/listing/" + listingId;
            //console.log(dataJson)

            await refreshedClient.v2.tweet({
              text: imageLink,
              reply: {
                in_reply_to_tweet_id: dataJson.includes.tweets[0].id,
                exclude_reply_user_ids: [
                  dataJson.includes.tweets[0].in_reply_to_user_id,
                ],
              },
            });
            console.log("tweet send");

            let authorUserId = 
              dataJson.includes.users.filter((e: any) => {
                return e.id == dataJson.data.author_id;
              }).length != 0
                ? dataJson.includes.users.filter((e: any) => {
                    return e.id == dataJson.data.author_id;
                  })[0].author_id
                : [];

            // We check that an account with this user ID has not b

            // We create wallet with the userId
            //const account = createAccount(authorUserId);
            // console.log(account);

            // Call the minting endpoint

            // Setup the new wallet with the Pieces collection

            // Mint the NFT into the wallet

            // Add transfer functionality
          } catch (e) {
            console.log(e);
          }
        }
      });
    });
  }
};
