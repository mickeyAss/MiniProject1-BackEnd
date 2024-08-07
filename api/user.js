var express = require('express');
var router = express.Router();
var conn = require('../dbconnect')
var jwt = require('jsonwebtoken');
var secret = 'Fullstack-Login-2024';

router.get("/", async (req,res) => {
    res.json("Hello Word!!!");
});

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
                    res.json({message: "Database error"});
                    return;
                }
                if (result.length == 0) {
                    res.json({message: "no user found"});
                    return;
                }
               
                res.status(200).json({ message: 'Login successfully', result});
            }
        );
    } else {
        res.json({message: "Email and Password are required"});
    }
})

router.post('/register' ,async (req,res) => {
    const {name,surname,email ,password,phone,wallet} = req.body;

    conn.query('INSERT INTO users (name,surname,email ,password,phone,wallet) VALUES (?, ?,?,?,?,?)',
        [name,surname,email ,password,phone,wallet],
        function(err, result){
            if (err) {
                res.json({message: err});
                return
            }
            res.json({ message: 'ok'});
        }
    );
});


router.put('/register/:uid', async (req, res) => {
    const { uid } = req.params;
    const { name, surname, phone, wallet } = req.body;

    // สร้าง array สำหรับเก็บค่าที่จะถูกอัพเดต
    let fields = [];
    let values = [];

    // ตรวจสอบและเพิ่ม field ที่ต้องการอัพเดต
    if (name) {
        fields.push('name = ?');
        values.push(name);
    }
    if (surname) {
        fields.push('surname = ?');
        values.push(surname);
    }
    if (phone) {
        fields.push('phone = ?');
        values.push(phone);
    }
    if (wallet) {
        fields.push('wallet = ?');
        values.push(wallet);
    }

    // ถ้าไม่มี field ใดที่ต้องการอัพเดต ให้ส่ง response กลับโดยไม่ทำอะไร
    if (fields.length === 0) {
        return res.json({ result: false, message: 'No fields to update' });
    }

    // สร้าง query string สำหรับการอัพเดต
    const query = `UPDATE users SET ${fields.join(', ')} WHERE uid = ?`;
    values.push(uid);

    conn.query(query, values, function (err, result) {
        if (err) {
            return res.json({ result: false, message: err });
        }
        res.json({ result: true, message: 'User updated successfully' });
    });
});

router.put('/updatewallet/:uid' ,async (req,res)=>{
    const { uid } = req.params;
    const { wallet } = req.body;

    conn.query('UPDATE users SET wallet = ? WHERE uid = ?',
        [wallet,uid],
        function(err,result){
            if(err){
                res.json({result: false, message: err});
            }
            res.json({result: true,message: 'Wallet update successfully'});
        }
    )
})


module.exports = router;