const routes = require("express").Router();
const { createWallet } = require("../controller/user.wallets");
const isAuth = require("../config/auth");

routes.post("/create-wallet", isAuth, createWallet);
// routes.post("/create-wallet-by-phone", createWallet); // No auth required

module.exports = routes;
