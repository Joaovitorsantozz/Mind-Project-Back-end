import express from 'express';
import mySql2, { RowDataPacket } from "mysql2";

const cors = require('cors');
const bcrypt = require('bcrypt');
const saltRounds = 10;
const app = express();
const jwt = require("jsonwebtoken");


app.use(express.json());
app.use(cors());


app.post("/register", (req, res) => {
    const email = req.body.email;
    const nome = req.body.name;
    const password = req.body.password;


    db.query("SELECT email FROM usuarios WHERE email = ?", [email], (err, response) => {
        if (err) {
            res.send(err);
        } else {
            if (Array.isArray(response) && response.length == 0) {
                bcrypt.hash(password, saltRounds, (err: Error, hash: String) => {
                    db.query("INSERT INTO usuarios (nome, email, password) VALUES (?, ?, ?)", [nome, email, hash], (err, result) => {
                        if (err) {
                            res.send(err);
                        } else {
                            res.send({ msg: "Cadastrado com sucesso" });
                        }
                    });
                })
            } else {
                res.send({ msg: "Usuario Já cadastrado" });
            }
        }
    });
});

app.post("/login", (req, res) => {

    const email = req.body.email;
    const password = req.body.password;

    db.query("SELECT * FROM usuarios WHERE email = ? ", [email], (err, result) => {
        if (err) {
            console.error(err);

        }
        console.log("Resultado da consulta:", result);
        if (Array.isArray(result) && result.length > 0) {

            const user = result[0] as RowDataPacket;
            bcrypt.compare(password, user.password, (erro: Error, result: String) => {
                if (result) {
                    const token = jwt.sign({ id: 1, email }, "sua-chave-secreta", { expiresIn: "1h" });
                    return res.json({ msg: "Logado com sucesso", token });
                
                } else {
                    res.send({ msg: "Falha no Login" })
                }
            })
        } else {
            res.send({ msg: "Usuário não encontrado" });
        }
    });
});


const db = mySql2.createPool({
    host: "localhost",
    user: "root",
    password: "password",
    database: "banco",
})


app.listen(3001, () => {
    console.log('rodando na porta 3001');
})

