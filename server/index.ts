
import express from 'express';
import mySql2, { RowDataPacket } from "mysql2";
import multer from 'multer';
import jwt, { JwtPayload } from 'jsonwebtoken';
import sharp from 'sharp';
import rateLimit from 'express-rate-limit';
require('dotenv').config(); 

const cors = require('cors');
const bcrypt = require('bcrypt');
const saltRounds = 10;
const bodyParser = require('body-parser');
const app = express();



app.use(express.json());
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const storage = multer.memoryStorage();
const upload = multer({
    limits: { fileSize: 50 * 1024 * 1024 }
});
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    max: 5, 
    message: "Muitas tentativas de login. Tente novamente mais tarde.",
    standardHeaders: true, 
    legacyHeaders: false, 
});

type Produto = {
    id: number;
    nome: string;
    image: string | null; // Supondo que a imagem seja armazenada como um BLOB
    quantidade: number;
    categoria: string;
    preco: number;
    data: string;
};
interface QueryResult {
    rows: Produto[];
}
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
                            res.status(201).json({ msg: "Cadastrado com sucesso", redirectTo: "/login" });
                        }
                    });
                })
            } else {
                res.send({ msg: "Usuario Já cadastrado" });
            }
        }
    });
});

app.post("/login", loginLimiter,(req, res) => {

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
                    const token = jwt.sign({ id: 1, email }, "sua-chave-secreta", { expiresIn: "3h" });
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

app.post("/dashboard", authenticateToken, upload.single("imagem"), (req, res) => {
    const { nome, preco, categoria, quantidade, dataFabricacao,descricao} = req.body;
    const imagem = req.file;


    db.query("INSERT INTO produtos (nome,categoria,datafabricacao,quantidade,image,preco,descricao) VALUES (?,?,?,?,?,?,?)",
        [nome, categoria, dataFabricacao, quantidade, imagem?.buffer, preco,descricao], (erro, resultado) => {
            if (erro) {
                console.log(erro);
                return res.status(500).send("Erro ao cadastrar item no banco de dados.");
            }
            res.send("item cadastrado no banco de dados");
        })
})

app.post("/editar",authenticateToken ,upload.none(),(req, res) => {
    const { nome, preco, categoria, quantidade, id,descricao} = req.body;
    db.query(
        "UPDATE produtos SET nome = ?, categoria = ?, quantidade = ?, preco = ?, descricao = ? WHERE id = ?",
        [nome, categoria, quantidade, parseFloat(preco), descricao, id],
        (erro, resultado) => {
          if (erro) {
            console.log("Erro na query:", erro);
            return res.status(500).send("Erro ao atualizar produto.");
          }
          res.send("Produto atualizado com sucesso.");
        }
      );
});

function authenticateToken(req: any, res: any, next: any) {

    const token = req.headers['authorization'];


    if (!token) {
        return res.status(401).json({ message: "Token não fornecido" });
    }


    const tokenSemPrefixo = token.replace("Bearer ", "");


    jwt.verify(tokenSemPrefixo, "sua-chave-secreta", (err: any, decoded: any) => {

        if (err) {
            return res.status(403).json({ message: "Token inválido" });
        }


        req.user = decoded as JwtPayload;
        next();
    });
}
app.get("/dashboard", authenticateToken, (req, res) => {
    db.query("SELECT * FROM produtos", (erro, resultados: any[]) => {
        if (erro) {
            console.log(erro);
            return res.status(500).send("Erro ao procurar os produtos");
        }

        const produtosImagem = resultados.map(produto => {
            const imageBase64 = produto.image.toString('base64');
            produto.imagem = `data:image/jpeg;base64,${imageBase64}`;
            return produto;
        })
        res.json(produtosImagem);

    })
})


app.get("/produto/:id", authenticateToken, (req, res) => {
    const { id } = req.params;


    db.query("SELECT * FROM produtos WHERE id=?", [id], (erro, resultados: RowDataPacket[]) => {
        if (erro) {
            console.error("Erro na consulta:", erro);
            return res.status(500).send("Erro ao procurar produto");
        }




        if (resultados.length === 0) {
            return res.status(404).send("Produto não encontrado");
        }


        const produtosImagem = resultados.map(produto => {
            console.log("Produto antes de converter imagem:", produto);

            if (produto.image && Buffer.isBuffer(produto.image)) {
                const imageBase64 = produto.image.toString('base64');
                produto.image = `data:image/jpeg;base64,${imageBase64}`;
            } else {
                console.warn(`Imagem ausente ou inválida para o produto ID ${produto.id}`);
                produto.image = null;
            }

            return produto;
        });

        console.log("Produtos com imagem convertida:", produtosImagem);


        res.json(produtosImagem[0]);
    });
});


const db = mySql2.createPool({
    host: process.env.DB_HOST,      
    user: process.env.DB_USER,     
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME  
});

app.delete('/products/:id', (req, res) => {
    const { id } = req.params;


    const query = 'DELETE FROM produtos WHERE id = ?';

    db.query(query, [id], (err, result) => {
        if (err) {
            console.error('Erro ao excluir produto', err);
            return res.status(500).send('Erro ao excluir produto');
        }


        res.status(200).send('Produto excluído com sucesso!');
    });
});
app.get('/', (req, res) => {
    res.redirect('/login');
});
  
app.listen(3001, () => {
    console.log('rodando na porta 3001');
})
