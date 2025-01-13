import express from 'express';
import mySql2, { RowDataPacket } from "mysql2";
import multer from 'multer';

const cors = require('cors');
const bcrypt = require('bcrypt');
const saltRounds = 10;

const app = express();
const jwt = require("jsonwebtoken");


app.use(express.json());
app.use(cors());

const storage = multer.memoryStorage();
const upload = multer({
    limits: { fileSize: 50 * 1024 * 1024 }  // Limite de 50MB
});


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

app.post("/dashboard", upload.single("imagem"), (req, res) => {
    const { nome, preco, categoria, quantidade, dataFabricacao } = req.body;
    const imagem = req.file;

    
    db.query("INSERT INTO produtos (nome,categoria,datafabricacao,quantidade,image,preço) VALUES (?,?,?,?,?,?)",
        [nome, categoria, dataFabricacao, quantidade, imagem?.buffer, preco], (erro, resultado) => {
            if (erro) {
                console.log(erro);
                return res.status(500).send("Erro ao cadastrar item no banco de dados.");
            }
            res.send("item cadastrado no banco de dados");
        })
})


app.get("/dashboard",(req,res)=>{
    
})
const db = mySql2.createPool({
    host: "localhost",
    user: "root",
    password: "password",
    database: "banco",
})


app.listen(3001, () => {
    console.log('rodando na porta 3001');
})

