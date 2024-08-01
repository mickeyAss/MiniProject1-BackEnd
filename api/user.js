var express = require('express');
var router = express.Router();
var conn = require('../dbconnect')
var jwt = require('jsonwebtoken');
var secret = 'Fullstack-Login-2024';

router.get("/get", async (req, res) => {
    try {
        conn.query("SELECT * FROM users", (err, result) => {
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
    const { email , password} = req.body;

    if (email && password) {
        conn.query("SELECT * FROM users WHERE email = ? AND password = ?",
            [ email , password ],
            (err,result) => {
                if (err) { 
                    res.json({result: false,message: "Database error"});
                    return;
                }
                if (result.length == 0) {
                    res.json({result: false, message: "no user found"});
                    return;
                }
                var token = jwt.sign({ email: result[0].email }, secret);
                res.json({result: true, message: 'Login successfully', result, token});
            }
        );
    } else {
        res.json({result: false,message: "Email and Password are required"});
    }
})

router.post('/register' ,async (req,res) => {
    const {email ,password} = req.body;

    conn.query('INSERT INTO users (email, password) VALUES (?, ?)',
        [email, password],
        function(err, result){
            if (err) {
                res.json({result: false, message: err});
                return
            }
            res.json({result: true, message: 'ok'});
        }
    );
});


router.put('/register/:uid' ,async (req,res) => {
    const { uid } = req.params;
    const {name ,surname, phone, birthday, wallet} = req.body;

    conn.query('UPDATE users SET name = ?, surname = ?, phone = ?, birthday = ?, wallet = ? WHERE uid = ?',
        [name, surname, phone, birthday, wallet,uid],
        function(err, result){
            if (err) {
                res.json({result: false, message: err});
                return
            }
            res.json({result: true, message: 'User update successfully'});
        }
    );
});


module.exports = router;