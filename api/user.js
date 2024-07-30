var express = require('express');
var router = express.Router();
var conn = require('../dbconnect')
var jwt = require('jsonwebtoken');
var secret = 'Fullstack-Login-2024';

router.get("/get", async (req, res) => {
    try {
        conn.query("SELECT * FROM user", (err, result) => {
            if (err) {
                console.log(err);
                return res.status(400).send();
            }
            res.status(200).json(result);
        })
    } catch (err) {
        console.log(err);
        return res.status(500).send();
    }
});

router.post("/login", async (req,res) => {
    const {phone,password} = req.body;

    if (phone && password) {
        conn.query("SELECT * FROM user WHERE phone = ? AND password = ?",
            [phone,password],
            (err,result) => {
                if (err) { 
                    res.json({result: false,message: "Database error"});
                    return;
                }
                if (result.length == 0) {
                    res.json({result: false, message: "Invalid phone or password"});
                    return;
                }
                res.json({result: true, result});
            }
        );
    } else {
        res.json({result: false,message: "Phone and Password are required"});
    }
})


module.exports = router;